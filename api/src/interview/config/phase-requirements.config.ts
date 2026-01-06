import { InterviewPhase } from '../types/session.types';
import { SignalName } from '../services/signal.service';

/**
 * Configuration for phase transition requirements
 * Each phase has minimum time and required signals before advancing
 */

export interface PhaseRequirements {
  minimumTimeSeconds: number;
  maximumTimeSeconds: number;
  requiredSignals?: SignalName[];
  recommendedSignals?: SignalName[];
}

export const PHASE_REQUIREMENTS: Record<InterviewPhase, PhaseRequirements> = {
  [InterviewPhase.PROBLEM]: {
    minimumTimeSeconds: 60, // 1 minute minimum
    maximumTimeSeconds: 300, // 5 minutes maximum
    requiredSignals: [SignalName.ASKED_CLARIFYING_QUESTIONS],
    recommendedSignals: [],
  },
  [InterviewPhase.REQUIREMENTS]: {
    minimumTimeSeconds: 120, // 2 minutes minimum
    maximumTimeSeconds: 600, // 10 minutes maximum
    requiredSignals: [],
    recommendedSignals: [
      SignalName.ASKED_FUNCTIONAL_REQS,
      SignalName.ASKED_NON_FUNCTIONAL_REQS,
    ],
  },
  [InterviewPhase.HIGH_LEVEL]: {
    minimumTimeSeconds: 180, // 3 minutes minimum
    maximumTimeSeconds: 600, // 10 minutes maximum
    requiredSignals: [],
    recommendedSignals: [SignalName.DREW_HIGH_LEVEL_DIAGRAM],
  },
  [InterviewPhase.DEEP_DIVE]: {
    minimumTimeSeconds: 180, // 3 minutes minimum
    maximumTimeSeconds: 900, // 15 minutes maximum
    requiredSignals: [],
    recommendedSignals: [
      SignalName.DISCUSSED_DATA_MODEL,
      SignalName.PROPOSED_API,
    ],
  },
  [InterviewPhase.BOTTLENECKS]: {
    minimumTimeSeconds: 120, // 2 minutes minimum
    maximumTimeSeconds: 300, // 5 minutes maximum
    requiredSignals: [],
    recommendedSignals: [
      SignalName.MENTIONED_SCALE,
      SignalName.ADDRESSED_BOTTLENECKS,
    ],
  },
  [InterviewPhase.WRAP_UP]: {
    minimumTimeSeconds: 60, // 1 minute minimum
    maximumTimeSeconds: 300, // 5 minutes maximum
    requiredSignals: [],
    recommendedSignals: [],
  },
};
