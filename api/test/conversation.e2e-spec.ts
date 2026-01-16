import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { eq } from 'drizzle-orm';
import { createTestSession } from './test-utils';
import { getTestDb } from '../db/test-db';
import { createE2ETestApp, closeE2ETestApp, setupE2ETest } from './e2e-helpers';

describe('Conversation & AI Integration (e2e)', () => {
  let app: INestApplication;
  let testUserId: number;
  let testCaseId: number;
  let authToken: string;
  let sessionId: number;

  beforeAll(async () => {
    const testApp = await createE2ETestApp({
      useMockAi: true,
      useCookieParser: true,
    });
    app = testApp.app;
  });

  afterAll(async () => {
    await closeE2ETestApp({ app });
  });

  beforeEach(async () => {
    const context = await setupE2ETest();
    testUserId = context.testUserId;
    testCaseId = context.testCaseId;
    authToken = context.authToken;

    // Create and start a session for conversation tests
    const session = await createTestSession(testUserId, testCaseId, {
      status: 'in_progress',
      currentPhase: 'requirements',
    });
    sessionId = session.id;

    // Set startedAt for the session
    const { db } = getTestDb();
    const { interviewSessions } = await import('../db/schema');
    await db
      .update(interviewSessions)
      .set({ startedAt: new Date() })
      .where(eq(interviewSessions.id, sessionId));
  });

  describe('GET /sessions/:id/conversation', () => {
    it('should handle conversation and return AI response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/conversation`)
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
        .get(`/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [
          `text=I think we need to handle URL shortening and redirection.`,
        ])
        .set('Accept', 'text/event-stream');

      // Check transcript
      const transcript = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/transcript`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(transcript.body.data.messages.length).toBeGreaterThan(0);

      // Should have user message and assistant response
      const userMessage = transcript.body.data.messages.find(
        (m: any) => m.role === 'candidate',
      );
      const assistantMessage = transcript.body.data.messages.find(
        (m: any) => m.role === 'interviewer',
      );

      expect(userMessage).toBeDefined();
      expect(userMessage.text).toContain('URL shortening');
      expect(assistantMessage).toBeDefined();
    });

    it('should return 400 without text parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept', 'text/event-stream');

      // Should get an error event
      expect(response.status).toBe(200); // SSE always returns 200
      expect(response.text).toContain('error');
      expect(response.text).toContain('text parameter is required');
    });

    it('should return 403 for unauthorized session access', async () => {
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../db/schema');

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
        .get(`/sessions/${otherSession.id}/conversation`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('Cookie', [`text=Hello`])
        .set('Accept', 'text/event-stream');

      // Should get an error event for forbidden access
      expect(response.status).toBe(200); // SSE always returns 200
      expect(response.text).toContain('error');
      expect(response.text).toContain('do not have access');
    });
  });
});
