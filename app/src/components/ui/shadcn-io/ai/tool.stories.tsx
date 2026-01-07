import type { Meta, StoryObj } from '@storybook/react';
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from './tool';
import { createMockToolInvocation } from './__stories__/mock-data';

const meta: Meta<typeof Tool> = {
  title: 'AI Components/Advanced Features/Tool',
  component: Tool,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays tool invocations with collapsible input and output sections. Shows various states like pending, running, completed, error, and approval-requested with appropriate status badges.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    defaultOpen: {
      control: 'boolean',
      description: 'Whether the tool is initially expanded',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tool>;

export const InputStreaming: Story = {
  render: () => {
    const tool = createMockToolInvocation('input-streaming');
    return (
      <Tool>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tool in input-streaming state, showing that parameters are being received.',
      },
    },
  },
};

export const InputAvailable: Story = {
  render: () => {
    const tool = createMockToolInvocation('input-available');
    return (
      <Tool>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tool with input available and ready to execute, showing running state with animated icon.',
      },
    },
  },
};

export const ApprovalRequested: Story = {
  render: () => {
    const tool = createMockToolInvocation('approval-requested');
    return (
      <Tool defaultOpen>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
                Approve
              </button>
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm">
                Deny
              </button>
            </div>
          </div>
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Tool requesting user approval before execution, with approve/deny buttons.',
      },
    },
  },
};

export const ApprovalResponded: Story = {
  render: () => {
    const tool = createMockToolInvocation('approval-responded');
    return (
      <Tool>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tool after user has approved execution.',
      },
    },
  },
};

export const OutputAvailable: Story = {
  render: () => {
    const tool = createMockToolInvocation('output-available');
    return (
      <Tool defaultOpen>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
          <ToolOutput output={JSON.stringify(tool.output, null, 2)} errorText={tool.errorText} />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tool successfully completed with output displayed.',
      },
    },
  },
};

export const OutputError: Story = {
  render: () => {
    const tool = createMockToolInvocation('output-error');
    return (
      <Tool defaultOpen>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
          <ToolOutput output={null} errorText={tool.errorText} />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tool failed with error message displayed.',
      },
    },
  },
};

export const OutputDenied: Story = {
  render: () => {
    const tool = createMockToolInvocation('output-denied');
    return (
      <Tool defaultOpen>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
          <ToolOutput output={null} errorText="Execution denied by user" />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tool execution denied by user.',
      },
    },
  },
};

export const DifferentToolTypes: Story = {
  render: () => (
    <div className="space-y-4">
      {['search_database', 'analyze_code', 'fetch_api', 'process_image'].map(
        (toolType) => {
          const tool = createMockToolInvocation('output-available', toolType);
          return (
            <Tool key={toolType} defaultOpen>
              <ToolHeader type={tool.type} state={tool.state} />
              <ToolContent>
                <ToolInput input={tool.input} />
                <ToolOutput
                  output={JSON.stringify(tool.output, null, 2)}
                  errorText={tool.errorText}
                />
              </ToolContent>
            </Tool>
          );
        }
      )}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple tools of different types showing various operations and their outputs.',
      },
    },
  },
};

export const WithComplexOutput: Story = {
  render: () => {
    const tool = createMockToolInvocation('output-available');
    const complexOutput = {
      status: 'success',
      data: {
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
          { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
          { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true },
        ],
        metadata: {
          page: 1,
          perPage: 10,
          total: 3,
          timestamp: '2024-01-01T00:00:00Z',
        },
      },
    };

    return (
      <Tool defaultOpen>
        <ToolHeader type="tool-fetch_users" state={tool.state} />
        <ToolContent>
          <ToolInput input={{ endpoint: '/api/users', method: 'GET' }} />
          <ToolOutput
            output={JSON.stringify(complexOutput, null, 2)}
            errorText={undefined}
          />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Tool with complex nested JSON output.',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const tool = createMockToolInvocation('output-available');
    return (
      <Tool>
        <ToolHeader type={tool.type} state={tool.state} />
        <ToolContent>
          <ToolInput input={tool.input} />
          <ToolOutput
            output={JSON.stringify(tool.output, null, 2)}
            errorText={tool.errorText}
          />
        </ToolContent>
      </Tool>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive tool with collapsible functionality. Click to expand/collapse.',
      },
    },
  },
};
