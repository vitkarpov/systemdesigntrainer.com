import { memo } from "react";
import { Users } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode, type BaseNodeType } from "./BaseNode";

export const ClientNode = memo(({ data, ...rest }: NodeProps<BaseNodeType>) => {
  return <BaseNode {...rest} data={{ ...data, icon: Users }} />;
});

ClientNode.displayName = "ClientNode";
