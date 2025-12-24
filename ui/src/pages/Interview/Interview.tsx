import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { PhaseDisplay } from '../../components/PhaseDisplay';
import { DiagramCanvas } from '../../components/diagram/DiagramCanvas';
import { FailedMessageBanner } from '../../components/FailedMessageBanner';
import { RetryButton } from '../../components/RetryButton';
import type { Node, Edge } from '@xyflow/react';
import {
  useSessionsControllerGetSession,
  useSessionsControllerGetTranscript,
  useSessionsControllerAdvancePhase,
  useSessionsControllerGenerateFeedback,
  useSessionsControllerGetFailedMessages,
  getSessionsControllerGetSessionQueryKey,
  getSessionsControllerGetFailedMessagesQueryKey,
} from '../../api/hooks.gen';
import { formatElapsedTime } from '../../lib/utils';
import { useConversationStream } from '../../hooks/useConversationStream';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [optimisticMessage, setOptimisticMessage] = useState<{ text: string; timestamp: number } | null>(null);
  const [diagramData, setDiagramData] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const [showRetryBanner, setShowRetryBanner] = useState(false);

  const sessionIdNum = Number(sessionId);

  // Streaming hook
  const { sendMessage, streamingText, isStreaming, cancel } = useConversationStream({
    sessionId: sessionIdNum,
    onStart: () => {
      // Keep the optimistic message visible until complete
    },
    onComplete: () => {
      // Clear optimistic message once real data is fetched
      setOptimisticMessage(null);
    },
    onError: (error, errorData) => {
      const errorMessage = error.message || 'Failed to send message. Please try again.';
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
    };
  }, [cancel]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isStreaming || session?.data.session.status !== 'in_progress') return;

    const messageContent = inputValue.trim();
    setInputValue('');

    // Show optimistic message immediately
    setOptimisticMessage({
      text: messageContent,
      timestamp: Date.now(),
    });

    // Determine if we should send diagram data (only in HIGH_LEVEL phase)
    const currentPhase = session?.data.session.currentPhase;
    const isHighLevelPhase = currentPhase === 'high_level';

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
      console.error('Failed to advance phase:', err);
      toast.error(err?.reason || 'Failed to advance phase. Please try again.');
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
      console.error('Failed to generate feedback:', err);
      // Extract error message from various possible error structures
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to end interview. Please try again.';

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
  const shouldShowDiagram =
    isHighLevelPhase ||
    currentPhase === 'deep_dive' ||
    currentPhase === 'bottlenecks';

  const handleDiagramChange = useCallback((nodes: Node[], edges: Edge[]) => {
    if (isHighLevelPhase) {
      setDiagramData({ nodes, edges });
    }
  }, [isHighLevelPhase]);

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
      {/* Header */}
      <div className="border-b px-6 py-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-lg font-semibold">{session?.data.session.interviewCase?.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground font-medium">
              Total: {formatElapsedTime(elapsedTime)}
            </div>
            {session?.data.session.status === 'in_progress' && (
              <>
                {session?.data.session.currentPhase !== 'wrap_up' && (
                  <Button variant="outline" size="sm" onClick={handleAdvancePhase} disabled={advancePhaseMutation.isPending}>
                    Next Phase
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={handleEndInterview} disabled={generateFeedbackMutation.isPending}>
                  {generateFeedbackMutation.isPending ? 'Ending...' : 'End Interview'}
                </Button>
              </>
            )}
            {session?.data.session.status === 'completed' && (
              <div className="text-sm font-medium text-muted-foreground">Interview Completed</div>
            )}
          </div>
        </div>
        {session?.data.phaseMetadata && (
          <PhaseDisplay
            phaseMetadata={session.data.phaseMetadata}
            phaseElapsedSeconds={session.data.phaseElapsedSeconds}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagram Canvas (conditional) */}
        {shouldShowDiagram && (
          <div className={isHighLevelPhase ? 'w-2/3 border-r border-border' : 'w-80 border-r border-border'}>
            <DiagramCanvas
              sessionId={sessionIdNum}
              isReadOnly={!isHighLevelPhase}
              onDiagramChange={handleDiagramChange}
            />
          </div>
        )}

        {/* Chat Area (Messages + Input) */}
        <div className={`flex flex-col ${shouldShowDiagram ? (isHighLevelPhase ? 'w-1/3' : 'flex-1') : 'w-full'}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Failed Messages Banner */}
        {(retryableCount > 0 || showRetryBanner) && (
          <FailedMessageBanner
            retryableCount={retryableCount}
            onViewRetry={handleViewRetry}
          />
        )}
        {messages.map((message) => {
          const isFailed = failedMessageIds.has(message.id);
          const failedMessage = (failedMessagesData?.data?.failedMessages || []).find((m) => m.id === message.id);

          return (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'candidate' ? 'justify-end' : 'justify-start'
              } flex-col ${message.role === 'candidate' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'candidate'
                    ? isFailed
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-800'
                      : 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                  <span>
                    {message.role === 'candidate' ? 'You' : 'Interviewer'} •{' '}
                    {formatElapsedTime(message.secondsElapsed)}
                  </span>
                  {isFailed && (
                    <Badge variant="destructive" className="text-xs">Failed</Badge>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{message.text}</div>
                {failedMessage?.partialText && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <div className="text-xs opacity-70 mb-1">Partial AI Response:</div>
                    <div className="whitespace-pre-wrap opacity-80">
                      {failedMessage.partialText}
                      <span>...</span>
                    </div>
                  </div>
                )}
              </div>
              {isFailed && message.role === 'candidate' && (
                <RetryButton
                  sessionId={sessionIdNum}
                  candidateMessageId={message.id}
                  onRetrySuccess={handleRetrySuccess}
                  onRetryError={(error) => {
                    toast.error(error.message);
                  }}
                />
              )}
            </div>
          );
        })}
        {/* Optimistic candidate message */}
        {optimisticMessage && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-primary text-primary-foreground opacity-90">
              <div className="text-xs opacity-70 mb-1">
                You • {formatElapsedTime(elapsedTime)}
              </div>
              <div className="whitespace-pre-wrap">{optimisticMessage.text}</div>
            </div>
          </div>
        )}
        {/* Streaming interviewer message */}
        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
              <div className="text-xs opacity-70 mb-1">
                Interviewer • {formatElapsedTime(elapsedTime)}
              </div>
              <div className="whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
              </div>
            </div>
          </div>
        )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t px-6 py-4 bg-card">
        {session?.data.session.status !== 'in_progress' && (
          <div className="mb-2 text-sm text-muted-foreground">
            This interview has ended. You can review the transcript but cannot send new messages.
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              session?.data.session.status !== 'in_progress'
                ? 'Interview has ended'
                : 'Type your response... (Shift+Enter for new line)'
            }
            className="min-h-[60px] resize-none"
            disabled={isStreaming || session?.data.session.status !== 'in_progress'}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isStreaming || !inputValue.trim() || session?.data.session.status !== 'in_progress'}
            className="self-end"
          >
            {isStreaming ? 'Streaming...' : 'Send'}
          </Button>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
