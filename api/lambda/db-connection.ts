import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import * as schema from '../db/schema';

// Secrets Manager client (reused across invocations)
let secretsClient: SecretsManagerClient | null = null;
let cachedPassword: string | null = null;

// Database connection pool (reused across warm invocations)
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

export type Database = NonNullable<typeof db>;

/**
 * Fetch database password from AWS Secrets Manager or environment variable
 */
async function getDbPassword(): Promise<string> {
  if (cachedPassword) {
    return cachedPassword;
  }

  // For local development, allow direct password via environment variable
  if (process.env.USE_DIRECT_PASSWORD === 'true') {
    const password = process.env.DB_PASSWORD;
    if (!password) {
      throw new Error(
        'DB_PASSWORD environment variable not set (USE_DIRECT_PASSWORD=true)',
      );
    }
    cachedPassword = password;
    return password;
  }

  // Production: Use AWS Secrets Manager
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'eu-west-1',
    });
  }

  const secretArn = process.env.DB_PASSWORD_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DB_PASSWORD_SECRET_ARN environment variable not set');
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretArn,
    });

    const response = await secretsClient.send(command);

    if (!response.SecretString) {
      throw new Error('Secret value is empty');
    }

    // Parse the secret JSON and extract the password
    const secret = JSON.parse(response.SecretString);
    const password = secret.password || secret.DB_PASSWORD;

    if (!password) {
      throw new Error('Password field not found in secret');
    }

    cachedPassword = password;
    return password;
  } catch (error) {
    console.error(
      'Failed to retrieve database password from Secrets Manager:',
      error,
    );
    throw new Error('Failed to retrieve database credentials');
  }
}

/**
 * Initialize database connection (reused across invocations)
 */
export async function initializeDb(): Promise<Database> {
  if (db && pool) {
    return db;
  }

  const dbPassword = await getDbPassword();

  pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: dbPassword,
    database: process.env.DB_NAME,
    // Only use SSL in production (not for local docker development)
    ssl:
      process.env.USE_DIRECT_PASSWORD === 'true'
        ? false
        : { rejectUnauthorized: false },
    max: 2, // Limit connections for Lambda
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  db = drizzle(pool, { schema });

  return db;
}
