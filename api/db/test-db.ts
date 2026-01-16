import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create test database connection pool
// Use separate database for testing to avoid polluting dev data
export function createTestDbConnection() {
  const pool = new Pool({
    host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || process.env.DB_PORT || '5432'),
    user: process.env.TEST_DB_USER || process.env.DB_USER || 'postgres',
    password:
      process.env.TEST_DB_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'sd_sim_test',
    ssl: false,
  });

  const db = drizzle(pool, { schema });

  return { db, pool };
}

// Singleton for test database connection
let testDbInstance: { db: ReturnType<typeof drizzle>; pool: Pool } | null =
  null;

export function getTestDb() {
  if (!testDbInstance) {
    testDbInstance = createTestDbConnection();
  }
  return testDbInstance;
}

export async function closeTestDb() {
  if (testDbInstance) {
    // End the pool and wait for all connections to close
    await testDbInstance.pool.end();
    testDbInstance = null;
  }
}

// Force close all connections (useful for cleanup between test files)
export async function resetTestDb() {
  if (testDbInstance) {
    await testDbInstance.pool.end();
    testDbInstance = null;
  }
}
