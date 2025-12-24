import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setupInterviewMocks, createMockSession, createMockFailedMessagesData, createMockFailedMessage, createTestQueryClient } from '../../../tests/utils'
import Interview from '../Interview'
import { useInterviewStore, useStreamingStore, useDiagramStore } from '../../../stores'
import { toast } from 'sonner'

// Mock API hooks
vi.mock('../../../api/hooks.gen', () => ({
  useSessionsControllerGetSession: vi.fn(),
  useSessionsControllerGetTranscript: vi.fn(),
  useSessionsControllerGetFailedMessages: vi.fn(),
  useSessionsControllerAdvancePhase: vi.fn(),
  useSessionsControllerGenerateFeedback: vi.fn(),
  useSessionsControllerRetryConversation: vi.fn(),
  getSessionsControllerGetSessionQueryKey: vi.fn((id) => ['session', id]),
  getSessionsControllerGetFailedMessagesQueryKey: vi.fn((id) => ['failedMessages', id]),
  getSessionsControllerGetTranscriptQueryKey: vi.fn((id) => ['transcript', id]),
}))

// Import the mocked functions after the mock is defined
import * as apiHooks from '../../../api/hooks.gen'
const mockUseSessionsControllerGetSession = apiHooks.useSessionsControllerGetSession as ReturnType<typeof vi.fn>
const mockUseSessionsControllerGetTranscript = apiHooks.useSessionsControllerGetTranscript as ReturnType<typeof vi.fn>
const mockUseSessionsControllerGetFailedMessages = apiHooks.useSessionsControllerGetFailedMessages as ReturnType<typeof vi.fn>
const mockUseSessionsControllerAdvancePhase = apiHooks.useSessionsControllerAdvancePhase as ReturnType<typeof vi.fn>
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
vi.mock('../../../hooks/useConversationStream', () => ({
  useConversationStream: () => ({
    sendMessage: mockSendMessage,
    cancel: mockCancel,
  }),
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
  DiagramCanvas: ({ sessionId, isReadOnly }: any) => (
    <div data-testid="diagram-canvas" data-readonly={isReadOnly} data-session-id={sessionId}>
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

    // Setup mocks
    mocks = setupInterviewMocks()
    queryClient = createTestQueryClient()

    // Apply mocks to API hooks
    mockUseSessionsControllerGetSession.mockReturnValue(mocks.mockSessionQuery)
    mockUseSessionsControllerGetTranscript.mockReturnValue(mocks.mockTranscriptQuery)
    mockUseSessionsControllerGetFailedMessages.mockReturnValue(mocks.mockFailedMessagesQuery)
    mockUseSessionsControllerAdvancePhase.mockReturnValue(mocks.mockAdvancePhase)
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

    it('should display correct layout for high_level phase', () => {
      renderWithProviders(<Interview />, { queryClient })

      const diagramCanvas = screen.getByTestId('diagram-canvas')
      expect(diagramCanvas).toHaveAttribute('data-readonly', 'false')

      // Check layout classes (w-2/3 for diagram, w-1/3 for chat)
      const diagramContainer = diagramCanvas.parentElement
      expect(diagramContainer).toHaveClass('w-2/3')
    })

    it('should display correct layout for non-high_level phase', () => {
      mockUseSessionsControllerGetSession.mockReturnValue({
        ...mocks.mockSessionQuery,
        data: createMockSession({
          session: { currentPhase: 'deep_dive' },
        }),
      })

      renderWithProviders(<Interview />, { queryClient })

      const diagramCanvas = screen.getByTestId('diagram-canvas')
      expect(diagramCanvas).toHaveAttribute('data-readonly', 'true')

      // Check layout classes (w-1/2 for both)
      const diagramContainer = diagramCanvas.parentElement
      expect(diagramContainer).toHaveClass('w-1/2')
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

    it('should disable input during streaming', () => {
      // Set streaming state
      useStreamingStore.getState().startStreaming(123, new AbortController())
      useStreamingStore.getState().appendStreamText(123, 'AI is typing...')

      renderWithProviders(<Interview />, { queryClient })

      const textarea = screen.getByPlaceholderText(/Type your response/i)
      const sendButton = screen.getByRole('button', { name: /streaming/i })

      expect(textarea).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })

    it('should display streaming text', () => {
      useStreamingStore.getState().startStreaming(123, new AbortController())
      useStreamingStore.getState().appendStreamText(123, 'AI response in progress...')

      renderWithProviders(<Interview />, { queryClient })

      expect(screen.getByText(/AI response in progress/i)).toBeInTheDocument()
    })

    it('should clear optimistic message after streaming completes', async () => {
      // Set optimistic message
      useInterviewStore.getState().setOptimisticMessage({
        text: 'My question',
        timestamp: Date.now(),
      })

      renderWithProviders(<Interview />, { queryClient })

      // Verify optimistic message is shown
      expect(screen.getByText('My question')).toBeInTheDocument()

      // Clear optimistic message (simulating completion)
      useInterviewStore.getState().setOptimisticMessage(null)

      await waitFor(() => {
        expect(screen.queryByText('My question')).not.toBeInTheDocument()
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
  })

  describe('Phase Management', () => {
    it('should advance phase when Next Phase button is clicked', async () => {
      const user = userEvent.setup()
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
      renderWithProviders(<Interview />, { queryClient })

      const nextPhaseButton = screen.getByRole('button', { name: /next phase/i })
      await user.click(nextPhaseButton)

      await waitFor(() => {
        expect(mocks.mockAdvancePhaseMutate).toHaveBeenCalledWith({ id: 123 })
      })

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith(expect.objectContaining({
          queryKey: ['session', 123],
        }))
      })
    })

    it('should not show Next Phase button in wrap_up phase', () => {
      mockUseSessionsControllerGetSession.mockReturnValue({
        ...mocks.mockSessionQuery,
        data: createMockSession({
          session: { currentPhase: 'wrap_up' },
        }),
      })

      renderWithProviders(<Interview />, { queryClient })

      expect(screen.queryByRole('button', { name: /next phase/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /end interview/i })).toBeInTheDocument()
    })

    it('should show error toast if phase advancement fails', async () => {
      const user = userEvent.setup()
      mocks.mockAdvancePhaseMutate.mockRejectedValueOnce(new Error('Failed to advance'))

      renderWithProviders(<Interview />, { queryClient })

      const nextPhaseButton = screen.getByRole('button', { name: /next phase/i })
      await user.click(nextPhaseButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to advance'))
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
