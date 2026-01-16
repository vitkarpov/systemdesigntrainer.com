import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { AppModule } from '../src/app.module';
import { getTestDb } from '../db/test-db';
import { DATABASE_CONNECTION, DATABASE_POOL } from '../db/db.module';
import {
  cleanDatabase,
  cleanQueue,
  seedTestData,
  generateTestToken,
} from './test-utils';

export interface E2ETestAppOptions {
  useCookieParser?: boolean;
  includeFeedbackQueue?: boolean;
}

export interface E2ETestApp {
  app: INestApplication;
  feedbackQueue?: Queue;
}

export interface E2ETestContext {
  testUserId: number;
  testCaseId: number;
  authToken: string;
}

/**
 * Creates and initializes a test application with common setup
 */
export async function createE2ETestApp(
  options: E2ETestAppOptions = {},
): Promise<E2ETestApp> {
  const {
    useCookieParser = false,
    includeFeedbackQueue = false,
  } = options;
  const { db, pool } = getTestDb();

  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DATABASE_CONNECTION)
    .useValue(db)
    .overrideProvider(DATABASE_POOL)
    .useValue(pool);

  const moduleFixture: TestingModule = await moduleBuilder.compile();

  const app = moduleFixture.createNestApplication();

  if (useCookieParser) {
    app.use(cookieParser());
  }

  app.enableShutdownHooks();
  await app.init();

  const result: E2ETestApp = { app };

  if (includeFeedbackQueue) {
    result.feedbackQueue = app.get<Queue>(getQueueToken('feedback'));
  }

  return result;
}

/**
 * Closes the test application and any associated resources
 */
export async function closeE2ETestApp(testApp: E2ETestApp): Promise<void> {
  if (testApp.feedbackQueue) {
    await testApp.feedbackQueue.close();
  }
  if (testApp.app) {
    await testApp.app.close();
  }
}

/**
 * Performs common beforeEach setup: clean database, seed data, generate token
 */
export async function setupE2ETest(
  options: { cleanFeedbackQueue?: Queue } = {},
): Promise<E2ETestContext> {
  // Clean queue BEFORE cleaning database to prevent race conditions
  if (options.cleanFeedbackQueue) {
    await cleanQueue(options.cleanFeedbackQueue);
  }

  await cleanDatabase();
  const { testUser, testCase } = await seedTestData();
  const testUserId = testUser.id;
  const testCaseId = testCase.id;
  const authToken = generateTestToken(testUserId);

  return { testUserId, testCaseId, authToken };
}
