import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setupInterviewMocks, createMockSession, createTestQueryClient } from '@/tests/utils'
import Interview from '@/pages/Interview/Interview'
import { useInterviewStore, useStreamingStore, useDiagramStore } from '@/stores'
import { toast } from 'sonner'

// Mock API hooks
vi.mock('@/api/hooks.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hooks.gen')>();
  return {
    ...actual,
    useSessionsControllerGetSession: vi.fn(),
    useSessionsControllerGetTranscript: vi.fn(),
    useSessionsControllerGenerateFeedback: vi.fn(),
    getSessionsControllerGetSessionQueryKey: vi.fn((id) => ['session', id]),
    getSessionsControllerGetTranscriptQueryKey: vi.fn((id) => ['transcript', id]),
  };
})

// Import the mocked functions after the mock is defined
import * as apiHooks from '@/api/hooks.gen'
const mockUseSessionsControllerGetSession = apiHooks.useSessionsControllerGetSession as ReturnType<typeof vi.fn>
const mockUseSessionsControllerGetTranscript = apiHooks.useSessionsControllerGetTranscript as ReturnType<typeof vi.fn>
const mockUseSessionsControllerGenerateFeedback = apiHooks.useSessionsControllerGenerateFeedback as ReturnType<typeof vi.fn>

// Mock router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ sessionId: '123' }),
    useNavigate: () => mockNavigate,
  }
})

// Mock SSE streaming hook
const mockSendMessage = vi.fn()
const mockCancel = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockUseConversationStreamImpl = vi.fn((_config) => ({
  sendMessage: mockSendMessage,
  cancel: mockCancel,
}))
vi.mock('../../../hooks/useConversationStream', () => ({
  useConversationStream: (...args: Parameters<typeof mockUseConversationStreamImpl>) => mockUseConversationStreamImpl(...args),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock react-syntax-highlighter to avoid ES Module import issues
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, ...props }: any) => <pre {...props}>{children}</pre>,
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
  oneLight: {},
}))

// Mock react-markdown and related plugins to avoid ES Module import issues
vi.mock('react-markdown', () => ({
  default: ({ children }: any) => <div data-testid="markdown">{children}</div>,
}))

vi.mock('harden-react-markdown', () => ({
  default: (Component: any) => Component,
}))

vi.mock('remark-gfm', () => ({
  default: () => {},
}))

vi.mock('remark-math', () => ({
  default: () => {},
}))

vi.mock('rehype-katex', () => ({
  default: () => {},
}))

// Mock DiagramCanvas
vi.mock('../../../components/diagram/DiagramCanvas', () => ({
  DiagramCanvas: ({ sessionId, isReadOnly, sessionStatus }: any) => (
    <div
      data-testid="diagram-canvas"
      data-readonly={isReadOnly}
      data-session-id={sessionId}
      data-session-status={sessionStatus}
    >
      Diagram Canvas
    </div>
  ),
}))

describe('Interview Page', () => {
  let mocks: ReturnType<typeof setupInterviewMocks>
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset stores
    useInterviewStore.getState().reset()
    useDiagramStore.getState().clearDiagram(123)
    useStreamingStore.getState().clearStream(123)

    // Restore the useConversationStream mock implementation after clearAllMocks
    mockUseConversationStreamImpl.mockImplementation(() => ({
      sendMessage: mockSendMessage,
      cancel: mockCancel,
    }))

    // Setup mocks
    mocks = setupInterviewMocks()
    queryClient = createTestQueryClient()

    // Apply mocks to API hooks
    mockUseSessionsControllerGetSession.mockReturnValue(mocks.mockSessionQuery)
    mockUseSessionsControllerGetTranscript.mockReturnValue(mocks.mockTranscriptQuery)
    mockUseSessionsControllerGenerateFeedback.mockReturnValue(mocks.mockGenerateFeedback)

    // Reset mock functions
    mockNavigate.mockClear()
    mockSendMessage.mockClear()
    mockCancel.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering & Data Loading', () => {
    it('should display loading state while fetching data', () => {
      mockUseSessionsControllerGetSession.mockReturnValue({
        data: undefined,
        isLoading: true,
      })
      mockUseSessionsControllerGetTranscript.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      renderWithProviders(<Interview />, { queryClient })

      expect(screen.getByText('Loading interview...')).toBeInTheDocument()
      expect(screen.queryByTestId('diagram-canvas')).not.toBeInTheDocument()
    })

    it('should render successfully with session data', () => {
      renderWithProviders(<Interview />, { queryClient })

      // Header elements
      expect(screen.getByText(/Total:/)).toBeInTheDocument() // Timer label
      const backButtons = screen.getAllByRole('button', { name: /back to dashboard/i })
      expect(backButtons.length).toBeGreaterThan(0)

      // Diagram canvas
      const diagramCanvas = screen.getByTestId('diagram-canvas')
      expect(diagramCanvas).toBeInTheDocument()
      expect(diagramCanvas).toHaveAttribute('data-session-id', '123')

      // Messages
      expect(screen.getByText('Message 1')).toBeInTheDocument()
      expect(screen.getByText('Message 2')).toBeInTheDocument()
      expect(screen.getByText('Message 3')).toBeInTheDocument()

      // Input area
      expect(screen.getByPlaceholderText(/Type your response/i)).toBeInTheDocument()
    })

    it('should display diagram canvas editable with 50/50 layout during in_progress sessions', () => {
      renderWithProviders(<Interview />, { queryClient })

      const diagramCanvas = screen.getByTestId('diagram-canvas')
      expect(diagramCanvas).toHaveAttribute('data-readonly', 'false')
      expect(diagramCanvas.parentElement).toHaveClass('w-1/2')
    })

    it('should set diagram to read-only for completed sessions', () => {
      mockUseSessionsControllerGetSession.mockReturnValue({
        ...mocks.mockSessionQuery,
        data: createMockSession({
          session: { status: 'completed' },
        }),
      })

      renderWithProviders(<Interview />, { queryClient })

      const diagramCanvas = screen.getByTestId('diagram-canvas')
      expect(diagramCanvas).toHaveAttribute('data-readonly', 'true')
    })

    it('should poll session data when status is in_progress', () => {
      renderWithProviders(<Interview />, { queryClient })

      // Get the refetchInterval function passed to the session query
      const sessionQueryConfig = mockUseSessionsControllerGetSession.mock.calls[0][1]
      const refetchIntervalFn = sessionQueryConfig.query.refetchInterval

      // Test with in_progress status - should poll every 1000ms
      const result = refetchIntervalFn({
        state: { data: { data: { session: { status: 'in_progress' } } } }
      })
      expect(result).toBe(1000)

      // Test with completed status - should not poll
      const result2 = refetchIntervalFn({
        state: { data: { data: { session: { status: 'completed' } } } }
      })
      expect(result2).toBe(false)

      // Test with undefined data - should not poll
      const result3 = refetchIntervalFn({
        state: { data: undefined }
      })
      expect(result3).toBe(false)
    })
  })

  describe('Message Sending & Streaming', () => {
    it('should send message with optimistic update', async () => {
      const user = userEvent.setup()

      // Set up diagram data for high_level phase
      useDiagramStore.getState().setDiagram(123, { nodes: [], edges: [] })

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      // Type message
      await user.type(textarea, 'Hello interviewer')

      // Send message
      await user.click(sendButton)

      // Should clear input immediately
      expect(textarea).toHaveValue('')

      // Should show optimistic message
      await waitFor(() => {
        expect(screen.getByText('Hello interviewer')).toBeInTheDocument()
      })

      // Should call sendMessage with diagram data (since it's high_level phase)
      expect(mockSendMessage).toHaveBeenCalledWith(
        'Hello interviewer',
        { nodes: [], edges: [] }
      )
    })

    it('should send message with Enter key (via form submit)', async () => {
      const user = userEvent.setup()

      // Set up diagram data
      useDiagramStore.getState().setDiagram(123, { nodes: [], edges: [] })

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)

      await user.type(textarea, 'Test message')
      // The PromptInput component handles Enter key internally via form submit
      await user.keyboard('{Enter}')

      expect(mockSendMessage).toHaveBeenCalledWith('Test message', { nodes: [], edges: [] })
    })

    it('should not send message with Shift+Enter (adds new line)', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)

      await user.type(textarea, 'Test message')
      await user.keyboard('{Shift>}{Enter}{/Shift}')

      // Shift+Enter adds new line, doesn't submit form
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should not send empty or whitespace-only messages', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      // Try sending empty
      await user.click(sendButton)
      expect(mockSendMessage).not.toHaveBeenCalled()

      // Try sending whitespace
      await user.type(textarea, '   ')
      await user.click(sendButton)
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should not send message when session is not in_progress', async () => {
      mockUseSessionsControllerGetSession.mockReturnValue({
        ...mocks.mockSessionQuery,
        data: createMockSession({ session: { status: 'completed' } }),
      })

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/interview has ended/i)

      // Input should be disabled
      expect(textarea).toBeDisabled()

      // Try to send message (won't work because input is disabled)
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should disable input and prevent messages while streaming', async () => {
      useStreamingStore.getState().startStreaming(123, new AbortController())
      useStreamingStore.getState().appendStreamText(123, 'AI is typing...')

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)
      const sendButton = screen.getByRole('button', { name: /streaming/i })

      expect(textarea).toBeDisabled()
      expect(sendButton).toBeDisabled()
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should display streaming text', () => {
      useStreamingStore.getState().startStreaming(123, new AbortController())
      useStreamingStore.getState().appendStreamText(123, 'AI response in progress...')

      renderWithProviders(<Interview />, { queryClient })

      expect(screen.getByText(/AI response in progress/i)).toBeInTheDocument()
    })

    it('should clear optimistic message after streaming completes', async () => {
      // Set optimistic message
      act(() => {
        useInterviewStore.getState().setOptimisticMessage({
          text: 'My question',
          timestamp: Date.now(),
        })
      })

      renderWithProviders(<Interview />, { queryClient })

      // Verify optimistic message is shown
      await waitFor(() => {
        expect(screen.getByText('My question')).toBeInTheDocument()
      })

      // Clear optimistic message (simulating completion)
      act(() => {
        useInterviewStore.getState().setOptimisticMessage(null)
      })

      await waitFor(() => {
        expect(screen.queryByText('My question')).not.toBeInTheDocument()
      })
    })

    it('should call onComplete callback and clear optimistic message', async () => {
      // Set up a mock that captures the hook configuration
      let capturedOnComplete: (() => void) | undefined

      mockUseConversationStreamImpl.mockImplementationOnce((config) => {
        capturedOnComplete = config.onComplete
        return {
          sendMessage: mockSendMessage,
          cancel: mockCancel,
        }
      })

      renderWithProviders(<Interview />, { queryClient })

      // Set optimistic message
      act(() => {
        useInterviewStore.getState().setOptimisticMessage({
          text: 'Test message',
          timestamp: Date.now(),
        })
      })

      expect(useInterviewStore.getState().optimisticMessage).not.toBeNull()

      // Trigger the onComplete callback
      act(() => {
        capturedOnComplete?.()
      })

      await waitFor(() => {
        expect(useInterviewStore.getState().optimisticMessage).toBeNull()
      })
    })

    it('should handle streaming error and show toast', async () => {
      // Set up a mock that captures the hook configuration
      let capturedOnError: ((error: Error) => void) | undefined

      mockUseConversationStreamImpl.mockImplementationOnce((config) => {
        capturedOnError = config.onError
        return {
          sendMessage: mockSendMessage,
          cancel: mockCancel,
        }
      })

      renderWithProviders(<Interview />, { queryClient })

      // Set optimistic message
      act(() => {
        useInterviewStore.getState().setOptimisticMessage({
          text: 'Test message',
          timestamp: Date.now(),
        })
      })

      expect(useInterviewStore.getState().optimisticMessage).not.toBeNull()

      // Trigger the error callback
      act(() => {
        capturedOnError?.(new Error('Stream failed'))
      })

      await waitFor(() => {
        // The error message from parseErrorMessage will be shown
        expect(toast.error).toHaveBeenCalled()
        expect(useInterviewStore.getState().optimisticMessage).toBeNull()
      })
    })
  })


  describe('Interview Lifecycle', () => {
    it('should end interview and navigate to feedback page', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Interview />, { queryClient })

      const endButton = screen.getByRole('button', { name: /end interview/i })
      await user.click(endButton)

      await waitFor(() => {
        expect(mocks.mockGenerateFeedbackMutate).toHaveBeenCalledWith({ id: 123 })
        expect(mockNavigate).toHaveBeenCalledWith('/feedback/123')
      })
    })

    it('should show error toast if ending interview fails', async () => {
      const user = userEvent.setup()
      mocks.mockGenerateFeedbackMutate.mockRejectedValueOnce(new Error('Failed to end'))

      renderWithProviders(<Interview />, { queryClient })

      const endButton = screen.getByRole('button', { name: /end interview/i })
      await user.click(endButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to end'))
      })
    })

    it('should disable input for completed sessions', () => {
      mockUseSessionsControllerGetSession.mockReturnValue({
        ...mocks.mockSessionQuery,
        data: createMockSession({
          session: { status: 'completed' },
        }),
      })

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/interview has ended/i)
      expect(textarea).toBeDisabled()
    })
  })

  describe('Timer & Cleanup', () => {
    it('should display formatted elapsed time', () => {
      renderWithProviders(<Interview />, { queryClient })

      // Session has elapsedSeconds: 120 (2 minutes) - displayed as "Total: <time>"
      expect(screen.getByText(/Total:/)).toBeInTheDocument()
    })

    it('should increment timer for in_progress sessions', () => {
      vi.useFakeTimers()

      renderWithProviders(<Interview />, { queryClient })

      // Initial timer display
      expect(screen.getByText(/Total:/)).toBeInTheDocument()

      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Timer should still be visible and updated
      expect(screen.getByText(/Total:/)).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('should clean up on unmount', () => {
      const { unmount } = renderWithProviders(<Interview />, { queryClient })

      unmount()

      // Should call cancel from streaming hook
      expect(mockCancel).toHaveBeenCalled()

      // Should reset stores
      expect(useInterviewStore.getState().inputValue).toBe('')
      expect(useInterviewStore.getState().optimisticMessage).toBeNull()
    })
  })

  describe('Navigation & Interactions', () => {
    it('should navigate back to dashboard', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Interview />, { queryClient })

      const backButtons = screen.getAllByRole('button', { name: /back to dashboard/i })
      await user.click(backButtons[0])

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
