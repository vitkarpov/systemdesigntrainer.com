import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackAiService } from './feedback-ai.service';
import { AiService } from '../../ai/services/ai.service';
import { SignalService, SignalName } from './signal.service';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import { FeedbackScores } from './feedback.service';

describe('FeedbackAiService', () => {
  let service: FeedbackAiService;
  let mockAiService: jest.Mocked<AiService>;
  let mockSignalService: jest.Mocked<Partial<SignalService>>;
  let mockDb: any;

  beforeEach(async () => {
    // Create mock AI service
    mockAiService = {
      generateResponse: jest.fn(),
    } as any;

    // Create mock Signal service
    mockSignalService = {
      recordSignal: jest.fn(),
    };

    // Create mock database
    mockDb = {
      query: {
        transcriptMessages: {
          findMany: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackAiService,
        {
          provide: AiService,
          useValue: mockAiService,
        },
        {
          provide: SignalService,
          useValue: mockSignalService,
        },
        {
          provide: DATABASE_CONNECTION,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<FeedbackAiService>(FeedbackAiService);
  });

  describe('analyzeTranscriptSignals', () => {
    it('should detect and record signals from AI response', async () => {
      const sessionId = 1;
      const mockMessages = [
        {
          id: 1,
          sessionId,
          role: 'user',
          text: 'What are the functional requirements?',
          phase: 'requirements',
          secondsElapsed: 60,
          createdAt: new Date(),
        },
      ];

      const mockAiResponse = {
        text: JSON.stringify({
          signals: [
            {
              signalName: 'asked_functional_reqs',
              detectedAt: 60,
              phase: 'requirements',
              evidence: 'Asked about functional requirements',
            },
          ],
        }),
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      const mockStoredSignal = {
        id: 1,
        sessionId,
        signalName: 'asked_functional_reqs',
        detectedAt: new Date(),
        secondsElapsed: 60,
        phase: 'requirements',
        triggeredByMessageId: null,
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);
      mockSignalService.recordSignal.mockResolvedValue(mockStoredSignal);

      const result = await service.analyzeTranscriptSignals(sessionId);

      expect(result).toHaveLength(1);
      expect(mockSignalService.recordSignal).toHaveBeenCalledWith(
        sessionId,
        SignalName.ASKED_FUNCTIONAL_REQS,
        'requirements',
        60,
        undefined,
      );
    });

    it('should filter out invalid signal names', async () => {
      const sessionId = 1;
      const mockMessages = [
        {
          id: 1,
          sessionId,
          role: 'user',
          text: 'Test message',
          phase: 'requirements',
          secondsElapsed: 60,
          createdAt: new Date(),
        },
      ];

      const mockAiResponse = {
        text: JSON.stringify({
          signals: [
            {
              signalName: 'invalid_signal_name',
              detectedAt: 60,
              phase: 'requirements',
              evidence: 'Some evidence',
            },
            {
              signalName: 'asked_functional_reqs',
              detectedAt: 120,
              phase: 'requirements',
              evidence: 'Valid signal',
            },
          ],
        }),
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      const mockStoredSignal = {
        id: 1,
        sessionId,
        signalName: 'asked_functional_reqs',
        detectedAt: new Date(),
        secondsElapsed: 120,
        phase: 'requirements',
        triggeredByMessageId: null,
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);
      mockSignalService.recordSignal.mockResolvedValue(mockStoredSignal);

      const result = await service.analyzeTranscriptSignals(sessionId);

      expect(result).toHaveLength(1);
      expect(mockSignalService.recordSignal).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no messages found', async () => {
      const sessionId = 1;
      mockDb.query.transcriptMessages.findMany.mockResolvedValue([]);

      const result = await service.analyzeTranscriptSignals(sessionId);

      expect(result).toEqual([]);
      expect(mockAiService.generateResponse).not.toHaveBeenCalled();
    });

    it('should return empty array on AI error', async () => {
      const sessionId = 1;
      const mockMessages = [
        {
          id: 1,
          sessionId,
          role: 'user',
          text: 'Test message',
          phase: 'requirements',
          secondsElapsed: 60,
          createdAt: new Date(),
        },
      ];

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockRejectedValue(
        new Error('AI service error'),
      );

      const result = await service.analyzeTranscriptSignals(sessionId);

      expect(result).toEqual([]);
    });

    it('should handle markdown-wrapped JSON responses', async () => {
      const sessionId = 1;
      const mockMessages = [
        {
          id: 1,
          sessionId,
          role: 'user',
          text: 'Test message',
          phase: 'requirements',
          secondsElapsed: 60,
          createdAt: new Date(),
        },
      ];

      const mockAiResponse = {
        text:
          '```json\n' +
          JSON.stringify({
            signals: [
              {
                signalName: 'asked_functional_reqs',
                detectedAt: 60,
                phase: 'requirements',
                evidence: 'Asked about functional requirements',
              },
            ],
          }) +
          '\n```',
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 100, outputTokens: 50 },
      };

      const mockStoredSignal = {
        id: 1,
        sessionId,
        signalName: 'asked_functional_reqs',
        detectedAt: new Date(),
        secondsElapsed: 60,
        phase: 'requirements',
        triggeredByMessageId: null,
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);
      mockSignalService.recordSignal.mockResolvedValue(mockStoredSignal);

      const result = await service.analyzeTranscriptSignals(sessionId);

      expect(result).toHaveLength(1);
    });
  });

  describe('generateFeedback', () => {
    const mockScores: FeedbackScores = {
      overall: 75,
      requirements: 80,
      design: 75,
      communication: 70,
      timeManagement: 75,
      depth: 70,
    };

    const mockSignals = [
      {
        id: 1,
        sessionId: 1,
        signalName: 'asked_functional_reqs',
        detectedAt: new Date(),
        secondsElapsed: 60,
        phase: 'requirements',
        triggeredByMessageId: null,
      },
    ];

    const mockRedFlags: any[] = [];

    const mockSession = {
      id: 1,
      userId: 1,
      status: 'completed',
      level: 'mid',
      companyStyle: 'faang',
      duration: 2700,
      problem: { title: 'URL Shortener' },
    };

    const mockMessages = [
      {
        id: 1,
        sessionId: 1,
        role: 'user',
        text: 'What are the requirements?',
        phase: 'requirements',
        secondsElapsed: 60,
        createdAt: new Date(),
      },
    ];

    it('should generate AI feedback successfully', async () => {
      const mockAiResponse = {
        text: JSON.stringify({
          overallSummary:
            '**VERDICT: HIRE** Good performance with strong requirements gathering.',
          strengths: ['Asked clarifying questions', 'Structured approach'],
          weaknesses: ['Could improve on scalability discussion'],
          suggestions: ['Practice calculating estimates'],
          nextSteps: ['Do another practice interview'],
        }),
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 500, outputTokens: 200 },
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);

      const result = await service.generateFeedback(
        1,
        mockScores,
        mockSignals,
        mockRedFlags,
        mockSession,
      );

      expect(result.overallSummary).toContain('VERDICT: HIRE');
      expect(result.items).toHaveLength(4); // 2 strengths + 1 weakness + 1 suggestion
      expect(result.items[0].type).toBe('strength');
      expect(result.items[2].type).toBe('weakness');
      expect(result.items[3].type).toBe('suggestion');
      expect(result.nextSteps).toHaveLength(1);
    });

    it('should handle markdown-wrapped JSON responses', async () => {
      const mockAiResponse = {
        text:
          '```json\n' +
          JSON.stringify({
            overallSummary: '**VERDICT: NO HIRE** Needs improvement.',
            strengths: ['Some good moments'],
            weaknesses: ['Skipped requirements', 'No scale discussion'],
            suggestions: ['Practice requirements gathering'],
            nextSteps: ['Review fundamentals'],
          }) +
          '\n```',
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 500, outputTokens: 200 },
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);

      const result = await service.generateFeedback(
        1,
        mockScores,
        mockSignals,
        mockRedFlags,
        mockSession,
      );

      expect(result.overallSummary).toContain('VERDICT: NO HIRE');
    });

    it('should throw error on invalid JSON response', async () => {
      const mockAiResponse = {
        text: 'This is not valid JSON',
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 500, outputTokens: 200 },
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);

      await expect(
        service.generateFeedback(
          1,
          mockScores,
          mockSignals,
          mockRedFlags,
          mockSession,
        ),
      ).rejects.toThrow();
    });

    it('should throw error on missing required fields', async () => {
      const mockAiResponse = {
        text: JSON.stringify({
          overallSummary: 'Some summary',
          // Missing required fields
        }),
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 500, outputTokens: 200 },
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);

      await expect(
        service.generateFeedback(
          1,
          mockScores,
          mockSignals,
          mockRedFlags,
          mockSession,
        ),
      ).rejects.toThrow('AI response missing required fields');
    });

    it('should assign correct displayOrder to items', async () => {
      const mockAiResponse = {
        text: JSON.stringify({
          overallSummary: '**VERDICT: HIRE** Good performance.',
          strengths: ['Strength 1', 'Strength 2'],
          weaknesses: ['Weakness 1'],
          suggestions: ['Suggestion 1', 'Suggestion 2'],
          nextSteps: ['Next step 1'],
        }),
        model: 'claude-sonnet-4-5',
        usage: { inputTokens: 500, outputTokens: 200 },
      };

      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockResolvedValue(mockAiResponse);

      const result = await service.generateFeedback(
        1,
        mockScores,
        mockSignals,
        mockRedFlags,
        mockSession,
      );

      // Check that items are ordered sequentially
      result.items.forEach((item, index) => {
        expect(item.displayOrder).toBe(index);
      });

      // Check that next steps are ordered sequentially
      result.nextSteps.forEach((step, index) => {
        expect(step.displayOrder).toBe(index);
      });
    });

    it('should throw error when AI service fails', async () => {
      mockDb.query.transcriptMessages.findMany.mockResolvedValue(mockMessages);
      mockAiService.generateResponse.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await expect(
        service.generateFeedback(
          1,
          mockScores,
          mockSignals,
          mockRedFlags,
          mockSession,
        ),
      ).rejects.toThrow('AI service unavailable');
    });
  });
});
