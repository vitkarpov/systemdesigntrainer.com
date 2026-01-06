import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { interviewSignals } from '../../db/schema';
import { InterviewPhase } from '../types/session.types';

export enum SignalName {
  ASKED_FUNCTIONAL_REQS = 'asked_functional_reqs',
  ASKED_NON_FUNCTIONAL_REQS = 'asked_non_functional_reqs',
  CLARIFIED_CONSTRAINTS = 'clarified_constraints',
  MENTIONED_SCALE = 'mentioned_scale',
  PROPOSED_API = 'proposed_api',
  DREW_HIGH_LEVEL_DIAGRAM = 'drew_high_level_diagram',
  DISCUSSED_DATA_MODEL = 'discussed_data_model',
  ADDRESSED_BOTTLENECKS = 'addressed_bottlenecks',
  DISCUSSED_TRADEOFFS = 'discussed_tradeoffs',
  STRUCTURED_APPROACH = 'structured_approach',
  ASKED_CLARIFYING_QUESTIONS = 'asked_clarifying_questions',
  READY_TO_ADVANCE = 'ready_to_advance',
}

export interface DetectedSignal {
  id: number;
  sessionId: number;
  signalName: string;
  detectedAt: Date;
  secondsElapsed: number;
  phase: string;
  triggeredByMessageId: number | null;
}

export interface DetectSignalsOptions {
  sessionId: number;
  text: string;
  phase: InterviewPhase;
  secondsElapsed: number;
  messageId?: number;
}

@Injectable()
export class SignalService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Keyword patterns for each signal
   */
  private readonly signalPatterns: Record<SignalName, RegExp[]> = {
    [SignalName.ASKED_FUNCTIONAL_REQS]: [
      /\b(functional\s+)?requirements?\b/i,
      /what\s+(features?|functionality)/i,
      /what\s+(should|does)\s+.+\s+(do|need)/i,
      /users?\s+(need|want|expect)/i,
      /core\s+features?/i,
      /main\s+capabilities/i,
    ],
    [SignalName.ASKED_NON_FUNCTIONAL_REQS]: [
      /\bnon[- ]functional\s+requirements?\b/i,
      /\b(scale|scalability|performance|availability|reliability|latency|throughput)\b/i,
      /how\s+many\s+users?/i,
      /how\s+(fast|quick|slow)/i,
      /uptime/i,
      /response\s+time/i,
      /SLA|SLO/i,
    ],
    [SignalName.CLARIFIED_CONSTRAINTS]: [
      /\bconstraints?\b/i,
      /\blimitations?\b/i,
      /\bassumptions?\b/i,
      /what\s+(can|should)\s+.+\s+assume/i,
      /any\s+restrictions?/i,
      /budget|cost\s+constraints?/i,
    ],
    [SignalName.MENTIONED_SCALE]: [
      /\d+\s*(million|billion|k|thousand)\s+(users?|requests?)/i,
      /requests?\s+per\s+(second|minute|hour)/i,
      /QPS|RPS|TPS/i,
      /\bscale\b/i,
      /\bhorizontal(ly)?\s+scal/i,
      /\bvertical(ly)?\s+scal/i,
      /traffic\s+(volume|load)/i,
    ],
    [SignalName.PROPOSED_API]: [
      /\bAPI\b/i,
      /\bendpoints?\b/i,
      /\bREST(ful)?\b/i,
      /\bGraphQL\b/i,
      /\bHTTP\s+(GET|POST|PUT|DELETE|PATCH)\b/i,
      /routes?/i,
      /\bRPC\b/i,
    ],
    [SignalName.DREW_HIGH_LEVEL_DIAGRAM]: [
      /\bdiagram\b/i,
      /\barchitecture\b/i,
      /\bcomponents?\b/i,
      /\bsystem\s+design\b/i,
      /high[- ]level/i,
      /\bdraw\b/i,
      /\bsketch\b/i,
    ],
    [SignalName.DISCUSSED_DATA_MODEL]: [
      /\bdata\s+(model|structure|schema)\b/i,
      /\bdatabase\s+(schema|design)\b/i,
      /\btables?\b/i,
      /\bentit(y|ies)\b/i,
      /\brelationships?\b/i,
      /\bSQL|NoSQL\b/i,
      /\bPostgreSQL|MySQL|MongoDB|Cassandra|Redis\b/i,
    ],
    [SignalName.ADDRESSED_BOTTLENECKS]: [
      /\bbottlenecks?\b/i,
      /\bperformance\s+issues?\b/i,
      /\bsingle\s+point\s+of\s+failure\b/i,
      /\bSPOF\b/i,
      /\boptimiz(e|ation)\b/i,
      /\bimprove\s+performance\b/i,
    ],
    [SignalName.DISCUSSED_TRADEOFFS]: [
      /\btrade[- ]?offs?\b/i,
      /\bvs\.?\b/i,
      /\balternatively\b/i,
      /\bpros?\s+(and|&)\s+cons?\b/i,
      /\badvantages?\s+(and|&)\s+disadvantages?\b/i,
      /\bon\s+the\s+other\s+hand\b/i,
      /\bhowever\b/i,
      /\bbut\s+if\s+we\b/i,
    ],
    [SignalName.STRUCTURED_APPROACH]: [
      /\bfirst(ly)?\b/i,
      /\bsecond(ly)?\b/i,
      /\bthird(ly)?\b/i,
      /\bstep\s+\d+/i,
      /\blet'?s\s+start\s+(by|with)\b/i,
      /\bto\s+summarize\b/i,
      /\bin\s+summary\b/i,
    ],
    [SignalName.ASKED_CLARIFYING_QUESTIONS]: [
      /\b(what|how|when|where|why|which)\b/i,
      /\bshould\s+(we|I)\s+(think|consider|assume)\b/i,
      /\bdo\s+(we|I)\s+need\s+to\b/i,
      /\bcan\s+(you|I|we)\s+(clarify|confirm|tell\s+me|assume)\b/i,
      /\bcould\s+you\s+(explain|clarify)\b/i,
      /\bjust\s+to\s+confirm\b/i,
      /\bto\s+clarify\b/i,
      /\blet\s+me\s+(first\s+)?clarify\b/i,
    ],
    [SignalName.READY_TO_ADVANCE]: [
      /\blet'?s\s+move\s+(to|on\s+to|forward\s+to)\b/i,
      /\bmove\s+to\s+(the\s+)?(next|requirements|high[- ]level|deep[- ]dive|bottlenecks?|wrap[- ]up)\b/i,
      /\bready\s+(to\s+)?(move|proceed|continue|advance)\b/i,
      /\bI\s+think\s+(I\s+)?understand.*(move|proceed|next)\b/i,
      /\b(shall\s+we|let'?s)\s+(proceed|continue|move\s+on)\b/i,
      /\bI'?m\s+ready\s+for\s+(the\s+)?next\b/i,
    ],
  };

  /**
   * Detect signals in a message text
   */
  detectSignalsInText(text: string): SignalName[] {
    const detectedSignals: SignalName[] = [];

    for (const [signalName, patterns] of Object.entries(this.signalPatterns)) {
      const isMatch = patterns.some((pattern) => pattern.test(text));
      if (isMatch) {
        detectedSignals.push(signalName as SignalName);
      }
    }

    return detectedSignals;
  }

  /**
   * Check if a signal already exists for a session
   */
  async signalExists(
    sessionId: number,
    signalName: SignalName,
  ): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(interviewSignals)
      .where(
        and(
          eq(interviewSignals.sessionId, sessionId),
          eq(interviewSignals.signalName, signalName),
        ),
      )
      .limit(1);

    return existing.length > 0;
  }

  /**
   * Record a detected signal
   */
  async recordSignal(
    sessionId: number,
    signalName: SignalName,
    phase: InterviewPhase,
    secondsElapsed: number,
    messageId?: number,
  ): Promise<DetectedSignal | null> {
    // Check if signal already exists (due to unique constraint)
    const exists = await this.signalExists(sessionId, signalName);
    if (exists) {
      return null; // Signal already recorded
    }

    const [signal] = await this.db
      .insert(interviewSignals)
      .values({
        sessionId,
        signalName,
        phase,
        secondsElapsed,
        triggeredByMessageId: messageId || null,
      })
      .returning();

    return signal;
  }

  /**
   * Detect and record signals from a message
   */
  async detectAndRecordSignals(
    options: DetectSignalsOptions,
  ): Promise<DetectedSignal[]> {
    const { sessionId, text, phase, secondsElapsed, messageId } = options;

    // Detect signals in the text
    const detectedSignalNames = this.detectSignalsInText(text);

    // Record each detected signal
    const recordedSignals: DetectedSignal[] = [];
    for (const signalName of detectedSignalNames) {
      const signal = await this.recordSignal(
        sessionId,
        signalName,
        phase,
        secondsElapsed,
        messageId,
      );
      if (signal) {
        recordedSignals.push(signal);
      }
    }

    return recordedSignals;
  }

  /**
   * Get all signals for a session
   */
  async getSessionSignals(sessionId: number): Promise<DetectedSignal[]> {
    const signals = await this.db
      .select()
      .from(interviewSignals)
      .where(eq(interviewSignals.sessionId, sessionId))
      .orderBy(interviewSignals.detectedAt);

    return signals;
  }

  /**
   * Get signals for a specific phase
   */
  async getPhaseSignals(
    sessionId: number,
    phase: InterviewPhase,
  ): Promise<DetectedSignal[]> {
    const signals = await this.db
      .select()
      .from(interviewSignals)
      .where(
        and(
          eq(interviewSignals.sessionId, sessionId),
          eq(interviewSignals.phase, phase),
        ),
      )
      .orderBy(interviewSignals.detectedAt);

    return signals;
  }

  /**
   * Check which signals are missing for a session
   */
  async getMissingSignals(sessionId: number): Promise<SignalName[]> {
    const detectedSignals = await this.getSessionSignals(sessionId);
    const detectedSignalNames = new Set(
      detectedSignals.map((s) => s.signalName),
    );

    const allSignals = Object.values(SignalName);
    return allSignals.filter((signal) => !detectedSignalNames.has(signal));
  }

  /**
   * Get signal coverage percentage
   */
  async getSignalCoverage(sessionId: number): Promise<number> {
    const detectedSignals = await this.getSessionSignals(sessionId);
    const totalSignals = Object.values(SignalName).length;
    return Math.round((detectedSignals.length / totalSignals) * 100);
  }
}
