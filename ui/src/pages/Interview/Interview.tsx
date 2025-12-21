import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  useSessionsControllerGetSession,
  useSessionsControllerGetTranscript,
  useSessionsControllerHandleConversation,
  useSessionsControllerAdvancePhase,
  useSessionsControllerGenerateFeedback,
  getSessionsControllerGetSessionQueryKey,
  getSessionsControllerGetTranscriptQueryKey,
} from '../../api/hooks.gen';
import { formatElapsedTime } from '../../lib/utils';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const sessionIdNum = Number(sessionId);

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

  const conversationMutation = useSessionsControllerHandleConversation();
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
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || conversationMutation.isPending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setError(null);

    try {
      await conversationMutation.mutateAsync({
        id: sessionIdNum,
        data: {
          text: messageContent,
        },
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getSessionsControllerGetTranscriptQueryKey(sessionIdNum),
        }),
        queryClient.invalidateQueries({
          queryKey: getSessionsControllerGetSessionQueryKey(sessionIdNum),
        }),
      ]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    }
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isLoading = isLoadingSession || isLoadingMessages;
  const isSending = conversationMutation.isPending;

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
      <div className="border-b px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{session?.data.session.interviewCase?.title}</h1>
          <Badge variant="secondary">{session?.data.session.currentPhase.replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Time: {formatElapsedTime(elapsedTime)}
          </div>
          {session?.data.session.currentPhase !== 'wrap_up' && (
            <Button variant="outline" size="sm" onClick={handleAdvancePhase} disabled={advancePhaseMutation.isPending}>
              Next Phase
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleEndInterview} disabled={generateFeedbackMutation.isPending}>
            {generateFeedbackMutation.isPending ? 'Ending...' : 'End Interview'}
          </Button>
        </div>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-6 py-4 bg-card">
        {error && (
          <div className="mb-2 text-sm text-destructive">{error}</div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response... (Shift+Enter for new line)"
            className="min-h-[60px] resize-none"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !inputValue.trim()}
            className="self-end"
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
