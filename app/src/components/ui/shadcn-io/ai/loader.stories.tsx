import type { Meta, StoryObj } from '@storybook/react';
import { Loader } from './loader';

const meta: Meta<typeof Loader> = {
  title: 'AI Components/Presentation/Loader',
  component: Loader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A spinning loader icon for indicating loading states in AI interactions. The loader animates with a smooth spin and inherits the current text color.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'number', min: 8, max: 64, step: 4 },
      description: 'Size of the loader icon in pixels',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for custom styling',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Loader>;

export const Default: Story = {
  args: {
    size: 16,
  },
};

export const Small: Story = {
  args: {
    size: 12,
  },
  parameters: {
    docs: {
      description: {
        story: 'Small loader suitable for inline text or compact UI elements.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    size: 32,
  },
  parameters: {
    docs: {
      description: {
        story: 'Large loader for prominent loading states.',
      },
    },
  },
};

export const ExtraLarge: Story = {
  args: {
    size: 64,
  },
  parameters: {
    docs: {
      description: {
        story: 'Extra large loader for full-page loading states.',
      },
    },
  },
};

export const WithCustomColor: Story = {
  args: {
    size: 24,
    className: 'text-blue-500',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The loader inherits color from its parent, allowing custom theming with className or parent styles.',
      },
    },
  },
};

export const InContext: Story = {
  render: (args) => (
    <div className="flex items-center gap-2 p-4 border rounded-lg bg-background">
      <Loader {...args} />
      <span className="text-sm text-muted-foreground">
        Loading response...
      </span>
    </div>
  ),
  args: {
    size: 16,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Loader component shown in a typical loading context with descriptive text.',
      },
    },
  },
};
