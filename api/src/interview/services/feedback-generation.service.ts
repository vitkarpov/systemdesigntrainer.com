import { Injectable, Inject, Logger } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import type { db as DbType } from '../../../db/db';
import { eq } from 'drizzle-orm';
import {
  feedbackReports,
  feedbackSections,
  type NewFeedbackSection,
} from '../../../db/schema';
import { FeedbackService, type FeedbackScores } from './feedback.service';
import { AiResponse, AiService } from '../../ai/services/ai.service';
import { InterviewSessionService } from './interview-session.service';
import { SignalService } from './signal.service';
import { RedFlagService } from './red-flag.service';
import { estimateClaudeCost } from '../utils/ai-cost-estimator.util';

export interface ParsedFeedback {
  recommendation: string;
  overallAssessment: string;
  sections: {
    sectionType: string;
    dimension?: string;
    content: string;
    displayOrder: number;
  }[];
}

export interface AiFeedbackResult {
  report: {
    id: number;
    sessionId: number;
    overallScore: number;
    requirementsScore: number;
    designScore: number;
    communicationScore: number;
    timeManagementScore: number;
    depthScore: number;
    recommendation: string | null;
    overallAssessment: string | null;
    generationMethod: string;
    aiModel: string | null;
    generationDurationMs: number | null;
    createdAt: Date;
  };
  sections: {
    sectionType: string;
    dimension: string | null;
    content: string;
    displayOrder: number;
  }[];
}

/**
 * FeedbackGenerationService
 *
 * Generates AI-powered interview feedback that resembles real interviewer
 * feedback to hiring committees. Includes hire/no-hire recommendations,
 * detailed performance analysis, and specific improvement suggestions.
 *
 * This service orchestrates:
 * 1. Data collection (transcript, signals, red flags, scores)
 * 2. Prompt construction
 * 3. AI feedback generation
 * 4. Output validation and parsing
 * 5. Database storage
 */
@Injectable()
export class FeedbackGenerationService {
  private readonly logger = new Logger(FeedbackGenerationService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private feedbackService: FeedbackService,
    private aiService: AiService,
    private sessionService: InterviewSessionService,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
  ) {}

  /**
   * Generate AI-powered feedback for a session
   * Falls back to rule-based feedback on errors
   */
  async generateAiFeedback(sessionId: number): Promise<AiFeedbackResult> {
    const startTime = Date.now();
    const logContext = { sessionId };

    try {
      this.logger.log('Starting AI feedback generation', logContext);

      // Check if feedback already exists
      const existing = await this.db
        .select()
        .from(feedbackReports)
        .where(eq(feedbackReports.sessionId, sessionId))
        .limit(1);

      if (existing.length > 0) {
        this.logger.log('Feedback already exists, returning existing', {
          ...logContext,
          method: existing[0].generationMethod,
        });
        return this.getAiFeedback(sessionId);
      }

      // Step 1: Calculate scores (existing logic)
      const scores = await this.feedbackService.calculateScores(sessionId);

      // Step 2: Prepare prompt data
      const promptData = await this.preparePromptData(sessionId, scores);

      // Step 3: Build prompt
      const prompt = this.buildFeedbackPrompt(promptData);

      // Step 4: Generate feedback using AI
      this.logger.log('Calling AI service', logContext);
      const aiStartTime = Date.now();

      const aiResponse = await this.aiService.generateResponse({
        systemPrompt:
          'You are a senior software engineer conducting system design interviews.',
        userMessage: prompt,
        temperature: 0.7,
        maxTokens: 4000,
      });

      const aiDurationMs = Date.now() - aiStartTime;

      // Estimate cost using utility
      const costEstimate = aiResponse.usage
        ? estimateClaudeCost(aiResponse.model, {
            inputTokens: aiResponse.usage.inputTokens,
            outputTokens: aiResponse.usage.outputTokens,
          })
        : null;

      this.logger.log('AI response received', {
        ...logContext,
        model: aiResponse.model,
        durationMs: aiDurationMs,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
        estimatedCost: costEstimate?.totalCost,
      });

      // Step 5: Parse and validate response
      const parsedFeedback = this.parseFeedbackResponse(aiResponse.text);

      // Step 6: Validate feedback
      if (!this.validateFeedback(parsedFeedback)) {
        this.logger.warn(
          'AI feedback validation failed, falling back to rule-based',
          {
            ...logContext,
            validationErrors: this.getValidationErrors(parsedFeedback),
          },
        );
        return this.fallbackToRuleBased(sessionId);
      }

      const durationMs = Date.now() - startTime;

      // Step 7: Store in database
      const result = await this.saveFeedback({
        sessionId,
        scores,
        parsedFeedback,
        aiModel: aiResponse.model,
        durationMs,
      });

      this.logger.log('AI feedback generated successfully', {
        ...logContext,
        totalDurationMs: durationMs,
        aiDurationMs,
        sectionCount: parsedFeedback.sections.length,
        recommendation: parsedFeedback.recommendation,
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      this.logger.error('AI feedback generation failed', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
        durationMs,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Fall back to rule-based feedback
      return this.fallbackToRuleBased(sessionId);
    }
  }

  /**
   * Prepare data needed for prompt construction
   */
  private async preparePromptData(sessionId: number, scores: FeedbackScores) {
    const [session, signals, redFlags, transcript, interviewCase] =
      await Promise.all([
        this.sessionService.getSession(sessionId),
        this.signalService.getSessionSignals(sessionId),
        this.redFlagService.getSessionRedFlags(sessionId),
        this.getTranscript(sessionId),
        this.sessionService.getSession(sessionId).then((s) => s.caseId),
      ]);

    return {
      session,
      signals,
      redFlags,
      transcript,
      scores,
      // TODO: Load interview case details when needed
      interviewCaseId: interviewCase,
    };
  }

  /**
   * Get formatted transcript
   */
  private async getTranscript(sessionId: number): Promise<string> {
    const messages = await this.db.query.transcriptMessages.findMany({
      where: (messages, { eq }) => eq(messages.sessionId, sessionId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    return messages
      .map((msg) => {
        const timestamp = this.formatSecondsElapsed(msg.secondsElapsed);
        const role =
          msg.role === 'candidate'
            ? 'Candidate'
            : msg.role === 'interviewer'
              ? 'Interviewer'
              : 'System';
        return `[${timestamp}] [${msg.phase.toUpperCase()}] ${role}:\n${msg.text}`;
      })
      .join('\n\n');
  }

  /**
   * Format seconds elapsed as MM:SS
   */
  private formatSecondsElapsed(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Build the AI prompt for feedback generation
   * This is the core prompt that drives the AI's output
   */
  private buildFeedbackPrompt(data: any): string {
    const { session, signals, redFlags, transcript, scores } = data;

    const signalsSummary = signals
      .map(
        (s) =>
          `- ${s.signalName} (at ${this.formatSecondsElapsed(s.secondsElapsed)})`,
      )
      .join('\n');

    const redFlagsSummary = redFlags
      .map(
        (f) =>
          `- ${f.flagName} (at ${this.formatSecondsElapsed(f.secondsElapsed)})`,
      )
      .join('\n');

    const sessionDuration = this.calculateSessionDuration(session);

    return `You are a senior software engineer who just completed a system design interview at a ${session.companyStyle} company.
You need to write detailed feedback for the hiring committee about a ${session.level}-level engineer candidate.

INTERVIEW DETAILS:
- Duration: ${sessionDuration} minutes
- Company style: ${session.companyStyle}
- Engineer level: ${session.level}
- Status: ${session.status}

CANDIDATE TRANSCRIPT:
${transcript}

DETECTED SIGNALS (positive indicators):
${signalsSummary || 'None detected'}

DETECTED RED FLAGS (negative indicators):
${redFlagsSummary || 'None detected'}

CALCULATED SCORES (0-100 scale):
- Requirements: ${scores.requirements}/100
- Design: ${scores.design}/100
- Communication: ${scores.communication}/100
- Time Management: ${scores.timeManagement}/100
- Technical Depth: ${scores.depth}/100
- Overall: ${scores.overall}/100

---

Write detailed interview feedback using this EXACT structure:

RECOMMENDATION: [Choose one: STRONG_HIRE | HIRE | MAYBE | NO_HIRE | STRONG_NO_HIRE]

OVERALL_ASSESSMENT:
[2-3 paragraphs summarizing the candidate's performance. Reference specific moments from the conversation. Explain how their performance compares to the hiring bar for a ${session.level} engineer at a ${session.companyStyle} company. Be specific and actionable.]

---

DIMENSIONAL_BREAKDOWN:

Requirements Gathering (${scores.requirements}/100):
[2-3 paragraphs analyzing their requirements gathering. Include specific examples from the transcript, explain what they did well, what they missed, and why it matters.]

System Design (${scores.design}/100):
[2-3 paragraphs analyzing their system design approach. Reference specific design decisions they made, discuss completeness, and identify gaps.]

Communication (${scores.communication}/100):
[2-3 paragraphs analyzing how they communicated. Discuss structure, clarity, collaboration, and ability to explain their thinking.]

Time Management (${scores.timeManagement}/100):
[2-3 paragraphs analyzing their pacing. Reference specific timestamps where they spent too much or too little time.]

Technical Depth (${scores.depth}/100):
[2-3 paragraphs analyzing technical depth. Discuss scale calculations, bottleneck analysis, and trade-off discussions with specific examples.]

---

KEY_STRENGTHS:
[List 3-5 specific strengths with examples from the conversation. Each bullet should reference what they did and why it was good.]

---

AREAS_FOR_IMPROVEMENT:
[List 3-5 specific weaknesses with examples. Each bullet should explain what they missed, provide an example, and explain why it matters in real interviews.]

---

NEXT_STEPS:
[List 3-5 concrete, actionable recommendations. Each should be specific and prioritized by impact. Avoid generic advice like "practice more".]

---

EXAMPLES:
[Provide 2-3 specific examples of what they should have said or done differently, with exact quotes or scenarios.]

---

IMPORTANT GUIDELINES:
- Be SPECIFIC: Quote or reference actual moments from the interview
- Be BALANCED: Acknowledge both strengths and weaknesses honestly
- Be ACTIONABLE: Every suggestion should be concrete and specific
- Be HONEST: Don't sugarcoat significant gaps
- Be CONSTRUCTIVE: Frame feedback as learning opportunities
- Consider LEVEL: ${session.level} engineers have different expectations
- Consider COMPANY: ${session.companyStyle} companies have different standards`;
  }

  /**
   * Calculate session duration in minutes
   */
  private calculateSessionDuration(session: any): number {
    if (!session.startedAt || !session.completedAt) {
      return 0;
    }
    const durationMs =
      session.completedAt.getTime() - session.startedAt.getTime();
    return Math.round(durationMs / 60000);
  }

  /**
   * Parse AI response into structured feedback
   * Extracts sections based on markers in the response
   */
  private parseFeedbackResponse(response: string): ParsedFeedback {
    const lines = response.split('\n');
    let recommendation = '';
    let overallAssessment = '';
    const sections: ParsedFeedback['sections'] = [];

    let currentSection: string | null = null;
    let currentDimension: string | null = null;
    let currentContent: string[] = [];
    let sectionOrder = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Parse recommendation
      if (trimmed.startsWith('RECOMMENDATION:')) {
        recommendation = trimmed.replace('RECOMMENDATION:', '').trim();
        continue;
      }

      // Parse sections
      if (trimmed === 'OVERALL_ASSESSMENT:') {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            sectionType: currentSection,
            dimension: currentDimension,
            content: currentContent.join('\n').trim(),
            displayOrder: sectionOrder++,
          });
        }
        currentSection = 'overall_assessment';
        currentDimension = null;
        currentContent = [];
        continue;
      }

      if (trimmed === 'DIMENSIONAL_BREAKDOWN:') {
        if (
          currentSection === 'overall_assessment' &&
          currentContent.length > 0
        ) {
          overallAssessment = currentContent.join('\n').trim();
        }
        currentSection = null;
        currentContent = [];
        continue;
      }

      // Parse dimensional breakdown
      if (
        trimmed.match(
          /^(Requirements Gathering|System Design|Communication|Time Management|Technical Depth)\s*\(/,
        )
      ) {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            sectionType: currentSection,
            dimension: currentDimension,
            content: currentContent.join('\n').trim(),
            displayOrder: sectionOrder++,
          });
        }

        currentSection = 'dimensional_breakdown';
        const dimensionMatch = trimmed.match(/^([^(]+)/);
        if (dimensionMatch) {
          const dimName = dimensionMatch[1].trim();
          currentDimension = this.normalizeDimensionName(dimName);
        }
        currentContent = [];
        continue;
      }

      if (trimmed === 'KEY_STRENGTHS:') {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            sectionType: currentSection,
            dimension: currentDimension,
            content: currentContent.join('\n').trim(),
            displayOrder: sectionOrder++,
          });
        }
        currentSection = 'key_strengths';
        currentDimension = null;
        currentContent = [];
        continue;
      }

      if (trimmed === 'AREAS_FOR_IMPROVEMENT:') {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            sectionType: currentSection,
            dimension: currentDimension,
            content: currentContent.join('\n').trim(),
            displayOrder: sectionOrder++,
          });
        }
        currentSection = 'areas_for_improvement';
        currentDimension = null;
        currentContent = [];
        continue;
      }

      if (trimmed === 'NEXT_STEPS:') {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            sectionType: currentSection,
            dimension: currentDimension,
            content: currentContent.join('\n').trim(),
            displayOrder: sectionOrder++,
          });
        }
        currentSection = 'next_steps';
        currentDimension = null;
        currentContent = [];
        continue;
      }

      if (trimmed === 'EXAMPLES:') {
        if (currentSection && currentContent.length > 0) {
          sections.push({
            sectionType: currentSection,
            dimension: currentDimension,
            content: currentContent.join('\n').trim(),
            displayOrder: sectionOrder++,
          });
        }
        currentSection = 'examples';
        currentDimension = null;
        currentContent = [];
        continue;
      }

      // Skip section dividers and guidelines
      if (trimmed === '---' || trimmed.startsWith('IMPORTANT GUIDELINES:')) {
        continue;
      }

      // Accumulate content
      if (currentSection && trimmed) {
        currentContent.push(line);
      }
    }

    // Push final section
    if (currentSection && currentContent.length > 0) {
      if (currentSection === 'overall_assessment') {
        overallAssessment = currentContent.join('\n').trim();
      } else {
        sections.push({
          sectionType: currentSection,
          dimension: currentDimension,
          content: currentContent.join('\n').trim(),
          displayOrder: sectionOrder++,
        });
      }
    }

    return {
      recommendation: this.normalizeRecommendation(recommendation),
      overallAssessment,
      sections,
    };
  }

  /**
   * Normalize dimension names to match database schema
   */
  private normalizeDimensionName(name: string): string {
    const normalized = name.toLowerCase().replace(/\s+/g, '_');
    const mapping: Record<string, string> = {
      requirements_gathering: 'requirements',
      system_design: 'design',
      communication: 'communication',
      time_management: 'time_management',
      technical_depth: 'depth',
    };
    return mapping[normalized] || normalized;
  }

  /**
   * Normalize recommendation to match database enum
   */
  private normalizeRecommendation(rec: string): string {
    const normalized = rec.toLowerCase().replace(/\s+/g, '_');
    const valid = ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'];
    return valid.includes(normalized) ? normalized : 'maybe';
  }

  /**
   * Validate parsed feedback has all required sections
   */
  private validateFeedback(feedback: ParsedFeedback): boolean {
    // Must have recommendation
    if (!feedback.recommendation) {
      this.logger.warn('Validation failed: Missing recommendation');
      return false;
    }

    // Must have overall assessment
    if (
      !feedback.overallAssessment ||
      feedback.overallAssessment.length < 100
    ) {
      this.logger.warn(
        'Validation failed: Overall assessment missing or too short',
      );
      return false;
    }

    // Must have dimensional breakdown for all 5 dimensions
    const dimensions = feedback.sections
      .filter((s) => s.sectionType === 'dimensional_breakdown')
      .map((s) => s.dimension);

    const requiredDimensions = [
      'requirements',
      'design',
      'communication',
      'time_management',
      'depth',
    ];

    for (const dim of requiredDimensions) {
      if (!dimensions.includes(dim)) {
        this.logger.warn(
          `Validation failed: Missing dimensional breakdown for ${dim}`,
        );
        return false;
      }
    }

    // Must have key strengths, areas for improvement, and next steps
    const sectionTypes = new Set(feedback.sections.map((s) => s.sectionType));

    if (!sectionTypes.has('key_strengths')) {
      this.logger.warn('Validation failed: Missing key_strengths');
      return false;
    }

    if (!sectionTypes.has('areas_for_improvement')) {
      this.logger.warn('Validation failed: Missing areas_for_improvement');
      return false;
    }

    if (!sectionTypes.has('next_steps')) {
      this.logger.warn('Validation failed: Missing next_steps');
      return false;
    }

    // Check for minimum content length
    const totalContentLength = feedback.sections.reduce(
      (sum, s) => sum + s.content.length,
      0,
    );

    if (totalContentLength < 500) {
      this.logger.warn(
        'Validation failed: Total content too short (< 500 chars)',
      );
      return false;
    }

    return true;
  }

  /**
   * Save AI-generated feedback to database
   */
  private async saveFeedback({
    sessionId,
    scores,
    parsedFeedback,
    aiModel,
    durationMs,
  }: {
    sessionId: number;
    scores: FeedbackScores;
    parsedFeedback: ParsedFeedback;
    aiModel: string;
    durationMs: number;
  }): Promise<AiFeedbackResult> {
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
        overallSummary: parsedFeedback.overallAssessment.substring(0, 500), // Legacy field
        recommendation: parsedFeedback.recommendation,
        overallAssessment: parsedFeedback.overallAssessment,
        generationMethod: 'ai_generated',
        aiModel,
        generationDurationMs: durationMs,
      })
      .returning();

    // Insert feedback sections
    const sectionRecords = await Promise.all(
      parsedFeedback.sections.map((section) =>
        this.db
          .insert(feedbackSections)
          .values({
            reportId: report.id,
            sectionType: section.sectionType,
            dimension: section.dimension || null,
            content: section.content,
            displayOrder: section.displayOrder,
          })
          .returning(),
      ),
    );

    return {
      report,
      sections: sectionRecords.map((r) => r[0]),
    };
  }

  /**
   * Fall back to rule-based feedback generation
   */
  private async fallbackToRuleBased(
    sessionId: number,
  ): Promise<AiFeedbackResult> {
    this.logger.log(
      `Falling back to rule-based feedback for session ${sessionId}`,
    );

    // Use existing rule-based generation
    const ruleFeedback = await this.feedbackService.generateFeedback(sessionId);

    // Convert to AiFeedbackResult format
    return {
      report: {
        id: ruleFeedback.id,
        sessionId: ruleFeedback.sessionId,
        overallScore: ruleFeedback.overallScore,
        requirementsScore: ruleFeedback.requirementsScore,
        designScore: ruleFeedback.designScore,
        communicationScore: ruleFeedback.communicationScore,
        timeManagementScore: ruleFeedback.timeManagementScore,
        depthScore: ruleFeedback.depthScore,
        recommendation: null,
        overallAssessment: null,
        generationMethod: 'rule_based',
        aiModel: null,
        generationDurationMs: null,
        createdAt: ruleFeedback.createdAt,
      },
      sections: [],
    };
  }

  /**
   * Get existing AI-generated feedback
   */
  async getAiFeedback(sessionId: number): Promise<AiFeedbackResult> {
    const [report] = await this.db
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.sessionId, sessionId))
      .limit(1);

    if (!report) {
      throw new Error(`Feedback not found for session ${sessionId}`);
    }

    const sections = await this.db
      .select()
      .from(feedbackSections)
      .where(eq(feedbackSections.reportId, report.id))
      .orderBy(feedbackSections.displayOrder);

    return {
      report,
      sections,
    };
  }

  /**
   * Get detailed validation errors for logging
   */
  private getValidationErrors(feedback: ParsedFeedback): string[] {
    const errors: string[] = [];

    if (!feedback.recommendation) {
      errors.push('Missing recommendation');
    }

    if (
      !feedback.overallAssessment ||
      feedback.overallAssessment.length < 100
    ) {
      errors.push('Overall assessment missing or too short');
    }

    const dimensions = feedback.sections
      .filter((s) => s.sectionType === 'dimensional_breakdown')
      .map((s) => s.dimension);

    const requiredDimensions = [
      'requirements',
      'design',
      'communication',
      'time_management',
      'depth',
    ];

    for (const dim of requiredDimensions) {
      if (!dimensions.includes(dim)) {
        errors.push(`Missing dimensional breakdown for ${dim}`);
      }
    }

    const sectionTypes = new Set(feedback.sections.map((s) => s.sectionType));

    if (!sectionTypes.has('key_strengths')) {
      errors.push('Missing key_strengths section');
    }

    if (!sectionTypes.has('areas_for_improvement')) {
      errors.push('Missing areas_for_improvement section');
    }

    if (!sectionTypes.has('next_steps')) {
      errors.push('Missing next_steps section');
    }

    const totalContentLength = feedback.sections.reduce(
      (sum, s) => sum + s.content.length,
      0,
    );

    if (totalContentLength < 500) {
      errors.push(
        `Total content too short (${totalContentLength} < 500 chars)`,
      );
    }

    return errors;
  }
}
