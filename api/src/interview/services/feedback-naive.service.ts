import { Injectable } from '@nestjs/common';
import { SignalName, DetectedSignal } from './signal.service';
import { RedFlagName, DetectedRedFlag } from './red-flag.service';
import {
  BASE_SCORES,
  SIGNAL_SCORING,
  RED_FLAG_SCORING,
  COMMUNICATION_BONUSES,
  TIME_MANAGEMENT_BONUSES,
  OVERALL_SCORE_WEIGHTS,
  SUMMARY_THRESHOLDS,
  SUGGESTION_THRESHOLDS,
} from '../config/scoring-rules.config';
import type {
  FeedbackScores,
  FeedbackItemData,
  FeedbackNextStepData,
} from './feedback.service';

@Injectable()
export class FeedbackNaiveService {
  /**
   * Calculate scores based on signals and red flags
   */
  calculateScores(
    signals: DetectedSignal[],
    redFlags: DetectedRedFlag[],
    session: { status: string },
  ): FeedbackScores {
    const signalNames = new Set(signals.map((s) => s.signalName as SignalName));
    const redFlagNames = new Set(
      redFlags.map((f) => f.flagName as RedFlagName),
    );

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
  generateFeedbackItems(
    signals: DetectedSignal[],
    redFlags: DetectedRedFlag[],
    scores: FeedbackScores,
  ): FeedbackItemData[] {
    const signalNames = new Set(signals.map((s) => s.signalName as SignalName));
    const redFlagNames = new Set(
      redFlags.map((f) => f.flagName as RedFlagName),
    );

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

    return items;
  }

  /**
   * Generate next steps recommendations
   */
  generateNextSteps(
    redFlags: DetectedRedFlag[],
    scores: FeedbackScores,
  ): FeedbackNextStepData[] {
    const redFlagNames = new Set(
      redFlags.map((f) => f.flagName as RedFlagName),
    );

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
      redFlagNames.has(RedFlagName.POOR_TIME_MANAGEMENT)
    ) {
      nextSteps.push({
        description:
          'Improve time management: Set a timer and practice phase transitions at 5, 15, 25, and 40-minute marks.',
        displayOrder: order++,
      });
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
   * Format signals for prompt
   */
  formatSignals(signals: DetectedSignal[]): string {
    if (signals.length === 0) {
      return 'None detected';
    }

    return signals
      .map((signal) => {
        const time = this.formatTime(signal.secondsElapsed || 0);
        return `- ${signal.signalName.replace(/_/g, ' ').toUpperCase()} (${time}, ${signal.phase || 'unknown'} phase)`;
      })
      .join('\n');
  }

  /**
   * Format red flags for prompt
   */
  formatRedFlags(redFlags: DetectedRedFlag[]): string {
    if (redFlags.length === 0) {
      return 'None detected';
    }

    return redFlags
      .map((flag) => {
        const time = this.formatTime(flag.secondsElapsed || 0);
        return `- ${flag.flagName.replace(/_/g, ' ').toUpperCase()} (${time}, ${flag.phase || 'unknown'} phase)`;
      })
      .join('\n');
  }

  /**
   * Format seconds to MM:SS
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get human-readable phase name
   */
  getPhaseDisplayName(phase: string): string {
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
