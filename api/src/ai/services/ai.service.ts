import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { Observable } from 'rxjs';
import * as Sentry from '@sentry/node';

export interface GenerateResponseOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  model?: string;
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
  private async withRetry<T>(
    fn: () => Promise<T>,
    tags: Record<string, string> = {},
  ): Promise<T> {
    let lastError: any;
    let retryCount = 0;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await fn();

        // Track retry count metric (only if retries occurred)
        if (retryCount > 0) {
          Sentry.metrics.count('ai.response.retry_count', retryCount, {
            attributes: { ...tags, final_result: 'success' },
          });
        }

        return result;
      } catch (error: any) {
        lastError = error;
        retryCount++;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          // Track non-retryable failure
          Sentry.metrics.count('ai.request.failure', 1, {
            attributes: {
              ...tags,
              error_type: this.getErrorType(error),
              retryable: 'false',
            },
          });
          throw error;
        }

        // Don't wait after the last attempt
        if (attempt < this.maxRetries - 1) {
          const delayMs = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          await this.delay(delayMs);
        }
      }
    }

    // Track failure after all retries exhausted
    Sentry.metrics.count('ai.request.failure', 1, {
      attributes: {
        ...tags,
        error_type: this.getErrorType(lastError),
        retryable: 'true',
        retries_exhausted: 'true',
      },
    });

    Sentry.metrics.count('ai.response.retry_count', retryCount, {
      attributes: { ...tags, final_result: 'failure' },
    });

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
   * Get error type for metrics tagging
   */
  private getErrorType(error: any): string {
    if (error?.status === 429) return 'rate_limit';
    if (error?.status === 400) return 'bad_request';
    if (error?.status === 401) return 'unauthorized';
    if (error?.status === 403) return 'forbidden';
    if (error?.status >= 500 && error?.status < 600) return 'server_error';
    if (error?.code === 'ECONNRESET') return 'connection_reset';
    if (error?.code === 'ETIMEDOUT') return 'timeout';
    if (error?.code === 'ENOTFOUND') return 'dns_error';
    if (error?.message?.includes('timeout')) return 'timeout';
    return 'unknown';
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
      timeout = this.timeoutMs,
      model = this.model,
    } = options;

    const startTime = Date.now();
    const tags = {
      model,
      streaming: 'false',
      method: 'generateResponse',
    };

    try {
      const result = await this.withRetry(async () => {
        const response = await this.withTimeout(
          this.client.messages.create({
            model,
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
          timeout,
        );

        // Extract text from response
        const textContent = response.content.find((c) => c.type === 'text');
        const text =
          textContent && 'text' in textContent ? textContent.text : '';

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      }, tags);

      // Track metrics on success
      const duration = Date.now() - startTime;
      Sentry.metrics.distribution('ai.response.duration', duration, {
        unit: 'millisecond',
        attributes: tags,
      });

      if (result.usage) {
        Sentry.metrics.distribution(
          'ai.response.tokens.input',
          result.usage.inputTokens,
          {
            attributes: tags,
          },
        );
        Sentry.metrics.distribution(
          'ai.response.tokens.output',
          result.usage.outputTokens,
          {
            attributes: tags,
          },
        );
      }

      return result;
    } catch (error) {
      // Track duration even on failure
      const duration = Date.now() - startTime;
      Sentry.metrics.distribution('ai.response.duration', duration, {
        unit: 'millisecond',
        attributes: { ...tags, success: 'false' },
      });
      throw error;
    }
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
    const startTime = Date.now();
    const tags = {
      model: this.model,
      streaming: 'false',
      method: 'generateResponseWithHistory',
    };

    try {
      const result = await this.withRetry(async () => {
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
        const text =
          textContent && 'text' in textContent ? textContent.text : '';

        return {
          text,
          model: response.model,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      }, tags);

      // Track metrics on success
      const duration = Date.now() - startTime;
      Sentry.metrics.distribution('ai.response.duration', duration, {
        unit: 'millisecond',
        attributes: tags,
      });

      if (result.usage) {
        Sentry.metrics.distribution(
          'ai.response.tokens.input',
          result.usage.inputTokens,
          {
            attributes: tags,
          },
        );
        Sentry.metrics.distribution(
          'ai.response.tokens.output',
          result.usage.outputTokens,
          {
            attributes: tags,
          },
        );
      }

      return result;
    } catch (error) {
      // Track duration even on failure
      const duration = Date.now() - startTime;
      Sentry.metrics.distribution('ai.response.duration', duration, {
        unit: 'millisecond',
        attributes: { ...tags, success: 'false' },
      });
      throw error;
    }
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
      model = this.model,
    } = options;

    return new Observable<StreamEvent>((observer) => {
      let fullText = '';
      let modelUsed = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let chunkCount = 0;
      let firstTokenTime: number | null = null;
      const startTime = Date.now();

      const tags = {
        model,
        streaming: 'true',
        method: 'generateStreamingResponse',
      };

      (async () => {
        try {
          const stream = await this.client.messages.stream({
            model,
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
            // Track time to first token
            if (firstTokenTime === null) {
              firstTokenTime = Date.now();
              const ttft = firstTokenTime - startTime;
              Sentry.metrics.distribution(
                'ai.streaming.time_to_first_token',
                ttft,
                {
                  unit: 'millisecond',
                  attributes: tags,
                },
              );
            }

            fullText += text;
            chunkCount++;
            observer.next({ type: 'delta', text });
          });

          // Wait for the stream to complete
          const finalMessage = await stream.finalMessage();

          modelUsed = finalMessage.model;
          inputTokens = finalMessage.usage.input_tokens;
          outputTokens = finalMessage.usage.output_tokens;

          // Track final metrics
          const totalDuration = Date.now() - startTime;

          Sentry.metrics.distribution('ai.response.duration', totalDuration, {
            unit: 'millisecond',
            attributes: tags,
          });

          Sentry.metrics.distribution('ai.streaming.total_chunks', chunkCount, {
            attributes: tags,
          });

          Sentry.metrics.distribution('ai.response.tokens.input', inputTokens, {
            attributes: tags,
          });

          Sentry.metrics.distribution(
            'ai.response.tokens.output',
            outputTokens,
            {
              attributes: tags,
            },
          );

          // Emit completion event
          observer.next({
            type: 'complete',
            fullResponse: {
              fullText,
              model: modelUsed,
              usage: {
                inputTokens,
                outputTokens,
              },
            },
          });

          observer.complete();
        } catch (error) {
          // Track failure metrics
          const totalDuration = Date.now() - startTime;
          Sentry.metrics.distribution('ai.response.duration', totalDuration, {
            unit: 'millisecond',
            attributes: { ...tags, success: 'false' },
          });

          Sentry.metrics.count('ai.request.failure', 1, {
            attributes: {
              ...tags,
              error_type: this.getErrorType(error),
            },
          });

          // Track partial chunks if any were received
          if (chunkCount > 0) {
            Sentry.metrics.distribution(
              'ai.streaming.total_chunks',
              chunkCount,
              {
                attributes: { ...tags, success: 'false' },
              },
            );
          }

          observer.error(error);
        }
      })();
    });
  }
}
