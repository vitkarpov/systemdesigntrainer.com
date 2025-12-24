import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface StreamData {
  streamingText: string;
  isStreaming: boolean;
  abortController: AbortController | null;
}

interface StreamingState {
  // State: Keyed by sessionId
  streams: Record<number, StreamData>;

  // Selectors
  getStream: (
    sessionId: number,
  ) => { streamingText: string; isStreaming: boolean } | null;
  isStreamingForSession: (sessionId: number) => boolean;
  getAbortController: (sessionId: number) => AbortController | null;

  // Actions
  startStreaming: (sessionId: number, abortController: AbortController) => void;
  appendStreamText: (sessionId: number, text: string) => void;
  completeStreaming: (sessionId: number) => void;
  errorStreaming: (sessionId: number) => void;
  cancelStreaming: (sessionId: number) => void;
  clearStream: (sessionId: number) => void;
}

const initialStreamData: StreamData = {
  streamingText: "",
  isStreaming: false,
  abortController: null,
};

export const useStreamingStore = create<StreamingState>()(
  devtools(
    (set, get) => ({
      streams: {},

      // Selectors
      getStream: (sessionId) => {
        const stream = get().streams[sessionId];
        if (!stream) return null;
        return {
          streamingText: stream.streamingText,
          isStreaming: stream.isStreaming,
        };
      },

      isStreamingForSession: (sessionId) => {
        return get().streams[sessionId]?.isStreaming ?? false;
      },

      getAbortController: (sessionId) => {
        return get().streams[sessionId]?.abortController ?? null;
      },

      // Actions
      startStreaming: (sessionId, abortController) =>
        set(
          (state) => ({
            streams: {
              ...state.streams,
              [sessionId]: {
                streamingText: "",
                isStreaming: true,
                abortController,
              },
            },
          }),
          false,
          "startStreaming",
        ),

      appendStreamText: (sessionId, text) =>
        set(
          (state) => {
            const stream = state.streams[sessionId];
            if (!stream) return state;

            return {
              streams: {
                ...state.streams,
                [sessionId]: {
                  ...stream,
                  streamingText: stream.streamingText + text,
                },
              },
            };
          },
          false,
          "appendStreamText",
        ),

      completeStreaming: (sessionId) =>
        set(
          (state) => {
            const stream = state.streams[sessionId];
            if (!stream) return state;

            return {
              streams: {
                ...state.streams,
                [sessionId]: {
                  ...stream,
                  streamingText: "",
                  isStreaming: false,
                  abortController: null,
                },
              },
            };
          },
          false,
          "completeStreaming",
        ),

      errorStreaming: (sessionId) =>
        set(
          (state) => {
            const stream = state.streams[sessionId];
            if (!stream) return state;

            return {
              streams: {
                ...state.streams,
                [sessionId]: {
                  ...stream,
                  streamingText: "",
                  isStreaming: false,
                  abortController: null,
                },
              },
            };
          },
          false,
          "errorStreaming",
        ),

      cancelStreaming: (sessionId) =>
        set(
          (state) => {
            const stream = state.streams[sessionId];
            if (!stream) return state;

            // Abort the request
            stream.abortController?.abort();

            return {
              streams: {
                ...state.streams,
                [sessionId]: {
                  ...initialStreamData,
                },
              },
            };
          },
          false,
          "cancelStreaming",
        ),

      clearStream: (sessionId) =>
        set(
          (state) => {
            const { [sessionId]: _, ...rest } = state.streams;
            return { streams: rest };
          },
          false,
          "clearStream",
        ),
    }),
    { name: "StreamingStore" },
  ),
);
