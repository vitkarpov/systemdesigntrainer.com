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
  private readonly model: string;
  private readonly maxRetries = 3;
  private readonly timeoutMs = 30000; // 30 seconds

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }

    this.model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < this.maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          await this.delay(delayMs);
        }
      }
    }

    throw lastError;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on rate limits (429), server errors (5xx), and network errors
    return (
      error?.status === 429 ||
      (error?.status >= 500 && error?.status < 600) ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND'
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Timeout helper
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs),
      ),
    ]);
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

    return this.withRetry(async () => {
      const response = await this.withTimeout(
        this.client.messages.create({
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
        }),
        this.timeoutMs,
      );

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
    });
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
    return this.withRetry(async () => {
      const response = await this.withTimeout(
        this.client.messages.create({
          model: this.model,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        this.timeoutMs,
      );

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
    });
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
