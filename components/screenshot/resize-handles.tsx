'use client';

/**
 * Resize Handles Component
 *
 * 8-point resize handles for selection adjustment.
 */

import { cn } from '@/lib/utils';
import type { ResizeHandle } from '@/types/screenshot';

interface ResizeHandlesProps {
  onResizeStart: (handle: ResizeHandle, e: React.MouseEvent) => void;
  className?: string;
}

const HANDLE_SIZE = 8;

const handles: { id: ResizeHandle; position: string; cursor: string }[] = [
  { id: 'nw', position: '-top-1 -left-1', cursor: 'nwse-resize' },
  { id: 'n', position: '-top-1 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'ne', position: '-top-1 -right-1', cursor: 'nesw-resize' },
  { id: 'e', position: 'top-1/2 -right-1 -translate-y-1/2', cursor: 'ew-resize' },
  { id: 'se', position: '-bottom-1 -right-1', cursor: 'nwse-resize' },
  { id: 's', position: '-bottom-1 left-1/2 -translate-x-1/2', cursor: 'ns-resize' },
  { id: 'sw', position: '-bottom-1 -left-1', cursor: 'nesw-resize' },
  { id: 'w', position: 'top-1/2 -left-1 -translate-y-1/2', cursor: 'ew-resize' },
];

export function ResizeHandles({ onResizeStart, className }: ResizeHandlesProps) {
  return (
    <>
      {handles.map(({ id, position, cursor }) => (
        <div
          key={id}
          className={cn(
            'absolute bg-primary border border-primary-foreground rounded-sm',
            'hover:bg-primary/80 transition-colors',
            position,
            className
          )}
          style={{
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onResizeStart(id, e);
          }}
        />
      ))}
    </>
  );
}
