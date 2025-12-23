# Phase 1: Architecture & Design Patterns Review

**Review Date:** 2025-12-23
**Reviewer:** Senior Backend Architect
**Overall Grade:** B+ (Good with room for improvement)

---

## Executive Summary

Your backend demonstrates **solid architectural foundations** with clear module boundaries, appropriate use of NestJS patterns, and well-designed service layers. However, I've identified several areas where architectural refinements could improve maintainability, testability, and separation of concerns.

---

## Table of Contents

1. [Module Structure Analysis](#1-module-structure-analysis)
2. [Service Layer Design](#2-service-layer-design)
3. [State Management (Phase Transitions)](#3-state-management-phase-transitions)
4. [AI Integration Architecture](#4-ai-integration-architecture)
5. [Data Flow Analysis](#5-data-flow-analysis)
6. [Summary of Findings](#6-summary-of-findings)
7. [Quick Wins](#7-quick-wins)
8. [Architectural Recommendations](#8-architectural-recommendations)

---

## 1. Module Structure Analysis

### ✅ STRENGTHS

**1.1 Clean Module Boundaries**
- Four well-defined feature modules: `DatabaseModule`, `AuthModule`, `InterviewModule`, `AiModule`
- Clear separation of concerns between authentication, domain logic, and AI integration
- Proper use of NestJS module system with explicit imports/exports

**1.2 Global Module Pattern**
- `DatabaseModule` correctly marked as `@Global()` (`db.module.ts:8`)
- Eliminates need to re-import database connection in every module
- Appropriate use case for global scope (infrastructure layer)

**1.3 Dependency Flow**
```
AppModule
  └─ DatabaseModule (@Global)
  └─ AuthModule (provides global JWT guard)
  └─ InterviewModule
       └─ imports: AiModule
```
Clean unidirectional dependency flow with no circular dependencies.

---

### ⚠️ ISSUES FOUND

#### Issue #1: Controller Violates Single Responsibility Principle
**Severity:** HIGH
**File:** `src/interview/controllers/sessions.controller.ts:66-74`

**Problem:**
The `SessionsController` has 9 injected services:
```typescript
constructor(
  private sessionService: InterviewSessionService,
  private transcriptService: TranscriptService,
  private phaseService: PhaseService,
  private signalService: SignalService,
  private redFlagService: RedFlagService,
  private feedbackService: FeedbackService,
  private diagramService: DiagramService,
  private aiService: AiService,
  private promptService: PromptService,
) {}
```

- Controller has too many responsibilities (orchestrating 9 services)
- Indicates missing orchestration layer between controller and services
- Makes controller difficult to test and maintain
- Violates the "controller should be thin" principle

**Recommendation:**
Create a **ConversationOrchestrationService** that encapsulates the complex SSE streaming logic (lines 442-610). This service should handle:
- Candidate message saving
- AI response generation
- Signal detection
- Red flag checking
- Transcript persistence

The controller should only call `conversationOrchestrator.handleTurn(sessionId, text, diagram)`.

**Action Items:**
- [ ] Create `ConversationOrchestrationService`
- [ ] Move SSE streaming logic from controller to orchestration service
- [ ] Reduce controller dependencies from 9 to ~3-4 services
- [ ] Update tests to reflect new architecture

---

#### Issue #2: Implicit Module Dependencies
**Severity:** MEDIUM
**File:** `src/interview/interview.module.ts:13`

**Problem:**
`InterviewModule` imports `AiModule` but this relationship isn't documented:
```typescript
@Module({
  imports: [DatabaseModule, AiModule], // Why does Interview need AI?
})
```

- No architectural documentation explaining why interview domain needs AI
- Future developers may not understand this coupling
- Could lead to tight coupling between domain logic and AI implementation

**Recommendation:**
Add JSDoc comment explaining the dependency:
```typescript
/**
 * InterviewModule depends on AiModule because:
 * - Real-time conversation requires AI response generation (SSE endpoint)
 * - Feedback generation uses AI for content creation
 *
 * Consider: Extract conversation handling to a separate ConversationModule
 * if AI dependency becomes too invasive.
 */
@Module({
  imports: [DatabaseModule, AiModule],
  // ...
})
```

**Action Items:**
- [ ] Add JSDoc comment to `InterviewModule`
- [ ] Document architectural decision in ADR (Architecture Decision Record)
- [ ] Consider extracting conversation logic to separate module in future

---

#### Issue #3: Missing Validation Module
**Severity:** LOW
**File:** `src/main.ts`

**Problem:**
No global validation pipe configured at application level.

- DTOs are validated per-controller if at all
- Inconsistent validation behavior across endpoints
- Missing global exception filter for standardized error responses

**Recommendation:**
Add to `main.ts`:
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

**Action Items:**
- [ ] Add `ValidationPipe` to `main.ts`
- [ ] Verify all DTOs have proper decorators (`class-validator`)
- [ ] Add global exception filter for consistent error format

---

## 2. Service Layer Design

### ✅ STRENGTHS

**2.1 Well-Scoped Services**
Each service has a clear, focused responsibility:
- `InterviewSessionService`: Session lifecycle (CRUD, state transitions)
- `PhaseService`: Phase metadata and state machine logic
- `TranscriptService`: Conversation history persistence
- `SignalService`: Pattern detection with regex
- `RedFlagService`: Negative signal detection
- `FeedbackService`: Score calculation and report generation
- `DiagramService`: Whiteboard snapshot management
- `AiService`: Claude API abstraction
- `PromptService`: Prompt engineering and context building

**2.2 Proper Dependency Injection**
All services use constructor-based DI following NestJS best practices.

**2.3 Clear Interfaces**
Services expose well-typed interfaces (e.g., `CreateSessionDto`, `DetectedSignal`, `FeedbackScores`).

---

### ⚠️ ISSUES FOUND

#### Issue #4: SignalService Has Hardcoded Business Logic
**Severity:** MEDIUM
**File:** `src/interview/services/signal.service.ts:50-146`

**Problem:**
Signal detection patterns are hardcoded in the service:
```typescript
private readonly signalPatterns: Record<SignalName, RegExp[]> = {
  [SignalName.ASKED_FUNCTIONAL_REQS]: [
    /\b(functional\s+)?requirements?\b/i,
    /what\s+(features?|functionality)/i,
    // ... 5 more patterns
  ],
  // ... 10 more signal types
};
```

- Pattern updates require code changes and redeployment
- No way to A/B test different detection strategies
- Cannot tune patterns without touching core service logic
- Makes testing difficult (can't easily mock patterns)

**Recommendation:**
Extract patterns to a configuration file or database table:
```typescript
// signal-patterns.config.ts
export const SIGNAL_PATTERNS = {
  // ... patterns here
};

// Or better: Store in database for dynamic updates
class SignalService {
  async loadPatterns() {
    return this.db.query.signalPatterns.findMany();
  }
}
```

**Action Items:**
- [ ] Create `signal-patterns.config.ts` with extracted patterns
- [ ] Update `SignalService` to load patterns from config
- [ ] Add unit tests for pattern matching
- [ ] (Optional) Create database table for dynamic pattern management

---

#### Issue #5: FeedbackService Contains Magic Numbers
**Severity:** MEDIUM
**File:** `src/interview/services/feedback.service.ts:63-145`

**Problem:**
Score calculation has unexplained magic numbers:
```typescript
let requirementsScore = 50; // Base score
if (signalNames.has(SignalName.ASKED_FUNCTIONAL_REQS)) requirementsScore += 15;
if (signalNames.has(SignalName.ASKED_NON_FUNCTIONAL_REQS)) requirementsScore += 15;
// ... more +15, +10, -30 adjustments
```

- No documentation explaining why +15 vs +10
- Scoring algorithm is opaque and hard to tune
- Cannot easily explain to users how scores are calculated
- Difficult to test edge cases

**Recommendation:**
Extract scoring rules to a constant:
```typescript
// scoring-rules.config.ts
export const SCORING_RULES = {
  REQUIREMENTS: {
    BASE: 50,
    ASKED_FUNCTIONAL_REQS: 15,
    ASKED_NON_FUNCTIONAL_REQS: 15,
    CLARIFIED_CONSTRAINTS: 10,
    PENALTY_SKIPPED_REQUIREMENTS: -30,
  },
  DESIGN: {
    BASE: 50,
    // ...
  },
  // ... other dimensions
};

// Better yet: Make it data-driven
interface ScoringRule {
  signal: SignalName;
  points: number;
  category: 'requirements' | 'design' | 'communication' | 'timeManagement' | 'depth';
}
```

**Action Items:**
- [ ] Create `scoring-rules.config.ts` with all scoring constants
- [ ] Refactor `calculateScores` method to use config
- [ ] Add comments explaining the rationale for each point value
- [ ] Create documentation showing scoring algorithm

---

#### Issue #6: AiService Hardcodes Model Name
**Severity:** MEDIUM
**File:** `src/ai/services/ai.service.ts:37`

**Problem:**
```typescript
private readonly model = 'claude-haiku-4-5';
```

- Cannot switch models without code change
- No way to experiment with different models (Sonnet, Opus)
- Testing with different models is cumbersome
- Cost optimization requires code deployment

**Recommendation:**
```typescript
private readonly model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

// Or inject via module config:
@Module({
  providers: [
    {
      provide: AI_MODEL_CONFIG,
      useValue: { model: 'claude-haiku-4-5', temperature: 0.7 },
    },
  ],
})
```

**Action Items:**
- [ ] Add `ANTHROPIC_MODEL` to `.env` and `.env.example`
- [ ] Update `AiService` to read model from environment variable
- [ ] Document model options in README
- [ ] Consider creating `AiConfigModule` for centralized AI configuration

---

#### Issue #7: Missing Service-Level Error Handling
**Severity:** HIGH
**File:** `src/interview/services/interview-session.service.ts:43-66`

**Problem:**
Service methods throw generic exceptions without context:
```typescript
if (!caseExists) {
  throw new BadRequestException(`Interview case with id ${dto.caseId} not found`);
}
```

- No differentiation between client errors (400) and server errors (500)
- Missing context for debugging (userId, timestamp, request metadata)
- No error logging at service level
- Exception messages expose internal IDs to clients

**Recommendation:**
Create custom exception classes:
```typescript
// exceptions/interview-case-not-found.exception.ts
export class InterviewCaseNotFoundException extends NotFoundException {
  constructor(caseId: number, userId: number) {
    super({
      message: 'Interview case not found',
      errorCode: 'CASE_NOT_FOUND',
      // Don't expose internal IDs in production
    });
    this.logger.error(`Case ${caseId} not found for user ${userId}`);
  }
}
```

**Action Items:**
- [ ] Create custom exception classes for all domain errors
- [ ] Add logging to all service methods
- [ ] Implement global exception filter for consistent error format
- [ ] Add error code enum for client-side error handling
- [ ] Ensure production errors don't leak internal details

---

## 3. State Management (Phase Transitions)

### ✅ STRENGTHS

**3.1 Well-Defined State Machine**
`PhaseService` implements a clean finite state machine (`phase.service.ts:7-14`):
```typescript
private readonly phaseOrder: InterviewPhase[] = [
  InterviewPhase.PROBLEM,
  InterviewPhase.REQUIREMENTS,
  InterviewPhase.HIGH_LEVEL,
  InterviewPhase.DEEP_DIVE,
  InterviewPhase.BOTTLENECKS,
  InterviewPhase.WRAP_UP,
];
```

**3.2 State Transition Validation**
The `canTransitionToNext` method properly validates transitions.

**3.3 Immutable Phase Order**
Phase order is defined once and never mutated.

---

### ⚠️ ISSUES FOUND

#### Issue #8: Missing Phase Transition Guards
**Severity:** HIGH
**File:** `src/interview/services/interview-session.service.ts:162-204`

**Problem:**
Phase advancement doesn't validate preconditions:
```typescript
async advancePhase(sessionId: number): Promise<AdvancePhaseResult> {
  const session = await this.getSession(sessionId);

  if (session.status !== SessionStatus.IN_PROGRESS) {
    throw new BadRequestException(`Cannot advance phase: session is ${session.status}`);
  }

  // ⚠️ NO CHECK: Did candidate complete minimum requirements for current phase?
  const transitionResult = this.phaseService.canTransitionToNext(previousPhase);
  // ... advance to next phase
}
```

- User can skip through phases without doing any work
- No validation that phase objectives were met
- No minimum time requirements per phase
- Could advance from PROBLEM → REQUIREMENTS without asking any questions

**Recommendation:**
Implement phase completion guards:
```typescript
interface PhaseGuard {
  canAdvance(session: SessionState, signals: DetectedSignal[]): {
    allowed: boolean;
    reason?: string;
  };
}

class ProblemPhaseGuard implements PhaseGuard {
  canAdvance(session, signals) {
    const hasAskedQuestions = signals.some(
      s => s.signalName === SignalName.ASKED_CLARIFYING_QUESTIONS
    );
    const spentEnoughTime = getPhaseElapsed(session) >= 60; // 1 min minimum

    return {
      allowed: hasAskedQuestions && spentEnoughTime,
      reason: !hasAskedQuestions ? 'Ask clarifying questions first' : 'Spend more time on problem',
    };
  }
}
```

**Action Items:**
- [ ] Create `PhaseGuard` interface
- [ ] Implement guards for each phase (ProblemPhaseGuard, RequirementsPhaseGuard, etc.)
- [ ] Update `advancePhase` method to check guards before transitioning
- [ ] Add configurable minimum time thresholds per phase
- [ ] Return helpful error messages when guards fail

---

#### Issue #9: State Persistence Race Condition
**Severity:** MEDIUM
**File:** `src/interview/services/interview-session.service.ts:189-196`

**Problem:**
Phase advancement updates `phaseStartedAt` but may race with concurrent requests:
```typescript
await this.db
  .update(interviewSessions)
  .set({
    currentPhase: nextPhase,
    phaseStartedAt: new Date(), // ⚠️ Uses application time, not DB time
    updatedAt: new Date(),
  })
  .where(eq(interviewSessions.id, sessionId));
```

- Uses application server time instead of database time
- If multiple app instances exist, times could be inconsistent
- No optimistic locking (could overwrite concurrent updates)
- Missing transaction boundary

**Recommendation:**
```typescript
import { sql } from 'drizzle-orm';

// Use database timestamp for consistency
await this.db
  .update(interviewSessions)
  .set({
    currentPhase: nextPhase,
    phaseStartedAt: sql`NOW()`, // Database time
    updatedAt: sql`NOW()`,
  })
  .where(eq(interviewSessions.id, sessionId));

// Or use optimistic locking:
.where(and(
  eq(interviewSessions.id, sessionId),
  eq(interviewSessions.currentPhase, previousPhase) // Only update if phase hasn't changed
));
```

**Action Items:**
- [ ] Replace `new Date()` with `sql\`NOW()\`` for all timestamp updates
- [ ] Add optimistic locking to prevent concurrent state updates
- [ ] Wrap phase transitions in database transactions
- [ ] Add tests for concurrent phase advancement scenarios

---

#### Issue #10: Missing State Transition Events
**Severity:** LOW
**File:** `src/interview/services/interview-session.service.ts`

**Problem:**
No events emitted when state changes occur.

- Other parts of the system can't react to phase changes
- No audit log of state transitions
- Cannot trigger side effects (notifications, analytics)
- Makes testing state-dependent behavior difficult

**Recommendation:**
Implement event emitter pattern:
```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
class InterviewSessionService {
  constructor(private eventEmitter: EventEmitter2) {}

  async advancePhase(sessionId: number) {
    // ... perform transition

    this.eventEmitter.emit('interview.phase.advanced', {
      sessionId,
      previousPhase,
      currentPhase,
      timestamp: new Date(),
    });
  }
}
```

**Action Items:**
- [ ] Install `@nestjs/event-emitter` package
- [ ] Add `EventEmitterModule` to `AppModule`
- [ ] Emit events for all state transitions (session started, phase advanced, session completed)
- [ ] Create event listeners for analytics/logging
- [ ] (Optional) Add event persistence for audit trail

---

## 4. AI Integration Architecture

### ✅ STRENGTHS

**4.1 Clean Abstraction Layer**
`AiService` properly abstracts Anthropic SDK:
- Service interface is independent of Anthropic API details
- Could swap to OpenAI/other LLM with minimal changes
- Streaming implementation uses RxJS observables (idiomatic NestJS)

**4.2 Separate Prompt Engineering**
`PromptService` isolates prompt logic from AI invocation:
- Excellent separation of concerns
- Prompts can evolve independently of AI service
- Testable prompt generation without calling API

**4.3 Context-Aware Prompting**
Prompt includes diagram data, conversation history, and phase instructions.

---

### ⚠️ ISSUES FOUND

#### Issue #11: Prompt Service Directly Queries Database
**Severity:** MEDIUM
**File:** `src/ai/services/prompt.service.ts:1-22`

**Problem:**
```typescript
@Injectable()
export class PromptService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof DbType,
  ) {}

  private async getInterviewCase(caseId: number) {
    return this.db.query.interviewCases.findFirst({
      where: eq(interviewCases.id, caseId),
    });
  }
}
```

- `PromptService` bypasses domain services to query database directly
- Violates layering (AI module should not know about database schema)
- Creates tight coupling between AI and database layers
- Makes unit testing harder (must mock database)
- Duplicates case retrieval logic (exists in `InterviewCasesService`)

**Recommendation:**
Inject `InterviewCasesService` instead:
```typescript
export class PromptService {
  constructor(
    private casesService: InterviewCasesService,
  ) {}

  private async getInterviewCase(caseId: number) {
    return this.casesService.getCase(caseId);
  }
}
```

**Action Items:**
- [ ] Remove `DATABASE_CONNECTION` injection from `PromptService`
- [ ] Inject `InterviewCasesService` instead
- [ ] Update `AiModule` to import `InterviewModule`
- [ ] Update tests to mock service instead of database

---

#### Issue #12: No Retry Logic for AI Calls
**Severity:** HIGH
**File:** `src/ai/services/ai.service.ts:91-122`

**Problem:**
```typescript
const response = await this.client.messages.create({
  // ... no retry, no timeout, no circuit breaker
});
```

- Anthropic API calls can fail transiently (rate limits, network issues)
- No exponential backoff retry strategy
- No timeout configuration (could hang indefinitely)
- Single failure breaks entire conversation flow
- No fallback strategy

**Recommendation:**
Wrap API calls with retry logic:
```typescript
import { retry } from 'rxjs/operators';

async generateResponse(options: GenerateResponseOptions) {
  return await this.withRetry(async () => {
    const response = await Promise.race([
      this.client.messages.create({
        ...options,
      }),
      this.timeout(30000), // 30 second timeout
    ]);
    return response;
  });
}

private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (this.isRetryable(error)) {
        await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
  throw lastError;
}

private isRetryable(error: any): boolean {
  // Retry on rate limits, timeouts, 5xx errors
  return error.status >= 500 || error.status === 429;
}

private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

private timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), ms)
  );
}
```

**Action Items:**
- [ ] Implement retry logic with exponential backoff
- [ ] Add timeout configuration for AI requests
- [ ] Determine which errors are retryable (rate limits, 5xx)
- [ ] Add circuit breaker pattern for prolonged failures
- [ ] Add configuration for max retries and timeout duration

---

#### Issue #13: Streaming Error Handling Incomplete
**Severity:** HIGH
**File:** `src/ai/services/ai.service.ts:128-192` & `src/interview/controllers/sessions.controller.ts:600-609`

**Problem:**
SSE streaming has poor error recovery:
```typescript
return preparation$.pipe(
  // ... streaming logic
  catchError((error) => {
    const errorEvent: MessageEvent = {
      type: 'error',
      data: JSON.stringify({
        message: error.message || 'An error occurred during streaming',
      }),
    };
    return of(errorEvent);
  }),
);
```

- If AI stream fails mid-response, partial message is not saved to transcript
- Client receives error but database state is inconsistent
- No way to resume interrupted conversations
- No compensation logic to roll back candidate message if AI fails

**Recommendation:**
Implement saga pattern for conversation turns:
```typescript
class ConversationSaga {
  async execute(sessionId: number, text: string) {
    const candidateMsg = await this.saveCandidateMessage(sessionId, text);

    try {
      const aiResponse = await this.generateAiResponse(sessionId, text);
      await this.saveAiMessage(sessionId, aiResponse);
      await this.detectSignals(sessionId, text);
      return { success: true };
    } catch (error) {
      // Compensate: Mark candidate message as "unprocessed" for retry
      await this.markMessageForRetry(candidateMsg.id);
      throw error;
    }
  }
}
```

**Action Items:**
- [ ] Implement saga/compensation pattern for conversation turns
- [ ] Save partial AI responses before failure
- [ ] Add retry mechanism for failed conversations
- [ ] Store conversation state to enable resumption
- [ ] Add database transaction around conversation turn

---

#### Issue #14: No Cost Tracking
**Severity:** MEDIUM
**File:** `src/ai/services/ai.service.ts`

**Problem:**
AI service returns token usage but doesn't persist it:
```typescript
return {
  text,
  model: response.model,
  usage: {
    inputTokens: response.usage.input_tokens,  // ⚠️ Returned but not stored
    outputTokens: response.usage.output_tokens,
  },
};
```

- No historical tracking of token usage
- Cannot analyze costs per session/user
- Cannot set usage limits or quotas
- Cannot optimize prompt length based on cost data

**Recommendation:**
Create `AiUsageTrackingService`:
```typescript
interface AiUsage {
  sessionId: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: Date;
}

class AiUsageTrackingService {
  async recordUsage(usage: AiUsage) {
    await this.db.insert(aiUsage).values(usage);
  }

  async getSessionCost(sessionId: number): Promise<number> {
    const usages = await this.getSessionUsages(sessionId);
    return usages.reduce((sum, u) => sum + u.estimatedCost, 0);
  }
}
```

**Action Items:**
- [ ] Create database schema for AI usage tracking
- [ ] Create `AiUsageTrackingService`
- [ ] Update `AiService` to record usage after each call
- [ ] Add cost calculation based on model pricing
- [ ] Create dashboard endpoint for usage analytics
- [ ] (Optional) Implement usage quotas per user

---

## 5. Data Flow Analysis

### ✅ STRENGTHS

**5.1 Clear Request Flow**
```
HTTP Request
  → Controller (thin, handles auth/validation)
  → Service Layer (business logic)
  → Database (Drizzle ORM)
  → Response DTO
```

**5.2 Proper Use of DTOs**
- Separate DTOs for requests and responses
- Type-safe throughout the stack
- OpenAPI documentation generated from DTOs

**5.3 Ownership Verification**
Controller properly verifies session ownership before all operations (`sessions.controller.ts:80-88`).

---

### ⚠️ ISSUES FOUND

#### Issue #15: N+1 Query in Dashboard Endpoint
**Severity:** HIGH
**File:** `src/interview/controllers/sessions.controller.ts:94-148` & `src/interview/services/interview-session.service.ts:99-132`

**Problem:**
```typescript
async getDashboard(@CurrentUser() user: User) {
  const sessions = await this.sessionService.getUserSessionsWithCases(user.id);

  // ⚠️ N+1 Query: Fetches feedback for each session individually
  const sessionIds = sessions.map((s) => s.id);
  const feedbackScoresMap = await this.feedbackService.getFeedbackScoresForSessions(sessionIds);
  // ...
}

// interview-session.service.ts:99-132
async getUserSessionsWithCases(userId: number) {
  const sessions = await this.getUserSessions(userId);

  // ⚠️ Fetches all cases separately instead of JOIN
  const caseIds = [...new Set(sessions.map((s) => s.caseId))];
  const cases = await this.db.query.interviewCases.findMany({
    where: (interviewCases, { inArray }) => inArray(interviewCases.id, caseIds),
  });
  // ...
}
```

- Makes 3 separate queries instead of 1 JOIN query
- Performance degrades as user has more sessions
- Drizzle ORM supports JOINs but they're not being used
- Could cause slow dashboard loads for active users

**Recommendation:**
Use Drizzle's relational query builder:
```typescript
async getUserSessionsWithCases(userId: number) {
  return this.db.query.interviewSessions.findMany({
    where: eq(interviewSessions.userId, userId),
    with: {
      interviewCase: true, // Drizzle does JOIN automatically
      feedbackReport: true, // Include feedback in same query
    },
    orderBy: [desc(interviewSessions.createdAt)],
  });
}
```

**Action Items:**
- [ ] Refactor `getUserSessionsWithCases` to use Drizzle's relational queries
- [ ] Add database relations to schema files
- [ ] Update dashboard endpoint to use single query
- [ ] Benchmark performance improvement
- [ ] Add database indexes on foreign keys if missing

---

#### Issue #16: Cookie-Based Parameter Passing
**Severity:** MEDIUM
**File:** `src/interview/controllers/sessions.controller.ts:435-449`

**Problem:**
SSE endpoint reads parameters from cookies:
```typescript
handleConversationStream(/* ... */) {
  const text = request.cookies?.text as string;
  const diagramData = request.cookies?.diagramData as string | undefined;
  // ...
}
```

- Unconventional use of cookies for request parameters
- Cookies have size limits (4KB), diagram data could exceed this
- Security concern: Sensitive data in cookies
- Makes API harder to understand and document
- Cannot use standard API testing tools (Postman, curl) easily

**Recommendation:**
Use proper SSE parameter passing:
```typescript
// Option 1: Query parameters with POST body
@Post(':id/conversation')
async initiateConversation(@Body() dto: { text: string; diagramData: any }) {
  const streamId = await this.createStreamSession(dto);
  return { streamId };
}

@Sse('stream/:streamId')
handleConversationStream(@Param('streamId') streamId: string) {
  // Retrieve parameters from stream session
}

// Option 2: Use POST with response streaming
@Post(':id/conversation')
async handleConversation(@Body() dto: ConversationDto, @Res() response: Response) {
  // Use response.write() for streaming
}
```

**Action Items:**
- [ ] Design better SSE parameter passing mechanism
- [ ] Update frontend to use new API pattern
- [ ] Remove cookie-based parameter passing
- [ ] Update API documentation
- [ ] Add API tests for new streaming endpoint

---

#### Issue #17: Missing Pagination
**Severity:** MEDIUM
**File:** `src/interview/services/interview-session.service.ts:86-94`

**Problem:**
```typescript
async getUserSessions(userId: number): Promise<SessionState[]> {
  const sessions = await this.db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.userId, userId))
    .orderBy(interviewSessions.createdAt);

  return sessions.map((s) => this.mapToSessionState(s)); // ⚠️ Returns ALL sessions
}
```

- Returns all sessions for a user (could be hundreds)
- No pagination support
- Will cause memory issues for power users
- Slow API responses as data grows

**Recommendation:**
```typescript
interface PaginationOptions {
  page: number;
  limit: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

async getUserSessions(
  userId: number,
  options?: PaginationOptions
): Promise<PaginatedResult<SessionState>> {
  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const offset = (page - 1) * limit;

  const [sessions, [{ count: totalCount }]] = await Promise.all([
    this.db
      .select()
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, userId))
      .orderBy(desc(interviewSessions.createdAt))
      .limit(limit)
      .offset(offset),
    this.db
      .select({ count: count() })
      .from(interviewSessions)
      .where(eq(interviewSessions.userId, userId)),
  ]);

  return {
    data: sessions.map(this.mapToSessionState),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}
```

**Action Items:**
- [ ] Add pagination to all list endpoints
- [ ] Create reusable `PaginationDto` and `PaginatedResponse<T>` types
- [ ] Update controller endpoints to accept pagination query params
- [ ] Update frontend to handle paginated responses
- [ ] Set reasonable default limit (e.g., 20 items per page)

---

## 6. Summary of Findings

### Critical Issues (Fix Immediately)
1. ✅ **Issue #7**: Missing service-level error handling and logging
2. ✅ **Issue #8**: No phase transition guards (users can skip phases)
3. ✅ **Issue #12**: No retry logic for AI API calls
4. ✅ **Issue #13**: Incomplete error handling in SSE streaming
5. ✅ **Issue #15**: N+1 queries in dashboard endpoint

### High Priority Issues (Fix Soon)
1. ✅ **Issue #1**: Controller has too many dependencies (needs orchestration service)
2. ✅ **Issue #9**: State persistence race conditions

### Medium Priority Issues (Plan to Fix)
1. ✅ **Issue #4**: Hardcoded signal detection patterns
2. ✅ **Issue #5**: Magic numbers in feedback scoring
3. ✅ **Issue #6**: Hardcoded AI model name
4. ✅ **Issue #11**: PromptService directly queries database
5. ✅ **Issue #14**: No AI cost tracking
6. ✅ **Issue #16**: Unconventional cookie-based parameters
7. ✅ **Issue #17**: Missing pagination

### Low Priority Issues (Nice to Have)
1. ✅ **Issue #2**: Undocumented module dependencies
2. ✅ **Issue #3**: Missing global validation pipe
3. ✅ **Issue #10**: No state transition events

---

## 7. Quick Wins (Low Effort, High Impact)

1. **Add Global Validation** (30 minutes)
   - Add `ValidationPipe` to `main.ts`
   - Immediate improvement in error handling
   - **Issue:** #3

2. **Extract Scoring Constants** (1 hour)
   - Move magic numbers to constants file
   - Makes feedback algorithm transparent
   - **Issue:** #5

3. **Add Database Timestamps** (30 minutes)
   - Replace `new Date()` with `sql\`NOW()\``
   - Eliminates clock skew issues
   - **Issue:** #9

4. **Add Retry Logic to AI Service** (2 hours)
   - Wrap API calls with exponential backoff
   - Dramatically improves reliability
   - **Issue:** #12

5. **Add Environment Variable for AI Model** (15 minutes)
   - Quick configuration improvement
   - Enables easy model experimentation
   - **Issue:** #6

---

## 8. Architectural Recommendations

### Short Term (Next Sprint)
- Create `ConversationOrchestrationService` to reduce controller complexity
- Implement phase transition guards
- Add retry/timeout logic to AI service
- Fix N+1 queries with Drizzle JOINs
- Add pagination to session endpoints
- Create custom exception classes with proper logging

### Medium Term (Next Month)
- Extract signal patterns to configuration
- Extract scoring rules to configuration
- Implement AI cost tracking service
- Add event emitter for state transitions
- Refactor SSE endpoint to use standard parameter passing
- Add global validation pipe and exception filters

### Long Term (Next Quarter)
- Consider CQRS pattern for read-heavy operations (dashboard)
- Implement saga pattern for conversation turns
- Add distributed caching layer (Redis) for session state
- Create admin interface for tuning signal patterns and scoring rules
- Implement background job system for async feedback generation
- Add comprehensive monitoring and observability (OpenTelemetry)

---

## Progress Tracking

**Total Issues:** 17
**Critical:** 5
**High:** 2
**Medium:** 7
**Low:** 3

**Completed:** 0 / 17
**In Progress:** 0 / 17
**Not Started:** 17 / 17

---

## Notes

- Use the checkboxes in each issue's "Action Items" section to track progress
- Update the "Progress Tracking" section as you complete issues
- Consider creating GitHub issues or JIRA tickets for better project management
- Prioritize based on severity and business impact
- Some issues can be tackled in parallel by different team members

---

**Next Phase:** Once Phase 1 issues are addressed, proceed to **Phase 2: Security & Authentication Review**
