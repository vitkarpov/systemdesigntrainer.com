import { describe, it, expect, beforeEach } from "vitest";
import { useInterviewStore } from "@/stores/useInterviewStore";

describe("useInterviewStore", () => {
  beforeEach(() => {
    useInterviewStore.getState().reset();
  });

  it("should initialize with empty state", () => {
    const state = useInterviewStore.getState();

    expect(state.inputValue).toBe("");
    expect(state.optimisticMessage).toBeNull();
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

  it("should reset to initial state", () => {
    const { setInputValue, setOptimisticMessage, reset } =
      useInterviewStore.getState();

    // Modify state
    setInputValue("Test input");
    setOptimisticMessage({ text: "Test", timestamp: Date.now() });

    // Verify state is modified
    expect(useInterviewStore.getState().inputValue).toBe("Test input");
    expect(useInterviewStore.getState().optimisticMessage).not.toBeNull();

    // Reset
    reset();

    // Verify state is reset
    expect(useInterviewStore.getState().inputValue).toBe("");
    expect(useInterviewStore.getState().optimisticMessage).toBeNull();
  });
});
