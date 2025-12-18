import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  text,
  index,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),

    // Authentication (WorkOS + GitHub OAuth)
    workosUserId: varchar('workos_user_id', { length: 255 }).notNull().unique(),
    githubId: varchar('github_id', { length: 255 }).unique(),
    githubUsername: varchar('github_username', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull().unique(),

    // Profile
    name: varchar('name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    targetLevel: varchar('target_level', { length: 20 }),

    // Subscription
    subscriptionStatus: varchar('subscription_status', { length: 20 })
      .notNull()
      .default('free'),
    subscriptionExpiresAt: timestamp('subscription_expires_at'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),

    // Usage tracking
    interviewsCompleted: integer('interviews_completed').notNull().default(0),
    interviewsRemaining: integer('interviews_remaining').notNull().default(1),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
  },
  (table) => ({
    workosUserIdIdx: index('idx_users_workos_user_id').on(table.workosUserId),
    githubIdIdx: index('idx_users_github_id').on(table.githubId),
    emailIdx: index('idx_users_email').on(table.email),
    subscriptionStatusIdx: index('idx_users_subscription_status').on(
      table.subscriptionStatus,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
