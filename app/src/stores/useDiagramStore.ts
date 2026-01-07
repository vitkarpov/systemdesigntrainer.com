import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Node,
  Edge,
  ReactFlowInstance,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

interface DiagramData {
  nodes: Node[];
  edges: Edge[];
}

interface DiagramState {
  // State: Keyed by sessionId
  diagrams: Record<number, DiagramData>;
  reactFlowInstances: Record<number, ReactFlowInstance | null>;

  // Selectors
  getDiagram: (sessionId: number) => DiagramData | null;
  getReactFlowInstance: (sessionId: number) => ReactFlowInstance | null;

  // Bulk operations
  setDiagram: (sessionId: number, diagram: DiagramData) => void;
  setNodes: (sessionId: number, nodes: Node[]) => void;
  setEdges: (sessionId: number, edges: Edge[]) => void;

  // Granular operations (using Immer)
  updateNode: (
    sessionId: number,
    nodeId: string,
    updates: Partial<Node>,
  ) => void;
  updateEdge: (
    sessionId: number,
    edgeId: string,
    updates: Partial<Edge>,
  ) => void;
  addNode: (sessionId: number, node: Node) => void;
  addEdge: (sessionId: number, edge: Edge) => void;
  removeNode: (sessionId: number, nodeId: string) => void;
  removeEdge: (sessionId: number, edgeId: string) => void;

  // ReactFlow change handlers
  onNodesChange: (sessionId: number, changes: NodeChange[]) => void;
  onEdgesChange: (sessionId: number, changes: EdgeChange[]) => void;

  // ReactFlow instance management
  setReactFlowInstance: (
    sessionId: number,
    instance: ReactFlowInstance | null,
  ) => void;

  // Cleanup
  clearDiagram: (sessionId: number) => void;
}

export const useDiagramStore = create<DiagramState>()(
  devtools(
    immer((set, get) => ({
      diagrams: {},
      reactFlowInstances: {},

      // Selectors
      getDiagram: (sessionId) => get().diagrams[sessionId] || null,

      getReactFlowInstance: (sessionId) =>
        get().reactFlowInstances[sessionId] || null,

      // Bulk operations
      setDiagram: (sessionId, diagram) =>
        set(
          (state) => {
            state.diagrams[sessionId] = diagram;
          },
          false,
          "setDiagram",
        ),

      setNodes: (sessionId, nodes) =>
        set(
          (state) => {
            if (!state.diagrams[sessionId]) {
              state.diagrams[sessionId] = { nodes: [], edges: [] };
            }
            state.diagrams[sessionId].nodes = nodes;
          },
          false,
          "setNodes",
        ),

      setEdges: (sessionId, edges) =>
        set(
          (state) => {
            if (!state.diagrams[sessionId]) {
              state.diagrams[sessionId] = { nodes: [], edges: [] };
            }
            state.diagrams[sessionId].edges = edges;
          },
          false,
          "setEdges",
        ),

      // Granular operations (Immer allows direct mutations)
      updateNode: (sessionId, nodeId, updates) =>
        set(
          (state) => {
            const diagram = state.diagrams[sessionId];
            if (!diagram) return;
            const node = diagram.nodes.find((n) => n.id === nodeId);
            if (node) {
              Object.assign(node, updates);
            }
          },
          false,
          "updateNode",
        ),

      updateEdge: (sessionId, edgeId, updates) =>
        set(
          (state) => {
            const diagram = state.diagrams[sessionId];
            if (!diagram) return;
            const edge = diagram.edges.find((e) => e.id === edgeId);
            if (edge) {
              Object.assign(edge, updates);
            }
          },
          false,
          "updateEdge",
        ),

      addNode: (sessionId, node) =>
        set(
          (state) => {
            if (!state.diagrams[sessionId]) {
              state.diagrams[sessionId] = { nodes: [], edges: [] };
            }
            state.diagrams[sessionId].nodes.push(node);
          },
          false,
          "addNode",
        ),

      addEdge: (sessionId, edge) =>
        set(
          (state) => {
            if (!state.diagrams[sessionId]) {
              state.diagrams[sessionId] = { nodes: [], edges: [] };
            }
            state.diagrams[sessionId].edges.push(edge);
          },
          false,
          "addEdge",
        ),

      removeNode: (sessionId, nodeId) =>
        set(
          (state) => {
            const diagram = state.diagrams[sessionId];
            if (!diagram) return;
            diagram.nodes = diagram.nodes.filter((n) => n.id !== nodeId);
          },
          false,
          "removeNode",
        ),

      removeEdge: (sessionId, edgeId) =>
        set(
          (state) => {
            const diagram = state.diagrams[sessionId];
            if (!diagram) return;
            diagram.edges = diagram.edges.filter((e) => e.id !== edgeId);
          },
          false,
          "removeEdge",
        ),

      // ReactFlow change handlers
      onNodesChange: (sessionId, changes) =>
        set(
          (state) => {
            const diagram = state.diagrams[sessionId];
            if (!diagram) return;
            diagram.nodes = applyNodeChanges(changes, diagram.nodes);
          },
          false,
          "onNodesChange",
        ),

      onEdgesChange: (sessionId, changes) =>
        set(
          (state) => {
            const diagram = state.diagrams[sessionId];
            if (!diagram) return;
            diagram.edges = applyEdgeChanges(changes, diagram.edges);
          },
          false,
          "onEdgesChange",
        ),

      // ReactFlow instance
      setReactFlowInstance: (sessionId, instance) =>
        set(
          (state) => {
            state.reactFlowInstances[sessionId] = instance;
          },
          false,
          "setReactFlowInstance",
        ),

      // Cleanup
      clearDiagram: (sessionId) =>
        set(
          (state) => {
            delete state.diagrams[sessionId];
            delete state.reactFlowInstances[sessionId];
          },
          false,
          "clearDiagram",
        ),
    })),
    { name: "DiagramStore" },
  ),
);
