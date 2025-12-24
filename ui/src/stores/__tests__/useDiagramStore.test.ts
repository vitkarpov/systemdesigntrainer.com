import { describe, it, expect, beforeEach } from 'vitest'
import { useDiagramStore } from '../useDiagramStore'
import type { Node, Edge } from '@xyflow/react'

describe('useDiagramStore', () => {
  const sessionId = 123

  beforeEach(() => {
    useDiagramStore.getState().clearDiagram(sessionId)
  })

  describe('diagram management', () => {
    it('should set diagram for session', () => {
      const { setDiagram, getDiagram } = useDiagramStore.getState()
      const diagram = {
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }] as Node[],
        edges: [{ id: 'e1-2', source: '1', target: '2' }] as Edge[],
      }

      setDiagram(sessionId, diagram)

      expect(getDiagram(sessionId)).toEqual(diagram)
    })

    it('should get diagram for session', () => {
      const { setDiagram, getDiagram } = useDiagramStore.getState()
      const diagram = {
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }] as Node[],
        edges: [] as Edge[],
      }

      setDiagram(sessionId, diagram)

      const retrieved = getDiagram(sessionId)
      expect(retrieved).toEqual(diagram)
    })

    it('should return null for non-existent session', () => {
      const { getDiagram } = useDiagramStore.getState()

      expect(getDiagram(999)).toBeNull()
    })

    it('should set nodes independently', () => {
      const { setNodes, getDiagram } = useDiagramStore.getState()
      const nodes = [
        { id: '1', position: { x: 0, y: 0 }, data: {} },
        { id: '2', position: { x: 100, y: 100 }, data: {} },
      ] as Node[]

      setNodes(sessionId, nodes)

      const diagram = getDiagram(sessionId)
      expect(diagram?.nodes).toEqual(nodes)
      expect(diagram?.edges).toEqual([])
    })

    it('should set edges independently', () => {
      const { setEdges, getDiagram } = useDiagramStore.getState()
      const edges = [
        { id: 'e1-2', source: '1', target: '2' },
      ] as Edge[]

      setEdges(sessionId, edges)

      const diagram = getDiagram(sessionId)
      expect(diagram?.edges).toEqual(edges)
      expect(diagram?.nodes).toEqual([])
    })
  })

  describe('node operations', () => {
    it('should add node to diagram', () => {
      const { addNode, getDiagram } = useDiagramStore.getState()
      const node = { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } } as Node

      addNode(sessionId, node)

      const diagram = getDiagram(sessionId)
      expect(diagram?.nodes).toHaveLength(1)
      expect(diagram?.nodes[0]).toEqual(node)
    })

    it('should update existing node', () => {
      const { addNode, updateNode, getDiagram } = useDiagramStore.getState()
      const node = { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } } as Node

      addNode(sessionId, node)
      updateNode(sessionId, '1', { position: { x: 100, y: 100 } })

      const diagram = getDiagram(sessionId)
      expect(diagram?.nodes[0].position).toEqual({ x: 100, y: 100 })
      expect(diagram?.nodes[0].data).toEqual({ label: 'Node 1' })
    })

    it('should remove node from diagram', () => {
      const { addNode, removeNode, getDiagram } = useDiagramStore.getState()
      const node1 = { id: '1', position: { x: 0, y: 0 }, data: {} } as Node
      const node2 = { id: '2', position: { x: 100, y: 100 }, data: {} } as Node

      addNode(sessionId, node1)
      addNode(sessionId, node2)

      expect(getDiagram(sessionId)?.nodes).toHaveLength(2)

      removeNode(sessionId, '1')

      const diagram = getDiagram(sessionId)
      expect(diagram?.nodes).toHaveLength(1)
      expect(diagram?.nodes[0].id).toBe('2')
    })

    it('should apply ReactFlow node changes', () => {
      const { setNodes, onNodesChange, getDiagram } = useDiagramStore.getState()
      const nodes = [
        { id: '1', position: { x: 0, y: 0 }, data: {}, selected: false },
      ] as Node[]

      setNodes(sessionId, nodes)

      // Apply a selection change
      const changes = [{ id: '1', type: 'select', selected: true }]
      onNodesChange(sessionId, changes)

      const diagram = getDiagram(sessionId)
      expect(diagram?.nodes[0].selected).toBe(true)
    })
  })

  describe('edge operations', () => {
    it('should add edge to diagram', () => {
      const { addEdge, getDiagram } = useDiagramStore.getState()
      const edge = { id: 'e1-2', source: '1', target: '2' } as Edge

      addEdge(sessionId, edge)

      const diagram = getDiagram(sessionId)
      expect(diagram?.edges).toHaveLength(1)
      expect(diagram?.edges[0]).toEqual(edge)
    })

    it('should update existing edge', () => {
      const { addEdge, updateEdge, getDiagram } = useDiagramStore.getState()
      const edge = { id: 'e1-2', source: '1', target: '2', animated: false } as Edge

      addEdge(sessionId, edge)
      updateEdge(sessionId, 'e1-2', { animated: true })

      const diagram = getDiagram(sessionId)
      expect(diagram?.edges[0].animated).toBe(true)
    })

    it('should remove edge from diagram', () => {
      const { addEdge, removeEdge, getDiagram } = useDiagramStore.getState()
      const edge1 = { id: 'e1-2', source: '1', target: '2' } as Edge
      const edge2 = { id: 'e2-3', source: '2', target: '3' } as Edge

      addEdge(sessionId, edge1)
      addEdge(sessionId, edge2)

      expect(getDiagram(sessionId)?.edges).toHaveLength(2)

      removeEdge(sessionId, 'e1-2')

      const diagram = getDiagram(sessionId)
      expect(diagram?.edges).toHaveLength(1)
      expect(diagram?.edges[0].id).toBe('e2-3')
    })

    it('should apply ReactFlow edge changes', () => {
      const { setEdges, onEdgesChange, getDiagram } = useDiagramStore.getState()
      const edges = [
        { id: 'e1-2', source: '1', target: '2', selected: false },
      ] as Edge[]

      setEdges(sessionId, edges)

      // Apply a selection change
      const changes = [{ id: 'e1-2', type: 'select', selected: true }]
      onEdgesChange(sessionId, changes)

      const diagram = getDiagram(sessionId)
      expect(diagram?.edges[0].selected).toBe(true)
    })
  })

  describe('ReactFlow instance management', () => {
    it('should set ReactFlow instance', () => {
      const { setReactFlowInstance, getReactFlowInstance } = useDiagramStore.getState()
      const mockInstance = { fitView: () => {} } as any

      setReactFlowInstance(sessionId, mockInstance)

      expect(getReactFlowInstance(sessionId)).toBe(mockInstance)
    })

    it('should return null for non-existent instance', () => {
      const { getReactFlowInstance } = useDiagramStore.getState()

      expect(getReactFlowInstance(999)).toBeNull()
    })
  })

  describe('cleanup', () => {
    it('should clear diagram and ReactFlow instance', () => {
      const { setDiagram, setReactFlowInstance, clearDiagram, getDiagram, getReactFlowInstance } = useDiagramStore.getState()
      const diagram = {
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }] as Node[],
        edges: [] as Edge[],
      }
      const mockInstance = { fitView: () => {} } as any

      setDiagram(sessionId, diagram)
      setReactFlowInstance(sessionId, mockInstance)

      expect(getDiagram(sessionId)).not.toBeNull()
      expect(getReactFlowInstance(sessionId)).not.toBeNull()

      clearDiagram(sessionId)

      expect(getDiagram(sessionId)).toBeNull()
      expect(getReactFlowInstance(sessionId)).toBeNull()
    })

    it('should not affect other session diagrams', () => {
      const { setDiagram, clearDiagram, getDiagram } = useDiagramStore.getState()
      const sessionId1 = 100
      const sessionId2 = 200

      const diagram1 = {
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }] as Node[],
        edges: [] as Edge[],
      }
      const diagram2 = {
        nodes: [{ id: '2', position: { x: 100, y: 100 }, data: {} }] as Node[],
        edges: [] as Edge[],
      }

      setDiagram(sessionId1, diagram1)
      setDiagram(sessionId2, diagram2)

      clearDiagram(sessionId1)

      expect(getDiagram(sessionId1)).toBeNull()
      expect(getDiagram(sessionId2)).toEqual(diagram2)
    })
  })
})
