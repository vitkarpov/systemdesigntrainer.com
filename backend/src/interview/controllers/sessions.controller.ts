import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InterviewSessionService } from '../services/interview-session.service';
import { TranscriptService } from '../services/transcript.service';
import { PhaseService } from '../services/phase.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { AddMessageDto } from '../dto/add-message.dto';
import { InterviewPhase } from '../types/session.types';

@Controller('api/sessions')
export class SessionsController {
  constructor(
    private sessionService: InterviewSessionService,
    private transcriptService: TranscriptService,
    private phaseService: PhaseService,
  ) {}

  /**
   * POST /api/sessions
   * Create a new interview session
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() dto: CreateSessionDto) {
    const session = await this.sessionService.createSession(dto);

    return {
      success: true,
      data: {
        session,
        phaseMetadata: this.phaseService.getPhaseMetadata(
          session.currentPhase as InterviewPhase,
        ),
        progress: this.phaseService.getPhaseProgress(
          session.currentPhase as InterviewPhase,
        ),
      },
    };
  }

  /**
   * GET /api/sessions/:id/transcript
   * Get full transcript for a session
   */
  @Get(':id/transcript')
  async getTranscript(@Param('id', ParseIntPipe) id: number) {
    const messages = await this.transcriptService.getSessionTranscript(id);

    return {
      success: true,
      data: {
        messages,
        count: messages.length,
      },
    };
  }

  /**
   * GET /api/sessions/:id/phases
   * Get all phases with metadata
   */
  @Get(':id/phases')
  async getPhases(@Param('id', ParseIntPipe) id: number) {
    const session = await this.sessionService.getSession(id);
    const allPhases = this.phaseService.getAllPhases();

    const phasesWithMetadata = allPhases.map((phase) => ({
      phase,
      metadata: this.phaseService.getPhaseMetadata(phase),
      isCurrent: phase === session.currentPhase,
      progress: this.phaseService.getPhaseProgress(phase),
    }));

    return {
      success: true,
      data: {
        phases: phasesWithMetadata,
        currentPhase: session.currentPhase,
      },
    };
  }

  /**
   * GET /api/sessions/:id
   * Get session details
   */
  @Get(':id')
  async getSession(@Param('id', ParseIntPipe) id: number) {
    const session = await this.sessionService.getSession(id);
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);
    const phaseElapsed = this.sessionService.getPhaseElapsedSeconds(session);

    return {
      success: true,
      data: {
        session,
        elapsedSeconds,
        phaseElapsedSeconds: phaseElapsed,
        phaseMetadata: this.phaseService.getPhaseMetadata(
          session.currentPhase as InterviewPhase,
        ),
        progress: this.phaseService.getPhaseProgress(
          session.currentPhase as InterviewPhase,
        ),
      },
    };
  }

  /**
   * POST /api/sessions/:id/start
   * Start a session (NOT_STARTED -> IN_PROGRESS)
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  async startSession(@Param('id', ParseIntPipe) id: number) {
    const session = await this.sessionService.startSession(id);

    return {
      success: true,
      message: 'Session started',
      data: { session },
    };
  }

  /**
   * PATCH /api/sessions/:id/phase
   * Advance to next phase
   */
  @Patch(':id/phase')
  async advancePhase(@Param('id', ParseIntPipe) id: number) {
    const result = await this.sessionService.advancePhase(id);

    return {
      success: true,
      message: result.isCompleted
        ? 'Session completed'
        : `Advanced to ${result.currentPhase}`,
      data: result,
    };
  }

  /**
   * POST /api/sessions/:id/messages
   * Add a message to the transcript
   */
  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddMessageDto,
  ) {
    const session = await this.sessionService.getSession(id);
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

    const message = await this.transcriptService.addMessage({
      sessionId: id,
      role: dto.role,
      text: dto.text,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
    });

    return {
      success: true,
      data: { message },
    };
  }
}
