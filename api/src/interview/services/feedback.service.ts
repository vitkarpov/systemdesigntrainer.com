import { Injectable, Inject } from '@nestjs/common';
import { FeedbackNotFoundException } from '../exceptions/feedback-not-found.exception';
import { SessionNotFoundException } from '../exceptions/session-not-found.exception';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import {
  feedbackReports,
  feedbackItems,
  feedbackNextSteps,
} from '../../db/schema';
import { SignalService, SignalName } from './signal.service';
import { RedFlagService, RedFlagName } from './red-flag.service';
import { PhaseCutoffService } from './phase-cutoff.service';
import { InterviewSessionService } from './interview-session.service';
import {
  BASE_SCORES,
  SIGNAL_SCORING,
  RED_FLAG_SCORING,
  COMMUNICATION_BONUSES,
  TIME_MANAGEMENT_BONUSES,
  TIME_MANAGEMENT_PENALTIES,
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
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private phaseCutoffService: PhaseCutoffService,
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

    // Penalty for phase cut-offs (force-transitioned phases)
    const cutOffCount = await this.phaseCutoffService.getPhaseCutoffCount(
      sessionId,
    );
    timeManagementScore -=
      cutOffCount * TIME_MANAGEMENT_PENALTIES.PHASE_CUT_OFF;

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
    const phaseCutoffs = await this.phaseCutoffService.getSessionPhaseCutoffs(
      sessionId,
    );

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

    // Phase timing weaknesses
    if (phaseCutoffs.length > 0) {
      const phaseNames = phaseCutoffs
        .map((cutoff) => this.getPhaseDisplayName(cutoff.phase))
        .join(', ');

      if (phaseCutoffs.length === 1) {
        items.push({
          type: 'weakness',
          description: `You ran out of time during ${phaseNames}. In real interviews, the interviewer will move you along regardless of completion.`,
          displayOrder: order++,
        });
      } else {
        items.push({
          type: 'weakness',
          description: `You ran out of time in ${phaseCutoffs.length} phases (${phaseNames}). This indicates you need to be more concise and prioritize critical information.`,
          displayOrder: order++,
        });
      }
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

    // Phase timing suggestions
    if (phaseCutoffs.length > 0) {
      items.push({
        type: 'suggestion',
        description:
          'Practice with a timer: Set phase boundaries (5, 15, 25, 40 min) and force yourself to move on when time is up. This builds the discipline needed for real interviews.',
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
    const phaseCutoffs = await this.phaseCutoffService.getSessionPhaseCutoffs(
      sessionId,
    );
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
      redFlagNames.has(RedFlagName.POOR_TIME_MANAGEMENT) ||
      phaseCutoffs.length > 0
    ) {
      if (phaseCutoffs.length > 0) {
        nextSteps.push({
          description: `Improve time management: You exceeded time limits in ${phaseCutoffs.length} phase${phaseCutoffs.length > 1 ? 's' : ''}. Practice being more concise and prioritizing essential information over details.`,
          displayOrder: order++,
        });
      } else {
        nextSteps.push({
          description:
            'Improve time management: Set a timer and practice phase transitions at 5, 15, 25, and 40-minute marks.',
          displayOrder: order++,
        });
      }
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
  async generateFeedback(sessionId: number): Promise<GenerateFeedbackResult> {
    // Check if session exists (will throw SessionNotFoundException if not found)
    const session = await this.sessionService.getSession(sessionId);

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
}
