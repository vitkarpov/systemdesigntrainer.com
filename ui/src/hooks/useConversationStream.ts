import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useStreamingStore } from "@/stores";
import {
  getSessionsControllerGetSessionQueryKey,
  getSessionsControllerGetTranscriptQueryKey,
} from "@/api/hooks.gen";
import { getApiBaseUrl } from "@/api/client";

export interface UseConversationStreamOptions {
  sessionId: number;
  onStart?: (data: { candidateMessageId: number }) => void;
  onComplete?: () => void;
  onError?: (
    error: Error,
    errorData?: {
      candidateMessageId?: number;
      partialResponse?: string | null;
    },
  ) => void;
}

interface StreamEvent {
  type: "start" | "delta" | "complete" | "error";
  data: any;
}

export function useConversationStream({
  sessionId,
  onStart,
  onComplete,
  onError,
}: UseConversationStreamOptions) {
  const queryClient = useQueryClient();

  const sendMessage = useCallback(
    async (text: string, diagram?: { nodes: any[]; edges: any[] } | null) => {
      // Check if already streaming
      const isStreaming =
        useStreamingStore.getState().streams[sessionId]?.isStreaming ?? false;
      if (isStreaming) return;

      // Cancel any existing stream and start new one
      useStreamingStore.getState().cancelStreaming(sessionId);

      const abortController = new AbortController();
      useStreamingStore.getState().startStreaming(sessionId, abortController);

      try {
        // Set parameters as cookies to avoid URL length limitations
        document.cookie = `text=${encodeURIComponent(text)}; path=/; SameSite=Lax`;

        // Add diagram data if provided
        if (diagram && diagram.nodes && diagram.nodes.length > 0) {
          const diagramJson = JSON.stringify(diagram);
          document.cookie = `diagramData=${encodeURIComponent(diagramJson)}; path=/; SameSite=Lax`;
        } else {
          // Clear diagram cookie if no diagram provided
          document.cookie =
            "diagramData=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }

        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/sessions/${sessionId}/conversation`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "text/event-stream",
          },
          credentials: "include",
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("Response body is not readable");
        }

        // Read the stream
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim() || abortController.signal.aborted) continue;

            const eventMatch = line.match(/^event: (.+)$/m);
            const dataMatch = line.match(/^data: (.+)$/m);

            if (eventMatch && dataMatch) {
              const eventType = eventMatch[1] as StreamEvent["type"];
              const data = JSON.parse(dataMatch[1]);

              if (eventType === "start") {
                console.log("Stream started:", data);
                if (onStart) {
                  onStart(data);
                }
              } else if (eventType === "delta") {
                useStreamingStore
                  .getState()
                  .appendStreamText(sessionId, data.text);
              } else if (eventType === "complete") {
                console.log("Stream complete:", data);

                useStreamingStore.getState().completeStreaming(sessionId);

                // Refresh transcript and session data
                await Promise.all([
                  queryClient.invalidateQueries({
                    queryKey:
                      getSessionsControllerGetTranscriptQueryKey(sessionId),
                  }),
                  queryClient.invalidateQueries({
                    queryKey:
                      getSessionsControllerGetSessionQueryKey(sessionId),
                  }),
                ]);

                if (onComplete) {
                  onComplete();
                }
              } else if (eventType === "error") {
                const error = new Error(data.message || "Stream error");
                const errorData = {
                  candidateMessageId: data.candidateMessageId,
                  partialResponse: data.partialResponse || null,
                };

                useStreamingStore.getState().errorStreaming(sessionId);

                if (onError) {
                  onError(error, errorData);
                } else {
                  throw error;
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.log("Request was cancelled");
          return;
        }

        console.error("Failed to send message:", err);
        useStreamingStore.getState().errorStreaming(sessionId);

        if (onError && err instanceof Error) {
          onError(err);
        }
      } finally {
        // Clean up cookies after request completes
        document.cookie =
          "text=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie =
          "diagramData=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    },
    [sessionId, queryClient, onStart, onComplete, onError],
  );

  const cancel = useCallback(() => {
    useStreamingStore.getState().cancelStreaming(sessionId);
  }, [sessionId]);

  return {
    sendMessage,
    cancel,
  };
}
