import type { UIMessage, ChatStatus, ToolUIPart } from "ai";

/**
 * Generate a random ID for mock data
 */
function generateId(): string {
  return "msg-" + Math.random().toString(36).substring(2, 11);
}

/**
 * Extract text content from a UIMessage
 */
export function getMessageText(message: UIMessage): string {
  if (!message.parts) {
    return "";
  }
  const textParts = message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text);
  return textParts.join("");
}

/**
 * Create a mock UIMessage with optional overrides
 */
export function createMockUIMessage(overrides?: Partial<UIMessage>): UIMessage {
  const id = generateId();
  return {
    id,
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "This is a mock AI response with **bold text** and `code`.",
      },
    ],
    createdAt: new Date(),
    ...overrides,
  } as UIMessage;
}

/**
 * Create a mock conversation with alternating user/assistant messages
 */
export function createMockConversation(count: number = 5): UIMessage[] {
  const roles: Array<"user" | "assistant"> = ["user", "assistant"];
  const userMessages = [
    "How does distributed caching work?",
    "What about consistency models?",
    "Can you explain CAP theorem?",
    "How would you handle cache invalidation?",
    "What are some best practices for rate limiting?",
    "Tell me about load balancing strategies",
    "How do you ensure data replication works correctly?",
  ];

  const assistantMessages = [
    "Distributed caching works by storing frequently accessed data across multiple nodes. This helps reduce database load and improves response times.",
    "Consistency models define how data updates are propagated across the system. The main trade-off is between **strong consistency** and **eventual consistency**.",
    "The CAP theorem states that a distributed system can only guarantee two out of three properties: **Consistency**, **Availability**, and **Partition tolerance**.",
    "Cache invalidation can be handled using several strategies:\n\n1. Time-based expiration (TTL)\n2. Event-based invalidation\n3. Write-through caching\n\nEach has its own trade-offs.",
    "Rate limiting best practices include:\n\n- Use token bucket or leaky bucket algorithms\n- Implement per-user and per-IP limits\n- Return clear error messages with retry information\n- Consider distributed rate limiting for scale",
    "Common load balancing strategies include:\n\n- **Round Robin**: Distributes requests evenly\n- **Least Connections**: Routes to server with fewest active connections\n- **Weighted**: Assigns different capacities to servers\n- **IP Hash**: Ensures same client goes to same server",
    "Data replication requires:\n\n1. **Replication strategy** (master-slave, multi-master)\n2. **Conflict resolution** for concurrent writes\n3. **Monitoring** to detect replication lag\n4. **Failover mechanisms** for high availability",
  ];

  return Array.from({ length: count }, (_, i) => {
    const role = roles[i % 2];
    const messageArray = role === "user" ? userMessages : assistantMessages;
    const messageIndex = Math.floor(i / 2) % messageArray.length;

    return createMockUIMessage({
      role,
      parts: [
        {
          type: "text",
          text: messageArray[messageIndex],
        },
      ],
    });
  });
}

/**
 * Create a mock ToolUIPart for Tool component stories
 */
export function createMockToolInvocation(
  state: ToolUIPart["state"] = "output-available",
  type: string = "tool-search_database",
): ToolUIPart {
  // Remove "tool-" prefix for lookup
  const typeKey = type.startsWith("tool-") ? type.slice(5) : type;

  const mockInputs: Record<string, unknown> = {
    search_database: { query: "system design patterns", limit: 10 },
    analyze_code: { language: "typescript", code: "function hello() {}" },
    fetch_api: { endpoint: "/api/users", method: "GET" },
    process_image: {
      url: "https://example.com/image.png",
      operations: ["resize", "compress"],
    },
  };

  const mockOutputs: Record<string, unknown> = {
    search_database: {
      results: [
        { id: 1, title: "Microservices Architecture", relevance: 0.95 },
        { id: 2, title: "Event-Driven Design", relevance: 0.89 },
        { id: 3, title: "CQRS Pattern", relevance: 0.82 },
      ],
      count: 3,
      executionTime: "145ms",
    },
    analyze_code: {
      complexity: "low",
      issues: [],
      suggestions: ["Consider adding return type annotation"],
    },
    fetch_api: {
      status: 200,
      data: { users: [{ id: 1, name: "John Doe" }] },
      headers: { "content-type": "application/json" },
    },
    process_image: {
      outputUrl: "https://example.com/processed-image.png",
      dimensions: { width: 800, height: 600 },
      sizeReduction: "45%",
    },
  };

  // Ensure type has "tool-" prefix
  const toolType = type.startsWith("tool-") ? type : `tool-${type}`;

  return {
    type: toolType as `tool-${string}`,
    state,
    input: mockInputs[typeKey] || { param: "value" },
    output: state === "output-available" ? mockOutputs[typeKey] : undefined,
    errorText:
      state === "output-error"
        ? "Connection timeout: Unable to reach the service after 30s"
        : undefined,
  } as ToolUIPart;
}

/**
 * Create mock branches for Branch component
 */
export function createMockBranches(branchCount: number = 3): UIMessage[][] {
  return Array.from({ length: branchCount }, (_, branchIndex) => {
    const messageCount = Math.floor(Math.random() * 3) + 2; // 2-4 messages per branch
    const messages = createMockConversation(messageCount);

    // Add branch-specific variation to the last message
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && lastMessage.parts) {
        const textPart = lastMessage.parts.find((part) => part.type === "text");
        if (textPart && textPart.type === "text") {
          textPart.text = `${textPart.text}\n\n*This is branch ${branchIndex + 1} with a different response.*`;
        }
      }
    }

    return messages;
  });
}

/**
 * Code samples for different programming languages
 */
export const MOCK_CODE_SAMPLES = {
  typescript: `function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

interface Item {
  id: string;
  name: string;
  price: number;
}`,

  javascript: `function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Example usage
const items = [
  { id: '1', name: 'Widget', price: 10.99 },
  { id: '2', name: 'Gadget', price: 24.99 }
];
console.log(calculateTotal(items));`,

  python: `def calculate_total(items: list[dict]) -> float:
    """Calculate the total price of items."""
    return sum(item['price'] for item in items)

# Example usage
items = [
    {'id': '1', 'name': 'Widget', 'price': 10.99},
    {'id': '2', 'name': 'Gadget', 'price': 24.99}
]
print(calculate_total(items))`,

  json: `{
  "name": "example-project",
  "version": "1.0.0",
  "description": "A sample project configuration",
  "dependencies": {
    "react": "^18.2.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "vite": "^4.3.0",
    "@types/react": "^18.2.0"
  }
}`,

  bash: `#!/bin/bash

# Deploy script for production
echo "Starting deployment..."

# Build the application
npm run build

# Run tests
npm test

# Deploy to server
rsync -avz dist/ user@server:/var/www/app/

echo "Deployment complete!"`,

  css: `.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  max-width: 400px;
}`,

  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Example Page</title>
</head>
<body>
  <div class="container">
    <h1>Welcome</h1>
    <p>This is an example HTML page.</p>
  </div>
</body>
</html>`,
};

/**
 * Markdown samples for Response component
 */
export const MOCK_MARKDOWN_SAMPLES = {
  simple:
    "This is **bold** text and this is *italic* text. Here is `inline code`.",

  complex: `# System Design Principles

## Key Concepts

When designing distributed systems, consider these principles:

1. **Scalability** - Handle growth in users and data
2. **Reliability** - System continues to work correctly
3. **Maintainability** - Easy to operate and modify

### Code Example

Here's a simple load balancer:

\`\`\`typescript
class LoadBalancer {
  private servers: Server[];
  private currentIndex: number = 0;

  roundRobin(): Server {
    const server = this.servers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.servers.length;
    return server;
  }
}
\`\`\`

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Monolith | Simple, Easy to deploy | Hard to scale |
| Microservices | Scalable, Flexible | Complex, Network overhead |

> "Premature optimization is the root of all evil" - Donald Knuth

For more information, see [this article](https://example.com/system-design).`,

  withMath: `# Mathematical Concepts

The Pythagorean theorem can be expressed as:

$$a^2 + b^2 = c^2$$

For inline math, we can write $E = mc^2$ in the middle of text.

Complex equations:

$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$`,

  streaming: "This text is being streamed word by w",

  streamingWithMarkdown: "Here is some **bold tex",

  lists: `# Shopping List

## Groceries

- Milk
- Eggs
- Bread
  - Whole wheat
  - Sourdough
- Cheese

## Tasks

1. Buy groceries
2. Prepare dinner
3. Clean kitchen`,

  blockquote: `# Quotes

> The only way to do great work is to love what you do.
>
> If you haven't found it yet, keep looking. Don't settle.

-- Steve Jobs`,
};

/**
 * ChatStatus values for PromptInput component
 */
export const MOCK_CHAT_STATUSES: ChatStatus[] = [
  "ready",
  "submitted",
  "streaming",
  "error",
];

/**
 * Mock suggestions for Suggestion component
 */
export const MOCK_SUGGESTIONS = [
  "How does caching improve performance?",
  "Explain the CAP theorem",
  "What is eventual consistency?",
  "Design a URL shortener",
  "How do you scale a database?",
  "What are microservices?",
];

/**
 * Mock avatar URLs
 */
export const MOCK_AVATAR_URLS = {
  user: "https://api.dicebear.com/7.x/avataaars/svg?seed=user",
  assistant: "https://api.dicebear.com/7.x/bottts/svg?seed=assistant",
};

/**
 * Mock base64 image for Image component
 */
export const MOCK_BASE64_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzY2N2VlYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+R2VuZXJhdGVkIEltYWdlPC90ZXh0Pjwvc3ZnPg==";
