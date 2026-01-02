'use client';

/**
 * ElementTree - Component tree view for the designer
 * Shows hierarchical structure of elements with @dnd-kit sortable support
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronRight,
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
import { useDesignerStore } from '@/stores/designer';
import { useDesignerDnd, type DragItem } from '../dnd';
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
  const t = useTranslations('elementTree');
  const elementTree = useDesignerStore((state) => state.elementTree);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  // Get drag state from DnD context
  const { isDragging, overId } = useDesignerDnd();

  const handleDeleteElement = useCallback((id: string) => {
    deleteElement(id);
    syncCodeFromElements();
  }, [deleteElement, syncCodeFromElements]);

  const handleDuplicateElement = useCallback((id: string) => {
    duplicateElement(id);
    syncCodeFromElements();
  }, [duplicateElement, syncCodeFromElements]);

  // Collect all element IDs for SortableContext
  const allElementIds = useMemo(() => {
    if (!elementTree) return [];
    const ids: string[] = [];
    const collectIds = (element: DesignerElement) => {
      ids.push(element.id);
      element.children.forEach(collectIds);
    };
    collectIds(elementTree);
    return ids;
  }, [elementTree]);

  if (!elementTree) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
        <div className="rounded-full bg-muted p-4 mb-4">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noElements')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('noElementsDesc')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-2">
        <SortableContext items={allElementIds} strategy={verticalListSortingStrategy}>
          <ElementTreeNode
            element={elementTree}
            depth={0}
            selectedId={selectedElementId}
            hoveredId={hoveredElementId}
            onSelect={selectElement}
            onHover={hoverElement}
            onDelete={handleDeleteElement}
            onDuplicate={handleDuplicateElement}
            globalIsDragging={isDragging}
            overElementId={overId as string | null}
            t={t}
          />
        </SortableContext>
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
  globalIsDragging: boolean;
  overElementId: string | null;
  t: ReturnType<typeof useTranslations>;
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
  globalIsDragging,
  overElementId,
  t,
}: ElementTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = element.children.length > 0;
  const isSelected = selectedId === element.id;
  const isHovered = hoveredId === element.id;
  const isDropTarget = overElementId === element.id;

  // Use @dnd-kit sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisNodeDragging,
  } = useSortable({
    id: element.id,
    data: {
      type: 'element',
      elementId: element.id,
    } as DragItem,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isThisNodeDragging ? 0.5 : 1,
  };

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
            ref={setNodeRef}
            style={{ ...style, paddingLeft: `${depth * 12 + 8}px` }}
            className={cn(
              'group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors relative',
              isSelected && 'bg-primary/10 text-primary',
              isHovered && !isSelected && 'bg-muted',
              !isSelected && !isHovered && 'hover:bg-muted/50',
              globalIsDragging && !isThisNodeDragging && 'opacity-70',
              isDropTarget && 'ring-2 ring-primary ring-inset bg-primary/5'
            )}
            onClick={handleClick}
            onMouseEnter={() => onHover(element.id)}
            onMouseLeave={() => onHover(null)}
            {...attributes}
          >
            {/* Drag handle */}
            <div
              className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing touch-none"
              {...listeners}
            >
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
            {t('selectElement')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(element.id)}>
            <Type className="h-4 w-4 mr-2" />
            {t('copyId')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(element.tagName)}>
            <Type className="h-4 w-4 mr-2" />
            {t('copyTagName')}
          </ContextMenuItem>
          {element.className && (
            <ContextMenuItem onClick={() => navigator.clipboard.writeText(element.className || '')}>
              <Type className="h-4 w-4 mr-2" />
              {t('copyClasses')}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onDuplicate(element.id)}>
            <Copy className="h-4 w-4 mr-2" />
            {t('duplicate')}
          </ContextMenuItem>
          {hasChildren && (
            <ContextMenuItem onClick={() => handleToggle()}>
              <ChevronRight className="h-4 w-4 mr-2" />
              {isExpanded ? t('collapse') : t('expand')}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(element.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('deleteElement')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Children */}
      {hasChildren && (
        <CollapsibleContent>
          <SortableContext
            items={element.children.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
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
                globalIsDragging={globalIsDragging}
                overElementId={overElementId}
                t={t}
              />
            ))}
          </SortableContext>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export default ElementTree;
