import type { Meta, StoryObj } from '@storybook/react';
import { Suggestions, Suggestion } from './suggestion';
import { MOCK_SUGGESTIONS } from './__stories__/mock-data';

const meta: Meta<typeof Suggestion> = {
  title: 'AI Components/Interactive/Suggestion',
  component: Suggestion,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Displays suggested follow-up prompts or questions that users can click to continue the conversation. Typically shown in a horizontal scrollable container.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    suggestion: {
      control: 'text',
      description: 'The suggestion text to display',
    },
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost'],
      description: 'Button variant style',
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
      description: 'Button size',
    },
    onClick: {
      action: 'clicked',
      description: 'Callback function when suggestion is clicked',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Suggestion>;

export const Default: Story = {
  args: {
    suggestion: 'How does caching improve performance?',
    onClick: (suggestion) => console.log('Clicked:', suggestion),
  },
};

export const MultipleSuggestions: Story = {
  render: () => (
    <Suggestions>
      {MOCK_SUGGESTIONS.map((suggestion, index) => (
        <Suggestion
          key={index}
          suggestion={suggestion}
          onClick={(s) => console.log('Clicked:', s)}
        />
      ))}
    </Suggestions>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple suggestions displayed in a horizontally scrollable container.',
      },
    },
  },
};

export const WithLongText: Story = {
  render: () => (
    <Suggestions>
      <Suggestion
        suggestion="Can you explain in detail how the CAP theorem affects distributed system design?"
        onClick={(s) => console.log('Clicked:', s)}
      />
      <Suggestion
        suggestion="What are the trade-offs?"
        onClick={(s) => console.log('Clicked:', s)}
      />
      <Suggestion
        suggestion="Tell me more about consistency models in distributed databases"
        onClick={(s) => console.log('Clicked:', s)}
      />
    </Suggestions>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Suggestions with varying text lengths, demonstrating how the component handles long and short text.',
      },
    },
  },
};

export const WithCustomVariant: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-muted-foreground mb-2">Outline (default)</div>
        <Suggestions>
          <Suggestion suggestion="Outline variant" variant="outline" />
          <Suggestion suggestion="Another suggestion" variant="outline" />
        </Suggestions>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Default</div>
        <Suggestions>
          <Suggestion suggestion="Default variant" variant="default" />
          <Suggestion suggestion="Another suggestion" variant="default" />
        </Suggestions>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Secondary</div>
        <Suggestions>
          <Suggestion suggestion="Secondary variant" variant="secondary" />
          <Suggestion suggestion="Another suggestion" variant="secondary" />
        </Suggestions>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Ghost</div>
        <Suggestions>
          <Suggestion suggestion="Ghost variant" variant="ghost" />
          <Suggestion suggestion="Another suggestion" variant="ghost" />
        </Suggestions>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Suggestions with different button variants.',
      },
    },
  },
};

export const Interactive: Story = {
  render: () => (
    <Suggestions>
      <Suggestion
        suggestion="Click me!"
        onClick={(s) => alert(`You clicked: ${s}`)}
      />
      <Suggestion
        suggestion="Or click me!"
        onClick={(s) => alert(`You clicked: ${s}`)}
      />
      <Suggestion
        suggestion="Try me too!"
        onClick={(s) => alert(`You clicked: ${s}`)}
      />
    </Suggestions>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demonstration of suggestion clicks. Each button shows an alert when clicked.',
      },
    },
  },
};

export const InChatContext: Story = {
  render: () => (
    <div className="max-w-2xl border rounded-lg p-4 bg-background space-y-4">
      <div className="space-y-2">
        <div className="bg-secondary rounded-lg p-3 text-sm">
          I can help you understand system design concepts. What would you like
          to learn about?
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="text-xs text-muted-foreground mb-2 uppercase font-medium">
          Suggested topics:
        </div>
        <Suggestions>
          {MOCK_SUGGESTIONS.slice(0, 4).map((suggestion, index) => (
            <Suggestion
              key={index}
              suggestion={suggestion}
              onClick={(s) => console.log('Selected suggestion:', s)}
            />
          ))}
        </Suggestions>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Suggestions displayed in a chat context, showing typical placement after an AI message.',
      },
    },
  },
};
