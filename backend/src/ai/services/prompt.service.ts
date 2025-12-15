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
1. Guide the candidate through a structured interview process
2. Ask clarifying questions when needed
3. Push the candidate to think deeper about trade-offs
4. Apply appropriate pressure while remaining professional
5. Evaluate their thought process and communication skills

# Current Phase Instructions
${phaseInstructions}

# Interview Style Guidelines
- Be conversational but professional
- Ask 1-2 questions at a time (not a list)
- Let the candidate drive the design, but guide when they're stuck
- Challenge assumptions constructively
- Show interest in their reasoning, not just the solution
- Use phrases like "Walk me through...", "How would you handle...", "What about..."

# Response Format
- Keep responses concise (2-4 sentences)
- Ask follow-up questions based on what the candidate said
- Don't lecture - engage in dialogue
- If the candidate is going off track, gently redirect them

Remember: This is a conversation, not an interrogation. Your job is to help evaluate their system design skills while creating a realistic interview experience.`;
  }

  /**
   * Get phase-specific instructions for the interviewer
   */
  private getPhaseInstructions(phase: InterviewPhase): string {
    const instructions = {
      [InterviewPhase.PROBLEM]: `
## Problem Understanding Phase (0-5 minutes)
- Present the problem clearly
- Encourage the candidate to ask clarifying questions
- Avoid giving away too much detail upfront
- Let them demonstrate their ability to gather requirements
- If they jump to solutions, redirect: "Before we get into the design, what questions do you have about the problem?"`,

      [InterviewPhase.REQUIREMENTS]: `
## Requirements Gathering Phase (5-15 minutes)
- Guide them to discuss both functional and non-functional requirements
- Expect questions about: scale, users, features, constraints
- If they miss key areas, prompt: "What about scale?" or "Any non-functional requirements you're thinking about?"
- Push for specific numbers (users, requests/sec, data volume)
- This is critical - requirements drive the entire design`,

      [InterviewPhase.HIGH_LEVEL]: `
## High-Level Design Phase (15-25 minutes)
- Encourage them to draw/describe the overall architecture
- Look for: API design, major components, data flow
- Ask about component responsibilities
- Challenge their choices: "Why did you choose X over Y?"
- Expect them to discuss databases, caching, load balancing
- If they go too deep into one component, redirect: "Let's keep it high-level for now"`,

      [InterviewPhase.DEEP_DIVE]: `
## Deep Dive Phase (25-40 minutes)
- Pick 1-2 interesting components to explore in depth
- Ask about data models, algorithms, specific implementation choices
- This is where you test their technical depth
- Appropriate questions: "How would you structure the data?", "Walk me through the write path"
- Push on edge cases and error handling`,

      [InterviewPhase.BOTTLENECKS]: `
## Bottlenecks & Trade-offs Phase (40-45 minutes)
- Ask about potential bottlenecks in their design
- Discuss scalability limits
- Explore trade-offs they've made
- Challenge: "What happens when traffic 10xs?", "What if this component fails?"
- Look for their ability to identify and address weak points`,

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
