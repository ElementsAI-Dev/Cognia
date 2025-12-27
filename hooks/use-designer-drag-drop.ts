'use client';

/**
 * useDesignerDragDrop - Hook for HTML5 drag-drop operations in the designer
 * Provides drag source and drop target handlers for visual editing
 */

import { useCallback, useState, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useDesignerStore } from '@/stores/designer-store';
import type { DesignerElement } from '@/types/designer';

// Drag data types
export type DragItemType = 'component' | 'element';

export interface DragData {
  type: DragItemType;
  // For component library items
  componentCode?: string;
  componentName?: string;
  // For existing elements
  elementId?: string;
}

export interface DropPosition {
  parentId: string | null;
  index?: number;
}

// Parse component code to create a DesignerElement
function parseComponentToElement(code: string, parentId: string | null): DesignerElement {
  // Simple parser for common HTML/JSX patterns
  const tagMatch = code.match(/<(\w+)/);
  const tagName = tagMatch?.[1]?.toLowerCase() || 'div';

  const classMatch = code.match(/className=["']([^"']+)["']/);
  const className = classMatch?.[1] || '';

  // Extract text content
  const textMatch = code.match(/>([^<]+)</);
  const textContent = textMatch?.[1]?.trim();

  return {
    id: nanoid(),
    tagName,
    className,
    textContent,
    attributes: {},
    styles: {},
    children: [],
    parentId,
  };
}

export interface UseDesignerDragDropReturn {
  // State
  isDragging: boolean;
  dragData: DragData | null;
  dropTargetId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;

  // Drag source handlers (for component library items)
  createDragHandlers: (data: DragData) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };

  // Element drag handlers (for existing elements in tree)
  createElementDragHandlers: (elementId: string) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };

  // Drop target handlers
  createDropHandlers: (targetId: string | null) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };

  // Preview area drop handlers
  createPreviewDropHandlers: () => {
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };

  // Utility
  resetDragState: () => void;
}

export function useDesignerDragDrop(): UseDesignerDragDropReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const dragCounterRef = useRef(0);

  const { insertElement, moveElement, elementTree } = useDesignerStore();

  // Reset drag state
  const resetDragState = useCallback(() => {
    setIsDragging(false);
    setDragData(null);
    setDropTargetId(null);
    setDropPosition(null);
    dragCounterRef.current = 0;
  }, []);

  // Create drag handlers for component library items
  const createDragHandlers = useCallback((data: DragData) => {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        // Create a ghost image
        const ghost = document.createElement('div');
        ghost.className = 'bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium shadow-lg';
        ghost.textContent = data.componentName || 'Component';
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);

        setIsDragging(true);
        setDragData(data);
      },
      onDragEnd: (e: React.DragEvent) => {
        resetDragState();
      },
    };
  }, [resetDragState]);

  // Create drag handlers for existing elements
  const createElementDragHandlers = useCallback((elementId: string) => {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';

        const data: DragData = {
          type: 'element',
          elementId,
        };
        e.dataTransfer.setData('application/json', JSON.stringify(data));

        setIsDragging(true);
        setDragData(data);
      },
      onDragEnd: (e: React.DragEvent) => {
        resetDragState();
      },
    };
  }, [resetDragState]);

  // Determine drop position based on mouse position
  const getDropPosition = useCallback(
    (e: React.DragEvent, targetElement: HTMLElement): 'before' | 'after' | 'inside' => {
      const rect = targetElement.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;

      // Top 25% = before, bottom 25% = after, middle 50% = inside
      if (y < height * 0.25) return 'before';
      if (y > height * 0.75) return 'after';
      return 'inside';
    },
    []
  );

  // Create drop handlers for element tree nodes
  const createDropHandlers = useCallback(
    (targetId: string | null) => {
      return {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();

          // Check if we can drop here
          if (dragData?.type === 'element' && dragData.elementId === targetId) {
            e.dataTransfer.dropEffect = 'none';
            return;
          }

          e.dataTransfer.dropEffect = dragData?.type === 'component' ? 'copy' : 'move';

          // Calculate drop position
          const position = getDropPosition(e, e.currentTarget as HTMLElement);
          setDropTargetId(targetId);
          setDropPosition(position);
        },
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounterRef.current++;
        },
        onDragLeave: (e: React.DragEvent) => {
          e.stopPropagation();
          dragCounterRef.current--;

          if (dragCounterRef.current === 0) {
            setDropTargetId(null);
            setDropPosition(null);
          }
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();

          const dataStr = e.dataTransfer.getData('application/json');
          if (!dataStr) {
            resetDragState();
            return;
          }

          try {
            const data: DragData = JSON.parse(dataStr);
            const position = getDropPosition(e, e.currentTarget as HTMLElement);

            if (data.type === 'component' && data.componentCode) {
              // Create new element from component code
              const parentId = position === 'inside' ? targetId : null;
              const newElement = parseComponentToElement(data.componentCode, parentId);

              // TODO: Calculate proper index based on position
              insertElement(parentId, newElement);
            } else if (data.type === 'element' && data.elementId) {
              // Move existing element
              const newParentId = position === 'inside' ? targetId : null;
              // TODO: Calculate proper index based on position
              moveElement(data.elementId, newParentId);
            }
          } catch (err) {
            console.error('Failed to parse drag data:', err);
          }

          resetDragState();
        },
      };
    },
    [dragData, getDropPosition, insertElement, moveElement, resetDragState]
  );

  // Create drop handlers for preview area (root drop zone)
  const createPreviewDropHandlers = useCallback(() => {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = dragData?.type === 'component' ? 'copy' : 'move';
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();

        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) {
          resetDragState();
          return;
        }

        try {
          const data: DragData = JSON.parse(dataStr);

          if (data.type === 'component' && data.componentCode) {
            // Create new element at root level
            const newElement = parseComponentToElement(data.componentCode, null);
            insertElement(null, newElement);
          } else if (data.type === 'element' && data.elementId) {
            // Move to root level
            moveElement(data.elementId, null);
          }
        } catch (err) {
          console.error('Failed to parse drag data:', err);
        }

        resetDragState();
      },
    };
  }, [dragData, insertElement, moveElement, resetDragState]);

  return {
    isDragging,
    dragData,
    dropTargetId,
    dropPosition,
    createDragHandlers,
    createElementDragHandlers,
    createDropHandlers,
    createPreviewDropHandlers,
    resetDragState,
  };
}

export default useDesignerDragDrop;
