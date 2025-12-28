import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const purchases = pgTable(
  'purchases',
  {
    id: serial('id').primaryKey(),

    // User who made the purchase
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Stripe identifiers
    stripePaymentIntentId: varchar('stripe_payment_intent_id', {
      length: 255,
    }).unique(),
    stripeSubscriptionId: varchar('stripe_subscription_id', {
      length: 255,
    }).unique(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),

    // Purchase details
    productType: varchar('product_type', { length: 20 })
      .notNull()
      .$type<'3_interviews' | '5_interviews' | 'unlimited'>(),
    interviewsGranted: integer('interviews_granted').notNull(),
    amountPaid: integer('amount_paid').notNull(), // cents

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_purchases_user_id').on(table.userId),
    paymentIntentIdx: index('idx_purchases_payment_intent').on(
      table.stripePaymentIntentId,
    ),
    subscriptionIdx: index('idx_purchases_subscription').on(
      table.stripeSubscriptionId,
    ),
  }),
);

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
