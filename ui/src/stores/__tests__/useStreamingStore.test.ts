import { describe, it, expect, beforeEach, vi } from "vitest";
import { useStreamingStore } from "../useStreamingStore";

describe("useStreamingStore", () => {
  const sessionId = 123;

  beforeEach(() => {
    useStreamingStore.getState().clearStream(sessionId);
  });

  describe("streaming lifecycle", () => {
    it("should start streaming with abort controller", () => {
      const { startStreaming } = useStreamingStore.getState();
      const abortController = new AbortController();

      startStreaming(sessionId, abortController);

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId]?.isStreaming).toBe(true);
      expect(state.streams[sessionId]?.streamingText).toBe("");
      expect(state.streams[sessionId]?.abortController).toBe(abortController);
    });

    it("should append text during streaming", () => {
      const { startStreaming, appendStreamText } = useStreamingStore.getState();
      const abortController = new AbortController();

      startStreaming(sessionId, abortController);
      appendStreamText(sessionId, "Hello ");
      appendStreamText(sessionId, "world");

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId]?.streamingText).toBe("Hello world");
      expect(state.streams[sessionId]?.isStreaming).toBe(true);
    });

    it("should not append text if stream does not exist", () => {
      const { appendStreamText } = useStreamingStore.getState();

      // Should not throw error
      appendStreamText(999, "Hello");

      const state = useStreamingStore.getState();
      expect(state.streams[999]).toBeUndefined();
    });

    it("should complete streaming and reset state", () => {
      const { startStreaming, appendStreamText, completeStreaming } =
        useStreamingStore.getState();
      const abortController = new AbortController();

      startStreaming(sessionId, abortController);
      appendStreamText(sessionId, "Test message");

      expect(
        useStreamingStore.getState().streams[sessionId]?.streamingText,
      ).toBe("Test message");

      completeStreaming(sessionId);

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId]?.isStreaming).toBe(false);
      expect(state.streams[sessionId]?.streamingText).toBe("");
      expect(state.streams[sessionId]?.abortController).toBeNull();
    });

    it("should handle streaming error", () => {
      const { startStreaming, appendStreamText, errorStreaming } =
        useStreamingStore.getState();
      const abortController = new AbortController();

      startStreaming(sessionId, abortController);
      appendStreamText(sessionId, "Partial message");

      errorStreaming(sessionId);

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId]?.isStreaming).toBe(false);
      expect(state.streams[sessionId]?.streamingText).toBe("");
      expect(state.streams[sessionId]?.abortController).toBeNull();
    });

    it("should cancel streaming and abort request", () => {
      const { startStreaming, appendStreamText, cancelStreaming } =
        useStreamingStore.getState();
      const abortController = new AbortController();
      const abortSpy = vi.spyOn(abortController, "abort");

      startStreaming(sessionId, abortController);
      appendStreamText(sessionId, "Cancelling...");

      cancelStreaming(sessionId);

      expect(abortSpy).toHaveBeenCalled();

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId]?.isStreaming).toBe(false);
      expect(state.streams[sessionId]?.streamingText).toBe("");
      expect(state.streams[sessionId]?.abortController).toBeNull();
    });
  });

  describe("multiple sessions", () => {
    it("should handle multiple concurrent streams", () => {
      const { startStreaming, appendStreamText } = useStreamingStore.getState();
      const sessionId1 = 100;
      const sessionId2 = 200;
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      startStreaming(sessionId1, controller1);
      startStreaming(sessionId2, controller2);

      appendStreamText(sessionId1, "Stream 1");
      appendStreamText(sessionId2, "Stream 2");

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId1]?.streamingText).toBe("Stream 1");
      expect(state.streams[sessionId2]?.streamingText).toBe("Stream 2");
      expect(state.streams[sessionId1]?.isStreaming).toBe(true);
      expect(state.streams[sessionId2]?.isStreaming).toBe(true);
    });

    it("should isolate session streams", () => {
      const { startStreaming, appendStreamText, completeStreaming } =
        useStreamingStore.getState();
      const sessionId1 = 100;
      const sessionId2 = 200;
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      startStreaming(sessionId1, controller1);
      startStreaming(sessionId2, controller2);

      appendStreamText(sessionId1, "Message 1");
      appendStreamText(sessionId2, "Message 2");

      // Complete only sessionId1
      completeStreaming(sessionId1);

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId1]?.isStreaming).toBe(false);
      expect(state.streams[sessionId2]?.isStreaming).toBe(true);
      expect(state.streams[sessionId2]?.streamingText).toBe("Message 2");
    });
  });

  describe("selectors", () => {
    it("should get abort controller for session", () => {
      const { startStreaming, getAbortController } =
        useStreamingStore.getState();
      const abortController = new AbortController();

      startStreaming(sessionId, abortController);

      expect(getAbortController(sessionId)).toBe(abortController);
    });

    it("should return null for non-existent session", () => {
      const { getAbortController } = useStreamingStore.getState();

      expect(getAbortController(999)).toBeNull();
    });
  });

  describe("cleanup", () => {
    it("should clear stream for session", () => {
      const { startStreaming, appendStreamText, clearStream } =
        useStreamingStore.getState();
      const abortController = new AbortController();

      startStreaming(sessionId, abortController);
      appendStreamText(sessionId, "Test");

      expect(useStreamingStore.getState().streams[sessionId]).toBeDefined();

      clearStream(sessionId);

      expect(useStreamingStore.getState().streams[sessionId]).toBeUndefined();
    });

    it("should not affect other sessions when clearing", () => {
      const { startStreaming, clearStream } = useStreamingStore.getState();
      const sessionId1 = 100;
      const sessionId2 = 200;
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      startStreaming(sessionId1, controller1);
      startStreaming(sessionId2, controller2);

      clearStream(sessionId1);

      const state = useStreamingStore.getState();
      expect(state.streams[sessionId1]).toBeUndefined();
      expect(state.streams[sessionId2]).toBeDefined();
    });
  });
});
