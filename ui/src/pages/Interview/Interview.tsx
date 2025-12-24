import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DiagramCanvas } from '@/components/diagram/DiagramCanvas';
import { PageHeader } from '@/components/PageHeader';
import { PhaseDisplay } from '@/components/PhaseDisplay';
import { MessageList, InterviewInput } from './components';
import { Button } from '@/components/ui/button';
import { formatElapsedTime, parseErrorMessage } from '@/lib/utils';
import { useInterviewStore, useDiagramStore, useStreamingStore } from '@/stores';
import {
  useSessionsControllerGetSession,
  useSessionsControllerGetTranscript,
  useSessionsControllerAdvancePhase,
  useSessionsControllerGenerateFeedback,
  useSessionsControllerGetFailedMessages,
  getSessionsControllerGetSessionQueryKey,
  getSessionsControllerGetFailedMessagesQueryKey,
} from '@/api/hooks.gen';
import { useConversationStream } from '@/hooks/useConversationStream';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inputValue = useInterviewStore((state) => state.inputValue);
  const setInputValue = useInterviewStore((state) => state.setInputValue);
  const clearInput = useInterviewStore((state) => state.clearInput);
  const optimisticMessage = useInterviewStore((state) => state.optimisticMessage);
  const setOptimisticMessage = useInterviewStore((state) => state.setOptimisticMessage);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const sessionIdNum = Number(sessionId);

  const streamingText = useStreamingStore(
    (state) => state.streams[sessionIdNum]?.streamingText || ''
  );
  const isStreaming = useStreamingStore(
    (state) => state.streams[sessionIdNum]?.isStreaming ?? false
  );

  const { sendMessage, cancel } = useConversationStream({
    sessionId: sessionIdNum,
    onComplete: () => {
      setOptimisticMessage(null);
    },
    onError: (error) => {
      const errorMessage = parseErrorMessage(error, 'Failed to send message. Please try again.');
      toast.error(errorMessage);
      setOptimisticMessage(null);
    },
  });

  const { data: session, isLoading: isLoadingSession } = useSessionsControllerGetSession(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
      refetchInterval: (query) => {
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
      refetchInterval: 5000,
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
    // Invalidate failed messages query to refresh the count
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

  const sessionStatus = (session?.data.session.status as 'in_progress' | 'completed') || 'in_progress';

  return (
    <div className="h-screen flex flex-col">
      <PageHeader
        title={session?.data.session.interviewCase?.title || ''}
        backLabel="Back to Dashboard"
        onBack={() => navigate('/')}
        rightContent={
          <>
            <div className="text-sm text-muted-foreground font-medium">
              Total: {formatElapsedTime(elapsedTime)}
            </div>
            {sessionStatus === 'in_progress' && (
              <>
                {currentPhase !== 'wrap_up' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAdvancePhase}
                    disabled={advancePhaseMutation.isPending}
                  >
                    Next Phase
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndInterview}
                  disabled={generateFeedbackMutation.isPending}
                >
                  {generateFeedbackMutation.isPending ? 'Ending...' : 'End Interview'}
                </Button>
              </>
            )}
            {sessionStatus === 'completed' && (
              <div className="text-sm font-medium text-muted-foreground">
                Interview Completed
              </div>
            )}
          </>
        }
        centerContent={
          session?.data.phaseMetadata ? (
            <PhaseDisplay
              phaseMetadata={session.data.phaseMetadata}
              phaseElapsedSeconds={session.data.phaseElapsedSeconds ?? 0}
            />
          ) : null
        }
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
