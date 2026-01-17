import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";

export type BaseNodeData = {
  label: string;
  icon?: LucideIcon;
} & Record<string, unknown>;

export type BaseNodeType = Node<BaseNodeData>;

export const BaseNode = memo(
  ({ data, isConnectable, selected }: NodeProps<BaseNodeType>) => {
    const Icon = data.icon;

    return (
      <div
        className={`px-4 py-3 rounded-lg bg-card transition-all ${
          selected
            ? "border-2 border-border border-primary shadow-lg scale-105"
            : "border-2 border-border hover:border-primary/50 hover:shadow-md"
        }`}
        style={{ width: 140, height: 90 }}
      >
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          className="w-3 h-3 border-2 border-background !bg-primary"
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
          className="w-3 h-3 border-2 border-background !bg-primary"
        />
      </div>
    );
  },
);

BaseNode.displayName = "BaseNode";
