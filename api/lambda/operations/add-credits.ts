import { eq } from 'drizzle-orm';
import { users } from '../../db/schema/users.schema';
import type {
  AddCreditsPayload,
  AddCreditsResponse,
} from '../types/operations.types';
import type { Database } from '../db-connection';

/**
 * Add credits to a user's account
 */
export async function addCredits(
  db: Database,
  payload: AddCreditsPayload,
): Promise<AddCreditsResponse> {
  const startTime = Date.now();

  console.log('Executing add-credits operation', {
    workosUserId: payload.workosUserId,
    credits: payload.credits,
    reason: payload.reason,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate input
    if (!payload.workosUserId || typeof payload.workosUserId !== 'string') {
      return {
        success: false,
        operation: 'add-credits',
        error: 'workosUserId is required and must be a string',
      };
    }

    if (typeof payload.credits !== 'number') {
      return {
        success: false,
        operation: 'add-credits',
        error: 'credits must be a number',
      };
    }

    // Find user by workosUserId
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.workosUserId, payload.workosUserId))
      .limit(1);

    if (!user) {
      console.error('User not found', { workosUserId: payload.workosUserId });
      return {
        success: false,
        operation: 'add-credits',
        error: `User not found with workosUserId: ${payload.workosUserId}`,
      };
    }

    // Calculate new balance (ensure it doesn't go below 0)
    const previousBalance = user.interviewsRemaining;
    const newBalance = Math.max(0, previousBalance + payload.credits);

    // Update user's credits
    const [updatedUser] = await db
      .update(users)
      .set({
        interviewsRemaining: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    // Log the operation
    const duration = Date.now() - startTime;
    console.log('Credits updated successfully', {
      userId: user.id,
      workosUserId: user.workosUserId,
      email: user.email,
      creditsAdded: payload.credits,
      previousBalance,
      newBalance,
      reason: payload.reason,
      duration,
      timestamp: updatedUser.updatedAt.toISOString(),
    });

    return {
      success: true,
      operation: 'add-credits',
      data: {
        userId: user.id,
        workosUserId: user.workosUserId,
        email: user.email,
        creditsAdded: payload.credits,
        previousBalance,
        newBalance,
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error in add-credits operation:', error);

    return {
      success: false,
      operation: 'add-credits',
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
