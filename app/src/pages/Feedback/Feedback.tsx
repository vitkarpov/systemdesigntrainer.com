import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { useFeedback } from './useFeedback';
import { LoadingState } from './states/LoadingState';
import { ProcessingState } from './states/ProcessingState';
import { ErrorState } from '@/pages/shared/ErrorState';
import { NotFoundState } from '@/pages/shared/NotFoundState';
import { OverallScoreCard } from './components/OverallScoreCard';
import { ScoreBreakdownCard } from './components/ScoreBreakdownCard';
import { FeedbackItemsCard } from './components/FeedbackItemsCard';
import { NextStepsCard } from './components/NextStepsCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function FeedbackPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const sessionIdNum = Number(sessionId);
  const isValidId = !!sessionId && !isNaN(sessionIdNum);

  const {
    feedback,
    statusInfo,
    isFeedbackLoading,
    isStatusLoading,
    generateMutation,
    handleRetry,
  } = useFeedback(sessionIdNum, isValidId);

  const handleBackToHome = () => navigate('/');

  // Show loading state while checking for feedback or generating
  if (isFeedbackLoading || isStatusLoading) {
    return <LoadingState />;
  }

  // Show generation in progress
  if (statusInfo?.status === 'processing' || generateMutation.isPending) {
    const progress = statusInfo?.progress || 0;
    return <ProcessingState progress={progress} />;
  }

  // Show feedback from status if completed
  const completedFeedback = statusInfo?.status === 'completed' ? statusInfo.feedback : feedback;

  // Show error state for failed feedback generation
  if (statusInfo?.status === 'failed') {
    return (
      <ErrorState
        error={statusInfo?.error}
        onRetry={handleRetry}
        onBackToHome={handleBackToHome}
      />
    );
  }

  // Show not found if no feedback exists
  if (!completedFeedback) {
    return (
      <NotFoundState
        onBackToHome={handleBackToHome}
        title="Feedback Not Found"
        message="The feedback you're looking for doesn't exist or hasn't been generated yet."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 space-y-6">
      <PageHeader
        title="Interview Feedback"
        backLabel="Back to Dashboard"
        onBack={handleBackToHome}
        rightContent={<Button onClick={handleBackToHome}>New Interview</Button>}
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <OverallScoreCard score={completedFeedback.overallScore} />

        <ScoreBreakdownCard
          requirementsScore={completedFeedback.requirementsScore}
          designScore={completedFeedback.designScore}
          communicationScore={completedFeedback.communicationScore}
          timeManagementScore={completedFeedback.timeManagementScore}
          depthScore={completedFeedback.depthScore}
        />

        {completedFeedback.items && (
          <>
            <FeedbackItemsCard items={completedFeedback.items} type="strength" />
            <FeedbackItemsCard items={completedFeedback.items} type="weakness" />
            <FeedbackItemsCard items={completedFeedback.items} type="suggestion" />
          </>
        )}

        <NextStepsCard steps={completedFeedback.nextSteps || []} />
      </div>
    </div>
  );
}

export default function Feedback() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <ErrorBoundary
      context="feedback"
      onBackToHome={() => navigate('/')}
      onReset={() => queryClient.invalidateQueries()}
    >
      <FeedbackPage />
    </ErrorBoundary>
  );
}
