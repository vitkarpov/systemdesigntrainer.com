import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * PhaseTransitionSchedulerService
 *
 * Initializes and manages the phase transition background job scheduler.
 * Sets up a repeatable job that checks all active sessions every 10 seconds
 * and auto-advances phases when time limits are exceeded.
 */
@Injectable()
export class PhaseTransitionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PhaseTransitionSchedulerService.name);

  constructor(
    @InjectQueue('phase-transition')
    private phaseTransitionQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing phase transition scheduler...');

    try {
      // Remove any existing repeatable jobs to avoid duplicates
      const repeatableJobs =
        await this.phaseTransitionQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await this.phaseTransitionQueue.removeRepeatableByKey(job.key);
        this.logger.log(`Removed existing repeatable job: ${job.key}`);
      }

      // Add repeatable job that runs every minute
      await this.phaseTransitionQueue.add(
        'check',
        {},
        {
          repeat: {
            every: 60000, // Run every 60 seconds (1 minute)
          },
          removeOnComplete: 50, // Keep last 50 completed jobs for debugging
          removeOnFail: 200, // Keep last 200 failed jobs for debugging
        },
      );

      this.logger.log(
        '✅ Phase transition scheduler initialized (checking every minute)',
      );
    } catch (error) {
      this.logger.error(
        '❌ Failed to initialize phase transition scheduler:',
        error,
      );
    }
  }
}
