import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface OptimisticMessage {
  text: string;
  timestamp: number;
}

interface InterviewState {
  // State
  inputValue: string;
  optimisticMessage: OptimisticMessage | null;

  // Actions
  setInputValue: (value: string) => void;
  clearInput: () => void;
  setOptimisticMessage: (message: OptimisticMessage | null) => void;
  reset: () => void;
}

const initialState = {
  inputValue: "",
  optimisticMessage: null,
};

export const useInterviewStore = create<InterviewState>()(
  devtools(
    (set) => ({
      ...initialState,

      setInputValue: (value) =>
        set({ inputValue: value }, false, "setInputValue"),

      clearInput: () => set({ inputValue: "" }, false, "clearInput"),

      setOptimisticMessage: (message) =>
        set({ optimisticMessage: message }, false, "setOptimisticMessage"),

      reset: () => set(initialState, false, "reset"),
    }),
    { name: "InterviewStore" },
  ),
);
