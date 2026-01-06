import { Injectable } from '@nestjs/common';
import {
  SessionState,
  InterviewPhase,
  TranscriptMessage,
} from '../../interview/types/session.types';

export interface PromptContext {
  systemPrompt: string;
  userMessage: string;
}

export interface InterviewCaseData {
  title: string;
  problemStatement: string;
}

@Injectable()
export class PromptService {
  constructor() {}

  /**
   * Build a complete prompt context for the AI interviewer
   *
   * @param session - The current session state
   * @param interviewCase - The interview case data (title and problem statement)
   * @param recentMessages - Recent conversation history
   * @param candidateMessage - The current message from the candidate
   * @param diagramData - Optional diagram data drawn by the candidate
   */
  buildPromptContext(
    session: SessionState,
    interviewCase: InterviewCaseData,
    recentMessages: TranscriptMessage[],
    candidateMessage: string,
    diagramData?: { nodes: any[]; edges: any[] } | null,
  ): PromptContext {
    const phaseInstructions = this.getPhaseInstructions(
      session.currentPhase as InterviewPhase,
    );
    const diagramContext = this.buildDiagramContext(diagramData);

    const systemPrompt = this.buildSystemPrompt(
      session,
      interviewCase,
      phaseInstructions,
      diagramContext,
    );

    const userMessage = this.buildUserMessage(recentMessages, candidateMessage);

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
    interviewCase: InterviewCaseData,
    phaseInstructions: string,
    diagramContext: string,
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
${phaseInstructions}${diagramContext}

# Interview Style Guidelines
- Be conversational and professional
- Primarily respond to the candidate's questions and statements
- Avoid asking unprompted questions unless the candidate seems genuinely stuck
- When the candidate asks you a question, answer it directly and concisely
- Act like a real interviewer who is taking notes and listening actively
- Use minimal interjections like "Okay", "Got it", "Makes sense", "Interesting"

# Handling Phase Transitions
When you see a system message indicating a phase transition (e.g., "⏱️ Time's up..."), you should:
1. Naturally acknowledge the transition as the interviewer would in a real interview
2. Use a brief, professional tone like: "Alright, let's move on to [next phase]" or "Great, let's shift gears to [next phase]"
3. Guide the candidate into the new phase with a simple prompt relevant to that phase
4. Don't apologize or over-explain - just move forward naturally
5. Treat it as a normal interview progression, not as an interruption

Examples:
- "Alright, let's move on to the high-level design. Walk me through your overall architecture."
- "Great. Let's shift to discussing bottlenecks. Where do you see potential scaling issues?"
- "Okay, time to dive deeper. Pick a component you'd like to explore in detail."

# Response Format
- Keep responses very concise (1-3 sentences typically)
- Exception: At the very start of the interview, your greeting, introduction, and problem presentation can be longer (4-6 sentences) to establish rapport
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
- If this is the very start of the interview (no conversation history yet), begin by:
  1. Greeting the candidate warmly (e.g., "Hi! Thanks for joining today.")
  2. Briefly introducing yourself (e.g., "I'm [Name], a [role] at [company]. I've been working on [relevant area] for [time period].")
  3. Breaking the ice with a friendly comment to help them relax
  4. Then present the problem clearly and concisely
  5. Ask if they have any clarifying questions
- Once the problem has been presented:
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
   * Build context about the candidate's diagram for the AI
   */
  private buildDiagramContext(
    diagramData?: { nodes: any[]; edges: any[] } | null,
  ): string {
    if (!diagramData || diagramData.nodes.length === 0) {
      return '';
    }

    // Extract component types and counts
    const componentCounts = new Map<string, number>();
    diagramData.nodes.forEach((node) => {
      const type = node.type || 'generic';
      componentCounts.set(type, (componentCounts.get(type) || 0) + 1);
    });

    // Build readable summary
    const components = Array.from(componentCounts.entries())
      .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
      .join(', ');

    const connectionCount = diagramData.edges.length;

    return `\n\n# Candidate's Current Diagram
The candidate has drawn a diagram with the following components: ${components}.
They have ${connectionCount} connection${connectionCount !== 1 ? 's' : ''} between components.

When responding, you can reference their diagram naturally if relevant (e.g., "I see you have a load balancer in your design..."). Only mention the diagram if it's relevant to their question or statement. Don't force references to it.`;
  }

  /**
   * Build the user message that includes conversation history
   */
  private buildUserMessage(
    recentMessages: TranscriptMessage[],
    candidateMessage: string,
  ): string {
    let context = '';

    // Add conversation history if exists
    if (recentMessages.length > 0) {
      context += '# Recent Conversation\n\n';
      recentMessages.forEach((msg) => {
        let role: string;
        if (msg.role === 'interviewer') {
          role = 'Interviewer';
        } else if (msg.role === 'system') {
          role = 'System';
        } else {
          role = 'Candidate';
        }
        context += `${role}: ${msg.text}\n\n`;
      });
    }

    // Add the current candidate message
    context += `# Current Candidate Message\nCandidate: ${candidateMessage}\n\n`;

    // Check if the most recent message was a phase transition
    const lastMessage = recentMessages[recentMessages.length - 1];
    const isPhaseTransition =
      lastMessage?.role === 'system' && lastMessage?.text?.includes('⏱️');

    // Add context about what to focus on
    if (isPhaseTransition) {
      context += `# Your Task\nA phase transition just occurred. Acknowledge it naturally and guide the candidate into the new phase following the "Handling Phase Transitions" guidelines above. Keep it brief (1-2 sentences).`;
    } else {
      context += `# Your Task\nRespond to the candidate's message as the interviewer. Stay in character and follow the phase instructions above.`;
    }

    return context;
  }
}
