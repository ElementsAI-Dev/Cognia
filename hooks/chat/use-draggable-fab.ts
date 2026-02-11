'use client';

/**
 * useDraggableFab Hook
 * Enables drag-to-reposition functionality for the FAB button
 * Persists position to localStorage and supports snap-to-corner
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { FabPosition } from './use-floating-position';

interface DraggableFabConfig {
  initialPosition?: FabPosition;
  snapToCorner?: boolean;
  snapThreshold?: number;
  persistKey?: string;
  edgeMargin?: number;
}

interface DraggableFabState {
  position: FabPosition;
  offset: { x: number; y: number };
  isDragging: boolean;
}

interface DraggableFabResult {
  position: FabPosition;
  offset: { x: number; y: number };
  isDragging: boolean;
  handleDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleDrag: (e: MouseEvent | TouchEvent) => void;
  handleDragEnd: () => void;
  resetPosition: () => void;
}

const DEFAULT_CONFIG: Required<DraggableFabConfig> = {
  initialPosition: 'bottom-right',
  snapToCorner: true,
  snapThreshold: 100,
  persistKey: 'cognia-chat-fab-position',
  edgeMargin: 24,
};

/**
 * Calculate which corner is closest to the current position
 */
function snapToNearestCorner(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  threshold: number
): FabPosition | null {
  const midX = viewportWidth / 2;
  const midY = viewportHeight / 2;

  // Determine quadrant
  const isRight = x > midX;
  const isBottom = y > midY;

  // Check if close enough to edge to snap
  const distToLeft = x;
  const distToRight = viewportWidth - x;
  const distToTop = y;
  const distToBottom = viewportHeight - y;

  const minHorizontal = Math.min(distToLeft, distToRight);
  const minVertical = Math.min(distToTop, distToBottom);

  if (minHorizontal < threshold && minVertical < threshold) {
    if (isBottom && isRight) return 'bottom-right';
    if (isBottom && !isRight) return 'bottom-left';
    if (!isBottom && isRight) return 'top-right';
    return 'top-left';
  }

  return null;
}

/**
 * Get position offsets from corner
 */
function getCornerOffsets(
  position: FabPosition,
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  edgeMargin: number,
  fabSize: number = 56
): { x: number; y: number } {
  switch (position) {
    case 'bottom-right':
      return {
        x: -(viewportWidth - x - edgeMargin - fabSize),
        y: -(viewportHeight - y - edgeMargin - fabSize),
      };
    case 'bottom-left':
      return {
        x: x - edgeMargin,
        y: -(viewportHeight - y - edgeMargin - fabSize),
      };
    case 'top-right':
      return {
        x: -(viewportWidth - x - edgeMargin - fabSize),
        y: y - edgeMargin,
      };
    case 'top-left':
      return {
        x: x - edgeMargin,
        y: y - edgeMargin,
      };
  }
}

/**
 * Load persisted position from localStorage
 */
function loadPersistedPosition(key: string): DraggableFabState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save position to localStorage
 */
function persistPosition(key: string, state: DraggableFabState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        position: state.position,
        offset: state.offset,
      })
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for draggable FAB functionality
 */
export function useDraggableFab(config: DraggableFabConfig = {}): DraggableFabResult {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Initialize state from persisted or default
  const [state, setState] = useState<DraggableFabState>(() => {
    const persisted = loadPersistedPosition(mergedConfig.persistKey);
    return (
      persisted || {
        position: mergedConfig.initialPosition,
        offset: { x: 0, y: 0 },
        isDragging: false,
      }
    );
  });

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const DRAG_THRESHOLD = 5; // Minimum pixels to move before considering it a drag

  // Handle drag move
  const handleDrag = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragStartRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;

      // Check if we've moved past the drag threshold
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (!hasDraggedRef.current && distance < DRAG_THRESHOLD) {
        return; // Not dragging yet
      }

      // Now we're dragging
      if (!hasDraggedRef.current) {
        hasDraggedRef.current = true;
        setState((prev) => ({ ...prev, isDragging: true }));
      }

      // Calculate new offset based on position
      let newOffsetX = initialOffsetRef.current.x;
      let newOffsetY = initialOffsetRef.current.y;

      // Adjust delta direction based on position
      if (state.position.includes('right')) {
        newOffsetX -= deltaX;
      } else {
        newOffsetX += deltaX;
      }

      if (state.position.includes('bottom')) {
        newOffsetY -= deltaY;
      } else {
        newOffsetY += deltaY;
      }

      setState((prev) => ({
        ...prev,
        offset: { x: newOffsetX, y: newOffsetY },
      }));
    },
    [state.position]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!dragStartRef.current) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate current absolute position
    let absoluteX: number;
    let absoluteY: number;
    const fabSize = 56;
    const margin = mergedConfig.edgeMargin;

    if (state.position.includes('right')) {
      absoluteX = viewportWidth - margin - fabSize - state.offset.x;
    } else {
      absoluteX = margin + state.offset.x;
    }

    if (state.position.includes('bottom')) {
      absoluteY = viewportHeight - margin - fabSize - state.offset.y;
    } else {
      absoluteY = margin + state.offset.y;
    }

    // Try to snap to corner
    if (mergedConfig.snapToCorner) {
      const snappedPosition = snapToNearestCorner(
        absoluteX,
        absoluteY,
        viewportWidth,
        viewportHeight,
        mergedConfig.snapThreshold
      );

      if (snappedPosition) {
        // Calculate offset from corner (not used when snapping, but could be for custom positions)
        const _newOffset = getCornerOffsets(
          snappedPosition,
          absoluteX,
          absoluteY,
          viewportWidth,
          viewportHeight,
          margin
        );

        const newState: DraggableFabState = {
          position: snappedPosition,
          offset: { x: 0, y: 0 }, // Reset offset when snapping
          isDragging: false,
        };

        setState(newState);
        persistPosition(mergedConfig.persistKey, newState);
        dragStartRef.current = null;
        return;
      }
    }

    // No snap, keep current offset
    const newState: DraggableFabState = {
      ...state,
      isDragging: false,
    };

    setState(newState);
    persistPosition(mergedConfig.persistKey, newState);
    dragStartRef.current = null;
  }, [state, mergedConfig]);

  // Reset position to default
  const resetPosition = useCallback(() => {
    const newState: DraggableFabState = {
      position: mergedConfig.initialPosition,
      offset: { x: 0, y: 0 },
      isDragging: false,
    };
    setState(newState);
    persistPosition(mergedConfig.persistKey, newState);
  }, [mergedConfig]);

  // Refs for stable event handler references (avoids re-binding on every render)
  const handleDragRef = useRef(handleDrag);
  const handleDragEndRef = useRef(handleDragEnd);

  useEffect(() => {
    handleDragRef.current = handleDrag;
    handleDragEndRef.current = handleDragEnd;
  }, [handleDrag, handleDragEnd]);

  // Bind global listeners only when drag starts, unbind on drag end
  const cleanupListenersRef = useRef<(() => void) | null>(null);

  const bindDragListeners = useCallback(() => {
    if (typeof window === 'undefined' || cleanupListenersRef.current) return;

    const onMove = (e: MouseEvent | TouchEvent) => handleDragRef.current(e as MouseEvent & TouchEvent);
    const onEnd = () => {
      if (hasDraggedRef.current) {
        handleDragEndRef.current();
      } else {
        dragStartRef.current = null;
      }
      // Unbind after drag ends
      cleanupListenersRef.current?.();
      cleanupListenersRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    cleanupListenersRef.current = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  // Handle pointer down - prepare for potential drag
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Don't prevent default here - allow click to work
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      dragStartRef.current = { x: clientX, y: clientY };
      initialOffsetRef.current = { ...state.offset };
      hasDraggedRef.current = false;

      // Bind global listeners only when drag starts
      bindDragListeners();
    },
    [state.offset, bindDragListeners]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupListenersRef.current?.();
    };
  }, []);

  return {
    position: state.position,
    offset: state.offset,
    isDragging: state.isDragging,
    handleDragStart,
    handleDrag,
    handleDragEnd,
    resetPosition,
  };
}

export default useDraggableFab;
