import { initializeDb } from './db-connection';
import type {
  AdminOperationEvent,
  AdminOperationResponse,
  AddCreditsPayload,
  GenerateFeedbackPayload,
  SendFarewellEmailPayload,
} from './types/operations.types';

// Import operation handlers
import { addCredits } from './operations/add-credits';
import { generateFeedback } from './operations/generate-feedback';
import { sendFarewellEmail } from './operations/send-farewell-email';

/**
 * Main Lambda handler that routes to different admin operations
 */
export async function handler(
  event: AdminOperationEvent,
): Promise<AdminOperationResponse> {
  const startTime = Date.now();

  console.log('Admin Lambda invoked', {
    operation: event.operation,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate operation field
    if (!event.operation || typeof event.operation !== 'string') {
      return {
        success: false,
        operation: 'unknown',
        error: 'operation field is required and must be a string',
      };
    }

    // Initialize database connection
    const db = await initializeDb();

    // Route to appropriate operation handler
    let result: AdminOperationResponse;

    switch (event.operation) {
      case 'add-credits':
        result = await addCredits(db, event.payload as AddCreditsPayload);
        break;

      case 'generate-feedback':
        result = await generateFeedback(
          db,
          event.payload as GenerateFeedbackPayload,
        );
        break;

      case 'send-farewell-email':
        result = await sendFarewellEmail(
          db,
          event.payload as SendFarewellEmailPayload,
        );
        break;

      default:
        result = {
          success: false,
          operation: event.operation,
          error: `Unknown operation: ${event.operation}`,
        };
    }

    const duration = Date.now() - startTime;
    console.log('Operation completed', {
      operation: event.operation,
      success: result.success,
      duration,
    });

    return result;
  } catch (error) {
    console.error('Unhandled error in Lambda handler:', error);

    return {
      success: false,
      operation: event.operation || 'unknown',
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
