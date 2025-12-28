'use client';

/**
 * DraggableComponent - @dnd-kit draggable wrapper for library components
 * Enables drag-to-insert functionality from component library
 */

import { useDraggable } from '@dnd-kit/core';
import type { UniqueIdentifier } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DragItem } from './designer-dnd-context';

interface DraggableComponentProps {
  id: UniqueIdentifier;
  componentCode: string;
  componentName: string;
  children: ReactNode;
  disabled?: boolean;
}

export function DraggableComponent({
  id,
  componentCode,
  componentName,
  children,
  disabled = false,
}: DraggableComponentProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id,
    data: {
      id,
      type: 'component',
      componentCode,
      componentName,
    } satisfies DragItem,
    disabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export default DraggableComponent;
