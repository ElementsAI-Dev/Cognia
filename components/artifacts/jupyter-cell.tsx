'use client';

/**
 * NotebookCell + AddCellButton - Individual Jupyter cell rendering
 * Handles cell header, actions, editing, code/markdown display, and output
 */

import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Code,
  FileText,
  Trash2,
  Copy,
  Check,
  Terminal,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { MarkdownRenderer } from './artifact-renderers';
import { CellOutput } from './jupyter-cell-output';
import { getCellSource } from '@/lib/jupyter';
import type { JupyterCell as JupyterCellType } from '@/types';

interface AddCellButtonProps {
  onAddCode: () => void;
  onAddMarkdown: () => void;
  t: ReturnType<typeof useTranslations>;
}

export function AddCellButton({ onAddCode, onAddMarkdown }: AddCellButtonProps) {
  return (
    <div className="flex items-center justify-center py-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground gap-1"
          onClick={onAddCode}
        >
          <Plus className="h-3 w-3" />
          <Code className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground gap-1"
          onClick={onAddMarkdown}
        >
          <Plus className="h-3 w-3" />
          <Type className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export interface NotebookCellProps {
  cell: JupyterCellType;
  index: number;
  language: string;
  isCollapsed: boolean;
  isOutputCollapsed: boolean;
  isEditing: boolean;
  editSource: string;
  canEdit: boolean;
  totalCells: number;
  onToggleCollapse: () => void;
  onToggleOutputCollapse: () => void;
  onExecute?: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditSourceChange: (source: string) => void;
  isCopied: boolean;
  t: ReturnType<typeof useTranslations>;
}

export function NotebookCell({
  cell,
  index,
  language,
  isCollapsed,
  isOutputCollapsed,
  isEditing,
  editSource,
  canEdit,
  totalCells,
  onToggleCollapse,
  onToggleOutputCollapse,
  onExecute,
  onCopy,
  onDelete,
  onMoveUp,
  onMoveDown,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditSourceChange,
  isCopied,
  t,
}: NotebookCellProps) {
  const source = getCellSource(cell);
  const isCodeCell = cell.cell_type === 'code';
  const isMarkdownCell = cell.cell_type === 'markdown';
  const hasOutputs = isCodeCell && cell.outputs && cell.outputs.length > 0;

  return (
    <div className="group rounded-lg border bg-card overflow-hidden shadow-sm">
      {/* Cell header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onToggleCollapse} aria-expanded={!isCollapsed} aria-label={isCollapsed ? t('cellCollapsed') : t('cellExpanded')}>
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>

        <div className="flex items-center gap-1.5 min-w-0">
          {isCodeCell ? (
            <Code className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          ) : isMarkdownCell ? (
            <FileText className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground">[{index + 1}]</span>
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] h-4 px-1',
              isCodeCell && 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
              isMarkdownCell && 'bg-green-500/10 text-green-600 dark:text-green-400'
            )}
          >
            {cell.cell_type}
          </Badge>
        </div>

        {isCodeCell && cell.execution_count !== null && (
          <span className="text-xs text-muted-foreground font-mono">
            In [{cell.execution_count}]
          </span>
        )}

        <div className="flex-1" />

        {/* Cell actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            {canEdit && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={onMoveUp}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('moveUp')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={onMoveDown}
                      disabled={index === totalCells - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('moveDown')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={isEditing ? onCancelEdit : onStartEdit}
                    >
                      <Pencil className={cn('h-3 w-3', isEditing && 'text-primary')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isEditing ? t('cancelEdit') : t('editCell')}</TooltipContent>
                </Tooltip>
              </>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onCopy}>
                  {isCopied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isCopied ? t('copied') : t('copyCell')}</TooltipContent>
            </Tooltip>

            {isCodeCell && onExecute && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onExecute}>
                    <Play className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('runCell')}</TooltipContent>
              </Tooltip>
            )}

            {canEdit && totalCells > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('deleteCell')}</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Cell content */}
      {!isCollapsed && (
        <div className="relative">
          {isEditing ? (
            <div className="flex flex-col">
              <textarea
                value={editSource}
                onChange={(e) => onEditSourceChange(e.target.value)}
                className="w-full min-h-[120px] p-3 text-sm font-mono bg-background border-none outline-none resize-y focus:ring-1 focus:ring-primary"
                placeholder={isCodeCell ? t('enterCode') : t('enterMarkdown')}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelEdit();
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSaveEdit();
                }}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-t bg-muted/20">
                <span className="text-[10px] text-muted-foreground mr-auto">
                  {t('saveHint')}
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancelEdit}>
                  {t('cancel')}
                </Button>
                <Button size="sm" className="h-6 text-xs" onClick={onSaveEdit}>
                  {t('save')}
                </Button>
              </div>
            </div>
          ) : isCodeCell ? (
            <div className="text-sm" onDoubleClick={canEdit ? onStartEdit : undefined}>
              <CodeBlock
                code={source}
                language={language as 'python' | 'javascript' | 'typescript'}
              />
            </div>
          ) : isMarkdownCell ? (
            <div
              className="p-4 prose prose-sm dark:prose-invert max-w-none"
              onDoubleClick={canEdit ? onStartEdit : undefined}
            >
              <MarkdownRenderer content={source} />
            </div>
          ) : (
            <pre className="p-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              {source}
            </pre>
          )}
        </div>
      )}

      {/* Cell outputs */}
      {hasOutputs && !isCollapsed && (
        <div className="border-t">
          {/* Output header */}
          <div
            className="flex items-center gap-2 px-3 py-1 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={onToggleOutputCollapse}
          >
            {isOutputCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            <span className="text-xs text-muted-foreground">
              {t('output')} ({cell.outputs!.length})
            </span>
            {cell.execution_count !== null && (
              <span className="text-xs text-muted-foreground font-mono">
                Out [{cell.execution_count}]
              </span>
            )}
          </div>

          {/* Output content */}
          {!isOutputCollapsed && (
            <div className="p-3 space-y-2 bg-muted/10">
              {cell.outputs!.map((output, outputIndex) => (
                <CellOutput key={outputIndex} output={output} cell={cell} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotebookCell;
