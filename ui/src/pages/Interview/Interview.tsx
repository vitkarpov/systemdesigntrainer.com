import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  getSession,
  getTranscript,
  addMessage,
  getAiResponse,
  advancePhase,
  generateFeedback,
  type Session,
  type TranscriptMessage,
} from '../../services/api';
import { formatElapsedTime } from '../../lib/utils';

export default function Interview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!sessionId) return;

    const loadSessionData = async () => {
      try {
        setIsLoading(true);
        const [sessionData, transcriptData] = await Promise.all([
          getSession(Number(sessionId)),
          getTranscript(Number(sessionId)),
        ]);
        setSession(sessionData);
        setMessages(transcriptData);
        setElapsedTime(sessionData.elapsedTime);
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Failed to load interview session');
      } finally {
        setIsLoading(false);
      }
    };

    loadSessionData();
  }, [sessionId]);

  useEffect(() => {
    if (!session || session.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !sessionId || isSending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setError(null);

    try {
      const candidateMessage = await addMessage(
        Number(sessionId),
        'candidate',
        messageContent
      );
      setMessages((prev) => [...prev, candidateMessage]);

      const aiResponse = await getAiResponse(Number(sessionId));
      const transcriptData = await getTranscript(Number(sessionId));
      setMessages(transcriptData);

      const sessionData = await getSession(Number(sessionId));
      setSession(sessionData);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAdvancePhase = async () => {
    if (!sessionId) return;

    try {
      const updatedSession = await advancePhase(Number(sessionId));
      setSession(updatedSession);
    } catch (err) {
      console.error('Failed to advance phase:', err);
      setError('Failed to advance phase');
    }
  };

  const handleEndInterview = async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      await generateFeedback(Number(sessionId));
      navigate(`/feedback/${sessionId}`);
    } catch (err) {
      console.error('Failed to generate feedback:', err);
      setError('Failed to generate feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
          <h1 className="text-xl font-semibold">{session?.interviewCase.title}</h1>
          <Badge variant="secondary">{session?.currentPhase.replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Time: {formatElapsedTime(elapsedTime)}
          </div>
          {session?.currentPhase !== 'wrap_up' && (
            <Button variant="outline" size="sm" onClick={handleAdvancePhase}>
              Next Phase
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleEndInterview}>
            End Interview
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
                {formatElapsedTime(message.elapsedTime)}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
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
