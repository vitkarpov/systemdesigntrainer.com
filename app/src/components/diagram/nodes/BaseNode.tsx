import { memo, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Pencil, type LucideIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDiagramStore } from "@/stores/useDiagramStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type BaseNodeData = {
  label: string;
  icon?: LucideIcon;
} & Record<string, unknown>;

export type BaseNodeType = Node<BaseNodeData>;

export const BaseNode = memo(
  ({ data, isConnectable, selected, id: nodeId }: NodeProps<BaseNodeType>) => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const sessionIdNum = Number(sessionId);

    const [isEditing, setIsEditing] = useState(false);
    const [editedLabel, setEditedLabel] = useState(data.label);

    const Icon = data.icon;

    const onUpdateLabel = () => {
      setIsEditing(false);

      if (editedLabel.trim() === "") {
        setEditedLabel(data.label);
        return;
      }

      useDiagramStore.getState().updateNode(sessionIdNum, nodeId, {
        data: { ...data, label: editedLabel },
      });
    };

    return (
      <div
        className={`px-4 py-3 rounded-lg bg-card transition-all ${
          selected
            ? "border-2 border-border border-primary shadow-lg scale-150"
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
        <div className="flex flex-col items-center justify-center h-full gap-0">
          {Icon && <Icon className="w-7 h-7 text-primary" />}

          <div className="flex items-center justify-center gap-1">
            {isEditing ? (
              <Input
                value={editedLabel}
                onChange={(e) => {
                  setEditedLabel(e.target.value);
                }}
                onBlur={(event) => {
                  event.stopPropagation();
                  onUpdateLabel();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.stopPropagation();
                    onUpdateLabel();
                  } else if (event.key === "Escape") {
                    event.stopPropagation();
                    setIsEditing(false);
                    setEditedLabel(data.label);
                  }
                }}
                autoFocus
              />
            ) : (
              <div className="text-xs font-medium text-center text-foreground leading-tight">
                {data.label}
              </div>
            )}
            {selected && !isEditing && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label="Edit component name"
                      variant="transparent"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsEditing(true);
                      }}
                      className="p-0 h-3 w-3"
                    >
                      <Pencil className=" text-gray-500" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-background/85 text-foreground/80 shadow-md backdrop-blur-sm">
                    Edit component name
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
