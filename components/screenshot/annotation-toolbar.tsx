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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ColorPicker } from './color-picker';
import type { AnnotationTool, AnnotationStyle } from '@/types/screenshot';

interface AnnotationToolbarProps {
  currentTool: AnnotationTool;
  style: AnnotationStyle;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: AnnotationTool) => void;
  onStyleChange: (style: Partial<AnnotationStyle>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onCopy: () => void;
  onSave: () => void;
  className?: string;
}

interface ToolButton {
  id: AnnotationTool;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

const toolDefinitions: ToolButton[] = [
  { id: 'rectangle', icon: Square, shortcut: 'R' },
  { id: 'ellipse', icon: Circle, shortcut: 'O' },
  { id: 'arrow', icon: ArrowRight, shortcut: 'A' },
  { id: 'freehand', icon: Pencil, shortcut: 'P' },
  { id: 'text', icon: Type, shortcut: 'T' },
  { id: 'blur', icon: Grid3X3, shortcut: 'M' },
  { id: 'highlight', icon: Highlighter, shortcut: 'H' },
  { id: 'marker', icon: Hash, shortcut: 'N' },
];

export function AnnotationToolbar({
  currentTool,
  style,
  canUndo,
  canRedo,
  onToolChange,
  onStyleChange,
  onUndo,
  onRedo,
  onClear,
  onConfirm,
  onCancel,
  onCopy,
  onSave,
  className,
}: AnnotationToolbarProps) {
  const t = useTranslations('screenshot');

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 bg-background/95 backdrop-blur rounded-lg shadow-lg border',
        className
      )}
    >
      {/* Annotation Tools */}
      <div className="flex items-center gap-0.5">
        {toolDefinitions.map(({ id, icon: Icon, shortcut }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant={currentTool === id ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => onToolChange(id)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t(`tools.${id}`)}
                {shortcut && <span className="ml-1 text-muted-foreground">({shortcut})</span>}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Color & Stroke */}
      <ColorPicker
        color={style.color}
        strokeWidth={style.strokeWidth}
        onColorChange={(color) => onStyleChange({ color })}
        onStrokeWidthChange={(strokeWidth) => onStyleChange({ strokeWidth })}
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
