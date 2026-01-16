import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { EmailService } from '../services/email.service';

export interface EmailJobData {
  userId: number;
  sessionId: number;
}

/**
 * EmailProcessor
 *
 * Background worker that processes email sending jobs.
 * Runs asynchronously to avoid blocking feedback generation.
 *
 * Retry configuration: 3 attempts with exponential backoff
 */
@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process('feedback-ready')
  async handleFeedbackReadyEmail(job: Job<EmailJobData>) {
    const { userId, sessionId } = job.data;

    this.logger.log(
      `[Job ${job.id}] Processing feedback-ready email`,
      job.data,
    );

    await this.emailService.sendFeedbackReadyEmail(userId, sessionId);

    this.logger.log(
      `[Job ${job.id}] Successfully sent feedback-ready email to user ${userId} for session ${sessionId}`,
    );
  }

  @OnQueueFailed()
  async handleQueueFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(
      `[Job ${job.id}] Email job failed after ${job.attemptsMade} attempts`,
      {
        error: error.message,
        stack: error.stack,
        data: job.data,
      },
    );

    Sentry.captureException(error, {
      extra: {
        jobId: job.id,
        jobData: job.data,
        attemptsMade: job.attemptsMade,
        context: 'EmailProcessor.handleQueueFailed',
      },
    });
  }
}
