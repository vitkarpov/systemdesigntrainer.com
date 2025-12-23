import { memo } from 'react';
import { Activity } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const LoadBalancerNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...props.data, icon: Activity }} />;
});

LoadBalancerNode.displayName = 'LoadBalancerNode';
