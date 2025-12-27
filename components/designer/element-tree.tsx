'use client';

/**
 * ElementTree - Component tree view for the designer
 * Shows hierarchical structure of elements
 */

import { useCallback, useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Box,
  Type,
  ImageIcon,
  Link,
  List,
  Table,
  FormInput,
  LayoutGrid,
  Trash2,
  GripVertical,
  Copy,
} from 'lucide-react';
import { useDesignerDragDrop } from '@/hooks';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer-store';
import type { DesignerElement } from '@/types/designer';

// Map tag names to icons
const tagIcons: Record<string, React.ReactNode> = {
  div: <Box className="h-3.5 w-3.5" />,
  span: <Type className="h-3.5 w-3.5" />,
  p: <Type className="h-3.5 w-3.5" />,
  h1: <Type className="h-3.5 w-3.5 font-bold" />,
  h2: <Type className="h-3.5 w-3.5 font-bold" />,
  h3: <Type className="h-3.5 w-3.5 font-bold" />,
  img: <ImageIcon className="h-3.5 w-3.5" />,
  a: <Link className="h-3.5 w-3.5" />,
  ul: <List className="h-3.5 w-3.5" />,
  ol: <List className="h-3.5 w-3.5" />,
  li: <List className="h-3.5 w-3.5" />,
  table: <Table className="h-3.5 w-3.5" />,
  input: <FormInput className="h-3.5 w-3.5" />,
  button: <Box className="h-3.5 w-3.5" />,
  form: <FormInput className="h-3.5 w-3.5" />,
  section: <LayoutGrid className="h-3.5 w-3.5" />,
  header: <LayoutGrid className="h-3.5 w-3.5" />,
  footer: <LayoutGrid className="h-3.5 w-3.5" />,
  nav: <LayoutGrid className="h-3.5 w-3.5" />,
  main: <LayoutGrid className="h-3.5 w-3.5" />,
  article: <LayoutGrid className="h-3.5 w-3.5" />,
  aside: <LayoutGrid className="h-3.5 w-3.5" />,
};

interface ElementTreeProps {
  className?: string;
}

export function ElementTree({ className }: ElementTreeProps) {
  const elementTree = useDesignerStore((state) => state.elementTree);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  // Drag-drop support
  const {
    isDragging,
    dropTargetId,
    dropPosition,
    createElementDragHandlers,
    createDropHandlers,
  } = useDesignerDragDrop();

  const handleDeleteElement = useCallback((id: string) => {
    deleteElement(id);
    syncCodeFromElements();
  }, [deleteElement, syncCodeFromElements]);

  const handleDuplicateElement = useCallback((id: string) => {
    duplicateElement(id);
    syncCodeFromElements();
  }, [duplicateElement, syncCodeFromElements]);

  if (!elementTree) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="rounded-full bg-muted p-4 mb-4">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No elements</p>
        <p className="text-xs text-muted-foreground mt-1">
          Elements will appear here when code is loaded
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-2">
        <ElementTreeNode
          element={elementTree}
          depth={0}
          selectedId={selectedElementId}
          hoveredId={hoveredElementId}
          onSelect={selectElement}
          onHover={hoverElement}
          onDelete={handleDeleteElement}
          onDuplicate={handleDuplicateElement}
          isDragging={isDragging}
          dropTargetId={dropTargetId}
          dropPosition={dropPosition}
          createElementDragHandlers={createElementDragHandlers}
          createDropHandlers={createDropHandlers}
        />
      </div>
    </ScrollArea>
  );
}

interface ElementTreeNodeProps {
  element: DesignerElement;
  depth: number;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  isDragging: boolean;
  dropTargetId: string | null;
  dropPosition: 'before' | 'after' | 'inside' | null;
  createElementDragHandlers: (elementId: string) => {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
  };
  createDropHandlers: (targetId: string | null) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

function ElementTreeNode({
  element,
  depth,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onDelete,
  onDuplicate,
  isDragging,
  dropTargetId,
  dropPosition,
  createElementDragHandlers,
  createDropHandlers,
}: ElementTreeNodeProps) {
  // Only expand first 2 levels by default (depth 0 and 1)
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = element.children.length > 0;
  const isSelected = selectedId === element.id;
  const isHovered = hoveredId === element.id;
  const isDropTarget = dropTargetId === element.id;

  // Get drag and drop handlers
  const dragHandlers = createElementDragHandlers(element.id);
  const dropHandlers = createDropHandlers(element.id);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(element.id);
    },
    [element.id, onSelect]
  );

  const handleToggle = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded]
  );

  const getDisplayName = () => {
    const tag = element.tagName;
    const className = element.className?.split(' ')[0];
    if (className) {
      return `${tag}.${className}`;
    }
    return tag;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors relative',
              isSelected && 'bg-primary/10 text-primary',
              isHovered && !isSelected && 'bg-muted',
              !isSelected && !isHovered && 'hover:bg-muted/50',
              isDragging && 'opacity-70',
              isDropTarget && dropPosition === 'inside' && 'ring-2 ring-primary ring-inset'
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleClick}
            onMouseEnter={() => onHover(element.id)}
            onMouseLeave={() => onHover(null)}
            {...dragHandlers}
            {...dropHandlers}
          >
            {/* Drop position indicator - before */}
            {isDropTarget && dropPosition === 'before' && (
              <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary rounded-full" />
            )}

            {/* Drop position indicator - after */}
            {isDropTarget && dropPosition === 'after' && (
              <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-primary rounded-full" />
            )}

            {/* Drag handle */}
            <div className="opacity-0 group-hover:opacity-50 hover:opacity-100 cursor-grab active:cursor-grabbing">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>

            {/* Expand/collapse toggle */}
            {hasChildren ? (
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 p-0 transition-transform duration-200"
                >
                  <ChevronRight 
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )} 
                  />
                </Button>
              </CollapsibleTrigger>
            ) : (
              <span className="w-4" />
            )}

            {/* Tag icon */}
            <span className="text-muted-foreground">
              {tagIcons[element.tagName] || <Box className="h-3.5 w-3.5" />}
            </span>

            {/* Element name */}
            <span className="flex-1 truncate font-mono text-xs">
              {getDisplayName()}
            </span>

            {/* Text content preview */}
            {element.textContent && (
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                &quot;{element.textContent.slice(0, 20)}...&quot;
              </span>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onSelect(element.id)}>
            <Box className="h-4 w-4 mr-2" />
            Select Element
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(element.id)}>
            <Type className="h-4 w-4 mr-2" />
            Copy ID
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(element.tagName)}>
            <Type className="h-4 w-4 mr-2" />
            Copy Tag Name
          </ContextMenuItem>
          {element.className && (
            <ContextMenuItem onClick={() => navigator.clipboard.writeText(element.className || '')}>
              <Type className="h-4 w-4 mr-2" />
              Copy Classes
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onDuplicate(element.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </ContextMenuItem>
          {hasChildren && (
            <ContextMenuItem onClick={() => handleToggle()}>
              {isExpanded ? (
                <>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Expand
                </>
              )}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(element.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Element
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children with smooth collapse animation */}
      {hasChildren && (
        <CollapsibleContent>
          {element.children.map((child) => (
            <ElementTreeNode
              key={child.id}
              element={child}
              depth={depth + 1}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              onHover={onHover}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              isDragging={isDragging}
              dropTargetId={dropTargetId}
              dropPosition={dropPosition}
              createElementDragHandlers={createElementDragHandlers}
              createDropHandlers={createDropHandlers}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default ElementTree;
