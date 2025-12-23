import { Injectable } from '@nestjs/common';
import {
  PhaseGuard,
  PhaseGuardResult,
  PhaseContext,
} from '../guards/phase-guard.interface';
import { InterviewPhase } from '../types/session.types';
import { SignalService } from './signal.service';
import { PHASE_REQUIREMENTS } from '../config/phase-requirements.config';

@Injectable()
export class PhaseGuardService {
  constructor(private signalService: SignalService) {}

  /**
   * Check if a session can advance from its current phase
   */
  async canAdvancePhase(
    sessionId: number,
    currentPhase: InterviewPhase,
    phaseElapsedSeconds: number,
    totalElapsedSeconds: number,
  ): Promise<PhaseGuardResult> {
    // Get all signals for the session
    const signals = await this.signalService.getSessionSignals(sessionId);

    const context: PhaseContext = {
      sessionId,
      currentPhase,
      phaseElapsedSeconds,
      totalElapsedSeconds,
      signals,
    };

    // Get requirements for this phase
    const requirements = PHASE_REQUIREMENTS[currentPhase];

    // Check minimum time requirement
    if (phaseElapsedSeconds < requirements.minimumTimeSeconds) {
      const remainingSeconds = requirements.minimumTimeSeconds - phaseElapsedSeconds;
      return {
        allowed: false,
        reason: `Please spend at least ${Math.ceil(remainingSeconds)} more second(s) in this phase before advancing.`,
      };
    }

    // Check required signals
    if (requirements.requiredSignals && requirements.requiredSignals.length > 0) {
      const signalNames = new Set(signals.map((s) => s.signalName));
      const missingSignals = requirements.requiredSignals.filter(
        (signal) => !signalNames.has(signal),
      );

      if (missingSignals.length > 0) {
        const signalDescriptions = this.getSignalDescriptions(missingSignals);
        return {
          allowed: false,
          reason: `Before advancing, please: ${signalDescriptions.join(', ')}.`,
        };
      }
    }

    // All checks passed
    return { allowed: true };
  }

  /**
   * Get human-readable descriptions for missing signals
   */
  private getSignalDescriptions(signalNames: string[]): string[] {
    const descriptions: Record<string, string> = {
      ASKED_CLARIFYING_QUESTIONS: 'ask clarifying questions about the problem',
      ASKED_FUNCTIONAL_REQS: 'discuss functional requirements',
      ASKED_NON_FUNCTIONAL_REQS: 'discuss non-functional requirements',
      DREW_HIGH_LEVEL_DIAGRAM: 'draw a high-level system diagram',
      DISCUSSED_DATA_MODEL: 'discuss the data model',
      PROPOSED_API: 'propose API endpoints',
      MENTIONED_SCALE: 'discuss scale and capacity estimates',
      ADDRESSED_BOTTLENECKS: 'identify and address potential bottlenecks',
    };

    return signalNames.map(
      (name) => descriptions[name] || name.toLowerCase().replace(/_/g, ' '),
    );
  }
}
