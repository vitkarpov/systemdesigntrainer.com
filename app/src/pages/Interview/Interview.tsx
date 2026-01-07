import { useState, useEffect } from 'react';
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
  useSessionsControllerGenerateFeedback,
} from '@/api/hooks.gen';
import { useConversationStream } from '@/hooks/useConversationStream';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const inputValue = useInterviewStore((state) => state.inputValue);
  const setInputValue = useInterviewStore((state) => state.setInputValue);
  const clearInput = useInterviewStore((state) => state.clearInput);
  const optimisticMessage = useInterviewStore((state) => state.optimisticMessage);
  const setOptimisticMessage = useInterviewStore((state) => state.setOptimisticMessage);

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
      throwOnError: true,
    },
  });

  const { data: transcriptData, isLoading: isLoadingMessages } = useSessionsControllerGetTranscript(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
      throwOnError: true,
    },
  });

  const messages = transcriptData?.data.messages || [];

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

    // Get diagram data from store
    const diagramData = useDiagramStore.getState().getDiagram(sessionIdNum);

    sendMessage(messageContent, diagramData);
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


  const isLoading = isLoadingSession || isLoadingMessages;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading interview...</div>
      </div>
    );
  }

  const sessionStatus = (session?.data.session.status as 'in_progress' | 'completed') || 'in_progress';
  const isReadOnly = sessionStatus === 'completed';

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
              <Button
                size="sm"
                onClick={handleEndInterview}
                disabled={generateFeedbackMutation.isPending}
              >
                {generateFeedbackMutation.isPending ? 'Ending...' : 'End Interview'}
              </Button>
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
            />
          ) : null
        }
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagram Canvas */}
        <div className="w-1/2 border-r border-border">
          <DiagramCanvas
            sessionId={sessionIdNum}
            isReadOnly={isReadOnly}
          />
        </div>

        {/* Chat Area (Messages + Input) */}
        <div className="flex flex-col w-1/2">
          <MessageList
            messages={messages}
            optimisticMessage={optimisticMessage}
            streamingText={streamingText}
            isStreaming={isStreaming}
            elapsedTime={elapsedTime}
          />

          <InterviewInput
            value={inputValue}
            isStreaming={isStreaming}
            isDisabled={session?.data.session.status !== 'in_progress'}
            sessionStatus={session?.data.session.status || 'in_progress'}
            onChange={setInputValue}
            onSend={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}

export default function Interview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      context="interview"
      onBackToHome={() => navigate('/')}
      onReset={() => queryClient.invalidateQueries()}
    >
      <InterviewPage />
    </ErrorBoundary>
  );
}
