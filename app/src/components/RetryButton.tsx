import { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSessionsControllerRetryConversation } from '@/api/hooks.gen';
import { useQueryClient } from '@tanstack/react-query';
import {
  getSessionsControllerGetTranscriptQueryKey,
  getSessionsControllerGetSessionQueryKey,
} from '@/api/hooks.gen';

interface RetryButtonProps {
  sessionId: number;
  candidateMessageId: number;
  onRetrySuccess?: () => void;
  onRetryError?: (error: Error) => void;
}

export function RetryButton({ sessionId, candidateMessageId, onRetrySuccess, onRetryError }: RetryButtonProps) {
  const queryClient = useQueryClient();
  const [isRetrying, setIsRetrying] = useState(false);
  const retryMutation = useSessionsControllerRetryConversation();

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      await retryMutation.mutateAsync({
        id: sessionId,
        data: { candidateMessageId },
      });

      // Refresh transcript and session data
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getSessionsControllerGetTranscriptQueryKey(sessionId),
        }),
        queryClient.invalidateQueries({
          queryKey: getSessionsControllerGetSessionQueryKey(sessionId),
        }),
      ]);

      if (onRetrySuccess) {
        onRetrySuccess();
      }
    } catch (error) {
      console.error('Failed to retry conversation:', error);
      if (onRetryError && error instanceof Error) {
        onRetryError(error);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={isRetrying}
      className="gap-2 mt-2"
    >
      <RefreshCcw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
      {isRetrying ? 'Retrying...' : 'Retry AI Response'}
    </Button>
  );
}
