import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class PhaseMetadataDto {
  @ApiProperty({ description: 'Phase display name' })
  name: string;

  @ApiProperty({ description: 'Phase description' })
  description: string;

  @ApiProperty({ description: 'Phase order (1-6)' })
  order: number;

  @ApiProperty({ description: 'Recommended time for this phase in minutes' })
  recommendedMinutes: number;
}

export class UsageDto {
  @ApiProperty({ description: 'Input tokens consumed' })
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens generated' })
  outputTokens: number;
}

export class SignalCoverageDto {
  @ApiProperty({ description: 'Percentage of signals detected (0-100)' })
  coverage: number;

  @ApiProperty({
    description: 'List of signal names not yet detected',
    type: [String],
    example: ['asked_functional_reqs', 'proposed_api'],
  })
  missingSignals: string[];
}

export class InterviewCaseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty: string;
}

export class SessionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  caseId: number;

  @ApiProperty({
    enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
  })
  status: string;

  @ApiProperty({ nullable: true })
  startedAt: Date | null;

  @ApiProperty({ nullable: true })
  completedAt: Date | null;

  @ApiProperty({
    enum: [
      'problem',
      'requirements',
      'high_level',
      'deep_dive',
      'bottlenecks',
      'wrap_up',
    ],
  })
  currentPhase: string;

  @ApiProperty()
  phaseStartedAt: Date;

  @ApiProperty({ enum: ['faang', 'startup', 'generic'] })
  companyStyle: string;

  @ApiProperty({ enum: ['mid', 'senior', 'staff'] })
  level: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false, type: InterviewCaseDto })
  interviewCase?: InterviewCaseDto;
}

export class MessageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty({ enum: ['user', 'interviewer', 'candidate'] })
  role: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  phase: string;

  @ApiProperty()
  secondsElapsed: number;

  @ApiProperty()
  createdAt: Date;
}

export class SignalResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  signalName: string;

  @ApiProperty()
  detectedAt: Date;

  @ApiProperty()
  secondsElapsed: number;

  @ApiProperty()
  phase: string;
}

export class RedFlagResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  flagName: string;

  @ApiProperty()
  detectedAt: Date;

  @ApiProperty()
  secondsElapsed: number;

  @ApiProperty()
  phase: string;

  @ApiProperty({ required: false })
  description?: string;
}

// Wrapper response DTOs
export class CreateSessionResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    session: SessionResponseDto;
    phaseMetadata: PhaseMetadataDto;
    progress: number;
  };
}

export class GetSessionResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    session: SessionResponseDto;
    elapsedSeconds: number;
    phaseElapsedSeconds: number;
    phaseMetadata: PhaseMetadataDto;
    progress: number;
  };
}

export class StartSessionResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: {
    session: SessionResponseDto;
  };
}

export class GetTranscriptResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    messages: MessageResponseDto[];
    count: number;
  };
}

export class AiResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    candidateMessage: MessageResponseDto;
    interviewerMessage: MessageResponseDto;
    detectedSignals: SignalResponseDto[];
    detectedRedFlags: RedFlagResponseDto[];
    usage: UsageDto;
  };
}

export class GetSignalsResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    signals: SignalResponseDto[];
    missingSignals: string[];
    coverage: number;
    count: number;
  };
}

export class GetRedFlagsResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    redFlags: RedFlagResponseDto[];
    count: number;
    hasRedFlags: boolean;
  };
}

export class PhaseWithMetadataDto {
  @ApiProperty({
    enum: [
      'problem',
      'requirements',
      'high_level',
      'deep_dive',
      'bottlenecks',
      'wrap_up',
    ],
    description: 'Phase identifier',
  })
  phase: string;

  @ApiProperty({
    type: PhaseMetadataDto,
    description: 'Phase display information',
  })
  metadata: PhaseMetadataDto;

  @ApiProperty({ description: 'Whether this is the current phase' })
  isCurrent: boolean;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;
}

export class GetPhasesResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    phases: PhaseWithMetadataDto[];
    currentPhase: string;
  };
}

export class AdvancePhaseResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: {
    session: SessionResponseDto;
    currentPhase: string;
    isCompleted: boolean;
    detectedRedFlags: RedFlagResponseDto[];
  };
}

export class AddMessageResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    message: MessageResponseDto;
  };
}

export class AiRequestDto {
  @ApiProperty({ description: 'Candidate message text' })
  @IsString()
  text: string;
}

export class RetryConversationDto {
  @ApiProperty({ description: 'ID of the candidate message to retry' })
  @IsNumber()
  candidateMessageId: number;
}

export class FeedbackItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  reportId: number;

  @ApiProperty({ enum: ['strength', 'weakness', 'suggestion'] })
  itemType: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ required: false })
  timestampSeconds?: number;

  @ApiProperty({ required: false })
  phase?: string;

  @ApiProperty()
  displayOrder: number;

  @ApiProperty()
  createdAt: Date;
}

export class FeedbackNextStepDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  reportId: number;

  @ApiProperty()
  stepText: string;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  createdAt: Date;
}

export class FeedbackReportDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  overallScore: number;

  @ApiProperty()
  requirementsScore: number;

  @ApiProperty()
  designScore: number;

  @ApiProperty()
  communicationScore: number;

  @ApiProperty()
  timeManagementScore: number;

  @ApiProperty()
  depthScore: number;

  @ApiProperty()
  generatedAt: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [FeedbackItemDto], required: false })
  items?: FeedbackItemDto[];

  @ApiProperty({ type: [FeedbackNextStepDto], required: false })
  nextSteps?: FeedbackNextStepDto[];
}

export class GenerateFeedbackResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty()
  data: FeedbackReportDto;
}

export class GetFeedbackResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: FeedbackReportDto;
}

export class UserResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  subscriptionStatus: string;

  @ApiProperty()
  interviewsCompleted: number;

  @ApiProperty()
  interviewsRemaining: number;
}

export class DashboardSessionDto {
  @ApiProperty()
  id: number;

  @ApiProperty({
    enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
  })
  status: string;

  @ApiProperty({ nullable: true })
  startedAt: Date | null;

  @ApiProperty({ nullable: true })
  completedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: InterviewCaseDto })
  interviewCase: InterviewCaseDto;

  @ApiProperty({
    nullable: true,
    description: 'Overall score if feedback exists',
  })
  overallScore?: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Requirements score if feedback exists',
  })
  requirementsScore?: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Design score if feedback exists',
  })
  designScore?: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Communication score if feedback exists',
  })
  communicationScore?: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Time management score if feedback exists',
  })
  timeManagementScore?: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Depth score if feedback exists',
  })
  depthScore?: number | null;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Total number of sessions' })
  totalSessions: number;

  @ApiProperty({ description: 'Number of completed sessions' })
  completedSessions: number;

  @ApiProperty({
    description:
      'Average overall score across completed sessions with feedback',
  })
  averageScore: number | null;
}

export class GetDashboardResponseDto {
  @ApiProperty({ default: true })
  success: boolean;

  @ApiProperty()
  data: {
    sessions: DashboardSessionDto[];
    stats: DashboardStatsDto;
  };
}
