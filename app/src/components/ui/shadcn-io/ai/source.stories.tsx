import type { Meta, StoryObj } from "@storybook/react";
import { Sources, SourcesTrigger, SourcesContent, Source } from "./source";

const meta: Meta<typeof Sources> = {
  title: "AI Components/Content Display/Source",
  component: Sources,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Collapsible component for displaying source citations and references. Shows a count of sources used and expands to reveal links to each source.",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Sources>;

export const Default: Story = {
  render: () => (
    <Sources>
      <SourcesTrigger count={3} />
      <SourcesContent>
        <Source
          href="https://example.com/article-1"
          title="Introduction to Distributed Systems"
        />
        <Source
          href="https://example.com/article-2"
          title="CAP Theorem Explained"
        />
        <Source
          href="https://example.com/article-3"
          title="Database Scaling Strategies"
        />
      </SourcesContent>
    </Sources>
  ),
  parameters: {
    docs: {
      description: {
        story: "Default sources component with 3 source links.",
      },
    },
  },
};

export const SingleSource: Story = {
  render: () => (
    <Sources>
      <SourcesTrigger count={1} />
      <SourcesContent>
        <Source
          href="https://example.com/article"
          title="System Design Patterns"
        />
      </SourcesContent>
    </Sources>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sources with a single reference.",
      },
    },
  },
};

export const ManySources: Story = {
  render: () => (
    <Sources>
      <SourcesTrigger count={7} />
      <SourcesContent>
        <Source
          href="https://example.com/1"
          title="Microservices Architecture"
        />
        <Source href="https://example.com/2" title="Event Sourcing" />
        <Source href="https://example.com/3" title="CQRS Pattern" />
        <Source href="https://example.com/4" title="API Gateway Design" />
        <Source href="https://example.com/5" title="Service Mesh" />
        <Source href="https://example.com/6" title="Circuit Breaker Pattern" />
        <Source
          href="https://example.com/7"
          title="Load Balancing Strategies"
        />
      </SourcesContent>
    </Sources>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sources with many references.",
      },
    },
  },
};

export const CustomTrigger: Story = {
  render: () => (
    <Sources>
      <SourcesTrigger count={3}>
        <span className="text-primary font-medium">View 3 references</span>
      </SourcesTrigger>
      <SourcesContent>
        <Source href="https://example.com/1" title="Article 1" />
        <Source href="https://example.com/2" title="Article 2" />
        <Source href="https://example.com/3" title="Article 3" />
      </SourcesContent>
    </Sources>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sources with custom trigger content.",
      },
    },
  },
};

export const InMessageContext: Story = {
  render: () => (
    <div className="max-w-2xl border rounded-lg p-4 bg-secondary space-y-3">
      <p className="text-sm">
        Distributed systems rely on several key principles including the CAP
        theorem, consistency models, and partition tolerance strategies.
      </p>
      <Sources>
        <SourcesTrigger count={3} />
        <SourcesContent>
          <Source
            href="https://example.com/cap-theorem"
            title="Understanding CAP Theorem"
          />
          <Source
            href="https://example.com/consistency"
            title="Consistency Models in Distributed Systems"
          />
          <Source
            href="https://example.com/partitioning"
            title="Network Partition Handling"
          />
        </SourcesContent>
      </Sources>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Sources displayed within a message context.",
      },
    },
  },
};
