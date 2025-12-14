import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { interviewSessions } from './interview-sessions.schema';

export const diagramSnapshots = pgTable('diagram_snapshots', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),

  // When was this snapshot taken?
  snapshotAt: timestamp('snapshot_at').notNull().defaultNow(),
  secondsElapsed: integer('seconds_elapsed').notNull(),
  phase: varchar('phase', { length: 20 }).notNull(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const diagramElements = pgTable('diagram_elements', {
  id: serial('id').primaryKey(),
  snapshotId: integer('snapshot_id')
    .notNull()
    .references(() => diagramSnapshots.id, { onDelete: 'cascade' }),

  // Element type
  elementType: varchar('element_type', { length: 20 }).notNull(),

  // Position (for box and text)
  x: integer('x'),
  y: integer('y'),
  width: integer('width'),
  height: integer('height'),

  // Text content
  label: text('label'),

  // Arrow connections (for arrows)
  fromElementId: integer('from_element_id'),
  toElementId: integer('to_element_id'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DiagramSnapshot = typeof diagramSnapshots.$inferSelect;
export type NewDiagramSnapshot = typeof diagramSnapshots.$inferInsert;
export type DiagramElement = typeof diagramElements.$inferSelect;
export type NewDiagramElement = typeof diagramElements.$inferInsert;
