import {
  Conversation,
  ConversationContent,
} from '@/components/ui/shadcn-io/ai/conversation';
import {
  Message,
  MessageContent,
} from '@/components/ui/shadcn-io/ai/message';
import { Response } from '@/components/ui/shadcn-io/ai/response';
import { formatElapsedTime } from '@/lib/utils';
import type { MessageResponseDto } from '@/api/hooks.gen';

interface OptimisticMessage {
  text: string;
  timestamp: number;
}

interface MessageListProps {
  messages: MessageResponseDto[];
  optimisticMessage: OptimisticMessage | null;
  streamingText: string;
  isStreaming: boolean;
  elapsedTime: number;
}

export function MessageList({
  messages,
  optimisticMessage,
  streamingText,
  isStreaming,
  elapsedTime,
}: MessageListProps) {
  return (
    <Conversation className="flex-1">
      <ConversationContent className="space-y-4">
        {/* Regular messages */}
        {messages.map((message) => (
          <Message key={message.id} from={message.role === 'candidate' ? 'user' : 'assistant'}>
            <MessageContent>
              <div className="text-xs opacity-70 mb-1">
                {message.role === 'candidate' ? 'You' : 'Interviewer'} •{' '}
                {formatElapsedTime(message.secondsElapsed)}
              </div>
              <Response>{message.text}</Response>
            </MessageContent>
          </Message>
        ))}

        {/* Optimistic candidate message */}
        {optimisticMessage && (
          <Message from="user">
            <MessageContent className="opacity-90">
              <div className="text-xs opacity-70 mb-1">
                You • {formatElapsedTime(elapsedTime)}
              </div>
              <Response>{optimisticMessage.text}</Response>
            </MessageContent>
          </Message>
        )}

        {/* Streaming interviewer message */}
        {isStreaming && streamingText && (
          <Message from="assistant">
            <MessageContent>
              <div className="text-xs opacity-70 mb-1">
                Interviewer • {formatElapsedTime(elapsedTime)}
              </div>
              <Response parseIncompleteMarkdown={true}>
                {streamingText}
              </Response>
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            </MessageContent>
          </Message>
        )}
      </ConversationContent>
    </Conversation>
  );
}
