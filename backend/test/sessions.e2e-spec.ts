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

describe('Session Lifecycle (e2e)', () => {
  let app: INestApplication;
  let testUserId: number;
  let testCaseId: number;
  let authToken: string;

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
  });

  describe('POST /api/sessions', () => {
    it('should create a new session', () => {
      return request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          caseId: testCaseId,
          companyStyle: 'faang',
          level: 'mid',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('session');
          expect(res.body.data.session).toHaveProperty('id');
          expect(res.body.data.session).toHaveProperty('status', 'not_started');
          expect(res.body.data.session).toHaveProperty('currentPhase', 'problem');
          expect(res.body.data.session).toHaveProperty('userId', testUserId);
          expect(res.body.data.session).toHaveProperty('caseId', testCaseId);
          expect(res.body.data.session).toHaveProperty('companyStyle', 'faang');
          expect(res.body.data.session).toHaveProperty('level', 'mid');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/sessions')
        .send({
          caseId: testCaseId,
          companyStyle: 'faang',
          level: 'mid',
        })
        .expect(401);
    });

    it('should return 400 with invalid caseId', () => {
      return request(app.getHttpServer())
        .post('/api/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          caseId: 99999,
          companyStyle: 'faang',
          level: 'mid',
        })
        .expect(400);
    });
  });

  describe('POST /api/sessions/:id/start', () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await createTestSession(testUserId, testCaseId);
      sessionId = session.id;
    });

    it('should start a session', () => {
      return request(app.getHttpServer())
        .post(`/api/sessions/${sessionId}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('session');
          expect(res.body.data.session).toHaveProperty('status', 'in_progress');
          expect(res.body.data.session).toHaveProperty('startedAt');
          expect(res.body.data.session.startedAt).toBeTruthy();
        });
    });

    it('should return 403 for session owned by another user', async () => {
      // Create another user's session
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../src/db/schema');

      const [otherUser] = await db
        .insert(users)
        .values({
          workosUserId: 'other_user',
          email: 'other@example.com',
          name: 'Other User',
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
          status: 'not_started',
          currentPhase: 'problem',
          companyStyle: 'faang',
          level: 'mid',
        })
        .returning();

      return request(app.getHttpServer())
        .post(`/api/sessions/${otherSession.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('GET /api/sessions/:id', () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await createTestSession(testUserId, testCaseId, {
        status: 'in_progress',
      });
      sessionId = session.id;
    });

    it('should get session details', () => {
      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('session');
          expect(res.body.data.session).toHaveProperty('id', sessionId);
          expect(res.body.data.session).toHaveProperty('status', 'in_progress');
          expect(res.body.data.session).toHaveProperty('currentPhase');
          expect(res.body.data.session).toHaveProperty('case');
          expect(res.body.data.session.case).toHaveProperty(
            'title',
            'Design a URL Shortener',
          );
        });
    });

    it('should return 403 for unauthorized access', async () => {
      const { db } = getTestDb();
      const { users, interviewSessions } = await import('../src/db/schema');

      const [otherUser] = await db
        .insert(users)
        .values({
          workosUserId: 'other_user_2',
          email: 'other2@example.com',
          name: 'Other User 2',
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
        })
        .returning();

      return request(app.getHttpServer())
        .get(`/api/sessions/${otherSession.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/sessions/:id/phase', () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await createTestSession(testUserId, testCaseId, {
        status: 'in_progress',
        currentPhase: 'problem',
      });
      sessionId = session.id;
    });

    it('should advance to next phase', () => {
      return request(app.getHttpServer())
        .patch(`/api/sessions/${sessionId}/phase`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('currentPhase', 'requirements');
          expect(res.body.data).toHaveProperty('previousPhase', 'problem');
        });
    });

    it('should return 400 when session not started', async () => {
      const notStartedSession = await createTestSession(
        testUserId,
        testCaseId,
        {
          status: 'not_started',
        },
      );

      return request(app.getHttpServer())
        .patch(`/api/sessions/${notStartedSession.id}/phase`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/sessions/:id/phases', () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await createTestSession(testUserId, testCaseId, {
        status: 'in_progress',
        currentPhase: 'requirements',
      });
      sessionId = session.id;
    });

    it('should get all phases with progress', () => {
      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/phases`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.phases)).toBe(true);
          expect(res.body.data.phases.length).toBeGreaterThan(0);

          const firstPhase = res.body.data.phases[0];
          expect(firstPhase).toHaveProperty('phase');
          expect(firstPhase).toHaveProperty('metadata');
          expect(firstPhase).toHaveProperty('isCurrent');
        });
    });
  });

  describe('GET /api/sessions/:id/transcript', () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await createTestSession(testUserId, testCaseId, {
        status: 'in_progress',
      });
      sessionId = session.id;
    });

    it('should get empty transcript for new session', () => {
      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/transcript`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.messages)).toBe(true);
          expect(res.body.data.messages.length).toBe(0);
        });
    });

    it('should get transcript with messages after conversation', async () => {
      // Add a message to the transcript
      const { db } = getTestDb();
      const { transcriptMessages } = await import('../src/db/schema');

      await db.insert(transcriptMessages).values({
        sessionId,
        role: 'candidate',
        text: 'Hello, I have a question about the requirements.',
        phase: 'problem',
        secondsElapsed: 30,
      });

      return request(app.getHttpServer())
        .get(`/api/sessions/${sessionId}/transcript`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data.messages)).toBe(true);
          expect(res.body.data.messages.length).toBe(1);
          expect(res.body.data.messages[0]).toHaveProperty('role', 'candidate');
          expect(res.body.data.messages[0]).toHaveProperty(
            'text',
            'Hello, I have a question about the requirements.',
          );
        });
    });
  });

  describe('GET /api/sessions/dashboard', () => {
    it('should get dashboard with user sessions and stats', async () => {
      // Create a few sessions
      await createTestSession(testUserId, testCaseId, {
        status: 'completed',
      });
      await createTestSession(testUserId, testCaseId, {
        status: 'in_progress',
      });

      return request(app.getHttpServer())
        .get('/api/sessions/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toHaveProperty('sessions');
          expect(res.body.data).toHaveProperty('stats');
          expect(Array.isArray(res.body.data.sessions)).toBe(true);
          expect(res.body.data.sessions.length).toBe(2);

          const stats = res.body.data.stats;
          expect(stats).toHaveProperty('totalSessions', 2);
          expect(stats).toHaveProperty('completedSessions', 1);
          expect(stats).toHaveProperty('averageScore');
        });
    });

    it('should return empty dashboard for new user', () => {
      return request(app.getHttpServer())
        .get('/api/sessions/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.sessions).toEqual([]);
          expect(res.body.data.stats.totalSessions).toBe(0);
          expect(res.body.data.stats.completedSessions).toBe(0);
        });
    });
  });
});
