'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import {
  Copy,
  Trash2,
  GripVertical,
  MoreVertical,
  Sparkles,
} from 'lucide-react';
import type { SortableSlideItemProps } from '../types';

/**
 * SortableSlideItem - Draggable slide thumbnail in the slide panel
 */
export const SortableSlideItem = memo(function SortableSlideItem({
  slide,
  index,
  isSelected,
  theme,
  onClick,
  onDuplicate,
  onDelete,
  onRegenerate,
  isGenerating,
  canDelete,
}: SortableSlideItemProps) {
  const t = useTranslations('pptEditor');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            'group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
            isSelected
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-border hover:border-primary/50',
            isDragging && 'opacity-50'
          )}
          onClick={onClick}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10 bg-background/80"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>

          {/* Slide number */}
          <div className="absolute top-1 left-6 text-[10px] font-medium text-muted-foreground bg-background/80 px-1 rounded">
            {index + 1}
          </div>

          {/* Slide preview */}
          <div
            className="aspect-video p-2"
            style={{
              backgroundColor: slide.backgroundColor || theme.backgroundColor,
            }}
          >
            {slide.title && (
              <div
                className="text-[8px] font-medium truncate"
                style={{ color: theme.primaryColor }}
              >
                {slide.title}
              </div>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {slide.bullets.slice(0, 3).map((bullet, i) => (
                  <div
                    key={i}
                    className="text-[6px] truncate"
                    style={{ color: theme.textColor }}
                  >
                    • {bullet}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                {t('duplicate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRegenerate} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('regenerate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                disabled={!canDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          {t('duplicate')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onRegenerate} disabled={isGenerating}>
          <Sparkles className="h-4 w-4 mr-2" />
          {t('regenerate')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDelete}
          disabled={!canDelete}
          className="text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default SortableSlideItem;
