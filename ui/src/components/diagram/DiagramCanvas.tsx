import { useCallback, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type ReactFlowInstance,
} from '@xyflow/react';
import { ComponentPalette } from './ComponentPalette';
import { SaveIndicator } from './SaveIndicator';
import { useDiagramAutoSave } from '../../hooks/useDiagramAutoSave';
import { useSessionsControllerGetDiagram } from '../../api/hooks.gen';

// Import custom nodes
import { DatabaseNode } from './nodes/DatabaseNode';
import { CacheNode } from './nodes/CacheNode';
import { LoadBalancerNode } from './nodes/LoadBalancerNode';
import { ApiServerNode } from './nodes/ApiServerNode';
import { QueueNode } from './nodes/QueueNode';
import { ClientNode } from './nodes/ClientNode';
import { StorageNode } from './nodes/StorageNode';

const nodeTypes = {
  database: DatabaseNode,
  cache: CacheNode,
  loadBalancer: LoadBalancerNode,
  apiServer: ApiServerNode,
  queue: QueueNode,
  client: ClientNode,
  storage: StorageNode,
};

interface DiagramCanvasProps {
  sessionId: number;
  isReadOnly?: boolean;
  onDiagramChange?: (nodes: Node[], edges: Edge[]) => void;
}

export function DiagramCanvas({
  sessionId,
  isReadOnly = false,
  onDiagramChange,
}: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Load existing diagram on mount
  const { data: diagramData, isLoading } = useSessionsControllerGetDiagram(sessionId);

  // Auto-save hook
  const { saveStatus } = useDiagramAutoSave({
    sessionId,
    nodes,
    edges,
    enabled: !isReadOnly && nodes.length > 0,
  });

  // Initialize diagram from backend
  useEffect(() => {
    if (diagramData?.data && diagramData.data.nodes) {
      setNodes(diagramData.data.nodes);
      setEdges(diagramData.data.edges || []);
    }
  }, [diagramData, setNodes, setEdges]);

  // Notify parent of changes
  useEffect(() => {
    if (onDiagramChange && nodes.length >= 0) {
      onDiagramChange(nodes, edges);
    }
  }, [nodes, edges, onDiagramChange]);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');

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

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
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
      <div className="flex-1 relative">
        {!isReadOnly && (
          <div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur-sm px-3 py-2 rounded-md border border-border shadow-sm">
            <SaveIndicator status={saveStatus} />
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isReadOnly ? undefined : onNodesChange}
          onEdgesChange={isReadOnly ? undefined : onEdgesChange}
          onConnect={isReadOnly ? undefined : onConnect}
          onInit={setReactFlowInstance}
          onDrop={isReadOnly ? undefined : onDrop}
          onDragOver={isReadOnly ? undefined : onDragOver}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={!isReadOnly}
          className="bg-background"
        >
          <Background className="bg-muted/20" />
          <Controls className="bg-card border-border" />
          {!isReadOnly && <MiniMap className="bg-card border-border" />}
        </ReactFlow>
      </div>
    </div>
  );
}
