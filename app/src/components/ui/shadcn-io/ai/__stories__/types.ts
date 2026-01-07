/**
 * Shared types for AI component stories
 */

import type { UIMessage } from "ai";

/**
 * Extended message type with additional metadata for stories
 */
export interface StoryMessage extends UIMessage {
  timestamp?: string;
  avatar?: string;
}

/**
 * Common story parameters
 */
export interface StoryParams {
  layout?: "centered" | "padded" | "fullscreen";
  backgrounds?: {
    default?: string;
    values?: Array<{ name: string; value: string }>;
  };
}
