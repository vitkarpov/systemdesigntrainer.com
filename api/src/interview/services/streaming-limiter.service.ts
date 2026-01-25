import {
  Injectable,
  HttpException,
  HttpStatus,
  Inject,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CONNECTION } from '../../redis/redis.module';

/**
 * StreamingLimiterService
 *
 * Manages concurrent stream limits to prevent resource exhaustion.
 * Tracks per-user stream count using Redis.
 *
 * Limits:
 * - Per-user: Max 2 concurrent streams per user
 *
 * This prevents:
 * - Database connection pool exhaustion
 * - AI API rate limit hits
 * - Server memory exhaustion
 *
 * Redis Keys:
 * - stream:user:{userId} - Counter for active streams per user (TTL: 5 minutes)
 */
@Injectable()
export class StreamingLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(StreamingLimiterService.name);
  private readonly MAX_CONCURRENT_STREAMS_PER_USER = 2;
  private readonly STREAM_TTL = 300; // 5 minutes in seconds

  constructor(@Inject(REDIS_CONNECTION) private readonly redis: Redis) {}

  onModuleDestroy() {
    // Redis connection is managed by RedisModule, no cleanup needed here
  }

  /**
   * Acquire a stream slot for a user
   * Throws if limits are exceeded
   */
  async acquireStreamSlot(userId: number): Promise<void> {
    const userKey = `stream:user:${userId}`;

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

    this.logger.log(
      `Slot acquired for user ${userId}. User streams: ${userCount}`,
    );
  }

  /**
   * Release a stream slot for a user
   */
  async releaseStreamSlot(userId: number): Promise<void> {
    const userKey = `stream:user:${userId}`;

    // Get current count before decrementing
    const currentCount = await this.redis.get(userKey);
    const count = currentCount ? parseInt(currentCount, 10) : 0;

    // Only decrement if counter is positive (prevents negative counts from double-release bugs)
    if (count > 0) {
      const userCount = await this.redis.decr(userKey);
      this.logger.log(
        `Slot released for user ${userId}. User streams: ${userCount}`,
      );
    } else {
      this.logger.warn(
        `Attempted to release slot for user ${userId} but counter is already at ${count}. Possible double-release.`,
      );
    }
  }

  /**
   * Get current stream metrics
   */
  async getMetrics() {
    // Count active users by scanning for user stream keys
    const keys = await this.redis.keys('stream:user:*');
    const activeUsers = keys.length;

    // Calculate total streams across all users
    let totalStreams = 0;
    for (const key of keys) {
      const count = await this.redis.get(key);
      totalStreams += count ? parseInt(count, 10) : 0;
    }

    return {
      totalStreams,
      activeUsers,
      maxStreamsPerUser: this.MAX_CONCURRENT_STREAMS_PER_USER,
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
