import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Page, Container, Stack } from "@/components/layout";
import { useFeedback } from "./useFeedback";
import { LoadingState } from "./states/LoadingState";
import { ProcessingState } from "./states/ProcessingState";
import { ErrorState } from "@/pages/shared/ErrorState";
import { NotFoundState } from "@/pages/shared/NotFoundState";
import { OverallScoreCard } from "./components/OverallScoreCard";
import { ScoreBreakdownCard } from "./components/ScoreBreakdownCard";
import { FeedbackItemsCard } from "./components/FeedbackItemsCard";
import { NextStepsCard } from "./components/NextStepsCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";

function FeedbackPage() {
  const navigate = useNavigate();
  const { state, feedback, handleRetry } = useFeedback();

  const handleBackToHome = () => navigate("/");

  if (state === "checking" || state === "loading") {
    return <LoadingState />;
  }

  if (state === "processing") {
    return <ProcessingState />;
  }

  if (state === "failed") {
    return <ErrorState onRetry={handleRetry} onBackToHome={handleBackToHome} />;
  }

  if (state === "not_found") {
    return (
      <NotFoundState
        onBackToHome={handleBackToHome}
        title="Feedback Not Found"
        message="The feedback you're looking for doesn't exist or hasn't been generated yet."
      />
    );
  }

  if (!feedback) {
    throw new Error("Feedback not found");
  }

  return (
    <Page>
      <Stack gap="6">
        <PageHeader
          backLabel="Back to Dashboard"
          onBack={handleBackToHome}
          rightContent={
            <Button onClick={handleBackToHome}>New Interview</Button>
          }
        />
        <Container maxWidth="6xl" gap="6">
          {feedback.overallSummary && (
            <Card className="p-6">
              <ReactMarkdown>{feedback.overallSummary}</ReactMarkdown>
            </Card>
          )}

          <OverallScoreCard score={feedback.overallScore} />

          <ScoreBreakdownCard
            requirementsScore={feedback.requirementsScore}
            designScore={feedback.designScore}
            communicationScore={feedback.communicationScore}
            timeManagementScore={feedback.timeManagementScore}
            depthScore={feedback.depthScore}
          />

          {feedback.items && (
            <Stack gap="6">
              <FeedbackItemsCard items={feedback.items} type="strength" />
              <FeedbackItemsCard items={feedback.items} type="weakness" />
              <FeedbackItemsCard items={feedback.items} type="suggestion" />
            </Stack>
          )}

          <NextStepsCard steps={feedback.nextSteps || []} />
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
      onBackToHome={() => navigate("/")}
      onReset={() => queryClient.invalidateQueries()}
    >
      <FeedbackPage />
    </ErrorBoundary>
  );
}
