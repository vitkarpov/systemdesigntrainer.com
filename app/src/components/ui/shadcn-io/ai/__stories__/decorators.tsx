import type { Decorator } from "@storybook/react";
import { StickToBottom } from "use-stick-to-bottom";

/**
 * Decorator that adds padding around the story
 * Useful for components that need some spacing
 */
export const withTheme: Decorator = (Story) => (
  <div className="p-4">
    <Story />
  </div>
);

/**
 * Decorator that wraps the story in a StickToBottom provider
 * Required for Conversation component and related components
 */
export const withStickToBottomProvider: Decorator = (Story) => (
  <StickToBottom className="h-[600px] overflow-y-auto border rounded-lg">
    <StickToBottom.Content className="p-4">
      <Story />
    </StickToBottom.Content>
  </StickToBottom>
);

/**
 * Decorator that provides a full-width container with max-width
 * Useful for layout components
 */
export const withFullWidthContainer: Decorator = (Story) => (
  <div className="w-full max-w-4xl mx-auto p-4">
    <Story />
  </div>
);

/**
 * Decorator that provides a chat-like container
 * Simulates a messaging interface with fixed height and border
 */
export const withChatContainer: Decorator = (Story) => (
  <div className="flex flex-col h-[600px] w-full max-w-2xl border rounded-lg bg-background overflow-hidden mx-auto">
    <Story />
  </div>
);

/**
 * Decorator that provides a dark theme wrapper
 * Useful for testing components in dark mode
 */
export const withDarkTheme: Decorator = (Story) => (
  <div className="dark bg-background p-4 rounded-lg">
    <Story />
  </div>
);

/**
 * Decorator that provides a scrollable container
 * Useful for testing overflow behavior
 */
export const withScrollableContainer: Decorator = (Story) => (
  <div className="h-[400px] overflow-y-auto border rounded-lg p-4">
    <Story />
  </div>
);

/**
 * Decorator that centers content vertically and horizontally
 * Useful for presentation components
 */
export const withCenteredContainer: Decorator = (Story) => (
  <div className="flex items-center justify-center min-h-[400px] p-4">
    <Story />
  </div>
);
