'use client';

/**
 * ResizeHandles - Visual resize handles for selected elements
 * Provides corner and edge handles for resizing in the designer
 */

import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useElementResize, type ResizeHandle } from '@/hooks/utils';

interface ResizeHandlesProps {
  elementId: string;
  className?: string;
  showCorners?: boolean;
  showEdges?: boolean;
  disabled?: boolean;
  minWidth?: number;
  minHeight?: number;
  onResizeStart?: (elementId: string) => void;
  onResize?: (elementId: string, dimensions: { width: number | 'auto'; height: number | 'auto' }) => void;
  onResizeEnd?: (elementId: string, dimensions: { width: number | 'auto'; height: number | 'auto' }) => void;
}

// Handle positions with their styles
const HANDLE_POSITIONS: Record<ResizeHandle, string> = {
  n: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  ne: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  nw: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
  sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
};

// Corner handles
const CORNER_HANDLES: ResizeHandle[] = ['ne', 'nw', 'se', 'sw'];
// Edge handles
const EDGE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w'];

function ResizeHandlesComponent({
  elementId,
  className,
  showCorners = true,
  showEdges = true,
  disabled = false,
  minWidth = 20,
  minHeight = 20,
  onResizeStart,
  onResize,
  onResizeEnd,
}: ResizeHandlesProps) {
  const { resizeState, startResize } = useElementResize({
    minWidth,
    minHeight,
    onResizeStart,
    onResize,
    onResizeEnd,
  });

  const handleMouseDown = useCallback(
    (handle: ResizeHandle) => (e: React.MouseEvent) => {
      if (disabled) return;
      startResize(handle, elementId, e);
    },
    [disabled, elementId, startResize]
  );

  const handleTouchStart = useCallback(
    (handle: ResizeHandle) => (e: React.TouchEvent) => {
      if (disabled) return;
      startResize(handle, elementId, e);
    },
    [disabled, elementId, startResize]
  );

  const handles: ResizeHandle[] = [
    ...(showCorners ? CORNER_HANDLES : []),
    ...(showEdges ? EDGE_HANDLES : []),
  ];

  const isResizingThis = resizeState.isResizing && resizeState.elementId === elementId;

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        isResizingThis && 'z-50',
        className
      )}
    >
      {/* Resize handles */}
      {handles.map((handle) => {
        const isCorner = CORNER_HANDLES.includes(handle);
        const isActiveHandle = resizeState.handle === handle && isResizingThis;

        return (
          <div
            key={handle}
            className={cn(
              'absolute pointer-events-auto touch-none',
              HANDLE_POSITIONS[handle],
              disabled && 'pointer-events-none opacity-50'
            )}
            onMouseDown={handleMouseDown(handle)}
            onTouchStart={handleTouchStart(handle)}
          >
            <div
              className={cn(
                'transition-all duration-100',
                isCorner ? (
                  // Corner handles - larger, square
                  cn(
                    'w-3 h-3 bg-background border-2 border-primary rounded-sm shadow-sm',
                    'hover:scale-110 hover:bg-primary/10',
                    isActiveHandle && 'scale-125 bg-primary/20'
                  )
                ) : (
                  // Edge handles - smaller, pill-shaped
                  cn(
                    handle === 'n' || handle === 's'
                      ? 'w-8 h-2 rounded-full'
                      : 'w-2 h-8 rounded-full',
                    'bg-background border border-primary/50 shadow-sm',
                    'hover:border-primary hover:bg-primary/10',
                    isActiveHandle && 'bg-primary/20 border-primary'
                  )
                )
              )}
            />
          </div>
        );
      })}

      {/* Resize indicator overlay during resize */}
      {isResizingThis && (
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-md bg-primary/5" />
      )}
    </div>
  );
}

export const ResizeHandles = memo(ResizeHandlesComponent);

export default ResizeHandles;
