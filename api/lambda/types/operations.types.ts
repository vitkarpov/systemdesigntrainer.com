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
  /** User ID (optional, for admin context) */
  userId?: number;
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
