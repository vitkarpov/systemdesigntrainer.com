import { InterviewPhase } from '../types/session.types';

/**
 * Configuration for phase time limits
 * Each phase auto-progresses when maximum time is reached
 */

export interface PhaseRequirements {
  maximumTimeSeconds: number;
}

export const PHASE_REQUIREMENTS: Record<InterviewPhase, PhaseRequirements> = {
  [InterviewPhase.PROBLEM]: {
    maximumTimeSeconds: 300, // 5 minutes
  },
  [InterviewPhase.REQUIREMENTS]: {
    maximumTimeSeconds: 600, // 10 minutes
  },
  [InterviewPhase.HIGH_LEVEL]: {
    maximumTimeSeconds: 600, // 10 minutes
  },
  [InterviewPhase.DEEP_DIVE]: {
    maximumTimeSeconds: 900, // 15 minutes
  },
  [InterviewPhase.BOTTLENECKS]: {
    maximumTimeSeconds: 300, // 5 minutes
  },
  [InterviewPhase.WRAP_UP]: {
    maximumTimeSeconds: 300, // 5 minutes
  },
};
