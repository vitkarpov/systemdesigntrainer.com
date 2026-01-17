import type { Meta, StoryObj } from "@storybook/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./conversation";
import { Message, MessageContent, MessageAvatar } from "./message";
import {
  createMockConversation,
  MOCK_AVATAR_URLS,
  getMessageText,
} from "./__stories__/mock-data";

const meta: Meta<typeof Conversation> = {
  title: "AI Components/Layout/Conversation",
  component: Conversation,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Scrollable chat container with sticky-to-bottom behavior. Automatically scrolls to bottom when new messages arrive and provides a scroll button to jump to bottom when user has scrolled up.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Conversation>;

export const Default: Story = {
  render: () => {
    const messages = createMockConversation(6);
    return (
      <div className="h-[600px] border rounded-lg">
        <Conversation>
          <ConversationContent>
            {messages.map((msg, idx) => (
              <Message key={idx} from={msg.role as "user" | "assistant"}>
                <MessageAvatar
                  src={
                    msg.role === "user"
                      ? MOCK_AVATAR_URLS.user
                      : MOCK_AVATAR_URLS.assistant
                  }
                  name={msg.role === "user" ? "User" : "AI"}
                />
                <MessageContent>{getMessageText(msg)}</MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Default conversation with a few messages.",
      },
    },
  },
};

export const ManyMessages: Story = {
  render: () => {
    const messages = createMockConversation(20);
    return (
      <div className="h-[600px] border rounded-lg">
        <Conversation>
          <ConversationContent>
            {messages.map((msg, idx) => (
              <Message key={idx} from={msg.role as "user" | "assistant"}>
                <MessageAvatar
                  src={
                    msg.role === "user"
                      ? MOCK_AVATAR_URLS.user
                      : MOCK_AVATAR_URLS.assistant
                  }
                  name={msg.role === "user" ? "User" : "AI"}
                />
                <MessageContent>{getMessageText(msg)}</MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Conversation with many messages requiring scrolling. Scroll up to see the floating scroll-to-bottom button appear.",
      },
    },
  },
};

export const WithScrollButton: Story = {
  render: () => {
    const messages = createMockConversation(15);
    return (
      <div className="h-[500px] border rounded-lg">
        <Conversation>
          <ConversationContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg text-sm text-center">
                Scroll up to see the "Scroll to bottom" button appear
              </div>
              {messages.map((msg, idx) => (
                <Message key={idx} from={msg.role as "user" | "assistant"}>
                  <MessageAvatar
                    src={
                      msg.role === "user"
                        ? MOCK_AVATAR_URLS.user
                        : MOCK_AVATAR_URLS.assistant
                    }
                    name={msg.role === "user" ? "User" : "AI"}
                  />
                  <MessageContent>{getMessageText(msg)}</MessageContent>
                </Message>
              ))}
            </div>
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Demonstration of the scroll-to-bottom button. Scroll up to make it visible, click to return to bottom.",
      },
    },
  },
};

export const EmptyConversation: Story = {
  render: () => (
    <div className="h-[400px] border rounded-lg">
      <Conversation>
        <ConversationContent>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No messages yet. Start a conversation!
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Empty conversation state before any messages are sent.",
      },
    },
  },
};

export const WithLongMessages: Story = {
  render: () => {
    const messages = [
      {
        id: "1",
        role: "user" as const,
        parts: [
          {
            type: "text" as const,
            text: "Can you explain distributed systems architecture in detail?",
          },
        ],
        createdAt: new Date(),
      },
      {
        id: "2",
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: `Distributed systems architecture involves multiple interconnected components working together to achieve a common goal. Here are the key principles:

## Core Components

1. **Load Balancers**: Distribute incoming traffic across multiple servers
2. **Application Servers**: Handle business logic and process requests
3. **Databases**: Store and manage data with replication and sharding
4. **Cache Layers**: Improve performance by storing frequently accessed data
5. **Message Queues**: Enable asynchronous communication between services

## Key Characteristics

- **Scalability**: Ability to handle increasing load by adding resources
- **Reliability**: System continues to function despite failures
- **Availability**: System is accessible when needed
- **Performance**: System responds quickly to requests
- **Maintainability**: Easy to update and modify

## Common Patterns

- Microservices architecture for independent deployment
- Event-driven architecture for loose coupling
- CQRS for separating read and write operations
- Saga pattern for distributed transactions

Each pattern has specific use cases and trade-offs that must be considered based on your requirements.`,
          },
        ],
        createdAt: new Date(),
      },
    ];

    return (
      <div className="h-[600px] border rounded-lg">
        <Conversation>
          <ConversationContent>
            {messages.map((msg, idx) => (
              <Message key={idx} from={msg.role as "user" | "assistant"}>
                <MessageAvatar
                  src={
                    msg.role === "user"
                      ? MOCK_AVATAR_URLS.user
                      : MOCK_AVATAR_URLS.assistant
                  }
                  name={msg.role === "user" ? "User" : "AI"}
                />
                <MessageContent>{getMessageText(msg as any)}</MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Conversation with longer, more detailed messages including markdown.",
      },
    },
  },
};

export const InChatInterface: Story = {
  render: () => {
    const messages = createMockConversation(10);
    return (
      <div className="flex flex-col h-[700px] max-w-3xl mx-auto border rounded-lg bg-background">
        <div className="border-b p-4">
          <h2 className="font-semibold text-lg">AI Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Ask me anything about system design
          </p>
        </div>

        <Conversation className="flex-1">
          <ConversationContent>
            {messages.map((msg, idx) => (
              <Message key={idx} from={msg.role as "user" | "assistant"}>
                <MessageAvatar
                  src={
                    msg.role === "user"
                      ? MOCK_AVATAR_URLS.user
                      : MOCK_AVATAR_URLS.assistant
                  }
                  name={msg.role === "user" ? "User" : "AI"}
                />
                <MessageContent>{getMessageText(msg)}</MessageContent>
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              Send
            </button>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Conversation component integrated into a complete chat interface with header and input.",
      },
    },
    layout: "centered",
  },
};
