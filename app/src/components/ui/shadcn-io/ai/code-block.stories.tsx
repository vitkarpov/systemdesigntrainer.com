import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock, CodeBlockCopyButton } from "./code-block";
import { MOCK_CODE_SAMPLES } from "./__stories__/mock-data";

const meta: Meta<typeof CodeBlock> = {
  title: "AI Components/Content Display/CodeBlock",
  component: CodeBlock,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Syntax-highlighted code block with copy functionality. Supports dual light/dark themes and multiple programming languages via react-syntax-highlighter.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    code: {
      control: "text",
      description: "The code content to display",
    },
    language: {
      control: "select",
      options: [
        "typescript",
        "javascript",
        "python",
        "json",
        "bash",
        "css",
        "html",
        "java",
        "go",
        "rust",
      ],
      description: "Programming language for syntax highlighting",
    },
    showLineNumbers: {
      control: "boolean",
      description: "Show line numbers in the code block",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof CodeBlock>;

export const Default: Story = {
  args: {
    code: MOCK_CODE_SAMPLES.typescript,
    language: "typescript",
    showLineNumbers: false,
  },
};

export const WithLineNumbers: Story = {
  args: {
    code: MOCK_CODE_SAMPLES.typescript,
    language: "typescript",
    showLineNumbers: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Code block with line numbers enabled for easier reference.",
      },
    },
  },
};

export const WithCopyButton: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton
        onCopy={() => console.log("Code copied!")}
        onError={(error) => console.error("Copy failed:", error)}
      />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.typescript,
    language: "typescript",
  },
  parameters: {
    docs: {
      description: {
        story: "Code block with a copy button in the top-right corner.",
      },
    },
  },
};

export const JavaScript: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.javascript,
    language: "javascript",
    showLineNumbers: true,
  },
  parameters: {
    docs: {
      description: {
        story: "JavaScript code with syntax highlighting.",
      },
    },
  },
};

export const Python: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.python,
    language: "python",
    showLineNumbers: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Python code with syntax highlighting.",
      },
    },
  },
};

export const JSON: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.json,
    language: "json",
  },
  parameters: {
    docs: {
      description: {
        story: "JSON data with syntax highlighting.",
      },
    },
  },
};

export const BashScript: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.bash,
    language: "bash",
    showLineNumbers: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Bash script with syntax highlighting.",
      },
    },
  },
};

export const LongCode: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.typescript.repeat(5),
    language: "typescript",
    showLineNumbers: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Code block with scrollable content for long code samples. The block maintains its layout while allowing vertical scrolling.",
      },
    },
  },
};

export const EmptyCode: Story = {
  args: {
    code: "",
    language: "typescript",
  },
  parameters: {
    docs: {
      description: {
        story: "Edge case: empty code block.",
      },
    },
  },
};

export const DarkTheme: Story = {
  render: (args) => (
    <div className="dark bg-background p-4 rounded-lg">
      <CodeBlock {...args}>
        <CodeBlockCopyButton />
      </CodeBlock>
    </div>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.typescript,
    language: "typescript",
    showLineNumbers: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Code block in dark theme. The component automatically applies oneDark syntax theme.",
      },
    },
    backgrounds: { default: "dark" },
  },
};

export const InteractiveCopy: Story = {
  render: (args) => (
    <CodeBlock {...args}>
      <CodeBlockCopyButton />
    </CodeBlock>
  ),
  args: {
    code: MOCK_CODE_SAMPLES.typescript,
    language: "typescript",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive story demonstrating the copy functionality. Click the copy button to copy code to clipboard.",
      },
    },
  },
};

export const MultipleLanguages: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted-foreground mb-2">TypeScript</div>
        <CodeBlock code={MOCK_CODE_SAMPLES.typescript} language="typescript">
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-2">Python</div>
        <CodeBlock code={MOCK_CODE_SAMPLES.python} language="python">
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-2">JSON</div>
        <CodeBlock code={MOCK_CODE_SAMPLES.json} language="json">
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>
      <div>
        <div className="text-sm text-muted-foreground mb-2">CSS</div>
        <CodeBlock code={MOCK_CODE_SAMPLES.css} language="css">
          <CodeBlockCopyButton />
        </CodeBlock>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple code blocks showing different languages.",
      },
    },
  },
};
