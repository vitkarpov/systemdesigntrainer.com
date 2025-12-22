import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { interviewSessions } from '../../db/schema';
import { PhaseService } from './phase.service';
import {
  SessionStatus,
  InterviewPhase,
  SessionState,
} from '../types/session.types';

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
      throw new NotFoundException(`Session ${sessionId} not found`);
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
   * Get all sessions for a user with interview case details
   */
  async getUserSessionsWithCases(userId: number) {
    const sessions = await this.getUserSessions(userId);

    // Fetch interview cases for all sessions
    const caseIds = [...new Set(sessions.map((s) => s.caseId))];
    const cases = await this.db.query.interviewCases.findMany({
      where: (interviewCases, { inArray }) =>
        inArray(interviewCases.id, caseIds),
    });

    const casesMap = new Map(cases.map((c) => [c.id, c]));

    return sessions.map((session) => {
      const interviewCase = casesMap.get(session.caseId);
      return {
        id: session.id,
        userId: session.userId,
        caseId: session.caseId,
        status: session.status,
        currentPhase: session.currentPhase,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        createdAt: session.createdAt,
        interviewCase: interviewCase
          ? {
              id: interviewCase.id,
              title: interviewCase.title,
              description: interviewCase.description,
              difficulty: interviewCase.difficulty,
            }
          : null,
      };
    });
  }

  /**
   * Start a session (transition from NOT_STARTED to IN_PROGRESS)
   */
  async startSession(sessionId: number): Promise<SessionState> {
    const session = await this.getSession(sessionId);

    if (session.status !== SessionStatus.NOT_STARTED) {
      throw new BadRequestException(
        `Session ${sessionId} is already ${session.status}`,
      );
    }

    const [updated] = await this.db
      .update(interviewSessions)
      .set({
        status: SessionStatus.IN_PROGRESS,
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(interviewSessions.id, sessionId))
      .returning();

    return this.mapToSessionState(updated);
  }

  /**
   * Advance to the next phase
   */
  async advancePhase(sessionId: number): Promise<AdvancePhaseResult> {
    const session = await this.getSession(sessionId);

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot advance phase: session is ${session.status}`,
      );
    }

    const previousPhase = session.currentPhase as InterviewPhase;
    const transitionResult =
      this.phaseService.canTransitionToNext(previousPhase);

    if (!transitionResult.success || !transitionResult.nextPhase) {
      // We're at the final phase - complete the session
      await this.completeSession(sessionId);

      return {
        success: true,
        previousPhase,
        currentPhase: previousPhase,
        isCompleted: true,
      };
    }

    // Transition to next phase
    const nextPhase = transitionResult.nextPhase;
    await this.db
      .update(interviewSessions)
      .set({
        currentPhase: nextPhase,
        phaseStartedAt: new Date(),
        updatedAt: new Date(),
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
   * Complete a session (mark as COMPLETED)
   */
  async completeSession(sessionId: number): Promise<SessionState> {
    const session = await this.getSession(sessionId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException(
        `Session ${sessionId} is already completed`,
      );
    }

    const [updated] = await this.db
      .update(interviewSessions)
      .set({
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date(),
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

    const now = new Date();
    const elapsed = now.getTime() - session.startedAt.getTime();
    return Math.floor(elapsed / 1000);
  }

  /**
   * Get time spent in current phase (seconds)
   */
  getPhaseElapsedSeconds(session: SessionState): number {
    const now = new Date();
    const elapsed = now.getTime() - session.phaseStartedAt.getTime();
    return Math.floor(elapsed / 1000);
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
      phaseStartedAt: session.phaseStartedAt,
      companyStyle: session.companyStyle,
      level: session.level,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
