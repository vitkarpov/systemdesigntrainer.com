import { pgTable, serial, integer, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { interviewCases } from './interview-cases.schema';

export const interviewSessions = pgTable('interview_sessions', {
  id: serial('id').primaryKey(),

  // Foreign keys
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  caseId: integer('case_id')
    .notNull()
    .references(() => interviewCases.id),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('not_started'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),

  // Current state
  currentPhase: varchar('current_phase', { length: 20 }).notNull().default('problem'),
  phaseStartedAt: timestamp('phase_started_at').notNull().defaultNow(),

  // Metadata
  companyStyle: varchar('company_style', { length: 20 }).notNull().default('faang'),
  level: varchar('level', { length: 20 }).notNull().default('mid'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transcriptMessages = pgTable('transcript_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),

  // Message content
  role: varchar('role', { length: 20 }).notNull(),
  text: text('text').notNull(),

  // Context at time of message
  phase: varchar('phase', { length: 20 }).notNull(),
  secondsElapsed: integer('seconds_elapsed').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const interviewSignals = pgTable(
  'interview_signals',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),

    // Signal name
    signalName: varchar('signal_name', { length: 50 }).notNull(),

    // When was this signal detected?
    detectedAt: timestamp('detected_at').notNull().defaultNow(),
    secondsElapsed: integer('seconds_elapsed').notNull(),
    phase: varchar('phase', { length: 20 }).notNull(),

    // Which message triggered it?
    triggeredByMessageId: integer('triggered_by_message_id').references(() => transcriptMessages.id),
  },
  (table) => ({
    uniqueSessionSignal: unique().on(table.sessionId, table.signalName),
  }),
);

export const interviewRedFlags = pgTable(
  'interview_red_flags',
  {
    id: serial('id').primaryKey(),
    sessionId: integer('session_id')
      .notNull()
      .references(() => interviewSessions.id, { onDelete: 'cascade' }),

    // Red flag type
    flagName: varchar('flag_name', { length: 50 }).notNull(),

    // When was this detected?
    detectedAt: timestamp('detected_at').notNull().defaultNow(),
    secondsElapsed: integer('seconds_elapsed').notNull(),
    phase: varchar('phase', { length: 20 }).notNull(),

    // Context
    description: text('description'),
  },
  (table) => ({
    uniqueSessionFlag: unique().on(table.sessionId, table.flagName),
  }),
);

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type NewInterviewSession = typeof interviewSessions.$inferInsert;
export type TranscriptMessage = typeof transcriptMessages.$inferSelect;
export type NewTranscriptMessage = typeof transcriptMessages.$inferInsert;
export type InterviewSignal = typeof interviewSignals.$inferSelect;
export type NewInterviewSignal = typeof interviewSignals.$inferInsert;
export type InterviewRedFlag = typeof interviewRedFlags.$inferSelect;
export type NewInterviewRedFlag = typeof interviewRedFlags.$inferInsert;
