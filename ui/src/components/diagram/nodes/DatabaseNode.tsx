import { memo } from 'react';
import { Database } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const DatabaseNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...props.data, icon: Database }} />;
});

DatabaseNode.displayName = 'DatabaseNode';
