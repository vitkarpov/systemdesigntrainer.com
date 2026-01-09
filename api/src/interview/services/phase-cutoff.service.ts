import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import type { db as DbType } from '../../../db/db';
import { interviewPhaseCutoffs } from '../../../db/schema';
import { InterviewPhase } from '../types/session.types';

export interface PhaseCutoff {
  id: number;
  sessionId: number;
  phase: string;
  cutoffAt: Date;
  secondsElapsed: number;
  exceededBySeconds: number;
}

export interface RecordPhaseCutoffOptions {
  sessionId: number;
  phase: InterviewPhase;
  secondsElapsed: number;
  exceededBySeconds: number;
}

@Injectable()
export class PhaseCutoffService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Record a phase cut-off event when a phase is force-transitioned
   */
  async recordPhaseCutoff(
    options: RecordPhaseCutoffOptions,
  ): Promise<PhaseCutoff> {
    const [cutoff] = await this.db
      .insert(interviewPhaseCutoffs)
      .values({
        sessionId: options.sessionId,
        phase: options.phase,
        secondsElapsed: options.secondsElapsed,
        exceededBySeconds: options.exceededBySeconds,
      })
      .onConflictDoNothing() // Ignore if already exists (unique constraint)
      .returning();

    return cutoff;
  }

  /**
   * Get all phase cut-offs for a session
   */
  async getSessionPhaseCutoffs(sessionId: number): Promise<PhaseCutoff[]> {
    const cutoffs = await this.db
      .select()
      .from(interviewPhaseCutoffs)
      .where(eq(interviewPhaseCutoffs.sessionId, sessionId));

    return cutoffs;
  }

  /**
   * Get count of phase cut-offs for a session
   */
  async getPhaseCutoffCount(sessionId: number): Promise<number> {
    const cutoffs = await this.getSessionPhaseCutoffs(sessionId);
    return cutoffs.length;
  }

  /**
   * Check if a session has any phase cut-offs
   */
  async hasPhaseCutoffs(sessionId: number): Promise<boolean> {
    const count = await this.getPhaseCutoffCount(sessionId);
    return count > 0;
  }

  /**
   * Check if a specific phase was cut off
   */
  async wasPhaseCutoff(
    sessionId: number,
    phase: InterviewPhase,
  ): Promise<boolean> {
    const cutoffs = await this.db
      .select()
      .from(interviewPhaseCutoffs)
      .where(
        and(
          eq(interviewPhaseCutoffs.sessionId, sessionId),
          eq(interviewPhaseCutoffs.phase, phase),
        ),
      );

    return cutoffs.length > 0;
  }
}
