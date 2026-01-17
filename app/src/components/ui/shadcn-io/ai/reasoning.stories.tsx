import type { Meta, StoryObj } from "@storybook/react";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "./reasoning";

const meta: Meta<typeof Reasoning> = {
  title: "AI Components/Advanced Features/Reasoning",
  component: Reasoning,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays AI thinking/reasoning process with streaming support. Auto-opens when streaming starts and shows duration. Supports markdown content for detailed reasoning steps.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    isStreaming: {
      control: "boolean",
      description: "Whether content is currently streaming",
    },
    defaultOpen: {
      control: "boolean",
      description: "Whether initially expanded",
    },
    duration: {
      control: "number",
      description: "Thinking duration in seconds",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Reasoning>;

export const Default: Story = {
  render: (args) => (
    <Reasoning {...args}>
      <ReasoningTrigger />
      <ReasoningContent>
        To solve this problem, I need to consider the trade-offs between
        consistency and availability. Given the requirements for high
        availability, eventual consistency would be more appropriate here.
      </ReasoningContent>
    </Reasoning>
  ),
  args: {
    isStreaming: false,
    defaultOpen: false,
    duration: 3,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Default reasoning component showing completed thinking (3 seconds).",
      },
    },
  },
};

export const Streaming: Story = {
  render: (args) => (
    <Reasoning {...args}>
      <ReasoningTrigger />
      <ReasoningContent>
        Let me think about this step by step: 1. First, I need to understand the
        scale requirements 2. Then consider the data consistency model 3.
        Finally, design the architecture with appropriate trade-offs
      </ReasoningContent>
    </Reasoning>
  ),
  args: {
    isStreaming: true,
    defaultOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Reasoning in streaming state, showing "Thinking..." with auto-opened content.',
      },
    },
  },
};

export const LongReasoning: Story = {
  render: (args) => (
    <Reasoning {...args}>
      <ReasoningTrigger />
      <ReasoningContent>
        {`# Analysis Process

## Step 1: Requirements Analysis
The system needs to handle **high traffic** with **low latency**. This suggests we need:
- Distributed architecture
- Caching layer
- Load balancing

## Step 2: Data Model Consideration
Given the access patterns, a **NoSQL** database would be more suitable because:
- Flexible schema
- Better horizontal scalability
- Lower latency for simple queries

## Step 3: Architecture Design
Based on the analysis, here's the recommended approach:

1. **API Gateway** - Single entry point
2. **Service Layer** - Microservices architecture
3. **Cache Layer** - Redis for hot data
4. **Database Layer** - DynamoDB for persistence
5. **CDN** - CloudFront for static assets

This design provides good scalability while maintaining acceptable consistency guarantees.`}
      </ReasoningContent>
    </Reasoning>
  ),
  args: {
    isStreaming: false,
    defaultOpen: true,
    duration: 12,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Reasoning with detailed markdown content showing structured thinking process.",
      },
    },
  },
};

export const ShortThinking: Story = {
  render: (args) => (
    <Reasoning {...args}>
      <ReasoningTrigger />
      <ReasoningContent>
        This is a straightforward optimization problem. Using an index on the
        frequently queried column would significantly improve performance.
      </ReasoningContent>
    </Reasoning>
  ),
  args: {
    isStreaming: false,
    defaultOpen: false,
    duration: 1,
  },
  parameters: {
    docs: {
      description: {
        story: "Quick reasoning that took only 1 second.",
      },
    },
  },
};

export const InitiallyOpen: Story = {
  render: (args) => (
    <Reasoning {...args}>
      <ReasoningTrigger />
      <ReasoningContent>
        {`Breaking down the problem:
1. Identify the bottleneck (database queries)
2. Implement caching strategy
3. Add read replicas for scalability
4. Monitor query performance`}
      </ReasoningContent>
    </Reasoning>
  ),
  args: {
    isStreaming: false,
    defaultOpen: true,
    duration: 5,
  },
  parameters: {
    docs: {
      description: {
        story: "Reasoning component that starts expanded.",
      },
    },
  },
};

export const InMessageContext: Story = {
  render: () => (
    <div className="max-w-2xl border rounded-lg p-4 bg-secondary space-y-3">
      <Reasoning isStreaming={false} defaultOpen={false} duration={8}>
        <ReasoningTrigger />
        <ReasoningContent>
          {`I analyzed the problem from multiple angles:

**Scalability**: The current architecture can handle 10x growth by adding horizontal scaling with load balancers and database sharding.

**Reliability**: Implementing circuit breakers and retry logic will improve fault tolerance.

**Performance**: Adding a caching layer (Redis) will reduce database load by 70-80%.

Based on this analysis, I recommend starting with the caching layer as it provides the biggest immediate impact.`}
        </ReasoningContent>
      </Reasoning>

      <p className="text-sm">
        To scale your system, I recommend implementing a distributed caching
        layer first. This will provide immediate performance improvements while
        you work on other optimizations.
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Reasoning displayed within a message context, showing how AI thought through the problem.",
      },
    },
  },
};
