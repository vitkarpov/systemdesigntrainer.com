import type { Meta, StoryObj } from "@storybook/react";
import {
  Branch,
  BranchMessages,
  BranchSelector,
  BranchPrevious,
  BranchNext,
  BranchPage,
} from "./branch";
import { Message, MessageContent, MessageAvatar } from "./message";
import { createMockBranches, MOCK_AVATAR_URLS } from "./__stories__/mock-data";

const meta: Meta<typeof Branch> = {
  title: "AI Components/Interactive/Branch",
  component: Branch,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Branch component for displaying and navigating between alternative message threads. Provides context-based navigation with previous/next buttons and page indicator. Automatically hides selector when only one branch exists.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    defaultBranch: {
      control: { type: "number", min: 0 },
      description: "Initial branch to display (0-indexed)",
    },
    onBranchChange: {
      action: "branchChanged",
      description: "Callback when branch changes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Branch>;

// Helper component to render a message branch
const MessageBranch = ({ messages }: { messages: any[] }) => (
  <>
    {messages.map((msg, idx) => (
      <Message key={idx} from={msg.role as "user" | "assistant"}>
        <MessageAvatar
          src={
            msg.role === "user"
              ? MOCK_AVATAR_URLS.user
              : MOCK_AVATAR_URLS.assistant
          }
          name={msg.role === "user" ? "User" : "AI"}
        />
        <MessageContent>{String(msg.content || "")}</MessageContent>
      </Message>
    ))}
  </>
);

export const Default: Story = {
  render: (args) => {
    const branches = createMockBranches(3);
    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="assistant">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story: "Default branch navigation with 3 alternative responses.",
      },
    },
  },
};

export const SingleBranch: Story = {
  render: (args) => {
    const branches = createMockBranches(1);
    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="assistant">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "When only one branch exists, the selector is automatically hidden.",
      },
    },
  },
};

export const ManyBranches: Story = {
  render: (args) => {
    const branches = createMockBranches(7);
    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="assistant">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Branch navigation with many alternative responses (7 branches).",
      },
    },
  },
};

export const StartAtSecondBranch: Story = {
  render: (args) => {
    const branches = createMockBranches(3);
    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="assistant">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 1,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Branch starting at index 1 (second branch). Page indicator shows "2 of 3".',
      },
    },
  },
};

export const UserSideBranchSelector: Story = {
  render: (args) => {
    const branches = createMockBranches(3);
    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="user">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Branch selector aligned for user messages (right-aligned instead of left-aligned).",
      },
    },
  },
};

export const WithDifferentMessageLengths: Story = {
  render: (args) => {
    // Create branches with varying message counts
    const shortBranch = createMockBranches(1)[0].slice(0, 2);
    const mediumBranch = createMockBranches(1)[0].slice(0, 4);
    const longBranch = createMockBranches(1)[0];
    const branches = [shortBranch, mediumBranch, longBranch];

    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
              <div className="text-sm text-muted-foreground italic p-2">
                Branch {idx + 1}: {branch.length} messages
              </div>
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="assistant">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Branches with different message counts to test layout flexibility and transitions.",
      },
    },
  },
};

export const Interactive: Story = {
  render: (args) => {
    const branches = createMockBranches(3);
    return (
      <Branch {...args}>
        <BranchMessages>
          {branches.map((branch, idx) => (
            <div key={idx}>
              <MessageBranch messages={branch} />
            </div>
          ))}
        </BranchMessages>
        <BranchSelector from="assistant">
          <BranchPrevious />
          <BranchPage />
          <BranchNext />
        </BranchSelector>
      </Branch>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Interactive demonstration of branch navigation. Click next/previous to cycle through branches.",
      },
    },
  },
};

export const InConversationContext: Story = {
  render: (args) => {
    const branches = createMockBranches(3);
    return (
      <div className="max-w-2xl border rounded-lg p-4 bg-background space-y-4">
        <Message from="user">
          <MessageAvatar src={MOCK_AVATAR_URLS.user} name="User" />
          <MessageContent>
            Can you explain how distributed consensus works?
          </MessageContent>
        </Message>

        <Branch {...args}>
          <BranchMessages>
            {branches.map((branch, idx) => (
              <div key={idx}>
                <MessageBranch messages={branch.slice(0, 1)} />
              </div>
            ))}
          </BranchMessages>
          <BranchSelector from="assistant">
            <BranchPrevious />
            <BranchPage />
            <BranchNext />
          </BranchSelector>
        </Branch>
      </div>
    );
  },
  args: {
    defaultBranch: 0,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Branch component shown in a conversation context, demonstrating how it integrates with messages.",
      },
    },
  },
};
