import {
  useSessionsControllerGetFeedback,
  useSessionsControllerGetFeedbackStatus,
  useSessionsControllerGenerateFeedback,
} from "@/api/hooks.gen";

export function useFeedback(sessionIdNum: number, isValidId: boolean) {
  // Try to get existing feedback first
  const {
    data: feedbackData,
    isLoading: isFeedbackLoading,
    error: feedbackError,
  } = useSessionsControllerGetFeedback(sessionIdNum, {
    query: {
      enabled: isValidId,
      retry: false,
    },
  });

  // Get feedback status (for polling)
  const {
    data: statusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useSessionsControllerGetFeedbackStatus(sessionIdNum, {
    query: {
      enabled: isValidId && !feedbackData,
      refetchInterval: (query) => {
        const status = query.state.data?.data?.status;
        // Poll every second while processing
        return status === "processing" ? 1000 : false;
      },
    },
  });

  // Mutation to start feedback generation (used for manual retry)
  const generateMutation = useSessionsControllerGenerateFeedback();

  const feedback = feedbackData?.data;
  const statusInfo = statusData?.data;

  const handleRetry = () => {
    generateMutation.mutate({ id: sessionIdNum });
  };

  return {
    feedback,
    statusInfo,
    isFeedbackLoading,
    isStatusLoading,
    feedbackError,
    generateMutation,
    handleRetry,
    refetchStatus,
  };
}
