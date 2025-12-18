import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { interviewSessions } from './interview-sessions.schema';

export const feedbackReports = pgTable('feedback_reports', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .unique()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),

  // Overall scores (1-5 scale)
  overallScore: integer('overall_score').notNull(),
  requirementsScore: integer('requirements_score').notNull(),
  designScore: integer('design_score').notNull(),
  communicationScore: integer('communication_score').notNull(),
  timeManagementScore: integer('time_management_score').notNull(),
  depthScore: integer('depth_score').notNull(),

  // Summary
  overallSummary: text('overall_summary').notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedbackItems = pgTable('feedback_items', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => feedbackReports.id, { onDelete: 'cascade' }),

  // Item type: strength, weakness, suggestion
  itemType: varchar('item_type', { length: 20 }).notNull(),

  // The feedback text
  description: text('description').notNull(),

  // For ordering
  displayOrder: integer('display_order').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedbackNextSteps = pgTable('feedback_next_steps', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => feedbackReports.id, { onDelete: 'cascade' }),

  // The next step recommendation
  description: text('description').notNull(),

  // For ordering
  displayOrder: integer('display_order').notNull().default(0),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type FeedbackReport = typeof feedbackReports.$inferSelect;
export type NewFeedbackReport = typeof feedbackReports.$inferInsert;
export type FeedbackItem = typeof feedbackItems.$inferSelect;
export type NewFeedbackItem = typeof feedbackItems.$inferInsert;
export type FeedbackNextStep = typeof feedbackNextSteps.$inferSelect;
export type NewFeedbackNextStep = typeof feedbackNextSteps.$inferInsert;
