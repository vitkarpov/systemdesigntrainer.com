import { Module, Global, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export const REDIS_CONNECTION = 'REDIS_CONNECTION';

const redisProvider = {
  provide: REDIS_CONNECTION,
  useFactory: () => {
    const logger = new Logger('RedisModule');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      logger.log('Connected successfully');
    });

    redis.on('error', (err) => {
      logger.error('Connection error:', err);
    });

    redis.on('ready', () => {
      logger.log('Ready to accept commands');
    });

    return redis;
  },
};

/**
 * Global Redis module
 * Provides a shared Redis connection to all modules
 */
@Global()
@Module({
  providers: [redisProvider],
  exports: [REDIS_CONNECTION],
})
export class RedisModule {}
