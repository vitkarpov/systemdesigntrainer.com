import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { Page, Container, Stack } from '@/components/layout';
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
import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';
import { posthog } from '@/lib/posthog';

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

  // Use feedback from main endpoint (which polls until ready)
  // Fallback to status feedback if status shows completed
  const completedFeedback = feedback || (statusInfo?.status === 'completed' ? statusInfo.feedback : null);

  // Track feedback viewed when feedback is loaded
  useEffect(() => {
    if (completedFeedback) {
      posthog.capture('feedback_viewed', {
        sessionId: sessionIdNum,
        overallScore: completedFeedback.overallScore,
        requirementsScore: completedFeedback.requirementsScore,
        designScore: completedFeedback.designScore,
        communicationScore: completedFeedback.communicationScore,
      });
    }
  }, [completedFeedback, sessionIdNum]);


  // Show loading state while checking for feedback or generating
  if (isFeedbackLoading || isStatusLoading) {
    return <LoadingState />;
  }

  // Show generation in progress
  if (statusInfo?.status === 'processing' || generateMutation.isPending) {
    return <ProcessingState />;
  }

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
    <Page>
      <Stack gap="6">
        <PageHeader
          backLabel="Back to Dashboard"
          onBack={handleBackToHome}
          rightContent={<Button onClick={handleBackToHome}>New Interview</Button>}
        />
        <Container maxWidth="6xl" gap="6">
          {completedFeedback.overallSummary && (
            <Card className="p-6">
              <ReactMarkdown>
                {completedFeedback.overallSummary}
              </ReactMarkdown>
            </Card>
          )}

          <OverallScoreCard score={completedFeedback.overallScore} />

          <ScoreBreakdownCard
            requirementsScore={completedFeedback.requirementsScore}
            designScore={completedFeedback.designScore}
            communicationScore={completedFeedback.communicationScore}
            timeManagementScore={completedFeedback.timeManagementScore}
            depthScore={completedFeedback.depthScore}
          />

          {completedFeedback.items && (
            <Stack gap="6">
              <FeedbackItemsCard items={completedFeedback.items} type="strength" />
              <FeedbackItemsCard items={completedFeedback.items} type="weakness" />
              <FeedbackItemsCard items={completedFeedback.items} type="suggestion" />
            </Stack>
          )}

          <NextStepsCard steps={completedFeedback.nextSteps || []} />
          <div className="h-4" />
        </Container>
      </Stack>
    </Page>
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
