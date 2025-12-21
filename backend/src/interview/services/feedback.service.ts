import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import {
  feedbackReports,
  feedbackItems,
  feedbackNextSteps,
  interviewSessions,
} from '../../db/schema';
import { SignalService, SignalName } from './signal.service';
import { RedFlagService, RedFlagName } from './red-flag.service';
import { InterviewSessionService } from './interview-session.service';

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
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private sessionService: InterviewSessionService,
  ) {}

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
    let requirementsScore = 50; // Base score
    if (signalNames.has(SignalName.ASKED_FUNCTIONAL_REQS))
      requirementsScore += 15;
    if (signalNames.has(SignalName.ASKED_NON_FUNCTIONAL_REQS))
      requirementsScore += 15;
    if (signalNames.has(SignalName.CLARIFIED_CONSTRAINTS))
      requirementsScore += 10;
    if (signalNames.has(SignalName.ASKED_CLARIFYING_QUESTIONS))
      requirementsScore += 10;
    if (redFlagNames.has(RedFlagName.SKIPPED_REQUIREMENTS))
      requirementsScore -= 30;
    if (redFlagNames.has(RedFlagName.MISUNDERSTOOD_PROBLEM))
      requirementsScore -= 20;
    requirementsScore = Math.max(0, Math.min(100, requirementsScore));

    // Calculate design score (0-100)
    let designScore = 50; // Base score
    if (signalNames.has(SignalName.DREW_HIGH_LEVEL_DIAGRAM)) designScore += 15;
    if (signalNames.has(SignalName.PROPOSED_API)) designScore += 10;
    if (signalNames.has(SignalName.DISCUSSED_DATA_MODEL)) designScore += 15;
    if (signalNames.has(SignalName.ADDRESSED_BOTTLENECKS)) designScore += 10;
    if (redFlagNames.has(RedFlagName.NO_SCALE_MENTION)) designScore -= 20;
    designScore = Math.max(0, Math.min(100, designScore));

    // Calculate communication score (0-100)
    let communicationScore = 50; // Base score
    if (signalNames.has(SignalName.STRUCTURED_APPROACH))
      communicationScore += 15;
    if (signalNames.has(SignalName.DISCUSSED_TRADEOFFS))
      communicationScore += 15;
    if (signalNames.has(SignalName.ASKED_CLARIFYING_QUESTIONS))
      communicationScore += 10;
    const messageCount = signals.length; // More signals = more communication
    communicationScore += Math.min(10, messageCount);
    if (redFlagNames.has(RedFlagName.WENT_TOO_DEEP_EARLY))
      communicationScore -= 15;
    communicationScore = Math.max(0, Math.min(100, communicationScore));

    // Calculate time management score (0-100)
    let timeManagementScore = 70; // Base score (assume decent by default)
    if (redFlagNames.has(RedFlagName.POOR_TIME_MANAGEMENT))
      timeManagementScore -= 40;
    // Bonus for completing interview
    if (session.status === 'completed') timeManagementScore += 10;
    timeManagementScore = Math.max(0, Math.min(100, timeManagementScore));

    // Calculate depth score (0-100)
    let depthScore = 50; // Base score
    if (signalNames.has(SignalName.MENTIONED_SCALE)) depthScore += 15;
    if (signalNames.has(SignalName.DISCUSSED_DATA_MODEL)) depthScore += 10;
    if (signalNames.has(SignalName.ADDRESSED_BOTTLENECKS)) depthScore += 15;
    if (signalNames.has(SignalName.DISCUSSED_TRADEOFFS)) depthScore += 10;
    if (redFlagNames.has(RedFlagName.WENT_TOO_DEEP_EARLY)) depthScore -= 20;
    if (redFlagNames.has(RedFlagName.NO_SCALE_MENTION)) depthScore -= 15;
    depthScore = Math.max(0, Math.min(100, depthScore));

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      requirementsScore * 0.25 +
        designScore * 0.25 +
        communicationScore * 0.2 +
        timeManagementScore * 0.15 +
        depthScore * 0.15,
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
    if (scores.requirements < 70) {
      items.push({
        type: 'suggestion',
        description:
          'Practice asking clarifying questions at the start of every interview. Aim for 5-7 questions covering functional requirements, non-functional requirements, and constraints.',
        displayOrder: order++,
      });
    }

    if (scores.design < 70) {
      items.push({
        type: 'suggestion',
        description:
          'Work on drawing clear high-level architecture diagrams. Practice sketching components, data flow, and APIs.',
        displayOrder: order++,
      });
    }

    if (scores.communication < 70) {
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

    if (overall >= 85) {
      return "Excellent performance! You demonstrated strong system design skills across all areas. You're well-prepared for real interviews.";
    } else if (overall >= 70) {
      return "Good performance overall. You covered most key areas but there's room for improvement in a few specific areas highlighted below.";
    } else if (overall >= 55) {
      return 'Decent attempt with some good moments, but several important areas need work. Focus on the weaknesses identified below.';
    } else {
      return 'This interview showed significant gaps in system design fundamentals. Review the feedback carefully and practice the recommended next steps.';
    }
  }

  /**
   * Generate complete feedback report for a session
   */
  async generateFeedback(sessionId: number): Promise<GenerateFeedbackResult> {
    // Check if session exists
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // Check if feedback already exists
    const existing = await this.db
      .select()
      .from(feedbackReports)
      .where(eq(feedbackReports.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0) {
      // Return existing feedback
      return this.getFeedback(sessionId);
    }

    // Calculate scores
    const scores = await this.calculateScores(sessionId);

    // Generate feedback items
    const items = await this.generateFeedbackItems(sessionId, scores);

    // Generate next steps
    const nextSteps = await this.generateNextSteps(sessionId, scores);

    // Generate summary
    const summary = this.generateSummary(scores);

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
      throw new NotFoundException(
        `No feedback report found for session ${sessionId}`,
      );
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
}
