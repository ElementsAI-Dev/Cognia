'use client';

/**
 * Annotation Toolbar Component
 *
 * Toolbar with annotation tools for screenshot editor.
 */

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
  label: string;
  shortcut?: string;
}

const tools: ToolButton[] = [
  { id: 'rectangle', icon: Square, label: '矩形', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: '椭圆', shortcut: 'O' },
  { id: 'arrow', icon: ArrowRight, label: '箭头', shortcut: 'A' },
  { id: 'freehand', icon: Pencil, label: '画笔', shortcut: 'P' },
  { id: 'text', icon: Type, label: '文字', shortcut: 'T' },
  { id: 'blur', icon: Grid3X3, label: '马赛克', shortcut: 'M' },
  { id: 'highlight', icon: Highlighter, label: '高亮', shortcut: 'H' },
  { id: 'marker', icon: Hash, label: '序号', shortcut: 'N' },
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
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 bg-background/95 backdrop-blur rounded-lg shadow-lg border',
        className
      )}
    >
      {/* Annotation Tools */}
      <div className="flex items-center gap-0.5">
        {tools.map(({ id, icon: Icon, label, shortcut }) => (
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
                {label}
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
            <p>撤销 (Ctrl+Z)</p>
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
            <p>重做 (Ctrl+Y)</p>
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
            <p>清除标注</p>
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
            <p>复制到剪贴板 (Ctrl+C)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSave}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>保存 (Ctrl+S)</p>
          </TooltipContent>
        </Tooltip>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-destructive hover:text-destructive"
          onClick={onCancel}
        >
          <X className="h-4 w-4 mr-1" />
          取消
        </Button>

        <Button variant="default" size="sm" className="h-8 px-3" onClick={onConfirm}>
          <Check className="h-4 w-4 mr-1" />
          完成
        </Button>
      </div>
    </div>
  );
}
