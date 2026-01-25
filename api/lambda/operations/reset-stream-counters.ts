import Redis from 'ioredis';
import type {
  ResetStreamCountersPayload,
  ResetStreamCountersResponse,
  StreamCounterInfo,
} from '../types/operations.types';
import type { Database } from '../db-connection';

/**
 * Diagnose and reset corrupted stream counters in Redis
 *
 * This operation helps debug rate limiting issues caused by double-release bugs
 * or other counter corruption. It can scan all stream counters and optionally
 * reset negative or suspicious values.
 */
export async function resetStreamCounters(
  db: Database,
  payload: ResetStreamCountersPayload,
): Promise<ResetStreamCountersResponse> {
  const startTime = Date.now();

  console.log('Executing reset-stream-counters operation', {
    fix: payload.fix || false,
    userId: payload.userId,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });

  try {
    const shouldFix = payload.fix || false;
    const MAX_STREAMS_PER_USER = 2;

    // Get all user stream keys (or specific user if provided)
    const pattern = payload.userId
      ? `stream:user:${payload.userId}`
      : 'stream:user:*';
    const keys = await redis.keys(pattern);

    console.log(`Found ${keys.length} stream counter(s) matching pattern: ${pattern}`);

    if (keys.length === 0) {
      await redis.quit();
      return {
        success: true,
        operation: 'reset-stream-counters',
        data: {
          totalCounters: 0,
          issuesFound: 0,
          countersReset: 0,
          counters: [],
          dryRun: !shouldFix,
        },
      };
    }

    const counters: StreamCounterInfo[] = [];
    let issuesFound = 0;
    let countersReset = 0;

    for (const key of keys) {
      const userId = key.split(':')[2];
      const countStr = await redis.get(key);
      const count = countStr ? parseInt(countStr, 10) : 0;
      const ttl = await redis.ttl(key);

      // Check for issues
      const isNegative = count < 0;
      const isSuspicious = count > MAX_STREAMS_PER_USER;
      const hasIssue = isNegative || isSuspicious;

      if (hasIssue) {
        issuesFound++;
      }

      let wasReset = false;

      // Reset if fix mode is enabled and there's an issue
      if (shouldFix && hasIssue) {
        await redis.del(key);
        wasReset = true;
        countersReset++;
        console.log(`Reset counter for user ${userId} (was: ${count}, now: 0)`);
      }

      counters.push({
        userId,
        count,
        ttl,
        isNegative,
        isSuspicious,
        wasReset,
      });
    }

    await redis.quit();

    const duration = Date.now() - startTime;
    console.log('Stream counters operation completed', {
      totalCounters: keys.length,
      issuesFound,
      countersReset,
      dryRun: !shouldFix,
      duration,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      operation: 'reset-stream-counters',
      data: {
        totalCounters: keys.length,
        issuesFound,
        countersReset,
        counters,
        dryRun: !shouldFix,
      },
    };
  } catch (error) {
    console.error('Error in reset-stream-counters operation:', error);

    // Ensure Redis connection is closed on error
    try {
      await redis.quit();
    } catch (quitError) {
      console.error('Error closing Redis connection:', quitError);
    }

    return {
      success: false,
      operation: 'reset-stream-counters',
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
