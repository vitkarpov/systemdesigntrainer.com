import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewCasesService } from './services/interview-cases.service';
import { PhaseService } from './services/phase.service';
import { TranscriptService } from './services/transcript.service';
import { SignalService } from './services/signal.service';
import { RedFlagService } from './services/red-flag.service';
import { FeedbackService } from './services/feedback.service';
import { FeedbackNaiveService } from './services/feedback-naive.service';
import { FeedbackAiService } from './services/feedback-ai.service';
import { DiagramService } from './services/diagram.service';
import { ConversationSagaService } from './services/conversation-saga.service';
import { StreamingLimiterService } from './services/streaming-limiter.service';
import { PhaseTransitionSchedulerService } from './services/phase-transition-scheduler.service';
import { FeedbackProcessor } from './processors/feedback.processor';
import { PhaseTransitionProcessor } from './processors/phase-transition.processor';
import { SessionsController } from './controllers/sessions.controller';
import { CasesController } from './controllers/cases.controller';
import { UserThrottlerGuard } from './guards/user-throttler.guard';
import { DatabaseModule } from '../../db/db.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

/**
 * InterviewModule depends on AiModule for the following reasons:
 * - Real-time conversation requires AI response generation (SSE endpoint in SessionsController)
 * - AI-powered feedback generation uses Claude to analyze interview performance
 * - Signal detection and red flag analysis benefit from AI-enhanced pattern matching
 *
 * Architectural consideration: If AI dependency becomes too invasive or if we need
 * to support multiple AI providers, consider extracting conversation handling to a
 * separate ConversationModule that acts as an adapter layer.
 */
@Module({
  imports: [
    DatabaseModule,
    AiModule,
    AuthModule,
    EmailModule,
    BullModule.registerQueue({
      name: 'feedback',
    }),
    BullModule.registerQueue({
      name: 'phase-transition',
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [SessionsController, CasesController],
  providers: [
    InterviewSessionService,
    InterviewCasesService,
    PhaseService,
    TranscriptService,
    SignalService,
    RedFlagService,
    FeedbackNaiveService,
    FeedbackAiService,
    FeedbackService,
    DiagramService,
    ConversationSagaService,
    StreamingLimiterService,
    PhaseTransitionSchedulerService,
    FeedbackProcessor,
    PhaseTransitionProcessor,
    UserThrottlerGuard,
  ],
  exports: [
    InterviewSessionService,
    InterviewCasesService,
    PhaseService,
    TranscriptService,
    SignalService,
    RedFlagService,
    FeedbackService,
    DiagramService,
  ],
})
export class InterviewModule {}
