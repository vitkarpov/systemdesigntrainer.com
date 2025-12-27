import { Module } from '@nestjs/common';
import { InterviewSessionService } from './services/interview-session.service';
import { InterviewCasesService } from './services/interview-cases.service';
import { PhaseService } from './services/phase.service';
import { PhaseGuardService } from './services/phase-guard.service';
import { TranscriptService } from './services/transcript.service';
import { SignalService } from './services/signal.service';
import { RedFlagService } from './services/red-flag.service';
import { FeedbackService } from './services/feedback.service';
import { DiagramService } from './services/diagram.service';
import { ConversationSagaService } from './services/conversation-saga.service';
import { StreamingLimiterService } from './services/streaming-limiter.service';
import { SessionsController } from './controllers/sessions.controller';
import { CasesController } from './controllers/cases.controller';
import { DatabaseModule } from '../db/db.module';
import { AiModule } from '../ai/ai.module';

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
  imports: [DatabaseModule, AiModule],
  controllers: [SessionsController, CasesController],
  providers: [
    InterviewSessionService,
    InterviewCasesService,
    PhaseService,
    PhaseGuardService,
    TranscriptService,
    SignalService,
    RedFlagService,
    FeedbackService,
    DiagramService,
    ConversationSagaService,
    StreamingLimiterService,
  ],
  exports: [
    InterviewSessionService,
    InterviewCasesService,
    PhaseService,
    PhaseGuardService,
    TranscriptService,
    SignalService,
    RedFlagService,
    FeedbackService,
    DiagramService,
  ],
})
export class InterviewModule {}
