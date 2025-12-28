import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils'
import { DiagramCanvas } from '../DiagramCanvas'
import { useDiagramStore } from '@/stores'
import type { Node, Edge } from '@xyflow/react'

// Mock ReactFlow components
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
}))

// Mock ComponentPalette
vi.mock('../ComponentPalette', () => ({
  ComponentPalette: () => <div data-testid="component-palette">Component Palette</div>,
}))

// Mock SaveIndicator
vi.mock('../SaveIndicator', () => ({
  SaveIndicator: ({ status }: { status: string }) => (
    <div data-testid="save-indicator">{status}</div>
  ),
}))

// Mock useDiagramAutoSave hook
vi.mock('@/hooks/useDiagramAutoSave', () => ({
  useDiagramAutoSave: () => ({
    saveStatus: 'saved',
  }),
}))

// Mock API hook
vi.mock('@/api/hooks.gen', () => ({
  useSessionsControllerGetDiagram: vi.fn(),
}))

import { useSessionsControllerGetDiagram } from '@/api/hooks.gen'
const mockUseSessionsControllerGetDiagram = useSessionsControllerGetDiagram as ReturnType<typeof vi.fn>

describe('DiagramCanvas', () => {
  const sessionId = 123

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset diagram store
    useDiagramStore.getState().clearDiagram(sessionId)

    // Default mock: no diagram data
    mockUseSessionsControllerGetDiagram.mockReturnValue({
      data: { data: { nodes: null, edges: null } },
      isLoading: false,
    })
  })

  describe('Empty State', () => {
    it('should show empty state when diagram is locked, empty, and session is in progress', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="in_progress"
        />
      )

      // Empty state should be visible
      expect(screen.getByText('Diagram Available in High-Level Design Phase')).toBeInTheDocument()
      expect(
        screen.getByText(/The architecture diagram will unlock when you advance to the High-Level Design phase/)
      ).toBeInTheDocument()

      // Lock icon should be present
      const lockIcon = screen.getByText('Diagram Available in High-Level Design Phase')
        .closest('div')
        ?.parentElement?.querySelector('svg')
      expect(lockIcon).toBeInTheDocument()
    })

    it('should NOT show empty state when diagram is editable (not read-only)', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      // Empty state should not be visible
      expect(screen.queryByText('Diagram Available in High-Level Design Phase')).not.toBeInTheDocument()

      // Component palette should be visible instead
      expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    })

    it('should NOT show empty state when diagram has nodes', () => {
      // Add nodes to the diagram store
      const nodes: Node[] = [
        {
          id: 'node-1',
          type: 'database',
          position: { x: 100, y: 100 },
          data: { label: 'Database' },
        },
      ]
      useDiagramStore.getState().setNodes(sessionId, nodes)

      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="in_progress"
        />
      )

      // Empty state should not be visible
      expect(screen.queryByText('Diagram Available in High-Level Design Phase')).not.toBeInTheDocument()
    })

    it('should NOT show empty state when session is completed', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="completed"
        />
      )

      // Empty state should not be visible for completed sessions
      expect(screen.queryByText('Diagram Available in High-Level Design Phase')).not.toBeInTheDocument()
    })

    it('should show empty state with correct styling and structure', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="in_progress"
        />
      )

      // Check for the overlay container
      const heading = screen.getByText('Diagram Available in High-Level Design Phase')
      const overlay = heading.closest('div')?.parentElement?.parentElement

      expect(overlay).toHaveClass('absolute', 'inset-0', 'backdrop-blur-sm')
      expect(overlay).toHaveClass('pointer-events-none') // Should not block interaction
    })
  })

  describe('Loading State', () => {
    it('should show loading state while fetching diagram', () => {
      mockUseSessionsControllerGetDiagram.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      expect(screen.getByText('Loading diagram...')).toBeInTheDocument()
      expect(screen.queryByTestId('react-flow')).not.toBeInTheDocument()
    })
  })

  describe('Read-only vs Editable Mode', () => {
    it('should show component palette when editable', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    })

    it('should NOT show component palette when read-only', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="in_progress"
        />
      )

      expect(screen.queryByTestId('component-palette')).not.toBeInTheDocument()
    })

    it('should show save indicator when editable', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      expect(screen.getByTestId('save-indicator')).toBeInTheDocument()
    })

    it('should NOT show save indicator when read-only', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="in_progress"
        />
      )

      expect(screen.queryByTestId('save-indicator')).not.toBeInTheDocument()
    })

    it('should show minimap when editable', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      expect(screen.getByTestId('minimap')).toBeInTheDocument()
    })

    it('should NOT show minimap when read-only', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          sessionStatus="in_progress"
        />
      )

      expect(screen.queryByTestId('minimap')).not.toBeInTheDocument()
    })
  })

  describe('Diagram Initialization', () => {
    it('should initialize diagram from backend data', () => {
      const mockNodes: Node[] = [
        {
          id: 'node-1',
          type: 'database',
          position: { x: 100, y: 100 },
          data: { label: 'Database' },
        },
      ]
      const mockEdges: Edge[] = [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
        },
      ]

      mockUseSessionsControllerGetDiagram.mockReturnValue({
        data: {
          data: {
            nodes: mockNodes,
            edges: mockEdges,
          },
        },
        isLoading: false,
      })

      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      // Verify the diagram store was updated
      const diagram = useDiagramStore.getState().getDiagram(sessionId)
      expect(diagram?.nodes).toHaveLength(1)
      expect(diagram?.edges).toHaveLength(1)
    })

    it('should handle empty diagram data gracefully', () => {
      mockUseSessionsControllerGetDiagram.mockReturnValue({
        data: { data: { nodes: null, edges: null } },
        isLoading: false,
      })

      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={false}
          sessionStatus="in_progress"
        />
      )

      // Should render without crashing
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })

  describe('Default Props', () => {
    it('should use default sessionStatus of "in_progress" when not provided', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          isReadOnly={true}
          // sessionStatus not provided
        />
      )

      // Empty state should show (since default is 'in_progress')
      expect(screen.getByText('Diagram Available in High-Level Design Phase')).toBeInTheDocument()
    })

    it('should use default isReadOnly of false when not provided', () => {
      renderWithProviders(
        <DiagramCanvas
          sessionId={sessionId}
          // isReadOnly not provided
          sessionStatus="in_progress"
        />
      )

      // Component palette should show (since default is not read-only)
      expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    })
  })
})
