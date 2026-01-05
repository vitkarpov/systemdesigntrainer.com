import { Injectable, Inject, ForbiddenException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../db/db.module';
import * as schema from '../../db/schema';

@Injectable()
export class PaymentGuardService {
  private readonly logger = new Logger(PaymentGuardService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Check if user has available interviews (either unlimited subscription or credits remaining)
   * Throws ForbiddenException if user cannot start an interview
   */
  async checkCanStartInterview(userId: number): Promise<void> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Check if user has unlimited subscription
    if (user.subscriptionStatus === 'unlimited') {
      this.logger.log(`User ${userId} has unlimited subscription`);
      return;
    }

    // Check if user has interviews remaining
    if (!user.interviewsRemaining || user.interviewsRemaining <= 0) {
      this.logger.warn(`User ${userId} has no interviews remaining`);
      throw new ForbiddenException(
        'You have no interviews remaining. Please purchase more interviews to continue.',
      );
    }

    this.logger.log(
      `User ${userId} has ${user.interviewsRemaining} interviews remaining`,
    );
  }

  /**
   * Consume one interview credit from user's balance
   * Only decrements if user is NOT on unlimited subscription
   */
  async consumeInterview(userId: number): Promise<void> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Don't consume credit if unlimited
    if (user.subscriptionStatus === 'unlimited') {
      this.logger.log(`User ${userId} on unlimited - no credit consumed`);
      return;
    }

    // Decrement counter
    const newBalance = (user.interviewsRemaining || 0) - 1;
    await this.db
      .update(schema.users)
      .set({
        interviewsRemaining: Math.max(0, newBalance), // Ensure non-negative
        interviewsCompleted: (user.interviewsCompleted || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));

    this.logger.log(
      `User ${userId} consumed 1 interview. New balance: ${newBalance}`,
    );
  }

  /**
   * Get user's remaining interview count
   */
  async getRemainingInterviews(userId: number): Promise<number | 'unlimited'> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) {
      return 0;
    }

    if (user.subscriptionStatus === 'unlimited') {
      return 'unlimited';
    }

    return user.interviewsRemaining || 0;
  }
}
