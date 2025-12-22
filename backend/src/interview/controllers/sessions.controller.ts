import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable, from, concat, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InterviewSessionService } from '../services/interview-session.service';
import { TranscriptService } from '../services/transcript.service';
import { PhaseService } from '../services/phase.service';
import { SignalService } from '../services/signal.service';
import { RedFlagService } from '../services/red-flag.service';
import { FeedbackService } from '../services/feedback.service';
import { AiService } from '../../ai/services/ai.service';
import { PromptService } from '../../ai/services/prompt.service';
import { CreateSessionDto } from '../dto/create-session.dto';
import {
  CreateSessionResponseDto,
  GetSessionResponseDto,
  StartSessionResponseDto,
  GetTranscriptResponseDto,
  AiResponseDto,
  GetSignalsResponseDto,
  GetRedFlagsResponseDto,
  GetPhasesResponseDto,
  AdvancePhaseResponseDto,
  AiRequestDto,
  GenerateFeedbackResponseDto,
  GetFeedbackResponseDto,
} from '../dto/responses.dto';
import { InterviewPhase, MessageRole } from '../types/session.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../db/schema/users.schema';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('api/sessions')
export class SessionsController {
  constructor(
    private sessionService: InterviewSessionService,
    private transcriptService: TranscriptService,
    private phaseService: PhaseService,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private feedbackService: FeedbackService,
    private aiService: AiService,
    private promptService: PromptService,
  ) {}

  /**
   * Helper method to verify user owns the session
   */
  private async verifySessionOwnership(
    sessionId: number,
    userId: number,
  ): Promise<void> {
    const session = await this.sessionService.getSession(sessionId);
    if (session.userId !== userId) {
      throw new ForbiddenException('You do not have access to this session');
    }
  }

  /**
   * POST /api/sessions
   * Create a new interview session
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new interview session' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    type: CreateSessionResponseDto,
  })
  async createSession(
    @CurrentUser() user: User,
    @Body() dto: CreateSessionDto,
  ) {
    const session = await this.sessionService.createSession({
      ...dto,
      userId: user.id,
    });

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
  @ApiOperation({ summary: 'Get session transcript' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Transcript retrieved', type: GetTranscriptResponseDto })
  async getTranscript(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
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
  @ApiOperation({ summary: 'Get all phases with metadata' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Phases retrieved', type: GetPhasesResponseDto })
  async getPhases(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
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
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session details retrieved', type: GetSessionResponseDto })
  async getSession(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
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
  @ApiOperation({ summary: 'Start an interview session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session started', type: StartSessionResponseDto })
  async startSession(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
    const session = await this.sessionService.startSession(id);

    // Generate initial greeting from interviewer
    const promptContext = await this.promptService.buildPromptContext(
      session,
      [], // No conversation history yet
      'Hello', // Simple initial message from candidate to trigger greeting
    );

    const aiResponse = await this.aiService.generateResponse({
      systemPrompt: promptContext.systemPrompt,
      userMessage: promptContext.userMessage,
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Save the initial greeting to transcript
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);
    await this.transcriptService.addMessage({
      sessionId: id,
      role: MessageRole.INTERVIEWER,
      text: aiResponse.text,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
    });

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
  @ApiOperation({ summary: 'Advance to next phase' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Phase advanced', type: AdvancePhaseResponseDto })
  async advancePhase(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
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
   * SSE /api/sessions/:id/conversation
   * Handle a conversation turn with the AI interviewer using Server-Sent Events
   * This endpoint:
   * 1. Saves the candidate's message to the transcript
   * 2. Streams AI response token-by-token
   * 3. Detects signals and checks for red flags after streaming completes
   * 4. Saves the AI response to the transcript
   * 5. Returns stream events: start, delta (multiple), complete
   */
  @Sse(':id/conversation')
  @ApiOperation({ summary: 'Handle conversation turn with streaming' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of conversation events',
  })
  handleConversationStream(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query('text') text: string,
  ): Observable<MessageEvent> {
    // Verify ownership and prepare initial data
    const preparation$ = from(
      (async () => {
        await this.verifySessionOwnership(id, user.id);
        const session = await this.sessionService.getSession(id);
        const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

        // Save candidate's message
        const candidateMessage = await this.transcriptService.addMessage({
          sessionId: id,
          role: MessageRole.CANDIDATE,
          text,
          phase: session.currentPhase as InterviewPhase,
          secondsElapsed: elapsedSeconds,
        });

        // Get recent conversation history
        const recentMessages = await this.transcriptService.getRecentMessages(
          id,
          10,
        );

        // Build prompt context
        const promptContext = await this.promptService.buildPromptContext(
          session,
          recentMessages,
          text,
        );

        return {
          session,
          candidateMessage,
          promptContext,
          elapsedSeconds,
        };
      })(),
    );

    // Emit start event, then stream AI response
    return preparation$.pipe(
      switchMap(
        ({ session, candidateMessage, promptContext, elapsedSeconds }) => {
          const startEvent: MessageEvent = {
            type: 'start',
            data: JSON.stringify({
              candidateMessageId: candidateMessage.id,
            }),
          };

          // Get streaming AI response
          const streamEvents$ = this.aiService
            .generateStreamingResponse({
              systemPrompt: promptContext.systemPrompt,
              userMessage: promptContext.userMessage,
              temperature: 0.7,
              maxTokens: 1024,
            })
            .pipe(
              switchMap((event) => {
                if (event.type === 'delta') {
                  // Emit delta event
                  const deltaEvent: MessageEvent = {
                    type: 'delta',
                    data: JSON.stringify({ text: event.text }),
                  };
                  return of(deltaEvent);
                } else {
                  // Complete event - save message and detect signals
                  return from(
                    (async () => {
                      const { fullResponse } = event;

                      // Save AI response to transcript
                      const updatedElapsedSeconds =
                        this.sessionService.getElapsedSeconds(session);
                      const interviewerMessage =
                        await this.transcriptService.addMessage({
                          sessionId: id,
                          role: MessageRole.INTERVIEWER,
                          text: fullResponse.fullText,
                          phase: session.currentPhase as InterviewPhase,
                          secondsElapsed: updatedElapsedSeconds,
                        });

                      // Detect signals in candidate's message
                      const detectedSignals =
                        await this.signalService.detectAndRecordSignals({
                          sessionId: id,
                          text,
                          phase: session.currentPhase as InterviewPhase,
                          secondsElapsed: elapsedSeconds,
                          messageId: candidateMessage.id,
                        });

                      // Check for red flags
                      const detectedRedFlags =
                        await this.redFlagService.checkRedFlags({
                          sessionId: id,
                          currentPhase: session.currentPhase as InterviewPhase,
                          secondsElapsed: elapsedSeconds,
                          messageText: text,
                        });

                      const completeEvent: MessageEvent = {
                        type: 'complete',
                        data: JSON.stringify({
                          interviewerMessage,
                          detectedSignals,
                          detectedRedFlags,
                          usage: {
                            inputTokens: fullResponse.usage.inputTokens,
                            outputTokens: fullResponse.usage.outputTokens,
                          },
                        }),
                      };

                      return completeEvent;
                    })(),
                  );
                }
              }),
            );

          // Concatenate start event with stream events
          return concat(of(startEvent), streamEvents$);
        },
      ),
      catchError((error) => {
        const errorEvent: MessageEvent = {
          type: 'error',
          data: JSON.stringify({
            message: error.message || 'An error occurred during streaming',
          }),
        };
        return of(errorEvent);
      }),
    );
  }

  /**
   * GET /api/sessions/:id/signals
   * Get all detected signals for a session
   */
  @Get(':id/signals')
  @ApiOperation({ summary: 'Get detected signals' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Signals retrieved', type: GetSignalsResponseDto })
  async getSignals(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
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
  @ApiOperation({ summary: 'Get detected red flags' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Red flags retrieved', type: GetRedFlagsResponseDto })
  async getRedFlags(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
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

  /**
   * POST /api/sessions/:id/feedback
   * Generate feedback report for a completed session
   * This endpoint:
   * 1. Calculates scores based on detected signals and red flags
   * 2. Generates strengths, weaknesses, and suggestions
   * 3. Creates actionable next steps
   * 4. Stores everything in the database
   * 5. Returns the complete feedback report
   */
  @Post(':id/feedback')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate feedback report' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'Feedback generated', type: GenerateFeedbackResponseDto })
  async generateFeedback(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
    const feedback = await this.feedbackService.generateFeedback(id);

    return {
      success: true,
      message: 'Feedback generated successfully',
      data: feedback,
    };
  }

  /**
   * GET /api/sessions/:id/feedback
   * Get existing feedback report for a session
   */
  @Get(':id/feedback')
  @ApiOperation({ summary: 'Get feedback report' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved', type: GetFeedbackResponseDto })
  async getFeedback(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
    const feedback = await this.feedbackService.getFeedback(id);

    return {
      success: true,
      data: feedback,
    };
  }
}
