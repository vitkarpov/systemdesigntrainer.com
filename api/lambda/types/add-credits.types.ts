/**
 * Event payload for add-credits Lambda function
 */
export interface AddCreditsEvent {
  /** WorkOS user ID */
  workosUserId: string;
  /** Number of credits to add (can be negative to subtract) */
  credits: number;
  /** Optional reason for the credit adjustment */
  reason?: string;
}

/**
 * Success response data
 */
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
 * Response from add-credits Lambda function
 */
export interface AddCreditsResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Success data (only present if success = true) */
  data?: AddCreditsData;
  /** Error message (only present if success = false) */
  error?: string;
}
