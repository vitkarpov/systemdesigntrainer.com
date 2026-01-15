import { Injectable, Inject, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { FeedbackNotFoundException } from '../exceptions/feedback-not-found.exception';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import type { db as DbType } from '../../../db/db';
import {
  feedbackReports,
  feedbackItems,
  feedbackNextSteps,
  interviewSignals,
} from '../../../db/schema';
import { SignalService, SignalName } from './signal.service';
import { RedFlagService, RedFlagName } from './red-flag.service';
import { InterviewSessionService } from './interview-session.service';
import { AiService } from '../../ai/services/ai.service';
import { InterviewPhase } from '../types/session.types';
import {
  BASE_SCORES,
  SIGNAL_SCORING,
  RED_FLAG_SCORING,
  COMMUNICATION_BONUSES,
  TIME_MANAGEMENT_BONUSES,
  OVERALL_SCORE_WEIGHTS,
  SUMMARY_THRESHOLDS,
  SUGGESTION_THRESHOLDS,
} from '../config/scoring-rules.config';

export interface FeedbackScores {
  overall: number;
  requirements: number;
  design: number;
  communication: number;
  timeManagement: number;
  depth: number;
}

export interface FeedbackItemData {
  type: 'strength' | 'weakness' | 'suggestion';
  description: string;
  displayOrder: number;
}

export interface FeedbackNextStepData {
  description: string;
  displayOrder: number;
}

export interface GenerateFeedbackResult {
  id: number;
  sessionId: number;
  overallScore: number;
  requirementsScore: number;
  designScore: number;
  communicationScore: number;
  timeManagementScore: number;
  depthScore: number;
  overallSummary: string;
  createdAt: Date;
  items: FeedbackItemData[];
  nextSteps: FeedbackNextStepData[];
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private sessionService: InterviewSessionService,
    private aiService: AiService,
  ) {}

  /**
   * Analyze entire transcript to detect signals using AI (batch analysis)
   * This replaces real-time heuristic-based detection with end-of-interview AI analysis
   */
  async analyzeTranscriptSignals(sessionId: number): Promise<any[]> {
    this.logger.log(`Starting batch signal analysis for session ${sessionId}`, {
      sessionId,
    });

    try {
      const messages = await this.getSessionMessages(sessionId);

      if (messages.length === 0) {
        this.logger.warn(`No messages found for session ${sessionId}`);
        return [];
      }

      const transcript = this.formatTranscript(messages);

      const prompt = `Analyze this system design interview transcript and identify ALL positive signals demonstrated by the candidate.

For each signal you detect, provide:
- The signal name (from the list below)
- When it occurred (seconds elapsed)
- Which phase it occurred in
- A brief quote or evidence from the transcript

SIGNAL TYPES:
1. asked_functional_reqs: Candidate explicitly asks about features, functional requirements, or what the system should do
2. asked_non_functional_reqs: Candidate asks about scale, performance, latency, availability, SLA, or non-functional requirements
3. clarified_constraints: Candidate asks about constraints, limitations, assumptions, or restrictions
4. mentioned_scale: Candidate discusses specific numbers (e.g., "100M users", "10K requests per second") or scaling strategies
5. proposed_api: Candidate discusses API design, endpoints, REST/GraphQL, or HTTP methods
6. drew_high_level_diagram: Candidate references drawing/creating architecture diagrams, components, or system design
7. discussed_data_model: Candidate discusses database schema, tables, entities, relationships, or data structures
8. addressed_bottlenecks: Candidate identifies bottlenecks, single points of failure, or optimization opportunities
9. discussed_tradeoffs: Candidate compares different approaches, discusses pros/cons, or analyzes trade-offs
10. structured_approach: Candidate uses a systematic approach with numbered steps, "first/second/third", or clear organization
11. asked_clarifying_questions: Candidate asks clarifying questions to understand requirements better

IMPORTANT:
- Only detect signals that are CLEARLY present in the candidate's messages (not interviewer's)
- Be conservative - don't over-detect
- Each signal should only be detected once (the first occurrence)
- Provide specific evidence from the transcript

TRANSCRIPT:
${transcript}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "signals": [
    {
      "signalName": "asked_functional_reqs",
      "detectedAt": 45,
      "phase": "requirements",
      "evidence": "Asked 'What features should we support?'"
    }
  ]
}`;

      this.logger.log(`Calling AI for signal detection`, {
        sessionId,
        messageCount: messages.length,
        transcriptLength: transcript.length,
      });

      const aiResponse = await this.aiService.generateResponse({
        systemPrompt:
          'You are an expert system design interview evaluator. Your task is to analyze interview transcripts and identify positive behavioral signals demonstrated by candidates. Be precise and conservative in your detections.',
        userMessage: prompt,
        temperature: 0.3, // Low temperature for consistency
        maxTokens: 3000,
        timeout: 60000, // 60 seconds
        model: 'claude-sonnet-4-5',
      });

      this.logger.log(`AI signal detection response received`, {
        sessionId,
        model: aiResponse.model,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      });

      const parsed = this.parseSignalDetectionResponse(aiResponse.text);

      const detectedSignals: any[] = [];
      for (const signal of parsed.signals) {
        if (!Object.values(SignalName).includes(signal.signalName)) {
          this.logger.warn('Invalid signal name detected by AI', {
            sessionId,
            signal,
          });
          continue;
        }

        const stored = await this.signalService.recordSignal(
          sessionId,
          signal.signalName as SignalName,
          signal.phase as InterviewPhase,
          signal.detectedAt,
          undefined, // messageId not tracked in batch analysis
        );

        if (stored) {
          detectedSignals.push(stored);
          this.logger.log(
            `Recorded signal: ${signal.signalName} at ${signal.detectedAt}s in ${signal.phase} phase`,
            { sessionId },
          );
        }
      }

      this.logger.log(
        `Batch signal analysis completed for session ${sessionId}: detected ${detectedSignals.length} signals`,
        { sessionId, signalCount: detectedSignals.length },
      );

      return detectedSignals;
    } catch (error) {
      this.logger.error(
        `Batch signal analysis failed for session ${sessionId}`,
        {
          sessionId,
          error: error.message,
          stack: error.stack,
        },
      );

      // Don't throw - allow feedback generation to continue with no signals
      return [];
    }
  }

  /**
   * Parse AI signal detection response
   */
  private parseSignalDetectionResponse(text: string): { signals: any[] } {
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.signals || !Array.isArray(parsed.signals)) {
        throw new Error(
          'Invalid signal detection response: missing signals array',
        );
      }

      return parsed;
    } catch (error) {
      this.logger.error('Failed to parse signal detection response', {
        error: error.message,
        rawText: text.substring(0, 500), // Log first 500 chars
      });
      throw error;
    }
  }

  /**
   * Calculate scores based on signals and red flags
   */
  async calculateScores(sessionId: number): Promise<FeedbackScores> {
    const signals = await this.signalService.getSessionSignals(sessionId);
    const redFlags = await this.redFlagService.getSessionRedFlags(sessionId);
    const session = await this.sessionService.getSession(sessionId);

    const signalNames = new Set(signals.map((s) => s.signalName));
    const redFlagNames = new Set(redFlags.map((f) => f.flagName));

    // Calculate requirements score (0-100)
    let requirementsScore = BASE_SCORES.REQUIREMENTS;

    // Apply signal bonuses
    if (signalNames.has(SignalName.ASKED_FUNCTIONAL_REQS))
      requirementsScore +=
        SIGNAL_SCORING[SignalName.ASKED_FUNCTIONAL_REQS].requirements;
    if (signalNames.has(SignalName.ASKED_NON_FUNCTIONAL_REQS))
      requirementsScore +=
        SIGNAL_SCORING[SignalName.ASKED_NON_FUNCTIONAL_REQS].requirements;
    if (signalNames.has(SignalName.CLARIFIED_CONSTRAINTS))
      requirementsScore +=
        SIGNAL_SCORING[SignalName.CLARIFIED_CONSTRAINTS].requirements;
    if (signalNames.has(SignalName.ASKED_CLARIFYING_QUESTIONS))
      requirementsScore +=
        SIGNAL_SCORING[SignalName.ASKED_CLARIFYING_QUESTIONS].requirements;

    // Apply red flag penalties
    if (redFlagNames.has(RedFlagName.SKIPPED_REQUIREMENTS))
      requirementsScore -=
        RED_FLAG_SCORING[RedFlagName.SKIPPED_REQUIREMENTS].requirements;
    if (redFlagNames.has(RedFlagName.MISUNDERSTOOD_PROBLEM))
      requirementsScore -=
        RED_FLAG_SCORING[RedFlagName.MISUNDERSTOOD_PROBLEM].requirements;

    requirementsScore = Math.max(0, Math.min(100, requirementsScore));

    // Calculate design score (0-100)
    let designScore = BASE_SCORES.DESIGN;

    // Apply signal bonuses
    if (signalNames.has(SignalName.DREW_HIGH_LEVEL_DIAGRAM))
      designScore += SIGNAL_SCORING[SignalName.DREW_HIGH_LEVEL_DIAGRAM].design;
    if (signalNames.has(SignalName.PROPOSED_API))
      designScore += SIGNAL_SCORING[SignalName.PROPOSED_API].design;
    if (signalNames.has(SignalName.DISCUSSED_DATA_MODEL))
      designScore += SIGNAL_SCORING[SignalName.DISCUSSED_DATA_MODEL].design;
    if (signalNames.has(SignalName.ADDRESSED_BOTTLENECKS))
      designScore += SIGNAL_SCORING[SignalName.ADDRESSED_BOTTLENECKS].design;

    // Apply red flag penalties
    if (redFlagNames.has(RedFlagName.NO_SCALE_MENTION))
      designScore -= RED_FLAG_SCORING[RedFlagName.NO_SCALE_MENTION].design;

    designScore = Math.max(0, Math.min(100, designScore));

    // Calculate communication score (0-100)
    let communicationScore = BASE_SCORES.COMMUNICATION;

    // Apply signal bonuses
    if (signalNames.has(SignalName.STRUCTURED_APPROACH))
      communicationScore +=
        SIGNAL_SCORING[SignalName.STRUCTURED_APPROACH].communication;
    if (signalNames.has(SignalName.DISCUSSED_TRADEOFFS))
      communicationScore +=
        SIGNAL_SCORING[SignalName.DISCUSSED_TRADEOFFS].communication;
    if (signalNames.has(SignalName.ASKED_CLARIFYING_QUESTIONS))
      communicationScore +=
        SIGNAL_SCORING[SignalName.ASKED_CLARIFYING_QUESTIONS].communication;

    // More signals = more communication (up to max bonus)
    const messageCount = signals.length;
    communicationScore += Math.min(
      COMMUNICATION_BONUSES.MESSAGE_COUNT_MAX,
      messageCount,
    );

    // Apply red flag penalties
    if (redFlagNames.has(RedFlagName.WENT_TOO_DEEP_EARLY))
      communicationScore -=
        RED_FLAG_SCORING[RedFlagName.WENT_TOO_DEEP_EARLY].communication;

    communicationScore = Math.max(0, Math.min(100, communicationScore));

    // Calculate time management score (0-100)
    let timeManagementScore = BASE_SCORES.TIME_MANAGEMENT;

    // Apply red flag penalties
    if (redFlagNames.has(RedFlagName.POOR_TIME_MANAGEMENT))
      timeManagementScore -=
        RED_FLAG_SCORING[RedFlagName.POOR_TIME_MANAGEMENT].timeManagement;

    // Bonus for completing interview
    if (session.status === 'completed')
      timeManagementScore += TIME_MANAGEMENT_BONUSES.COMPLETED_SESSION;

    timeManagementScore = Math.max(0, Math.min(100, timeManagementScore));

    // Calculate depth score (0-100)
    let depthScore = BASE_SCORES.DEPTH;

    // Apply signal bonuses
    if (signalNames.has(SignalName.MENTIONED_SCALE))
      depthScore += SIGNAL_SCORING[SignalName.MENTIONED_SCALE].depth;
    if (signalNames.has(SignalName.DISCUSSED_DATA_MODEL))
      depthScore += SIGNAL_SCORING[SignalName.DISCUSSED_DATA_MODEL].depth;
    if (signalNames.has(SignalName.ADDRESSED_BOTTLENECKS))
      depthScore += SIGNAL_SCORING[SignalName.ADDRESSED_BOTTLENECKS].depth;
    if (signalNames.has(SignalName.DISCUSSED_TRADEOFFS))
      depthScore += SIGNAL_SCORING[SignalName.DISCUSSED_TRADEOFFS].depth;

    // Apply red flag penalties
    if (redFlagNames.has(RedFlagName.WENT_TOO_DEEP_EARLY))
      depthScore -= RED_FLAG_SCORING[RedFlagName.WENT_TOO_DEEP_EARLY].depth;
    if (redFlagNames.has(RedFlagName.NO_SCALE_MENTION))
      depthScore -= RED_FLAG_SCORING[RedFlagName.NO_SCALE_MENTION].depth;

    depthScore = Math.max(0, Math.min(100, depthScore));

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      requirementsScore * OVERALL_SCORE_WEIGHTS.REQUIREMENTS +
        designScore * OVERALL_SCORE_WEIGHTS.DESIGN +
        communicationScore * OVERALL_SCORE_WEIGHTS.COMMUNICATION +
        timeManagementScore * OVERALL_SCORE_WEIGHTS.TIME_MANAGEMENT +
        depthScore * OVERALL_SCORE_WEIGHTS.DEPTH,
    );

    return {
      overall: overallScore,
      requirements: requirementsScore,
      design: designScore,
      communication: communicationScore,
      timeManagement: timeManagementScore,
      depth: depthScore,
    };
  }

  /**
   * Generate feedback items (strengths, weaknesses, suggestions)
   */
  async generateFeedbackItems(
    sessionId: number,
    scores: FeedbackScores,
  ): Promise<FeedbackItemData[]> {
    const signals = await this.signalService.getSessionSignals(sessionId);
    const redFlags = await this.redFlagService.getSessionRedFlags(sessionId);

    const signalNames = new Set(signals.map((s) => s.signalName));
    const redFlagNames = new Set(redFlags.map((f) => f.flagName));

    const items: FeedbackItemData[] = [];
    let order = 0;

    // Strengths
    if (
      signalNames.has(SignalName.ASKED_FUNCTIONAL_REQS) &&
      signalNames.has(SignalName.ASKED_NON_FUNCTIONAL_REQS)
    ) {
      items.push({
        type: 'strength',
        description:
          'Great job gathering both functional and non-functional requirements upfront.',
        displayOrder: order++,
      });
    }

    if (signalNames.has(SignalName.STRUCTURED_APPROACH)) {
      items.push({
        type: 'strength',
        description:
          'You demonstrated a structured approach to solving the problem.',
        displayOrder: order++,
      });
    }

    if (signalNames.has(SignalName.DISCUSSED_TRADEOFFS)) {
      items.push({
        type: 'strength',
        description:
          'Excellent analysis of trade-offs between different design choices.',
        displayOrder: order++,
      });
    }

    if (signalNames.has(SignalName.MENTIONED_SCALE)) {
      items.push({
        type: 'strength',
        description:
          'You considered scalability and discussed concrete numbers.',
        displayOrder: order++,
      });
    }

    // Weaknesses
    if (redFlagNames.has(RedFlagName.SKIPPED_REQUIREMENTS)) {
      items.push({
        type: 'weakness',
        description:
          'You jumped into the solution without gathering requirements first. Always start with clarifying questions.',
        displayOrder: order++,
      });
    }

    if (redFlagNames.has(RedFlagName.WENT_TOO_DEEP_EARLY)) {
      items.push({
        type: 'weakness',
        description:
          'You dove into implementation details too early. Focus on high-level design first.',
        displayOrder: order++,
      });
    }

    if (redFlagNames.has(RedFlagName.NO_SCALE_MENTION)) {
      items.push({
        type: 'weakness',
        description:
          "You didn't discuss scale or provide concrete numbers for traffic estimates.",
        displayOrder: order++,
      });
    }

    if (redFlagNames.has(RedFlagName.POOR_TIME_MANAGEMENT)) {
      items.push({
        type: 'weakness',
        description:
          'Time management needs improvement. Practice moving through phases more efficiently.',
        displayOrder: order++,
      });
    }

    if (!signalNames.has(SignalName.ADDRESSED_BOTTLENECKS)) {
      items.push({
        type: 'weakness',
        description:
          "You didn't identify or address potential bottlenecks in your design.",
        displayOrder: order++,
      });
    }

    // Suggestions
    if (scores.requirements < SUGGESTION_THRESHOLDS.REQUIREMENTS) {
      items.push({
        type: 'suggestion',
        description:
          'Practice asking clarifying questions at the start of every interview. Aim for 5-7 questions covering functional requirements, non-functional requirements, and constraints.',
        displayOrder: order++,
      });
    }

    if (scores.design < SUGGESTION_THRESHOLDS.DESIGN) {
      items.push({
        type: 'suggestion',
        description:
          'Work on drawing clear high-level architecture diagrams. Practice sketching components, data flow, and APIs.',
        displayOrder: order++,
      });
    }

    if (scores.communication < SUGGESTION_THRESHOLDS.COMMUNICATION) {
      items.push({
        type: 'suggestion',
        description:
          'Improve your communication by using a structured approach: requirements → high-level design → deep dive → bottlenecks.',
        displayOrder: order++,
      });
    }

    if (!signalNames.has(SignalName.DISCUSSED_TRADEOFFS)) {
      items.push({
        type: 'suggestion',
        description:
          'Always discuss trade-offs when comparing design options. Explain the pros and cons of each approach.',
        displayOrder: order++,
      });
    }

    return items;
  }

  /**
   * Generate next steps recommendations
   */
  async generateNextSteps(
    sessionId: number,
    scores: FeedbackScores,
  ): Promise<FeedbackNextStepData[]> {
    const redFlags = await this.redFlagService.getSessionRedFlags(sessionId);
    const redFlagNames = new Set(redFlags.map((f) => f.flagName));

    const nextSteps: FeedbackNextStepData[] = [];
    let order = 0;

    // Prioritize based on weakest areas
    const sortedScores = Object.entries(scores)
      .filter(([key]) => key !== 'overall')
      .sort(([, a], [, b]) => a - b);

    const weakestArea = sortedScores[0][0];

    if (
      weakestArea === 'requirements' ||
      redFlagNames.has(RedFlagName.SKIPPED_REQUIREMENTS)
    ) {
      nextSteps.push({
        description:
          'Practice gathering requirements: Spend 5 minutes at the start of each practice interview asking clarifying questions.',
        displayOrder: order++,
      });
    }

    if (weakestArea === 'design') {
      nextSteps.push({
        description:
          'Study common system design patterns: Load balancers, caching layers, database sharding, and message queues.',
        displayOrder: order++,
      });
    }

    if (weakestArea === 'communication' || !scores.communication) {
      nextSteps.push({
        description:
          'Work on structured communication: Practice explaining your thought process step-by-step.',
        displayOrder: order++,
      });
    }

    if (
      weakestArea === 'timeManagement' ||
      redFlagNames.has(RedFlagName.POOR_TIME_MANAGEMENT)
    ) {
      nextSteps.push({
        description:
          'Improve time management: Set a timer and practice phase transitions at 5, 15, 25, and 40-minute marks.',
        displayOrder: order++,
      });
    }

    if (weakestArea === 'depth') {
      nextSteps.push({
        description:
          'Go deeper on scalability: Practice calculating back-of-the-envelope estimates and discussing bottlenecks.',
        displayOrder: order++,
      });
    }

    // Always recommend another practice
    nextSteps.push({
      description:
        'Do another practice interview within 48 hours to reinforce what you learned.',
      displayOrder: order++,
    });

    return nextSteps;
  }

  /**
   * Generate overall summary
   */
  generateSummary(scores: FeedbackScores): string {
    const overall = scores.overall;

    if (overall >= SUMMARY_THRESHOLDS.EXCELLENT) {
      return "Excellent performance! You demonstrated strong system design skills across all areas. You're well-prepared for real interviews.";
    } else if (overall >= SUMMARY_THRESHOLDS.GOOD) {
      return "Good performance overall. You covered most key areas but there's room for improvement in a few specific areas highlighted below.";
    } else if (overall >= SUMMARY_THRESHOLDS.DECENT) {
      return 'Decent attempt with some good moments, but several important areas need work. Focus on the weaknesses identified below.';
    } else {
      return 'This interview showed significant gaps in system design fundamentals. Review the feedback carefully and practice the recommended next steps.';
    }
  }

  /**
   * Generate complete feedback report for a session
   */
  async generateFeedback(
    sessionId: number,
    regenerate: boolean,
  ): Promise<GenerateFeedbackResult> {
    // Check if session exists (will throw SessionNotFoundException if not found)
    await this.sessionService.getSession(sessionId);

    const existing = await this.db
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0 && !regenerate) {
      return this.getFeedback(sessionId);
    }

    if (existing.length > 0 && regenerate) {
      this.logger.log(`Regenerating feedback for session ${sessionId}`, {
        sessionId,
      });

      // Delete existing feedback report
      await this.db
        .delete(feedbackReports)
        .where(eq(feedbackReports.sessionId, sessionId));

      // Delete existing signals so they can be re-analyzed
      await this.db
        .delete(interviewSignals)
        .where(eq(interviewSignals.sessionId, sessionId));

      this.logger.log(
        `Cleared existing feedback and signals for session ${sessionId}`,
        { sessionId },
      );
    }

    // Batch signal detection: analyze transcript if signals don't exist yet or if regenerating
    const existingSignals =
      await this.signalService.getSessionSignals(sessionId);
    if (existingSignals.length === 0 || regenerate) {
      this.logger.log(
        `Running batch signal analysis for session ${sessionId}`,
        { sessionId, regenerate, existingSignalCount: existingSignals.length },
      );
      await this.analyzeTranscriptSignals(sessionId);
    } else {
      this.logger.log(
        `Skipping batch signal analysis - ${existingSignals.length} signals already exist`,
        { sessionId, existingSignalCount: existingSignals.length },
      );
    }

    // Calculate scores (always rule-based)
    const scores = await this.calculateScores(sessionId);

    let summary: string;
    let items: FeedbackItemData[];
    let nextSteps: FeedbackNextStepData[];

    try {
      this.logger.log('Attempting AI feedback generation', { sessionId });

      // Generate AI feedback
      const aiFeedback = await this.generateAIFeedback(sessionId, scores);
      summary = aiFeedback.overallSummary;
      items = aiFeedback.items;
      nextSteps = aiFeedback.nextSteps;

      this.logger.log('AI feedback generation successful', { sessionId });
    } catch (error) {
      this.logger.warn(
        'AI feedback generation failed, falling back to rule-based',
        {
          sessionId,
          error: error.message,
        },
      );

      // Fall back to rule-based
      summary = this.generateSummary(scores);
      items = await this.generateFeedbackItems(sessionId, scores);
      nextSteps = await this.generateNextSteps(sessionId, scores);
    }

    // Insert feedback report
    const [report] = await this.db
      .insert(feedbackReports)
      .values({
        sessionId,
        overallScore: scores.overall,
        requirementsScore: scores.requirements,
        designScore: scores.design,
        communicationScore: scores.communication,
        timeManagementScore: scores.timeManagement,
        depthScore: scores.depth,
        overallSummary: summary,
      })
      .returning();

    // Insert feedback items
    const itemRecords = await Promise.all(
      items.map((item) =>
        this.db
          .insert(feedbackItems)
          .values({
            reportId: report.id,
            itemType: item.type,
            description: item.description,
            displayOrder: item.displayOrder,
          })
          .returning(),
      ),
    );

    // Insert next steps
    const nextStepRecords = await Promise.all(
      nextSteps.map((step) =>
        this.db
          .insert(feedbackNextSteps)
          .values({
            reportId: report.id,
            description: step.description,
            displayOrder: step.displayOrder,
          })
          .returning(),
      ),
    );

    // Return flat structure with report fields at top level
    return {
      ...report,
      items: itemRecords
        .map((r) => r[0])
        .map((r) => ({
          type: r.itemType as 'strength' | 'weakness' | 'suggestion',
          description: r.description,
          displayOrder: r.displayOrder,
        })),
      nextSteps: nextStepRecords
        .map((r) => r[0])
        .map((r) => ({
          description: r.description,
          displayOrder: r.displayOrder,
        })),
    };
  }

  /**
   * Get existing feedback report
   */
  async getFeedback(sessionId: number): Promise<GenerateFeedbackResult> {
    const [report] = await this.db
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.sessionId, sessionId))
      .limit(1);

    if (!report) {
      throw new FeedbackNotFoundException(sessionId);
    }

    const items = await this.db
      .select()
      .from(feedbackItems)
      .where(eq(feedbackItems.reportId, report.id))
      .orderBy(feedbackItems.displayOrder);

    const nextSteps = await this.db
      .select()
      .from(feedbackNextSteps)
      .where(eq(feedbackNextSteps.reportId, report.id))
      .orderBy(feedbackNextSteps.displayOrder);

    // Return flat structure with report fields at top level
    return {
      ...report,
      items: items.map((item) => ({
        type: item.itemType as 'strength' | 'weakness' | 'suggestion',
        description: item.description,
        displayOrder: item.displayOrder,
      })),
      nextSteps: nextSteps.map((step) => ({
        description: step.description,
        displayOrder: step.displayOrder,
      })),
    };
  }

  /**
   * Get feedback scores for multiple sessions (for dashboard)
   */
  async getFeedbackScoresForSessions(sessionIds: number[]) {
    if (sessionIds.length === 0) {
      return new Map();
    }

    const reports = await this.db.query.feedbackReports.findMany({
      where: (reports, { inArray }) => inArray(reports.sessionId, sessionIds),
      columns: {
        sessionId: true,
        overallScore: true,
        requirementsScore: true,
        designScore: true,
        communicationScore: true,
        timeManagementScore: true,
        depthScore: true,
      },
    });

    return new Map(reports.map((r) => [r.sessionId, r]));
  }

  /**
   * Check if feedback exists for a session
   */
  async feedbackExists(sessionId: number): Promise<boolean> {
    const result = await this.db
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.sessionId, sessionId))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Get human-readable phase name
   */
  private getPhaseDisplayName(phase: string): string {
    const names: Record<string, string> = {
      problem: 'Problem Understanding',
      requirements: 'Requirements Gathering',
      high_level: 'High-Level Design',
      deep_dive: 'Deep Dive',
      bottlenecks: 'Bottlenecks & Trade-offs',
      wrap_up: 'Wrap Up',
    };
    return names[phase] || phase;
  }

  /**
   * AI system prompt for feedback generation
   */
  private readonly AI_FEEDBACK_SYSTEM_PROMPT = `You are a senior software engineer who conducts system design interviews at top tech companies. You have 10+ years of experience and have interviewed hundreds of candidates.

Your task is to write detailed, constructive interview feedback that:
- References specific moments from the conversation
- Balances strengths and weaknesses honestly
- Provides actionable improvement suggestions
- Explains your reasoning clearly
- Matches the expectations for the candidate's level and company type

You write feedback that hiring committees use to make decisions.`;

  /**
   * Generate AI-powered feedback for a session
   */
  private async generateAIFeedback(
    sessionId: number,
    scores: FeedbackScores,
  ): Promise<{
    overallSummary: string;
    items: FeedbackItemData[];
    nextSteps: FeedbackNextStepData[];
  }> {
    const logger = this.logger;
    const logContext = { sessionId };

    try {
      // Step 1: Gather data
      logger.log('Gathering feedback data for AI generation', logContext);
      const [session, signals, redFlags, messages] = await Promise.all([
        this.sessionService.getSession(sessionId),
        this.signalService.getSessionSignals(sessionId),
        this.redFlagService.getSessionRedFlags(sessionId),
        this.getSessionMessages(sessionId),
      ]);

      // Step 2: Build prompt
      logger.log('Building AI prompt', logContext);
      const prompt = this.buildAIFeedbackPrompt(
        sessionId,
        scores,
        session,
        messages,
        signals,
        redFlags,
      );

      // Step 3: Call AI service with 120-second timeout
      logger.log('Calling AI service', {
        ...logContext,
        promptLength: prompt.length,
      });
      const aiResponse = await this.aiService.generateResponse({
        systemPrompt: this.AI_FEEDBACK_SYSTEM_PROMPT,
        userMessage: prompt,
        temperature: 0.7,
        maxTokens: 4000,
        timeout: 120000, // 120 seconds for comprehensive feedback generation
        model: 'claude-sonnet-4-5', // Use Sonnet for better structured output
      });

      logger.log('AI response received', {
        ...logContext,
        model: aiResponse.model,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      });

      // Step 4: Parse JSON response
      const parsed = this.parseAIResponse(aiResponse.text);

      // Step 5: Transform to service format
      return this.transformAIResponse(parsed);
    } catch (error) {
      logger.error('AI feedback generation error', {
        ...logContext,
        error: error.message,
        stack: error.stack,
      });

      // Capture error in Sentry before falling back to rule-based feedback
      Sentry.captureException(error, {
        tags: {
          sessionId: sessionId.toString(),
          service: 'FeedbackService',
          method: 'generateAIFeedback',
          aiFeature: 'feedback_generation',
        },
        extra: {
          scores,
          errorMessage: error.message,
        },
        level: 'error',
      });

      // Re-throw to trigger fallback in parent method
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for AI feedback generation
   */
  private buildAIFeedbackPrompt(
    sessionId: number,
    scores: FeedbackScores,
    session: any,
    messages: any[],
    signals: any[],
    redFlags: any[],
  ): string {
    const transcript = this.formatTranscript(messages);
    const signalsText = this.formatSignals(signals);
    const redFlagsText = this.formatRedFlags(redFlags);
    const threshold = this.determineHireThreshold(
      session.companyStyle,
      session.level,
    );

    return `INTERVIEW CONTEXT:
- Candidate Level: ${session.level}
- Company Style: ${session.companyStyle}
- Problem: ${session.problem?.title || 'System Design Interview'}
- Duration: ${Math.round((session.duration || 0) / 60)} minutes
- Completion Status: ${session.status}

PERFORMANCE SCORES (0-100 scale):
Your scoring system calculated these scores based on detected behaviors:
- Requirements: ${scores.requirements}/100
- Design: ${scores.design}/100
- Communication: ${scores.communication}/100
- Time Management: ${scores.timeManagement}/100
- Technical Depth: ${scores.depth}/100
- Overall: ${scores.overall}/100

DETECTED POSITIVE SIGNALS:
${signalsText}

DETECTED RED FLAGS:
${redFlagsText}

FULL INTERVIEW TRANSCRIPT:
${transcript}

---

HIRING STANDARDS:

For ${session.companyStyle} companies at ${session.level} level:

${this.getHiringStandardsText(session.companyStyle, session.level, threshold)}

---

OUTPUT FORMAT:

Return ONLY a valid JSON object. Do not include any text before or after the JSON. Do not wrap it in markdown code blocks.

{
  "overallSummary": "**VERDICT: HIRE** (or **VERDICT: NO HIRE**) followed by 2-3 paragraphs summarizing performance, referencing specific moments from the transcript, and explaining your hire/no-hire decision clearly.",
  "strengths": [
    "Specific strength with example from transcript",
    "Another strength...",
    ...3-5 items
  ],
  "weaknesses": [
    "Specific weakness with example from transcript",
    "Another weakness...",
    ...2-4 items
  ],
  "suggestions": [
    "Actionable suggestion for improvement",
    "Another suggestion...",
    ...3-5 items
  ],
  "nextSteps": [
    "Concrete action to take (e.g., 'Practice calculating back-of-envelope estimates for 1M DAU systems')",
    ...3-4 items
  ]
}

CRITICAL FORMATTING RULES:
- Return ONLY the JSON object above, nothing else
- Do NOT add any explanatory text before or after the JSON
- Do NOT wrap the JSON in markdown code blocks (no \`\`\`json)
- Start overallSummary with **VERDICT: HIRE** or **VERDICT: NO HIRE** on the first line
- Be SPECIFIC: Reference actual quotes or moments from the transcript
- Be BALANCED: Acknowledge both strengths and weaknesses
- Be ACTIONABLE: Every suggestion should be concrete
- Be HONEST: Don't sugarcoat significant gaps
- Consider the LEVEL and COMPANY when setting expectations
- The verdict should align with scores and company standards`;
  }

  /**
   * Format signals for prompt
   */
  private formatSignals(signals: any[]): string {
    if (signals.length === 0) {
      return 'None detected';
    }

    return signals
      .map((signal) => {
        const time = this.formatTime(signal.secondsElapsed || 0);
        return `- ${signal.signalName.replace(/_/g, ' ').toUpperCase()} (${time}, ${signal.phase || 'unknown'} phase)`;
      })
      .join('\n');
  }

  /**
   * Format red flags for prompt
   */
  private formatRedFlags(redFlags: any[]): string {
    if (redFlags.length === 0) {
      return 'None detected';
    }

    return redFlags
      .map((flag) => {
        const time = this.formatTime(flag.secondsElapsed || 0);
        return `- ${flag.flagName.replace(/_/g, ' ').toUpperCase()} (${time}, ${flag.phase || 'unknown'} phase)`;
      })
      .join('\n');
  }

  /**
   * Format transcript for prompt
   */
  private formatTranscript(messages: any[]): string {
    return messages
      .map((msg) => {
        const timestamp = this.formatTime(msg.secondsElapsed || 0);
        const role = msg.role === 'user' ? 'Candidate' : 'Interviewer';
        const phase = msg.phase || 'unknown';
        return `[${timestamp}] [${phase}] ${role}:\n${msg.text}`;
      })
      .join('\n\n');
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get hiring standards text for prompt
   */
  private getHiringStandardsText(
    companyStyle: string,
    level: string,
    threshold: number,
  ): string {
    if (companyStyle === 'faang') {
      return `FAANG STANDARDS:
- Hire threshold: Overall score >= ${threshold}
- Must demonstrate: Strong requirements gathering, scalability thinking, clear communication
- Red flags are serious concerns that often lead to no-hire decisions
- Expectations are high; good performance in most areas is required`;
    } else {
      return `${companyStyle.toUpperCase()} STANDARDS:
- Hire threshold: Overall score >= ${threshold}
- More forgiving on: Time management, depth of scale discussion
- Focus on: Practical design, clear thinking process, ability to build working systems
- Red flags should be considered in context of overall performance`;
    }
  }

  /**
   * Determine hire threshold based on company and level
   */
  private determineHireThreshold(companyStyle: string, level: string): number {
    const thresholds: Record<string, Record<string, number>> = {
      faang: { junior: 70, mid: 75, senior: 80 },
      startup: { junior: 65, mid: 70, senior: 75 },
      generic: { junior: 65, mid: 70, senior: 75 },
    };

    return thresholds[companyStyle]?.[level] ?? 70;
  }

  /**
   * Get session messages for transcript
   */
  private async getSessionMessages(sessionId: number): Promise<any[]> {
    const messages = await this.db.query.transcriptMessages.findMany({
      where: (messages, { eq }) => eq(messages.sessionId, sessionId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    return messages;
  }

  /**
   * Parse AI response JSON
   */
  private parseAIResponse(text: string): any {
    try {
      // Try to extract JSON from the response
      // AI might wrap it in code blocks or add explanatory text
      let jsonText = text.trim();

      // Remove code block markers if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }

      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      jsonText = jsonText.trim();

      // Parse JSON
      const parsed = JSON.parse(jsonText);

      // Basic structure validation
      if (
        !parsed.overallSummary ||
        !Array.isArray(parsed.strengths) ||
        !Array.isArray(parsed.weaknesses) ||
        !Array.isArray(parsed.suggestions) ||
        !Array.isArray(parsed.nextSteps)
      ) {
        throw new Error('AI response missing required fields');
      }

      return parsed;
    } catch (error) {
      // Capture parsing error with the raw response text for debugging
      Sentry.captureException(error, {
        tags: {
          service: 'FeedbackService',
          method: 'parseAIResponse',
          errorType: 'json_parse_error',
        },
        extra: {
          rawResponseText: text,
          rawResponseLength: text.length,
          errorMessage: error.message,
        },
        level: 'error',
      });

      throw error;
    }
  }

  /**
   * Transform AI response to service format
   */
  private transformAIResponse(parsed: any): {
    overallSummary: string;
    items: FeedbackItemData[];
    nextSteps: FeedbackNextStepData[];
  } {
    const items: FeedbackItemData[] = [];
    let order = 0;

    // Add strengths
    for (const strength of parsed.strengths) {
      items.push({
        type: 'strength',
        description: strength,
        displayOrder: order++,
      });
    }

    // Add weaknesses
    for (const weakness of parsed.weaknesses) {
      items.push({
        type: 'weakness',
        description: weakness,
        displayOrder: order++,
      });
    }

    // Add suggestions
    for (const suggestion of parsed.suggestions) {
      items.push({
        type: 'suggestion',
        description: suggestion,
        displayOrder: order++,
      });
    }

    // Transform next steps
    const nextSteps: FeedbackNextStepData[] = parsed.nextSteps.map(
      (step: string, index: number) => ({
        description: step,
        displayOrder: index,
      }),
    );

    return {
      overallSummary: parsed.overallSummary,
      items,
      nextSteps,
    };
  }
}
