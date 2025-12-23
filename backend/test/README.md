# Backend E2E Testing Guide

This directory contains comprehensive end-to-end (E2E) tests for the backend API using Jest and Supertest.

## Overview

The E2E test suite covers:

- **Authentication** (`auth.e2e-spec.ts`) - Login, token validation, user info
- **Session Lifecycle** (`sessions.e2e-spec.ts`) - Creating sessions, starting, phase advancement, transcript management
- **Conversation & AI** (`conversation.e2e-spec.ts`) - AI-powered conversations, signal detection, red flag detection
- **Feedback Generation** (`feedback.e2e-spec.ts`) - Scoring, feedback reports, analytics

## Setup

### 1. Create Test Database

The tests use a separate database (`sd_sim_test`) to avoid polluting your development data:

```bash
# Create the test database in PostgreSQL
psql -U postgres -c "CREATE DATABASE sd_sim_test;"

# Or if using Docker:
docker exec -it <postgres-container> psql -U postgres -c "CREATE DATABASE sd_sim_test;"
```

### 2. Configure Test Environment

The tests use `.env.test` for configuration. This file is already created with sensible defaults:

```env
NODE_ENV=test
TEST_DB_NAME=sd_sim_test
JWT_SECRET=test-jwt-secret-key-for-testing-only
```

### 3. Initialize Test Database Schema

Run migrations on the test database:

```bash
cd backend
npm run db:test:setup
```

This will:
- Push the schema to `sd_sim_test` database
- Seed the test database with initial data

## Running Tests

### Run all E2E tests

```bash
npm run test:e2e
```

### Run tests in watch mode

```bash
npm run test:e2e:watch
```

### Run tests with coverage

```bash
npm run test:e2e:cov
```

### Run tests with verbose output

```bash
npm run test:e2e:verbose
```

### Run a specific test file

```bash
npm run test:e2e -- auth.e2e-spec.ts
npm run test:e2e -- sessions.e2e-spec.ts
npm run test:e2e -- conversation.e2e-spec.ts
npm run test:e2e -- feedback.e2e-spec.ts
```

## Test Structure

### Test Utilities (`test-utils.ts`)

Helper functions for test setup:

- `cleanDatabase()` - Wipes all tables for clean test state
- `seedTestData()` - Seeds minimal test data (user + interview case)
- `createTestUser()` - Factory for creating test users
- `createTestSession()` - Factory for creating test sessions
- `generateTestToken()` - Creates valid JWT tokens for authentication

### Mocks (`mocks/`)

Mock implementations for external services:

- `ai.service.mock.ts` - Mocks Anthropic AI API calls with predictable responses
- `auth.service.mock.ts` - Mocks WorkOS authentication (not currently used in E2E, but available)

### Test Database (`test-db.ts`)

Manages test database connections:

- Uses separate connection pool for test database
- Automatically closes connections after all tests
- Configured via `TEST_DB_NAME` environment variable

## Test Organization

Each test file follows this pattern:

```typescript
describe('Feature Name (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    // Create test app instance with test database
    // Override providers with test database and mocks
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database
    // Seed test data
    // Generate auth token
  });

  describe('Endpoint Group', () => {
    it('should do something', () => {
      // Test implementation
    });
  });
});
```

## What Gets Tested

### 1. Authentication Tests
- ✅ Health check endpoint
- ✅ Test token generation (dev only)
- ✅ Get current user info
- ✅ Logout functionality
- ✅ Unauthorized access (401 errors)
- ✅ Invalid token handling

### 2. Session Lifecycle Tests
- ✅ Create new session
- ✅ Start session
- ✅ Get session details
- ✅ Advance phases
- ✅ Get all phases with progress
- ✅ Get transcript messages
- ✅ Dashboard with session stats
- ✅ Session ownership verification (403 errors)
- ✅ Invalid inputs (400 errors)

### 3. Conversation & AI Tests
- ✅ Send messages and receive AI responses
- ✅ Transcript persistence
- ✅ Signal detection (requirements, scale, API, tradeoffs)
- ✅ Red flag detection (went too deep early, poor time management)
- ✅ Streaming conversation flow
- ✅ Session access control

### 4. Feedback Tests
- ✅ Generate feedback report
- ✅ Score calculation (overall, requirements, design, communication, time, depth)
- ✅ Feedback with positive signals (higher scores)
- ✅ Feedback with red flags (penalty scores)
- ✅ Retrieve existing feedback
- ✅ Feedback content validation (strengths, weaknesses, suggestions, next steps)
- ✅ Only completed sessions can get feedback
- ✅ Session ownership verification

## Key Features

### Database Isolation

Each test starts with a clean database state:

```typescript
beforeEach(async () => {
  await cleanDatabase();
  const { testUser, testCase } = await seedTestData();
});
```

### Mocked External Services

AI calls are mocked to avoid:
- Real API costs
- Network dependencies
- Flaky tests due to external service issues

```typescript
.overrideProvider(AiService)
.useValue(new MockAiService())
```

### Proper Authentication

Tests use real JWT tokens for authentication:

```typescript
const authToken = generateTestToken(userId);

request(app.getHttpServer())
  .get('/api/endpoint')
  .set('Authorization', `Bearer ${authToken}`)
```

### Session Ownership Verification

Tests verify that users can only access their own sessions:

```typescript
it('should return 403 for unauthorized access', () => {
  // Create another user's session
  // Try to access it with testUser's token
  // Expect 403 Forbidden
});
```

## CI/CD Integration

To run tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Setup test database
  run: |
    docker-compose up -d postgres
    sleep 5
    npm run db:test:setup

- name: Run E2E tests
  run: npm run test:e2e
```

## Troubleshooting

### "Database connection refused"

Make sure PostgreSQL is running:

```bash
# If using Docker Compose:
docker-compose up -d postgres

# Check it's running:
psql -h localhost -U postgres -d sd_sim_test -c "SELECT 1;"
```

### "Test database not found"

Create the test database:

```bash
psql -U postgres -c "CREATE DATABASE sd_sim_test;"
npm run db:test:setup
```

### "Tests are flaky"

Make sure tests are running in series (not parallel):

```bash
# The --runInBand flag ensures tests run sequentially
npm run test:e2e
```

### "Module not found" errors

Install dependencies:

```bash
npm install
```

## Best Practices

1. **Always clean database before each test** - Use `cleanDatabase()` in `beforeEach`
2. **Use factories** - Use `createTestUser()`, `createTestSession()` for test data
3. **Test both success and error cases** - Include 401, 403, 400, 404 tests
4. **Verify session ownership** - Always test that users can't access other users' data
5. **Mock external services** - Don't make real API calls to Anthropic, WorkOS, etc.
6. **Use meaningful test names** - Describe what the test verifies
7. **Group related tests** - Use nested `describe` blocks

## Adding New Tests

To add new E2E tests:

1. Create a new file: `test/my-feature.e2e-spec.ts`
2. Follow the existing pattern with `beforeAll`, `beforeEach`, `afterAll`
3. Override database providers with test database
4. Override external service providers with mocks
5. Clean database before each test
6. Use test utilities and factories
7. Test both success and error paths
8. Verify authentication and authorization

Example:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDatabase, seedTestData, generateTestToken } from './test-utils';
import { getTestDb } from '../src/db/test-db';
import { DATABASE_CONNECTION, DATABASE_POOL } from '../src/db/db.module';

describe('My Feature (e2e)', () => {
  let app: INestApplication;

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
    await seedTestData();
  });

  it('should work', () => {
    return request(app.getHttpServer())
      .get('/api/my-endpoint')
      .expect(200);
  });
});
```
