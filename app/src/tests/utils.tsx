import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'

// Create a test query client with no retries
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface ProvidersWrapperProps {
  children: ReactNode
  queryClient?: QueryClient
}

// Wrapper component with all providers
export function ProvidersWrapper({ children, queryClient }: ProvidersWrapperProps) {
  const client = queryClient || createTestQueryClient()

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const { queryClient, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <ProvidersWrapper queryClient={queryClient}>
        {children}
      </ProvidersWrapper>
    ),
    ...renderOptions,
  })
}

// Mock data factories
export function createMockSession(overrides: any = {}) {
  return {
    data: {
      session: {
        id: 123,
        status: 'in_progress',
        currentPhase: 'high_level',
        interviewCase: { title: 'Test Interview Case' },
        ...overrides.session,
      },
      elapsedSeconds: 120,
      phaseElapsedSeconds: 60,
      phaseMetadata: {
        name: 'High Level Design',
        description: 'Design the system architecture',
        order: 2,
        recommendedMinutes: 10,
        ...overrides.phaseMetadata,
      },
      ...overrides,
    },
  }
}

export function createMockMessages(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    role: i % 2 === 0 ? ('candidate' as const) : ('interviewer' as const),
    text: `Message ${i + 1}`,
    secondsElapsed: i * 30,
  }))
}

export function createMockFailedMessage(messageId: number, partialText?: string) {
  return {
    id: messageId,
    partialText: partialText || null,
  }
}

export function createMockFailedMessagesData(failedMessages: any[] = [], retryableCount = 0) {
  return {
    data: {
      failedMessages,
      retryableCount,
    },
  }
}

export function createMockTranscript(messages: any[] = []) {
  return {
    data: {
      messages,
    },
  }
}

// Interview test helpers
export function createMockStreamingState(sessionId: number, overrides: any = {}) {
  return {
    [sessionId]: {
      streamingText: '',
      isStreaming: false,
      abortController: null,
      ...overrides,
    },
  }
}

export function setupInterviewMocks() {
  const mockNavigate = vi.fn()
  const mockSendMessage = vi.fn()
  const mockCancel = vi.fn()
  const mockGenerateFeedbackMutate = vi.fn().mockResolvedValue({})

  return {
    mockNavigate,
    mockSendMessage,
    mockCancel,
    mockGenerateFeedbackMutate,
    mockSessionQuery: {
      data: createMockSession(),
      isLoading: false,
      refetch: vi.fn(),
    },
    mockTranscriptQuery: {
      data: createMockTranscript(createMockMessages(3)),
      isLoading: false,
      refetch: vi.fn(),
    },
    mockFailedMessagesQuery: {
      data: createMockFailedMessagesData(),
      refetch: vi.fn(),
    },
    mockGenerateFeedback: {
      mutateAsync: mockGenerateFeedbackMutate,
      isPending: false,
    },
  }
}
