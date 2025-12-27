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
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Sse,
  MessageEvent,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Observable, from, concat, of } from 'rxjs';
import { switchMap, catchError, finalize } from 'rxjs/operators';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { InterviewSessionService } from '../services/interview-session.service';
import { InterviewCasesService } from '../services/interview-cases.service';
import { TranscriptService } from '../services/transcript.service';
import { PhaseService } from '../services/phase.service';
import { SignalService } from '../services/signal.service';
import { RedFlagService } from '../services/red-flag.service';
import { FeedbackService } from '../services/feedback.service';
import { DiagramService } from '../services/diagram.service';
import { ConversationSagaService } from '../services/conversation-saga.service';
import { StreamingLimiterService } from '../services/streaming-limiter.service';
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
  RetryConversationDto,
  GenerateFeedbackResponseDto,
  GetFeedbackResponseDto,
  GetDashboardResponseDto,
  GetFailedMessagesResponseDto,
} from '../dto/responses.dto';
import {
  SaveDiagramDto,
  SaveDiagramResponseDto,
  GetDiagramResponseDto,
} from '../dto/diagram.dto';
import { InterviewPhase, MessageRole } from '../types/session.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../db/schema/users.schema';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('api/sessions')
export class SessionsController {
  constructor(
    private sessionService: InterviewSessionService,
    private casesService: InterviewCasesService,
    private transcriptService: TranscriptService,
    private phaseService: PhaseService,
    private signalService: SignalService,
    private redFlagService: RedFlagService,
    private feedbackService: FeedbackService,
    private diagramService: DiagramService,
    private conversationSaga: ConversationSagaService,
    private streamLimiter: StreamingLimiterService,
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
   * GET /api/sessions/metrics/streaming
   * Get streaming concurrency metrics
   */
  @Get('metrics/streaming')
  @ApiOperation({ summary: 'Get streaming concurrency metrics' })
  @ApiResponse({
    status: 200,
    description: 'Streaming metrics retrieved',
  })
  async getStreamingMetrics() {
    const metrics = await this.streamLimiter.getMetrics();
    return {
      success: true,
      data: metrics,
    };
  }

  /**
   * GET /api/sessions/dashboard
   * Get all sessions for the current user with feedback scores
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard with user sessions and stats' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data retrieved',
    type: GetDashboardResponseDto,
  })
  async getDashboard(@CurrentUser() user: User) {
    // Fetch sessions with interview case details and feedback scores in a single query
    const sessions = await this.sessionService.getUserSessionsWithCases(
      user.id,
    );

    // Calculate stats
    const completedSessions = sessions.filter((s) => s.status === 'completed');
    const sessionsWithScores = sessions.filter((s) => s.overallScore !== null);
    const averageScore =
      sessionsWithScores.length > 0
        ? Math.round(
            sessionsWithScores.reduce(
              (sum, s) => sum + (s.overallScore || 0),
              0,
            ) / sessionsWithScores.length,
          )
        : null;

    return {
      success: true,
      data: {
        sessions,
        stats: {
          totalSessions: sessions.length,
          completedSessions: completedSessions.length,
          averageScore,
        },
      },
    };
  }

  /**
   * POST /api/sessions
   * Create a new interview session
   */
  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
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
  @ApiResponse({
    status: 200,
    description: 'Transcript retrieved',
    type: GetTranscriptResponseDto,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Phases retrieved',
    type: GetPhasesResponseDto,
  })
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
   * POST /api/sessions/:id/diagram
   * Save a diagram snapshot
   */
  @Post(':id/diagram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save diagram snapshot' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Diagram saved successfully',
    type: SaveDiagramResponseDto,
  })
  async saveDiagram(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveDiagramDto,
  ) {
    await this.verifySessionOwnership(id, user.id);
    const session = await this.sessionService.getSession(id);
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

    const result = await this.diagramService.saveDiagramSnapshot({
      sessionId: id,
      nodes: dto.nodes,
      edges: dto.edges,
      phase: session.currentPhase as InterviewPhase,
      secondsElapsed: elapsedSeconds,
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/sessions/:id/diagram
   * Get the latest diagram for a session
   */
  @Get(':id/diagram')
  @ApiOperation({ summary: 'Get latest diagram' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Diagram retrieved (or null if none exists)',
    type: GetDiagramResponseDto,
  })
  async getDiagram(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
    const diagram = await this.diagramService.getLatestDiagram(id);

    return {
      success: true,
      data: diagram,
    };
  }

  /**
   * GET /api/sessions/:id
   * Get session details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Session details retrieved',
    type: GetSessionResponseDto,
  })
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
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start an interview session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 201,
    description: 'Session started',
    type: StartSessionResponseDto,
  })
  async startSession(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);
    const session = await this.sessionService.startSession(id);

    // Fetch interview case data
    const interviewCase = await this.casesService.getCaseById(session.caseId);

    // Generate initial greeting from interviewer
    const promptContext = this.promptService.buildPromptContext(
      session,
      interviewCase,
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
  @ApiResponse({
    status: 200,
    description: 'Phase advanced',
    type: AdvancePhaseResponseDto,
  })
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
   *
   * This endpoint implements the SAGA PATTERN for robust error handling:
   * 1. Starts saga - saves candidate message with 'pending' status
   * 2. Streams AI response token-by-token
   * 3. On completion - saves AI response, detects signals, marks candidate as 'completed'
   * 4. On error - marks candidate as 'failed' with partial response for retry
   *
   * Returns stream events: start, delta (multiple), complete
   *
   * Note: Parameters are passed via cookies to avoid URL length limitations:
   * - 'text' cookie: The candidate's message text
   * - 'diagramData' cookie: Optional diagram data as JSON string
   */
  @Sse(':id/conversation')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 conversations per minute
  @ApiOperation({
    summary: 'Handle conversation turn with streaming (saga pattern)',
  })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'SSE stream of conversation events with saga compensation',
  })
  handleConversationStream(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ): Observable<MessageEvent> {
    // Read parameters from cookies
    const text = request.cookies?.text as string;
    const diagramData = request.cookies?.diagramData as string | undefined;

    // Validate required parameter
    if (!text) {
      const errorEvent: MessageEvent = {
        type: 'error',
        data: JSON.stringify({
          message: 'text parameter is required',
        }),
      };
      return of(errorEvent);
    }

    // Prepare saga context and start conversation turn
    const preparation$ = from(
      (async () => {
        await this.verifySessionOwnership(id, user.id);

        // Acquire stream slot (throws if limits exceeded)
        await this.streamLimiter.acquireStreamSlot(user.id);

        const session = await this.sessionService.getSession(id);
        const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

        // Parse diagram data if provided
        let diagram = null;
        if (diagramData) {
          try {
            diagram = JSON.parse(diagramData);
          } catch (err) {
            console.error('Failed to parse diagram data:', err);
          }
        }

        // Fetch interview case data
        const interviewCase = await this.casesService.getCaseById(
          session.caseId,
        );

        // SAGA STEP 1: Start conversation turn (save candidate message as 'pending')
        const { candidateMessageId } =
          await this.conversationSaga.startConversationTurn(
            session,
            interviewCase,
            text,
            elapsedSeconds,
            diagram,
          );

        // Get recent conversation history for prompt
        const recentMessages = await this.transcriptService.getRecentMessages(
          id,
          10,
        );

        // Build prompt context
        const promptContext = this.promptService.buildPromptContext(
          session,
          interviewCase,
          recentMessages,
          text,
          diagram,
        );

        return {
          session,
          candidateMessageId,
          candidateText: text,
          promptContext,
          elapsedSeconds,
        };
      })(),
    );

    // Stream AI response with saga compensation on error
    return preparation$.pipe(
      switchMap(
        ({
          session,
          candidateMessageId,
          candidateText,
          promptContext,
          elapsedSeconds,
        }) => {
          const startEvent: MessageEvent = {
            type: 'start',
            data: JSON.stringify({
              candidateMessageId,
            }),
          };

          // Track partial response for compensation
          let partialResponse = '';

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
                  // Accumulate partial response
                  partialResponse += event.text;

                  // Emit delta event
                  const deltaEvent: MessageEvent = {
                    type: 'delta',
                    data: JSON.stringify({ text: event.text }),
                  };
                  return of(deltaEvent);
                } else {
                  // SAGA STEP 2: Complete conversation turn (save AI response, detect signals)
                  return from(
                    (async () => {
                      const { fullResponse } = event;

                      const updatedElapsedSeconds =
                        this.sessionService.getElapsedSeconds(session);

                      const result =
                        await this.conversationSaga.completeConversationTurn(
                          session.id,
                          candidateMessageId,
                          fullResponse.fullText,
                          candidateText,
                          session.currentPhase as InterviewPhase,
                          updatedElapsedSeconds,
                          fullResponse.usage,
                        );

                      const completeEvent: MessageEvent = {
                        type: 'complete',
                        data: JSON.stringify({
                          interviewerMessage: result.interviewerMessage,
                          detectedSignals: result.detectedSignals,
                          detectedRedFlags: result.detectedRedFlags,
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
              catchError((error) => {
                // SAGA COMPENSATION: Mark candidate message as failed with partial response
                return from(
                  (async () => {
                    await this.conversationSaga.handleStreamingFailure(
                      candidateMessageId,
                      partialResponse || undefined,
                    );

                    const errorEvent: MessageEvent = {
                      type: 'error',
                      data: JSON.stringify({
                        message:
                          error.message || 'AI response generation failed',
                        partialResponse: partialResponse || null,
                        candidateMessageId, // Client can use this for retry
                      }),
                    };
                    return errorEvent;
                  })(),
                );
              }),
            );

          // Concatenate start event with stream events
          return concat(of(startEvent), streamEvents$);
        },
      ),
      catchError((error) => {
        // Early failure before streaming started
        // Release stream slot on error
        this.streamLimiter.releaseStreamSlot(user.id);

        const errorEvent: MessageEvent = {
          type: 'error',
          data: JSON.stringify({
            message: error.message || 'Failed to start conversation turn',
          }),
        };
        return of(errorEvent);
      }),
      finalize(() => {
        // Always release stream slot when stream completes or errors
        this.streamLimiter.releaseStreamSlot(user.id);
      }),
    );
  }

  /**
   * POST /api/sessions/:id/conversation/retry
   * Retry a failed conversation turn
   *
   * This endpoint allows the UI to retry a conversation turn that failed.
   * It looks up the failed candidate message, retries the AI response,
   * and uses the saga pattern for error handling.
   */
  @Post(':id/conversation/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed conversation turn' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiBody({ type: RetryConversationDto })
  @ApiResponse({
    status: 200,
    description: 'Conversation turn retried successfully',
  })
  async retryConversation(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() body: RetryConversationDto,
  ) {
    await this.verifySessionOwnership(sessionId, user.id);

    // Get the failed/pending message using saga service
    const candidateMessage = await this.conversationSaga.getMessage(
      body.candidateMessageId,
    );

    if (!candidateMessage) {
      throw new NotFoundException('Message not found');
    }

    // Verify message belongs to this session
    if (candidateMessage.sessionId !== sessionId) {
      throw new ForbiddenException('Message does not belong to this session');
    }

    // Verify message is retryable (failed or pending)
    if (candidateMessage.status === 'completed') {
      throw new BadRequestException(
        'Cannot retry a completed message. This message was already processed successfully.',
      );
    }

    // Get session and elapsed time
    const session = await this.sessionService.getSession(sessionId);
    const elapsedSeconds = this.sessionService.getElapsedSeconds(session);

    // Get interview case
    const interviewCase = await this.casesService.getCaseById(session.caseId);

    // Get recent conversation history (exclude the failed message)
    const allMessages =
      await this.transcriptService.getSessionTranscript(sessionId);
    const messagesBeforeFailed = allMessages.filter(
      (m) => m.id < candidateMessage.id && m.status === 'completed',
    );
    const recentMessages = messagesBeforeFailed.slice(-10);

    // Build prompt context
    const promptContext = this.promptService.buildPromptContext(
      session,
      interviewCase,
      recentMessages,
      candidateMessage.text,
      null, // No diagram on retry for simplicity
    );

    // Reset message to pending state for retry
    await this.conversationSaga.resetMessageForRetry(candidateMessage.id);

    try {
      // Generate AI response (non-streaming for retry)
      const aiResponse = await this.aiService.generateResponse({
        systemPrompt: promptContext.systemPrompt,
        userMessage: promptContext.userMessage,
        temperature: 0.7,
        maxTokens: 1024,
      });

      // Complete the conversation turn using saga
      const result = await this.conversationSaga.completeConversationTurn(
        sessionId,
        candidateMessage.id,
        aiResponse.text,
        candidateMessage.text,
        session.currentPhase as InterviewPhase,
        elapsedSeconds,
        aiResponse.usage,
      );

      return {
        success: true,
        message: 'Conversation turn retried successfully',
        data: {
          interviewerMessage: result.interviewerMessage,
          detectedSignals: result.detectedSignals,
          detectedRedFlags: result.detectedRedFlags,
        },
      };
    } catch (error) {
      // Saga compensation: Mark as failed again
      await this.conversationSaga.handleStreamingFailure(candidateMessage.id);
      throw error;
    }
  }

  /**
   * GET /api/sessions/:id/conversation/failed
   * Get all failed conversation turns for retry UI
   */
  @Get(':id/conversation/failed')
  @ApiOperation({ summary: 'Get failed conversation turns' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Failed messages retrieved',
    type: GetFailedMessagesResponseDto,
  })
  async getFailedMessages(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) sessionId: number,
  ): Promise<GetFailedMessagesResponseDto> {
    await this.verifySessionOwnership(sessionId, user.id);

    const failedMessages =
      await this.conversationSaga.getFailedMessages(sessionId);

    return {
      success: true,
      data: {
        failedMessages,
        retryableCount: failedMessages.length,
      },
    };
  }

  /**
   * GET /api/sessions/:id/signals
   * Get all detected signals for a session
   */
  @Get(':id/signals')
  @ApiOperation({ summary: 'Get detected signals' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({
    status: 200,
    description: 'Signals retrieved',
    type: GetSignalsResponseDto,
  })
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
  @ApiResponse({
    status: 200,
    description: 'Red flags retrieved',
    type: GetRedFlagsResponseDto,
  })
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
  @ApiResponse({
    status: 201,
    description: 'Feedback generated',
    type: GenerateFeedbackResponseDto,
  })
  async generateFeedback(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.verifySessionOwnership(id, user.id);

    // Complete the session (mark as terminal status)
    // If already completed, this will gracefully handle it
    try {
      await this.sessionService.completeSession(id);
    } catch (err) {
      // If session is already completed, that's fine - continue to generate/return feedback
      const session = await this.sessionService.getSession(id);
      if (session.status !== 'completed') {
        // If it's not completed and we got an error, rethrow
        throw err;
      }
    }

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
  @ApiResponse({
    status: 200,
    description: 'Feedback retrieved',
    type: GetFeedbackResponseDto,
  })
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
