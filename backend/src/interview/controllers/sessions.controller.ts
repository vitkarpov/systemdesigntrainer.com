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
import { SignalService } from '../services/signal.service';
import { RedFlagService } from '../services/red-flag.service';
import { AiService } from '../../ai/services/ai.service';
import { PromptService } from '../../ai/services/prompt.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import { AddMessageDto } from '../dto/add-message.dto';
import { InterviewPhase, MessageRole } from '../types/session.types';

@Controller('api/sessions')
export class SessionsController {
  constructor(
    private sessionService: InterviewSessionService,
    private transcriptService: TranscriptService,
    private phaseService: PhaseService,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private aiService: AiService,
    private promptService: PromptService,
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
   * Advance to next phase and check for red flags
   */
  @Patch(':id/phase')
  async advancePhase(@Param('id', ParseIntPipe) id: number) {
    const session = await this.sessionService.getSession(id);
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

    // Check for red flags before advancing
    const detectedRedFlags = await this.redFlagService.checkRedFlags({
      sessionId: id,
      currentPhase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
    });

    const result = await this.sessionService.advancePhase(id);

    return {
      success: true,
      message: result.isCompleted
        ? 'Session completed'
        : `Advanced to ${result.currentPhase}`,
      data: {
        ...result,
        detectedRedFlags,
      },
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

  /**
   * POST /api/sessions/:id/ai-response
   * Get AI interviewer response for a candidate message
   * This endpoint:
   * 1. Saves the candidate's message to the transcript
   * 2. Detects signals in the candidate's message
   * 3. Checks for red flags
   * 4. Builds context from session state and recent messages
   * 5. Gets AI response from Claude
   * 6. Saves the AI response to the transcript
   * 7. Returns both messages, detected signals, and red flags
   */
  @Post(':id/ai-response')
  @HttpCode(HttpStatus.CREATED)
  async getAiResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { text: string },
  ) {
    const session = await this.sessionService.getSession(id);
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

    // 1. Save candidate's message
    const candidateMessage = await this.transcriptService.addMessage({
      sessionId: id,
      role: MessageRole.CANDIDATE,
      text: dto.text,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
    });

    // 2. Detect signals in candidate's message
    const detectedSignals = await this.signalService.detectAndRecordSignals({
      sessionId: id,
      text: dto.text,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
      messageId: candidateMessage.id,
    });

    // 3. Check for red flags
    const detectedRedFlags = await this.redFlagService.checkRedFlags({
      sessionId: id,
      currentPhase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
      messageText: dto.text,
    });

    // 4. Get recent conversation history (last 10 messages)
    const recentMessages = await this.transcriptService.getRecentMessages(
      id,
      10,
    );

    // 5. Build prompt context
    const promptContext = await this.promptService.buildPromptContext(
      session,
      recentMessages,
      dto.text,
    );

    // 6. Get AI response
    const aiResponse = await this.aiService.generateResponse({
      systemPrompt: promptContext.systemPrompt,
      userMessage: promptContext.userMessage,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // 7. Save AI response to transcript
    const updatedElapsedSeconds =
      this.sessionService.getElapsedSeconds(session);
    const interviewerMessage = await this.transcriptService.addMessage({
      sessionId: id,
      role: MessageRole.INTERVIEWER,
      text: aiResponse.text,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: updatedElapsedSeconds,
    });

    return {
      success: true,
      data: {
        candidateMessage,
        interviewerMessage,
        detectedSignals,
        detectedRedFlags,
        usage: aiResponse.usage,
      },
    };
  }

  /**
   * GET /api/sessions/:id/signals
   * Get all detected signals for a session
   */
  @Get(':id/signals')
  async getSignals(@Param('id', ParseIntPipe) id: number) {
    const signals = await this.signalService.getSessionSignals(id);
    const missingSignals = await this.signalService.getMissingSignals(id);
    const coverage = await this.signalService.getSignalCoverage(id);

    return {
      success: true,
      data: {
        signals,
        missingSignals,
        coverage,
        count: signals.length,
      },
    };
  }

  /**
   * GET /api/sessions/:id/red-flags
   * Get all detected red flags for a session
   */
  @Get(':id/red-flags')
  async getRedFlags(@Param('id', ParseIntPipe) id: number) {
    const redFlags = await this.redFlagService.getSessionRedFlags(id);
    const count = await this.redFlagService.getRedFlagCount(id);
    const hasRedFlags = await this.redFlagService.hasRedFlags(id);

    return {
      success: true,
      data: {
        redFlags,
        count,
        hasRedFlags,
      },
    };
  }
}
