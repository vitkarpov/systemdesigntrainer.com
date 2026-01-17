import { useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from "@xyflow/react";
import { ComponentPalette } from "./ComponentPalette";
import { SaveIndicator } from "./SaveIndicator";
import { useDiagramAutoSave } from "@/hooks/useDiagramAutoSave";
import { useSessionsControllerGetDiagram } from "@/api/hooks.gen";
import { useDiagramStore } from "@/stores";

import { DatabaseNode } from "./nodes/DatabaseNode";
import { CacheNode } from "./nodes/CacheNode";
import { LoadBalancerNode } from "./nodes/LoadBalancerNode";
import { ApiServerNode } from "./nodes/ApiServerNode";
import { QueueNode } from "./nodes/QueueNode";
import { ClientNode } from "./nodes/ClientNode";
import { StorageNode } from "./nodes/StorageNode";

const nodeTypes = {
  database: DatabaseNode,
  cache: CacheNode,
  loadBalancer: LoadBalancerNode,
  apiServer: ApiServerNode,
  queue: QueueNode,
  client: ClientNode,
  storage: StorageNode,
};

const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

interface DiagramCanvasProps {
  sessionId: number;
  isReadOnly?: boolean;
}

export function DiagramCanvas({
  sessionId,
  isReadOnly = false,
}: DiagramCanvasProps) {
  const nodes = useDiagramStore(
    (state) => state.getDiagram(sessionId)?.nodes ?? EMPTY_NODES,
  );
  const rawEdges = useDiagramStore(
    (state) => state.getDiagram(sessionId)?.edges ?? EMPTY_EDGES,
  );

  // Apply visual styling to edges based on selection state
  const edges: Edge[] = rawEdges.map((edge) => ({
    ...edge,
    style: {
      stroke: edge.selected ? "#3b82f6" : "#333333",
      strokeWidth: edge.selected ? 3 : 2,
    },
    animated: edge.selected,
  }));

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load existing diagram on mount
  const { data: diagramData, isLoading } =
    useSessionsControllerGetDiagram(sessionId);

  // Auto-save hook
  const { saveStatus } = useDiagramAutoSave({
    sessionId,
    enabled: !isReadOnly && nodes.length > 0,
  });

  // Initialize diagram from backend
  useEffect(() => {
    if (diagramData?.data && diagramData.data.nodes) {
      useDiagramStore
        .getState()
        .setNodes(sessionId, diagramData.data.nodes as Node[]);
      useDiagramStore
        .getState()
        .setEdges(sessionId, (diagramData.data.edges || []) as Edge[]);
    }
  }, [diagramData, sessionId]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}`,
        source: connection.source || "",
        target: connection.target || "",
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };
      useDiagramStore.getState().addEdge(sessionId, newEdge);
    },
    [sessionId],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/reactflow-label");

      const reactFlowInstance = useDiagramStore
        .getState()
        .getReactFlowInstance(sessionId);
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label },
      };

      useDiagramStore.getState().addNode(sessionId, newNode);
    },
    [sessionId],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-sm text-muted-foreground">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative" ref={reactFlowWrapper}>
      {!isReadOnly && <ComponentPalette />}
      <div
        className="flex-1 relative"
        onDrop={isReadOnly ? undefined : onDrop}
        onDragOver={isReadOnly ? undefined : onDragOver}
      >
        {!isReadOnly && (
          <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-sm px-3 py-2 rounded-md border border-border shadow-sm">
            <SaveIndicator status={saveStatus} />
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={
            isReadOnly
              ? undefined
              : (changes) =>
                  useDiagramStore.getState().onNodesChange(sessionId, changes)
          }
          onEdgesChange={
            isReadOnly
              ? undefined
              : (changes) =>
                  useDiagramStore.getState().onEdgesChange(sessionId, changes)
          }
          onConnect={isReadOnly ? undefined : onConnect}
          onInit={(instance) =>
            useDiagramStore.getState().setReactFlowInstance(sessionId, instance)
          }
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{
            type: "default",
          }}
          fitView
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          className="bg-background"
        >
          <Background className="bg-muted/20" />
          <Controls className="bg-card border-border" showInteractive={false} />
          {!isReadOnly && <MiniMap className="bg-card border-border" />}
        </ReactFlow>
      </div>
    </div>
  );
}
