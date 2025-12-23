import { InterviewPhase } from '../types/session.types';
import { DetectedSignal } from '../services/signal.service';

export interface PhaseGuardResult {
  allowed: boolean;
  reason?: string;
}

export interface PhaseContext {
  sessionId: number;
  currentPhase: InterviewPhase;
  phaseElapsedSeconds: number;
  totalElapsedSeconds: number;
  signals: DetectedSignal[];
}

export interface PhaseGuard {
  /**
   * Check if the session can advance from this phase
   */
  canAdvance(context: PhaseContext): Promise<PhaseGuardResult> | PhaseGuardResult;

  /**
   * The phase this guard is responsible for
   */
  readonly phase: InterviewPhase;
}
