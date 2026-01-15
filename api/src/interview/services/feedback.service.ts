import { Injectable, Inject, Logger } from '@nestjs/common';
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
import { SignalService } from './signal.service';
import { RedFlagService } from './red-flag.service';
import { InterviewSessionService } from './interview-session.service';
import { FeedbackNaiveService } from './feedback-naive.service';
import { FeedbackAiService } from './feedback-ai.service';

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
    private feedbackNaiveService: FeedbackNaiveService,
    private feedbackAiService: FeedbackAiService,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private sessionService: InterviewSessionService,
  ) {}

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
      await this.feedbackAiService.analyzeTranscriptSignals(sessionId);
    } else {
      this.logger.log(
        `Skipping batch signal analysis - ${existingSignals.length} signals already exist`,
        { sessionId, existingSignalCount: existingSignals.length },
      );
    }

    // Fetch signals and red flags
    const signals = await this.signalService.getSessionSignals(sessionId);
    const redFlags = await this.redFlagService.getSessionRedFlags(sessionId);
    const session = await this.sessionService.getSession(sessionId);

    // Calculate scores (always rule-based)
    const scores = this.feedbackNaiveService.calculateScores(
      signals,
      redFlags,
      session,
    );

    let summary: string;
    let items: FeedbackItemData[];
    let nextSteps: FeedbackNextStepData[];

    try {
      this.logger.log('Attempting AI feedback generation', { sessionId });

      // Generate AI feedback
      const aiFeedback = await this.feedbackAiService.generateFeedback(
        sessionId,
        scores,
        signals,
        redFlags,
        session,
      );
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
      summary = this.feedbackNaiveService.generateSummary(scores);
      items = this.feedbackNaiveService.generateFeedbackItems(
        signals,
        redFlags,
        scores,
      );
      nextSteps = this.feedbackNaiveService.generateNextSteps(redFlags, scores);
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
}
