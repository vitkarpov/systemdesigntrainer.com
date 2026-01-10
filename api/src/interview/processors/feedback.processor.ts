import {
  Processor,
  Process,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';
import { FeedbackGenerationService } from '../services/feedback-generation.service';

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
  private readonly useAiFeedback: boolean;

  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly feedbackGenerationService: FeedbackGenerationService,
  ) {
    // Feature flag: Enable AI feedback via environment variable
    // Set to 'true' to use AI feedback, 'false' or undefined for rule-based
    this.useAiFeedback = process.env.USE_AI_FEEDBACK === 'true';

    this.logger.log(
      `FeedbackProcessor initialized with ${this.useAiFeedback ? 'AI' : 'rule-based'} feedback generation`,
    );
  }

  @Process('generate')
  async handleFeedbackGeneration(job: Job<FeedbackJobData>) {
    const { sessionId, userId } = job.data;

    const method = this.useAiFeedback ? 'AI' : 'rule-based';
    this.logger.log(
      `[Job ${job.id}] Starting ${method} feedback generation for session ${sessionId} (user ${userId})`,
    );

    try {
      // Update progress: Starting
      await job.progress(10);

      // Generate feedback using AI or rule-based approach
      let result;
      if (this.useAiFeedback) {
        // Use AI-powered feedback generation
        const aiResult =
          await this.feedbackGenerationService.generateAiFeedback(sessionId);

        // Update progress
        await job.progress(100);

        this.logger.log(
          `[Job ${job.id}] AI feedback generation completed for session ${sessionId} (method: ${aiResult.report.generationMethod})`,
        );

        result = aiResult;
      } else {
        // Use existing rule-based feedback generation
        result = await this.feedbackService.generateFeedback(sessionId);

        // Update progress: Complete
        await job.progress(100);

        this.logger.log(
          `[Job ${job.id}] Rule-based feedback generation completed for session ${sessionId}`,
        );
      }

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
