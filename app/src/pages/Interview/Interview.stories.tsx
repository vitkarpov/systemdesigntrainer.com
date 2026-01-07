import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Interview from './Interview';
import type { MessageResponseDto, SessionResponseDtoStatus } from '@/api/hooks.gen';
import { vi } from 'vitest';

// Mock API hooks
vi.mock('@/api/hooks.gen', () => ({
  useSessionsControllerGetSession: vi.fn(),
  useSessionsControllerGetTranscript: vi.fn(),
  useSessionsControllerGenerateFeedback: vi.fn(),
  useSessionsControllerGetDiagram: vi.fn(),
  useSessionsControllerSaveDiagram: vi.fn(),
}));

// Mock custom hooks
vi.mock('@/hooks/useConversationStream', () => ({
  useConversationStream: () => ({
    sendMessage: vi.fn(),
    cancel: vi.fn(),
  }),
}));

// Mock diagram auto-save hook
vi.mock('@/hooks/useDiagramAutoSave', () => ({
  useDiagramAutoSave: () => ({
    saveStatus: 'saved' as const,
  }),
}));

// Mock stores
vi.mock('@/stores', () => ({
  useInterviewStore: (selector: any) => {
    const state = {
      inputValue: '',
      optimisticMessage: null,
      setInputValue: vi.fn(),
      clearInput: vi.fn(),
      setOptimisticMessage: vi.fn(),
      reset: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useDiagramStore: (selector: any) => {
    const state = {
      getDiagram: () => ({ nodes: [], edges: [] }),
      setDiagram: vi.fn(),
      clearDiagram: vi.fn(),
      updateNodes: vi.fn(),
      updateEdges: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  useStreamingStore: (selector: any) => {
    const state = {
      streams: {},
      setStreamingText: vi.fn(),
      setIsStreaming: vi.fn(),
      clearStream: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

// Mock ReactFlow
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => (
    <div data-testid="react-flow" style={{ width: '100%', height: '100%' }}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="background" />,
  Controls: () => <div data-testid="controls" />,
  MiniMap: () => <div data-testid="minimap" />,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
  useReactFlow: () => ({
    getNodes: () => [],
    getEdges: () => [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    addNodes: vi.fn(),
    addEdges: vi.fn(),
    screenToFlowPosition: ({ x, y }: any) => ({ x, y }),
  }),
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
}));

// Create sample messages
const createMockMessages = (): MessageResponseDto[] => [
  {
    id: 1,
    role: 'interviewer',
    text: "Hello! Welcome to today's system design interview. We'll be designing a distributed caching system. Let's start by understanding the requirements. What are your initial thoughts on the scale we should target?",
    secondsElapsed: 5,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 2,
    role: 'candidate',
    text: "Thanks for having me! For a distributed caching system, I'd like to understand the expected throughput first. Are we looking at thousands, millions, or billions of requests per day? This will help determine the architecture.",
    secondsElapsed: 45,
    createdAt: '2024-01-01T10:00:40Z',
    updatedAt: '2024-01-01T10:00:40Z',
  },
  {
    id: 3,
    role: 'interviewer',
    text: "Great question! Let's target **10 million requests per day** with peaks that could be 5x the average. We also need to consider:\n\n- Average response time under 50ms\n- 99.9% availability\n- Global distribution across multiple regions\n\nHow would you approach the high-level design?",
    secondsElapsed: 60,
    createdAt: '2024-01-01T10:01:00Z',
    updatedAt: '2024-01-01T10:01:00Z',
  },
  {
    id: 4,
    role: 'candidate',
    text: "I'd start with a **multi-tier architecture**:\n\n1. **CDN Layer**: For static content caching\n2. **Application Cache**: Redis/Memcached cluster\n3. **Database Layer**: Partitioned data stores\n\nFor the cache layer specifically, I'm thinking about using **consistent hashing** for distribution. Should I dive into the cache eviction policies?",
    secondsElapsed: 120,
    createdAt: '2024-01-01T10:02:00Z',
    updatedAt: '2024-01-01T10:02:00Z',
  },
  {
    id: 5,
    role: 'interviewer',
    text: 'Yes, please elaborate on cache eviction and also explain how you would handle **cache invalidation** in a distributed environment. This is a critical aspect.',
    secondsElapsed: 135,
    createdAt: '2024-01-01T10:02:15Z',
    updatedAt: '2024-01-01T10:02:15Z',
  },
];

const createMockSession = (status: SessionResponseDtoStatus = 'in_progress') => ({
  data: {
    session: {
      id: 123,
      status,
      interviewCase: {
        id: 1,
        title: 'Design a Distributed Caching System',
        description: 'Design a scalable distributed caching solution',
        category: 'system-design',
      },
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:02:15Z',
    },
    elapsedSeconds: 180,
    phaseElapsedSeconds: 120,
    phaseMetadata: {
      currentPhase: 'Design Discussion',
      phases: ['Requirements', 'Design Discussion', 'Deep Dive', 'Wrap Up'],
    },
  },
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const meta: Meta<typeof Interview> = {
  title: 'Pages/Interview',
  component: Interview,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, context) => {
      const queryClient = createQueryClient();

      // Access mocked functions
      const {
        useSessionsControllerGetSession,
        useSessionsControllerGetTranscript,
        useSessionsControllerGenerateFeedback,
        useSessionsControllerGetDiagram,
      } = require('@/api/hooks.gen');

      // Configure mocks based on story args
      const { sessionStatus = 'in_progress', hasMessages = true } = context.args as any;

      useSessionsControllerGetSession.mockReturnValue({
        data: createMockSession(sessionStatus),
        isLoading: false,
      });

      useSessionsControllerGetTranscript.mockReturnValue({
        data: {
          data: {
            messages: hasMessages ? createMockMessages() : [],
          },
        },
        isLoading: false,
      });

      useSessionsControllerGenerateFeedback.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      });

      useSessionsControllerGetDiagram.mockReturnValue({
        data: {
          data: {
            nodes: [],
            edges: [],
          },
        },
        isLoading: false,
      });

      return (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/interview/123']}>
            <Routes>
              <Route path="/interview/:sessionId" element={<Story />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof Interview>;

export const InProgress: Story = {
  args: {
    sessionStatus: 'in_progress',
    hasMessages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interview in progress with existing conversation history.',
      },
    },
  },
};

export const JustStarted: Story = {
  args: {
    sessionStatus: 'in_progress',
    hasMessages: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interview just started with no messages yet.',
      },
    },
  },
};

export const Completed: Story = {
  args: {
    sessionStatus: 'completed',
    hasMessages: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interview completed - input is disabled and diagram is read-only.',
      },
    },
  },
};

export const WithStreaming: Story = {
  args: {
    sessionStatus: 'in_progress',
    hasMessages: true,
  },
  decorators: [
    (Story) => {
      const { useStreamingStore } = require('@/stores');

      // Override streaming store to show streaming state
      useStreamingStore.mockImplementation((selector: any) => {
        const state = {
          streams: {
            123: {
              streamingText: 'For cache invalidation, I recommend using a **pub/sub pattern** with Redis. When data is updated in the primary database, we publish invalidation events...',
              isStreaming: true,
            },
          },
          setStreamingText: vi.fn(),
          setIsStreaming: vi.fn(),
          clearStream: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Interview with an active streaming response from the interviewer.',
      },
    },
  },
};

export const WithOptimisticMessage: Story = {
  args: {
    sessionStatus: 'in_progress',
    hasMessages: true,
  },
  decorators: [
    (Story) => {
      const { useInterviewStore } = require('@/stores');

      // Override interview store to show optimistic message
      useInterviewStore.mockImplementation((selector: any) => {
        const state = {
          inputValue: '',
          optimisticMessage: {
            text: "I would use a combination of TTL-based expiration and LRU eviction. For the pub/sub invalidation, we'd need to consider network partitions and ensure eventual consistency.",
            timestamp: Date.now(),
          },
          setInputValue: vi.fn(),
          clearInput: vi.fn(),
          setOptimisticMessage: vi.fn(),
          reset: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      return <Story />;
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Shows optimistic UI update when candidate sends a message.',
      },
    },
  },
};
