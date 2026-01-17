import { useState, useEffect } from "react";

export interface UseElapsedTimeOptions {
  startedAt: string | null | undefined;
  completedAt: string | null | undefined;
  status: string | undefined;
  serverElapsedSeconds: number | undefined;
}

/**
 * Calculate elapsed time for an interview session
 *
 * For in-progress sessions:
 * - Calculates elapsed time from startedAt timestamp (client-side)
 * - Updates every second
 * - Works correctly with 304 cached responses since startedAt doesn't change
 *
 * For completed sessions:
 * - Uses server-calculated elapsedSeconds for accuracy
 */
export function useElapsedTime(options: UseElapsedTimeOptions): number {
  const { startedAt, status, serverElapsedSeconds } = options;
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (status === "completed") {
      setElapsedTime(serverElapsedSeconds ?? 0);
      return;
    }

    if (status !== "in_progress" || !startedAt) {
      setElapsedTime(0);
      return;
    }

    const calculateElapsed = () => {
      const startTime = new Date(startedAt).getTime();
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return elapsed;
    };

    setElapsedTime(calculateElapsed());

    const timer = setInterval(() => {
      setElapsedTime(calculateElapsed());
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, status, serverElapsedSeconds]);

  return elapsedTime;
}
