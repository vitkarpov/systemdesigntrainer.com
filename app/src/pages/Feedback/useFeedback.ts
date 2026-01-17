import {
  useSessionsControllerGetFeedback,
  useSessionsControllerGetFeedbackStatus,
  useSessionsControllerGenerateFeedback,
} from "@/api/hooks.gen";
import { posthog } from "@/lib/posthog";
import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";

export type FeedbackState =
  | "checking" // Initial load, checking status
  | "processing" // Feedback is being generated
  | "loading" // Feedback completed, fetching data
  | "ready" // Feedback loaded and ready to display
  | "failed" // Generation failed
  | "not_found"; // No feedback exists

export function useFeedback() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const sessionIdNum = Number(sessionId);

  const { data: statusData, isLoading: isStatusLoading } =
    useSessionsControllerGetFeedbackStatus(sessionIdNum, {
      query: {
        enabled: !!sessionId,
        throwOnError: true,
        refetchInterval: (query) => {
          const status = query.state.data?.data?.status;
          if (
            status === "completed" ||
            status === "failed" ||
            status === "not_started"
          ) {
            return false;
          }
          return 1000;
        },
      },
    });

  const statusInfo = statusData?.data;

  const { data: feedbackData, isLoading: isFeedbackLoading } =
    useSessionsControllerGetFeedback(sessionIdNum, {
      query: {
        enabled: statusInfo?.status === "completed",
        retry: false,
        throwOnError: true,
      },
    });

  // Mutation to start feedback generation (used for manual retry)
  const generateMutation = useSessionsControllerGenerateFeedback();

  const feedback = feedbackData?.data;

  const state: FeedbackState = useMemo(() => {
    if (isStatusLoading) {
      return "checking";
    }

    if (statusInfo?.status === "processing" || generateMutation.isPending) {
      return "processing";
    }

    if (statusInfo?.status === "failed") {
      return "failed";
    }

    if (statusInfo?.status === "completed") {
      if (isFeedbackLoading) {
        return "loading";
      }
      if (feedback) {
        return "ready";
      }
    }

    return "not_found";
  }, [
    isStatusLoading,
    statusInfo?.status,
    generateMutation.isPending,
    isFeedbackLoading,
    feedback,
  ]);

  const handleRetry = () => {
    generateMutation.mutate({ id: sessionIdNum });
  };

  useEffect(() => {
    if (feedback) {
      posthog.capture("feedback_viewed", {
        sessionId: sessionIdNum,
        overallScore: feedback.overallScore,
        requirementsScore: feedback.requirementsScore,
        designScore: feedback.designScore,
        communicationScore: feedback.communicationScore,
      });
    }
  }, [feedback, sessionIdNum]);

  return {
    state,
    feedback,
    handleRetry,
  };
}
