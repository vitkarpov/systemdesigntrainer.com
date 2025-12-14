import { Module } from '@nestjs/common';
import { InterviewSessionService } from './services/interview-session.service';
import { PhaseService } from './services/phase.service';
import { TranscriptService } from './services/transcript.service';
import { SessionsController } from './controllers/sessions.controller';

@Module({
  controllers: [SessionsController],
  providers: [InterviewSessionService, PhaseService, TranscriptService],
  exports: [InterviewSessionService, PhaseService, TranscriptService],
})
export class InterviewModule {}
