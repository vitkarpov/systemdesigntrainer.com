import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DiagramCanvas } from '../../components/diagram/DiagramCanvas';
import { InterviewHeader, MessageList, InterviewInput } from './components';
import { useInterviewStore, useDiagramStore, useStreamingStore } from '../../stores';
import {
  useSessionsControllerGetSession,
  useSessionsControllerGetTranscript,
  useSessionsControllerAdvancePhase,
  useSessionsControllerGenerateFeedback,
  useSessionsControllerGetFailedMessages,
  getSessionsControllerGetSessionQueryKey,
  getSessionsControllerGetFailedMessagesQueryKey,
} from '../../api/hooks.gen';
import { parseErrorMessage } from '../../lib/utils';
import { useConversationStream } from '../../hooks/useConversationStream';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Interview store
  const inputValue = useInterviewStore((state) => state.inputValue);
  const setInputValue = useInterviewStore((state) => state.setInputValue);
  const clearInput = useInterviewStore((state) => state.clearInput);
  const optimisticMessage = useInterviewStore((state) => state.optimisticMessage);
  const setOptimisticMessage = useInterviewStore((state) => state.setOptimisticMessage);
  const showRetryBanner = useInterviewStore((state) => state.showRetryBanner);
  const setShowRetryBanner = useInterviewStore((state) => state.setShowRetryBanner);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const sessionIdNum = Number(sessionId);

  // Streaming store
  const streamingText = useStreamingStore(
    (state) => state.streams[sessionIdNum]?.streamingText || ''
  );
  const isStreaming = useStreamingStore(
    (state) => state.streams[sessionIdNum]?.isStreaming ?? false
  );

  // Streaming hook
  const { sendMessage, cancel } = useConversationStream({
    sessionId: sessionIdNum,
    onStart: () => {
      // Keep the optimistic message visible until complete
    },
    onComplete: () => {
      // Clear optimistic message once real data is fetched
      setOptimisticMessage(null);
    },
    onError: (error, errorData) => {
      const errorMessage = parseErrorMessage(error, 'Failed to send message. Please try again.');
      toast.error(errorMessage);
      setOptimisticMessage(null);
      // Show retry banner if we have error data
      if (errorData?.candidateMessageId) {
        setShowRetryBanner(true);
      }
    },
  });

  const { data: session, isLoading: isLoadingSession } = useSessionsControllerGetSession(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
      refetchInterval: (query) => {
        // Stop polling if session is not in progress
        return query.state.data?.data?.session?.status === 'in_progress' ? 1000 : false;
      },
    },
  });

  const { data: transcriptData, isLoading: isLoadingMessages } = useSessionsControllerGetTranscript(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
    },
  });

  const { data: failedMessagesData } = useSessionsControllerGetFailedMessages(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
      refetchInterval: 5000, // Poll every 5 seconds for failed messages
    },
  });

  const messages = transcriptData?.data.messages || [];
  const retryableCount = failedMessagesData?.data?.retryableCount || 0;
  const failedMessageIds = new Set((failedMessagesData?.data?.failedMessages || []).map((m) => m.id));

  const advancePhaseMutation = useSessionsControllerAdvancePhase();
  const generateFeedbackMutation = useSessionsControllerGenerateFeedback();

  useEffect(() => {
    if (session) {
      setElapsedTime(session.data.elapsedSeconds);
    }
  }, [session]);

  useEffect(() => {
    if (!session || session.data.session.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, optimisticMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
      useInterviewStore.getState().reset();
      useDiagramStore.getState().clearDiagram(sessionIdNum);
      useStreamingStore.getState().clearStream(sessionIdNum);
    };
  }, [cancel, sessionIdNum]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming || session?.data.session.status !== 'in_progress') return;

    const messageContent = inputValue.trim();
    clearInput();

    // Show optimistic message immediately
    setOptimisticMessage({
      text: messageContent,
      timestamp: Date.now(),
    });

    // Determine if we should send diagram data (only in HIGH_LEVEL phase)
    const currentPhase = session?.data.session.currentPhase;
    const isHighLevelPhase = currentPhase === 'high_level';

    // Get diagram data from store
    const diagramData = useDiagramStore.getState().getDiagram(sessionIdNum);

    sendMessage(messageContent, isHighLevelPhase ? diagramData : null);
  };

  const handleAdvancePhase = async () => {
    if (!sessionId) return;

    try {
      await advancePhaseMutation.mutateAsync({
        id: sessionIdNum,
      });
      await queryClient.invalidateQueries({
        queryKey: getSessionsControllerGetSessionQueryKey(sessionIdNum),
      });
    } catch (err: any) {
      const errorMessage = parseErrorMessage(err, 'Failed to advance phase. Please try again.');
      toast.error(errorMessage);
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;

    try {
      await generateFeedbackMutation.mutateAsync({
        id: sessionIdNum,
      });
      navigate(`/feedback/${sessionId}`);
    } catch (err: any) {
      const errorMessage = parseErrorMessage(err, 'Failed to end interview. Please try again.');
      toast.error(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleViewRetry = () => {
    // Scroll to the first failed message
    const firstFailedMessage = messages.find((m) => failedMessageIds.has(m.id));
    if (firstFailedMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRetrySuccess = () => {
    setShowRetryBanner(false);
    // Invalidate failed messages query
    queryClient.invalidateQueries({
      queryKey: getSessionsControllerGetFailedMessagesQueryKey(sessionIdNum),
    });
  };

  // Determine phase-based display
  const currentPhase = session?.data.session.currentPhase;
  const isHighLevelPhase = currentPhase === 'high_level';

  const isLoading = isLoadingSession || isLoadingMessages;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading interview...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <InterviewHeader
        sessionTitle={session?.data.session.interviewCase?.title || ''}
        elapsedTime={elapsedTime}
        sessionStatus={(session?.data.session.status as 'in_progress' | 'completed') || 'in_progress'}
        currentPhase={currentPhase || ''}
        phaseMetadata={session?.data.phaseMetadata}
        phaseElapsedSeconds={session?.data.phaseElapsedSeconds}
        isAdvancing={advancePhaseMutation.isPending}
        isEnding={generateFeedbackMutation.isPending}
        onBack={() => navigate('/')}
        onAdvancePhase={handleAdvancePhase}
        onEndInterview={handleEndInterview}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagram Canvas */}
        <div className={isHighLevelPhase ? 'w-2/3 border-r border-border' : 'w-1/2 border-r border-border'}>
          <DiagramCanvas
            sessionId={sessionIdNum}
            isReadOnly={!isHighLevelPhase}
          />
        </div>

        {/* Chat Area (Messages + Input) */}
        <div className={`flex flex-col ${isHighLevelPhase ? 'w-1/3' : 'w-1/2'}`}>
          <MessageList
            ref={messagesEndRef}
            messages={messages as any}
            failedMessageIds={failedMessageIds}
            failedMessages={failedMessagesData?.data?.failedMessages || []}
            retryableCount={retryableCount}
            optimisticMessage={optimisticMessage}
            streamingText={streamingText}
            isStreaming={isStreaming}
            sessionId={sessionIdNum}
            elapsedTime={elapsedTime}
            showRetryBanner={showRetryBanner}
            onViewRetry={handleViewRetry}
            onRetrySuccess={handleRetrySuccess}
            onRetryError={(error) => {
              const errorMessage = parseErrorMessage(error, 'Failed to retry message. Please try again.');
              toast.error(errorMessage);
            }}
          />

          <InterviewInput
            value={inputValue}
            isStreaming={isStreaming}
            isDisabled={session?.data.session.status !== 'in_progress'}
            sessionStatus={session?.data.session.status || 'in_progress'}
            onChange={setInputValue}
            onSend={handleSendMessage}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
}
