'use client';

/**
 * Annotation Toolbar Component
 *
 * Toolbar with annotation tools for screenshot editor.
 */

import { useTranslations } from 'next-intl';
import {
  Square,
  Circle,
  ArrowRight,
  Pencil,
  Type,
  Grid3X3,
  Highlighter,
  Hash,
  Undo2,
  Redo2,
  Trash2,
  Check,
  X,
  Copy,
  Download,
  MousePointer2,
  ZoomIn,
  Trash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ColorPicker } from './color-picker';
import type { AnnotationTool, AnnotationStyle } from '@/types/screenshot';

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  style: AnnotationStyle;
  canUndo: boolean;
  canRedo: boolean;
  selectedAnnotationId: string | null;
  showMagnifier: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onStyleChange: (style: Partial<AnnotationStyle>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDelete: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onSave: () => void;
  onToggleMagnifier: () => void;
  className?: string;
}

interface ToolButton {
  id: AnnotationTool;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const toolDefinitions: ToolButton[] = [
  { id: 'select', icon: MousePointer2, shortcut: 'V' },
  { id: 'rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', icon: Circle, shortcut: 'O' },
  { id: 'arrow', icon: ArrowRight, shortcut: 'A' },
  { id: 'freehand', icon: Pencil, shortcut: 'P' },
  { id: 'text', icon: Type, shortcut: 'T' },
  { id: 'blur', icon: Grid3X3, shortcut: 'B' },
  { id: 'highlight', icon: Highlighter, shortcut: 'H' },
  { id: 'marker', icon: Hash, shortcut: 'N' },
];

export function AnnotationToolbar({
  currentTool,
  style,
  canUndo,
  canRedo,
  selectedAnnotationId,
  showMagnifier,
  onToolChange,
  onStyleChange,
  onUndo,
  onRedo,
  onClear,
  onDelete,
  onConfirm,
  onCancel,
  onCopy,
  onSave,
  onToggleMagnifier,
  className,
}: AnnotationToolbarProps) {
  const showFilledToggle = currentTool === 'rectangle' || currentTool === 'ellipse';
  const t = useTranslations('screenshot');

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 bg-background/95 backdrop-blur rounded-lg shadow-lg border',
        className
      )}
    >
      {/* Annotation Tools */}
      <ToggleGroup
        type="single"
        value={currentTool}
        onValueChange={(value) => value && onToolChange(value as AnnotationTool)}
        className="flex items-center gap-0.5"
      >
        {toolDefinitions.map(({ id, icon: Icon, shortcut }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={id} size="sm" className="h-8 w-8 p-0">
                <Icon className="h-4 w-4" />
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t(`tools.${id}`)}
                {shortcut && <span className="ml-1 text-muted-foreground">({shortcut})</span>}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Color & Stroke */}
      <ColorPicker
        color={style.color}
        strokeWidth={style.strokeWidth}
        opacity={style.opacity}
        fontSize={style.fontSize}
        filled={style.filled}
        showFilledToggle={showFilledToggle}
        showOpacity={currentTool === 'highlight' || style.filled}
        showFontSize={currentTool === 'text'}
        onColorChange={(color) => onStyleChange({ color })}
        onStrokeWidthChange={(strokeWidth) => onStyleChange({ strokeWidth })}
        onOpacityChange={(opacity: number) => onStyleChange({ opacity })}
        onFontSizeChange={(fontSize: number) => onStyleChange({ fontSize })}
        onFilledChange={(filled: boolean) => onStyleChange({ filled })}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('actions.undo')} ({t('shortcuts.undo')})</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('actions.redo')} ({t('shortcuts.redo')})</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClear}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('actions.clear')}</p>
          </TooltipContent>
        </Tooltip>

        {selectedAnnotationId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('actions.delete')} (Delete)</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* View Controls */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showMagnifier ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleMagnifier}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('actions.magnifier')} (G)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('actions.copy')} ({t('shortcuts.copy')})</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSave}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('actions.save')} ({t('shortcuts.save')})</p>
          </TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-1" />
          {t('actions.cancel')}
        </Button>

        <Button variant="default" size="sm" className="h-8 px-3" onClick={onConfirm}>
          <Check className="h-4 w-4 mr-1" />
          {t('actions.confirm')}
        </Button>
      </div>
    </div>
  );
}
