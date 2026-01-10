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

  // Overall scores (0-100 scale)
  overallScore: integer('overall_score').notNull(),
  requirementsScore: integer('requirements_score').notNull(),
  designScore: integer('design_score').notNull(),
  communicationScore: integer('communication_score').notNull(),
  timeManagementScore: integer('time_management_score').notNull(),
  depthScore: integer('depth_score').notNull(),

  // Summary (legacy - kept for backward compatibility)
  overallSummary: text('overall_summary').notNull(),

  // AI-generated feedback fields
  recommendation: varchar('recommendation', { length: 50 }),
  // Values: 'strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire'

  overallAssessment: text('overall_assessment'),
  // AI-generated overall assessment (2-3 paragraphs)

  generationMethod: varchar('generation_method', { length: 20 })
    .notNull()
    .default('rule_based'),
  // Values: 'rule_based', 'ai_generated'

  aiModel: varchar('ai_model', { length: 50 }),
  // e.g., 'claude-opus-4-5', 'claude-haiku-4-5'

  generationDurationMs: integer('generation_duration_ms'),
  // For monitoring and performance tracking

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

export const feedbackSections = pgTable('feedback_sections', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id')
    .notNull()
    .references(() => feedbackReports.id, { onDelete: 'cascade' }),

  // Section type
  sectionType: varchar('section_type', { length: 50 }).notNull(),
  // Values: 'dimensional_breakdown', 'key_strengths', 'areas_for_improvement',
  //         'next_steps', 'examples'

  // Dimension (only for dimensional_breakdown sections)
  dimension: varchar('dimension', { length: 50 }),
  // Values: 'requirements', 'design', 'communication', 'time_management', 'depth'

  // The section content
  content: text('content').notNull(),

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
export type FeedbackSection = typeof feedbackSections.$inferSelect;
export type NewFeedbackSection = typeof feedbackSections.$inferInsert;
