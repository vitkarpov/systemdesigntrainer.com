import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';

export interface FeedbackJobData {
  sessionId: number;
  userId: number;
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

  constructor(private readonly feedbackService: FeedbackService) {}

  @Process('generate')
  async handleFeedbackGeneration(job: Job<FeedbackJobData>) {
    const { sessionId, regenerate } = job.data;

    this.logger.log(
      `[Job ${job.id}] Starting feedback generation`,
      job.data
    );

    try {
      // Update progress: Starting
      await job.progress(10);

      // Generate feedback (this calls the existing service method)
      const result = await this.feedbackService.generateFeedback(sessionId, regenerate);

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
      throw error; // Will trigger retry based on job options
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job<FeedbackJobData>, result: any) {
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
    // Could send notification to user or alert admin
  }
}
