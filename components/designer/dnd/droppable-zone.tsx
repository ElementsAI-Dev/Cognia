'use client';

/**
 * DroppableZone - @dnd-kit drop target wrapper
 * Enables drop zones for component insertion
 */

import { useDroppable } from '@dnd-kit/core';
import type { UniqueIdentifier } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DroppableZoneProps {
  id: UniqueIdentifier;
  elementId?: string | null;
  children: ReactNode;
  className?: string;
  accepts?: ('component' | 'element')[];
}

export function DroppableZone({
  id,
  elementId = null,
  children,
  className,
  accepts = ['component', 'element'],
}: DroppableZoneProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      type: 'drop-zone',
      elementId,
      accepts,
    },
  });

  // Check if the active item type is accepted
  const activeType = active?.data.current?.type as string | undefined;
  const canDrop = activeType ? accepts.includes(activeType as 'component' | 'element') : false;
  const isActiveOver = isOver && canDrop;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'transition-colors',
        isActiveOver && 'bg-primary/5 ring-2 ring-primary ring-inset ring-opacity-50',
        className
      )}
    >
      {children}
    </div>
  );
}

export default DroppableZone;
