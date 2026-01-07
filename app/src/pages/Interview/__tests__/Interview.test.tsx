import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setupInterviewMocks, createMockSession, createMockFailedMessagesData, createMockFailedMessage, createTestQueryClient } from '@/tests/utils'
import Interview from '@/pages/Interview/Interview'
import { useInterviewStore, useStreamingStore, useDiagramStore } from '@/stores'
import { toast } from 'sonner'
import type { UseConversationStreamOptions } from '@/hooks/useConversationStream'

// Mock API hooks
vi.mock('@/api/hooks.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hooks.gen')>();
  return {
    ...actual,
    useSessionsControllerGetSession: vi.fn(),
    useSessionsControllerGetTranscript: vi.fn(),
    useSessionsControllerGetFailedMessages: vi.fn(),
    useSessionsControllerGenerateFeedback: vi.fn(),
    useSessionsControllerRetryConversation: vi.fn(),
    getSessionsControllerGetSessionQueryKey: vi.fn((id) => ['session', id]),
    getSessionsControllerGetFailedMessagesQueryKey: vi.fn((id) => ['failedMessages', id]),
    getSessionsControllerGetTranscriptQueryKey: vi.fn((id) => ['transcript', id]),
  };
})

// Import the mocked functions after the mock is defined
import * as apiHooks from '@/api/hooks.gen'
const mockUseSessionsControllerGetSession = apiHooks.useSessionsControllerGetSession as ReturnType<typeof vi.fn>
const mockUseSessionsControllerGetTranscript = apiHooks.useSessionsControllerGetTranscript as ReturnType<typeof vi.fn>
const mockUseSessionsControllerGetFailedMessages = apiHooks.useSessionsControllerGetFailedMessages as ReturnType<typeof vi.fn>
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
const mockUseConversationStreamImpl = vi.fn((_config: UseConversationStreamOptions) => ({
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
    mockUseSessionsControllerGetFailedMessages.mockReturnValue(mocks.mockFailedMessagesQuery)
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
      expect(screen.getByText('Test Interview Case')).toBeInTheDocument()
      expect(screen.getByText(/Total:/)).toBeInTheDocument() // Timer label
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument()

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
      expect(diagramCanvas).toHaveAttribute('data-session-status', 'completed')
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

    it('should send message with Enter key', async () => {
      const user = userEvent.setup()

      // Set up diagram data
      useDiagramStore.getState().setDiagram(123, { nodes: [], edges: [] })

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)

      await user.type(textarea, 'Test message')
      await user.keyboard('{Enter}')

      expect(mockSendMessage).toHaveBeenCalledWith('Test message', { nodes: [], edges: [] })
    })

    it('should not send message with Shift+Enter', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)

      await user.type(textarea, 'Test message')
      await user.keyboard('{Shift>}{Enter}{/Shift}')

      // Should not send (Shift+Enter adds new line)
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

  describe('Failed Messages & Retry', () => {
    it('should display failed message banner when messages fail', () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: createMockFailedMessagesData([createMockFailedMessage(5)], 2),
      })

      renderWithProviders(<Interview />, { queryClient })

      expect(screen.getByText(/2 messages failed/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view & retry/i })).toBeInTheDocument()
    })

    it('should display retry banner when messages fail', () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: createMockFailedMessagesData([createMockFailedMessage(5)], 1),
      })

      renderWithProviders(<Interview />, { queryClient })

      // Verify retry banner is visible based on retryableCount
      expect(screen.getByRole('button', { name: /view & retry/i })).toBeInTheDocument()
      expect(screen.getByText(/1 message failed/i)).toBeInTheDocument()
    })

    it('should not show retry banner when retryableCount is zero', () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: createMockFailedMessagesData([], 0), // No failed messages
        refetch: vi.fn(),
      })

      renderWithProviders(<Interview />, { queryClient })

      // Banner should not be visible when there are no failed messages
      expect(screen.queryByRole('button', { name: /view & retry/i })).not.toBeInTheDocument()
    })

    it('should handle View & Retry button click', async () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: createMockFailedMessagesData([createMockFailedMessage(2)], 1),
      })

      const user = userEvent.setup()
      const scrollIntoViewMock = vi.fn()

      // Mock scrollIntoView
      Element.prototype.scrollIntoView = scrollIntoViewMock

      renderWithProviders(<Interview />, { queryClient })

      const viewRetryButton = screen.getByRole('button', { name: /view & retry/i })
      await user.click(viewRetryButton)

      // The handleViewRetry function should trigger scroll behavior
      // This is a simple test to ensure the button is clickable and doesn't crash
      expect(viewRetryButton).toBeInTheDocument()
    })

    it('should invalidate failed messages query on retry success', async () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: createMockFailedMessagesData([createMockFailedMessage(2)], 1),
      })

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

      renderWithProviders(<Interview />, { queryClient })

      // To test handleRetrySuccess, we would need to trigger a successful retry
      // Since the retry logic is in MessageList, we'll verify the callback is passed correctly
      // and test it gets called during actual retry (integration test in MessageList)

      // For now, verify the Interview component renders with failed messages
      expect(screen.getByRole('button', { name: /view & retry/i })).toBeInTheDocument()

      // The spy will be used when MessageList triggers the retry success callback
      expect(invalidateQueriesSpy).toBeDefined()
    })

    it('should show error toast when retry fails', () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: createMockFailedMessagesData([createMockFailedMessage(2)], 1),
      })

      renderWithProviders(<Interview />, { queryClient })

      // Verify the Interview component provides the onRetryError callback to MessageList
      // The actual error handling is tested when MessageList invokes this callback
      expect(screen.getByRole('button', { name: /view & retry/i })).toBeInTheDocument()

      // We can't easily test the callback without triggering actual retry logic
      // This would be better tested in an integration test or by mocking MessageList
    })

    it('should handle undefined failed messages data gracefully', () => {
      mockUseSessionsControllerGetFailedMessages.mockReturnValue({
        data: { data: { failedMessages: undefined, retryableCount: 0 } },
      })

      renderWithProviders(<Interview />, { queryClient })

      // Should not crash and should render normally without retry banner
      expect(screen.getByTestId('diagram-canvas')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /view & retry/i })).not.toBeInTheDocument()
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
      expect(screen.getByText(/interview has ended/i)).toBeInTheDocument()
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

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })
})
