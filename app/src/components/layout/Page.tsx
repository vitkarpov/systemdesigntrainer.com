import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Background = 'default' | 'gradient' | 'card';

interface PageProps {
  children: ReactNode;
  className?: string;
  background?: Background;
}

const backgroundMap: Record<Background, string> = {
  default: 'bg-background',
  gradient: 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
  card: 'bg-card',
};

/**
 * Page component provides consistent full-height page layout.
 *
 * Use this as the root wrapper for all page components to ensure
 * consistent styling and spacing.
 */
export function Page({ children, className, background = 'default' }: PageProps) {
  const classes = cn('h-screen flex flex-col px-2', backgroundMap[background], className);

  return <div className={classes}>{children}</div>;
}
