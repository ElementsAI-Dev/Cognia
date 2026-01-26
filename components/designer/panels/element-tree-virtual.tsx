'use client';

/**
 * ElementTreeVirtual - Virtualized element tree for large component hierarchies
 * Uses @tanstack/react-virtual for efficient rendering of 1000+ elements
 */

import { useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  ChevronsUpDown,
  ChevronsDownUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import {
  useElementTreeVisibility,
  type VirtualElementTreeNode,
} from '@/hooks/designer';
import type { DesignerElement as _DesignerElement } from '@/types/designer';

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

const ITEM_HEIGHT = 28;

interface ElementTreeVirtualProps {
  className?: string;
}

export function ElementTreeVirtual({ className }: ElementTreeVirtualProps) {
  const t = useTranslations('elementTree');
  const elementTree = useDesignerStore((state) => state.elementTree);
  const selectedElementId = useDesignerStore((state) => state.selectedElementId);
  const hoveredElementId = useDesignerStore((state) => state.hoveredElementId);
  const selectElement = useDesignerStore((state) => state.selectElement);
  const hoverElement = useDesignerStore((state) => state.hoverElement);
  const deleteElement = useDesignerStore((state) => state.deleteElement);
  const duplicateElement = useDesignerStore((state) => state.duplicateElement);
  const syncCodeFromElements = useDesignerStore((state) => state.syncCodeFromElements);

  const parentRef = useRef<HTMLDivElement>(null);

  const {
    flattenedNodes,
    toggleExpand,
    expandAll,
    collapseAll,
    totalCount,
  } = useElementTreeVisibility(elementTree);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual's useVirtualizer API design requires returning non-memoizable functions
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 10,
  });

  const handleDeleteElement = useCallback(
    (id: string) => {
      deleteElement(id);
      syncCodeFromElements();
    },
    [deleteElement, syncCodeFromElements]
  );

  const handleDuplicateElement = useCallback(
    (id: string) => {
      duplicateElement(id);
      syncCodeFromElements();
    },
    [duplicateElement, syncCodeFromElements]
  );

  if (!elementTree) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          className
        )}
      >
        <div className="rounded-full bg-muted p-4 mb-4">
          <LayoutGrid className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noElements')}</p>
        <p className="text-xs text-muted-foreground mt-1">{t('noElementsDesc')}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-2 py-1">
          <span className="text-xs text-muted-foreground">
            {flattenedNodes.length} / {totalCount} {t('elements') || 'elements'}
          </span>
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={expandAll}
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('expandAll') || 'Expand all'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={collapseAll}
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('collapseAll') || 'Collapse all'}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Virtualized list */}
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const node = flattenedNodes[virtualRow.index];
              return (
                <VirtualTreeRow
                  key={node.id}
                  node={node}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  isSelected={selectedElementId === node.id}
                  isHovered={hoveredElementId === node.id}
                  onSelect={selectElement}
                  onHover={hoverElement}
                  onToggleExpand={toggleExpand}
                  onDelete={handleDeleteElement}
                  onDuplicate={handleDuplicateElement}
                  t={t}
                />
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface VirtualTreeRowProps {
  node: VirtualElementTreeNode;
  style: React.CSSProperties;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function VirtualTreeRow({
  node,
  style,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onToggleExpand,
  onDelete,
  onDuplicate,
  t,
}: VirtualTreeRowProps) {
  const element = node.element;
  const hasChildren = node.childCount > 0;

  const getDisplayName = () => {
    const tag = element.tagName;
    const className = element.className?.split(' ')[0];
    if (className) {
      return `${tag}.${className}`;
    }
    return tag;
  };

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(element.id);
    },
    [element.id, onSelect]
  );

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(node.id);
    },
    [node.id, onToggleExpand]
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          style={{ ...style, paddingLeft: `${node.depth * 12 + 8}px` }}
          className={cn(
            'group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors',
            isSelected && 'bg-primary/10 text-primary',
            isHovered && !isSelected && 'bg-muted',
            !isSelected && !isHovered && 'hover:bg-muted/50'
          )}
          onClick={handleClick}
          onMouseEnter={() => onHover(element.id)}
          onMouseLeave={() => onHover(null)}
        >
          {/* Drag handle */}
          <div className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggle}
              className="h-4 w-4 p-0 transition-transform duration-200"
            >
              <ChevronRight
                className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  node.expanded && 'rotate-90'
                )}
              />
            </Button>
          ) : (
            <span className="w-4" />
          )}

          {/* Tag icon */}
          <span className="text-muted-foreground">
            {tagIcons[element.tagName] || <Box className="h-3.5 w-3.5" />}
          </span>

          {/* Element name */}
          <span className="flex-1 truncate font-mono text-xs">{getDisplayName()}</span>

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
        <ContextMenuItem
          onClick={() => navigator.clipboard.writeText(element.id)}
        >
          <Type className="h-4 w-4 mr-2" />
          {t('copyId')}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => navigator.clipboard.writeText(element.tagName)}
        >
          <Type className="h-4 w-4 mr-2" />
          {t('copyTagName')}
        </ContextMenuItem>
        {element.className && (
          <ContextMenuItem
            onClick={() =>
              navigator.clipboard.writeText(element.className || '')
            }
          >
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
          <ContextMenuItem onClick={() => onToggleExpand(element.id)}>
            <ChevronRight className="h-4 w-4 mr-2" />
            {node.expanded ? t('collapse') : t('expand')}
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
  );
}

export default ElementTreeVirtual;
