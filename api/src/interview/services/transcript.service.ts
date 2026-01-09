import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, and } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import type { db as DbType } from '../../../db/db';
import { transcriptMessages } from '../../../db/schema';
import { MessageRole, InterviewPhase } from '../types/session.types';

export interface AddMessageDto {
  sessionId: number;
  role: MessageRole;
  text: string;
  phase: InterviewPhase;
  secondsElapsed: number;
  status?: string; // For saga pattern: 'pending', 'completed', 'failed'
  partialText?: string; // Store partial response if streaming fails
}

export interface TranscriptMessage {
  id: number;
  sessionId: number;
  role: string;
  text: string;
  phase: string;
  secondsElapsed: number;
  status: string;
  partialText: string | null;
  createdAt: Date;
}

@Injectable()
export class TranscriptService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Add a message to the transcript
   */
  async addMessage(dto: AddMessageDto): Promise<TranscriptMessage> {
    const values: any = {
      sessionId: dto.sessionId,
      role: dto.role,
      text: dto.text,
      phase: dto.phase,
      secondsElapsed: dto.secondsElapsed,
    };

    // Add saga pattern fields if provided
    if (dto.status) {
      values.status = dto.status;
    }
    if (dto.partialText) {
      values.partialText = dto.partialText;
    }

    const [message] = await this.db
      .insert(transcriptMessages)
      .values(values)
      .returning();

    return message;
  }

  /**
   * Get all messages for a session
   */
  async getSessionTranscript(sessionId: number): Promise<TranscriptMessage[]> {
    const messages = await this.db
      .select()
      .from(transcriptMessages)
      .where(eq(transcriptMessages.sessionId, sessionId))
      .orderBy(transcriptMessages.createdAt);

    return messages;
  }

  /**
   * Get messages for a specific phase
   */
  async getPhaseMessages(
    sessionId: number,
    phase: InterviewPhase,
  ): Promise<TranscriptMessage[]> {
    const messages = await this.db
      .select()
      .from(transcriptMessages)
      .where(
        and(
          eq(transcriptMessages.sessionId, sessionId),
          eq(transcriptMessages.phase, phase),
        ),
      )
      .orderBy(transcriptMessages.createdAt);

    return messages;
  }

  /**
   * Get the last N messages
   */
  async getRecentMessages(
    sessionId: number,
    limit: number = 10,
  ): Promise<TranscriptMessage[]> {
    const messages = await this.db
      .select()
      .from(transcriptMessages)
      .where(eq(transcriptMessages.sessionId, sessionId))
      .orderBy(desc(transcriptMessages.createdAt))
      .limit(limit);

    return messages.reverse(); // Return in chronological order
  }

  /**
   * Count messages in a session
   */
  async getMessageCount(sessionId: number): Promise<number> {
    const messages = await this.db
      .select()
      .from(transcriptMessages)
      .where(eq(transcriptMessages.sessionId, sessionId));

    return messages.length;
  }

  /**
   * Get the last message
   */
  async getLastMessage(
    sessionId: number,
  ): Promise<TranscriptMessage | undefined> {
    const messages = await this.db
      .select()
      .from(transcriptMessages)
      .where(eq(transcriptMessages.sessionId, sessionId))
      .orderBy(desc(transcriptMessages.createdAt))
      .limit(1);

    return messages[0];
  }
}
