import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

export const interviewCases = pgTable('interview_cases', {
  id: serial('id').primaryKey(),

  // Basic info
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  description: text('description').notNull(),
  difficulty: varchar('difficulty', { length: 20 }).notNull(),

  // Problem definition
  problemStatement: text('problem_statement').notNull(),

  // Metadata
  estimatedDuration: integer('estimated_duration').notNull(), // Minutes

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const interviewCaseExpectations = pgTable(
  'interview_case_expectations',
  {
    id: serial('id').primaryKey(),
    caseId: integer('case_id')
      .notNull()
      .references(() => interviewCases.id, { onDelete: 'cascade' }),

    // Type of expectation
    expectationType: varchar('expectation_type', { length: 50 }).notNull(),

    // The actual expectation
    description: text('description').notNull(),

    // For ordering/grouping
    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
);

export const interviewCaseTags = pgTable(
  'interview_case_tags',
  {
    id: serial('id').primaryKey(),
    caseId: integer('case_id')
      .notNull()
      .references(() => interviewCases.id, { onDelete: 'cascade' }),
    tag: varchar('tag', { length: 50 }).notNull(),

    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueCaseTag: unique().on(table.caseId, table.tag),
  }),
);

export type InterviewCase = typeof interviewCases.$inferSelect;
export type NewInterviewCase = typeof interviewCases.$inferInsert;
export type InterviewCaseExpectation =
  typeof interviewCaseExpectations.$inferSelect;
export type NewInterviewCaseExpectation =
  typeof interviewCaseExpectations.$inferInsert;
export type InterviewCaseTag = typeof interviewCaseTags.$inferSelect;
export type NewInterviewCaseTag = typeof interviewCaseTags.$inferInsert;
