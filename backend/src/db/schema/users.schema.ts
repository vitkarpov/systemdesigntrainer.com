import { pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),

  // Authentication
  email: varchar('email', { length: 255 }).notNull().unique(),

  // Profile (optional for MVP)
  name: varchar('name', { length: 255 }),
  targetLevel: varchar('target_level', { length: 20 }),

  // Subscription
  subscriptionStatus: varchar('subscription_status', { length: 20 }).notNull().default('free'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

  // Usage tracking
  interviewsCompleted: integer('interviews_completed').notNull().default(0),
  interviewsRemaining: integer('interviews_remaining').notNull().default(1),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
