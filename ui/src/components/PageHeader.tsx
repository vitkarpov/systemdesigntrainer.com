import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  rightContent?: ReactNode;
  centerContent?: ReactNode;
}

export function PageHeader({
  title,
  onBack,
  backLabel,
  rightContent,
  centerContent,
}: PageHeaderProps) {
  return (
    <div className="border-b px-6 py-4 bg-card space-y-3 h-19">
      <div className="flex items-center max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-3 flex-1">
          {backLabel && onBack && <Button
            variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          }
          <h1 className="text-lg font-semibold">{title}</h1>
          {centerContent}
        </div>
        <div className="flex items-center gap-3">
          {rightContent}
        </div>
      </div>
    </div>
  );
}
