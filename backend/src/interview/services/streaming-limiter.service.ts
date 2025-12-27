import {
  Injectable,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
  Inject,
  OnModuleDestroy,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CONNECTION } from '../../redis/redis.module';

/**
 * StreamingLimiterService
 *
 * Manages concurrent stream limits to prevent resource exhaustion.
 * Tracks both global stream count and per-user stream count using Redis.
 *
 * Limits:
 * - Global: Max 50 concurrent streams across all users
 * - Per-user: Max 2 concurrent streams per user
 *
 * This prevents:
 * - Database connection pool exhaustion
 * - AI API rate limit hits
 * - Server memory exhaustion
 *
 * Redis Keys:
 * - stream:user:{userId} - Counter for active streams per user (TTL: 5 minutes)
 * - stream:global - Counter for total active streams (TTL: 5 minutes)
 */
@Injectable()
export class StreamingLimiterService implements OnModuleDestroy {
  private readonly MAX_CONCURRENT_STREAMS_PER_USER = 2;
  private readonly MAX_GLOBAL_STREAMS = 50;
  private readonly STREAM_TTL = 300; // 5 minutes in seconds

  constructor(
    @Inject(REDIS_CONNECTION) private readonly redis: Redis,
  ) {}

  onModuleDestroy() {
    // Redis connection is managed by RedisModule, no cleanup needed here
  }

  /**
   * Acquire a stream slot for a user
   * Throws if limits are exceeded
   */
  async acquireStreamSlot(userId: number): Promise<void> {
    const userKey = `stream:user:${userId}`;
    const globalKey = 'stream:global';

    // Check and increment user count atomically
    const userCount = await this.redis.incr(userKey);

    // Set expiration on first increment
    if (userCount === 1) {
      await this.redis.expire(userKey, this.STREAM_TTL);
    }

    // Check per-user limit
    if (userCount > this.MAX_CONCURRENT_STREAMS_PER_USER) {
      // Roll back the increment
      await this.redis.decr(userKey);
      throw new HttpException(
        'Maximum concurrent conversations reached. Please wait for existing conversation to complete.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check and increment global count
    const globalCount = await this.redis.incr(globalKey);

    // Set expiration on first increment
    if (globalCount === 1) {
      await this.redis.expire(globalKey, this.STREAM_TTL);
    }

    // Check global limit
    if (globalCount > this.MAX_GLOBAL_STREAMS) {
      // Roll back both increments
      await this.redis.decr(globalKey);
      await this.redis.decr(userKey);
      throw new ServiceUnavailableException(
        'Server is at capacity. Please try again in a moment.',
      );
    }

    console.log(
      `[StreamLimiter] Slot acquired for user ${userId}. User streams: ${userCount}, Global: ${globalCount}`,
    );
  }

  /**
   * Release a stream slot for a user
   */
  async releaseStreamSlot(userId: number): Promise<void> {
    const userKey = `stream:user:${userId}`;
    const globalKey = 'stream:global';

    // Decrement counters
    const userCount = await this.redis.decr(userKey);
    const globalCount = await this.redis.decr(globalKey);

    console.log(
      `[StreamLimiter] Slot released for user ${userId}. User streams: ${Math.max(0, userCount)}, Global: ${Math.max(0, globalCount)}`,
    );
  }

  /**
   * Get current stream metrics
   */
  async getMetrics() {
    const globalKey = 'stream:global';
    const globalStreams = parseInt((await this.redis.get(globalKey)) || '0', 10);

    // Count active users by scanning for user stream keys
    const keys = await this.redis.keys('stream:user:*');
    const activeUsers = keys.length;

    return {
      globalStreams,
      maxGlobalStreams: this.MAX_GLOBAL_STREAMS,
      activeUsers,
      utilizationPercent: Math.round(
        (globalStreams / this.MAX_GLOBAL_STREAMS) * 100,
      ),
    };
  }

  /**
   * Get stream count for a specific user
   */
  async getUserStreamCount(userId: number): Promise<number> {
    const userKey = `stream:user:${userId}`;
    const count = await this.redis.get(userKey);
    return count ? parseInt(count, 10) : 0;
  }
}
