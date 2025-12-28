'use client';

/**
 * DesignerDndContext - DndKit context wrapper for the designer
 * Provides drag-drop functionality for component library and element tree
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { nanoid } from 'nanoid';
import { useDesignerStore } from '@/stores/designer-store';
import type { DesignerElement } from '@/types/designer';

// Drag item types
export type DragItemType = 'component' | 'element';

export interface DragItem {
  id: UniqueIdentifier;
  type: DragItemType;
  // For component library items
  componentCode?: string;
  componentName?: string;
  // For existing elements
  elementId?: string;
}

interface DesignerDndContextValue {
  activeItem: DragItem | null;
  overId: UniqueIdentifier | null;
  isDragging: boolean;
}

const DesignerDndContextValue = createContext<DesignerDndContextValue | null>(null);

export function useDesignerDnd() {
  const context = useContext(DesignerDndContextValue);
  if (!context) {
    throw new Error('useDesignerDnd must be used within DesignerDndProvider');
  }
  return context;
}

interface DesignerDndProviderProps {
  children: ReactNode;
}

// Parse component code to create a DesignerElement
function parseComponentToElement(code: string, parentId: string | null): DesignerElement {
  const tagMatch = code.match(/<(\w+)/);
  const tagName = tagMatch?.[1]?.toLowerCase() || 'div';

  const classMatch = code.match(/className=["']([^"']+)["']/);
  const className = classMatch?.[1] || '';

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

export function DesignerDndProvider({ children }: DesignerDndProviderProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  const insertElement = useDesignerStore((state) => state.insertElement);
  const moveElement = useDesignerStore((state) => state.moveElement);
  const elementTree = useDesignerStore((state) => state.elementTree);
  const elementMap = useDesignerStore((state) => state.elementMap);

  // Configure sensors for pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Find the index of an element in its parent's children
  const findElementIndex = useCallback((elementId: string, parentId: string | null): number => {
    if (!parentId) {
      // Root level - check if elementTree is the element
      if (elementTree?.id === elementId) return 0;
      return -1;
    }

    const parent = elementMap[parentId];
    if (!parent) return -1;

    return parent.children.findIndex((child) => child.id === elementId);
  }, [elementTree, elementMap]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragItem | undefined;

    if (data) {
      setActiveItem(data);
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id ?? null);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveItem(null);
    setOverId(null);

    if (!over) return;

    const activeData = active.data.current as DragItem | undefined;
    const overData = over.data.current as { type?: string; elementId?: string; accepts?: string[] } | undefined;

    if (!activeData) return;

    // Handle component from library being dropped
    if (activeData.type === 'component' && activeData.componentCode) {
      const targetId = overData?.elementId || null;
      const newElement = parseComponentToElement(activeData.componentCode, targetId);

      if (targetId && elementMap[targetId]) {
        const targetElement = elementMap[targetId];

        // Check if target can accept children (is a container element)
        const containerTags = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'ul', 'ol', 'form'];
        const isContainer = containerTags.includes(targetElement.tagName.toLowerCase());

        if (isContainer) {
          // Insert as last child of target element
          insertElement(targetId, newElement, targetElement.children.length);
        } else {
          // Insert as sibling after the target element
          const parentId = targetElement.parentId;
          if (parentId && elementMap[parentId]) {
            const parentElement = elementMap[parentId];
            const targetIndex = parentElement.children.findIndex(c => c.id === targetId);
            insertElement(parentId, newElement, targetIndex + 1);
          } else {
            // No parent, insert at root level
            insertElement(null, newElement);
          }
        }
      } else {
        // Insert at root level
        insertElement(null, newElement);
      }
      return;
    }

    // Handle element reordering
    if (activeData.type === 'element' && activeData.elementId) {
      const activeId = activeData.elementId;
      const overId = overData?.elementId;

      if (!overId || activeId === overId) return;

      const activeElement = elementMap[activeId];
      const overElement = elementMap[overId];

      if (!activeElement || !overElement) return;

      // Prevent dropping element into its own descendants
      const isDescendant = (parentId: string, childId: string): boolean => {
        const parent = elementMap[parentId];
        if (!parent) return false;
        for (const child of parent.children) {
          if (child.id === childId) return true;
          if (isDescendant(child.id, childId)) return true;
        }
        return false;
      };

      if (isDescendant(activeId, overId)) {
        return; // Can't drop into descendant
      }

      // Same parent - reorder
      if (activeElement.parentId === overElement.parentId) {
        const parentId = activeElement.parentId;
        const oldIndex = findElementIndex(activeId, parentId);
        const newIndex = findElementIndex(overId, parentId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // Adjust index for moving direction
          const adjustedIndex = oldIndex < newIndex ? newIndex : newIndex;
          moveElement(activeId, parentId, adjustedIndex);
        }
      } else {
        // Different parent - move to new parent's container or as sibling
        const containerTags = ['div', 'section', 'article', 'main', 'aside', 'header', 'footer', 'nav', 'ul', 'ol', 'form'];
        const isContainer = containerTags.includes(overElement.tagName.toLowerCase());

        if (isContainer) {
          // Drop into the container as last child
          moveElement(activeId, overId, overElement.children.length);
        } else {
          // Drop as sibling after the over element
          const newParentId = overElement.parentId;
          const newIndex = findElementIndex(overId, newParentId);
          moveElement(activeId, newParentId, newIndex !== -1 ? newIndex + 1 : 0);
        }
      }
    }
  }, [elementMap, findElementIndex, insertElement, moveElement]);

  const contextValue: DesignerDndContextValue = {
    activeItem,
    overId,
    isDragging: activeItem !== null,
  };

  return (
    <DesignerDndContextValue.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <DragPreview item={activeItem} />
          )}
        </DragOverlay>
      </DndContext>
    </DesignerDndContextValue.Provider>
  );
}

// Drag preview component shown while dragging
function DragPreview({ item }: { item: DragItem }) {
  return (
    <div className="px-3 py-2 bg-primary text-primary-foreground rounded-md shadow-lg text-sm font-medium opacity-90">
      {item.type === 'component' ? (
        <span>{item.componentName || 'Component'}</span>
      ) : (
        <span>Element</span>
      )}
    </div>
  );
}

export default DesignerDndProvider;
