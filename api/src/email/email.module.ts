import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { EmailProcessor } from './processors/email.processor';
import { AuthModule } from '../auth/auth.module';

/**
 * EmailModule
 *
 * Handles email sending via AWS SES for application notifications.
 * Currently supports:
 * - Feedback ready notifications for force-transitioned interviews
 *
 * Depends on:
 * - AuthModule: For accessing UserService to fetch user email addresses
 * - ConfigModule: For AWS SES credentials and configuration
 * - BullModule: For background job processing with retry logic
 */
@Module({
  imports: [
    ConfigModule,
    AuthModule,
    // Register email queue with retry configuration
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
