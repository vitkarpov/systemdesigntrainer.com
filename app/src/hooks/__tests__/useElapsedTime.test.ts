import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useElapsedTime } from "../useElapsedTime";

describe("useElapsedTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("in_progress sessions", () => {
    it("calculates elapsed time from startedAt timestamp", () => {
      const startedAt = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago

      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt,
          completedAt: null,
          status: "in_progress",
          serverElapsedSeconds: 0,
        }),
      );

      // Should calculate ~5 seconds elapsed
      expect(result.current).toBeGreaterThanOrEqual(4);
      expect(result.current).toBeLessThanOrEqual(6);
    });

    it("updates elapsed time every second", () => {
      const startedAt = new Date(Date.now() - 5000).toISOString();

      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt,
          completedAt: null,
          status: "in_progress",
          serverElapsedSeconds: 0,
        }),
      );

      const initialValue = result.current;

      // Advance time by 1 second
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current).toBe(initialValue + 1);

      // Advance time by another 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current).toBe(initialValue + 3);
    });

    it("recalculates when startedAt changes (should not happen but handled)", () => {
      const startedAt1 = new Date(Date.now() - 5000).toISOString();

      const { result, rerender } = renderHook(
        (props) => useElapsedTime(props),
        {
          initialProps: {
            startedAt: startedAt1,
            completedAt: null,
            status: "in_progress",
            serverElapsedSeconds: 0,
          },
        },
      );

      const firstValue = result.current;
      expect(firstValue).toBeGreaterThanOrEqual(4);

      // Change startedAt to 10 seconds ago
      const startedAt2 = new Date(Date.now() - 10000).toISOString();
      rerender({
        startedAt: startedAt2,
        completedAt: null,
        status: "in_progress",
        serverElapsedSeconds: 0,
      });

      expect(result.current).toBeGreaterThanOrEqual(9);
      expect(result.current).toBeGreaterThan(firstValue);
    });

    it("returns 0 when startedAt is null", () => {
      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: null,
          completedAt: null,
          status: "in_progress",
          serverElapsedSeconds: 0,
        }),
      );

      expect(result.current).toBe(0);
    });
  });

  describe("completed sessions", () => {
    it("uses serverElapsedSeconds for completed sessions", () => {
      const startedAt = new Date(Date.now() - 5000).toISOString();
      const completedAt = new Date().toISOString();

      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt,
          completedAt,
          status: "completed",
          serverElapsedSeconds: 120, // Server says 120 seconds
        }),
      );

      // Should use server value, not calculate from startedAt
      expect(result.current).toBe(120);
    });

    it("does not update elapsed time for completed sessions", () => {
      const startedAt = new Date(Date.now() - 5000).toISOString();
      const completedAt = new Date().toISOString();

      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt,
          completedAt,
          status: "completed",
          serverElapsedSeconds: 120,
        }),
      );

      expect(result.current).toBe(120);

      // Advance time - should not change
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current).toBe(120);
    });

    it("uses 0 when serverElapsedSeconds is undefined", () => {
      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          status: "completed",
          serverElapsedSeconds: undefined,
        }),
      );

      expect(result.current).toBe(0);
    });
  });

  describe("not_started sessions", () => {
    it("returns 0 for not_started sessions", () => {
      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: null,
          completedAt: null,
          status: "not_started",
          serverElapsedSeconds: 0,
        }),
      );

      expect(result.current).toBe(0);
    });

    it("does not update for not_started sessions", () => {
      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: null,
          completedAt: null,
          status: "not_started",
          serverElapsedSeconds: 0,
        }),
      );

      expect(result.current).toBe(0);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current).toBe(0);
    });
  });

  describe("status transitions", () => {
    it("transitions from in_progress to completed", () => {
      const startedAt = new Date(Date.now() - 10000).toISOString();

      const { result, rerender } = renderHook(
        (props) => useElapsedTime(props),
        {
          initialProps: {
            startedAt,
            completedAt: null,
            status: "in_progress",
            serverElapsedSeconds: 0,
          },
        },
      );

      // Should be calculating from startedAt
      const inProgressValue = result.current;
      expect(inProgressValue).toBeGreaterThanOrEqual(9);

      // Transition to completed
      rerender({
        startedAt,
        completedAt: new Date().toISOString(),
        status: "completed",
        serverElapsedSeconds: 125, // Final server calculation
      });

      // Should now use server value
      expect(result.current).toBe(125);

      // Advance time - should not change anymore
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current).toBe(125);
    });
  });

  describe("cleanup", () => {
    it("clears interval on unmount", () => {
      const startedAt = new Date(Date.now() - 5000).toISOString();

      const { unmount } = renderHook(() =>
        useElapsedTime({
          startedAt,
          completedAt: null,
          status: "in_progress",
          serverElapsedSeconds: 0,
        }),
      );

      // Spy on clearInterval
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("handles undefined status", () => {
      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: new Date().toISOString(),
          completedAt: null,
          status: undefined,
          serverElapsedSeconds: 0,
        }),
      );

      expect(result.current).toBe(0);
    });

    it("handles invalid startedAt date string", () => {
      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: "invalid-date",
          completedAt: null,
          status: "in_progress",
          serverElapsedSeconds: 0,
        }),
      );

      // Should handle gracefully - NaN from invalid date becomes a large negative or positive number
      // Just verify it doesn't crash
      expect(typeof result.current).toBe("number");
    });

    it("handles future startedAt (clock skew)", () => {
      const futureDate = new Date(Date.now() + 5000).toISOString(); // 5 seconds in future

      const { result } = renderHook(() =>
        useElapsedTime({
          startedAt: futureDate,
          completedAt: null,
          status: "in_progress",
          serverElapsedSeconds: 0,
        }),
      );

      // Should return negative number or 0
      expect(result.current).toBeLessThanOrEqual(0);
    });
  });
});
