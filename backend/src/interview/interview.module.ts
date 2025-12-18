import { Module } from '@nestjs/common';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewCasesService } from './services/interview-cases.service';
import { PhaseService } from './services/phase.service';
import { TranscriptService } from './services/transcript.service';
import { SignalService } from './services/signal.service';
import { RedFlagService } from './services/red-flag.service';
import { FeedbackService } from './services/feedback.service';
import { SessionsController } from './controllers/sessions.controller';
import { CasesController } from './controllers/cases.controller';
import { DatabaseModule } from '../db/db.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [SessionsController, CasesController],
  providers: [
    InterviewSessionService,
    InterviewCasesService,
    PhaseService,
    TranscriptService,
    SignalService,
    RedFlagService,
    FeedbackService,
  ],
  exports: [
    InterviewSessionService,
    InterviewCasesService,
    PhaseService,
    TranscriptService,
    SignalService,
    RedFlagService,
    FeedbackService,
  ],
})
export class InterviewModule {}
