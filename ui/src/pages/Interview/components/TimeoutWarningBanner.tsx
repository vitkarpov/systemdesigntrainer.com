import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeoutWarningBannerProps {
  inactiveSeconds: number;
  onDismiss: () => void;
}

export function TimeoutWarningBanner({ inactiveSeconds, onDismiss }: TimeoutWarningBannerProps) {
  const remainingSeconds = 780 - inactiveSeconds; // 13 minutes = 780 seconds
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const remainingSecondsDisplay = remainingSeconds % 60;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                No activity detected
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                Your interview will auto-end in {remainingMinutes}:{remainingSecondsDisplay.toString().padStart(2, '0')} due to inactivity.
                Send a message to continue.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/30 flex-shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
