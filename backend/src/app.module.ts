import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { DatabaseModule } from './db/db.module';
import { InterviewModule } from './interview/interview.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuthModule,
    // Bull Queue - Uses Redis for job processing
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    InterviewModule,
    PaymentsModule,
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
