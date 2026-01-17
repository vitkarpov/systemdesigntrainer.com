import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestSession } from './test-utils';
import { getTestDb } from '../db/test-db';
import { eq } from 'drizzle-orm';
import { Queue } from 'bull';
import { createE2ETestApp, closeE2ETestApp, setupE2ETest } from './e2e-helpers';

describe('Feedback Generation (e2e)', () => {
  let app: INestApplication;
  let testUserId: number;
  let testCaseId: number;
  let authToken: string;
  let sessionId: number;
  let feedbackQueue: Queue;

  beforeAll(async () => {
    const testApp = await createE2ETestApp({
      includeFeedbackQueue: true,
    });
    app = testApp.app;
    feedbackQueue = testApp.feedbackQueue!;
  });

  afterAll(async () => {
    await closeE2ETestApp({ app, feedbackQueue });
  });

  beforeEach(async () => {
    const context = await setupE2ETest({
      cleanFeedbackQueue: feedbackQueue,
    });
    testUserId = context.testUserId;
    testCaseId = context.testCaseId;
    authToken = context.authToken;

    // Create a completed session for feedback tests
    const session = await createTestSession(testUserId, testCaseId, {
      status: 'completed',
      currentPhase: 'wrap_up',
    });
    sessionId = session.id;

    // Set session times
    const { db } = getTestDb();
    const { interviewSessions } = await import('../db/schema');
    const now = new Date();
    const startTime = new Date(now.getTime() - 45 * 60 * 1000); // 45 minutes ago

    await db
      .update(interviewSessions)
      .set({
        startedAt: startTime,
        completedAt: now,
      })
      .where(eq(interviewSessions.id, sessionId));
  });

  // Helper function to wait for feedback job completion
  async function waitForFeedbackCompletion(
    sessionId: number,
    authToken: string,
    maxAttempts = 60,
  ): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/feedback/status`)
        .set('Authorization', `Bearer ${authToken}`);

      if (statusResponse.body.data.status === 'completed') {
        // Fetch the actual feedback data from the feedback endpoint
        const feedbackResponse = await request(app.getHttpServer())
          .get(`/sessions/${sessionId}/feedback`)
          .set('Authorization', `Bearer ${authToken}`);
        return feedbackResponse.body.data;
      }

      if (statusResponse.body.data.status === 'failed') {
        throw new Error('Feedback generation failed');
      }

      // Wait 1000ms before next check
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error('Feedback generation timed out');
  }

  describe('POST /sessions/:id/feedback', () => {
    it('should grade well-performed interview', async () => {
      const { db } = getTestDb();
      const { transcriptMessages } = await import('../db/schema');

      await db.insert(transcriptMessages).values([
        {
          sessionId,
          role: 'interviewer',
          text: "Let's design a URL shortener service like bit.ly. Please proceed with your approach.",
          phase: 'problem',
          secondsElapsed: 30,
        },
        {
          sessionId,
          role: 'candidate',
          text: "Great! I'd like to take a structured approach. Let me start by clarifying the requirements, then move to high-level design, and finally dive deep into key components.",
          phase: 'requirements',
          secondsElapsed: 3 * 60,
        },
        {
          sessionId,
          role: 'candidate',
          text: 'First, let me ask about the functional requirements. Should the system support custom short URLs or only auto-generated ones? Do we need analytics on click-through rates? What about expiration of URLs?',
          phase: 'requirements',
          secondsElapsed: 5 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: 'Auto-generated URLs are fine. Analytics would be nice but not critical. No expiration needed.',
          phase: 'requirements',
          secondsElapsed: 5 * 60 + 30,
        },
        {
          sessionId,
          role: 'candidate',
          text: 'Perfect. Now for non-functional requirements - what kind of latency are we targeting for redirects? What about availability? And how many requests per second should we handle?',
          phase: 'requirements',
          secondsElapsed: 7 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: "Aim for sub-100ms latency, 99.9% availability, and let's say 10,000 requests per second.",
          phase: 'requirements',
          secondsElapsed: 7 * 60 + 45,
        },
        {
          sessionId,
          role: 'candidate',
          text: 'Got it. Let me also clarify some constraints. Are there any restrictions on the technology stack? What about the short URL length - should it be as short as possible? Are there any regulatory compliance requirements?',
          phase: 'requirements',
          secondsElapsed: 8 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: 'Technology is flexible. Short URLs should be 6-8 characters. No special compliance needs.',
          phase: 'requirements',
          secondsElapsed: 8 * 60 + 30,
        },
        {
          sessionId,
          role: 'candidate',
          text: "One more important question about scale - how many URLs do we expect to shorten per day? And what's the expected storage requirement over say, 5 years?",
          phase: 'requirements',
          secondsElapsed: 10 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: "Let's plan for 10 million new URLs per day.",
          phase: 'requirements',
          secondsElapsed: 10 * 60 + 20,
        },
        {
          sessionId,
          role: 'candidate',
          text: "Perfect. Now let me draw a high-level architecture diagram. We'll have clients at the top, then a load balancer, followed by application servers for shortening and redirecting. Behind that, we'll have a database for storing URL mappings, and potentially a cache layer for frequently accessed URLs.",
          phase: 'high_level',
          secondsElapsed: 15 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: 'Good start. Tell me more about the data model.',
          phase: 'high_level',
          secondsElapsed: 16 * 60,
        },
        {
          sessionId,
          role: 'candidate',
          text: "For the data model, we'll have a main table with columns: short_code (indexed, unique), original_url, created_at, and optionally user_id if we support user accounts. The short_code will be our primary key for fast lookups during redirects.",
          phase: 'high_level',
          secondsElapsed: 18 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: 'How about the API design?',
          phase: 'high_level',
          secondsElapsed: 19 * 60,
        },
        {
          sessionId,
          role: 'candidate',
          text: 'For the API, I propose two main endpoints: POST /api/shorten with the long URL in the body, returning the short URL. And GET /{shortCode} which redirects to the original URL with a 301 or 302 status. We might also add GET /api/stats/{shortCode} for analytics.',
          phase: 'high_level',
          secondsElapsed: 20 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: "Let's dive deeper into the redirect path. What potential issues do you see?",
          phase: 'deep_dive',
          secondsElapsed: 22 * 60,
        },
        {
          sessionId,
          role: 'candidate',
          text: "Good question. There are important tradeoffs to consider. For caching, we could use Redis with a TTL, which would speed up popular URLs but might serve stale data if URLs are updated. For the database, we could use SQL for consistency or NoSQL for better scalability, but that's a tradeoff between ACID guarantees and horizontal scaling. For the short code generation, we could use hashing which is fast but might have collisions, or use a counter-based approach which is collision-free but requires coordination.",
          phase: 'deep_dive',
          secondsElapsed: 25 * 60,
        },
        {
          sessionId,
          role: 'interviewer',
          text: 'What about bottlenecks at scale?',
          phase: 'deep_dive',
          secondsElapsed: 28 * 60,
        },
        {
          sessionId,
          role: 'candidate',
          text: "The main bottleneck would be database reads during redirects. To address this, I'd implement a multi-tier caching strategy: browser caching with appropriate headers, CDN caching for geographic distribution, and Redis caching at the application level. We could also use database read replicas to distribute the load. For writes during URL creation, we could use database sharding based on the short code prefix to distribute the load.",
          phase: 'deep_dive',
          secondsElapsed: 30 * 60,
        },
      ]);

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      const feedback = await waitForFeedbackCompletion(sessionId, authToken);

      expect(feedback.overallSummary).toContain('HIRE');
      expect(feedback.overallScore).toBeGreaterThan(50);
      expect(feedback.requirementsScore).toBeGreaterThan(50);
      expect(feedback.designScore).toBeGreaterThan(50);

      await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect({ data: feedback });
    });

    it('should grade poorly-performed interview', async () => {
      const { db } = getTestDb();
      const { transcriptMessages } = await import('../db/schema');

      await db.insert(transcriptMessages).values([
        {
          sessionId,
          role: 'interviewer',
          text: "Let's design a URL shortener. Please proceed.",
          phase: 'problem',
          secondsElapsed: 10,
        },
        {
          sessionId,
          role: 'candidate',
          text: "I don't know how to design a URL shortener. Bye!",
          phase: 'problem',
          secondsElapsed: 30,
        },
      ]);

      await request(app.getHttpServer())
        .post(`/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      const feedback = await waitForFeedbackCompletion(sessionId, authToken);

      expect(feedback.overallSummary).toContain('NO HIRE');
      expect(feedback.requirementsScore).toBeLessThan(70);

      await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect({ data: feedback });
    });

    it('should return 403 for unauthorized session access', async () => {
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../db/schema');

      const [otherUser] = await db
        .insert(users)
        .values({
          workosUserId: 'other_user_feedback',
          email: 'otherfeedback@example.com',
          name: 'Other Feedback User',
          subscriptionStatus: 'free',
          interviewsCompleted: 1,
          interviewsRemaining: 0,
        })
        .returning();

      const [otherSession] = await db
        .insert(interviewSessions)
        .values({
          userId: otherUser.id,
          caseId: testCaseId,
          status: 'completed',
          currentPhase: 'wrap_up',
          companyStyle: 'faang',
          level: 'mid',
          startedAt: new Date(Date.now() - 45 * 60 * 1000),
          completedAt: new Date(),
        })
        .returning();

      return request(app.getHttpServer())
        .post(`/sessions/${otherSession.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });
});
