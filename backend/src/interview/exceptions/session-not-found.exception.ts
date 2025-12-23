import { NotFoundException, Logger } from '@nestjs/common';

export class SessionNotFoundException extends NotFoundException {
  private readonly logger = new Logger(SessionNotFoundException.name);

  constructor(sessionId: number, userId?: number) {
    super({
      message: 'Interview session not found',
      errorCode: 'SESSION_NOT_FOUND',
    });

    this.logger.error(
      `Session ${sessionId} not found${userId ? ` for user ${userId}` : ''}`,
      {
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
