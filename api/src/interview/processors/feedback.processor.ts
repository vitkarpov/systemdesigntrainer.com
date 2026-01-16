import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
  InjectQueue,
} from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { Logger } from '@nestjs/common';
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

    const result = await this.feedbackService.generateFeedback(
      sessionId,
      regenerate,
    );

    this.logger.log(
      `[Job ${job.id}] Feedback generation completed for session ${sessionId}`,
    );

    return result;
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
          {
            error,
            jobId: job.id,
            userId: job.data.userId,
            sessionId: job.data.sessionId,
            context: 'FeedbackProcessor.onCompleted',
          },
        );
      }
    }
  }

  @OnQueueFailed()
  onFailed(job: Job<FeedbackJobData>, error: Error) {
    this.logger.error(
      `[Job ${job.id}] Feedback generation failed permanently for session ${job.data.sessionId}:`,
      {
        error,
        jobId: job.id,
        sessionId: job.data.sessionId,
        jobName: 'feedback.generate',
        jobStatus: 'permanently_failed',
        jobData: job.data,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
      },
    );
  }
}
