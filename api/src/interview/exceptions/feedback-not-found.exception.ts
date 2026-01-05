import { NotFoundException, Logger } from '@nestjs/common';

export class FeedbackNotFoundException extends NotFoundException {
  private readonly logger = new Logger(FeedbackNotFoundException.name);

  constructor(sessionId: number) {
    super({
      message: 'Feedback report not found for this session',
      errorCode: 'FEEDBACK_NOT_FOUND',
    });

    this.logger.error(`Feedback report not found for session ${sessionId}`, {
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }
}
