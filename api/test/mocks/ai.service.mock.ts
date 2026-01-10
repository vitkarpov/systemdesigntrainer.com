import { Observable } from 'rxjs';

/**
 * Mock AI Service for testing
 * Provides predictable responses without calling real Anthropic API
 */
export class MockAiService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateResponse(_options: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    text: string;
    model: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    // Return a predictable response for non-streaming calls
    return {
      text: 'This is a mock AI response for testing purposes.',
      model: 'mock-model',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateResponseWithHistory(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _systemPrompt: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<{
    text: string;
    model: string;
    usage?: {
      inputTokens: number;
      outputTokens: number;
    };
  }> {
    // Return a predictable response
    return {
      text: 'This is a mock AI response with history for testing purposes.',
      model: 'mock-model',
      usage: {
        inputTokens: 10,
        outputTokens: 20,
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generateStreamingResponse(_options: {
    systemPrompt: string;
    userMessage: string;
    temperature?: number;
    maxTokens?: number;
  }): Observable<
    | { type: 'delta'; text: string }
    | {
        type: 'complete';
        fullResponse: {
          fullText: string;
          model: string;
          usage: { inputTokens: number; outputTokens: number };
        };
      }
  > {
    return new Observable((observer) => {
      // Simulate streaming with a predictable response
      const mockResponse =
        'Thank you for that question. Let me help you think through this systematically.';
      const chunks = mockResponse.split(' ');

      // Simulate streaming chunks
      (async () => {
        for (const chunk of chunks) {
          observer.next({ type: 'delta', text: chunk + ' ' });
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        // Emit complete event
        observer.next({
          type: 'complete',
          fullResponse: {
            fullText: mockResponse,
            model: 'mock-model',
            usage: {
              inputTokens: 10,
              outputTokens: 20,
            },
          },
        });

        observer.complete();
      })();
    });
  }
}

/**
 * Factory function to create mock AI service
 */
export function createMockAiService() {
  return new MockAiService();
}
