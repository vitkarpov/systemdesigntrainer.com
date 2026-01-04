import { useQuery } from "@tanstack/react-query";
import { customInstance } from "@/api/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface TimeoutStatusResponse {
  success: boolean;
  data: {
    shouldShowWarning: boolean;
    shouldAutoEnd: boolean;
    inactiveSeconds: number;
    totalElapsedSeconds: number;
    sessionEnded?: boolean;
    sessionStatus: string;
    reason?: "inactive" | "hard_cap";
  };
}

export function useTimeoutStatus(sessionId: number, enabled: boolean = true) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["session-timeout-status", sessionId],
    queryFn: async () => {
      return customInstance<TimeoutStatusResponse>({
        url: `/sessions/${sessionId}/timeout-status`,
        method: "GET",
      });
    },
    enabled: enabled && !!sessionId,
    refetchInterval: 5000, // Poll every 5 seconds
    retry: false,
  });

  const timeoutStatus = data?.data;

  // Handle auto-end
  useEffect(() => {
    if (timeoutStatus?.sessionEnded) {
      // Navigate to feedback page when session is auto-ended
      navigate(`/feedback/${sessionId}`, {
        state: { autoEnded: true, reason: timeoutStatus.reason },
      });
    }
  }, [timeoutStatus?.sessionEnded, sessionId, navigate, timeoutStatus?.reason]);

  // Reset dismissed state when warning goes away
  useEffect(() => {
    if (!timeoutStatus?.shouldShowWarning) {
      setDismissed(false);
    }
  }, [timeoutStatus?.shouldShowWarning]);

  return {
    shouldShowWarning: timeoutStatus?.shouldShowWarning && !dismissed,
    inactiveSeconds: timeoutStatus?.inactiveSeconds ?? 0,
    totalElapsedSeconds: timeoutStatus?.totalElapsedSeconds ?? 0,
    isLoading,
    dismissWarning: () => setDismissed(true),
  };
}
