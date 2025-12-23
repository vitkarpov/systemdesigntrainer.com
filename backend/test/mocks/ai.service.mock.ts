/**
 * Mock AI Service for testing
 * Provides predictable responses without calling real Anthropic API
 */
export class MockAiService {
  async streamChatCompletion(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
  ): Promise<void> {
    // Simulate streaming with a predictable response
    const mockResponse =
      'Thank you for that question. Let me help you think through this systematically.';
    const chunks = mockResponse.split(' ');

    // Simulate streaming chunks
    for (const chunk of chunks) {
      onChunk(chunk + ' ');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay to simulate streaming
    }

    onComplete(mockResponse);
  }

  async generateChatCompletion(
    systemPrompt: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    // Return a predictable response for non-streaming calls
    return 'This is a mock AI response for testing purposes.';
  }
}

/**
 * Factory function to create mock AI service
 */
export function createMockAiService() {
  return new MockAiService();
}
