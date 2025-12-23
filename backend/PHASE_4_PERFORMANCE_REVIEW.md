# Phase 4: Performance & Scalability Review

**Review Date:** 2025-12-23
**Reviewer:** Senior Backend Architect
**Overall Grade:** C+ (Basic performance but not production-ready for scale)

---

## Executive Summary

Your application has **good fundamentals** but lacks critical performance optimizations needed for production scale. There's no caching layer, no background job processing, limited concurrency handling, and no performance monitoring. The synchronous AI feedback generation and lack of rate limiting will cause bottlenecks under load.

**Estimated Current Capacity:** ~10 concurrent users
**Target Capacity:** 100+ concurrent users

---

## Table of Contents

1. [Concurrency & Resource Management](#1-concurrency--resource-management)
2. [Memory Management](#2-memory-management)
3. [Caching Strategy](#3-caching-strategy)
4. [Background Job Processing](#4-background-job-processing)
5. [API Performance](#5-api-performance)
6. [Horizontal Scaling Readiness](#6-horizontal-scaling-readiness)
7. [Load Testing & Benchmarks](#7-load-testing--benchmarks)
8. [Summary of Findings](#8-summary-of-findings)
9. [Quick Wins](#9-quick-wins)
10. [Performance Recommendations](#10-performance-recommendations)

---

## 1. Concurrency & Resource Management

### ⚠️ ISSUES FOUND

#### Issue #P1: No Concurrency Limits on AI Streaming
**Severity:** CRITICAL
**File:** `src/interview/controllers/sessions.controller.ts:435-610`

**Problem:**
```typescript
@Sse(':id/conversation')
handleConversationStream(/* ... */): Observable<MessageEvent> {
  // ⚠️ No limit on concurrent streams
  // Each stream holds: DB connection, AI API call, SSE connection
  // If 100 users stream simultaneously:
  // - 100 DB connections
  // - 100 AI API calls
  // - 100 open HTTP connections
  // = Database connection pool exhaustion
  // = AI API rate limit hit
  // = Server memory exhaustion
}
```

**Attack Scenario:**
```bash
# Open 100 concurrent streaming connections
for i in {1..100}; do
  curl -N "http://api/sessions/1/conversation" \
    --cookie "text=hello" &
done

# Server becomes unresponsive
# Database pool exhausted
# AI API quota burned through
```

**Recommendation:**
Implement concurrent stream limit:

```typescript
// streaming-limiter.service.ts
@Injectable()
export class StreamingLimiterService {
  private activeStreams = new Map<number, number>(); // userId -> count
  private readonly MAX_CONCURRENT_STREAMS_PER_USER = 2;
  private readonly MAX_GLOBAL_STREAMS = 50;
  private globalStreamCount = 0;

  async acquireStreamSlot(userId: number): Promise<void> {
    // Check global limit
    if (this.globalStreamCount >= this.MAX_GLOBAL_STREAMS) {
      throw new ServiceUnavailableException(
        'Server is at capacity. Please try again in a moment.',
      );
    }

    // Check per-user limit
    const userStreams = this.activeStreams.get(userId) || 0;
    if (userStreams >= this.MAX_CONCURRENT_STREAMS_PER_USER) {
      throw new TooManyRequestsException(
        'Maximum concurrent conversations reached. Please wait for existing conversation to complete.',
      );
    }

    // Acquire slot
    this.activeStreams.set(userId, userStreams + 1);
    this.globalStreamCount++;
  }

  releaseStreamSlot(userId: number): void {
    const userStreams = this.activeStreams.get(userId) || 0;
    if (userStreams > 0) {
      this.activeStreams.set(userId, userStreams - 1);
    }
    if (this.globalStreamCount > 0) {
      this.globalStreamCount--;
    }
  }

  getMetrics() {
    return {
      globalStreams: this.globalStreamCount,
      maxGlobalStreams: this.MAX_GLOBAL_STREAMS,
      activeUsers: this.activeStreams.size,
    };
  }
}

// Usage in controller
@Sse(':id/conversation')
handleConversationStream(
  @CurrentUser() user: User,
  @Param('id', ParseIntPipe) id: number,
  @Req() request: Request,
): Observable<MessageEvent> {
  return from(this.streamLimiter.acquireStreamSlot(user.id)).pipe(
    switchMap(() => {
      // ... existing streaming logic

      return streamEvents$.pipe(
        finalize(() => {
          // Always release slot when stream ends
          this.streamLimiter.releaseStreamSlot(user.id);
        }),
      );
    }),
  );
}
```

**Action Items:**
- [ ] Implement StreamingLimiterService
- [ ] Set global concurrent stream limit (50)
- [ ] Set per-user concurrent stream limit (2)
- [ ] Return 503 Service Unavailable when at capacity
- [ ] Add metrics endpoint for stream usage
- [ ] Monitor concurrent stream count in production

---

#### Issue #P2: Synchronous Feedback Generation Blocks Request
**Severity:** HIGH
**File:** `src/interview/services/feedback.service.ts:385-477`

**Problem:**
```typescript
async generateFeedback(sessionId: number): Promise<GenerateFeedbackResult> {
  // ... multiple sequential operations
  const scores = await this.calculateScores(sessionId);      // ~100ms
  const items = await this.generateFeedbackItems(...);       // ~200ms
  const nextSteps = await this.generateNextSteps(...);       // ~150ms
  const summary = this.generateSummary(scores);              // ~50ms

  // Database writes
  await this.db.insert(feedbackReports).values(...);         // ~50ms
  await Promise.all(items.map(...));                         // ~100ms
  await Promise.all(nextSteps.map(...));                     // ~80ms

  return { ... };  // Total: ~730ms blocking time
}

// Controller waits for completion
@Post(':id/feedback')
async generateFeedback(@Param('id') id: number) {
  const feedback = await this.feedbackService.generateFeedback(id); // BLOCKS
  return { success: true, data: feedback };
}
```

**Impact:**
- User waits ~730ms for feedback (bad UX)
- HTTP connection held open (resource waste)
- Cannot handle concurrent feedback requests efficiently
- Scales poorly (10 concurrent = 7+ seconds response time)

**Recommendation:**
Use async job queue:

```typescript
// feedback.controller.ts
@Post(':id/feedback')
async generateFeedback(@Param('id', ParseIntPipe) id: number) {
  // Enqueue job immediately
  const job = await this.feedbackQueue.add('generate-feedback', {
    sessionId: id,
    userId: user.id,
  });

  return {
    success: true,
    message: 'Feedback generation started',
    data: {
      jobId: job.id,
      status: 'processing',
      estimatedTime: '5-10 seconds',
    },
  };
}

// Get feedback status
@Get(':id/feedback/status')
async getFeedbackStatus(@Param('id', ParseIntPipe) id: number) {
  const job = await this.feedbackQueue.getJob(id);

  if (!job) {
    // Check if feedback already exists
    const feedback = await this.feedbackService.getFeedback(id);
    return {
      status: 'completed',
      data: feedback,
    };
  }

  if (await job.isCompleted()) {
    const feedback = await job.returnvalue;
    return {
      status: 'completed',
      data: feedback,
    };
  }

  if (await job.isFailed()) {
    return {
      status: 'failed',
      error: job.failedReason,
    };
  }

  return {
    status: 'processing',
    progress: job.progress(),
  };
}

// Worker process
@Processor('feedback')
export class FeedbackProcessor {
  @Process('generate-feedback')
  async handleFeedbackGeneration(job: Job) {
    const { sessionId } = job.data;

    job.progress(10);
    const scores = await this.feedbackService.calculateScores(sessionId);

    job.progress(40);
    const items = await this.feedbackService.generateFeedbackItems(...);

    job.progress(70);
    const nextSteps = await this.feedbackService.generateNextSteps(...);

    job.progress(90);
    const result = await this.feedbackService.saveFeedback(...);

    job.progress(100);
    return result;
  }
}
```

**Action Items:**
- [ ] Install Bull queue: `npm install @nestjs/bull bull`
- [ ] Set up Redis for Bull queue
- [ ] Move feedback generation to background job
- [ ] Create job status endpoint
- [ ] Update frontend to poll for job completion
- [ ] Add job failure handling and retries

---

#### Issue #P3: No Request Timeout Configuration
**Severity:** MEDIUM
**File:** `src/main.ts`

**Problem:**
No request timeout configured:
```typescript
// main.ts
await app.listen(3000); // ⚠️ No timeout
```

**Issues:**
- Slow clients can hold connections open indefinitely
- Memory leaks from abandoned connections
- Resource exhaustion under load

**Recommendation:**
```typescript
// main.ts
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set request timeout
  app.use((req, res, next) => {
    // 30 second timeout for regular requests
    req.setTimeout(30000);
    // 5 minute timeout for SSE streaming (longer for AI responses)
    if (req.path.includes('/conversation')) {
      req.setTimeout(300000);
    }
    next();
  });

  // Set server timeout
  const server = await app.listen(3000);
  server.setTimeout(30000); // 30 seconds default

  // Handle timeout events
  server.on('timeout', (socket) => {
    console.warn('Request timeout, closing socket');
    socket.end();
  });
}
```

**Action Items:**
- [ ] Set request timeout (30 seconds)
- [ ] Set longer timeout for streaming endpoints (5 minutes)
- [ ] Add timeout handling middleware
- [ ] Log timeout events
- [ ] Monitor timeout frequency

---

## 2. Memory Management

### ⚠️ ISSUES FOUND

#### Issue #P4: Unbounded Memory Growth in Transcript Queries
**Severity:** HIGH
**File:** `src/interview/services/transcript.service.ts`

**Problem:**
```typescript
async getSessionTranscript(sessionId: number): Promise<TranscriptMessage[]> {
  const messages = await this.db
    .select()
    .from(transcriptMessages)
    .where(eq(transcriptMessages.sessionId, sessionId))
    .orderBy(transcriptMessages.createdAt);

  return messages; // ⚠️ Returns ALL messages - no limit
}
```

**Scenario:**
- Interview session lasts 2 hours
- User sends 200 messages
- Each message averages 500 bytes
- Total: 200 * 500 bytes = 100KB per session
- Load 100 sessions concurrently = 10MB in memory
- With 1000 concurrent sessions = 100MB+

**Recommendation:**
Add pagination and limits:

```typescript
interface PaginationOptions {
  limit?: number;
  offset?: number;
}

async getSessionTranscript(
  sessionId: number,
  options?: PaginationOptions,
): Promise<{ messages: TranscriptMessage[]; total: number }> {
  const limit = options?.limit || 100; // Default to last 100 messages
  const offset = options?.offset || 0;

  // Get total count
  const [{ count }] = await this.db
    .select({ count: count() })
    .from(transcriptMessages)
    .where(eq(transcriptMessages.sessionId, sessionId));

  // Get paginated messages
  const messages = await this.db
    .select()
    .from(transcriptMessages)
    .where(eq(transcriptMessages.sessionId, sessionId))
    .orderBy(transcriptMessages.id)
    .limit(limit)
    .offset(offset);

  return {
    messages,
    total: count,
  };
}

// Get recent messages (most common use case)
async getRecentMessages(
  sessionId: number,
  limit: number = 10,
): Promise<TranscriptMessage[]> {
  const messages = await this.db
    .select()
    .from(transcriptMessages)
    .where(eq(transcriptMessages.sessionId, sessionId))
    .orderBy(desc(transcriptMessages.id))
    .limit(limit);

  return messages.reverse(); // Return in chronological order
}
```

**Action Items:**
- [ ] Add pagination to transcript retrieval
- [ ] Set reasonable default limit (100 messages)
- [ ] Update frontend to handle pagination
- [ ] Add "load more" functionality
- [ ] Monitor memory usage in production

---

#### Issue #P5: Streaming Response Memory Leak Risk
**Severity:** MEDIUM
**File:** `src/interview/controllers/sessions.controller.ts:512-609`

**Problem:**
```typescript
return preparation$.pipe(
  switchMap(({ session, candidateMessage, promptContext, elapsedSeconds }) => {
    // ... streaming logic
    const streamEvents$ = this.aiService.generateStreamingResponse({
      // ⚠️ No cleanup if client disconnects mid-stream
      systemPrompt: promptContext.systemPrompt,
      userMessage: promptContext.userMessage,
    });

    return concat(of(startEvent), streamEvents$);
  }),
);
```

**Risk:**
- Client disconnects during AI streaming
- Observable never completes
- AI API call continues burning tokens
- Database connections held open
- Memory never freed

**Recommendation:**
```typescript
@Sse(':id/conversation')
handleConversationStream(/* ... */): Observable<MessageEvent> {
  return new Observable((observer) => {
    let cleanedUp = false;
    let aiStreamSubscription: Subscription;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;

      // Cancel AI stream
      if (aiStreamSubscription) {
        aiStreamSubscription.unsubscribe();
      }

      // Release resources
      this.streamLimiter.releaseStreamSlot(user.id);

      console.log(`Stream cleaned up for session ${id}`);
    };

    // Handle client disconnect
    request.on('close', () => {
      console.log('Client disconnected from stream');
      cleanup();
      observer.complete();
    });

    // Execute stream
    const stream$ = from(preparation).pipe(
      switchMap((context) => {
        const ai$ = this.aiService.generateStreamingResponse(context);

        aiStreamSubscription = ai$.subscribe({
          next: (event) => observer.next(event),
          error: (err) => {
            cleanup();
            observer.error(err);
          },
          complete: () => {
            cleanup();
            observer.complete();
          },
        });

        return EMPTY;
      }),
    );

    stream$.subscribe();

    // Cleanup on unsubscribe
    return cleanup;
  });
}
```

**Action Items:**
- [ ] Add cleanup handler for client disconnects
- [ ] Cancel AI API calls when client disconnects
- [ ] Release resources (DB connections, rate limit slots)
- [ ] Log cleanup events
- [ ] Test disconnect scenarios

---

#### Issue #P6: No Memory Limits on Diagram Data
**Severity:** MEDIUM
**File:** `src/interview/dto/diagram.dto.ts:4-18`

**Problem:**
```typescript
export class SaveDiagramDto {
  @ApiProperty()
  nodes: any[]; // ⚠️ No size limit

  @ApiProperty()
  edges: any[]; // ⚠️ No size limit
}
```

**Risk:**
- User can submit 10,000 nodes and 20,000 edges
- Each node ~200 bytes = 2MB
- Each edge ~100 bytes = 2MB
- Total: 4MB per request
- 10 concurrent = 40MB in memory
- JSON parsing is CPU-intensive

**Recommendation:**
```typescript
import { IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class DiagramNodeDto {
  @IsString()
  @MaxLength(50)
  id: string;

  @IsString()
  @MaxLength(50)
  type: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

class DiagramEdgeDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;
}

export class SaveDiagramDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagramNodeDto)
  @ArrayMaxSize(500, { message: 'Maximum 500 nodes allowed' })
  nodes: DiagramNodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiagramEdgeDto)
  @ArrayMaxSize(1000, { message: 'Maximum 1000 edges allowed' })
  edges: DiagramEdgeDto[];
}
```

**Action Items:**
- [ ] Add array size limits to diagram DTOs (500 nodes, 1000 edges)
- [ ] Validate node/edge structure
- [ ] Add request size limit in main.ts
- [ ] Return clear error when limits exceeded
- [ ] Monitor diagram sizes in production

---

## 3. Caching Strategy

### ❌ CRITICAL GAPS

**No caching layer implemented:**
- No Redis or in-memory cache
- Interview cases fetched from DB every time
- User data fetched on every request
- Phase metadata recalculated repeatedly

---

### ⚠️ ISSUES FOUND

#### Issue #P7: Interview Cases Not Cached
**Severity:** HIGH
**File:** `src/interview/services/interview-cases.service.ts`

**Problem:**
```typescript
async getCases(): Promise<InterviewCase[]> {
  // ⚠️ Hits database on every request
  const cases = await this.db.query.interviewCases.findMany({
    where: eq(interviewCases.isActive, true),
  });
  return cases;
}
```

**Impact:**
- Cases rarely change (static data)
- Fetched on every session creation
- Unnecessary database load
- Slow API response

**Recommendation:**
```typescript
// Install cache-manager
npm install @nestjs/cache-manager cache-manager

// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 3600, // 1 hour default
      max: 100, // Maximum items in cache
    }),
  ],
})

// interview-cases.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class InterviewCasesService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof DbType,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getCases(): Promise<InterviewCase[]> {
    const cacheKey = 'interview-cases:active';

    // Try cache first
    let cases = await this.cacheManager.get<InterviewCase[]>(cacheKey);

    if (!cases) {
      // Cache miss - fetch from database
      cases = await this.db.query.interviewCases.findMany({
        where: eq(interviewCases.isActive, true),
      });

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, cases, 3600);
    }

    return cases;
  }

  async getCase(id: number): Promise<InterviewCase | undefined> {
    const cacheKey = `interview-case:${id}`;

    let interviewCase = await this.cacheManager.get<InterviewCase>(cacheKey);

    if (!interviewCase) {
      interviewCase = await this.db.query.interviewCases.findFirst({
        where: eq(interviewCases.id, id),
      });

      if (interviewCase) {
        await this.cacheManager.set(cacheKey, interviewCase, 3600);
      }
    }

    return interviewCase;
  }

  // Invalidate cache when case is updated
  async updateCase(id: number, data: Partial<InterviewCase>) {
    await this.db.update(interviewCases).set(data).where(eq(interviewCases.id, id));

    // Invalidate caches
    await this.cacheManager.del(`interview-case:${id}`);
    await this.cacheManager.del('interview-cases:active');
  }
}
```

**Action Items:**
- [ ] Install `@nestjs/cache-manager`
- [ ] Add caching to interview cases (1 hour TTL)
- [ ] Add caching to user lookups (5 min TTL)
- [ ] Add cache invalidation on updates
- [ ] Monitor cache hit rate
- [ ] Consider Redis for distributed caching

---

#### Issue #P8: Phase Metadata Recalculated Every Request
**Severity:** MEDIUM
**File:** `src/interview/services/phase.service.ts:65-111`

**Problem:**
```typescript
getPhaseMetadata(phase: InterviewPhase): {
  name: string;
  description: string;
  order: number;
  recommendedMinutes: number;
} {
  const metadata = {
    [InterviewPhase.PROBLEM]: { /* ... */ },
    [InterviewPhase.REQUIREMENTS]: { /* ... */ },
    // ... more phases
  };

  return metadata[phase]; // ⚠️ Recreates object every time
}
```

**Impact:**
- Called multiple times per request
- Creates garbage objects
- Unnecessary CPU cycles

**Recommendation:**
```typescript
@Injectable()
export class PhaseService {
  // Make metadata static and immutable
  private static readonly PHASE_METADATA = Object.freeze({
    [InterviewPhase.PROBLEM]: Object.freeze({
      name: 'Problem Understanding',
      description: 'Clarify the problem statement and scope',
      order: 1,
      recommendedMinutes: 5,
    }),
    [InterviewPhase.REQUIREMENTS]: Object.freeze({
      name: 'Requirements Gathering',
      description: 'Discuss functional and non-functional requirements',
      order: 2,
      recommendedMinutes: 10,
    }),
    // ... rest frozen
  });

  getPhaseMetadata(phase: InterviewPhase) {
    return PhaseService.PHASE_METADATA[phase];
  }
}
```

**Action Items:**
- [ ] Make phase metadata static and frozen
- [ ] Make signal patterns static
- [ ] Cache prompt templates
- [ ] Measure memory reduction

---

## 4. Background Job Processing

### ❌ CRITICAL GAPS

**No background job system:**
- Feedback generation blocks HTTP requests
- No email notifications
- No scheduled tasks (cleanup, analytics)
- No retry logic for failed operations

---

### ⚠️ ISSUES FOUND

#### Issue #P9: No Job Queue for Async Tasks
**Severity:** HIGH
**File:** Multiple services

**Problem:**
All long-running tasks are synchronous:
```typescript
// Feedback generation: ~730ms
await feedbackService.generateFeedback(sessionId);

// AI calls: variable (1-10 seconds)
await aiService.generateResponse(...);

// Email notifications: not implemented
// Scheduled cleanup: not implemented
// Analytics aggregation: not implemented
```

**Recommendation:**
Implement Bull job queue:

```bash
npm install @nestjs/bull bull
npm install @types/bull --save-dev
```

```typescript
// app.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue(
      { name: 'feedback' },
      { name: 'email' },
      { name: 'cleanup' },
    ),
  ],
})

// feedback.queue.ts
@Injectable()
export class FeedbackQueueService {
  constructor(
    @InjectQueue('feedback') private feedbackQueue: Queue,
  ) {}

  async generateFeedback(sessionId: number, userId: number) {
    return this.feedbackQueue.add('generate', {
      sessionId,
      userId,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 jobs
      removeOnFail: 1000,    // Keep last 1000 failed jobs
    });
  }
}

// feedback.processor.ts
@Processor('feedback')
export class FeedbackProcessor {
  constructor(private feedbackService: FeedbackService) {}

  @Process('generate')
  async handleGenerate(job: Job) {
    const { sessionId, userId } = job.data;

    try {
      const result = await this.feedbackService.generateFeedback(sessionId);
      return result;
    } catch (error) {
      console.error(`Feedback generation failed for session ${sessionId}:`, error);
      throw error; // Will trigger retry
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    console.log(`Feedback generated for session ${job.data.sessionId}`);
    // Optional: Send notification to user
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    console.error(`Feedback generation failed permanently:`, error);
    // Alert admin or log to error tracking
  }
}
```

**Action Items:**
- [ ] Install Bull and Redis
- [ ] Create feedback generation queue
- [ ] Create email notification queue
- [ ] Create cleanup tasks queue
- [ ] Add job monitoring dashboard
- [ ] Set up queue metrics (completed, failed, waiting)

---

#### Issue #P10: No Scheduled Cleanup Tasks
**Severity:** MEDIUM
**File:** N/A - Missing feature

**Problem:**
No scheduled tasks for:
- Cleaning up expired sessions
- Removing old revoked tokens
- Aggregating analytics
- Database maintenance

**Recommendation:**
```bash
npm install @nestjs/schedule
```

```typescript
// app.module.ts
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
})

// cleanup.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CleanupService {
  constructor(
    @Inject(DATABASE_CONNECTION) private db: typeof DbType,
  ) {}

  // Run daily at 2 AM
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredTokens() {
    console.log('Cleaning up expired revoked tokens...');

    const result = await this.db
      .delete(revokedTokens)
      .where(lt(revokedTokens.expiresAt, new Date()));

    console.log(`Deleted ${result.rowCount} expired tokens`);
  }

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupAbandonedSessions() {
    console.log('Cleaning up abandoned sessions...');

    // Sessions stuck in IN_PROGRESS for > 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const result = await this.db
      .update(interviewSessions)
      .set({ status: 'completed', completedAt: new Date() })
      .where(
        and(
          eq(interviewSessions.status, 'in_progress'),
          lt(interviewSessions.startedAt, twoHoursAgo),
        ),
      );

    console.log(`Completed ${result.rowCount} abandoned sessions`);
  }

  // Run every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateAnalytics() {
    console.log('Updating analytics...');
    // Aggregate session stats, user activity, etc.
  }
}
```

**Action Items:**
- [ ] Install `@nestjs/schedule`
- [ ] Create cleanup tasks for expired data
- [ ] Schedule analytics aggregation
- [ ] Add health check monitoring
- [ ] Log cleanup results
- [ ] Alert on cleanup failures

---

## 5. API Performance

### ⚠️ ISSUES FOUND

#### Issue #P11: No Response Compression
**Severity:** MEDIUM
**File:** `src/main.ts`

**Problem:**
```typescript
// No compression middleware
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ⚠️ Responses not compressed
  await app.listen(3000);
}
```

**Impact:**
- Transcript responses can be 50-100KB
- Dashboard responses can be 200KB+
- Mobile users on slow networks suffer
- Bandwidth costs higher

**Recommendation:**
```bash
npm install compression
```

```typescript
// main.ts
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable compression
  app.use(compression({
    filter: (req, res) => {
      // Don't compress SSE streams
      if (req.path.includes('/conversation')) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (0-9, 6 is good balance)
    threshold: 1024, // Only compress responses > 1KB
  }));

  await app.listen(3000);
}
```

**Action Items:**
- [ ] Install compression middleware
- [ ] Enable gzip compression for responses > 1KB
- [ ] Exclude SSE streams from compression
- [ ] Test compression savings (expect 70-80% reduction)
- [ ] Monitor bandwidth usage

---

#### Issue #P12: No ETag / Conditional Requests
**Severity:** LOW
**File:** API responses

**Problem:**
No ETag headers for cacheable resources:
```typescript
// Cases endpoint returns full data every time
@Get('cases')
async getCases() {
  const cases = await this.casesService.getCases();
  return { success: true, data: cases };
}
```

**Recommendation:**
```typescript
// Use NestJS interceptor for ETags
import { createHash } from 'crypto';

@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const request = context.switchToHttp().getRequest();

        // Generate ETag from response data
        const etag = createHash('md5')
          .update(JSON.stringify(data))
          .digest('hex');

        response.setHeader('ETag', `"${etag}"`);

        // Check if client has matching ETag
        const clientETag = request.headers['if-none-match'];
        if (clientETag === `"${etag}"`) {
          response.status(304);
          return null; // Don't send body
        }

        // Add cache headers
        response.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes

        return data;
      }),
    );
  }
}

// Apply to cacheable endpoints
@Get('cases')
@UseInterceptors(ETagInterceptor)
async getCases() {
  const cases = await this.casesService.getCases();
  return { success: true, data: cases };
}
```

**Action Items:**
- [ ] Create ETag interceptor
- [ ] Apply to cacheable endpoints (cases, phase metadata)
- [ ] Add Cache-Control headers
- [ ] Test 304 Not Modified responses
- [ ] Monitor cache hit rates

---

## 6. Horizontal Scaling Readiness

### ⚠️ ISSUES FOUND

#### Issue #P13: Stateful Session Management
**Severity:** HIGH
**File:** `src/ai/services/prompt.service.ts`, `src/auth/services/auth.service.ts`

**Problem:**
```typescript
// auth.service.ts (Issue #S16 - OAuth state)
private pendingStates = new Map<string, { userId?: number; expiresAt: Date }>();
// ⚠️ Stored in application memory - lost on restart, not shared across instances
```

**Impact:**
- Cannot run multiple app instances (horizontal scaling)
- OAuth state validation fails across instances
- Streaming limiter doesn't work across instances
- Each instance has separate in-memory data

**Recommendation:**
Move to Redis for shared state:

```typescript
// Install Redis client
npm install @nestjs/redis ioredis

// redis.module.ts
import { Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs/redis';

@Module({
  imports: [
    NestRedisModule.forRoot({
      config: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
    }),
  ],
})
export class RedisModule {}

// auth.service.ts
import { InjectRedis } from '@nestjs/redis';
import { Redis } from 'ioredis';

@Injectable()
export class AuthService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private userService: UserService,
  ) {}

  async generateState(userId?: number): Promise<string> {
    const state = crypto.randomBytes(32).toString('base64url');

    // Store in Redis with 10 minute expiration
    await this.redis.setex(
      `oauth:state:${state}`,
      600, // 10 minutes
      JSON.stringify({ userId, createdAt: Date.now() }),
    );

    return state;
  }

  async validateState(state: string): Promise<boolean> {
    const data = await this.redis.get(`oauth:state:${state}`);

    if (!data) {
      return false; // State doesn't exist or expired
    }

    // Delete state (one-time use)
    await this.redis.del(`oauth:state:${state}`);

    return true;
  }
}

// streaming-limiter.service.ts
@Injectable()
export class StreamingLimiterService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async acquireStreamSlot(userId: number): Promise<void> {
    // Atomic increment with TTL
    const key = `stream:user:${userId}`;
    const count = await this.redis.incr(key);

    // Set expiration on first increment
    if (count === 1) {
      await this.redis.expire(key, 300); // 5 minutes
    }

    if (count > this.MAX_CONCURRENT_STREAMS_PER_USER) {
      await this.redis.decr(key); // Roll back
      throw new TooManyRequestsException('Too many concurrent streams');
    }

    // Check global limit
    const globalKey = 'stream:global';
    const globalCount = await this.redis.incr(globalKey);

    if (globalCount === 1) {
      await this.redis.expire(globalKey, 300);
    }

    if (globalCount > this.MAX_GLOBAL_STREAMS) {
      await this.redis.decr(globalKey);
      await this.redis.decr(key);
      throw new ServiceUnavailableException('Server at capacity');
    }
  }

  async releaseStreamSlot(userId: number): Promise<void> {
    await this.redis.decr(`stream:user:${userId}`);
    await this.redis.decr('stream:global');
  }
}
```

**Action Items:**
- [ ] Install Redis
- [ ] Move OAuth state to Redis
- [ ] Move streaming limits to Redis
- [ ] Move cache to Redis (distributed cache)
- [ ] Test with multiple app instances
- [ ] Configure Redis persistence and replication

---

#### Issue #P14: No Health Check Endpoint
**Severity:** MEDIUM
**File:** N/A - Missing feature

**Problem:**
No health check for load balancer:
- Can't verify app is healthy
- No database connectivity check
- No dependency health checks (AI API, Redis)

**Recommendation:**
```bash
npm install @nestjs/terminus
```

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database health
      () => this.db.pingCheck('database', { timeout: 1000 }),

      // Memory health (heap should be < 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // RSS memory should be < 500MB
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Disk health (should have > 50% free)
      () => this.disk.checkStorage('disk', {
        path: '/',
        thresholdPercent: 0.5,
      }),

      // Custom AI API health
      async () => {
        try {
          // Ping AI API
          const isHealthy = await this.aiService.healthCheck();
          return { aiApi: { status: isHealthy ? 'up' : 'down' } };
        } catch (error) {
          return { aiApi: { status: 'down', error: error.message } };
        }
      },

      // Redis health
      async () => {
        try {
          await this.redis.ping();
          return { redis: { status: 'up' } };
        } catch (error) {
          return { redis: { status: 'down', error: error.message } };
        }
      },
    ]);
  }

  @Get('live')
  @Public()
  liveness() {
    // Simple liveness check (is the app running?)
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  readiness() {
    // Readiness check (can the app serve requests?)
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

**Action Items:**
- [ ] Install `@nestjs/terminus`
- [ ] Create health check endpoint
- [ ] Add liveness and readiness probes
- [ ] Configure load balancer to use health checks
- [ ] Monitor health check failures
- [ ] Alert on unhealthy instances

---

## 7. Load Testing & Benchmarks

### ❌ CRITICAL GAPS

**No load testing performed:**
- Unknown maximum concurrent users
- Unknown request throughput
- Unknown breaking points
- No performance baselines

---

### ⚠️ ISSUES FOUND

#### Issue #P15: No Performance Testing
**Severity:** MEDIUM
**File:** N/A - Missing testing

**Problem:**
- No load tests
- No stress tests
- No spike tests
- No endurance tests

**Recommendation:**
Create load testing suite with Artillery or k6:

```bash
npm install --save-dev artillery
```

```yaml
# load-tests/scenarios/basic.yml
config:
  target: "http://localhost:3000"
  phases:
    # Warm-up
    - duration: 60
      arrivalRate: 5
      name: "Warm-up"

    # Ramp-up
    - duration: 120
      arrivalRate: 10
      rampTo: 50
      name: "Ramp-up load"

    # Sustained load
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"

    # Spike
    - duration: 60
      arrivalRate: 100
      name: "Spike test"

  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  # Create session
  - name: "Create and run session"
    weight: 30
    flow:
      - post:
          url: "/api/auth/dev/test-token"
          capture:
            - json: "$.accessToken"
              as: "token"

      - post:
          url: "/api/sessions"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            caseId: 1

      - think: 2

  # Load dashboard
  - name: "Load dashboard"
    weight: 50
    flow:
      - post:
          url: "/api/auth/dev/test-token"
          capture:
            - json: "$.accessToken"
              as: "token"

      - get:
          url: "/api/sessions/dashboard"
          headers:
            Authorization: "Bearer {{ token }}"

  # Load cases
  - name: "Load interview cases"
    weight: 20
    flow:
      - get:
          url: "/api/cases"
```

**Run tests:**
```bash
# Run load test
artillery run load-tests/scenarios/basic.yml

# Generate report
artillery run --output report.json load-tests/scenarios/basic.yml
artillery report report.json
```

**Action Items:**
- [ ] Install Artillery or k6
- [ ] Create load test scenarios
- [ ] Run baseline performance tests
- [ ] Identify bottlenecks
- [ ] Set performance targets (req/sec, latency)
- [ ] Run tests before each release

---

## 8. Summary of Findings

### Critical Issues (Fix Before Production)
1. ✅ **Issue #P1**: No concurrency limits on AI streaming
2. ✅ **Issue #P7**: Interview cases not cached
3. ✅ **Issue #P13**: Stateful session management (no horizontal scaling)

### High Priority Issues (Fix Soon)
1. ✅ **Issue #P2**: Synchronous feedback generation blocks requests
2. ✅ **Issue #P4**: Unbounded memory growth in transcript queries
3. ✅ **Issue #P9**: No job queue for async tasks

### Medium Priority Issues (Plan to Fix)
1. ✅ **Issue #P3**: No request timeout configuration
2. ✅ **Issue #P5**: Streaming response memory leak risk
3. ✅ **Issue #P6**: No memory limits on diagram data
4. ✅ **Issue #P8**: Phase metadata recalculated every request
5. ✅ **Issue #P10**: No scheduled cleanup tasks
6. ✅ **Issue #P11**: No response compression
7. ✅ **Issue #P14**: No health check endpoint
8. ✅ **Issue #P15**: No performance testing

### Low Priority Issues (Nice to Have)
1. ✅ **Issue #P12**: No ETag / conditional requests

---

## 9. Quick Wins (Low Effort, High Impact)

1. **Add Response Compression** (15 minutes)
   - `npm install compression`
   - Enable in `main.ts`
   - 70-80% bandwidth reduction
   - **Issue:** #P11

2. **Cache Interview Cases** (1 hour)
   - `npm install @nestjs/cache-manager`
   - Cache cases for 1 hour
   - Eliminate DB queries for static data
   - **Issue:** #P7

3. **Make Phase Metadata Static** (30 minutes)
   - Freeze metadata object
   - Eliminate repeated allocations
   - **Issue:** #P8

4. **Add Request Timeouts** (30 minutes)
   - Configure in `main.ts`
   - Prevent hanging connections
   - **Issue:** #P3

5. **Add Health Check Endpoint** (1 hour)
   - Install `@nestjs/terminus`
   - Add `/health` endpoint
   - Enable load balancer health checks
   - **Issue:** #P14

6. **Add Pagination to Transcripts** (1 hour)
   - Limit queries to 100 messages
   - Reduce memory usage
   - **Issue:** #P4

---

## 10. Performance Recommendations

### Short Term (Next Sprint)
- Add concurrent stream limits (global and per-user)
- Implement caching for interview cases and user lookups
- Add request timeouts for all endpoints
- Add pagination to transcript and session queries
- Enable response compression
- Add health check endpoint for load balancer
- Configure connection pool properly

### Medium Term (Next Month)
- Migrate to Redis for distributed caching and state
- Implement Bull job queue for async tasks (feedback, email)
- Add scheduled cleanup tasks
- Add memory limits on diagram submissions
- Implement streaming disconnect cleanup
- Create load testing suite
- Run baseline performance tests
- Optimize database queries (see Phase 3)

### Long Term (Next Quarter)
- Implement horizontal scaling with multiple app instances
- Add CDN for static assets
- Implement read replicas for database
- Add APM monitoring (DataDog, New Relic)
- Implement request queuing for burst traffic
- Add auto-scaling based on metrics
- Optimize AI API usage (caching, batching)
- Implement WebSocket for real-time updates

---

## Performance Targets

### Current Estimated Performance
- **Max Concurrent Users:** ~10
- **API Response Time (p95):** ~500-1000ms
- **Dashboard Load Time:** ~800ms
- **Concurrent Streams:** Limited by DB connections (~10)
- **Requests per Second:** ~20-50

### Target Performance (After Optimizations)
- **Max Concurrent Users:** 100+
- **API Response Time (p95):** <200ms
- **Dashboard Load Time:** <100ms
- **Concurrent Streams:** 50 (with limits)
- **Requests per Second:** 500+

### Key Metrics to Monitor
- Request latency (p50, p95, p99)
- Requests per second
- Error rate
- Active connections
- Database connection pool usage
- Memory usage
- CPU usage
- Cache hit rate
- Job queue length

---

## Progress Tracking

**Total Issues:** 15
**Critical:** 3
**High:** 3
**Medium:** 8
**Low:** 1

**Completed:** 0 / 15
**In Progress:** 0 / 15
**Not Started:** 15 / 15

---

## Load Testing Scenarios

Create these test scenarios:

1. **Baseline Test**
   - 10 concurrent users
   - Measure baseline performance

2. **Load Test**
   - Ramp from 10 to 100 users over 5 minutes
   - Maintain 100 users for 10 minutes
   - Measure response times and error rates

3. **Stress Test**
   - Ramp to 200 users
   - Find breaking point
   - Identify bottlenecks

4. **Spike Test**
   - Sudden jump from 10 to 200 users
   - Test auto-scaling and recovery

5. **Endurance Test**
   - 50 users for 2 hours
   - Check for memory leaks
   - Verify connection cleanup

---

## Notes

- Performance optimization is an iterative process
- Measure before and after each optimization
- Focus on user-facing metrics (dashboard load time)
- Don't premature optimize - profile first
- Horizontal scaling requires Redis for shared state
- Load testing should be part of CI/CD pipeline

---

**Next Phase:** Once Phase 4 issues are addressed, proceed to **Phase 5: Code Quality & Best Practices Review**
