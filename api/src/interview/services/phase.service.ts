import { Injectable } from '@nestjs/common';
import { InterviewPhase, PhaseTransitionResult } from '../types/session.types';

@Injectable()
export class PhaseService {
  // Define the phase order
  private readonly phaseOrder: InterviewPhase[] = [
    InterviewPhase.PROBLEM,
    InterviewPhase.REQUIREMENTS,
    InterviewPhase.HIGH_LEVEL,
    InterviewPhase.DEEP_DIVE,
    InterviewPhase.BOTTLENECKS,
    InterviewPhase.WRAP_UP,
  ];

  /**
   * Get the next phase in the interview flow
   */
  getNextPhase(currentPhase: InterviewPhase): InterviewPhase | null {
    const currentIndex = this.phaseOrder.indexOf(currentPhase);

    if (currentIndex === -1) {
      throw new Error(`Invalid phase: ${currentPhase}`);
    }

    if (currentIndex === this.phaseOrder.length - 1) {
      return null; // Already at final phase
    }

    return this.phaseOrder[currentIndex + 1];
  }

  /**
   * Check if a phase is valid
   */
  isValidPhase(phase: string): phase is InterviewPhase {
    return Object.values(InterviewPhase).includes(phase as InterviewPhase);
  }

  /**
   * Check if we can transition to the next phase
   */
  canTransitionToNext(currentPhase: InterviewPhase): PhaseTransitionResult {
    const nextPhase = this.getNextPhase(currentPhase);

    if (!nextPhase) {
      return {
        success: false,
        currentPhase,
        nextPhase: null,
        error: 'Already at final phase',
      };
    }

    return {
      success: true,
      currentPhase,
      nextPhase,
    };
  }

  /**
   * Get phase metadata (for display purposes)
   */
  getPhaseMetadata(phase: InterviewPhase): {
    name: string;
    description: string;
    order: number;
    recommendedMinutes: number;
  } {
    const metadata = {
      [InterviewPhase.PROBLEM]: {
        name: 'Problem Understanding',
        description: 'Clarify the problem statement and scope',
        order: 1,
        recommendedMinutes: 5,
      },
      [InterviewPhase.REQUIREMENTS]: {
        name: 'Requirements Gathering',
        description: 'Discuss functional and non-functional requirements',
        order: 2,
        recommendedMinutes: 10,
      },
      [InterviewPhase.HIGH_LEVEL]: {
        name: 'High-Level Design',
        description: 'Design the overall system architecture',
        order: 3,
        recommendedMinutes: 15,
      },
      [InterviewPhase.DEEP_DIVE]: {
        name: 'Deep Dive',
        description: 'Explore specific components in detail',
        order: 4,
        recommendedMinutes: 15,
      },
      [InterviewPhase.BOTTLENECKS]: {
        name: 'Bottlenecks & Trade-offs',
        description: 'Identify and resolve potential bottlenecks',
        order: 5,
        recommendedMinutes: 10,
      },
      [InterviewPhase.WRAP_UP]: {
        name: 'Wrap Up',
        description: 'Final questions and summary',
        order: 6,
        recommendedMinutes: 5,
      },
    };

    return metadata[phase];
  }

  /**
   * Get all phases in order
   */
  getAllPhases(): InterviewPhase[] {
    return [...this.phaseOrder];
  }

  /**
   * Check if phase is final
   */
  isFinalPhase(phase: InterviewPhase): boolean {
    return phase === InterviewPhase.WRAP_UP;
  }

  /**
   * Get phase progress percentage
   */
  getPhaseProgress(currentPhase: InterviewPhase): number {
    const currentIndex = this.phaseOrder.indexOf(currentPhase);
    return Math.round(((currentIndex + 1) / this.phaseOrder.length) * 100);
  }
}
