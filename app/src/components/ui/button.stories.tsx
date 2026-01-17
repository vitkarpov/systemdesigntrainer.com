import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { ButtonBar } from "./button-bar";
import { Plus, Trash2, Download, Settings, ArrowLeft } from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "UI Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Enhanced button component with loading states, semantic variants, icons, and multiple sizes. Inspired by Sentry's button system.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "primary",
        "danger",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
        "borderless",
        "transparent",
      ],
      description: "Visual variant of the button",
    },
    size: {
      control: "select",
      options: ["zero", "xs", "sm", "default", "md", "lg", "icon"],
      description: "Size of the button",
    },
    busy: {
      control: "boolean",
      description: "Shows loading spinner and disables button",
    },
    disabled: {
      control: "boolean",
      description: "Disables the button",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Click me",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="default">Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="borderless">Borderless</Button>
        <Button variant="transparent">Transparent</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available button variants showing different visual styles.",
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Available button sizes from extra small to large.",
      },
    },
  },
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button icon={<Plus />}>Add Item</Button>
      <Button variant="danger" icon={<Trash2 />}>
        Delete
      </Button>
      <Button variant="outline" icon={<Download />}>
        Download
      </Button>
      <Button variant="secondary" icon={<Settings />}>
        Settings
      </Button>
      <Button variant="ghost" size="sm" icon={<ArrowLeft />}>
        Back
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Buttons with icons using the icon prop for automatic spacing.",
      },
    },
  },
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button size="icon" variant="outline">
        <Settings />
      </Button>
      <Button size="icon" variant="ghost">
        <Download />
      </Button>
      <Button size="icon" variant="primary">
        <Plus />
      </Button>
      <Button size="icon" variant="danger">
        <Trash2 />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Icon-only buttons using the icon size variant.",
      },
    },
  },
};

export const LoadingStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button busy>Loading</Button>
      <Button variant="primary" busy>
        Saving...
      </Button>
      <Button variant="danger" busy>
        Deleting...
      </Button>
      <Button variant="outline" busy>
        Processing
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Buttons with busy prop showing loading spinner. Automatically disabled when busy.",
      },
    },
  },
};

export const DisabledStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button disabled>Disabled</Button>
      <Button variant="primary" disabled>
        Primary Disabled
      </Button>
      <Button variant="danger" disabled>
        Danger Disabled
      </Button>
      <Button variant="outline" disabled>
        Outline Disabled
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Disabled button states with reduced opacity.",
      },
    },
  },
};

export const ButtonGroups: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm text-muted-foreground mb-2">
          Default spacing (md)
        </div>
        <ButtonBar gap="md">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Save</Button>
        </ButtonBar>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">
          Small spacing (sm)
        </div>
        <ButtonBar gap="sm">
          <Button variant="outline" size="sm">
            Back
          </Button>
          <Button variant="primary" size="sm">
            Continue
          </Button>
          <Button variant="ghost" size="sm">
            Skip
          </Button>
        </ButtonBar>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">No spacing</div>
        <ButtonBar gap="none">
          <Button variant="secondary">Option 1</Button>
          <Button variant="secondary">Option 2</Button>
          <Button variant="secondary">Option 3</Button>
        </ButtonBar>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "ButtonBar component for grouping related buttons with consistent spacing.",
      },
    },
    layout: "padded",
  },
};

export const MergedButtonGroups: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm text-muted-foreground mb-2">
          Segmented control
        </div>
        <ButtonBar merged>
          <Button variant="outline">Day</Button>
          <Button variant="primary">Week</Button>
          <Button variant="outline">Month</Button>
        </ButtonBar>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">View switcher</div>
        <ButtonBar merged>
          <Button variant="primary" size="sm">
            Grid
          </Button>
          <Button variant="outline" size="sm">
            List
          </Button>
        </ButtonBar>
      </div>

      <div>
        <div className="text-sm text-muted-foreground mb-2">Toolbar</div>
        <ButtonBar merged>
          <Button variant="outline" size="icon">
            <Plus />
          </Button>
          <Button variant="outline" size="icon">
            <Download />
          </Button>
          <Button variant="outline" size="icon">
            <Settings />
          </Button>
        </ButtonBar>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Merged button groups create unified controls where buttons appear connected.",
      },
    },
    layout: "padded",
  },
};

export const RealWorldExamples: Story = {
  render: () => (
    <div className="flex flex-col gap-8 w-full max-w-2xl">
      <div className="border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Form Actions</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter your name"
            className="w-full px-3 py-2 border rounded-lg"
          />
          <ButtonBar gap="md" className="justify-end">
            <Button variant="ghost">Cancel</Button>
            <Button variant="primary" icon={<Plus />}>
              Create Account
            </Button>
          </ButtonBar>
        </div>
      </div>

      <div className="border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Delete this item?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <ButtonBar gap="sm" className="justify-end">
          <Button variant="outline">Cancel</Button>
          <Button variant="danger" icon={<Trash2 />}>
            Delete
          </Button>
        </ButtonBar>
      </div>

      <div className="border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Dashboard Settings</h3>
          <ButtonBar gap="sm">
            <Button variant="outline" size="sm" icon={<Download />}>
              Export
            </Button>
            <Button variant="ghost" size="sm" icon={<Settings />}>
              Configure
            </Button>
          </ButtonBar>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Real-world usage examples showing buttons in common UI patterns.",
      },
    },
    layout: "padded",
  },
};
