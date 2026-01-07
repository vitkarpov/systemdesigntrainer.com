import type { Meta, StoryObj } from '@storybook/react';
import { Response } from './response';
import { MOCK_MARKDOWN_SAMPLES } from './__stories__/mock-data';

const meta: Meta<typeof Response> = {
  title: 'AI Components/Content Display/Response',
  component: Response,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Renders markdown content with support for GitHub Flavored Markdown (GFM), code syntax highlighting, KaTeX math formulas, tables, and streaming incomplete markdown. Automatically handles incomplete tokens during streaming.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Markdown content to render',
    },
    parseIncompleteMarkdown: {
      control: 'boolean',
      description:
        'Whether to parse and complete incomplete markdown tokens during streaming',
    },
    allowedImagePrefixes: {
      control: 'object',
      description: 'Array of allowed image URL prefixes for security',
    },
    allowedLinkPrefixes: {
      control: 'object',
      description: 'Array of allowed link URL prefixes for security',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Response>;

export const SimpleText: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.simple,
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple markdown with bold, italic, and inline code.',
      },
    },
  },
};

export const ComplexMarkdown: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.complex,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Complex markdown with headings, lists, code blocks, tables, blockquotes, and links.',
      },
    },
  },
};

export const WithCodeBlocks: Story = {
  args: {
    children: `# Code Examples

Here are some code examples in different languages:

## TypeScript
\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetch(\`/api/users/\${id}\`).then(res => res.json());
}
\`\`\`

## Python
\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence."""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib
\`\`\``,
  },
  parameters: {
    docs: {
      description: {
        story: 'Markdown with multiple syntax-highlighted code blocks.',
      },
    },
  },
};

export const WithMathFormulas: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.withMath,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Markdown with KaTeX math formulas (inline and block). Requires katex CSS to be loaded.',
      },
    },
  },
};

export const WithTables: Story = {
  args: {
    children: `# Comparison Table

Here's a comparison of different database types:

| Database Type | Use Case | Scalability | Consistency |
|--------------|----------|-------------|-------------|
| PostgreSQL | Relational data | Vertical | Strong |
| MongoDB | Document storage | Horizontal | Eventual |
| Redis | Caching | Horizontal | Strong |
| Cassandra | Time-series | Horizontal | Eventual |

Each database type has specific strengths and trade-offs.`,
  },
  parameters: {
    docs: {
      description: {
        story: 'Markdown with formatted tables.',
      },
    },
  },
};

export const StreamingIncomplete: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.streaming,
    parseIncompleteMarkdown: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates incomplete markdown during streaming. The parser automatically completes partial tokens to prevent rendering issues.',
      },
    },
  },
};

export const StreamingWithMarkdown: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.streamingWithMarkdown,
    parseIncompleteMarkdown: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Incomplete markdown with formatting tokens. Parser closes unclosed formatting to maintain clean rendering.',
      },
    },
  },
};

export const WithLists: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.lists,
  },
  parameters: {
    docs: {
      description: {
        story: 'Markdown with both ordered and unordered lists, including nested lists.',
      },
    },
  },
};

export const WithBlockquote: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.blockquote,
  },
  parameters: {
    docs: {
      description: {
        story: 'Markdown with blockquotes for emphasis or citations.',
      },
    },
  },
};

export const LongContent: Story = {
  args: {
    children: MOCK_MARKDOWN_SAMPLES.complex.repeat(3),
  },
  parameters: {
    docs: {
      description: {
        story: 'Long markdown content to test scrolling and performance.',
      },
    },
  },
};

export const ThemeVariations: Story = {
  render: (args) => (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground mb-4">Light Theme</div>
        <div className="bg-background p-4 rounded-lg border">
          <Response {...args} />
        </div>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-4">Dark Theme</div>
        <div className="dark bg-background p-4 rounded-lg border">
          <Response {...args} />
        </div>
      </div>
    </div>
  ),
  args: {
    children: `# System Design

Key principles for **scalable systems**:

- High availability
- Fault tolerance
- Performance optimization

\`\`\`typescript
const config = {
  replicas: 3,
  timeout: 5000
};
\`\`\``,
  },
  parameters: {
    docs: {
      description: {
        story: 'Response component in both light and dark themes.',
      },
    },
  },
};

export const InMessageContext: Story = {
  render: (args) => (
    <div className="max-w-2xl border rounded-lg p-4 bg-secondary">
      <Response {...args} />
    </div>
  ),
  args: {
    children: MOCK_MARKDOWN_SAMPLES.complex,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Response component shown within a message container, demonstrating typical usage in chat interfaces.',
      },
    },
  },
};
