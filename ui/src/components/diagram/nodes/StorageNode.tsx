import { memo } from 'react';
import { HardDrive } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode, type BaseNodeData } from './BaseNode';

export const StorageNode = memo<NodeProps<BaseNodeData>>((props) => {
  return <BaseNode {...props} data={{ ...(props.data as BaseNodeData), icon: HardDrive }} />;
});

StorageNode.displayName = 'StorageNode';
