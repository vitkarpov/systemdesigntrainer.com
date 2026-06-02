/**
 * Generic Lambda event structure for admin operations
 */
export interface AdminOperationEvent<T = unknown> {
  /** Operation identifier (e.g., 'add-credits', 'update-subscription') */
  operation: string;
  /** Operation-specific payload */
  payload: T;
}

/**
 * Generic Lambda response structure
 */
export interface AdminOperationResponse<T = unknown> {
  /** Whether the operation was successful */
  success: boolean;
  /** Operation that was executed */
  operation: string;
  /** Success data (only present if success = true) */
  data?: T;
  /** Error message (only present if success = false) */
  error?: string;
}

/**
 * Add Credits Operation Types
 */
export interface AddCreditsPayload {
  /** WorkOS user ID */
  workosUserId: string;
  /** Number of credits to add (can be negative to subtract) */
  credits: number;
  /** Optional reason for the credit adjustment */
  reason?: string;
}

export interface AddCreditsData {
  /** User's database ID */
  userId: number;
  /** WorkOS user ID */
  workosUserId: string;
  /** User's email */
  email: string;
  /** Number of credits added */
  creditsAdded: number;
  /** Balance before the operation */
  previousBalance: number;
  /** Balance after the operation */
  newBalance: number;
  /** Timestamp of the operation */
  updatedAt: string;
}

/**
 * Type-safe operation events
 */
export type AddCreditsEvent = AdminOperationEvent<AddCreditsPayload> & {
  operation: 'add-credits';
};

export type AddCreditsResponse = AdminOperationResponse<AddCreditsData> & {
  operation: 'add-credits';
};

/**
 * Generate Feedback Operation Types
 */
export interface GenerateFeedbackPayload {
  /** Session ID to generate feedback for */
  sessionId: number;
  /** Whether to regenerate feedback even if it already exists */
  regenerate: boolean;
}

export interface GenerateFeedbackData {
  /** Session ID */
  sessionId: number;
  /** Bull queue job ID */
  jobId: string | number;
  /** Job status */
  status: 'queued' | 'processing' | 'already_exists';
  /** If feedback already exists */
  alreadyExists?: boolean;
}

/**
 * Type-safe operation events
 */
export type GenerateFeedbackEvent = AdminOperationEvent<GenerateFeedbackPayload> & {
  operation: 'generate-feedback';
};

export type GenerateFeedbackResponse = AdminOperationResponse<GenerateFeedbackData> & {
  operation: 'generate-feedback';
};

/**
 * Send Farewell Email Operation Types
 *
 * Sends a one-off thank-you / service-retirement email to every registered user.
 */
export interface SendFarewellEmailPayload {
  /** If true, count recipients and log without actually sending (default: false) */
  dryRun?: boolean;
  /** Number of emails to send per batch (default: 10) */
  batchSize?: number;
  /** Delay in milliseconds between batches to respect SES rate limits (default: 1000) */
  delayMs?: number;
  /** Optional cap on the number of users to email (useful for testing) */
  limit?: number;
  /**
   * If set, send a single email to this address instead of querying the user
   * table. Use for a safe live test before a full send. Takes precedence over limit.
   */
  testEmail?: string;
}

export interface SendFarewellEmailData {
  /** Total number of users considered (with a non-null email) */
  totalUsers: number;
  /** Number of emails successfully sent (or counted, in dry-run mode) */
  sent: number;
  /** Number of users skipped (e.g. missing email) */
  skipped: number;
  /** Number of emails that failed to send */
  failed: number;
  /** Whether the operation ran in dry-run mode */
  dryRun: boolean;
  /** Details of any failures */
  failures: Array<{ email: string; error: string }>;
}

/**
 * Type-safe operation events
 */
export type SendFarewellEmailEvent =
  AdminOperationEvent<SendFarewellEmailPayload> & {
    operation: 'send-farewell-email';
  };

export type SendFarewellEmailResponse =
  AdminOperationResponse<SendFarewellEmailData> & {
    operation: 'send-farewell-email';
  };
