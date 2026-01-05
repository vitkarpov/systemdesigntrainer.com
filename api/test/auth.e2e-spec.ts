import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDatabase, seedTestData, generateTestToken } from './test-utils';
import { getTestDb } from '../src/db/test-db';
import { DATABASE_CONNECTION, DATABASE_POOL } from '../src/db/db.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let testUserId: number;
  let authToken: string;

  beforeAll(async () => {
    // Override database providers with test database
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
    const { testUser } = await seedTestData();
    testUserId = testUser.id;
    authToken = generateTestToken(testUserId);
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

  describe('POST /auth/logout', () => {
    it('should logout successfully with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('message', 'Logged out successfully');
        });
    });

    it('should return 401 without authentication token', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});
