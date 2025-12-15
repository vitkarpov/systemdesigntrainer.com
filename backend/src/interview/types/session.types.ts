// Session status enum
export enum SessionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

// Interview phase enum
export enum InterviewPhase {
  PROBLEM = 'problem',
  REQUIREMENTS = 'requirements',
  HIGH_LEVEL = 'high_level',
  DEEP_DIVE = 'deep_dive',
  BOTTLENECKS = 'bottlenecks',
  WRAP_UP = 'wrap_up',
}

// Message role enum
export enum MessageRole {
  INTERVIEWER = 'interviewer',
  CANDIDATE = 'candidate',
  SYSTEM = 'system',
}

// Phase transition result
export interface PhaseTransitionResult {
  success: boolean;
  currentPhase: InterviewPhase;
  nextPhase: InterviewPhase | null;
  error?: string;
}

// Session state interface
export interface SessionState {
  id: number;
  userId: number;
  caseId: number;
  status: SessionStatus;
  currentPhase: InterviewPhase;
  startedAt: Date | null;
  completedAt: Date | null;
  phaseStartedAt: Date;
  companyStyle: string;
  level: string;
  createdAt: Date;
  updatedAt: Date;
}

// Transcript message interface
export interface TranscriptMessage {
  id: number;
  sessionId: number;
  role: string;
  text: string;
  phase: string;
  secondsElapsed: number;
  createdAt: Date;
}
