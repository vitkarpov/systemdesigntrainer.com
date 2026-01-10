import { Queue } from 'bull';
import Bull from 'bull';
import { eq } from 'drizzle-orm';
import { interviewSessions } from '../../db/schema/interview-sessions.schema';
import { feedbackReports } from '../../db/schema/feedback.schema';
import type {
  GenerateFeedbackPayload,
  GenerateFeedbackResponse,
} from '../types/operations.types';
import type { Database } from '../db-connection';

/**
 * Manually trigger feedback generation for a session by adding a job to the Bull queue
 */
export async function generateFeedback(
  db: Database,
  payload: GenerateFeedbackPayload,
): Promise<GenerateFeedbackResponse> {
  const startTime = Date.now();

  console.log('Executing generate-feedback operation', {
    sessionId: payload.sessionId,
    regenerate: payload.regenerate,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate input
    if (
      !payload.sessionId ||
      typeof payload.sessionId !== 'number' ||
      payload.sessionId <= 0
    ) {
      return {
        success: false,
        operation: 'generate-feedback',
        error: 'sessionId is required and must be a positive number',
      };
    }

    // Check if session exists
    const [session] = await db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.id, payload.sessionId))
      .limit(1);

    if (!session) {
      console.error('Session not found', { sessionId: payload.sessionId });
      return {
        success: false,
        operation: 'generate-feedback',
        error: `Session not found with id: ${payload.sessionId}`,
      };
    }

    // Create Bull queue connection
    const feedbackQueue: Queue = new Bull('feedback', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    });

    // Enqueue feedback generation job
    const job = await feedbackQueue.add(
      'generate',
      {
        sessionId: payload.sessionId,
        userId: session.userId,
        regenerate: payload.regenerate,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    );

    // Close the queue connection
    await feedbackQueue.close();

    const duration = Date.now() - startTime;
    console.log('Feedback generation job enqueued successfully', {
      sessionId: payload.sessionId,
      jobId: job.id,
      duration,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      operation: 'generate-feedback',
      data: {
        sessionId: payload.sessionId,
        jobId: job.id,
        status: 'queued',
        alreadyExists: false,
      },
    };
  } catch (error) {
    console.error('Error in generate-feedback operation:', error);

    return {
      success: false,
      operation: 'generate-feedback',
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
