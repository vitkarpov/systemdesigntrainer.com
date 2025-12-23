import { ForbiddenException, Logger } from '@nestjs/common';

export class SessionAccessDeniedException extends ForbiddenException {
  private readonly logger = new Logger(SessionAccessDeniedException.name);

  constructor(sessionId: number, userId: number) {
    super({
      message: 'Access denied to this session',
      errorCode: 'SESSION_ACCESS_DENIED',
    });

    this.logger.warn(
      `User ${userId} attempted to access session ${sessionId} without permission`,
      {
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
