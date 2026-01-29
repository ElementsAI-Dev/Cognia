/**
 * useReactFlowConfig - Shared ReactFlow configuration hook
 * Extracts common configuration and handlers for ReactFlow instances
 */

import { useCallback, useMemo, useRef } from 'react';
import { useReactFlow, type Viewport } from '@xyflow/react';
import type { WorkflowNodeType } from '@/types/workflow/workflow-editor';
import { useWorkflowEditorStore } from '@/stores/workflow';
import { useShallow } from 'zustand/react/shallow';

/**
 * Default ReactFlow props shared between mobile and desktop
 */
export const REACTFLOW_DEFAULT_PROPS = {
  fitView: true,
  fitViewOptions: { padding: 0.2 },
  deleteKeyCode: ['Backspace', 'Delete'] as string[],
  multiSelectionKeyCode: ['Shift', 'Meta', 'Control'] as string[],
  selectionOnDrag: true,
  panOnScroll: true,
  zoomOnPinch: true,
  selectNodesOnDrag: false,
  proOptions: { hideAttribution: true },
  className: 'bg-background touch-none',
} as const;

interface UseReactFlowConfigOptions {
  onDragStart?: (type: WorkflowNodeType) => void;
}

export function useReactFlowConfig(_options: UseReactFlowConfigOptions = {}) {
  const { screenToFlowPosition } = useReactFlow();
  const isDragHistoryPendingRef = useRef(false);

  const {
    addNode,
    setViewport,
    pushHistory,
  } = useWorkflowEditorStore(
    useShallow((state) => ({
      addNode: state.addNode,
      setViewport: state.setViewport,
      pushHistory: state.pushHistory,
    }))
  );

  // Drag over handler for node drops
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Drop handler for adding nodes from palette
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/workflow-node') as WorkflowNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [screenToFlowPosition, addNode]
  );

  // Node drag start handler for history tracking
  const handleNodeDragStart = useCallback(() => {
    isDragHistoryPendingRef.current = true;
  }, []);

  // Node drag stop handler for history tracking
  const handleNodeDragStop = useCallback(() => {
    if (!isDragHistoryPendingRef.current) return;
    isDragHistoryPendingRef.current = false;
    pushHistory();
  }, [pushHistory]);

  // Viewport change handler
  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  // Memoized handlers object
  const handlers = useMemo(
    () => ({
      handleDragOver,
      handleDrop,
      handleNodeDragStart,
      handleNodeDragStop,
      handleMoveEnd,
    }),
    [handleDragOver, handleDrop, handleNodeDragStart, handleNodeDragStop, handleMoveEnd]
  );

  return {
    ...handlers,
    defaultProps: REACTFLOW_DEFAULT_PROPS,
    isDragHistoryPendingRef,
  };
}

export default useReactFlowConfig;
