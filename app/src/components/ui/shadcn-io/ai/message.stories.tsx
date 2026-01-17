import type { Meta, StoryObj } from "@storybook/react";
import { Message, MessageContent, MessageAvatar } from "./message";
import { MOCK_AVATAR_URLS } from "./__stories__/mock-data";

const meta: Meta<typeof Message> = {
  title: "AI Components/Content Display/Message",
  component: Message,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Container for chat messages with support for user and assistant roles. Handles layout, spacing, and alignment based on message role.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    from: {
      control: "select",
      options: ["user", "assistant"],
      description: "Message role - determines layout and styling",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Message>;

export const UserMessage: Story = {
  render: (args) => (
    <Message {...args}>
      <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
      <MessageContent>
        How does distributed caching work in large-scale systems?
      </MessageContent>
    </Message>
  ),
  args: {
    from: "user",
  },
  parameters: {
    docs: {
      description: {
        story: "User message with avatar and content.",
      },
    },
  },
};

export const AssistantMessage: Story = {
  render: (args) => (
    <Message {...args}>
      <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
      <MessageContent>
        Distributed caching works by storing frequently accessed data across
        multiple nodes. This helps reduce database load and **significantly
        improves response times** for read-heavy workloads.
      </MessageContent>
    </Message>
  ),
  args: {
    from: "assistant",
  },
  parameters: {
    docs: {
      description: {
        story: "Assistant message with avatar and content.",
      },
    },
  },
};

export const WithoutAvatar: Story = {
  render: () => (
    <div className="space-y-4">
      <Message from="user">
        <MessageContent>User message without avatar</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageContent>Assistant message without avatar</MessageContent>
      </Message>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Messages can be displayed without avatars.",
      },
    },
  },
};

export const WithLongContent: Story = {
  render: () => (
    <div className="space-y-4">
      <Message from="user">
        <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
        <MessageContent>
          Can you provide a detailed explanation of how consistent hashing works
          in distributed systems, including the virtual nodes concept, how it
          helps with load balancing, and what happens when nodes are added or
          removed from the cluster?
        </MessageContent>
      </Message>
      <Message from="assistant">
        <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
        <MessageContent>
          Consistent hashing is a distributed hashing scheme that operates
          independently of the number of servers or objects in a distributed
          hash table. Here's how it works: First, we arrange all possible hash
          values in a circle (hash ring). Both data keys and server nodes are
          hashed to positions on this ring. Each key is stored on the first
          server found when moving clockwise from the key's position. Virtual
          nodes are multiple positions for each physical server on the ring,
          which helps distribute load more evenly. When a server is added or
          removed, only the keys between that server and the previous server on
          the ring need to be redistributed. This minimizes data movement and
          maintains system stability during topology changes.
        </MessageContent>
      </Message>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Messages with longer content demonstrating text wrapping.",
      },
    },
  },
};

export const Conversation: Story = {
  render: () => (
    <div className="space-y-4">
      <Message from="user">
        <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
        <MessageContent>What are microservices?</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
        <MessageContent>
          Microservices are an architectural approach where applications are
          built as a collection of small, independent services that communicate
          over APIs.
        </MessageContent>
      </Message>
      <Message from="user">
        <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
        <MessageContent>What are the main benefits?</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
        <MessageContent>
          Key benefits include independent deployment, technology flexibility,
          better scalability, and improved fault isolation.
        </MessageContent>
      </Message>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple messages forming a conversation.",
      },
    },
  },
};

export const MessageContentVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Message from="assistant">
        <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
        <MessageContent>Simple text message</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
        <MessageContent>Message with **bold** and *italic* text</MessageContent>
      </Message>
      <Message from="assistant">
        <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
        <MessageContent>
          <div>Message with custom content</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Additional information below
          </div>
        </MessageContent>
      </Message>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Different content variations within MessageContent.",
      },
    },
  },
};

export const ThemeVariations: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground mb-4">Light Theme</div>
        <div className="space-y-4 bg-background p-4 rounded-lg">
          <Message from="user">
            <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
            <MessageContent>User message in light theme</MessageContent>
          </Message>
          <Message from="assistant">
            <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
            <MessageContent>Assistant message in light theme</MessageContent>
          </Message>
        </div>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-4">Dark Theme</div>
        <div className="dark space-y-4 bg-background p-4 rounded-lg">
          <Message from="user">
            <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
            <MessageContent>User message in dark theme</MessageContent>
          </Message>
          <Message from="assistant">
            <MessageAvatar src={MOCK_AVATAR_URLS.assistant} name="AI" />
            <MessageContent>Assistant message in dark theme</MessageContent>
          </Message>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Messages displayed in both light and dark themes.",
      },
    },
  },
};
