import { memo } from 'react';
import { Activity } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeType } from './BaseNode';

export const LoadBalancerNode = memo(({ data, ...rest }: NodeProps<BaseNodeType>) => {
  return <BaseNode {...rest} data={{ ...data, icon: Activity }} />;
});

LoadBalancerNode.displayName = 'LoadBalancerNode';
