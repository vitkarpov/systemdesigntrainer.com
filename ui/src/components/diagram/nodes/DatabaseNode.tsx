import { memo } from 'react';
import { Database } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeType } from './BaseNode';

export const DatabaseNode = memo(({ data, ...rest }: NodeProps<BaseNodeType>) => {
  return <BaseNode {...rest} data={{ ...data, icon: Database }} />;
});

DatabaseNode.displayName = 'DatabaseNode';
