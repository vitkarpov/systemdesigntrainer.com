import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils'
import { DiagramCanvas } from '../DiagramCanvas'
import { useDiagramStore } from '@/stores'
import type { Node, Edge } from '@xyflow/react'

// Mock ReactFlow components
vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: any) => {
    // Extract only serializable props for testing
    const testableProps = {
      defaultEdgeOptions: props.defaultEdgeOptions,
      onDrop: props.onDrop ? 'function' : undefined,
      onDragOver: props.onDragOver ? 'function' : undefined,
    }
    return (
      <div data-testid="react-flow" data-props={JSON.stringify(testableProps)}>
        {props.children}
      </div>
    )
  },
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
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
vi.mock('@/api/hooks.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hooks.gen')>();
  return {
    ...actual,
    useSessionsControllerGetDiagram: vi.fn(),
  };
})

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

  it('should show loading state while fetching diagram', () => {
    mockUseSessionsControllerGetDiagram.mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    renderWithProviders(
      <DiagramCanvas
        sessionId={sessionId}
        isReadOnly={false}
      />
    )

    expect(screen.getByText('Loading diagram...')).toBeInTheDocument()
    expect(screen.queryByTestId('react-flow')).not.toBeInTheDocument()
  })

  it('should render diagram canvas (available in all phases)', () => {
    renderWithProviders(
      <DiagramCanvas
        sessionId={sessionId}
        isReadOnly={true}
      />
    )

    expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    expect(screen.getByTestId('background')).toBeInTheDocument()
    expect(screen.getByTestId('controls')).toBeInTheDocument()
  })

  it('should show editing UI when editable', () => {
    renderWithProviders(
      <DiagramCanvas
        sessionId={sessionId}
        isReadOnly={false}
      />
    )

    expect(screen.getByTestId('component-palette')).toBeInTheDocument()
    expect(screen.getByTestId('save-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('minimap')).toBeInTheDocument()
  })

  it('should hide editing UI when read-only', () => {
    renderWithProviders(
      <DiagramCanvas
        sessionId={sessionId}
        isReadOnly={true}
      />
    )

    expect(screen.queryByTestId('component-palette')).not.toBeInTheDocument()
    expect(screen.queryByTestId('save-indicator')).not.toBeInTheDocument()
    expect(screen.queryByTestId('minimap')).not.toBeInTheDocument()
  })

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
      />
    )

    const diagram = useDiagramStore.getState().getDiagram(sessionId)
    expect(diagram?.nodes).toHaveLength(1)
    expect(diagram?.edges).toHaveLength(1)
  })

  it('should configure edge visibility and drag handlers correctly', () => {
    renderWithProviders(
      <DiagramCanvas
        sessionId={sessionId}
        isReadOnly={false}
      />
    )

    const reactFlow = screen.getByTestId('react-flow')
    const props = JSON.parse(reactFlow.getAttribute('data-props') || '{}')

    // Verify edge styling
    expect(props.defaultEdgeOptions.style.stroke).toBe('#333333')
    expect(props.defaultEdgeOptions.style.strokeWidth).toBe(2)

    // Drag handlers on parent, not ReactFlow (prevents past bug)
    expect(props.onDrop).toBeUndefined()
    expect(props.onDragOver).toBeUndefined()
  })
})
