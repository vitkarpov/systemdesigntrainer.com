import { memo } from "react";
import { HardDrive } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { BaseNode, type BaseNodeType } from "./BaseNode";

export const StorageNode = memo(
  ({ data, ...rest }: NodeProps<BaseNodeType>) => {
    return <BaseNode {...rest} data={{ ...data, icon: HardDrive }} />;
  },
);

StorageNode.displayName = "StorageNode";
