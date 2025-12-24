import { memo } from 'react';
import { Box } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const QueueNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...(props.data as BaseNodeData), icon: Box }} />;
});

QueueNode.displayName = 'QueueNode';
