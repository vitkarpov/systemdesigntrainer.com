import type { Meta, StoryObj } from '@storybook/react';
import { Actions, Action } from './actions';
import {
  CopyIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RefreshCwIcon,
  Share2Icon,
  BookmarkIcon,
} from 'lucide-react';

const meta: Meta<typeof Actions> = {
  title: 'AI Components/Presentation/Actions',
  component: Actions,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A container for action buttons with tooltips. Used to display a group of actions that can be performed on AI messages or content.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Actions>;

export const Default: Story = {
  render: () => (
    <Actions>
      <Action tooltip="Copy to clipboard" onClick={() => console.log('Copy')}>
        <CopyIcon className="size-4" />
      </Action>
      <Action tooltip="Good response" onClick={() => console.log('Thumbs up')}>
        <ThumbsUpIcon className="size-4" />
      </Action>
      <Action tooltip="Bad response" onClick={() => console.log('Thumbs down')}>
        <ThumbsDownIcon className="size-4" />
      </Action>
      <Action tooltip="Regenerate" onClick={() => console.log('Regenerate')}>
        <RefreshCwIcon className="size-4" />
      </Action>
    </Actions>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Default action group with common AI message actions.',
      },
    },
  },
};

export const SingleAction: Story = {
  render: () => (
    <Actions>
      <Action tooltip="Copy to clipboard" onClick={() => console.log('Copy')}>
        <CopyIcon className="size-4" />
      </Action>
    </Actions>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Single action in the group.',
      },
    },
  },
};

export const WithoutTooltips: Story = {
  render: () => (
    <Actions>
      <Action label="Copy" onClick={() => console.log('Copy')}>
        <CopyIcon className="size-4" />
      </Action>
      <Action label="Share" onClick={() => console.log('Share')}>
        <Share2Icon className="size-4" />
      </Action>
      <Action label="Bookmark" onClick={() => console.log('Bookmark')}>
        <BookmarkIcon className="size-4" />
      </Action>
    </Actions>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Actions without tooltips but with aria-labels for accessibility.',
      },
    },
  },
};

export const WithDifferentSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Actions>
        <Action
          tooltip="Small"
          size="sm"
          onClick={() => console.log('Small')}
        >
          <CopyIcon className="size-3" />
        </Action>
        <Action
          tooltip="Small"
          size="sm"
          onClick={() => console.log('Small')}
        >
          <ThumbsUpIcon className="size-3" />
        </Action>
      </Actions>

      <Actions>
        <Action tooltip="Default" onClick={() => console.log('Default')}>
          <CopyIcon className="size-4" />
        </Action>
        <Action tooltip="Default" onClick={() => console.log('Default')}>
          <ThumbsUpIcon className="size-4" />
        </Action>
      </Actions>

      <Actions>
        <Action
          tooltip="Large"
          size="lg"
          onClick={() => console.log('Large')}
        >
          <CopyIcon className="size-5" />
        </Action>
        <Action
          tooltip="Large"
          size="lg"
          onClick={() => console.log('Large')}
        >
          <ThumbsUpIcon className="size-5" />
        </Action>
      </Actions>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Actions with different sizes: sm, default, and lg.',
      },
    },
  },
};

export const WithVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Ghost (default)</div>
        <Actions>
          <Action tooltip="Copy" variant="ghost">
            <CopyIcon className="size-4" />
          </Action>
          <Action tooltip="Like" variant="ghost">
            <ThumbsUpIcon className="size-4" />
          </Action>
        </Actions>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Outline</div>
        <Actions>
          <Action tooltip="Copy" variant="outline">
            <CopyIcon className="size-4" />
          </Action>
          <Action tooltip="Like" variant="outline">
            <ThumbsUpIcon className="size-4" />
          </Action>
        </Actions>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Default</div>
        <Actions>
          <Action tooltip="Copy" variant="default">
            <CopyIcon className="size-4" />
          </Action>
          <Action tooltip="Like" variant="default">
            <ThumbsUpIcon className="size-4" />
          </Action>
        </Actions>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Actions with different button variants.',
      },
    },
  },
};

export const InMessageContext: Story = {
  render: () => (
    <div className="max-w-2xl border rounded-lg p-4 bg-secondary">
      <div className="mb-2 text-sm">
        <p>
          This is a sample AI response with useful information about system
          design patterns and best practices.
        </p>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <span className="text-xs text-muted-foreground">2 minutes ago</span>
        <Actions>
          <Action
            tooltip="Copy to clipboard"
            onClick={() => console.log('Copy')}
          >
            <CopyIcon className="size-4" />
          </Action>
          <Action
            tooltip="Good response"
            onClick={() => console.log('Thumbs up')}
          >
            <ThumbsUpIcon className="size-4" />
          </Action>
          <Action
            tooltip="Bad response"
            onClick={() => console.log('Thumbs down')}
          >
            <ThumbsDownIcon className="size-4" />
          </Action>
          <Action
            tooltip="Regenerate"
            onClick={() => console.log('Regenerate')}
          >
            <RefreshCwIcon className="size-4" />
          </Action>
        </Actions>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Actions displayed in context of a message card, showing typical usage in a chat interface.',
      },
    },
    layout: 'padded',
  },
};
