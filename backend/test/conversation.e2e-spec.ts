import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import {
  cleanDatabase,
  seedTestData,
  generateTestToken,
  createTestSession,
} from './test-utils';
import { getTestDb } from '../src/db/test-db';
import { DATABASE_CONNECTION, DATABASE_POOL } from '../src/db/db.module';
import { AiService } from '../src/ai/services/ai.service';
import { MockAiService } from './mocks/ai.service.mock';

describe('Conversation & AI Integration (e2e)', () => {
  let app: INestApplication;
  let testUserId: number;
  let testCaseId: number;
  let authToken: string;
  let sessionId: number;

  beforeAll(async () => {
    const { db, pool } = getTestDb();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue(db)
      .overrideProvider(DATABASE_POOL)
      .useValue(pool)
      .overrideProvider(AiService)
      .useValue(new MockAiService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await cleanDatabase();
    const { testUser, testCase } = await seedTestData();
    testUserId = testUser.id;
    testCaseId = testCase.id;
    authToken = generateTestToken(testUserId);

    // Create and start a session for conversation tests
    const session = await createTestSession(testUserId, testCaseId, {
      status: 'in_progress',
      currentPhase: 'requirements',
    });
    sessionId = session.id;

    // Set startedAt for the session
    const { db } = getTestDb();
    const { interviewSessions } = await import('../src/db/schema');
    await db
      .update(interviewSessions)
      .set({ startedAt: new Date() })
      .where(require('drizzle-orm').eq(interviewSessions.id, sessionId));
  });

  describe('GET /api/sessions/:id/conversation', () => {
    it('should handle conversation and return AI response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=What are the key functional requirements?`])
        .set('Accept', 'text/event-stream');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');

      // Check that we received some data
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should save messages to transcript', async () => {
      await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=I think we need to handle URL shortening and redirection.`])
        .set('Accept', 'text/event-stream');

      // Check transcript
      const transcript = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/transcript`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(transcript.body.data.messages.length).toBeGreaterThan(0);

      // Should have user message and assistant response
      const userMessage = transcript.body.data.messages.find((m: any) => m.role === 'candidate');
      const assistantMessage = transcript.body.data.messages.find((m: any) => m.role === 'interviewer');

      expect(userMessage).toBeDefined();
      expect(userMessage.text).toContain('URL shortening');
      expect(assistantMessage).toBeDefined();
    });

    it('should return 400 without text parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      // Should get an error event
      expect(response.status).toBe(200); // SSE always returns 200
      expect(response.text).toContain('error');
      expect(response.text).toContain('text parameter is required');
    });

    it('should return 403 for unauthorized session access', async () => {
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../src/db/schema');

      const [otherUser] = await db
        .insert(users)
        .values({
          workosUserId: 'other_user_conv',
          email: 'otherconv@example.com',
          name: 'Other Conv User',
          subscriptionStatus: 'free',
          interviewsCompleted: 0,
          interviewsRemaining: 1,
        })
        .returning();

      const [otherSession] = await db
        .insert(interviewSessions)
        .values({
          userId: otherUser.id,
          caseId: testCaseId,
          status: 'in_progress',
          currentPhase: 'problem',
          companyStyle: 'faang',
          level: 'mid',
          startedAt: new Date(),
        })
        .returning();

      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${otherSession.id}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=Hello`])
        .set('Accept', 'text/event-stream');

      // Should get an error event for forbidden access
      expect(response.status).toBe(200); // SSE always returns 200
      expect(response.text).toContain('error');
      expect(response.text).toContain('do not have access');
    });
  });

  describe('Signal Detection', () => {
    it('should detect requirement signals', async () => {
      // Send message with requirement keywords
      await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=Let me clarify the functional requirements: we need URL shortening, redirection, and basic analytics. For non-functional requirements, we need to handle scale of 1 million users and ensure high availability.`])
        .set('Accept', 'text/event-stream');

      // Wait a bit for signal detection to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check detected signals
      const signals = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/signals`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(signals.body.success).toBe(true);
      expect(Array.isArray(signals.body.data.signals)).toBe(true);

      // Should have detected multiple signals
      const signalTypes = signals.body.data.signals.map((s: any) => s.signalName);
      expect(signalTypes).toContain('asked_functional_reqs');
    });

    it('should detect scale and API signals', async () => {
      await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=We should design a REST API with POST /shorten endpoint. The system needs to handle 10,000 requests per second.`])
        .set('Accept', 'text/event-stream');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const signals = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/signals`)
        .set('Authorization', `Bearer ${authToken}`);

      const signalTypes = signals.body.data.signals.map((s: any) => s.signalName);
      expect(signalTypes).toContain('mentioned_scale');
      expect(signalTypes).toContain('proposed_api');
    });

    it('should detect tradeoffs discussion', async () => {
      await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=There is a trade-off between consistency and availability. We could use SQL vs NoSQL database.`])
        .set('Accept', 'text/event-stream');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const signals = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/signals`)
        .set('Authorization', `Bearer ${authToken}`);

      const signalTypes = signals.body.data.signals.map((s: any) => s.signalName);
      expect(signalTypes).toContain('discussed_tradeoffs');
    });
  });

  describe('Red Flag Detection', () => {
    it('should detect implementation details in early phase', async () => {
      // Move back to problem phase
      const { db } = getTestDb();
      const { interviewSessions } = await import('../src/db/schema');
      await db
        .update(interviewSessions)
        .set({ currentPhase: 'problem' })
        .where(require('drizzle-orm').eq(interviewSessions.id, sessionId));

      // Send message with implementation details
      await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=I would implement this with a class URLShortener that has a function generateShortUrl() using a for loop to iterate through characters.`])
        .set('Accept', 'text/event-stream');

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check red flags
      const redFlags = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/red-flags`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(redFlags.body.success).toBe(true);
      expect(Array.isArray(redFlags.body.data.redFlags)).toBe(true);

      const flagTypes = redFlags.body.data.redFlags.map((f: any) => f.flagName);
      expect(flagTypes).toContain('went_too_deep_early');
    });

    it('should detect poor time management', async () => {
      // Set session to have started 11 minutes ago, still in problem phase
      const { db } = getTestDb();
      const { interviewSessions } = await import('../src/db/schema');
      const elevenMinutesAgo = new Date(Date.now() - 11 * 60 * 1000);

      await db
        .update(interviewSessions)
        .set({
          startedAt: elevenMinutesAgo,
          currentPhase: 'problem'
        })
        .where(require('drizzle-orm').eq(interviewSessions.id, sessionId));

      // Trigger red flag check by sending a message
      await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=Let me continue thinking about this problem...`])
        .set('Accept', 'text/event-stream');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const redFlags = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/red-flags`)
        .set('Authorization', `Bearer ${authToken}`);

      const flagTypes = redFlags.body.data.redFlags.map((f: any) => f.flagName);
      expect(flagTypes).toContain('poor_time_management');
    });
  });

  describe('GET /api/sessions/:id/signals', () => {
    it('should return empty signals for new session', () => {
      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/signals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.signals)).toBe(true);
          expect(res.body.data.signals.length).toBe(0);
        });
    });
  });

  describe('GET /api/sessions/:id/red-flags', () => {
    it('should return empty red flags for new session', () => {
      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/red-flags`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.redFlags)).toBe(true);
          expect(res.body.data.redFlags.length).toBe(0);
        });
    });
  });
});
