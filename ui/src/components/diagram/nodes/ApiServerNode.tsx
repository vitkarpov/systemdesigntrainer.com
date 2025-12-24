import { memo } from 'react';
import { Server } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const ApiServerNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...(props.data as BaseNodeData), icon: Server }} />;
});

ApiServerNode.displayName = 'ApiServerNode';
