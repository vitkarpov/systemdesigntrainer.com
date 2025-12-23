import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { interviewCases } from './interview-cases.schema';
import {
  interviewSessions,
  transcriptMessages,
  interviewSignals,
  interviewRedFlags,
} from './interview-sessions.schema';
import {
  feedbackReports,
  feedbackItems,
  feedbackNextSteps,
} from './feedback.schema';
import { diagramSnapshots } from './diagrams.schema';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(interviewSessions),
}));

// Interview case relations
export const interviewCasesRelations = relations(
  interviewCases,
  ({ many }) => ({
    sessions: many(interviewSessions),
  }),
);

// Interview session relations
export const interviewSessionsRelations = relations(
  interviewSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [interviewSessions.userId],
      references: [users.id],
    }),
    interviewCase: one(interviewCases, {
      fields: [interviewSessions.caseId],
      references: [interviewCases.id],
    }),
    transcriptMessages: many(transcriptMessages),
    signals: many(interviewSignals),
    redFlags: many(interviewRedFlags),
    feedbackReport: one(feedbackReports),
    diagrams: many(diagramSnapshots),
  }),
);

// Transcript message relations
export const transcriptMessagesRelations = relations(
  transcriptMessages,
  ({ one }) => ({
    session: one(interviewSessions, {
      fields: [transcriptMessages.sessionId],
      references: [interviewSessions.id],
    }),
  }),
);

// Signal relations
export const interviewSignalsRelations = relations(
  interviewSignals,
  ({ one }) => ({
    session: one(interviewSessions, {
      fields: [interviewSignals.sessionId],
      references: [interviewSessions.id],
    }),
  }),
);

// Red flag relations
export const interviewRedFlagsRelations = relations(
  interviewRedFlags,
  ({ one }) => ({
    session: one(interviewSessions, {
      fields: [interviewRedFlags.sessionId],
      references: [interviewSessions.id],
    }),
  }),
);

// Feedback report relations
export const feedbackReportsRelations = relations(
  feedbackReports,
  ({ one, many }) => ({
    session: one(interviewSessions, {
      fields: [feedbackReports.sessionId],
      references: [interviewSessions.id],
    }),
    items: many(feedbackItems),
    nextSteps: many(feedbackNextSteps),
  }),
);

// Feedback item relations
export const feedbackItemsRelations = relations(feedbackItems, ({ one }) => ({
  report: one(feedbackReports, {
    fields: [feedbackItems.reportId],
    references: [feedbackReports.id],
  }),
}));

// Feedback next step relations
export const feedbackNextStepsRelations = relations(
  feedbackNextSteps,
  ({ one }) => ({
    report: one(feedbackReports, {
      fields: [feedbackNextSteps.reportId],
      references: [feedbackReports.id],
    }),
  }),
);

// Diagram relations
export const diagramSnapshotsRelations = relations(
  diagramSnapshots,
  ({ one }) => ({
    session: one(interviewSessions, {
      fields: [diagramSnapshots.sessionId],
      references: [interviewSessions.id],
    }),
  }),
);
