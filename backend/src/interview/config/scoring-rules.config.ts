import { SignalName } from '../services/signal.service';
import { RedFlagName } from '../services/red-flag.service';

/**
 * Scoring Rules Configuration
 *
 * This file contains all the scoring constants used for calculating
 * interview feedback scores. These values determine how signals and
 * red flags affect the final scores.
 */

// Base scores for each dimension (0-100)
export const BASE_SCORES: {
  REQUIREMENTS: number;
  DESIGN: number;
  COMMUNICATION: number;
  TIME_MANAGEMENT: number;
  DEPTH: number;
} = {
  REQUIREMENTS: 50,
  DESIGN: 50,
  COMMUNICATION: 50,
  TIME_MANAGEMENT: 70, // Higher base - assume decent by default
  DEPTH: 50,
};

// Signal scoring rules: how much each positive signal adds to a dimension
export const SIGNAL_SCORING = {
  [SignalName.ASKED_FUNCTIONAL_REQS]: {
    requirements: 15,
  },
  [SignalName.ASKED_NON_FUNCTIONAL_REQS]: {
    requirements: 15,
  },
  [SignalName.CLARIFIED_CONSTRAINTS]: {
    requirements: 10,
  },
  [SignalName.ASKED_CLARIFYING_QUESTIONS]: {
    requirements: 10,
    communication: 10,
  },
  [SignalName.DREW_HIGH_LEVEL_DIAGRAM]: {
    design: 15,
  },
  [SignalName.PROPOSED_API]: {
    design: 10,
  },
  [SignalName.DISCUSSED_DATA_MODEL]: {
    design: 15,
    depth: 10,
  },
  [SignalName.ADDRESSED_BOTTLENECKS]: {
    design: 10,
    depth: 15,
  },
  [SignalName.STRUCTURED_APPROACH]: {
    communication: 15,
  },
  [SignalName.DISCUSSED_TRADEOFFS]: {
    communication: 15,
    depth: 10,
  },
  [SignalName.MENTIONED_SCALE]: {
    depth: 15,
  },
} as const;

// Red flag scoring rules: how much each red flag subtracts from a dimension
export const RED_FLAG_SCORING = {
  [RedFlagName.SKIPPED_REQUIREMENTS]: {
    requirements: 30,
  },
  [RedFlagName.MISUNDERSTOOD_PROBLEM]: {
    requirements: 20,
  },
  [RedFlagName.NO_SCALE_MENTION]: {
    design: 20,
    depth: 15,
  },
  [RedFlagName.WENT_TOO_DEEP_EARLY]: {
    communication: 15,
    depth: 20,
  },
  [RedFlagName.POOR_TIME_MANAGEMENT]: {
    timeManagement: 40,
  },
} as const;

// Communication scoring bonuses
export const COMMUNICATION_BONUSES = {
  MESSAGE_COUNT_MAX: 10, // Maximum bonus points for message count
} as const;

// Time management bonuses
export const TIME_MANAGEMENT_BONUSES = {
  COMPLETED_SESSION: 10, // Bonus for completing the interview
} as const;

// Overall score weights (must sum to 1.0)
export const OVERALL_SCORE_WEIGHTS = {
  REQUIREMENTS: 0.25,
  DESIGN: 0.25,
  COMMUNICATION: 0.2,
  TIME_MANAGEMENT: 0.15,
  DEPTH: 0.15,
} as const;

// Summary thresholds for overall score
export const SUMMARY_THRESHOLDS = {
  EXCELLENT: 85, // >= 85: Excellent performance
  GOOD: 70, // >= 70: Good performance
  DECENT: 55, // >= 55: Decent attempt
  // < 55: Significant gaps
} as const;

// Suggestion thresholds for individual dimensions
export const SUGGESTION_THRESHOLDS = {
  REQUIREMENTS: 70, // Below this: suggest requirements practice
  DESIGN: 70, // Below this: suggest design patterns study
  COMMUNICATION: 70, // Below this: suggest structured communication
} as const;
