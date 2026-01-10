import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewCasesService } from './services/interview-cases.service';
import { PhaseService } from './services/phase.service';
import { TranscriptService } from './services/transcript.service';
import { SignalService } from './services/signal.service';
import { RedFlagService } from './services/red-flag.service';
import { FeedbackService } from './services/feedback.service';
import { FeedbackGenerationService } from './services/feedback-generation.service';
import { DiagramService } from './services/diagram.service';
import { ConversationSagaService } from './services/conversation-saga.service';
import { StreamingLimiterService } from './services/streaming-limiter.service';
import { PhaseTransitionSchedulerService } from './services/phase-transition-scheduler.service';
import { FeedbackProcessor } from './processors/feedback.processor';
import { PhaseTransitionProcessor } from './processors/phase-transition.processor';
import { SessionsController } from './controllers/sessions.controller';
import { CasesController } from './controllers/cases.controller';
import { DatabaseModule } from '../../db/db.module';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

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
    // Register feedback queue
    BullModule.registerQueue({
      name: 'feedback',
    }),
    // Register phase-transition queue
    BullModule.registerQueue({
      name: 'phase-transition',
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
    FeedbackService,
    FeedbackGenerationService,
    DiagramService,
    ConversationSagaService,
    StreamingLimiterService,
    PhaseTransitionSchedulerService,
    FeedbackProcessor,
    PhaseTransitionProcessor,
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
