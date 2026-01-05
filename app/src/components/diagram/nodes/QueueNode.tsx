import { memo } from 'react';
import { Box } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeType } from './BaseNode';

export const QueueNode = memo(({ data, ...rest }: NodeProps<BaseNodeType>) => {
  return <BaseNode {...rest} data={{ ...data, icon: Box }} />;
});

QueueNode.displayName = 'QueueNode';
