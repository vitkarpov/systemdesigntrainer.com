import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  backLabel?: string;
  rightContent?: ReactNode;
  bottomContent?: ReactNode;
}

export function PageHeader({
  title,
  onBack,
  backLabel = 'Back to Dashboard',
  rightContent,
  bottomContent,
}: PageHeaderProps) {
  return (
    <div className="border-b px-6 py-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {rightContent}
        </div>
      </div>
      {bottomContent}
    </div>
  );
}
