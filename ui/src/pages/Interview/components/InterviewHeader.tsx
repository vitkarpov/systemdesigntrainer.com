import { ArrowLeft } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { PhaseDisplay } from '../../../components/PhaseDisplay';
import { formatElapsedTime } from '../../../lib/utils';

interface PhaseMetadata {
  name: string;
  description: string;
  order: number;
  recommendedMinutes: number;
}

interface InterviewHeaderProps {
  sessionTitle: string;
  elapsedTime: number;
  sessionStatus: 'in_progress' | 'completed';
  currentPhase: string;
  phaseMetadata?: PhaseMetadata;
  phaseElapsedSeconds?: number;
  isAdvancing: boolean;
  isEnding: boolean;
  onBack: () => void;
  onAdvancePhase: () => void;
  onEndInterview: () => void;
}

export function InterviewHeader({
  sessionTitle,
  elapsedTime,
  sessionStatus,
  currentPhase,
  phaseMetadata,
  phaseElapsedSeconds,
  isAdvancing,
  isEnding,
  onBack,
  onAdvancePhase,
  onEndInterview,
}: InterviewHeaderProps) {
  return (
    <div className="border-b px-6 py-4 bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-lg font-semibold">{sessionTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground font-medium">
            Total: {formatElapsedTime(elapsedTime)}
          </div>
          {sessionStatus === 'in_progress' && (
            <>
              {currentPhase !== 'wrap_up' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAdvancePhase}
                  disabled={isAdvancing}
                >
                  Next Phase
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={onEndInterview}
                disabled={isEnding}
              >
                {isEnding ? 'Ending...' : 'End Interview'}
              </Button>
            </>
          )}
          {sessionStatus === 'completed' && (
            <div className="text-sm font-medium text-muted-foreground">
              Interview Completed
            </div>
          )}
        </div>
      </div>
      {phaseMetadata && (
        <PhaseDisplay
          phaseMetadata={phaseMetadata}
          phaseElapsedSeconds={phaseElapsedSeconds ?? 0}
        />
      )}
    </div>
  );
}
