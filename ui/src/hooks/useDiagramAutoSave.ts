import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionsControllerSaveDiagram, getSessionsControllerGetDiagramQueryKey } from '../api/hooks.gen';
import type { Node, Edge } from '@xyflow/react';

interface UseDiagramAutoSaveOptions {
  sessionId: number;
  nodes: Node[];
  edges: Edge[];
  enabled: boolean;
}

export function useDiagramAutoSave({
  sessionId,
  nodes,
  edges,
  enabled,
}: UseDiagramAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveMutation = useSessionsControllerSaveDiagram();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || (nodes.length === 0 && edges.length === 0)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Mark as unsaved
    setSaveStatus('unsaved');

    // Set new timeout for save (2 second debounce)
    timeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveMutation.mutateAsync({
          id: sessionId,
          data: { nodes, edges },
        });
        setSaveStatus('saved');

        // Invalidate diagram query to keep cache fresh
        queryClient.invalidateQueries({
          queryKey: getSessionsControllerGetDiagramQueryKey(sessionId),
        });
      } catch (error) {
        console.error('Failed to save diagram:', error);
        setSaveStatus('unsaved');
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, sessionId, enabled, saveMutation, queryClient]);

  return { saveStatus };
}
