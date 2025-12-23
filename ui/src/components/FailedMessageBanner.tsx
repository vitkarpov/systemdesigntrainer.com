import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface FailedMessageBannerProps {
  retryableCount: number;
  onViewRetry: () => void;
}

export function FailedMessageBanner({ retryableCount, onViewRetry }: FailedMessageBannerProps) {
  if (retryableCount === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
        <span className="text-sm text-yellow-800 dark:text-yellow-300">
          {retryableCount} message{retryableCount > 1 ? 's' : ''} failed to get AI response.
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onViewRetry}>
        View & Retry
      </Button>
    </div>
  );
}
