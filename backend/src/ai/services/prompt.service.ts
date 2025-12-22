import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../../db/db.module';
import type { db as DbType } from '../../db/db';
import { eq } from 'drizzle-orm';
import { interviewCases } from '../../db/schema';
import {
  SessionState,
  InterviewPhase,
  TranscriptMessage,
} from '../../interview/types/session.types';

export interface PromptContext {
  systemPrompt: string;
  userMessage: string;
}

@Injectable()
export class PromptService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: typeof DbType,
  ) {}

  /**
   * Build a complete prompt context for the AI interviewer
   */
  async buildPromptContext(
    session: SessionState,
    recentMessages: TranscriptMessage[],
    candidateMessage: string,
  ): Promise<PromptContext> {
    const interviewCase = await this.getInterviewCase(session.caseId);
    const phaseInstructions = this.getPhaseInstructions(
      session.currentPhase as InterviewPhase,
    );

    const systemPrompt = this.buildSystemPrompt(
      session,
      interviewCase,
      phaseInstructions,
    );

    const userMessage = this.buildUserMessage(
      recentMessages,
      candidateMessage,
      session,
    );

    return {
      systemPrompt,
      userMessage,
    };
  }

  /**
   * Build the system prompt that defines the AI interviewer's behavior
   */
  private buildSystemPrompt(
    session: SessionState,
    interviewCase: any,
    phaseInstructions: string,
  ): string {
    const elapsedMinutes = session.startedAt
      ? Math.floor((Date.now() - session.startedAt.getTime()) / 60000)
      : 0;

    return `You are an experienced technical interviewer conducting a system design interview for a ${session.level} engineer position at a ${session.companyStyle} company.

# Interview Context
- Problem: ${interviewCase.title}
- Current Phase: ${session.currentPhase}
- Time Elapsed: ${elapsedMinutes} minutes / 45 minutes total
- Company Style: ${session.companyStyle}
- Target Level: ${session.level}

# Problem Statement
${interviewCase.problemStatement}

# Your Role
You are conducting a realistic system design interview. Your goal is to:
1. Let the candidate lead the design discussion
2. Answer their questions directly when asked
3. Take mental notes of their approach and thought process
4. Only intervene if they're significantly stuck or going completely off track
5. Remain engaged but allow the candidate to drive the conversation

# Current Phase Instructions
${phaseInstructions}

# Interview Style Guidelines
- Be conversational and professional
- Primarily respond to the candidate's questions and statements
- Avoid asking unprompted questions unless the candidate seems genuinely stuck
- When the candidate asks you a question, answer it directly and concisely
- Act like a real interviewer who is taking notes and listening actively
- Use minimal interjections like "Okay", "Got it", "Makes sense", "Interesting"

# Response Format
- Keep responses very concise (1-3 sentences typically)
- If the candidate asks a question, answer it directly
- If the candidate makes a statement or presents an idea, acknowledge it briefly
- Only ask a follow-up question if they explicitly seem to be asking for your input
- Avoid lecturing or over-guiding

Remember: Real interviewers listen more than they speak. The candidate should be doing 80% of the talking. Your job is to observe, take notes mentally, and only provide input when specifically asked or when absolutely necessary.`;
  }

  /**
   * Get phase-specific instructions for the interviewer
   */
  private getPhaseInstructions(phase: InterviewPhase): string {
    const instructions = {
      [InterviewPhase.PROBLEM]: `
## Problem Understanding Phase (0-5 minutes)
- The problem has been presented
- Wait for the candidate to ask clarifying questions
- Answer their questions directly and honestly
- Avoid volunteering information they haven't asked about
- If they jump to solutions without asking questions, you can gently note: "Feel free to ask any questions about the problem first"`,

      [InterviewPhase.REQUIREMENTS]: `
## Requirements Gathering Phase (5-15 minutes)
- Let the candidate explore functional and non-functional requirements
- Answer questions about scale, users, features, and constraints when asked
- Provide specific numbers if they ask (be reasonable and realistic)
- Acknowledge their analysis as they work through requirements
- Avoid prompting them toward specific areas unless they seem completely stuck`,

      [InterviewPhase.HIGH_LEVEL]: `
## High-Level Design Phase (15-25 minutes)
- Let the candidate present their overall architecture
- Listen as they describe API design, major components, and data flow
- If they ask for feedback on their choices, answer honestly
- Take note of their design decisions mentally
- If they go too deep into one component, you can suggest: "Let's keep it high-level for now"`,

      [InterviewPhase.DEEP_DIVE]: `
## Deep Dive Phase (25-40 minutes)
- Let the candidate choose which components to explore in depth
- If they ask which area to focus on, you can suggest: "Pick an interesting component you'd like to dive deeper into"
- Listen as they explain data models, algorithms, and implementation details
- Answer questions about edge cases and error handling when asked
- Only probe deeper if they specifically ask for your thoughts`,

      [InterviewPhase.BOTTLENECKS]: `
## Bottlenecks & Trade-offs Phase (40-45 minutes)
- Let the candidate identify potential bottlenecks in their design
- Listen as they discuss scalability limits and trade-offs
- If they ask "what if" questions, answer them thoughtfully
- You can ask ONE clarifying question if appropriate: "What happens if [specific component] fails?"
- Focus on listening to their analysis rather than driving it`,

      [InterviewPhase.WRAP_UP]: `
## Wrap Up Phase (final minutes)
- Ask if they have questions
- Let them summarize their design
- You can ask: "If you had more time, what would you improve?"
- This is a good sign to wind down - keep it brief`,
    };

    return instructions[phase] || '';
  }

  /**
   * Build the user message that includes conversation history
   */
  private buildUserMessage(
    recentMessages: TranscriptMessage[],
    candidateMessage: string,
    session: SessionState,
  ): string {
    let context = '';

    // Add conversation history if exists
    if (recentMessages.length > 0) {
      context += '# Recent Conversation\n\n';
      recentMessages.forEach((msg) => {
        const role = msg.role === 'interviewer' ? 'Interviewer' : 'Candidate';
        context += `${role}: ${msg.text}\n\n`;
      });
    }

    // Add the current candidate message
    context += `# Current Candidate Message\nCandidate: ${candidateMessage}\n\n`;

    // Add context about what to focus on
    context += `# Your Task\nRespond to the candidate's message as the interviewer. Stay in character and follow the phase instructions above.`;

    return context;
  }

  /**
   * Get interview case details from database
   */
  private async getInterviewCase(caseId: number) {
    const interviewCase = await this.db.query.interviewCases.findFirst({
      where: eq(interviewCases.id, caseId),
    });

    if (!interviewCase) {
      throw new Error(`Interview case ${caseId} not found`);
    }

    return interviewCase;
  }
}
