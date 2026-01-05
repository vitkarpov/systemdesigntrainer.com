import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import * as schema from '../db/schema';
import { users } from '../db/schema/users.schema';
import type {
  AddCreditsEvent,
  AddCreditsResponse,
} from './types/add-credits.types';

// Secrets Manager client (reused across invocations)
let secretsClient: SecretsManagerClient | null = null;
let cachedPassword: string | null = null;

// Database connection pool (reused across warm invocations)
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Fetch database password from AWS Secrets Manager
 */
async function getDbPassword(): Promise<string> {
  if (cachedPassword) {
    return cachedPassword;
  }

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
async function initializeDb() {
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
    ssl: { rejectUnauthorized: false },
    max: 2, // Limit connections for Lambda
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  db = drizzle(pool, { schema });

  return db;
}

/**
 * Lambda handler for adding credits to a user
 */
export async function handler(
  event: AddCreditsEvent,
): Promise<AddCreditsResponse> {
  const startTime = Date.now();

  console.log('Add Credits Lambda invoked', {
    workosUserId: event.workosUserId,
    credits: event.credits,
    reason: event.reason,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate input
    if (!event.workosUserId || typeof event.workosUserId !== 'string') {
      return {
        success: false,
        error: 'workosUserId is required and must be a string',
      };
    }

    if (typeof event.credits !== 'number') {
      return {
        success: false,
        error: 'credits must be a number',
      };
    }

    // Initialize database connection
    const database = await initializeDb();

    // Find user by workosUserId
    const [user] = await database
      .select()
      .from(users)
      .where(eq(users.workosUserId, event.workosUserId))
      .limit(1);

    if (!user) {
      console.error('User not found', { workosUserId: event.workosUserId });
      return {
        success: false,
        error: `User not found with workosUserId: ${event.workosUserId}`,
      };
    }

    // Calculate new balance (ensure it doesn't go below 0)
    const previousBalance = user.interviewsRemaining;
    const newBalance = Math.max(0, previousBalance + event.credits);

    // Update user's credits
    const [updatedUser] = await database
      .update(users)
      .set({
        interviewsRemaining: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    // Log the operation
    const duration = Date.now() - startTime;
    console.log('Credits updated successfully', {
      userId: user.id,
      workosUserId: user.workosUserId,
      email: user.email,
      creditsAdded: event.credits,
      previousBalance,
      newBalance,
      reason: event.reason,
      duration,
      timestamp: updatedUser.updatedAt.toISOString(),
    });

    return {
      success: true,
      data: {
        userId: user.id,
        workosUserId: user.workosUserId,
        email: user.email,
        creditsAdded: event.credits,
        previousBalance,
        newBalance,
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error processing add credits request:', error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
