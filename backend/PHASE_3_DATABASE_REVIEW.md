# Phase 3: Database Design & Optimization Review

**Review Date:** 2025-12-23
**Reviewer:** Senior Backend Architect
**Overall Grade:** B (Good schema design with optimization opportunities)

---

## Executive Summary

Your database schema is **well-designed** with proper normalization, clear relationships, and cascade deletes. However, there are several **performance optimizations** missing, including critical indexes, query optimization opportunities, and connection pooling configuration. The schema is ready for MVP but will need enhancements before scaling to thousands of users.

---

## Table of Contents

1. [Schema Design Analysis](#1-schema-design-analysis)
2. [Index Strategy](#2-index-strategy)
3. [Data Integrity & Constraints](#3-data-integrity--constraints)
4. [Query Performance](#4-query-performance)
5. [Migration Strategy](#5-migration-strategy)
6. [Connection Pooling](#6-connection-pooling)
7. [Data Modeling Improvements](#7-data-modeling-improvements)
8. [Summary of Findings](#8-summary-of-findings)
9. [Quick Wins](#9-quick-wins)
10. [Database Recommendations](#10-database-recommendations)

---

## 1. Schema Design Analysis

### Database Overview

**Total Tables:** 12
- **users** (1)
- **interview_sessions, transcript_messages, interview_signals, interview_red_flags** (4)
- **interview_cases, interview_case_expectations, interview_case_tags** (3)
- **diagram_snapshots, diagram_elements** (2)
- **feedback_reports, feedback_items, feedback_next_steps** (3)

### ✅ STRENGTHS

**1.1 Good Normalization**
- Third normal form (3NF) achieved
- No obvious data duplication
- Clear entity boundaries

**1.2 Proper Foreign Key Relationships**
```typescript
// users.schema.ts
userId: integer('user_id')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' })
```
- Cascade deletes properly configured
- Referential integrity enforced

**1.3 Logical Data Grouping**
- Sessions aggregate related data (transcripts, signals, red flags)
- Feedback broken into normalized tables (reports, items, next steps)
- Cases separate from sessions (reusable templates)

**1.4 Type Safety with Drizzle ORM**
```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```
- Auto-generated TypeScript types
- Compile-time type checking

---

### ⚠️ ISSUES FOUND

#### Issue #D1: Missing Indexes on Foreign Keys
**Severity:** CRITICAL
**File:** Multiple schema files

**Problem:**
```typescript
// interview-sessions.schema.ts:46-62
export const transcriptMessages = pgTable('transcript_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  // ⚠️ NO INDEX on sessionId - will cause full table scans
  role: varchar('role', { length: 20 }).notNull(),
  text: text('text').notNull(),
  phase: varchar('phase', { length: 20 }).notNull(),
  // ...
});
```

**Missing indexes on:**
- `transcript_messages.session_id` (critical - used in every session query)
- `interview_signals.session_id` (used for signal retrieval)
- `interview_red_flags.session_id` (used for red flag retrieval)
- `diagram_snapshots.session_id` (used for diagram retrieval)
- `diagram_elements.snapshot_id` (used for element retrieval)
- `feedback_items.report_id` (used for feedback retrieval)
- `feedback_next_steps.report_id` (used for feedback retrieval)
- `interview_case_expectations.case_id` (used for case expectations)
- `interview_case_tags.case_id` (used for case tags)

**Performance Impact:**
- Every session transcript query scans entire `transcript_messages` table
- Gets exponentially worse as data grows
- 1,000 sessions with 50 messages each = 50,000 rows scanned per query
- Can cause seconds of delay for simple queries

**PostgreSQL Query Plan Example:**
```sql
EXPLAIN ANALYZE
SELECT * FROM transcript_messages WHERE session_id = 123;

-- Without index:
Seq Scan on transcript_messages  (cost=0.00..1250.00 rows=50 width=200)
  Filter: (session_id = 123)
  Rows Removed by Filter: 49950
Planning Time: 0.123 ms
Execution Time: 52.456 ms  -- SLOW!

-- With index:
Index Scan using idx_transcript_messages_session_id on transcript_messages
  (cost=0.29..8.31 rows=50 width=200)
  Index Cond: (session_id = 123)
Planning Time: 0.098 ms
Execution Time: 0.234 ms  -- FAST!
```

**Recommendation:**
Add indexes to all foreign key columns:

```typescript
// interview-sessions.schema.ts
export const transcriptMessages = pgTable(
  'transcript_messages',
  {
    // ... columns
  },
  (table) => ({
    sessionIdIdx: index('idx_transcript_messages_session_id').on(table.sessionId),
    // Optional: composite index for common query patterns
    sessionPhaseIdx: index('idx_transcript_messages_session_phase').on(
      table.sessionId,
      table.phase,
    ),
  }),
);

export const interviewSignals = pgTable(
  'interview_signals',
  {
    // ... columns
  },
  (table) => ({
    uniqueSessionSignal: unique().on(table.sessionId, table.signalName),
    sessionIdIdx: index('idx_interview_signals_session_id').on(table.sessionId),
  }),
);

export const interviewRedFlags = pgTable(
  'interview_red_flags',
  {
    // ... columns
  },
  (table) => ({
    uniqueSessionFlag: unique().on(table.sessionId, table.flagName),
    sessionIdIdx: index('idx_interview_red_flags_session_id').on(table.sessionId),
  }),
);

// diagrams.schema.ts
export const diagramSnapshots = pgTable(
  'diagram_snapshots',
  {
    // ... columns
  },
  (table) => ({
    sessionIdIdx: index('idx_diagram_snapshots_session_id').on(table.sessionId),
  }),
);

export const diagramElements = pgTable(
  'diagram_elements',
  {
    // ... columns
  },
  (table) => ({
    snapshotIdIdx: index('idx_diagram_elements_snapshot_id').on(table.snapshotId),
  }),
);

// feedback.schema.ts
export const feedbackItems = pgTable(
  'feedback_items',
  {
    // ... columns
  },
  (table) => ({
    reportIdIdx: index('idx_feedback_items_report_id').on(table.reportId),
  }),
);

export const feedbackNextSteps = pgTable(
  'feedback_next_steps',
  {
    // ... columns
  },
  (table) => ({
    reportIdIdx: index('idx_feedback_next_steps_report_id').on(table.reportId),
  }),
);

// interview-cases.schema.ts
export const interviewCaseExpectations = pgTable(
  'interview_case_expectations',
  {
    // ... columns
  },
  (table) => ({
    caseIdIdx: index('idx_interview_case_expectations_case_id').on(table.caseId),
  }),
);

export const interviewCaseTags = pgTable(
  'interview_case_tags',
  {
    // ... columns
  },
  (table) => ({
    uniqueCaseTag: unique().on(table.caseId, table.tag),
    caseIdIdx: index('idx_interview_case_tags_case_id').on(table.caseId),
  }),
);
```

**Action Items:**
- [ ] Add indexes to all foreign key columns
- [ ] Generate new migration: `npm run db:generate`
- [ ] Test query performance before and after indexes
- [ ] Monitor index usage with `pg_stat_user_indexes`
- [ ] Document indexing strategy

---

#### Issue #D2: Missing Index on interview_sessions.userId
**Severity:** CRITICAL
**File:** `src/db/schema/interview-sessions.schema.ts:13-44`

**Problem:**
```typescript
export const interviewSessions = pgTable('interview_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // ⚠️ NO INDEX - Dashboard queries will be extremely slow
  caseId: integer('case_id')
    .notNull()
    .references(() => interviewCases.id),
  // ...
});
```

**Impact:**
```typescript
// sessions.controller.ts:103 - Dashboard query
const sessions = await this.sessionService.getUserSessionsWithCases(user.id);

// This query becomes O(n) without index:
SELECT * FROM interview_sessions WHERE user_id = 123;
```

- Dashboard loads all user sessions
- Without index, full table scan on every dashboard load
- Critical user-facing query

**Recommendation:**
```typescript
export const interviewSessions = pgTable(
  'interview_sessions',
  {
    // ... columns
  },
  (table) => ({
    userIdIdx: index('idx_interview_sessions_user_id').on(table.userId),
    caseIdIdx: index('idx_interview_sessions_case_id').on(table.caseId),
    statusIdx: index('idx_interview_sessions_status').on(table.status),
    // Composite index for common query patterns
    userStatusIdx: index('idx_interview_sessions_user_status').on(
      table.userId,
      table.status,
    ),
  }),
);
```

**Action Items:**
- [ ] Add index on `interview_sessions.user_id`
- [ ] Add index on `interview_sessions.status` (for filtering completed sessions)
- [ ] Consider composite index `(user_id, status)` for dashboard queries
- [ ] Add index on `interview_sessions.case_id`

---

#### Issue #D3: Missing Unique Constraint on feedback_reports.sessionId
**Severity:** HIGH
**File:** `src/db/schema/feedback.schema.ts:11-30`

**Problem:**
```typescript
export const feedbackReports = pgTable('feedback_reports', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .unique() // ✅ Good! Already has unique constraint
    .references(() => interviewSessions.id, { onDelete: 'cascade' }),
  // ...
});
```

Actually, this one is **CORRECT** - `sessionId` already has `.unique()` constraint. Good job!

However, there's **no index** on this unique constraint for reverse lookups:

```typescript
// feedback.service.ts:482-487
const [report] = await this.db
  .select()
  .from(feedbackReports)
  .where(eq(feedbackReports.sessionId, sessionId)) // Uses unique constraint as index
  .limit(1);
```

PostgreSQL automatically creates an index for unique constraints, so this is actually fine. No action needed here.

---

#### Issue #D4: No Index on Timestamp Columns
**Severity:** MEDIUM
**File:** Multiple schema files

**Problem:**
```typescript
// users.schema.ts
createdAt: timestamp('created_at').notNull().defaultNow(),
lastLoginAt: timestamp('last_login_at'),
```

No indexes on timestamp columns used for sorting/filtering:
- `users.created_at` (for sorting user list)
- `users.last_login_at` (for activity tracking)
- `interview_sessions.created_at` (for sorting sessions by date)
- `transcript_messages.created_at` (for chronological message retrieval)

**Use Cases:**
```sql
-- Get recently active users (admin feature)
SELECT * FROM users ORDER BY last_login_at DESC LIMIT 100;

-- Get user's recent sessions
SELECT * FROM interview_sessions
WHERE user_id = 123
ORDER BY created_at DESC LIMIT 10;
```

**Recommendation:**
```typescript
// users.schema.ts
export const users = pgTable(
  'users',
  {
    // ... columns
  },
  (table) => ({
    workosUserIdIdx: index('idx_users_workos_user_id').on(table.workosUserId),
    // ... existing indexes
    createdAtIdx: index('idx_users_created_at').on(table.createdAt),
    lastLoginAtIdx: index('idx_users_last_login_at').on(table.lastLoginAt),
  }),
);

// interview-sessions.schema.ts
export const interviewSessions = pgTable(
  'interview_sessions',
  {
    // ... columns
  },
  (table) => ({
    // ... other indexes
    createdAtIdx: index('idx_interview_sessions_created_at').on(table.createdAt),
    // Composite index for user's recent sessions
    userCreatedAtIdx: index('idx_interview_sessions_user_created_at').on(
      table.userId,
      table.createdAt,
    ),
  }),
);
```

**Action Items:**
- [ ] Add indexes on frequently sorted timestamp columns
- [ ] Prioritize `interview_sessions.created_at` (user-facing)
- [ ] Consider composite indexes for common filter+sort patterns
- [ ] Monitor slow queries with `pg_stat_statements`

---

#### Issue #D5: TEXT Column Without Length Limits
**Severity:** MEDIUM
**File:** Multiple schema files

**Problem:**
```typescript
// interview-sessions.schema.ts:54
text: text('text').notNull(), // ⚠️ Unlimited length

// diagrams.schema.ts:41
label: text('label'), // ⚠️ Unlimited length

// feedback.schema.ts:27
overallSummary: text('overall_summary').notNull(), // ⚠️ Unlimited length
```

**Risks:**
- User can submit multi-MB text in conversation
- Diagram labels can be arbitrarily large
- Database bloat
- Memory issues when loading messages
- Backup/restore performance degradation

**Recommendation:**
Add check constraints or use varchar with reasonable limits:

```typescript
// For user-generated content, enforce limits
export const transcriptMessages = pgTable(
  'transcript_messages',
  {
    // ... other columns
    text: text('text').notNull(), // Keep as text but add app-level validation
  },
);

// Add validation in DTO
class ConversationDto {
  @IsString()
  @MaxLength(10000, { message: 'Message cannot exceed 10,000 characters' })
  text: string;
}

// Or add database check constraint in migration:
ALTER TABLE transcript_messages
ADD CONSTRAINT check_text_length
CHECK (length(text) <= 10000);
```

**Action Items:**
- [ ] Add MaxLength validation to DTOs for all text inputs
- [ ] Set reasonable limits: messages (10k chars), labels (1k chars)
- [ ] Consider adding check constraints at database level
- [ ] Monitor largest text values in production
- [ ] Add alerting for abnormally large text submissions

---

## 2. Index Strategy

### Current Index Coverage

**Existing Indexes:**
```typescript
// users.schema.ts - ✅ Good coverage
workosUserIdIdx: index('idx_users_workos_user_id').on(table.workosUserId),
githubIdIdx: index('idx_users_github_id').on(table.githubId),
emailIdx: index('idx_users_email').on(table.email),
subscriptionStatusIdx: index('idx_users_subscription_status').on(table.subscriptionStatus),
```

**Missing Indexes:** (See Issue #D1, #D2, #D4)
- All foreign keys
- Timestamp columns used for sorting
- Status columns used for filtering

---

### ⚠️ ISSUES FOUND

#### Issue #D6: No Composite Indexes for Common Query Patterns
**Severity:** MEDIUM
**File:** Multiple schema files

**Problem:**
Many queries filter by multiple columns, but only single-column indexes exist:

```typescript
// Common query pattern in dashboard
SELECT * FROM interview_sessions
WHERE user_id = 123 AND status = 'completed'
ORDER BY created_at DESC;

// Needs composite index: (user_id, status, created_at)
```

**PostgreSQL Index Selection:**
- With only `user_id` index: Scans all user's sessions, then filters by status
- With composite index: Direct lookup of user's completed sessions, pre-sorted

**Recommendation:**
Add composite indexes for common query patterns:

```typescript
// interview-sessions.schema.ts
export const interviewSessions = pgTable(
  'interview_sessions',
  {
    // ... columns
  },
  (table) => ({
    // Single-column indexes
    userIdIdx: index('idx_interview_sessions_user_id').on(table.userId),
    statusIdx: index('idx_interview_sessions_status').on(table.status),
    createdAtIdx: index('idx_interview_sessions_created_at').on(table.createdAt),

    // Composite indexes for common queries
    userStatusCreatedIdx: index('idx_interview_sessions_user_status_created').on(
      table.userId,
      table.status,
      table.createdAt,
    ),

    // For filtering by phase
    sessionPhaseIdx: index('idx_interview_sessions_session_phase').on(
      table.id,
      table.currentPhase,
    ),
  }),
);

// transcript_messages.schema.ts
export const transcriptMessages = pgTable(
  'transcript_messages',
  {
    // ... columns
  },
  (table) => ({
    sessionIdIdx: index('idx_transcript_messages_session_id').on(table.sessionId),
    // For phase-specific transcript queries
    sessionPhaseCreatedIdx: index('idx_transcript_messages_session_phase_created').on(
      table.sessionId,
      table.phase,
      table.createdAt,
    ),
  }),
);
```

**Action Items:**
- [ ] Identify top 10 most frequent queries (use `pg_stat_statements`)
- [ ] Create composite indexes for multi-column WHERE clauses
- [ ] Include ORDER BY columns in composite indexes
- [ ] Monitor index usage and remove unused indexes
- [ ] Document composite index rationale

---

#### Issue #D7: No Partial Indexes for Filtered Queries
**Severity:** LOW
**File:** Multiple schema files

**Problem:**
Some queries always filter by specific values (e.g., only active cases, only completed sessions):

```sql
-- Always query active cases
SELECT * FROM interview_cases WHERE is_active = true;

-- Always query completed sessions
SELECT * FROM interview_sessions WHERE status = 'completed';
```

A **partial index** only indexes rows matching a condition, making it smaller and faster:

```sql
-- Partial index on active cases only
CREATE INDEX idx_interview_cases_active
ON interview_cases (id, title, difficulty)
WHERE is_active = true;

-- 50% smaller than full index if half are inactive
```

**Recommendation:**
```typescript
// interview-cases.schema.ts
import { sql } from 'drizzle-orm';

export const interviewCases = pgTable(
  'interview_cases',
  {
    // ... columns
  },
  (table) => ({
    slugIdx: index('idx_interview_cases_slug').on(table.slug),
    // Partial index for active cases (most common query)
    activeIdx: index('idx_interview_cases_active')
      .on(table.id, table.title, table.difficulty)
      .where(sql`is_active = true`),
  }),
);

// interview-sessions.schema.ts
export const interviewSessions = pgTable(
  'interview_sessions',
  {
    // ... columns
  },
  (table) => ({
    // ... other indexes
    // Partial index for completed sessions (analytics queries)
    completedIdx: index('idx_interview_sessions_completed')
      .on(table.userId, table.createdAt, table.completedAt)
      .where(sql`status = 'completed'`),
  }),
);
```

**Action Items:**
- [ ] Add partial index for active interview cases
- [ ] Add partial index for completed sessions
- [ ] Monitor partial index usage
- [ ] Consider partial indexes for other status fields

---

## 3. Data Integrity & Constraints

### ✅ STRENGTHS

**3.1 Foreign Key Constraints**
All relationships have proper foreign keys with cascade deletes:
```typescript
userId: integer('user_id')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' })
```

**3.2 Unique Constraints**
Proper uniqueness enforcement:
```typescript
// Prevent duplicate signals per session
uniqueSessionSignal: unique().on(table.sessionId, table.signalName)

// Prevent duplicate tags per case
uniqueCaseTag: unique().on(table.caseId, table.tag)
```

**3.3 Not Null Constraints**
Critical fields properly marked as required:
```typescript
email: varchar('email', { length: 255 }).notNull().unique()
```

---

### ⚠️ ISSUES FOUND

#### Issue #D8: No Check Constraints on Score Ranges
**Severity:** MEDIUM
**File:** `src/db/schema/feedback.schema.ts:11-30`

**Problem:**
```typescript
export const feedbackReports = pgTable('feedback_reports', {
  // ...
  overallScore: integer('overall_score').notNull(),
  requirementsScore: integer('requirements_score').notNull(),
  designScore: integer('design_score').notNull(),
  // ⚠️ No constraints - scores can be negative or > 100
});
```

**Risk:**
```sql
-- Invalid data can be inserted
INSERT INTO feedback_reports (session_id, overall_score, ...)
VALUES (1, -50, ...);  -- Negative score!

INSERT INTO feedback_reports (session_id, overall_score, ...)
VALUES (2, 99999, ...);  -- Invalid score!
```

**Recommendation:**
Add check constraints for valid score ranges:

```sql
-- In migration file
ALTER TABLE feedback_reports
ADD CONSTRAINT check_overall_score_range
CHECK (overall_score >= 0 AND overall_score <= 100);

ALTER TABLE feedback_reports
ADD CONSTRAINT check_requirements_score_range
CHECK (requirements_score >= 0 AND requirements_score <= 100);

ALTER TABLE feedback_reports
ADD CONSTRAINT check_design_score_range
CHECK (design_score >= 0 AND design_score <= 100);

ALTER TABLE feedback_reports
ADD CONSTRAINT check_communication_score_range
CHECK (communication_score >= 0 AND communication_score <= 100);

ALTER TABLE feedback_reports
ADD CONSTRAINT check_time_management_score_range
CHECK (time_management_score >= 0 AND time_management_score <= 100);

ALTER TABLE feedback_reports
ADD CONSTRAINT check_depth_score_range
CHECK (depth_score >= 0 AND depth_score <= 100);
```

**Action Items:**
- [ ] Add check constraints for all score fields (0-100 range)
- [ ] Add check constraint for `interviews_remaining >= 0`
- [ ] Add check constraint for valid enum values (status, phase, etc.)
- [ ] Test constraint violations return proper errors
- [ ] Document valid ranges in schema comments

---

#### Issue #D9: No Check Constraint on Interview Status Transitions
**Severity:** LOW
**File:** `src/db/schema/interview-sessions.schema.ts:25`

**Problem:**
```typescript
status: varchar('status', { length: 20 }).notNull().default('not_started'),
```

No database-level enforcement of valid status values. Any string can be inserted:

```sql
-- Invalid status accepted
UPDATE interview_sessions SET status = 'foo_bar' WHERE id = 1;
```

**Recommendation:**
Use PostgreSQL enum or check constraint:

```sql
-- Option 1: PostgreSQL ENUM type (recommended)
CREATE TYPE session_status AS ENUM ('not_started', 'in_progress', 'completed');

ALTER TABLE interview_sessions
ALTER COLUMN status TYPE session_status
USING status::session_status;

-- Option 2: Check constraint
ALTER TABLE interview_sessions
ADD CONSTRAINT check_status_valid
CHECK (status IN ('not_started', 'in_progress', 'completed'));
```

**In Drizzle:**
```typescript
import { pgEnum } from 'drizzle-orm/pg-core';

// Define enum
export const sessionStatusEnum = pgEnum('session_status', [
  'not_started',
  'in_progress',
  'completed',
]);

export const interviewSessions = pgTable('interview_sessions', {
  // ...
  status: sessionStatusEnum('status').notNull().default('not_started'),
});
```

**Action Items:**
- [ ] Create PostgreSQL enums for: status, phase, difficulty, role
- [ ] Update schema to use enums instead of varchar
- [ ] Generate migration for enum types
- [ ] Update TypeScript types to match enums
- [ ] Test enum constraint violations

---

#### Issue #D10: Timestamp Columns Allow NULL Inappropriately
**Severity:** LOW
**File:** Multiple schema files

**Problem:**
```typescript
// users.schema.ts:41
lastLoginAt: timestamp('last_login_at'), // NULL allowed

// interview-sessions.schema.ts:26-27
startedAt: timestamp('started_at'), // NULL allowed
completedAt: timestamp('completed_at'), // NULL allowed
```

While these are legitimately nullable, there's no constraint ensuring logical consistency:
- `startedAt` should be NULL if `status = 'not_started'`
- `completedAt` should be NULL if `status != 'completed'`
- `startedAt` should be before `completedAt`

**Recommendation:**
Add check constraints for timestamp logic:

```sql
-- Ensure timestamps are logically consistent
ALTER TABLE interview_sessions
ADD CONSTRAINT check_started_before_completed
CHECK (started_at IS NULL OR completed_at IS NULL OR started_at < completed_at);

-- Ensure session can't be completed without being started
ALTER TABLE interview_sessions
ADD CONSTRAINT check_completed_requires_started
CHECK (completed_at IS NULL OR started_at IS NOT NULL);

-- Ensure status matches timestamp state
ALTER TABLE interview_sessions
ADD CONSTRAINT check_status_timestamp_consistency
CHECK (
  (status = 'not_started' AND started_at IS NULL) OR
  (status = 'in_progress' AND started_at IS NOT NULL AND completed_at IS NULL) OR
  (status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL)
);
```

**Action Items:**
- [ ] Add timestamp ordering constraints
- [ ] Add status-timestamp consistency constraints
- [ ] Test edge cases (clock skew, manual updates)
- [ ] Document constraints in schema comments

---

## 4. Query Performance

### ⚠️ ISSUES FOUND

#### Issue #D11: N+1 Query in getUserSessionsWithCases
**Severity:** HIGH
**File:** `src/interview/services/interview-session.service.ts:99-132`

**Problem:**
```typescript
async getUserSessionsWithCases(userId: number) {
  // Query 1: Get all sessions
  const sessions = await this.getUserSessions(userId);

  // Query 2: Get all case IDs
  const caseIds = [...new Set(sessions.map((s) => s.caseId))];

  // Query 3: Get all cases (better than N queries, but still suboptimal)
  const cases = await this.db.query.interviewCases.findMany({
    where: (interviewCases, { inArray }) =>
      inArray(interviewCases.id, caseIds),
  });

  // Manual join in application code
  const casesMap = new Map(cases.map((c) => [c.id, c]));
  return sessions.map((session) => {
    const interviewCase = casesMap.get(session.caseId);
    // ...
  });
}
```

**Better approach:** Use Drizzle's relational query with JOIN:

```typescript
async getUserSessionsWithCases(userId: number) {
  // Single query with JOIN
  return this.db.query.interviewSessions.findMany({
    where: eq(interviewSessions.userId, userId),
    with: {
      interviewCase: true, // Drizzle performs JOIN automatically
    },
    orderBy: [desc(interviewSessions.createdAt)],
  });
}
```

**But wait!** This requires defining relations in schema:

```typescript
// interview-sessions.schema.ts
import { relations } from 'drizzle-orm';

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
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
  diagramSnapshots: many(diagramSnapshots),
  feedbackReport: one(feedbackReports),
}));
```

**Action Items:**
- [ ] Define relations in all schema files
- [ ] Refactor `getUserSessionsWithCases` to use Drizzle relations
- [ ] Use `with` clause for eager loading instead of separate queries
- [ ] Benchmark query performance improvement
- [ ] Update DRIZZLE_USAGE.md with relation examples

---

#### Issue #D12: Dashboard Query Fetches Too Much Data
**Severity:** MEDIUM
**File:** `src/interview/controllers/sessions.controller.ts:94-148`

**Problem:**
```typescript
async getDashboard(@CurrentUser() user: User) {
  // Fetches ALL session data including full transcripts via relations
  const sessions = await this.sessionService.getUserSessionsWithCases(user.id);

  // Then fetches feedback scores separately (N+1 problem)
  const sessionIds = sessions.map((s) => s.id);
  const feedbackScoresMap = await this.feedbackService.getFeedbackScoresForSessions(sessionIds);
  // ...
}
```

**Problems:**
- Fetches all session fields when dashboard only needs: id, caseId, status, dates, scores
- Makes 2 queries when 1 would suffice
- No pagination (will load ALL user sessions)

**Recommendation:**
```typescript
async getDashboard(@CurrentUser() user: User) {
  // Single optimized query with only needed columns
  const sessionsWithFeedback = await this.db
    .select({
      // Session fields
      id: interviewSessions.id,
      caseId: interviewSessions.caseId,
      status: interviewSessions.status,
      currentPhase: interviewSessions.currentPhase,
      startedAt: interviewSessions.startedAt,
      completedAt: interviewSessions.completedAt,
      createdAt: interviewSessions.createdAt,

      // Case fields
      caseTitle: interviewCases.title,
      caseDescription: interviewCases.description,
      caseDifficulty: interviewCases.difficulty,

      // Feedback scores (LEFT JOIN to include sessions without feedback)
      overallScore: feedbackReports.overallScore,
      requirementsScore: feedbackReports.requirementsScore,
      designScore: feedbackReports.designScore,
      communicationScore: feedbackReports.communicationScore,
      timeManagementScore: feedbackReports.timeManagementScore,
      depthScore: feedbackReports.depthScore,
    })
    .from(interviewSessions)
    .innerJoin(
      interviewCases,
      eq(interviewSessions.caseId, interviewCases.id),
    )
    .leftJoin(
      feedbackReports,
      eq(interviewSessions.id, feedbackReports.sessionId),
    )
    .where(eq(interviewSessions.userId, user.id))
    .orderBy(desc(interviewSessions.createdAt))
    .limit(50); // Add pagination!

  // Calculate stats from single result set
  const completedSessions = sessionsWithFeedback.filter(
    (s) => s.status === 'completed',
  );

  const sessionsWithScores = sessionsWithFeedback.filter(
    (s) => s.overallScore !== null,
  );

  const averageScore = sessionsWithScores.length > 0
    ? Math.round(
        sessionsWithScores.reduce((sum, s) => sum + s.overallScore, 0) /
        sessionsWithScores.length,
      )
    : null;

  return {
    success: true,
    data: {
      sessions: sessionsWithFeedback,
      stats: {
        totalSessions: sessionsWithFeedback.length,
        completedSessions: completedSessions.length,
        averageScore,
      },
    },
  };
}
```

**Action Items:**
- [ ] Rewrite dashboard query to use single JOIN
- [ ] Select only needed columns (not `SELECT *`)
- [ ] Add pagination (limit 50, offset for page 2+)
- [ ] Add indexes to support JOIN (already recommended in Issue #D2)
- [ ] Benchmark query performance (should be 5-10x faster)

---

#### Issue #D13: Transcript Messages Not Ordered
**Severity:** LOW
**File:** `src/interview/services/transcript.service.ts`

**Problem:**
```typescript
async getSessionTranscript(sessionId: number): Promise<TranscriptMessage[]> {
  const messages = await this.db
    .select()
    .from(transcriptMessages)
    .where(eq(transcriptMessages.sessionId, sessionId))
    .orderBy(transcriptMessages.createdAt); // ⚠️ Uses createdAt

  return messages;
}
```

**Issue:**
- Orders by `createdAt` which relies on server timestamps
- If server clock is wrong or messages arrive out of order, transcript is wrong
- Better to order by `id` (serial primary key, always incrementing)
- Or add explicit `sequence_number` column

**Recommendation:**
```typescript
async getSessionTranscript(sessionId: number): Promise<TranscriptMessage[]> {
  const messages = await this.db
    .select()
    .from(transcriptMessages)
    .where(eq(transcriptMessages.sessionId, sessionId))
    .orderBy(transcriptMessages.id); // Use ID for guaranteed order

  return messages;
}
```

**Or add sequence number:**
```typescript
export const transcriptMessages = pgTable('transcript_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull().references(...),
  sequenceNumber: integer('sequence_number').notNull(), // 1, 2, 3, ...
  // ... rest of columns
});

// When inserting:
const lastMessage = await this.getLastMessage(sessionId);
const nextSequence = (lastMessage?.sequenceNumber || 0) + 1;

await this.db.insert(transcriptMessages).values({
  sessionId,
  sequenceNumber: nextSequence,
  text,
  role,
  // ...
});
```

**Action Items:**
- [ ] Change transcript ordering to use `id` instead of `createdAt`
- [ ] Or add `sequence_number` column for explicit ordering
- [ ] Add unique constraint on `(session_id, sequence_number)`
- [ ] Test transcript order with concurrent message inserts

---

## 5. Migration Strategy

### Current Setup

```typescript
// drizzle.config.ts (assumed)
export default {
  schema: './src/db/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
};
```

**Migration Scripts:**
```json
{
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

### ⚠️ ISSUES FOUND

#### Issue #D14: No Migration Rollback Strategy
**Severity:** MEDIUM
**File:** Migration files

**Problem:**
```sql
-- migrations/0000_foamy_victor_mancha.sql
-- Only has UP migration, no DOWN migration
CREATE TABLE "users" (...);
CREATE TABLE "interview_sessions" (...);
-- ... etc
```

**Issue:**
- No way to rollback migrations
- If migration fails in production, manual SQL required
- Drizzle Kit doesn't generate DOWN migrations automatically

**Recommendation:**

**Option 1:** Manual rollback scripts
```bash
# migrations/
0000_foamy_victor_mancha.sql        # UP
0000_foamy_victor_mancha_down.sql   # DOWN (manual)
```

**Option 2:** Use a migration tool with rollback support
```bash
npm install db-migrate db-migrate-pg
```

**Option 3:** Document rollback procedures
```markdown
# ROLLBACK_PROCEDURES.md

## Rolling back migration 0000

```sql
DROP TABLE IF EXISTS diagram_elements CASCADE;
DROP TABLE IF EXISTS diagram_snapshots CASCADE;
DROP TABLE IF EXISTS feedback_next_steps CASCADE;
DROP TABLE IF EXISTS feedback_items CASCADE;
DROP TABLE IF EXISTS feedback_reports CASCADE;
-- ... etc in reverse order
```
```

**Action Items:**
- [ ] Create rollback scripts for each migration
- [ ] Document rollback procedures
- [ ] Test rollback scripts in staging environment
- [ ] Consider using migration tool with built-in rollback support
- [ ] Add pre-deployment backup procedures

---

#### Issue #D15: No Migration Ordering Strategy
**Severity:** LOW
**File:** Migration filenames

**Problem:**
```
migrations/
  0000_foamy_victor_mancha.sql  # Random adjective+noun naming
```

**Issue:**
- Drizzle Kit generates random names
- Difficult to know migration order or content
- No timestamp in filename

**Recommendation:**
Use timestamp-based migration names:

```bash
# Better naming convention
migrations/
  20231214_120000_initial_schema.sql
  20231215_093000_add_user_indexes.sql
  20231216_140000_add_feedback_constraints.sql
```

**How to implement:**
Drizzle Kit doesn't support custom naming, but you can rename after generation:

```bash
# Generate migration
npm run db:generate

# Rename with timestamp
mv migrations/0001_random_name.sql \
   migrations/$(date +%Y%m%d_%H%M%S)_add_user_indexes.sql
```

**Or create wrapper script:**
```bash
#!/bin/bash
# scripts/generate-migration.sh

description=$1
timestamp=$(date +%Y%m%d_%H%M%S)

npm run db:generate

# Find latest migration file
latest=$(ls -t migrations/*.sql | head -1)

# Rename with timestamp and description
new_name="migrations/${timestamp}_${description}.sql"
mv "$latest" "$new_name"

echo "Migration created: $new_name"
```

**Action Items:**
- [ ] Create migration naming convention documentation
- [ ] Create script to rename migrations with timestamps
- [ ] Document migration in CHANGELOG when created
- [ ] Add migration descriptions to README

---

## 6. Connection Pooling

### Current Configuration

```typescript
// db.ts:6-13
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sd_sim_dev',
  ssl: false, // ⚠️ No SSL in production
});
```

### ⚠️ ISSUES FOUND

#### Issue #D16: No Connection Pool Configuration
**Severity:** HIGH
**File:** `src/db/db.ts:6-13`

**Problem:**
Using default `pg.Pool` settings:
- **Max connections:** 10 (default)
- **Idle timeout:** 30 seconds (default)
- **Connection timeout:** 0 (no timeout)
- **Statement timeout:** none

**Issues:**
- 10 max connections too low for production (will cause connection exhaustion)
- No idle connection cleanup
- Connections can hang forever
- No graceful connection management

**Recommendation:**
```typescript
// db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const poolConfig = {
  // Connection settings
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'sd_sim_dev',

  // SSL settings (required for production)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }
    : false,

  // Pool settings
  max: parseInt(process.env.DB_POOL_SIZE || '20'), // Max connections
  min: parseInt(process.env.DB_POOL_MIN || '5'),   // Min idle connections

  // Timeouts (milliseconds)
  connectionTimeoutMillis: 30000, // 30 seconds to acquire connection
  idleTimeoutMillis: 30000,       // 30 seconds before idle connection closed

  // Statement timeout (PostgreSQL)
  statement_timeout: 60000,        // 60 seconds max query time

  // Keep-alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

export const pool = new Pool(poolConfig);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing database pool');
  await pool.end();
  console.log('Database pool closed');
});

export const db = drizzle(pool, { schema });
```

**Add to .env.example:**
```bash
# Database Pool Configuration
DB_POOL_SIZE=20        # Max connections (adjust based on DB server limits)
DB_POOL_MIN=5          # Min idle connections
DB_STATEMENT_TIMEOUT=60000  # Max query time (ms)
```

**Action Items:**
- [ ] Configure connection pool size (20 for production)
- [ ] Add connection timeout (30s)
- [ ] Add statement timeout (60s for long queries)
- [ ] Enable SSL for production
- [ ] Add graceful shutdown handler
- [ ] Monitor connection pool usage (metrics)
- [ ] Document pool configuration

---

#### Issue #D17: No SSL/TLS for Database Connections
**Severity:** CRITICAL (Production)
**File:** `src/db/db.ts:12`

**Problem:**
```typescript
ssl: false, // ⚠️ Unencrypted database connections
```

**Security Risk:**
- Database credentials transmitted in plaintext
- Query data transmitted in plaintext (includes PII)
- Man-in-the-middle attacks possible
- Compliance violation (GDPR, SOC 2, HIPAA)

**Recommendation:**
```typescript
const pool = new Pool({
  // ... other config

  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA, // CA certificate
        cert: process.env.DB_SSL_CERT, // Client certificate (if required)
        key: process.env.DB_SSL_KEY, // Client key (if required)
      }
    : false, // Allow unencrypted for local development
});
```

**For AWS RDS:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  // ... other config

  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: true,
        ca: fs.readFileSync(
          path.join(__dirname, '../certs/rds-ca-2019-root.pem'),
        ).toString(),
      }
    : false,
});
```

**Action Items:**
- [ ] Enable SSL for production database connections
- [ ] Download and store RDS/database CA certificate
- [ ] Add SSL certificate paths to environment config
- [ ] Test SSL connection in staging
- [ ] Document SSL setup in deployment guide
- [ ] Fail startup if SSL required but not configured

---

#### Issue #D18: No Connection Pool Monitoring
**Severity:** MEDIUM
**File:** `src/db/db.ts`

**Problem:**
No visibility into connection pool health:
- Can't see active connections
- Can't detect connection leaks
- Can't alert on connection exhaustion
- No metrics for query performance

**Recommendation:**
Add pool event listeners and metrics:

```typescript
// db.ts
import { pool } from './db';

// Log pool events
pool.on('connect', (client) => {
  console.log('New database client connected');

  // Track client creation
  if (process.env.NODE_ENV === 'production') {
    // Send metric to monitoring service
    metrics.increment('db.pool.connections.created');
  }
});

pool.on('acquire', (client) => {
  // Connection acquired from pool
  metrics.increment('db.pool.connections.acquired');
});

pool.on('remove', (client) => {
  console.log('Database client removed from pool');
  metrics.increment('db.pool.connections.removed');
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
  metrics.increment('db.pool.errors');

  // Alert on errors
  if (process.env.NODE_ENV === 'production') {
    alertService.send({
      severity: 'error',
      message: 'Database pool error',
      error: err.message,
    });
  }
});

// Expose pool metrics endpoint for monitoring
export function getPoolMetrics() {
  return {
    totalCount: pool.totalCount,     // Total clients in pool
    idleCount: pool.idleCount,       // Idle clients
    waitingCount: pool.waitingCount, // Waiting requests
  };
}

// Health check endpoint
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    return result.rows[0]['?column?'] === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

**Add health check endpoint:**
```typescript
// app.controller.ts
@Get('health/db')
async checkDatabase() {
  const isHealthy = await checkDatabaseHealth();
  const metrics = getPoolMetrics();

  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    pool: metrics,
    timestamp: new Date().toISOString(),
  };
}
```

**Action Items:**
- [ ] Add pool event listeners
- [ ] Create health check endpoint
- [ ] Expose pool metrics for monitoring
- [ ] Set up alerts for connection exhaustion
- [ ] Monitor query performance (slow query log)
- [ ] Create dashboard for database metrics

---

## 7. Data Modeling Improvements

### ⚠️ ISSUES FOUND

#### Issue #D19: Users Table Missing Role Column
**Severity:** MEDIUM
**File:** `src/db/schema/users.schema.ts`

**Problem:**
No role/permission system at database level:
```typescript
export const users = pgTable('users', {
  // ... columns
  subscriptionStatus: varchar('subscription_status', { length: 20 })
    .notNull()
    .default('free'),
  // ⚠️ No role column (admin, user, moderator)
});
```

**Recommendation:**
```typescript
export const roleEnum = pgEnum('user_role', ['user', 'admin', 'moderator']);

export const users = pgTable(
  'users',
  {
    // ... existing columns
    role: roleEnum('role').notNull().default('user'),
    permissions: jsonb('permissions').$type<string[]>(), // ['create:case', 'view:analytics']
  },
  // ... indexes
);
```

**Action Items:**
- [ ] Add `role` enum column to users table
- [ ] Add `permissions` JSONB column for fine-grained permissions
- [ ] Create migration to add role column
- [ ] Update auth flow to include role in JWT
- [ ] Document role hierarchy

---

#### Issue #D20: No Soft Delete Support
**Severity:** LOW
**File:** All schema files

**Problem:**
All deletes are hard deletes (cascade):
```typescript
userId: integer('user_id')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' })
```

**Issues:**
- Can't recover accidentally deleted data
- Can't audit deleted records
- Breaks referential integrity if need to restore
- No historical analysis of deleted items

**Recommendation:**
Add soft delete support:

```typescript
// Add to all tables that need soft delete
export const users = pgTable('users', {
  // ... existing columns
  deletedAt: timestamp('deleted_at'), // NULL = not deleted
});

// Update queries to filter deleted records
async findById(id: number): Promise<User | undefined> {
  const result = await this.db
    .select()
    .from(users)
    .where(and(
      eq(users.id, id),
      isNull(users.deletedAt), // Only non-deleted users
    ))
    .limit(1);
  return result[0];
}

// Soft delete function
async softDeleteUser(id: number): Promise<void> {
  await this.db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, id));
}

// Hard delete function (admin only)
async hardDeleteUser(id: number): Promise<void> {
  await this.db
    .delete(users)
    .where(eq(users.id, id));
}
```

**Action Items:**
- [ ] Decide which tables need soft delete (users, sessions, cases)
- [ ] Add `deleted_at` column to selected tables
- [ ] Update all queries to filter `WHERE deleted_at IS NULL`
- [ ] Create soft delete methods
- [ ] Add restore functionality
- [ ] Document soft delete policy

---

#### Issue #D21: No Audit Trail
**Severity:** MEDIUM
**File:** N/A - Missing feature

**Problem:**
No audit logging for sensitive operations:
- User account changes
- Session deletions
- Feedback modifications
- Admin actions

**Recommendation:**
Create audit log table:

```typescript
export const auditLogActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'permission_change',
]);

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),

  // Who did it
  userId: integer('user_id').references(() => users.id),
  userEmail: varchar('user_email', { length: 255 }), // Denormalized for deleted users

  // What was done
  action: auditLogActionEnum('action').notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'user', 'session', etc.
  entityId: integer('entity_id'), // ID of affected entity

  // Before/after state
  changesBefore: jsonb('changes_before'),
  changesAfter: jsonb('changes_after'),

  // Metadata
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6-compatible
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

// Usage
async auditUserUpdate(userId: number, before: User, after: User) {
  await this.db.insert(auditLogs).values({
    userId,
    userEmail: after.email,
    action: 'update',
    entityType: 'user',
    entityId: userId,
    changesBefore: before,
    changesAfter: after,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
}
```

**Action Items:**
- [ ] Create audit_logs table
- [ ] Add audit logging to sensitive operations
- [ ] Store IP address and user agent
- [ ] Create audit log viewer (admin panel)
- [ ] Add retention policy for audit logs (e.g., 1 year)
- [ ] Document compliance requirements (GDPR, SOC 2)

---

## 8. Summary of Findings

### Critical Issues (Fix Before Production)
1. ✅ **Issue #D1**: Missing indexes on foreign keys (all child tables)
2. ✅ **Issue #D2**: Missing index on interview_sessions.userId
3. ✅ **Issue #D17**: No SSL/TLS for database connections

### High Priority Issues (Fix Soon)
1. ✅ **Issue #D11**: N+1 query in getUserSessionsWithCases
2. ✅ **Issue #D12**: Dashboard query fetches too much data
3. ✅ **Issue #D16**: No connection pool configuration

### Medium Priority Issues (Plan to Fix)
1. ✅ **Issue #D4**: No indexes on timestamp columns
2. ✅ **Issue #D5**: TEXT columns without length limits
3. ✅ **Issue #D6**: No composite indexes for common query patterns
4. ✅ **Issue #D8**: No check constraints on score ranges
5. ✅ **Issue #D14**: No migration rollback strategy
6. ✅ **Issue #D18**: No connection pool monitoring
7. ✅ **Issue #D19**: Users table missing role column
8. ✅ **Issue #D21**: No audit trail

### Low Priority Issues (Nice to Have)
1. ✅ **Issue #D7**: No partial indexes for filtered queries
2. ✅ **Issue #D9**: No check constraints on enum values
3. ✅ **Issue #D10**: Timestamp consistency constraints
4. ✅ **Issue #D13**: Transcript messages ordering
5. ✅ **Issue #D15**: Migration naming convention
6. ✅ **Issue #D20**: No soft delete support

---

## 9. Quick Wins (Low Effort, High Impact)

1. **Add Foreign Key Indexes** (1 hour)
   - Add indexes to all FK columns
   - Generate migration: `npm run db:generate`
   - Immediate 10-100x performance improvement
   - **Issues:** #D1, #D2

2. **Configure Connection Pool** (30 minutes)
   - Set max connections to 20
   - Add timeouts
   - Enable keep-alive
   - **Issue:** #D16

3. **Add Check Constraints on Scores** (30 minutes)
   - Constrain scores to 0-100 range
   - Prevents invalid data
   - **Issue:** #D8

4. **Enable SSL for Production** (1 hour)
   - Download RDS CA certificate
   - Configure SSL in pool
   - Test in staging
   - **Issue:** #D17

5. **Define Drizzle Relations** (1 hour)
   - Add relations to schema files
   - Enables efficient JOINs
   - Fixes N+1 queries
   - **Issue:** #D11

6. **Add Input Length Validation** (30 minutes)
   - Add MaxLength decorators to DTOs
   - Prevents database bloat
   - **Issue:** #D5

---

## 10. Database Recommendations

### Short Term (Next Sprint)
- Add indexes to all foreign keys and commonly queried columns
- Configure connection pool with appropriate limits
- Enable SSL for production database connections
- Add check constraints for valid data ranges
- Define Drizzle relations for efficient JOINs
- Optimize dashboard query to use single JOIN

### Medium Term (Next Month)
- Add composite indexes for common multi-column queries
- Create PostgreSQL enums for status/phase columns
- Add role and permissions columns to users table
- Implement audit logging for sensitive operations
- Add connection pool monitoring and health checks
- Create database backup and restore procedures
- Add migration rollback scripts

### Long Term (Next Quarter)
- Implement read replicas for read-heavy workloads
- Add database connection retry logic with exponential backoff
- Set up query performance monitoring (pg_stat_statements)
- Implement soft delete for important entities
- Add database partitioning for large tables (transcripts)
- Set up automated database maintenance (VACUUM, ANALYZE)
- Create disaster recovery plan with point-in-time recovery

---

## Database Performance Targets

### Current Performance (Estimated)
- Dashboard load: ~500-1000ms (3 queries)
- Session creation: ~50ms
- Transcript retrieval: ~100-500ms (full table scan)
- Feedback generation: ~200ms (multiple queries)

### Target Performance (After Optimizations)
- Dashboard load: <100ms (single JOIN query)
- Session creation: <20ms
- Transcript retrieval: <20ms (indexed query)
- Feedback generation: <50ms (optimized queries)

### Scalability Targets
- Support 10,000 users
- Support 100,000 sessions
- Support 5,000,000 transcript messages
- Handle 100 concurrent users
- Query response time <100ms at 95th percentile

---

## Progress Tracking

**Total Issues:** 21
**Critical:** 3
**High:** 3
**Medium:** 8
**Low:** 7

**Completed:** 0 / 21
**In Progress:** 0 / 21
**Not Started:** 21 / 21

---

## Database Monitoring Checklist

Set up monitoring for:

- [ ] **Connection Pool Metrics**
  - Active connections
  - Idle connections
  - Waiting requests
  - Connection errors

- [ ] **Query Performance**
  - Slow queries (>1 second)
  - Query execution time (p50, p95, p99)
  - Most frequent queries
  - Index usage statistics

- [ ] **Database Health**
  - CPU usage
  - Memory usage
  - Disk I/O
  - Cache hit ratio
  - Transaction rate

- [ ] **Table Statistics**
  - Table sizes
  - Row counts
  - Index bloat
  - Dead tuples

- [ ] **Replication Lag** (if using replicas)
  - Lag time
  - Replication errors
  - Sync status

---

## Notes

- Drizzle ORM provides excellent type safety but requires manual index management
- PostgreSQL query planner is smart but needs indexes to work efficiently
- Connection pool sizing depends on database server capacity
- Always test schema changes in staging before production
- Monitor query performance after index additions
- Document all database design decisions

---

**Next Phase:** Once Phase 3 issues are addressed, proceed to **Phase 4: Performance & Scalability Review**
