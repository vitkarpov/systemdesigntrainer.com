import { memo } from 'react';
import { Users } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const ClientNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...props.data, icon: Users }} />;
});

ClientNode.displayName = 'ClientNode';
