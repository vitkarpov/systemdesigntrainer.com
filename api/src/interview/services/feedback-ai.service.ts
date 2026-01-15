import { Injectable, Inject, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { DATABASE_CONNECTION } from '../../../db/db.module';
import type { db as DbType } from '../../../db/db';
import { SignalService, SignalName } from './signal.service';
import { AiService } from '../../ai/services/ai.service';
import { InterviewPhase } from '../types/session.types';
import type {
  FeedbackScores,
  FeedbackItemData,
  FeedbackNextStepData,
} from './feedback.service';

export interface AIFeedbackResult {
  overallSummary: string;
  items: FeedbackItemData[];
  nextSteps: FeedbackNextStepData[];
}

@Injectable()
export class FeedbackAiService {
  private readonly logger = new Logger(FeedbackAiService.name);

  private readonly AI_FEEDBACK_SYSTEM_PROMPT = `You are a senior software engineer who conducts system design interviews at top tech companies. You have 10+ years of experience and have interviewed hundreds of candidates.

Your task is to write detailed, constructive interview feedback that:
- References specific moments from the conversation
- Balances strengths and weaknesses honestly
- Provides actionable improvement suggestions
- Explains your reasoning clearly
- Matches the expectations for the candidate's level and company type

You write feedback that hiring committees use to make decisions.`;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
    private aiService: AiService,
    private signalService: SignalService,
  ) {}

  /**
   * Analyze entire transcript to detect signals using AI (batch analysis)
   * This replaces real-time heuristic-based detection with end-of-interview AI analysis
   */
  async analyzeTranscriptSignals(sessionId: number): Promise<any[]> {
    this.logger.log(`Starting batch signal analysis for session ${sessionId}`, {
      sessionId,
    });

    try {
      const messages = await this.getSessionMessages(sessionId);

      if (messages.length === 0) {
        this.logger.warn(`No messages found for session ${sessionId}`);
        return [];
      }

      const transcript = this.formatTranscript(messages);

      const prompt = `Analyze this system design interview transcript and identify ALL positive signals demonstrated by the candidate.

For each signal you detect, provide:
- The signal name (from the list below)
- When it occurred (seconds elapsed)
- Which phase it occurred in
- A brief quote or evidence from the transcript

SIGNAL TYPES:
1. asked_functional_reqs: Candidate explicitly asks about features, functional requirements, or what the system should do
2. asked_non_functional_reqs: Candidate asks about scale, performance, latency, availability, SLA, or non-functional requirements
3. clarified_constraints: Candidate asks about constraints, limitations, assumptions, or restrictions
4. mentioned_scale: Candidate discusses specific numbers (e.g., "100M users", "10K requests per second") or scaling strategies
5. proposed_api: Candidate discusses API design, endpoints, REST/GraphQL, or HTTP methods
6. drew_high_level_diagram: Candidate references drawing/creating architecture diagrams, components, or system design
7. discussed_data_model: Candidate discusses database schema, tables, entities, relationships, or data structures
8. addressed_bottlenecks: Candidate identifies bottlenecks, single points of failure, or optimization opportunities
9. discussed_tradeoffs: Candidate compares different approaches, discusses pros/cons, or analyzes trade-offs
10. structured_approach: Candidate uses a systematic approach with numbered steps, "first/second/third", or clear organization
11. asked_clarifying_questions: Candidate asks clarifying questions to understand requirements better

IMPORTANT:
- Only detect signals that are CLEARLY present in the candidate's messages (not interviewer's)
- Be conservative - don't over-detect
- Each signal should only be detected once (the first occurrence)
- Provide specific evidence from the transcript

TRANSCRIPT:
${transcript}

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "signals": [
    {
      "signalName": "asked_functional_reqs",
      "detectedAt": 45,
      "phase": "requirements",
      "evidence": "Asked 'What features should we support?'"
    }
  ]
}`;

      this.logger.log(`Calling AI for signal detection`, {
        sessionId,
        messageCount: messages.length,
        transcriptLength: transcript.length,
      });

      const aiResponse = await this.aiService.generateResponse({
        systemPrompt:
          'You are an expert system design interview evaluator. Your task is to analyze interview transcripts and identify positive behavioral signals demonstrated by candidates. Be precise and conservative in your detections.',
        userMessage: prompt,
        temperature: 0.3, // Low temperature for consistency
        maxTokens: 3000,
        timeout: 60000, // 60 seconds
        model: 'claude-sonnet-4-5',
      });

      this.logger.log(`AI signal detection response received`, {
        sessionId,
        model: aiResponse.model,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      });

      const parsed = this.parseSignalDetectionResponse(aiResponse.text);

      const detectedSignals: any[] = [];
      for (const signal of parsed.signals) {
        if (!Object.values(SignalName).includes(signal.signalName)) {
          this.logger.warn('Invalid signal name detected by AI', {
            sessionId,
            signal,
          });
          continue;
        }

        const stored = await this.signalService.recordSignal(
          sessionId,
          signal.signalName as SignalName,
          signal.phase as InterviewPhase,
          signal.detectedAt,
          undefined, // messageId not tracked in batch analysis
        );

        if (stored) {
          detectedSignals.push(stored);
          this.logger.log(
            `Recorded signal: ${signal.signalName} at ${signal.detectedAt}s in ${signal.phase} phase`,
            { sessionId },
          );
        }
      }

      this.logger.log(
        `Batch signal analysis completed for session ${sessionId}: detected ${detectedSignals.length} signals`,
        { sessionId, signalCount: detectedSignals.length },
      );

      return detectedSignals;
    } catch (error) {
      this.logger.error(
        `Batch signal analysis failed for session ${sessionId}`,
        {
          sessionId,
          error: error.message,
          stack: error.stack,
        },
      );

      // Don't throw - allow feedback generation to continue with no signals
      return [];
    }
  }

  /**
   * Parse AI signal detection response
   */
  private parseSignalDetectionResponse(text: string): { signals: any[] } {
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();

      const parsed = JSON.parse(jsonText);

      // Validate structure
      if (!parsed.signals || !Array.isArray(parsed.signals)) {
        throw new Error(
          'Invalid signal detection response: missing signals array',
        );
      }

      return parsed;
    } catch (error) {
      this.logger.error('Failed to parse signal detection response', {
        error: error.message,
        rawText: text.substring(0, 500), // Log first 500 chars
      });
      throw error;
    }
  }

  /**
   * Generate AI-powered feedback for a session
   */
  async generateFeedback(
    sessionId: number,
    scores: FeedbackScores,
    signals: any[],
    redFlags: any[],
    session: any,
  ): Promise<AIFeedbackResult> {
    const logger = this.logger;
    const logContext = { sessionId };

    try {
      // Step 1: Get messages
      logger.log('Gathering feedback data for AI generation', logContext);
      const messages = await this.getSessionMessages(sessionId);

      // Step 2: Build prompt
      logger.log('Building AI prompt', logContext);
      const prompt = this.buildAIFeedbackPrompt(
        scores,
        session,
        messages,
        signals,
        redFlags,
      );

      // Step 3: Call AI service with 120-second timeout
      logger.log('Calling AI service', {
        ...logContext,
        promptLength: prompt.length,
      });
      const aiResponse = await this.aiService.generateResponse({
        systemPrompt: this.AI_FEEDBACK_SYSTEM_PROMPT,
        userMessage: prompt,
        temperature: 0.7,
        maxTokens: 4000,
        timeout: 120000, // 120 seconds for comprehensive feedback generation
        model: 'claude-sonnet-4-5', // Use Sonnet for better structured output
      });

      logger.log('AI response received', {
        ...logContext,
        model: aiResponse.model,
        inputTokens: aiResponse.usage?.inputTokens,
        outputTokens: aiResponse.usage?.outputTokens,
      });

      // Step 4: Parse JSON response
      const parsed = this.parseAIResponse(aiResponse.text);

      // Step 5: Transform to service format
      return this.transformAIResponse(parsed);
    } catch (error) {
      logger.error('AI feedback generation error', {
        ...logContext,
        error: error.message,
        stack: error.stack,
      });

      // Capture error in Sentry before falling back to rule-based feedback
      Sentry.captureException(error, {
        tags: {
          sessionId: sessionId.toString(),
          service: 'FeedbackAiService',
          method: 'generateFeedback',
          aiFeature: 'feedback_generation',
        },
        extra: {
          scores,
          errorMessage: error.message,
        },
        level: 'error',
      });

      // Re-throw to trigger fallback in parent method
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for AI feedback generation
   */
  private buildAIFeedbackPrompt(
    scores: FeedbackScores,
    session: any,
    messages: any[],
    signals: any[],
    redFlags: any[],
  ): string {
    const transcript = this.formatTranscript(messages);
    const signalsText = this.formatSignals(signals);
    const redFlagsText = this.formatRedFlags(redFlags);
    const threshold = this.determineHireThreshold(
      session.companyStyle,
      session.level,
    );

    return `INTERVIEW CONTEXT:
- Candidate Level: ${session.level}
- Company Style: ${session.companyStyle}
- Problem: ${session.problem?.title || 'System Design Interview'}
- Duration: ${Math.round((session.duration || 0) / 60)} minutes
- Completion Status: ${session.status}

PERFORMANCE SCORES (0-100 scale):
Your scoring system calculated these scores based on detected behaviors:
- Requirements: ${scores.requirements}/100
- Design: ${scores.design}/100
- Communication: ${scores.communication}/100
- Time Management: ${scores.timeManagement}/100
- Technical Depth: ${scores.depth}/100
- Overall: ${scores.overall}/100

DETECTED POSITIVE SIGNALS:
${signalsText}

DETECTED RED FLAGS:
${redFlagsText}

FULL INTERVIEW TRANSCRIPT:
${transcript}

---

HIRING STANDARDS:

For ${session.companyStyle} companies at ${session.level} level:

${this.getHiringStandardsText(session.companyStyle, session.level, threshold)}

---

OUTPUT FORMAT:

Return ONLY a valid JSON object. Do not include any text before or after the JSON. Do not wrap it in markdown code blocks.

{
  "overallSummary": "**VERDICT: HIRE** (or **VERDICT: NO HIRE**) followed by 2-3 paragraphs summarizing performance, referencing specific moments from the transcript, and explaining your hire/no-hire decision clearly.",
  "strengths": [
    "Specific strength with example from transcript",
    "Another strength...",
    ...3-5 items
  ],
  "weaknesses": [
    "Specific weakness with example from transcript",
    "Another weakness...",
    ...2-4 items
  ],
  "suggestions": [
    "Actionable suggestion for improvement",
    "Another suggestion...",
    ...3-5 items
  ],
  "nextSteps": [
    "Concrete action to take (e.g., 'Practice calculating back-of-envelope estimates for 1M DAU systems')",
    ...3-4 items
  ]
}

CRITICAL FORMATTING RULES:
- Return ONLY the JSON object above, nothing else
- Do NOT add any explanatory text before or after the JSON
- Do NOT wrap the JSON in markdown code blocks (no \`\`\`json)
- Start overallSummary with **VERDICT: HIRE** or **VERDICT: NO HIRE** on the first line
- Be SPECIFIC: Reference actual quotes or moments from the transcript
- Be BALANCED: Acknowledge both strengths and weaknesses
- Be ACTIONABLE: Every suggestion should be concrete
- Be HONEST: Don't sugarcoat significant gaps
- Consider the LEVEL and COMPANY when setting expectations
- The verdict should align with scores and company standards`;
  }

  /**
   * Format signals for prompt
   */
  private formatSignals(signals: any[]): string {
    if (signals.length === 0) {
      return 'None detected';
    }

    return signals
      .map((signal) => {
        const time = this.formatTime(signal.secondsElapsed || 0);
        return `- ${signal.signalName.replace(/_/g, ' ').toUpperCase()} (${time}, ${signal.phase || 'unknown'} phase)`;
      })
      .join('\n');
  }

  /**
   * Format red flags for prompt
   */
  private formatRedFlags(redFlags: any[]): string {
    if (redFlags.length === 0) {
      return 'None detected';
    }

    return redFlags
      .map((flag) => {
        const time = this.formatTime(flag.secondsElapsed || 0);
        return `- ${flag.flagName.replace(/_/g, ' ').toUpperCase()} (${time}, ${flag.phase || 'unknown'} phase)`;
      })
      .join('\n');
  }

  /**
   * Format transcript for prompt
   */
  private formatTranscript(messages: any[]): string {
    return messages
      .map((msg) => {
        const timestamp = this.formatTime(msg.secondsElapsed || 0);
        const role = msg.role === 'user' ? 'Candidate' : 'Interviewer';
        const phase = msg.phase || 'unknown';
        return `[${timestamp}] [${phase}] ${role}:\n${msg.text}`;
      })
      .join('\n\n');
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get hiring standards text for prompt
   */
  private getHiringStandardsText(
    companyStyle: string,
    level: string,
    threshold: number,
  ): string {
    if (companyStyle === 'faang') {
      return `FAANG STANDARDS:
- Hire threshold: Overall score >= ${threshold}
- Must demonstrate: Strong requirements gathering, scalability thinking, clear communication
- Red flags are serious concerns that often lead to no-hire decisions
- Expectations are high; good performance in most areas is required`;
    } else {
      return `${companyStyle.toUpperCase()} STANDARDS:
- Hire threshold: Overall score >= ${threshold}
- More forgiving on: Time management, depth of scale discussion
- Focus on: Practical design, clear thinking process, ability to build working systems
- Red flags should be considered in context of overall performance`;
    }
  }

  /**
   * Determine hire threshold based on company and level
   */
  private determineHireThreshold(companyStyle: string, level: string): number {
    const thresholds: Record<string, Record<string, number>> = {
      faang: { junior: 70, mid: 75, senior: 80 },
      startup: { junior: 65, mid: 70, senior: 75 },
      generic: { junior: 65, mid: 70, senior: 75 },
    };

    return thresholds[companyStyle]?.[level] ?? 70;
  }

  /**
   * Get session messages for transcript
   */
  private async getSessionMessages(sessionId: number): Promise<any[]> {
    const messages = await this.db.query.transcriptMessages.findMany({
      where: (messages, { eq }) => eq(messages.sessionId, sessionId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    return messages;
  }

  /**
   * Parse AI response JSON
   */
  private parseAIResponse(text: string): any {
    try {
      // Try to extract JSON from the response
      // AI might wrap it in code blocks or add explanatory text
      let jsonText = text.trim();

      // Remove code block markers if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7);
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3);
      }

      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3);
      }

      jsonText = jsonText.trim();

      // Parse JSON
      const parsed = JSON.parse(jsonText);

      // Basic structure validation
      if (
        !parsed.overallSummary ||
        !Array.isArray(parsed.strengths) ||
        !Array.isArray(parsed.weaknesses) ||
        !Array.isArray(parsed.suggestions) ||
        !Array.isArray(parsed.nextSteps)
      ) {
        throw new Error('AI response missing required fields');
      }

      return parsed;
    } catch (error) {
      // Capture parsing error with the raw response text for debugging
      Sentry.captureException(error, {
        tags: {
          service: 'FeedbackAiService',
          method: 'parseAIResponse',
          errorType: 'json_parse_error',
        },
        extra: {
          rawResponseText: text,
          rawResponseLength: text.length,
          errorMessage: error.message,
        },
        level: 'error',
      });

      throw error;
    }
  }

  /**
   * Transform AI response to service format
   */
  private transformAIResponse(parsed: any): AIFeedbackResult {
    const items: FeedbackItemData[] = [];
    let order = 0;

    // Add strengths
    for (const strength of parsed.strengths) {
      items.push({
        type: 'strength',
        description: strength,
        displayOrder: order++,
      });
    }

    // Add weaknesses
    for (const weakness of parsed.weaknesses) {
      items.push({
        type: 'weakness',
        description: weakness,
        displayOrder: order++,
      });
    }

    // Add suggestions
    for (const suggestion of parsed.suggestions) {
      items.push({
        type: 'suggestion',
        description: suggestion,
        displayOrder: order++,
      });
    }

    // Transform next steps
    const nextSteps: FeedbackNextStepData[] = parsed.nextSteps.map(
      (step: string, index: number) => ({
        description: step,
        displayOrder: index,
      }),
    );

    return {
      overallSummary: parsed.overallSummary,
      items,
      nextSteps,
    };
  }
}
