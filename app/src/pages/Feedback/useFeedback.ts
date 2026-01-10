import {
  useSessionsControllerGetFeedback,
  useSessionsControllerGetFeedbackStatus,
  useSessionsControllerGenerateFeedback,
} from "@/api/hooks.gen";

export function useFeedback(sessionIdNum: number, isValidId: boolean) {
  // Get feedback status first to determine if we need to poll
  const {
    data: statusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useSessionsControllerGetFeedbackStatus(sessionIdNum, {
    query: {
      enabled: isValidId,
      throwOnError: true,
      refetchInterval: (query) => {
        const status = query.state.data?.data?.status;
        // Poll every second while processing or when status is unknown
        // Only stop polling when we get a definitive final state
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

  const handleRetry = () => {
    generateMutation.mutate({ id: sessionIdNum });
  };

  return {
    feedback,
    statusInfo,
    isFeedbackLoading,
    isStatusLoading,
    generateMutation,
    handleRetry,
    refetchStatus,
  };
}
