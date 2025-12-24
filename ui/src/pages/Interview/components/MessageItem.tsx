import { Badge } from '../../../components/ui/badge';
import { RetryButton } from '../../../components/RetryButton';
import { formatElapsedTime } from '../../../lib/utils';

interface MessageItemProps {
  message: {
    id: number;
    role: 'candidate' | 'interviewer';
    text: string;
    secondsElapsed: number;
  };
  isFailed: boolean;
  failedMessage?: {
    id: number;
    partialText?: string | null;
  };
  sessionId: number;
  onRetrySuccess: () => void;
  onRetryError: (error: Error) => void;
}

export function MessageItem({
  message,
  isFailed,
  failedMessage,
  sessionId,
  onRetrySuccess,
  onRetryError,
}: MessageItemProps) {
  return (
    <div
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
            <Badge variant="destructive" className="text-xs">
              Failed
            </Badge>
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
          sessionId={sessionId}
          candidateMessageId={message.id}
          onRetrySuccess={onRetrySuccess}
          onRetryError={onRetryError}
        />
      )}
    </div>
  );
}
