import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createE2ETestApp, closeE2ETestApp, setupE2ETest } from './e2e-helpers';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await closeE2ETestApp({ app });
  });

  beforeEach(async () => {
    const context = await setupE2ETest();
    testUserId = context.testUserId;
    authToken = context.authToken;
  });

  describe('GET /auth/status', () => {
    it('should return health check status', () => {
      return request(app.getHttpServer())
        .get('/auth/status')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('POST /auth/dev/test-token', () => {
    it('should generate test token in development', () => {
      return request(app.getHttpServer())
        .post('/auth/dev/test-token')
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user).toHaveProperty('email', 'test@example.com');
          expect(typeof res.body.accessToken).toBe('string');
        });
    });
  });

  describe('GET /auth/user', () => {
    it('should return current user info with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', testUserId);
          expect(res.body).toHaveProperty('email', 'test@example.com');
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).toHaveProperty('subscriptionStatus', 'free');
          expect(res.body).toHaveProperty('interviewsCompleted');
          expect(res.body).toHaveProperty('interviewsRemaining');
        });
    });

    it('should return 401 without authentication token', () => {
      return request(app.getHttpServer()).get('/auth/user').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/user')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });
});
