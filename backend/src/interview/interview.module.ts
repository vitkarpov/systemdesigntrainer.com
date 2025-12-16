import { Module } from '@nestjs/common';
import { InterviewSessionService } from './services/interview-session.service';
import { PhaseService } from './services/phase.service';
import { TranscriptService } from './services/transcript.service';
import { SignalService } from './services/signal.service';
import { SessionsController } from './controllers/sessions.controller';
import { DatabaseModule } from '../db/db.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [SessionsController],
  providers: [
    InterviewSessionService,
    PhaseService,
    TranscriptService,
    SignalService,
  ],
  exports: [
    InterviewSessionService,
    PhaseService,
    TranscriptService,
    SignalService,
  ],
})
export class InterviewModule {}
