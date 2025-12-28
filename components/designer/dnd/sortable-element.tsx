'use client';

/**
 * SortableElement - @dnd-kit sortable wrapper for tree elements
 * Enables drag-to-reorder functionality in the element tree
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UniqueIdentifier } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { DragItem } from './designer-dnd-context';

interface SortableElementProps {
  id: UniqueIdentifier;
  elementId: string;
  children: ReactNode;
  disabled?: boolean;
}

export function SortableElement({
  id,
  elementId,
  children,
  disabled = false,
}: SortableElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active,
  } = useSortable({
    id,
    data: {
      id,
      type: 'element',
      elementId,
    } satisfies DragItem,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if something is being dragged over this element
  const activeData = active?.data.current as DragItem | undefined;
  const isReceivingDrop = isOver && activeData?.type === 'component';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'opacity-50 z-50',
        isReceivingDrop && 'ring-2 ring-primary ring-inset rounded-md'
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export default SortableElement;
