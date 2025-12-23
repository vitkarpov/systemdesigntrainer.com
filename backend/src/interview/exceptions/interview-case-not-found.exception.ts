import { NotFoundException, Logger } from '@nestjs/common';

export class InterviewCaseNotFoundException extends NotFoundException {
  private readonly logger = new Logger(InterviewCaseNotFoundException.name);

  constructor(caseId: number, userId?: number) {
    super({
      message: 'Interview case not found',
      errorCode: 'CASE_NOT_FOUND',
    });

    // Log error with context for debugging (without exposing to client)
    this.logger.error(
      `Interview case ${caseId} not found${userId ? ` for user ${userId}` : ''}`,
      {
        caseId,
        userId,
        timestamp: new Date().toISOString(),
      },
    );
  }
}
