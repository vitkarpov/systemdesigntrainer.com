import type { Meta, StoryObj } from "@storybook/react";
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from "./task";

const meta: Meta<typeof Task> = {
  title: "AI Components/Advanced Features/Task",
  component: Task,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Collapsible task tracker component showing progress on AI operations. Displays task title, status, and details with file references.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Whether the task is initially expanded",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Task>;

export const Default: Story = {
  render: () => (
    <Task>
      <TaskTrigger title="Searching codebase for authentication logic" />
      <TaskContent>
        <TaskItem>Found 5 files with authentication code</TaskItem>
        <TaskItem>
          Main authentication handler:{" "}
          <TaskItemFile>src/auth/handler.ts</TaskItemFile>
        </TaskItem>
        <TaskItem>
          Token management: <TaskItemFile>src/auth/tokens.ts</TaskItemFile>
        </TaskItem>
      </TaskContent>
    </Task>
  ),
  parameters: {
    docs: {
      description: {
        story: "Default task with search results and file references.",
      },
    },
  },
};

export const InitiallyOpen: Story = {
  render: () => (
    <Task defaultOpen>
      <TaskTrigger title="Analyzing code structure" />
      <TaskContent>
        <TaskItem>Scanned 120 files</TaskItem>
        <TaskItem>Identified 15 components</TaskItem>
        <TaskItem>Found 8 utility modules</TaskItem>
      </TaskContent>
    </Task>
  ),
  parameters: {
    docs: {
      description: {
        story: "Task that is initially expanded.",
      },
    },
  },
};

export const WithMultipleFiles: Story = {
  render: () => (
    <Task defaultOpen>
      <TaskTrigger title="Finding database queries" />
      <TaskContent>
        <TaskItem>Located 12 database query files</TaskItem>
        <TaskItem>
          User queries: <TaskItemFile>db/users.ts</TaskItemFile>{" "}
          <TaskItemFile>db/auth.ts</TaskItemFile>
        </TaskItem>
        <TaskItem>
          Product queries: <TaskItemFile>db/products.ts</TaskItemFile>{" "}
          <TaskItemFile>db/inventory.ts</TaskItemFile>
        </TaskItem>
        <TaskItem>
          Order queries: <TaskItemFile>db/orders.ts</TaskItemFile>{" "}
          <TaskItemFile>db/payments.ts</TaskItemFile>
        </TaskItem>
      </TaskContent>
    </Task>
  ),
  parameters: {
    docs: {
      description: {
        story: "Task with multiple file references per item.",
      },
    },
  },
};

export const MultipleTasks: Story = {
  render: () => (
    <div className="space-y-3">
      <Task defaultOpen>
        <TaskTrigger title="Searching for API endpoints" />
        <TaskContent>
          <TaskItem>Found 8 API route files</TaskItem>
          <TaskItem>
            User routes: <TaskItemFile>api/users.ts</TaskItemFile>
          </TaskItem>
          <TaskItem>
            Auth routes: <TaskItemFile>api/auth.ts</TaskItemFile>
          </TaskItem>
        </TaskContent>
      </Task>

      <Task>
        <TaskTrigger title="Analyzing dependencies" />
        <TaskContent>
          <TaskItem>Analyzed 45 npm packages</TaskItem>
          <TaskItem>3 packages need updates</TaskItem>
          <TaskItem>No security vulnerabilities found</TaskItem>
        </TaskContent>
      </Task>

      <Task>
        <TaskTrigger title="Checking test coverage" />
        <TaskContent>
          <TaskItem>Overall coverage: 78%</TaskItem>
          <TaskItem>
            Low coverage: <TaskItemFile>src/utils/helpers.ts</TaskItemFile>
          </TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple tasks showing different operations and statuses.",
      },
    },
  },
};

export const InMessageContext: Story = {
  render: () => (
    <div className="max-w-2xl border rounded-lg p-4 bg-secondary space-y-3">
      <p className="text-sm">
        I'll help you find the authentication code in your project.
      </p>

      <Task defaultOpen>
        <TaskTrigger title="Searching for authentication files" />
        <TaskContent>
          <TaskItem>Scanning project directories...</TaskItem>
          <TaskItem>Found 3 relevant files:</TaskItem>
          <TaskItem>
            <TaskItemFile>src/auth/login.ts</TaskItemFile>
          </TaskItem>
          <TaskItem>
            <TaskItemFile>src/auth/middleware.ts</TaskItemFile>
          </TaskItem>
          <TaskItem>
            <TaskItemFile>src/auth/verify.ts</TaskItemFile>
          </TaskItem>
        </TaskContent>
      </Task>

      <p className="text-sm mt-3">
        The main authentication logic is in these three files. Would you like me
        to explain how they work together?
      </p>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Task displayed within an AI message context.",
      },
    },
  },
};
