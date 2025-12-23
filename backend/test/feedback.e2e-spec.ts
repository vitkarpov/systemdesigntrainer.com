import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  cleanDatabase,
  seedTestData,
  generateTestToken,
  createTestSession,
} from './test-utils';
import { getTestDb } from '../src/db/test-db';
import { DATABASE_CONNECTION, DATABASE_POOL } from '../src/db/db.module';
import { eq } from 'drizzle-orm';

describe('Feedback Generation (e2e)', () => {
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
      .compile();

    app = moduleFixture.createNestApplication();
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

    // Create a completed session for feedback tests
    const session = await createTestSession(testUserId, testCaseId, {
      status: 'completed',
      currentPhase: 'wrap_up',
    });
    sessionId = session.id;

    // Set session times
    const { db } = getTestDb();
    const { interviewSessions } = await import('../src/db/schema');
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

  describe('POST /api/sessions/:id/feedback', () => {
    it('should generate feedback report for completed session', async () => {
      // Add some signals to make feedback more meaningful
      const { db } = getTestDb();
      const { interviewSignals } = await import('../src/db/schema');

      await db.insert(interviewSignals).values([
        {
          sessionId,
          signalName: 'asked_functional_reqs',
          detectedAt: new Date(Date.now() - 40 * 60 * 1000),
          phase: 'requirements',
          secondsElapsed: 5 * 60,
        },
        {
          sessionId,
          signalName: 'asked_non_functional_reqs',
          detectedAt: new Date(Date.now() - 38 * 60 * 1000),
          phase: 'requirements',
          secondsElapsed: 7 * 60,
        },
        {
          sessionId,
          signalName: 'mentioned_scale',
          detectedAt: new Date(Date.now() - 35 * 60 * 1000),
          phase: 'requirements',
          secondsElapsed: 10 * 60,
        },
        {
          sessionId,
          signalName: 'proposed_api',
          detectedAt: new Date(Date.now() - 30 * 60 * 1000),
          phase: 'high_level',
          secondsElapsed: 15 * 60,
        },
      ]);

      const response = await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('requirementsScore');
      expect(response.body.data).toHaveProperty('designScore');
      expect(response.body.data).toHaveProperty('communicationScore');
      expect(response.body.data).toHaveProperty('timeManagementScore');
      expect(response.body.data).toHaveProperty('depthScore');

      // Scores should be numbers between 0 and 100
      expect(response.body.data.overallScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.overallScore).toBeLessThanOrEqual(100);
      expect(response.body.data.requirementsScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.requirementsScore).toBeLessThanOrEqual(100);
    });

    it('should calculate higher scores with more positive signals', async () => {
      // Add comprehensive signals
      const { db } = getTestDb();
      const { interviewSignals } = await import('../src/db/schema');

      await db.insert(interviewSignals).values([
        {
          sessionId,
          signalName: 'asked_functional_reqs',
          detectedAt: new Date(),
          phase: 'requirements',
          secondsElapsed: 5 * 60,
        },
        {
          sessionId,
          signalName: 'asked_non_functional_reqs',
          detectedAt: new Date(),
          phase: 'requirements',
          secondsElapsed: 7 * 60,
        },
        {
          sessionId,
          signalName: 'clarified_constraints',
          detectedAt: new Date(),
          phase: 'requirements',
          secondsElapsed: 8 * 60,
        },
        {
          sessionId,
          signalName: 'drew_high_level_diagram',
          detectedAt: new Date(),
          phase: 'high_level',
          secondsElapsed: 15 * 60,
        },
        {
          sessionId,
          signalName: 'discussed_data_model',
          detectedAt: new Date(),
          phase: 'high_level',
          secondsElapsed: 18 * 60,
        },
        {
          sessionId,
          signalName: 'proposed_api',
          detectedAt: new Date(),
          phase: 'high_level',
          secondsElapsed: 20 * 60,
        },
        {
          sessionId,
          signalName: 'addressed_bottlenecks',
          detectedAt: new Date(),
          phase: 'deep_dive',
          secondsElapsed: 30 * 60,
        },
        {
          sessionId,
          signalName: 'mentioned_scale',
          detectedAt: new Date(),
          phase: 'requirements',
          secondsElapsed: 10 * 60,
        },
        {
          sessionId,
          signalName: 'discussed_tradeoffs',
          detectedAt: new Date(),
          phase: 'deep_dive',
          secondsElapsed: 25 * 60,
        },
        {
          sessionId,
          signalName: 'structured_approach',
          detectedAt: new Date(),
          phase: 'requirements',
          secondsElapsed: 3 * 60,
        },
      ]);

      const response = await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // With comprehensive signals, scores should be reasonably high
      expect(response.body.data.overallScore).toBeGreaterThan(50);
      expect(response.body.data.requirementsScore).toBeGreaterThan(50);
      expect(response.body.data.designScore).toBeGreaterThan(50);
    });

    it('should penalize scores with red flags', async () => {
      // Add red flags
      const { db } = getTestDb();
      const { interviewRedFlags } = await import('../src/db/schema');

      await db.insert(interviewRedFlags).values([
        {
          sessionId,
          flagName: 'went_too_deep_early',
          detectedAt: new Date(),
          phase: 'problem',
          secondsElapsed: 3 * 60,
          description: 'Discussed implementation details too early',
        },
        {
          sessionId,
          flagName: 'skipped_requirements',
          detectedAt: new Date(),
          phase: 'high_level',
          secondsElapsed: 16 * 60,
          description: 'No requirement signals detected by minute 15',
        },
      ]);

      const response = await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // Scores should be lower with red flags
      expect(response.body.data.requirementsScore).toBeLessThan(70);
    });

    it('should auto-complete session and generate feedback for in-progress session', async () => {
      const inProgressSession = await createTestSession(
        testUserId,
        testCaseId,
        {
          status: 'in_progress',
        },
      );

      const response = await request(app.getHttpServer())
        .post(`/api/sessions/${inProgressSession.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallScore');
    });

    it('should return 403 for unauthorized session access', async () => {
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../src/db/schema');

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
        .post(`/api/sessions/${otherSession.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /api/sessions/:id/feedback', () => {
    it('should get existing feedback report', async () => {
      // First generate feedback
      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then retrieve it
      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('requirementsScore');
      expect(response.body.data).toHaveProperty('designScore');
      expect(response.body.data).toHaveProperty('communicationScore');
      expect(response.body.data).toHaveProperty('timeManagementScore');
      expect(response.body.data).toHaveProperty('depthScore');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('nextSteps');

      // Verify array fields
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(Array.isArray(response.body.data.nextSteps)).toBe(true);
    });

    it('should return 404 when feedback does not exist', () => {
      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 403 for unauthorized session access', async () => {
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../src/db/schema');

      const [otherUser] = await db
        .insert(users)
        .values({
          workosUserId: 'other_user_get_feedback',
          email: 'othergetfeedback@example.com',
          name: 'Other Get Feedback User',
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
        .get(`/api/sessions/${otherSession.id}/feedback`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('Feedback Content Validation', () => {
    it('should include detailed feedback items', async () => {
      // Add diverse signals
      const { db } = getTestDb();
      const { interviewSignals } = await import('../src/db/schema');

      await db.insert(interviewSignals).values([
        {
          sessionId,
          signalName: 'asked_functional_reqs',
          detectedAt: new Date(),
          phase: 'requirements',
          secondsElapsed: 5 * 60,
        },
        {
          sessionId,
          signalName: 'structured_approach',
          detectedAt: new Date(),
          phase: 'problem',
          secondsElapsed: 2 * 60,
        },
      ]);

      // Generate and retrieve feedback
      await request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/feedback`)
        .set('Authorization', `Bearer ${authToken}`);

      // Verify feedback has content
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.nextSteps.length).toBeGreaterThan(0);

      // Check structure of feedback items
      if (response.body.data.items.length > 0) {
        const item = response.body.data.items[0];
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('description');
        expect(item).toHaveProperty('displayOrder');
        expect(['strength', 'weakness', 'suggestion']).toContain(item.type);
      }

      if (response.body.data.nextSteps.length > 0) {
        const nextStep = response.body.data.nextSteps[0];
        expect(nextStep).toHaveProperty('description');
        expect(nextStep).toHaveProperty('displayOrder');
      }
    });
  });
});
