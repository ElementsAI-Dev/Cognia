'use client';

/**
 * SelectionOverlay - Visual selection and hover feedback for designer elements
 * Shows borders, labels, and action buttons for selected/hovered elements
 */

import { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Copy, MoveVertical as _MoveVertical, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer-store';
import { ResizeHandles } from './resize-handles';
import type { DesignerElement } from '@/types/designer';

interface SelectionOverlayProps {
  previewContainerRef: React.RefObject<HTMLElement | null>;
  showResizeHandles?: boolean;
  showActions?: boolean;
  showLabels?: boolean;
}

// Element label showing tag name and class
interface ElementLabelProps {
  element: DesignerElement;
  position: { top: number; left: number };
  isSelected: boolean;
}

function ElementLabel({ element, position, isSelected }: ElementLabelProps) {
  const displayName = element.className
    ? `${element.tagName}.${element.className.split(' ')[0]}`
    : element.tagName;

  return (
    <div
      className={cn(
        'absolute px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm shadow-sm whitespace-nowrap z-50',
        'pointer-events-none transform -translate-y-full -translate-x-0',
        isSelected
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground'
      )}
      style={{
        top: position.top - 2,
        left: position.left,
      }}
    >
      {displayName}
    </div>
  );
}

// Action toolbar for selected elements
interface ActionToolbarProps {
  element: DesignerElement;
  position: { top: number; right: number };
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function ActionToolbar({
  element,
  position,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: ActionToolbarProps) {
  return (
    <div
      className="absolute flex items-center gap-0.5 bg-background border rounded-md shadow-md p-0.5 z-50"
      style={{
        top: position.top - 32,
        right: position.right,
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onMoveUp}
        title="Move up"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onMoveDown}
        title="Move down"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onDuplicate}
        title="Duplicate"
      >
        <Copy className="h-3 w-3" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(element.id)}>
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SelectionOverlayComponent({
  previewContainerRef,
  showResizeHandles = true,
  showActions = true,
  showLabels = true,
}: SelectionOverlayProps) {
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const elementMap = useDesignerStore((state) => state.elementMap);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const moveElement = useDesignerStore((state) => state.moveElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  // Get element bounds relative to preview container
  const getElementBounds = useCallback((elementId: string) => {
    const container = previewContainerRef.current;
    if (!container) return null;

    const element = container.querySelector(`[data-designer-id="${elementId}"]`);
    if (!element) return null;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return {
      top: elementRect.top - containerRect.top,
      left: elementRect.left - containerRect.left,
      width: elementRect.width,
      height: elementRect.height,
      right: containerRect.right - elementRect.right,
      bottom: containerRect.bottom - elementRect.bottom,
    };
  }, [previewContainerRef]);

  // Get selected element data
  const selectedElement = useMemo(() => {
    if (!selectedElementId) return null;
    return elementMap[selectedElementId] || null;
  }, [selectedElementId, elementMap]);

  // Get hovered element data (only if different from selected)
  const hoveredElement = useMemo(() => {
    if (!hoveredElementId || hoveredElementId === selectedElementId) return null;
    return elementMap[hoveredElementId] || null;
  }, [hoveredElementId, selectedElementId, elementMap]);

  // Get bounds for selected and hovered elements using effect
  const [selectedBounds, setSelectedBounds] = useState<ReturnType<typeof getElementBounds>>(null);
  const [hoveredBounds, setHoveredBounds] = useState<ReturnType<typeof getElementBounds>>(null);
  const [containerElement, setContainerElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const container = previewContainerRef.current;
    setContainerElement(container);
  }, [previewContainerRef]);

  useEffect(() => {
    // Use ResizeObserver to subscribe to element changes
    const container = previewContainerRef.current;
    if (!container) return;

    const updateBounds = () => {
      if (selectedElementId) {
        setSelectedBounds(getElementBounds(selectedElementId));
      } else {
        setSelectedBounds(null);
      }
      if (hoveredElement) {
        setHoveredBounds(getElementBounds(hoveredElement.id));
      } else {
        setHoveredBounds(null);
      }
    };

    // Initial update
    updateBounds();

    // Subscribe to resize events
    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [selectedElementId, hoveredElement, getElementBounds, previewContainerRef]);

  // Handle element actions
  const handleDelete = useCallback(() => {
    if (!selectedElementId) return;
    deleteElement(selectedElementId);
    syncCodeFromElements();
  }, [selectedElementId, deleteElement, syncCodeFromElements]);

  const handleDuplicate = useCallback(() => {
    if (!selectedElementId) return;
    duplicateElement(selectedElementId);
    syncCodeFromElements();
  }, [selectedElementId, duplicateElement, syncCodeFromElements]);

  const handleMoveUp = useCallback(() => {
    if (!selectedElement) return;
    const parentId = selectedElement.parentId;
    const parent = parentId ? elementMap[parentId] : null;
    if (!parent) return;

    const currentIndex = parent.children.findIndex(c => c.id === selectedElementId);
    if (currentIndex > 0) {
      moveElement(selectedElementId!, parentId, currentIndex - 1);
      syncCodeFromElements();
    }
  }, [selectedElement, selectedElementId, elementMap, moveElement, syncCodeFromElements]);

  const handleMoveDown = useCallback(() => {
    if (!selectedElement) return;
    const parentId = selectedElement.parentId;
    const parent = parentId ? elementMap[parentId] : null;
    if (!parent) return;

    const currentIndex = parent.children.findIndex(c => c.id === selectedElementId);
    if (currentIndex < parent.children.length - 1) {
      moveElement(selectedElementId!, parentId, currentIndex + 1);
      syncCodeFromElements();
    }
  }, [selectedElement, selectedElementId, elementMap, moveElement, syncCodeFromElements]);

  // Don't render if no container mounted
  if (!containerElement) return null;

  return createPortal(
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Hovered element overlay */}
      {hoveredElement && hoveredBounds && (
        <div
          className="absolute border-2 border-blue-400 border-dashed rounded-sm pointer-events-none transition-all duration-75"
          style={{
            top: hoveredBounds.top,
            left: hoveredBounds.left,
            width: hoveredBounds.width,
            height: hoveredBounds.height,
          }}
        >
          {showLabels && (
            <ElementLabel
              element={hoveredElement}
              position={{ top: 0, left: 0 }}
              isSelected={false}
            />
          )}
        </div>
      )}

      {/* Selected element overlay */}
      {selectedElement && selectedBounds && (
        <div
          className="absolute border-2 border-primary rounded-sm transition-all duration-75"
          style={{
            top: selectedBounds.top,
            left: selectedBounds.left,
            width: selectedBounds.width,
            height: selectedBounds.height,
          }}
        >
          {/* Element label */}
          {showLabels && (
            <ElementLabel
              element={selectedElement}
              position={{ top: 0, left: 0 }}
              isSelected={true}
            />
          )}

          {/* Resize handles */}
          {showResizeHandles && (
            <div className="pointer-events-auto">
              <ResizeHandles
                elementId={selectedElement.id}
                showCorners={true}
                showEdges={true}
              />
            </div>
          )}

          {/* Action toolbar */}
          {showActions && selectedBounds.top > 40 && (
            <div className="pointer-events-auto">
              <ActionToolbar
                element={selectedElement}
                position={{ top: 0, right: 0 }}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            </div>
          )}
        </div>
      )}
    </div>,
    containerElement
  );
}

export const SelectionOverlay = memo(SelectionOverlayComponent);

export default SelectionOverlay;
