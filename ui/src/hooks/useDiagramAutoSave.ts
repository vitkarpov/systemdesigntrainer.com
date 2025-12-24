import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionsControllerSaveDiagram } from "../api/hooks.gen";
import { useDiagramStore } from "../stores";

interface UseDiagramAutoSaveOptions {
  sessionId: number;
  enabled: boolean;
}

export function useDiagramAutoSave({
  sessionId,
  enabled,
}: UseDiagramAutoSaveOptions) {
  // Read from store
  const diagram = useDiagramStore((state) => state.getDiagram(sessionId));
  const nodes = diagram?.nodes || [];
  const edges = diagram?.edges || [];
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved",
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveMutation = useSessionsControllerSaveDiagram();
  const queryClient = useQueryClient();

  // Keep refs for stable access in timeout
  const saveMutationRef = useRef(saveMutation);
  const queryClientRef = useRef(queryClient);

  // Update refs when they change
  useEffect(() => {
    saveMutationRef.current = saveMutation;
    queryClientRef.current = queryClient;
  }, [saveMutation, queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Mark as unsaved
    setSaveStatus("unsaved");

    // Set new timeout for save (2 second debounce)
    timeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveMutationRef.current.mutateAsync({
          id: sessionId,
          data: { nodes, edges },
        });
        setSaveStatus("saved");

        // Don't invalidate queries - it causes a refetch loop
        // The saved data is already in the mutation response
      } catch (error) {
        console.error("Failed to save diagram:", error);
        setSaveStatus("unsaved");
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // Only depend on nodes, edges, sessionId, and enabled
    // nodes and edges are new references from react-flow when they change
  }, [nodes, edges, sessionId, enabled]);

  return { saveStatus };
}
