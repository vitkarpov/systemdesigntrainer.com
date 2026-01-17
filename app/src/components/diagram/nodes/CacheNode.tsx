import { memo } from "react";
import { Layers } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode, type BaseNodeType } from "./BaseNode";

export const CacheNode = memo(({ data, ...rest }: NodeProps<BaseNodeType>) => {
  return <BaseNode {...rest} data={{ ...data, icon: Layers }} />;
});

CacheNode.displayName = "CacheNode";
