import { forwardRef } from 'react';
import { FailedMessageBanner } from '@/components/FailedMessageBanner';
import { MessageItem } from './MessageItem';
import { formatElapsedTime } from '@/lib/utils';

interface OptimisticMessage {
  text: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Array<{
    id: number;
    role: 'candidate' | 'interviewer';
    text: string;
    secondsElapsed: number;
  }>;
  failedMessageIds: Set<number>;
  failedMessages: Array<{
    id: number;
    partialText?: string | null;
  }>;
  retryableCount: number;
  optimisticMessage: OptimisticMessage | null;
  streamingText: string;
  isStreaming: boolean;
  sessionId: number;
  elapsedTime: number;
  onViewRetry: () => void;
  onRetrySuccess: () => void;
  onRetryError: (error: Error) => void;
}

export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  (
    {
      messages,
      failedMessageIds,
      failedMessages,
      retryableCount,
      optimisticMessage,
      streamingText,
      isStreaming,
      sessionId,
      elapsedTime,
      onViewRetry,
      onRetrySuccess,
      onRetryError,
    },
    messagesEndRef
  ) => {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Failed Messages Banner */}
        {retryableCount > 0 && (
          <FailedMessageBanner
            retryableCount={retryableCount}
            onViewRetry={onViewRetry}
          />
        )}

        {/* Message Items */}
        {messages.map((message) => {
          const isFailed = failedMessageIds.has(message.id);
          const failedMessage = failedMessages.find((m) => m.id === message.id);

          return (
            <MessageItem
              key={message.id}
              message={message}
              isFailed={isFailed}
              failedMessage={failedMessage}
              sessionId={sessionId}
              onRetrySuccess={onRetrySuccess}
              onRetryError={onRetryError}
            />
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
    );
  }
);

MessageList.displayName = 'MessageList';
