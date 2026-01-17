import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFeedback } from "../useFeedback";

// Mock the API hooks
vi.mock("@/api/hooks.gen", () => ({
  useSessionsControllerGetFeedbackStatus: vi.fn(),
  useSessionsControllerGetFeedback: vi.fn(),
  useSessionsControllerGenerateFeedback: vi.fn(),
}));

// Mock useParams
vi.mock("react-router-dom", () => ({
  useParams: vi.fn(),
}));

// Mock posthog
vi.mock("@/lib/posthog", () => ({
  posthog: {
    capture: vi.fn(),
  },
}));

import {
  useSessionsControllerGetFeedbackStatus,
  useSessionsControllerGetFeedback,
  useSessionsControllerGenerateFeedback,
} from "@/api/hooks.gen";
import { useParams } from "react-router-dom";
import { posthog } from "@/lib/posthog";

describe("useFeedback", () => {
  const mockSessionId = "123";

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as any).mockReturnValue({ sessionId: mockSessionId });
  });

  describe("State: checking", () => {
    it('returns "checking" state when status is loading', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("checking");
      expect(result.current.feedback).toBeUndefined();
    });
  });

  describe("State: processing", () => {
    it('returns "processing" state when status is "processing"', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "processing" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("processing");
    });

    it('returns "processing" state when generate mutation is pending', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "not_started" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: true,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("processing");
    });
  });

  describe("State: loading", () => {
    it('returns "loading" state when status is completed but feedback is loading', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "completed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("loading");
    });
  });

  describe("State: ready", () => {
    const mockFeedback = {
      id: 1,
      sessionId: 123,
      overallScore: 85,
      requirementsScore: 90,
      designScore: 80,
      communicationScore: 85,
      timeManagementScore: 75,
      depthScore: 88,
      overallSummary: "Great job!",
      items: [],
      nextSteps: [],
      createdAt: new Date().toISOString(),
    };

    it('returns "ready" state when status is completed and feedback is loaded', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "completed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: { data: mockFeedback },
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("ready");
      expect(result.current.feedback).toEqual(mockFeedback);
    });

    it("tracks feedback_viewed event when feedback is loaded", () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "completed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: { data: mockFeedback },
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      renderHook(() => useFeedback());

      expect(posthog.capture).toHaveBeenCalledWith("feedback_viewed", {
        sessionId: 123,
        overallScore: 85,
        requirementsScore: 90,
        designScore: 80,
        communicationScore: 85,
      });
    });
  });

  describe("State: failed", () => {
    it('returns "failed" state when status is "failed"', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "failed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("failed");
    });
  });

  describe("State: not_found", () => {
    it('returns "not_found" state when status is "not_started"', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "not_started" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("not_found");
    });

    it('returns "not_found" state when status is completed but no feedback data', () => {
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "completed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      expect(result.current.state).toBe("not_found");
    });
  });

  describe("State transitions", () => {
    it("transitions from checking -> processing -> loading -> ready", () => {
      const mockFeedback = {
        id: 1,
        sessionId: 123,
        overallScore: 85,
        requirementsScore: 90,
        designScore: 80,
        communicationScore: 85,
        timeManagementScore: 75,
        depthScore: 88,
        overallSummary: "Great job!",
        items: [],
        nextSteps: [],
        createdAt: new Date().toISOString(),
      };

      // Initial: checking
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result, rerender } = renderHook(() => useFeedback());
      expect(result.current.state).toBe("checking");

      // Transition to processing
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "processing" } },
        isLoading: false,
      });
      rerender();
      expect(result.current.state).toBe("processing");

      // Transition to loading (status completed, fetching feedback)
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "completed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: true,
      });
      rerender();
      expect(result.current.state).toBe("loading");

      // Transition to ready
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: { data: mockFeedback },
        isLoading: false,
      });
      rerender();
      expect(result.current.state).toBe("ready");
      expect(result.current.feedback).toEqual(mockFeedback);
    });

    it("transitions from processing -> failed on error", () => {
      // Initial: processing
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "processing" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result, rerender } = renderHook(() => useFeedback());
      expect(result.current.state).toBe("processing");

      // Transition to failed
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "failed" } },
        isLoading: false,
      });
      rerender();
      expect(result.current.state).toBe("failed");
    });
  });

  describe("handleRetry", () => {
    it("calls generateMutation.mutate with correct sessionId", () => {
      const mockMutate = vi.fn();
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: { data: { status: "failed" } },
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: mockMutate,
      });

      const { result } = renderHook(() => useFeedback());

      result.current.handleRetry();

      expect(mockMutate).toHaveBeenCalledWith({ id: 123 });
    });
  });

  describe("Edge cases", () => {
    it("handles missing sessionId from params", () => {
      (useParams as any).mockReturnValue({});
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      // Should handle gracefully - sessionIdNum will be NaN
      expect(result.current.state).toBe("not_found");
    });

    it("handles invalid sessionId from params", () => {
      (useParams as any).mockReturnValue({ sessionId: "invalid" });
      (useSessionsControllerGetFeedbackStatus as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGetFeedback as any).mockReturnValue({
        data: undefined,
        isLoading: false,
      });
      (useSessionsControllerGenerateFeedback as any).mockReturnValue({
        isPending: false,
        mutate: vi.fn(),
      });

      const { result } = renderHook(() => useFeedback());

      // Should handle gracefully - sessionIdNum will be NaN
      expect(result.current.state).toBe("not_found");
    });
  });
});
