import { getTestDb } from '../src/db/test-db';
import {
  users,
  interviewCases,
  interviewCaseExpectations,
  interviewCaseTags,
  interviewSessions,
  transcriptMessages,
  interviewSignals,
  interviewRedFlags,
  diagramSnapshots,
  diagramElements,
  feedbackReports,
  feedbackItems,
  feedbackNextSteps,
} from '../src/db/schema';

/**
 * Clean all tables in the test database
 * Call this in beforeEach or beforeAll to ensure clean state
 */
export async function cleanDatabase() {
  const { db } = getTestDb();

  // Delete in order respecting foreign key constraints
  await db.delete(diagramElements);
  await db.delete(diagramSnapshots);
  await db.delete(feedbackItems);
  await db.delete(feedbackNextSteps);
  await db.delete(feedbackReports);
  await db.delete(interviewSignals);
  await db.delete(interviewRedFlags);
  await db.delete(transcriptMessages);
  await db.delete(interviewSessions);
  await db.delete(interviewCaseTags);
  await db.delete(interviewCaseExpectations);
  await db.delete(interviewCases);
  await db.delete(users);
}

/**
 * Seed minimal test data for tests
 */
export async function seedTestData() {
  const { db } = getTestDb();

  // Create test user
  const [testUser] = await db
    .insert(users)
    .values({
      workosUserId: 'test_user_123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      subscriptionStatus: 'free',
      interviewsCompleted: 0,
      interviewsRemaining: 1,
    })
    .returning();

  // Create test interview case
  const [testCase] = await db
    .insert(interviewCases)
    .values({
      title: 'Design a URL Shortener',
      slug: 'url-shortener',
      description:
        'Design a scalable URL shortening service like bit.ly or TinyURL',
      difficulty: 'medium',
      problemStatement: `Design a URL shortening service that allows users to:
- Submit long URLs and receive short, unique codes
- Redirect users from short URLs to the original long URLs
- Track basic analytics (click counts)

You can discuss any relevant system design aspects as you see fit.`,
      estimatedDuration: 45,
      isActive: true,
    })
    .returning();

  // Add expectations
  const expectations = [
    {
      caseId: testCase.id,
      expectationType: 'requirements',
      description:
        'Clarify functional requirements (URL generation, redirection, analytics)',
      displayOrder: 1,
    },
    {
      caseId: testCase.id,
      expectationType: 'requirements',
      description:
        'Clarify non-functional requirements (latency, scale, availability)',
      displayOrder: 2,
    },
    {
      caseId: testCase.id,
      expectationType: 'api',
      description:
        'Define REST API endpoints (POST /shorten, GET /{shortCode})',
      displayOrder: 3,
    },
  ];

  await db.insert(interviewCaseExpectations).values(expectations);

  // Add tags
  const tags = [
    { caseId: testCase.id, tag: 'web-services' },
    { caseId: testCase.id, tag: 'scalability' },
  ];

  await db.insert(interviewCaseTags).values(tags);

  return { testUser, testCase };
}

/**
 * Factory for creating test users
 */
export async function createTestUser(
  overrides: Partial<{
    workosUserId: string;
    email: string;
    name: string;
    subscriptionStatus: string;
    interviewsCompleted: number;
    interviewsRemaining: number;
  }> = {},
) {
  const { db } = getTestDb();

  const [user] = await db
    .insert(users)
    .values({
      workosUserId: overrides.workosUserId || `test_user_${Date.now()}`,
      email: overrides.email || `test${Date.now()}@example.com`,
      name: overrides.name || 'Test User',
      avatarUrl: null,
      subscriptionStatus: overrides.subscriptionStatus || 'free',
      interviewsCompleted: overrides.interviewsCompleted ?? 0,
      interviewsRemaining: overrides.interviewsRemaining ?? 1,
    })
    .returning();

  return user;
}

/**
 * Factory for creating test interview sessions
 */
export async function createTestSession(
  userId: number,
  caseId: number,
  overrides: Partial<{
    status: string;
    currentPhase: string;
    companyStyle: string;
    level: string;
  }> = {},
) {
  const { db } = getTestDb();

  const [session] = await db
    .insert(interviewSessions)
    .values({
      userId,
      caseId,
      status: overrides.status || 'not_started',
      currentPhase: overrides.currentPhase || 'problem',
      companyStyle: overrides.companyStyle || 'faang',
      level: overrides.level || 'mid',
    })
    .returning();

  return session;
}

/**
 * Generate a test JWT token for authentication
 */
export function generateTestToken(userId: number): string {
  const jwt = require('jsonwebtoken');
  const payload = {
    userId: userId,
    workosUserId: `test_user_123`,
    email: `test@example.com`,
  };
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h',
  });
}
