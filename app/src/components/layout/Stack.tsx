import { Flex } from './Flex';
import type { ComponentPropsWithoutRef } from 'react';

type FlexProps = ComponentPropsWithoutRef<typeof Flex>;

interface StackProps extends Omit<FlexProps, 'direction'> {
  direction?: 'vertical' | 'horizontal';
}

/**
 * Stack component for vertical or horizontal layouts with consistent spacing.
 * Defaults to vertical (column) direction.
 *
 * Use this for lists, forms, or any content that needs consistent spacing.
 */
export function Stack({
  direction = 'vertical',
  ...props
}: StackProps) {
  const flexDirection = direction === 'vertical' ? 'col' : 'row';

  return <Flex direction={flexDirection} {...props} />;
}
