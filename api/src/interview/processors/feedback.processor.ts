import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
  InjectQueue,
} from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { FeedbackService } from '../services/feedback.service';

export interface FeedbackJobData {
  sessionId: number;
  regenerate: boolean;
  userId: number;
  wasForceTransitioned: boolean;
}

/**
 * FeedbackProcessor
 *
 * Background worker that processes feedback generation jobs.
 * Runs asynchronously to avoid blocking HTTP requests.
 *
 * Job progression:
 * - 10%: Scores calculated
 * - 40%: Feedback items generated
 * - 70%: Next steps generated
 * - 90%: Results saved to database
 * - 100%: Complete
 */
@Processor('feedback')
export class FeedbackProcessor {
  private readonly logger = new Logger(FeedbackProcessor.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  @Process('generate')
  async handleFeedbackGeneration(job: Job<FeedbackJobData>) {
    const { sessionId, regenerate } = job.data;

    this.logger.log(`[Job ${job.id}] Starting feedback generation`, job.data);

    try {
      // Update progress: Starting
      await job.progress(10);

      // Generate feedback (this calls the existing service method)
      const result = await this.feedbackService.generateFeedback(
        sessionId,
        regenerate,
      );

      // Update progress: Complete
      await job.progress(100);

      this.logger.log(
        `[Job ${job.id}] Feedback generation completed for session ${sessionId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Feedback generation failed for session ${sessionId}:`,
        error,
      );

      // Capture error in Sentry with context
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
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<FeedbackJobData>) {
    this.logger.log(
      `[Job ${job.id}] Feedback generated successfully for session ${job.data.sessionId}`,
    );

    if (job.data.wasForceTransitioned) {
      try {
        await this.emailQueue.add('feedback-ready', {
          userId: job.data.userId,
          sessionId: job.data.sessionId,
        });
        this.logger.log(
          `[Job ${job.id}] Enqueued feedback-ready email for user ${job.data.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `[Job ${job.id}] Failed to enqueue feedback-ready email`,
          error,
        );
        Sentry.captureException(error, {
          extra: {
            jobId: job.id,
            userId: job.data.userId,
            sessionId: job.data.sessionId,
            context: 'FeedbackProcessor.onCompleted',
          },
        });
      }
    }
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
