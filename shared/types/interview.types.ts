/**
 * Interview Phase Enum
 * Represents the 6 phases of a system design interview
 */
export type InterviewPhase =
  | 'problem'           // 0-5 min: Problem statement
  | 'requirements'      // 5-15 min: Requirements & constraints
  | 'high_level'        // 15-25 min: High-level design
  | 'deep_dive'         // 25-40 min: Deep dive into components
  | 'bottlenecks'       // 40-45 min: Bottlenecks & trade-offs
  | 'wrap_up';          // Final wrap-up

/**
 * Interview Status
 */
export type InterviewStatus =
  | 'not_started'       // Session created but not started
  | 'in_progress'       // Currently ongoing
  | 'completed'         // Finished successfully
  | 'abandoned';        // User left before completion

/**
 * Message Role
 */
export type MessageRole = 'user' | 'interviewer' | 'system';

/**
 * Company Style
 * Different companies have different interview styles
 */
export type CompanyStyle = 'faang' | 'startup' | 'generic';

/**
 * Interview Level
 */
export type InterviewLevel = 'mid' | 'senior' | 'staff';

/**
 * Signal Names
 * All possible signals that can be tracked
 */
export type SignalName =
  | 'asked_functional_reqs'
  | 'asked_non_functional_reqs'
  | 'clarified_constraints'
  | 'mentioned_scale'
  | 'proposed_api'
  | 'drew_high_level_diagram'
  | 'discussed_data_model'
  | 'addressed_bottlenecks'
  | 'discussed_tradeoffs'
  | 'structured_approach'
  | 'asked_clarifying_questions';

/**
 * Red Flag Names
 * All possible red flags that can be detected
 */
export type RedFlagName =
  | 'went_too_deep_early'
  | 'skipped_requirements'
  | 'no_scale_mention'
  | 'poor_time_management'
  | 'misunderstood_problem';

/**
 * Expectation Types
 */
export type ExpectationType =
  | 'functional_requirement'
  | 'non_functional_requirement'
  | 'component'
  | 'tradeoff';

/**
 * Transcript Message
 * Single message in the interview conversation
 */
export interface TranscriptMessage {
  id: number;
  sessionId: number;
  role: MessageRole;
  text: string;
  phase: InterviewPhase;
  secondsElapsed: number;
  createdAt: Date;
}

/**
 * Interview Signal
 * Tracks when a specific signal was detected
 */
export interface InterviewSignal {
  id: number;
  sessionId: number;
  signalName: SignalName;
  detectedAt: Date;
  secondsElapsed: number;
  phase: InterviewPhase;
  triggeredByMessageId?: number;
}

/**
 * Interview Red Flag
 * Tracks when a problem was detected
 */
export interface InterviewRedFlag {
  id: number;
  sessionId: number;
  flagName: RedFlagName;
  detectedAt: Date;
  secondsElapsed: number;
  phase: InterviewPhase;
  description?: string;
}

/**
 * Diagram Element Types
 */
export type DiagramElementType = 'box' | 'arrow' | 'text';

/**
 * Diagram Box
 */
export interface DiagramBox {
  id: number;
  snapshotId: number;
  elementType: 'box';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  createdAt: Date;
}

/**
 * Diagram Arrow
 */
export interface DiagramArrow {
  id: number;
  snapshotId: number;
  elementType: 'arrow';
  fromElementId: number;
  toElementId: number;
  label?: string;
  createdAt: Date;
}

/**
 * Diagram Text
 */
export interface DiagramText {
  id: number;
  snapshotId: number;
  elementType: 'text';
  x: number;
  y: number;
  label: string;
  createdAt: Date;
}

/**
 * Diagram Element Union Type
 */
export type DiagramElement = DiagramBox | DiagramArrow | DiagramText;

/**
 * Diagram Snapshot
 * Captures the whiteboard state at a point in time
 */
export interface DiagramSnapshot {
  id: number;
  sessionId: number;
  snapshotAt: Date;
  secondsElapsed: number;
  phase: InterviewPhase;
  createdAt: Date;
  elements?: DiagramElement[];  // Populated via join
}

/**
 * Interview Case Expectation
 */
export interface InterviewCaseExpectation {
  id: number;
  caseId: number;
  expectationType: ExpectationType;
  description: string;
  displayOrder: number;
  createdAt: Date;
}

/**
 * Interview Case Tag
 */
export interface InterviewCaseTag {
  id: number;
  caseId: number;
  tag: string;
  createdAt: Date;
}

/**
 * Interview Session
 * The core state model - this is the heart of the system
 */
export interface InterviewSession {
  id: number;
  userId: number;
  caseId: number;

  // Status
  status: InterviewStatus;
  startedAt: Date | null;
  completedAt: Date | null;

  // Current state
  currentPhase: InterviewPhase;
  phaseStartedAt: Date;

  // Metadata
  companyStyle: CompanyStyle;
  level: InterviewLevel;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Related data (populated via joins)
  transcript?: TranscriptMessage[];
  signals?: InterviewSignal[];
  redFlags?: InterviewRedFlag[];
  diagrams?: DiagramSnapshot[];
}

/**
 * Interview Case
 * A system design problem (e.g., "Design URL Shortener")
 */
export interface InterviewCase {
  id: number;

  // Basic info
  title: string;
  slug: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';

  // Problem definition
  problemStatement: string;

  // Metadata
  estimatedDuration: number;        // Minutes

  // Status
  isActive: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Related data (populated via joins)
  expectations?: InterviewCaseExpectation[];
  tags?: InterviewCaseTag[];
}

/**
 * Feedback Item Type
 */
export type FeedbackItemType = 'strength' | 'weakness' | 'suggestion';

/**
 * Feedback Item
 * Specific piece of feedback
 */
export interface FeedbackItem {
  id: number;
  reportId: number;
  itemType: FeedbackItemType;
  title: string;
  description: string;
  timestampSeconds?: number;        // When in the interview this happened
  phase?: InterviewPhase;
  displayOrder: number;
  createdAt: Date;
}

/**
 * Feedback Next Step
 */
export interface FeedbackNextStep {
  id: number;
  reportId: number;
  description: string;
  priority: number;
  createdAt: Date;
}

/**
 * Feedback Report
 * Generated after interview completion
 */
export interface FeedbackReport {
  id: number;
  sessionId: number;
  userId: number;

  // Scores (0-100)
  overallScore: number;
  requirementsScore: number;
  designScore: number;
  communicationScore: number;
  timeManagementScore: number;
  depthScore: number;

  // Timestamps
  generatedAt: Date;
  createdAt: Date;

  // Related data (populated via joins)
  items?: FeedbackItem[];
  nextSteps?: FeedbackNextStep[];
}

/**
 * User (simplified for MVP)
 */
export interface User {
  id: number;
  email: string;

  // Profile
  name?: string;
  targetLevel?: InterviewLevel;

  // Subscription
  subscriptionStatus: 'free' | 'pro' | 'cancelled';
  subscriptionExpiresAt?: Date;
  stripeCustomerId?: string;

  // Usage tracking
  interviewsCompleted: number;
  interviewsRemaining: number;      // For free tier

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * Interview Statistics
 * Aggregated stats for a user (computed, not stored)
 */
export interface UserStatistics {
  userId: number;

  totalInterviews: number;
  completedInterviews: number;
  abandonedInterviews: number;

  averageScore: number;
  averageDuration: number;

  mostImprovedAreas: string[];
  areasNeedingWork: string[];

  lastUpdated: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to start a new interview
 */
export interface StartInterviewRequest {
  caseId: number;
  level?: InterviewLevel;
  companyStyle?: CompanyStyle;
}

/**
 * Response when starting an interview
 */
export interface StartInterviewResponse {
  session: InterviewSession;
  case: InterviewCase;
  initialMessage: string;
}

/**
 * Request to send a user message
 */
export interface SendMessageRequest {
  sessionId: number;
  text: string;
}

/**
 * Response after sending a message
 */
export interface SendMessageResponse {
  userMessage: TranscriptMessage;
  interviewerMessage: TranscriptMessage;
  currentPhase: InterviewPhase;
  secondsElapsed: number;
  newSignals?: SignalName[];
  newRedFlags?: RedFlagName[];
}

/**
 * Request to update diagram
 */
export interface UpdateDiagramRequest {
  sessionId: number;
  elements: Omit<DiagramElement, 'id' | 'snapshotId' | 'createdAt'>[];
}

/**
 * Complete interview request
 */
export interface CompleteInterviewRequest {
  sessionId: number;
}

/**
 * Complete interview response
 */
export interface CompleteInterviewResponse {
  session: InterviewSession;
  feedbackReport: FeedbackReport;
}
