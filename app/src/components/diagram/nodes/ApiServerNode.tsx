import { memo } from "react";
import { Server } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode, type BaseNodeType } from "./BaseNode";

export const ApiServerNode = memo(
  ({ data, ...rest }: NodeProps<BaseNodeType>) => {
    return <BaseNode {...rest} data={{ ...data, icon: Server }} />;
  },
);

ApiServerNode.displayName = "ApiServerNode";
