'use client';

/**
 * useElementResize - Hook for handling element resize operations in the designer
 * Provides resize handles and dimension updates
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useDesignerStore } from '@/stores/designer';

export type ResizeHandle =
  | 'n'
  | 's'
  | 'e'
  | 'w' // Cardinal directions
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'; // Corners

export interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  elementId: string | null;
}

export interface ElementDimensions {
  width: number | 'auto';
  height: number | 'auto';
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface UseElementResizeOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  snapToGrid?: number;
  preserveAspectRatio?: boolean;
  onResizeStart?: (elementId: string) => void;
  onResize?: (elementId: string, dimensions: ElementDimensions) => void;
  onResizeEnd?: (elementId: string, dimensions: ElementDimensions) => void;
}

export interface UseElementResizeReturn {
  resizeState: ResizeState;
  startResize: (
    handle: ResizeHandle,
    elementId: string,
    event: React.MouseEvent | React.TouchEvent
  ) => void;
  cancelResize: () => void;
  getCursor: (handle: ResizeHandle) => string;
}

const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
};

export function useElementResize(options: UseElementResizeOptions = {}): UseElementResizeReturn {
  const {
    minWidth = 20,
    minHeight = 20,
    maxWidth = Infinity,
    maxHeight = Infinity,
    snapToGrid = 0,
    preserveAspectRatio = false,
    onResizeStart,
    onResize,
    onResizeEnd,
  } = options;

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    handle: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    elementId: null,
  });

  const aspectRatioRef = useRef<number>(1);
  const updateElementStyle = useDesignerStore((state) => state.updateElementStyle);

  // Snap value to grid if enabled
  const snapValue = useCallback(
    (value: number): number => {
      if (snapToGrid <= 0) return value;
      return Math.round(value / snapToGrid) * snapToGrid;
    },
    [snapToGrid]
  );

  // Calculate new dimensions based on handle and mouse movement
  const calculateDimensions = useCallback(
    (
      handle: ResizeHandle,
      startWidth: number,
      startHeight: number,
      deltaX: number,
      deltaY: number
    ): { width: number; height: number } => {
      let width = startWidth;
      let height = startHeight;

      // Apply deltas based on handle direction
      if (handle.includes('e')) {
        width = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
      }
      if (handle.includes('w')) {
        width = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
      }
      if (handle.includes('s')) {
        height = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
      }
      if (handle.includes('n')) {
        height = Math.max(minHeight, Math.min(maxHeight, startHeight - deltaY));
      }

      // Preserve aspect ratio if enabled
      if (preserveAspectRatio && aspectRatioRef.current > 0) {
        const aspectRatio = aspectRatioRef.current;
        if (handle === 'e' || handle === 'w') {
          height = width / aspectRatio;
        } else if (handle === 'n' || handle === 's') {
          width = height * aspectRatio;
        } else {
          // Corner handles - use the larger change
          const widthChange = Math.abs(width - startWidth);
          const heightChange = Math.abs(height - startHeight);
          if (widthChange > heightChange) {
            height = width / aspectRatio;
          } else {
            width = height * aspectRatio;
          }
        }
      }

      // Apply grid snapping
      width = snapValue(width);
      height = snapValue(height);

      return { width, height };
    },
    [minWidth, minHeight, maxWidth, maxHeight, preserveAspectRatio, snapValue]
  );

  // Handle mouse/touch move during resize
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!resizeState.isResizing || !resizeState.handle || !resizeState.elementId) {
        return;
      }

      const deltaX = clientX - resizeState.startX;
      const deltaY = clientY - resizeState.startY;

      const { width, height } = calculateDimensions(
        resizeState.handle,
        resizeState.startWidth,
        resizeState.startHeight,
        deltaX,
        deltaY
      );

      // Update element styles in store
      updateElementStyle(resizeState.elementId, {
        width: `${width}px`,
        height: `${height}px`,
      });

      // Call resize callback
      if (onResize) {
        onResize(resizeState.elementId, { width, height });
      }
    },
    [resizeState, calculateDimensions, updateElementStyle, onResize]
  );

  // Handle mouse up to end resize
  const handleEnd = useCallback(() => {
    if (resizeState.isResizing && resizeState.elementId && onResizeEnd) {
      // Get final dimensions from the element
      const element = document.querySelector(`[data-designer-id="${resizeState.elementId}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        onResizeEnd(resizeState.elementId, {
          width: rect.width,
          height: rect.height,
        });
      }
    }

    setResizeState({
      isResizing: false,
      handle: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      elementId: null,
    });
  }, [resizeState.isResizing, resizeState.elementId, onResizeEnd]);

  // Set up global mouse/touch event listeners
  useEffect(() => {
    if (!resizeState.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    // Set cursor on body during resize
    document.body.style.cursor = resizeState.handle
      ? HANDLE_CURSORS[resizeState.handle]
      : 'default';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeState.isResizing, resizeState.handle, handleMove, handleEnd]);

  // Start resize operation
  const startResize = useCallback(
    (handle: ResizeHandle, elementId: string, event: React.MouseEvent | React.TouchEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Get initial position
      let clientX: number;
      let clientY: number;

      if ('touches' in event) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      // Get current element dimensions
      const element = document.querySelector(`[data-designer-id="${elementId}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      aspectRatioRef.current = rect.width / rect.height;

      setResizeState({
        isResizing: true,
        handle,
        startX: clientX,
        startY: clientY,
        startWidth: rect.width,
        startHeight: rect.height,
        elementId,
      });

      if (onResizeStart) {
        onResizeStart(elementId);
      }
    },
    [onResizeStart]
  );

  // Cancel resize operation
  const cancelResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      handle: null,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      elementId: null,
    });
  }, []);

  // Get cursor for a handle
  const getCursor = useCallback((handle: ResizeHandle): string => {
    return HANDLE_CURSORS[handle];
  }, []);

  return {
    resizeState,
    startResize,
    cancelResize,
    getCursor,
  };
}

export default useElementResize;
