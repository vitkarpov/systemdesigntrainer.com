import { closeTestDb } from '../src/db/test-db';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.test or .env
const envPath = resolve(__dirname, '../.env.test');
dotenv.config({ path: envPath });

// If .env.test doesn't exist, fallback to .env
if (!process.env.TEST_DB_NAME) {
  dotenv.config({ path: resolve(__dirname, '../.env') });
  // Override database name for tests
  process.env.TEST_DB_NAME = 'sd_sim_test';
}

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure JWT_SECRET is set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key';
}

// Close database connection after all tests
afterAll(async () => {
  await closeTestDb();
});
