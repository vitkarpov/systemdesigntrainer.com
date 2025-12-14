# Drizzle ORM Usage Guide

## Overview

This project uses Drizzle ORM with PostgreSQL. Drizzle generates real SQL JOINs (unlike Prisma) and provides excellent TypeScript support.

## Database Scripts

```bash
# Generate migration from schema changes
npm run db:generate

# Apply schema to database (development)
npm run db:push

# Open Drizzle Studio (visual database browser)
npm run db:studio

# Seed the database with initial data
npm run db:seed
```

## Using Drizzle in Services

### 1. Inject the Database Connection

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../db/db.module';
import { db } from '../db/db';

@Injectable()
export class MyService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof db,
  ) {}
}
```

### 2. Query Examples

```typescript
import { eq, and, desc } from 'drizzle-orm';
import { users, interviewSessions } from '../db/schema';

// SELECT - Find by ID
const user = await this.db.query.users.findFirst({
  where: eq(users.id, userId),
});

// SELECT - With relations
const session = await this.db.query.interviewSessions.findFirst({
  where: eq(interviewSessions.id, sessionId),
  with: {
    transcriptMessages: true,
    diagramSnapshots: {
      with: {
        diagramElements: true,
      },
    },
  },
});

// INSERT - Single row
const [newUser] = await this.db
  .insert(users)
  .values({
    email: 'user@example.com',
    subscriptionStatus: 'free',
  })
  .returning();

// INSERT - Multiple rows
await this.db.insert(transcriptMessages).values([
  { sessionId: 1, role: 'interviewer', text: 'Hello', phase: 'problem', secondsElapsed: 0 },
  { sessionId: 1, role: 'candidate', text: 'Hi', phase: 'problem', secondsElapsed: 5 },
]);

// UPDATE
await this.db
  .update(interviewSessions)
  .set({ currentPhase: 'requirements', phaseStartedAt: new Date() })
  .where(eq(interviewSessions.id, sessionId));

// DELETE
await this.db
  .delete(interviewSessions)
  .where(eq(interviewSessions.id, sessionId));
```

### 3. Real SQL JOINs

Drizzle generates actual SQL JOINs, not N+1 queries:

```typescript
// This generates a single query with JOINs
const sessionsWithUsers = await this.db
  .select({
    sessionId: interviewSessions.id,
    userName: users.name,
    userEmail: users.email,
    caseTitle: interviewCases.title,
  })
  .from(interviewSessions)
  .innerJoin(users, eq(interviewSessions.userId, users.id))
  .innerJoin(interviewCases, eq(interviewSessions.caseId, interviewCases.id))
  .where(eq(interviewSessions.status, 'in_progress'));
```

### 4. Transactions

```typescript
await this.db.transaction(async (tx) => {
  const [session] = await tx
    .insert(interviewSessions)
    .values({ userId, caseId, status: 'in_progress' })
    .returning();

  await tx.insert(transcriptMessages).values({
    sessionId: session.id,
    role: 'interviewer',
    text: 'Welcome!',
    phase: 'problem',
    secondsElapsed: 0,
  });
});
```

## Schema Location

All schema files are in `src/db/schema/`:

- `users.schema.ts` - User accounts and subscriptions
- `interview-cases.schema.ts` - Interview case definitions
- `interview-sessions.schema.ts` - Session state, transcript, signals, red flags
- `diagrams.schema.ts` - Whiteboard snapshots and elements
- `feedback.schema.ts` - Post-interview feedback reports

## Type Safety

Drizzle provides full type inference:

```typescript
import type { User, InterviewSession, NewInterviewSession } from '../db/schema';

// Types are automatically inferred from schema
const user: User = await this.db.query.users.findFirst(...);
```

## Migration Workflow

1. Update schema files in `src/db/schema/`
2. Run `npm run db:generate` to create migration SQL
3. Review the generated SQL in `src/db/migrations/`
4. Run `npm run db:push` to apply changes

## Resources

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Drizzle Queries](https://orm.drizzle.team/docs/rqb)
- [Database Schema](../DATABASE_SCHEMA.md)
