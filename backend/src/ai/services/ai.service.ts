import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Observable } from 'rxjs';

export interface GenerateResponseOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiResponse {
  text: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamingAiResponse {
  fullText: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'complete'; fullResponse: StreamingAiResponse };

@Injectable()
export class AiService {
  private client: Anthropic;
  private readonly model = 'claude-haiku-4-5';

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Generate a response from Claude
   */
  async generateResponse(
    options: GenerateResponseOptions,
  ): Promise<AiResponse> {
    const {
      systemPrompt,
      userMessage,
      temperature = 0.7,
      maxTokens = 1024,
    } = options;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '';

    return {
      text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Generate a response with conversation history
   */
  async generateResponseWithHistory(
    systemPrompt: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    temperature = 0.7,
    maxTokens = 1024,
  ): Promise<AiResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const text = textContent && 'text' in textContent ? textContent.text : '';

    return {
      text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Generate a streaming response from Claude
   * Returns an Observable that emits text deltas as they arrive
   */
  generateStreamingResponse(
    options: GenerateResponseOptions,
  ): Observable<StreamEvent> {
    const {
      systemPrompt,
      userMessage,
      temperature = 0.7,
      maxTokens = 1024,
    } = options;

    return new Observable<StreamEvent>((observer) => {
      let fullText = '';
      let model = '';
      let inputTokens = 0;
      let outputTokens = 0;

      (async () => {
        try {
          const stream = await this.client.messages.stream({
            model: this.model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
          });

          // Listen for text deltas
          stream.on('text', (text: string) => {
            fullText += text;
            observer.next({ type: 'delta', text });
          });

          // Wait for the stream to complete
          const finalMessage = await stream.finalMessage();

          model = finalMessage.model;
          inputTokens = finalMessage.usage.input_tokens;
          outputTokens = finalMessage.usage.output_tokens;

          // Emit completion event
          observer.next({
            type: 'complete',
            fullResponse: {
              fullText,
              model,
              usage: {
                inputTokens,
                outputTokens,
              },
            },
          });

          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }
}
