import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { LucideIcon } from 'lucide-react';

export interface BaseNodeData {
  label: string;
  icon?: LucideIcon;
}

export const BaseNode = memo<NodeProps<BaseNodeData>>(({ data, isConnectable, selected }) => {
  const Icon = data.icon;

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-card transition-all ${
        selected
          ? 'border-primary shadow-lg scale-105'
          : 'border-border hover:border-primary/50 hover:shadow-md'
      }`}
      style={{ width: 140, height: 90 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-background"
      />
      <div className="flex flex-col items-center justify-center h-full gap-2">
        {Icon && <Icon className="w-7 h-7 text-primary" />}
        <div className="text-xs font-medium text-center text-foreground leading-tight">
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 border-2 border-background"
      />
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
