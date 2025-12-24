import { describe, it, expect, beforeEach } from "vitest";
import { useInterviewStore } from "../useInterviewStore";

describe("useInterviewStore", () => {
  beforeEach(() => {
    useInterviewStore.getState().reset();
  });

  it("should initialize with empty state", () => {
    const state = useInterviewStore.getState();

    expect(state.inputValue).toBe("");
    expect(state.optimisticMessage).toBeNull();
    expect(state.showRetryBanner).toBe(false);
  });

  it("should set input value", () => {
    const { setInputValue } = useInterviewStore.getState();

    setInputValue("Hello world");

    expect(useInterviewStore.getState().inputValue).toBe("Hello world");
  });

  it("should clear input value", () => {
    const { setInputValue, clearInput } = useInterviewStore.getState();

    setInputValue("Hello world");
    expect(useInterviewStore.getState().inputValue).toBe("Hello world");

    clearInput();
    expect(useInterviewStore.getState().inputValue).toBe("");
  });

  it("should set optimistic message", () => {
    const { setOptimisticMessage } = useInterviewStore.getState();
    const message = { text: "Test message", timestamp: Date.now() };

    setOptimisticMessage(message);

    expect(useInterviewStore.getState().optimisticMessage).toEqual(message);
  });

  it("should clear optimistic message", () => {
    const { setOptimisticMessage } = useInterviewStore.getState();
    const message = { text: "Test message", timestamp: Date.now() };

    setOptimisticMessage(message);
    expect(useInterviewStore.getState().optimisticMessage).toEqual(message);

    setOptimisticMessage(null);
    expect(useInterviewStore.getState().optimisticMessage).toBeNull();
  });

  it("should toggle retry banner visibility", () => {
    const { setShowRetryBanner } = useInterviewStore.getState();

    setShowRetryBanner(true);
    expect(useInterviewStore.getState().showRetryBanner).toBe(true);

    setShowRetryBanner(false);
    expect(useInterviewStore.getState().showRetryBanner).toBe(false);
  });

  it("should reset to initial state", () => {
    const { setInputValue, setOptimisticMessage, setShowRetryBanner, reset } =
      useInterviewStore.getState();

    // Modify state
    setInputValue("Test input");
    setOptimisticMessage({ text: "Test", timestamp: Date.now() });
    setShowRetryBanner(true);

    // Verify state is modified
    expect(useInterviewStore.getState().inputValue).toBe("Test input");
    expect(useInterviewStore.getState().optimisticMessage).not.toBeNull();
    expect(useInterviewStore.getState().showRetryBanner).toBe(true);

    // Reset
    reset();

    // Verify state is reset
    expect(useInterviewStore.getState().inputValue).toBe("");
    expect(useInterviewStore.getState().optimisticMessage).toBeNull();
    expect(useInterviewStore.getState().showRetryBanner).toBe(false);
  });
});
