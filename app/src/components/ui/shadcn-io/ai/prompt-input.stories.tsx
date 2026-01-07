import type { Meta, StoryObj } from '@storybook/react';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputModelSelect,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectValue,
} from './prompt-input';
import { PaperclipIcon, MicIcon } from 'lucide-react';

const meta: Meta<typeof PromptInput> = {
  title: 'AI Components/Interactive/PromptInput',
  component: PromptInput,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A comprehensive form input component for chat interfaces. Supports textarea input, toolbar with actions, model selection, and various submission states (idle, submitting, streaming, error).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSubmit: {
      action: 'submitted',
      description: 'Form submission handler',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PromptInput>;

export const Default: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea placeholder="What would you like to know?" />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
};

export const WithPlaceholder: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea placeholder="Ask me anything about system design..." />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input with custom placeholder text.',
      },
    },
  },
};

export const Submitting: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea
        placeholder="What would you like to know?"
        defaultValue="How does caching work?"
      />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit status="submitted" />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input in submitting state with spinner icon.',
      },
    },
  },
};

export const Streaming: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea
        placeholder="What would you like to know?"
        defaultValue="Explain distributed systems"
      />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit status="streaming" />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Input in streaming state showing stop square icon to cancel streaming.',
      },
    },
  },
};

export const ErrorState: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea
        placeholder="What would you like to know?"
        defaultValue="This request caused an error"
      />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit status="error" />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input in error state showing X icon.',
      },
    },
  },
};

export const WithToolbar: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea placeholder="What would you like to know?" />
      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputButton onClick={() => console.log('Attach file')}>
            <PaperclipIcon className="size-4" />
            Attach
          </PromptInputButton>
          <PromptInputButton onClick={() => console.log('Voice input')}>
            <MicIcon className="size-4" />
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input with toolbar buttons for attachments and voice input.',
      },
    },
  },
};

export const WithModelSelect: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea placeholder="What would you like to know?" />
      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputModelSelect defaultValue="claude-3.5-sonnet">
            <PromptInputModelSelectTrigger>
              <PromptInputModelSelectValue placeholder="Select model" />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              <PromptInputModelSelectItem value="claude-3.5-sonnet">
                Claude 3.5 Sonnet
              </PromptInputModelSelectItem>
              <PromptInputModelSelectItem value="claude-3-opus">
                Claude 3 Opus
              </PromptInputModelSelectItem>
              <PromptInputModelSelectItem value="claude-3-haiku">
                Claude 3 Haiku
              </PromptInputModelSelectItem>
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
        </PromptInputTools>
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Input with model selector dropdown in toolbar.',
      },
    },
  },
};

export const WithFullToolbar: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea placeholder="Ask me anything..." />
      <PromptInputToolbar>
        <PromptInputTools>
          <PromptInputModelSelect defaultValue="claude-3.5-sonnet">
            <PromptInputModelSelectTrigger>
              <PromptInputModelSelectValue />
            </PromptInputModelSelectTrigger>
            <PromptInputModelSelectContent>
              <PromptInputModelSelectItem value="claude-3.5-sonnet">
                Claude 3.5 Sonnet
              </PromptInputModelSelectItem>
              <PromptInputModelSelectItem value="claude-3-opus">
                Claude 3 Opus
              </PromptInputModelSelectItem>
            </PromptInputModelSelectContent>
          </PromptInputModelSelect>
          <PromptInputButton onClick={() => console.log('Attach')}>
            <PaperclipIcon className="size-4" />
          </PromptInputButton>
          <PromptInputButton onClick={() => console.log('Voice')}>
            <MicIcon className="size-4" />
          </PromptInputButton>
        </PromptInputTools>
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Complete toolbar with model selector, attachment, and voice input buttons.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <PromptInput onSubmit={(e) => e.preventDefault()}>
      <PromptInputTextarea
        placeholder="Chat is disabled"
        disabled
      />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit disabled />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled input state (e.g., when interview is completed).',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => (
    <PromptInput
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        alert(`Submitted: ${formData.get('message')}`);
      }}
    >
      <PromptInputTextarea placeholder="Type your message and press Enter..." />
      <PromptInputToolbar>
        <PromptInputTools />
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demonstration with form submission. Type text and submit using Enter or button click.',
      },
    },
  },
};

export const InChatContext: Story = {
  render: () => (
    <div className="flex flex-col h-[600px] max-w-2xl border rounded-lg bg-background mx-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-secondary rounded-lg p-3 text-sm max-w-[80%]">
          Hello! How can I help you today?
        </div>
        <div className="bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-[80%] ml-auto">
          Explain caching strategies
        </div>
        <div className="bg-secondary rounded-lg p-3 text-sm max-w-[80%]">
          There are several caching strategies including cache-aside,
          write-through, and write-back...
        </div>
      </div>

      <div className="border-t p-4">
        <PromptInput onSubmit={(e) => e.preventDefault()}>
          <PromptInputTextarea placeholder="Message..." />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton>
                <PaperclipIcon className="size-4" />
              </PromptInputButton>
            </PromptInputTools>
            <PromptInputSubmit />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'PromptInput shown in a complete chat interface context, demonstrating typical usage at the bottom of a conversation.',
      },
    },
    layout: 'centered',
  },
};
