import { type ReactNode, type ElementType } from 'react';
import { cn } from '@/lib/utils';

type Spacing = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20';
type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

interface ContainerProps<T extends ElementType = 'div'> {
  children: ReactNode;
  as?: T;
  className?: string;
  maxWidth?: MaxWidth;
  padding?: Spacing;
  paddingX?: Spacing;
  paddingY?: Spacing;
  gap?: Spacing;
  width?: 'full' | 'auto';
}

const spacingMap: Record<Spacing, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '8': '8',
  '10': '10',
  '12': '12',
  '16': '16',
  '20': '20',
};

const maxWidthMap: Record<MaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function Container<T extends ElementType = 'div'>({
  children,
  as,
  className,
  maxWidth = '6xl',
  padding,
  paddingX,
  paddingY,
  gap,
  width = 'full',
}: ContainerProps<T>) {
  const Component = as || 'div';

  const classes = cn(
    // Max width
    maxWidthMap[maxWidth],
    // Width
    width === 'full' && 'w-full',
    width === 'auto' && 'w-auto',
    // Center alignment (typical for containers)
    maxWidth !== 'full' && 'mx-auto',
    // Padding
    padding && `p-${spacingMap[padding]}`,
    paddingX && `px-${spacingMap[paddingX]}`,
    paddingY && `py-${spacingMap[paddingY]}`,
    // Gap (for when container is also a flex/grid)
    gap && `space-y-${spacingMap[gap]}`,
    className
  );

  return <Component className={classes}>{children}</Component>;
}
