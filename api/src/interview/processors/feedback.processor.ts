import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { FeedbackService } from '../services/feedback.service';

export interface FeedbackJobData {
  sessionId: number;
  regenerate: boolean;
}

/**
 * FeedbackProcessor
 *
 * Background worker that processes feedback generation jobs.
 * Runs asynchronously to avoid blocking HTTP requests.
 */
@Processor('feedback')
export class FeedbackProcessor {
  private readonly logger = new Logger(FeedbackProcessor.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Process('generate')
  async handleFeedbackGeneration(job: Job<FeedbackJobData>) {
    const { sessionId, regenerate } = job.data;

    return await Sentry.startSpan(
      {
        name: 'feedback.generate',
        op: 'queue.task',
        attributes: {
          'job.id': job.id?.toString(),
          'session.id': sessionId.toString(),
          'job.regenerate': regenerate,
          'job.attemptsMade': job.attemptsMade,
        },
      },
      async () => {
        this.logger.log(
          `[Job ${job.id}] Starting feedback generation`,
          job.data,
        );

        try {
          const result = await this.feedbackService.generateFeedback(
            sessionId,
            regenerate,
          );

          this.logger.log(
            `[Job ${job.id}] Feedback generation completed for session ${sessionId}`,
          );

          return result;
        } catch (error) {
          this.logger.error(
            `[Job ${job.id}] Feedback generation failed for session ${sessionId}:`,
            error,
          );

          Sentry.captureException(error, {
            tags: {
              jobId: job.id?.toString(),
              sessionId: sessionId.toString(),
              jobName: 'feedback.generate',
            },
            extra: {
              jobData: job.data,
              attemptsMade: job.attemptsMade,
            },
          });

          throw error; // Will trigger retry based on job options
        }
      },
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<FeedbackJobData>) {
    this.logger.log(
      `[Job ${job.id}] Feedback generated successfully for session ${job.data.sessionId}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job<FeedbackJobData>, error: Error) {
    this.logger.error(
      `[Job ${job.id}] Feedback generation failed permanently for session ${job.data.sessionId}:`,
      error.message,
    );

    // Capture permanent failure in Sentry
    Sentry.captureException(error, {
      tags: {
        jobId: job.id?.toString(),
        sessionId: job.data.sessionId.toString(),
        jobName: 'feedback.generate',
        jobStatus: 'permanently_failed',
      },
      extra: {
        jobData: job.data,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
      },
      level: 'error',
    });

    // Could send notification to user or alert admin
  }
}
