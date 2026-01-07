import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger, Inject } from '@nestjs/common';
import { InterviewSessionService } from '../services/interview-session.service';
import { TranscriptService } from '../services/transcript.service';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { interviewSessions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { InterviewPhase, MessageRole } from '../types/session.types';

export interface PhaseTransitionJobData {
  // Empty - checks all active sessions
}

/**
 * PhaseTransitionProcessor
 *
 * Background worker that checks all active interview sessions
 * and auto-advances phases when time limits are exceeded.
 *
 * This processor runs on a schedule (every 60 seconds) to enforce
 * rigid time constraints on interview phases, mimicking real interview pressure.
 */
@Processor('phase-transition')
export class PhaseTransitionProcessor {
  private readonly logger = new Logger(PhaseTransitionProcessor.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private readonly sessionService: InterviewSessionService,
    private readonly transcriptService: TranscriptService,
  ) {}

  @Process('check')
  async handlePhaseTransitionCheck(job: Job<PhaseTransitionJobData>) {
    this.logger.debug(
      `[Job ${job.id}] Checking active sessions for phase transitions`,
    );

    try {
      // Get all in-progress sessions
      const activeSessions = await this.db
        .select()
        .from(interviewSessions)
        .where(eq(interviewSessions.status, 'in_progress'));

      if (activeSessions.length === 0) {
        this.logger.debug(`[Job ${job.id}] No active sessions to check`);
        return { checkedSessions: 0, transitionedSessions: 0 };
      }

      this.logger.debug(
        `[Job ${job.id}] Checking ${activeSessions.length} active sessions`,
      );

      let transitionedCount = 0;

      // Check each session for phase transition
      for (const sessionData of activeSessions) {
        const session = this.sessionService['mapToSessionState'](sessionData);

        // Check if time's up for current phase
        const shouldAdvance = this.sessionService.shouldAdvancePhase(session);

        if (shouldAdvance) {
          this.logger.log(
            `[Job ${job.id}] Advancing session ${session.id} from phase ${session.currentPhase} (time limit reached)`,
          );

          try {
            // Advance to next phase
            const result = await this.sessionService.advancePhase(session.id);

            // Add system message to transcript
            const elapsedSeconds =
              this.sessionService.getElapsedSeconds(session);
            await this.transcriptService.addMessage({
              sessionId: session.id,
              role: MessageRole.SYSTEM,
              text: result.isCompleted
                ? '⏱️ Time limit reached. Interview completed.'
                : `⏱️ Time's up for ${this.getPhaseDisplayName(result.previousPhase)}. Moving to ${this.getPhaseDisplayName(result.currentPhase)}.`,
              phase: result.currentPhase,
              secondsElapsed: elapsedSeconds,
            });

            transitionedCount++;
          } catch (error) {
            this.logger.error(
              `[Job ${job.id}] Failed to advance session ${session.id}:`,
              error,
            );
          }
        }
      }

      this.logger.log(
        `[Job ${job.id}] Phase transition check complete: ${transitionedCount}/${activeSessions.length} sessions transitioned`,
      );

      return {
        checkedSessions: activeSessions.length,
        transitionedSessions: transitionedCount,
      };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Phase transition check failed:`,
        error,
      );
      throw error;
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<PhaseTransitionJobData>, result: any) {
    if (result.transitionedSessions > 0) {
      this.logger.log(
        `[Job ${job.id}] Successfully transitioned ${result.transitionedSessions} sessions`,
      );
    }
  }

  @OnQueueFailed()
  onFailed(job: Job<PhaseTransitionJobData>, error: Error) {
    this.logger.error(
      `[Job ${job.id}] Phase transition check failed permanently:`,
      error.message,
    );
  }

  /**
   * Get human-readable phase name
   */
  private getPhaseDisplayName(phase: InterviewPhase): string {
    const names = {
      [InterviewPhase.PROBLEM]: 'Problem Understanding',
      [InterviewPhase.REQUIREMENTS]: 'Requirements Gathering',
      [InterviewPhase.HIGH_LEVEL]: 'High-Level Design',
      [InterviewPhase.DEEP_DIVE]: 'Deep Dive',
      [InterviewPhase.BOTTLENECKS]: 'Bottlenecks & Trade-offs',
      [InterviewPhase.WRAP_UP]: 'Wrap Up',
    };
    return names[phase] || phase;
  }
}
