/**
 * Mock Auth Service for testing
 * Provides authentication without calling real WorkOS API
 */
export class MockAuthService {
  async getAuthorizationUrl(state: string): Promise<string> {
    return `https://mock-workos.com/authorize?state=${state}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async authenticateWithCode(_code: string): Promise<{
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      profilePictureUrl?: string;
    };
    accessToken: string;
  }> {
    // Return mock user data
    return {
      user: {
        id: 'mock_workos_user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profilePictureUrl: null,
      },
      accessToken: 'mock_access_token_123',
    };
  }

  async validateToken(token: string): Promise<boolean> {
    // Accept any token in tests
    return token.startsWith('mock_') || token.length > 0;
  }
}

/**
 * Factory function to create mock auth service
 */
export function createMockAuthService() {
  return new MockAuthService();
}
