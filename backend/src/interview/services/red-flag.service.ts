import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { interviewRedFlags, interviewSignals } from '../../db/schema';
import { InterviewPhase } from '../types/session.types';
import { SignalName } from './signal.service';

export enum RedFlagName {
  WENT_TOO_DEEP_EARLY = 'went_too_deep_early',
  SKIPPED_REQUIREMENTS = 'skipped_requirements',
  NO_SCALE_MENTION = 'no_scale_mention',
  POOR_TIME_MANAGEMENT = 'poor_time_management',
  MISUNDERSTOOD_PROBLEM = 'misunderstood_problem',
}

export interface DetectedRedFlag {
  id: number;
  sessionId: number;
  flagName: string;
  detectedAt: Date;
  secondsElapsed: number;
  phase: string;
  description: string | null;
}

export interface CheckRedFlagsOptions {
  sessionId: number;
  currentPhase: InterviewPhase;
  secondsElapsed: number;
  messageText?: string;
}

@Injectable()
export class RedFlagService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Keywords that indicate going too deep into implementation
   */
  private readonly implementationKeywords = [
    /\bclass\s+\w+/i,
    /\bfunction\s+\w+/i,
    /\bdef\s+\w+/i,
    /\bpublic\s+\w+/i,
    /\bprivate\s+\w+/i,
    /\bfor\s*\(/i,
    /\bwhile\s*\(/i,
    /\bif\s*\(/i,
    /\bswitch\s*\(/i,
    /\barray\s*\[/i,
    /\blist\s*\[/i,
    /\bdict\s*\{/i,
    /\bmap\s*\{/i,
    /line\s+\d+/i,
    /\bcode\s+(snippet|example|implementation)/i,
  ];

  /**
   * Check if a red flag already exists for a session
   */
  async redFlagExists(
    sessionId: number,
    flagName: RedFlagName,
  ): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(interviewRedFlags)
      .where(
        and(
          eq(interviewRedFlags.sessionId, sessionId),
          eq(interviewRedFlags.flagName, flagName),
        ),
      )
      .limit(1);

    return existing.length > 0;
  }

  /**
   * Record a detected red flag
   */
  async recordRedFlag(
    sessionId: number,
    flagName: RedFlagName,
    phase: InterviewPhase,
    secondsElapsed: number,
    description?: string,
  ): Promise<DetectedRedFlag | null> {
    // Check if red flag already exists
    const exists = await this.redFlagExists(sessionId, flagName);
    if (exists) {
      return null; // Red flag already recorded
    }

    const [redFlag] = await this.db
      .insert(interviewRedFlags)
      .values({
        sessionId,
        flagName,
        phase,
        secondsElapsed,
        description: description || null,
      })
      .returning();

    return redFlag;
  }

  /**
   * Check if candidate went too deep into implementation details early
   */
  private detectWentTooDeepEarly(
    phase: InterviewPhase,
    secondsElapsed: number,
    messageText?: string,
  ): { detected: boolean; description?: string } {
    // Only check in early phases (problem, requirements)
    if (
      phase !== InterviewPhase.PROBLEM &&
      phase !== InterviewPhase.REQUIREMENTS
    ) {
      return { detected: false };
    }

    // Check if message contains implementation keywords
    if (messageText) {
      const hasImplementationDetails = this.implementationKeywords.some(
        (pattern) => pattern.test(messageText),
      );

      if (hasImplementationDetails) {
        return {
          detected: true,
          description: `Jumped into implementation details during ${phase} phase`,
        };
      }
    }

    return { detected: false };
  }

  /**
   * Check if candidate skipped requirements gathering
   */
  private async detectSkippedRequirements(
    sessionId: number,
    secondsElapsed: number,
  ): Promise<{ detected: boolean; description?: string }> {
    // Check after 15 minutes (900 seconds)
    if (secondsElapsed < 900) {
      return { detected: false };
    }

    // Check if any requirement signals were detected
    const requirementSignals = await this.db
      .select()
      .from(interviewSignals)
      .where(
        and(
          eq(interviewSignals.sessionId, sessionId),
          eq(interviewSignals.signalName, SignalName.ASKED_FUNCTIONAL_REQS),
        ),
      )
      .limit(1);

    const nonFunctionalSignals = await this.db
      .select()
      .from(interviewSignals)
      .where(
        and(
          eq(interviewSignals.sessionId, sessionId),
          eq(
            interviewSignals.signalName,
            SignalName.ASKED_NON_FUNCTIONAL_REQS,
          ),
        ),
      )
      .limit(1);

    const hasRequirements =
      requirementSignals.length > 0 || nonFunctionalSignals.length > 0;

    if (!hasRequirements) {
      return {
        detected: true,
        description: `No requirements discussed by minute ${Math.floor(secondsElapsed / 60)}`,
      };
    }

    return { detected: false };
  }

  /**
   * Check if candidate didn't mention scale
   */
  private async detectNoScaleMention(
    sessionId: number,
    secondsElapsed: number,
  ): Promise<{ detected: boolean; description?: string }> {
    // Check after 20 minutes (1200 seconds)
    if (secondsElapsed < 1200) {
      return { detected: false };
    }

    // Check if scale was mentioned
    const scaleSignals = await this.db
      .select()
      .from(interviewSignals)
      .where(
        and(
          eq(interviewSignals.sessionId, sessionId),
          eq(interviewSignals.signalName, SignalName.MENTIONED_SCALE),
        ),
      )
      .limit(1);

    if (scaleSignals.length === 0) {
      return {
        detected: true,
        description: `No scale discussion by minute ${Math.floor(secondsElapsed / 60)}`,
      };
    }

    return { detected: false };
  }

  /**
   * Check if candidate has poor time management
   */
  private detectPoorTimeManagement(
    phase: InterviewPhase,
    secondsElapsed: number,
  ): { detected: boolean; description?: string } {
    // Still in problem phase after 10 minutes (600 seconds)
    if (phase === InterviewPhase.PROBLEM && secondsElapsed >= 600) {
      return {
        detected: true,
        description: `Still in problem phase after ${Math.floor(secondsElapsed / 60)} minutes`,
      };
    }

    // Still in requirements phase after 20 minutes (1200 seconds)
    if (phase === InterviewPhase.REQUIREMENTS && secondsElapsed >= 1200) {
      return {
        detected: true,
        description: `Still in requirements phase after ${Math.floor(secondsElapsed / 60)} minutes`,
      };
    }

    // Haven't reached high-level design by 25 minutes (1500 seconds)
    if (
      (phase === InterviewPhase.PROBLEM ||
        phase === InterviewPhase.REQUIREMENTS) &&
      secondsElapsed >= 1500
    ) {
      return {
        detected: true,
        description: `Haven't reached high-level design phase by minute ${Math.floor(secondsElapsed / 60)}`,
      };
    }

    return { detected: false };
  }

  /**
   * Check all red flags for a session
   */
  async checkRedFlags(
    options: CheckRedFlagsOptions,
  ): Promise<DetectedRedFlag[]> {
    const { sessionId, currentPhase, secondsElapsed, messageText } = options;
    const detectedFlags: DetectedRedFlag[] = [];

    // 1. Check if went too deep early
    const wentTooDeep = this.detectWentTooDeepEarly(
      currentPhase,
      secondsElapsed,
      messageText,
    );
    if (wentTooDeep.detected) {
      const flag = await this.recordRedFlag(
        sessionId,
        RedFlagName.WENT_TOO_DEEP_EARLY,
        currentPhase,
        secondsElapsed,
        wentTooDeep.description,
      );
      if (flag) detectedFlags.push(flag);
    }

    // 2. Check if skipped requirements (after 15 minutes)
    if (secondsElapsed >= 900) {
      const skippedReqs = await this.detectSkippedRequirements(
        sessionId,
        secondsElapsed,
      );
      if (skippedReqs.detected) {
        const flag = await this.recordRedFlag(
          sessionId,
          RedFlagName.SKIPPED_REQUIREMENTS,
          currentPhase,
          secondsElapsed,
          skippedReqs.description,
        );
        if (flag) detectedFlags.push(flag);
      }
    }

    // 3. Check if no scale mention (after 20 minutes)
    if (secondsElapsed >= 1200) {
      const noScale = await this.detectNoScaleMention(
        sessionId,
        secondsElapsed,
      );
      if (noScale.detected) {
        const flag = await this.recordRedFlag(
          sessionId,
          RedFlagName.NO_SCALE_MENTION,
          currentPhase,
          secondsElapsed,
          noScale.description,
        );
        if (flag) detectedFlags.push(flag);
      }
    }

    // 4. Check for poor time management
    const poorTimeManagement = this.detectPoorTimeManagement(
      currentPhase,
      secondsElapsed,
    );
    if (poorTimeManagement.detected) {
      const flag = await this.recordRedFlag(
        sessionId,
        RedFlagName.POOR_TIME_MANAGEMENT,
        currentPhase,
        secondsElapsed,
        poorTimeManagement.description,
      );
      if (flag) detectedFlags.push(flag);
    }

    return detectedFlags;
  }

  /**
   * Get all red flags for a session
   */
  async getSessionRedFlags(sessionId: number): Promise<DetectedRedFlag[]> {
    const redFlags = await this.db
      .select()
      .from(interviewRedFlags)
      .where(eq(interviewRedFlags.sessionId, sessionId))
      .orderBy(interviewRedFlags.detectedAt);

    return redFlags;
  }

  /**
   * Get red flags for a specific phase
   */
  async getPhaseRedFlags(
    sessionId: number,
    phase: InterviewPhase,
  ): Promise<DetectedRedFlag[]> {
    const redFlags = await this.db
      .select()
      .from(interviewRedFlags)
      .where(
        and(
          eq(interviewRedFlags.sessionId, sessionId),
          eq(interviewRedFlags.phase, phase),
        ),
      )
      .orderBy(interviewRedFlags.detectedAt);

    return redFlags;
  }

  /**
   * Get count of red flags for a session
   */
  async getRedFlagCount(sessionId: number): Promise<number> {
    const redFlags = await this.getSessionRedFlags(sessionId);
    return redFlags.length;
  }

  /**
   * Check if session has any red flags
   */
  async hasRedFlags(sessionId: number): Promise<boolean> {
    const count = await this.getRedFlagCount(sessionId);
    return count > 0;
  }
}
