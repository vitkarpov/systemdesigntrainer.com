import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { http, HttpResponse, delay } from 'msw';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Interview from './Interview';
import type { GetSessionResponseDtoData, MessageResponseDto, SessionResponseDtoStatus } from '@/api/hooks.gen';
import { AuthProvider } from '@/contexts/AuthContext';

// Predefined interviewer responses for random selection
const interviewerResponses = [
  "That's an interesting approach! Can you elaborate on how you would handle **edge cases** like network partitions or node failures?",
  "Good point. What about **scalability** - how would this design handle **10x growth** in traffic?",
  "I see. Let's dive deeper into the **data consistency** model. How would you ensure **strong consistency** vs **eventual consistency** trade-offs?",
  "Makes sense. Can you walk me through the **read and write paths** in your system? What are the **latency characteristics**?",
  "Excellent! Now let's talk about **monitoring and observability**. What **metrics** would you track and why?",
  "That's a solid foundation. How would you handle **cache stampede** scenarios when many requests hit the same cold key?",
  "Good thinking. What about **data replication** across regions? How would you handle **cross-region failover**?",
  "I like where you're going with this. Can you discuss the **CAP theorem** trade-offs in your design?",
  "Interesting! How would you implement **rate limiting** to prevent abuse and ensure fair usage?",
  "That makes sense. Let's explore **security** - how would you protect against **unauthorized access** and **data breaches**?",
];

// Mock messages with lorem ipsum style interview conversation
const mockMessages: MessageResponseDto[] = [
  {
    id: 1,
    role: 'interviewer',
    text: "Hello! Welcome to today's system design interview. We'll be designing a distributed caching system. Let's start by understanding the requirements. What are your initial thoughts on the scale we should target?",
    secondsElapsed: 5,
    createdAt: '2024-01-01T10:00:00Z',
    sessionId: 123,
    phase: 'requirements',
  },
  {
    id: 2,
    role: 'candidate',
    text: "Thanks for having me! For a distributed caching system, I'd like to understand the expected throughput first. Are we looking at thousands, millions, or billions of requests per day? This will help determine the architecture.",
    secondsElapsed: 45,
    createdAt: '2024-01-01T10:00:40Z',
    sessionId: 123,
    phase: 'requirements',
  },
  {
    id: 3,
    role: 'interviewer',
    text: "Great question! Let's target **10 million requests per day** with peaks that could be 5x the average. We also need to consider:\n\n- Average response time under 50ms\n- 99.9% availability\n- Global distribution across multiple regions\n\nHow would you approach the high-level design?",
    secondsElapsed: 60,
    createdAt: '2024-01-01T10:01:00Z',
    sessionId: 123,
    phase: 'requirements',
  },
  {
    id: 4,
    role: 'candidate',
    text: "I'd start with a **multi-tier architecture**:\n\n1. **CDN Layer**: For static content caching\n2. **Application Cache**: Redis/Memcached cluster\n3. **Database Layer**: Partitioned data stores\n\nFor the cache layer specifically, I'm thinking about using **consistent hashing** for distribution. Should I dive into the cache eviction policies?",
    secondsElapsed: 120,
    createdAt: '2024-01-01T10:02:00Z',
    sessionId: 123,
    phase: 'requirements',
  },
  {
    id: 5,
    role: 'interviewer',
    text: 'Yes, please elaborate on cache eviction and also explain how you would handle **cache invalidation** in a distributed environment. This is a critical aspect.',
    secondsElapsed: 135,
    createdAt: '2024-01-01T10:02:15Z',
    sessionId: 123,
    phase: 'requirements',
  },
];

// Mock user data
const mockUser = {
  id: 1,
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  interviewsRemaining: 5,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Helper to create SSE stream response
function createSSEStream(candidateText: string, interviewerText: string, delayMs: number = 50) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Get current elapsed time (approximate)
      const baseTime = currentMessages.length > 0
        ? currentMessages[currentMessages.length - 1].secondsElapsed
        : 0;

      // Add candidate message to state
      const candidateMessage: MessageResponseDto = {
        id: messageIdCounter++,
        role: 'candidate',
        text: candidateText,
        secondsElapsed: baseTime + 5,
        createdAt: new Date().toISOString(),
        sessionId: 123,
        phase: 'requirements',
      };
      currentMessages.push(candidateMessage);

      // Send start event
      const startEvent = `event: start\ndata: ${JSON.stringify({ candidateMessageId: candidateMessage.id })}\n\n`;
      controller.enqueue(encoder.encode(startEvent));

      // Wait a bit before starting to stream
      await new Promise(resolve => setTimeout(resolve, 300));

      // Stream text in chunks (word by word)
      const words = interviewerText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = (i === 0 ? '' : ' ') + words[i];
        const deltaEvent = `event: delta\ndata: ${JSON.stringify({ text: chunk })}\n\n`;
        controller.enqueue(encoder.encode(deltaEvent));

        // Add delay between chunks for realistic streaming
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // Add interviewer message to state
      const interviewerMessage: MessageResponseDto = {
        id: messageIdCounter++,
        role: 'interviewer',
        text: interviewerText,
        secondsElapsed: baseTime + 15,
        createdAt: new Date().toISOString(),
        sessionId: 123,
        phase: 'requirements',
      };
      currentMessages.push(interviewerMessage);

      // Send complete event
      const completeEvent = `event: complete\ndata: ${JSON.stringify({ success: true })}\n\n`;
      controller.enqueue(encoder.encode(completeEvent));

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Create mock session data
const createMockSession = (status: SessionResponseDtoStatus = 'in_progress'): { data: GetSessionResponseDtoData } => ({
  data: {
    session: {
      id: 123,
      status,
      interviewCase: {
        id: 1,
        title: 'Design a Distributed Caching System',
        description: 'Design a scalable distributed caching solution',
        difficulty: 'medium',
      },
      userId: 1,
      caseId: 1,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      currentPhase: 'requirements',
      phaseStartedAt: new Date().toISOString(),
      companyStyle: 'faang',
      level: 'mid',
    },
    elapsedSeconds: 180,
    phaseElapsedSeconds: 120,
    phaseMetadata: {
      name: 'Design Discussion',
      description: 'Design the system architecture',
      order: 2,
      recommendedMinutes: 10,
    },
    progress: 0.5,
  },
});

// Shared state for messages across handlers (simulates backend state)
let currentMessages: MessageResponseDto[] = [...mockMessages];
let messageIdCounter = 100;

// Story wrapper with QueryClient and AuthProvider
function InterviewStoryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  // Reset messages when component mounts
  React.useEffect(() => {
    currentMessages = [...mockMessages];
    messageIdCounter = 100;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/interview/123']}>
          <Routes>
            <Route path="/interview/:sessionId" element={<Interview />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const meta: Meta<typeof InterviewStoryWrapper> = {
  title: 'Pages/Interview',
  component: InterviewStoryWrapper,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof InterviewStoryWrapper>;

export const InProgress: Story = {
  play: async () => {
    // Reset to initial mock messages for this story
    currentMessages = [...mockMessages];
    messageIdCounter = 100;
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/auth/user', () => {
          return HttpResponse.json(mockUser);
        }),
        http.get('*/sessions/:id', () => {
          return HttpResponse.json(createMockSession('in_progress'));
        }),
        http.get('*/sessions/:id/transcript', () => {
          return HttpResponse.json({
            data: {
              messages: currentMessages,
            },
          });
        }),
        http.get('*/sessions/:id/diagram', () => {
          return HttpResponse.json({
            data: {
              nodes: [],
              edges: [],
            },
          });
        }),
        http.get('*/sessions/:id/conversation', ({ request }) => {
          // Extract candidate message from cookies
          const cookies = request.headers.get('cookie') || '';
          const textMatch = cookies.match(/text=([^;]+)/);
          const candidateText = textMatch ? decodeURIComponent(textMatch[1]) : 'Hello';

          // Pick a random response from the list
          const randomResponse = interviewerResponses[Math.floor(Math.random() * interviewerResponses.length)];
          return createSSEStream(candidateText, randomResponse);
        }),
        http.post('*/sessions/:id/feedback', () => {
          return HttpResponse.json({ success: true });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Interview in progress with existing conversation history showing markdown rendering. Try sending a message - the interviewer will respond with a random question from the predefined list!',
      },
    },
  },
};

export const Completed: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/auth/user', () => {
          return HttpResponse.json(mockUser);
        }),
        http.get('*/sessions/:id', () => {
          return HttpResponse.json(createMockSession('completed'));
        }),
        http.get('*/sessions/:id/transcript', () => {
          return HttpResponse.json({
            data: {
              messages: currentMessages,
            },
          });
        }),
        http.get('*/sessions/:id/diagram', () => {
          return HttpResponse.json({
            data: {
              nodes: [],
              edges: [],
            },
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Interview completed - input is disabled and diagram is read-only.',
      },
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('*/auth/user', () => {
          return HttpResponse.json(mockUser);
        }),
        http.get('*/sessions/:id', async () => {
          await delay('infinite');
          return HttpResponse.json(createMockSession('in_progress'));
        }),
        http.get('*/sessions/:id/transcript', async () => {
          await delay('infinite');
          return HttpResponse.json({
            data: {
              messages: [],
            },
          });
        }),
        http.get('*/sessions/:id/diagram', async () => {
          await delay('infinite');
          return HttpResponse.json({
            data: {
              nodes: [],
              edges: [],
            },
          });
        }),
      ],
    },
    docs: {
      description: {
        story: 'Loading state while fetching interview data.',
      },
    },
  },
};
