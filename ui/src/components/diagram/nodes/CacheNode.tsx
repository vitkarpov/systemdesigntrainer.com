import { memo } from 'react';
import { Layers } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const CacheNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...(props.data as BaseNodeData), icon: Layers }} />;
});

CacheNode.displayName = 'CacheNode';
