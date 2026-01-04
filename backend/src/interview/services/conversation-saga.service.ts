import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DATABASE_CONNECTION } from '../../db/db.module';
import { TranscriptService } from './transcript.service';
import { SignalService } from './signal.service';
import { RedFlagService } from './red-flag.service';
import { AiService } from '../../ai/services/ai.service';
import {
  PromptService,
  InterviewCaseData,
} from '../../ai/services/prompt.service';
import {
  InterviewPhase,
  MessageRole,
  SessionState,
} from '../types/session.types';

/**
 * ConversationSaga implements the saga pattern for conversation turns.
 *
 * The saga ensures data consistency when a conversation turn fails:
 * 1. Save candidate message with 'pending' status
 * 2. Generate AI response (may fail)
 * 3. Save AI response, detect signals, check red flags
 * 4. Mark candidate message as 'completed'
 *
 * If step 2-3 fail:
 * - Candidate message remains in 'pending' status for retry
 * - Partial AI response is saved (if any)
 * - Client can resume the conversation
 */
@Injectable()
export class ConversationSagaService {
  private readonly logger = new Logger(ConversationSagaService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>,
    private transcriptService: TranscriptService,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private aiService: AiService,
    private promptService: PromptService,
  ) {}

  /**
   * Execute a conversation turn using the saga pattern.
   * Returns the candidate message ID for streaming correlation.
   */
  async startConversationTurn(
    session: SessionState,
    interviewCase: InterviewCaseData,
    text: string,
    elapsedSeconds: number,
    diagram?: { nodes: any[]; edges: any[] } | null,
  ): Promise<{ candidateMessageId: number }> {
    // Step 1: Save candidate message with 'pending' status
    const candidateMessage = await this.transcriptService.addMessage({
      sessionId: session.id,
      role: MessageRole.CANDIDATE,
      text,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
      status: 'pending', // Mark as pending until AI responds
    });

    // Step 2: Update lastUserMessageAt timestamp for timeout tracking
    await this.db
      .update(schema.interviewSessions)
      .set({
        lastUserMessageAt: sql`NOW()`,
        updatedAt: sql`NOW()`,
      })
      .where(eq(schema.interviewSessions.id, session.id));

    this.logger.log(
      `Conversation turn started for session ${session.id}, candidate message ${candidateMessage.id}`,
    );

    return { candidateMessageId: candidateMessage.id };
  }

  /**
   * Complete a conversation turn by saving AI response and processing signals.
   * Called after AI response is fully streamed.
   */
  async completeConversationTurn(
    sessionId: number,
    candidateMessageId: number,
    aiResponseText: string,
    candidateText: string,
    currentPhase: InterviewPhase,
    elapsedSeconds: number,
    usage: { inputTokens: number; outputTokens: number },
  ): Promise<{
    interviewerMessage: any;
    detectedSignals: any[];
    detectedRedFlags: any[];
  }> {
    try {
      // Step 2: Save AI response as completed
      const interviewerMessage = await this.transcriptService.addMessage({
        sessionId,
        role: MessageRole.INTERVIEWER,
        text: aiResponseText,
        phase: currentPhase,
        secondsElapsed: elapsedSeconds,
        status: 'completed',
      });

      // Step 3: Mark candidate message as completed
      await this.markCandidateMessageCompleted(candidateMessageId);

      // Step 4: Detect signals in candidate's message
      const detectedSignals = await this.signalService.detectAndRecordSignals({
        sessionId,
        text: candidateText,
        phase: currentPhase,
        secondsElapsed: elapsedSeconds,
        messageId: candidateMessageId,
      });

      // Step 5: Check for red flags
      const detectedRedFlags = await this.redFlagService.checkRedFlags({
        sessionId,
        currentPhase,
        secondsElapsed: elapsedSeconds,
        messageText: candidateText,
      });

      this.logger.log(
        `Conversation turn completed for session ${sessionId}, detected ${detectedSignals.length} signals and ${detectedRedFlags.length} red flags`,
      );

      return {
        interviewerMessage,
        detectedSignals,
        detectedRedFlags,
      };
    } catch (error) {
      // Compensation: Mark candidate message as failed for retry
      await this.compensate(candidateMessageId, null);
      throw error;
    }
  }

  /**
   * Handle streaming failure by saving partial response and marking for retry.
   * Called when AI response stream fails mid-way.
   */
  async handleStreamingFailure(
    candidateMessageId: number,
    partialResponse?: string,
  ): Promise<void> {
    this.logger.error(
      `Streaming failure for candidate message ${candidateMessageId}, saving partial response`,
    );
    await this.compensate(candidateMessageId, partialResponse);
  }

  /**
   * Compensation logic: Mark candidate message as failed and optionally save partial response.
   */
  private async compensate(
    candidateMessageId: number,
    partialResponse?: string | null,
  ): Promise<void> {
    const updates: any = { status: 'failed' };
    if (partialResponse) {
      updates.partialText = partialResponse;
    }

    await this.db
      .update(schema.transcriptMessages)
      .set(updates)
      .where(eq(schema.transcriptMessages.id, candidateMessageId));

    this.logger.warn(
      `Compensated: Marked candidate message ${candidateMessageId} as failed${partialResponse ? ' with partial response' : ''}`,
    );
  }

  /**
   * Mark candidate message as successfully completed.
   */
  private async markCandidateMessageCompleted(
    candidateMessageId: number,
  ): Promise<void> {
    await this.db
      .update(schema.transcriptMessages)
      .set({ status: 'completed' })
      .where(eq(schema.transcriptMessages.id, candidateMessageId));
  }

  /**
   * Get all pending (unprocessed) candidate messages for a session.
   * Used for retry/resumption logic.
   */
  async getPendingMessages(sessionId: number) {
    return this.db.query.transcriptMessages.findMany({
      where: (messages, { eq, and }) =>
        and(
          eq(messages.sessionId, sessionId),
          eq(messages.role, MessageRole.CANDIDATE),
          eq(messages.status, 'pending'),
        ),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
  }

  /**
   * Get all failed messages for a session (for retry).
   */
  async getFailedMessages(sessionId: number) {
    return this.db.query.transcriptMessages.findMany({
      where: (messages, { eq, and }) =>
        and(
          eq(messages.sessionId, sessionId),
          eq(messages.role, MessageRole.CANDIDATE),
          eq(messages.status, 'failed'),
        ),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
  }

  /**
   * Get a specific message by ID with validation.
   */
  async getMessage(messageId: number) {
    const messages = await this.db
      .select()
      .from(schema.transcriptMessages)
      .where(eq(schema.transcriptMessages.id, messageId))
      .limit(1);

    if (!messages || messages.length === 0) {
      return null;
    }

    return messages[0];
  }

  /**
   * Reset a failed message to pending state for retry.
   */
  async resetMessageForRetry(messageId: number): Promise<void> {
    await this.db
      .update(schema.transcriptMessages)
      .set({ status: 'pending', partialText: null })
      .where(eq(schema.transcriptMessages.id, messageId));

    this.logger.log(`Reset message ${messageId} to pending for retry`);
  }
}
