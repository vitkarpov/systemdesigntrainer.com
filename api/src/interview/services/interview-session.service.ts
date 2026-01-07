import { Injectable, Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { interviewSessions, interviewCases } from '../../db/schema';
import { PhaseService } from './phase.service';
import {
  SessionStatus,
  InterviewPhase,
  SessionState,
} from '../types/session.types';
import { InterviewCaseNotFoundException } from '../exceptions/interview-case-not-found.exception';
import { SessionNotFoundException } from '../exceptions/session-not-found.exception';
import { InvalidSessionStateException } from '../exceptions/invalid-session-state.exception';
import { PHASE_REQUIREMENTS } from '../config/phase-requirements.config';

export interface CreateSessionDto {
  userId: number;
  caseId: number;
  companyStyle?: string;
  level?: string;
}

export interface AdvancePhaseResult {
  success: boolean;
  previousPhase: InterviewPhase;
  currentPhase: InterviewPhase;
  isCompleted: boolean;
}

@Injectable()
export class InterviewSessionService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private phaseService: PhaseService,
  ) {}

  /**
   * Create a new interview session
   */
  async createSession(dto: CreateSessionDto): Promise<SessionState> {
    // Validate that the case exists
    const caseExists = await this.db.query.interviewCases.findFirst({
      where: eq(interviewCases.id, dto.caseId),
    });

    if (!caseExists) {
      throw new InterviewCaseNotFoundException(dto.caseId, dto.userId);
    }

    const [session] = await this.db
      .insert(interviewSessions)
      .values({
        userId: dto.userId,
        caseId: dto.caseId,
        status: SessionStatus.NOT_STARTED,
        currentPhase: InterviewPhase.PROBLEM,
        companyStyle: dto.companyStyle || 'faang',
        level: dto.level || 'mid',
      })
      .returning();

    return this.mapToSessionState(session);
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: number): Promise<SessionState> {
    const session = await this.db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
    });

    if (!session) {
      throw new SessionNotFoundException(sessionId);
    }

    return this.mapToSessionState(session);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: number): Promise<SessionState[]> {
    const sessions = await this.db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, userId))
      .orderBy(interviewSessions.createdAt);

    return sessions.map((s) => this.mapToSessionState(s));
  }

  /**
   * Get all sessions for a user with interview case details and feedback scores
   * Uses Drizzle's relational queries to fetch everything in a single query
   */
  async getUserSessionsWithCases(userId: number) {
    const sessions = await this.db.query.interviewSessions.findMany({
      where: eq(interviewSessions.userId, userId),
      with: {
        interviewCase: {
          columns: {
            id: true,
            title: true,
            description: true,
            difficulty: true,
          },
        },
        feedbackReport: {
          columns: {
            sessionId: true,
            overallScore: true,
            requirementsScore: true,
            designScore: true,
            communicationScore: true,
            timeManagementScore: true,
            depthScore: true,
          },
        },
      },
      orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      caseId: session.caseId,
      status: session.status,
      currentPhase: session.currentPhase,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
      interviewCase: session.interviewCase,
      overallScore: session.feedbackReport?.overallScore ?? null,
      requirementsScore: session.feedbackReport?.requirementsScore ?? null,
      designScore: session.feedbackReport?.designScore ?? null,
      communicationScore: session.feedbackReport?.communicationScore ?? null,
      timeManagementScore: session.feedbackReport?.timeManagementScore ?? null,
      depthScore: session.feedbackReport?.depthScore ?? null,
    }));
  }

  /**
   * Start a session (transition from NOT_STARTED to IN_PROGRESS)
   */
  async startSession(sessionId: number): Promise<SessionState> {
    const session = await this.getSession(sessionId);

    if (session.status !== SessionStatus.NOT_STARTED) {
      throw new InvalidSessionStateException(
        sessionId,
        session.status,
        'start',
        [SessionStatus.NOT_STARTED],
      );
    }

    const [updated] = await this.db
      .update(interviewSessions)
      .set({
        status: SessionStatus.IN_PROGRESS,
        startedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(interviewSessions.id, sessionId))
      .returning();

    return this.mapToSessionState(updated);
  }

  /**
   * Complete a session (mark as COMPLETED)
   */
  async completeSession(sessionId: number): Promise<SessionState> {
    const session = await this.getSession(sessionId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new InvalidSessionStateException(
        sessionId,
        session.status,
        'complete',
        [SessionStatus.IN_PROGRESS],
      );
    }

    const [updated] = await this.db
      .update(interviewSessions)
      .set({
        status: SessionStatus.COMPLETED,
        completedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(interviewSessions.id, sessionId))
      .returning();

    return this.mapToSessionState(updated);
  }

  /**
   * Get session elapsed time in seconds
   */
  getElapsedSeconds(session: SessionState): number {
    if (!session.startedAt) {
      return 0;
    }

    // If session is completed, use completedAt instead of current time
    const endTime = session.completedAt || new Date();
    const elapsed = endTime.getTime() - session.startedAt.getTime();
    return Math.floor(elapsed / 1000);
  }

  /**
   * Get time spent in current phase (seconds)
   */
  getPhaseElapsedSeconds(session: SessionState): number {
    // If session is completed, use completedAt instead of current time
    const endTime = session.completedAt || new Date();
    const elapsed = endTime.getTime() - session.phaseStartedAt.getTime();
    return Math.floor(elapsed / 1000);
  }

  /**
   * Check if current phase time limit has been exceeded
   */
  shouldAdvancePhase(session: SessionState): boolean {
    if (session.status !== SessionStatus.IN_PROGRESS) {
      return false;
    }

    const phaseElapsed = this.getPhaseElapsedSeconds(session);
    const requirements = PHASE_REQUIREMENTS[session.currentPhase];

    return phaseElapsed >= requirements.maximumTimeSeconds;
  }

  /**
   * Advance to next phase
   */
  async advancePhase(sessionId: number): Promise<AdvancePhaseResult> {
    const session = await this.getSession(sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new InvalidSessionStateException(
        sessionId,
        session.status,
        'advance phase',
        [SessionStatus.IN_PROGRESS],
      );
    }

    const previousPhase = session.currentPhase as InterviewPhase;
    const nextPhase = this.phaseService.getNextPhase(previousPhase);

    if (!nextPhase) {
      // At final phase - complete the session
      await this.completeSession(sessionId);

      return {
        success: true,
        previousPhase,
        currentPhase: previousPhase,
        isCompleted: true,
      };
    }

    // Transition to next phase
    await this.db
      .update(interviewSessions)
      .set({
        currentPhase: nextPhase,
        phaseStartedAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(interviewSessions.id, sessionId));

    return {
      success: true,
      previousPhase,
      currentPhase: nextPhase,
      isCompleted: false,
    };
  }

  /**
   * Map database result to SessionState
   */
  private mapToSessionState(session: any): SessionState {
    return {
      id: session.id,
      userId: session.userId,
      caseId: session.caseId,
      status: session.status as SessionStatus,
      currentPhase: session.currentPhase as InterviewPhase,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      lastUserMessageAt: session.lastUserMessageAt,
      phaseStartedAt: session.phaseStartedAt,
      companyStyle: session.companyStyle,
      level: session.level,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
