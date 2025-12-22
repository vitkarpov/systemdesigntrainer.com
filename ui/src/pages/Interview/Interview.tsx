import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card } from '../../components/ui/card';
import { PhaseDisplay } from '../../components/PhaseDisplay';
import {
  useSessionsControllerGetSession,
  useSessionsControllerGetTranscript,
  useSessionsControllerAdvancePhase,
  useSessionsControllerGenerateFeedback,
  getSessionsControllerGetSessionQueryKey,
} from '../../api/hooks.gen';
import { formatElapsedTime } from '../../lib/utils';
import { useConversationStream } from '../../hooks/useConversationStream';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [optimisticMessage, setOptimisticMessage] = useState<{ text: string; timestamp: number } | null>(null);

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
    onError: () => {
      setError('Failed to send message. Please try again.');
      setOptimisticMessage(null);
    },
  });

  const { data: session, isLoading: isLoadingSession } = useSessionsControllerGetSession(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
      refetchInterval: 1000,
    },
  });

  const { data: transcriptData, isLoading: isLoadingMessages } = useSessionsControllerGetTranscript(sessionIdNum, {
    query: {
      enabled: !!sessionId && !isNaN(sessionIdNum),
    },
  });

  const messages = transcriptData?.data.messages || [];

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
    setError(null);

    // Show optimistic message immediately
    setOptimisticMessage({
      text: messageContent,
      timestamp: Date.now(),
    });

    sendMessage(messageContent);
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
    } catch (err) {
      console.error('Failed to advance phase:', err);
      setError('Failed to advance phase');
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;

    try {
      await generateFeedbackMutation.mutateAsync({
        id: sessionIdNum,
      });
      navigate(`/feedback/${sessionId}`);
    } catch (err) {
      console.error('Failed to generate feedback:', err);
      setError('Failed to generate feedback');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-destructive">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{session?.data.session.interviewCase?.title}</h1>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'candidate' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'candidate'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {message.role === 'candidate' ? 'You' : 'Interviewer'} •{' '}
                {formatElapsedTime(message.secondsElapsed)}
              </div>
              <div className="whitespace-pre-wrap">{message.text}</div>
            </div>
          </div>
        ))}
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
        {error && (
          <div className="mb-2 text-sm text-destructive">{error}</div>
        )}
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
  );
}
