'use client';

/**
 * JupyterRenderer - Renders Jupyter notebook cells with proper styling
 * Enhanced with toolbar, LaTeX support, ANSI colors, and export functionality
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Code,
  FileText,
  AlertCircle,
  Download,
  FileCode,
  Trash2,
  Copy,
  Check,
  Terminal,
  Braces,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { MathBlock } from '@/components/chat/renderers/math-block';
import { MarkdownRenderer } from './artifact-renderers';
import {
  parseNotebook,
  getCellSource,
  getCellTextOutput,
  getCellHtmlOutput,
  getCellImageOutput,
  getCellLatexOutput,
  getCellJsonOutput,
  parseAnsiToHtml,
  hasAnsiCodes,
  getNotebookLanguage,
  notebookToScript,
  notebookToMarkdown,
  clearAllOutputs,
  serializeNotebook,
  addCell,
  removeCell,
  moveCell,
  updateCell,
  createCodeCell,
  createMarkdownCell,
} from '@/lib/jupyter';
import type { JupyterCell, JupyterOutput, JupyterNotebook } from '@/types';

interface JupyterRendererProps {
  content: string;
  className?: string;
  onCellExecute?: (cellIndex: number, source: string) => void;
  onNotebookChange?: (content: string) => void;
  showToolbar?: boolean;
}

export function JupyterRenderer({
  content,
  className,
  onCellExecute,
  onNotebookChange,
  showToolbar = true,
}: JupyterRendererProps) {
  const t = useTranslations('jupyterRenderer');
  const [collapsedCells, setCollapsedCells] = useState<Set<number>>(new Set());
  const [collapsedOutputs, setCollapsedOutputs] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<number | null>(null);
  const [editSource, setEditSource] = useState<string>('');

  const notebook = useMemo(() => {
    try {
      return parseNotebook(content);
    } catch (err) {
      console.error('Failed to parse notebook:', err);
      return null;
    }
  }, [content]);

  const language = notebook ? getNotebookLanguage(notebook) : 'python';

  // Export handlers
  const handleExportScript = useCallback(() => {
    if (!notebook) return;
    const script = notebookToScript(notebook);
    downloadFile(script, 'notebook.py', 'text/x-python');
  }, [notebook]);

  const handleExportMarkdown = useCallback(() => {
    if (!notebook) return;
    const md = notebookToMarkdown(notebook);
    downloadFile(md, 'notebook.md', 'text/markdown');
  }, [notebook]);

  const handleExportNotebook = useCallback(() => {
    if (!notebook) return;
    const json = serializeNotebook(notebook);
    downloadFile(json, 'notebook.ipynb', 'application/json');
  }, [notebook]);

  const handleClearOutputs = useCallback(() => {
    if (!notebook || !onNotebookChange) return;
    const cleared = clearAllOutputs(notebook);
    onNotebookChange(serializeNotebook(cleared));
  }, [notebook, onNotebookChange]);

  const handleCopyCell = useCallback(
    (cellIndex: number) => {
      if (!notebook) return;
      const source = getCellSource(notebook.cells[cellIndex]);
      navigator.clipboard.writeText(source);
      setCopied(`cell-${cellIndex}`);
      setTimeout(() => setCopied(null), 2000);
    },
    [notebook]
  );

  // Cell management handlers
  const handleAddCell = useCallback(
    (index: number, type: 'code' | 'markdown') => {
      if (!notebook || !onNotebookChange) return;
      const cell = type === 'code' ? createCodeCell('') : createMarkdownCell('');
      const updated = addCell(notebook, cell, index);
      onNotebookChange(serializeNotebook(updated));
      setEditingCell(index);
      setEditSource('');
    },
    [notebook, onNotebookChange]
  );

  const handleDeleteCell = useCallback(
    (index: number) => {
      if (!notebook || !onNotebookChange) return;
      if (notebook.cells.length <= 1) return;
      const updated = removeCell(notebook, index);
      onNotebookChange(serializeNotebook(updated));
      if (editingCell === index) setEditingCell(null);
    },
    [notebook, onNotebookChange, editingCell]
  );

  const handleMoveCell = useCallback(
    (fromIndex: number, direction: 'up' | 'down') => {
      if (!notebook || !onNotebookChange) return;
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= notebook.cells.length) return;
      const updated = moveCell(notebook, fromIndex, toIndex);
      onNotebookChange(serializeNotebook(updated));
      if (editingCell === fromIndex) setEditingCell(toIndex);
    },
    [notebook, onNotebookChange, editingCell]
  );

  const handleStartEdit = useCallback(
    (index: number) => {
      if (!notebook) return;
      setEditingCell(index);
      setEditSource(getCellSource(notebook.cells[index]));
    },
    [notebook]
  );

  const handleSaveEdit = useCallback(
    (index: number) => {
      if (!notebook || !onNotebookChange) return;
      const updated = updateCell(notebook, index, { source: editSource });
      onNotebookChange(serializeNotebook(updated));
      setEditingCell(null);
    },
    [notebook, onNotebookChange, editSource]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditSource('');
  }, []);

  const toggleCellCollapse = (index: number) => {
    setCollapsedCells((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleOutputCollapse = (index: number) => {
    setCollapsedOutputs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const collapseAll = useCallback(() => {
    if (!notebook) return;
    setCollapsedCells(new Set(notebook.cells.map((_, i) => i)));
  }, [notebook]);

  const expandAll = useCallback(() => {
    setCollapsedCells(new Set());
  }, []);

  // Count statistics
  const stats = useMemo(() => {
    if (!notebook) return { code: 0, markdown: 0, outputs: 0 };
    let code = 0,
      markdown = 0,
      outputs = 0;
    for (const cell of notebook.cells) {
      if (cell.cell_type === 'code') {
        code++;
        outputs += cell.outputs?.length || 0;
      } else if (cell.cell_type === 'markdown') {
        markdown++;
      }
    }
    return { code, markdown, outputs };
  }, [notebook]);

  if (!notebook) {
    return (
      <div className={cn('p-4 text-destructive', className)}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{t('parseError')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <NotebookToolbar
          notebook={notebook}
          language={language}
          stats={stats}
          onExportScript={handleExportScript}
          onExportMarkdown={handleExportMarkdown}
          onExportNotebook={handleExportNotebook}
          onClearOutputs={onNotebookChange ? handleClearOutputs : undefined}
          onCollapseAll={collapseAll}
          onExpandAll={expandAll}
          t={t}
        />
      )}

      {/* Cells */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {/* Add cell button at top */}
          {onNotebookChange && (
            <AddCellButton
              onAddCode={() => handleAddCell(0, 'code')}
              onAddMarkdown={() => handleAddCell(0, 'markdown')}
              t={t}
            />
          )}
          {notebook.cells.map((cell, index) => (
            <div key={cell.id || index}>
              <NotebookCell
                cell={cell}
                index={index}
                language={language}
                isCollapsed={collapsedCells.has(index)}
                isOutputCollapsed={collapsedOutputs.has(index)}
                isEditing={editingCell === index}
                editSource={editingCell === index ? editSource : ''}
                canEdit={!!onNotebookChange}
                totalCells={notebook.cells.length}
                onToggleCollapse={() => toggleCellCollapse(index)}
                onToggleOutputCollapse={() => toggleOutputCollapse(index)}
                onExecute={
                  onCellExecute ? () => onCellExecute(index, getCellSource(cell)) : undefined
                }
                onCopy={() => handleCopyCell(index)}
                onDelete={() => handleDeleteCell(index)}
                onMoveUp={() => handleMoveCell(index, 'up')}
                onMoveDown={() => handleMoveCell(index, 'down')}
                onStartEdit={() => handleStartEdit(index)}
                onSaveEdit={() => handleSaveEdit(index)}
                onCancelEdit={handleCancelEdit}
                onEditSourceChange={setEditSource}
                isCopied={copied === `cell-${index}`}
                t={t}
              />
              {/* Add cell button between cells */}
              {onNotebookChange && (
                <AddCellButton
                  onAddCode={() => handleAddCell(index + 1, 'code')}
                  onAddMarkdown={() => handleAddCell(index + 1, 'markdown')}
                  t={t}
                />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function to download file
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Toolbar component
interface NotebookToolbarProps {
  notebook: JupyterNotebook;
  language: string;
  stats: { code: number; markdown: number; outputs: number };
  onExportScript: () => void;
  onExportMarkdown: () => void;
  onExportNotebook: () => void;
  onClearOutputs?: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  t: ReturnType<typeof useTranslations>;
}

function NotebookToolbar({
  language,
  stats,
  onExportScript,
  onExportMarkdown,
  onExportNotebook,
  onClearOutputs,
  onCollapseAll,
  onExpandAll,
  t,
}: NotebookToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
      {/* Notebook info */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-mono">
          {language}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {stats.code} {t('codeCells')} · {stats.markdown} {t('markdownCells')}
          {stats.outputs > 0 && ` · ${stats.outputs} ${t('outputs')}`}
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandAll}>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('expandAll')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCollapseAll}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('collapseAll')}</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExportScript}>
                <FileCode className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportScript')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExportMarkdown}>
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportMarkdown')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExportNotebook}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('exportNotebook')}</TooltipContent>
          </Tooltip>

          {onClearOutputs && (
            <>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={onClearOutputs}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('clearOutputs')}</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}

// Add cell button between cells
interface AddCellButtonProps {
  onAddCode: () => void;
  onAddMarkdown: () => void;
  t: ReturnType<typeof useTranslations>;
}

function AddCellButton({ onAddCode, onAddMarkdown }: AddCellButtonProps) {
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

interface NotebookCellProps {
  cell: JupyterCell;
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

function NotebookCell({
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
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onToggleCollapse}>
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
                  <TooltipContent>Move up</TooltipContent>
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
                  <TooltipContent>Move down</TooltipContent>
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
                  <TooltipContent>{isEditing ? 'Cancel edit' : 'Edit cell'}</TooltipContent>
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
                <TooltipContent>Delete cell</TooltipContent>
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
                placeholder={isCodeCell ? '# Enter code...' : 'Enter markdown...'}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onCancelEdit();
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSaveEdit();
                }}
                autoFocus
              />
              <div className="flex items-center justify-end gap-2 px-3 py-1.5 border-t bg-muted/20">
                <span className="text-[10px] text-muted-foreground mr-auto">
                  Ctrl+Enter to save · Esc to cancel
                </span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" className="h-6 text-xs" onClick={onSaveEdit}>
                  Save
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
            <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap bg-muted/20">
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

interface CellOutputProps {
  output: JupyterOutput;
  cell: JupyterCell;
}

function CellOutput({ output, cell }: CellOutputProps) {
  // Handle stream output
  if (output.output_type === 'stream') {
    const text = Array.isArray(output.text) ? output.text.join('') : output.text || '';
    const isError = output.name === 'stderr';
    const hasAnsi = hasAnsiCodes(text);

    if (hasAnsi) {
      return (
        <pre
          className={cn(
            'text-sm font-mono p-2 rounded overflow-x-auto whitespace-pre-wrap',
            isError ? 'bg-destructive/10' : 'bg-muted'
          )}
          dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(text) }}
        />
      );
    }

    return (
      <pre
        className={cn(
          'text-sm font-mono p-2 rounded overflow-x-auto whitespace-pre-wrap',
          isError ? 'bg-destructive/10 text-destructive' : 'bg-muted'
        )}
      >
        {text}
      </pre>
    );
  }

  // Handle error output with ANSI color support
  if (output.output_type === 'error') {
    const traceback = output.traceback?.join('\n') || '';
    const hasAnsi = hasAnsiCodes(traceback);

    return (
      <div className="bg-destructive/10 rounded p-3 overflow-hidden">
        <div className="font-semibold text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {output.ename}: {output.evalue}
          </span>
        </div>
        {traceback && (
          <pre
            className="text-xs mt-2 overflow-x-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: hasAnsi ? parseAnsiToHtml(traceback) : traceback,
            }}
          />
        )}
      </div>
    );
  }

  // Handle execute_result and display_data
  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    // Try to render in order of preference: image > latex > html > json > text
    const imageOutput = getCellImageOutput(cell);
    const latexOutput = getCellLatexOutput(cell);
    const htmlOutput = getCellHtmlOutput(cell);
    const jsonOutput = getCellJsonOutput(cell);
    const textOutput = getCellTextOutput(cell);

    // Image output
    if (imageOutput) {
      const isBase64 = !imageOutput.data.startsWith('http') && !imageOutput.data.startsWith('<');
      const src =
        imageOutput.mimeType === 'image/svg+xml'
          ? `data:image/svg+xml,${encodeURIComponent(imageOutput.data)}`
          : isBase64
            ? `data:${imageOutput.mimeType};base64,${imageOutput.data}`
            : imageOutput.data;

      return (
        <div className="flex justify-center p-2 bg-white dark:bg-muted rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Cell output" className="max-w-full max-h-[500px] object-contain" />
        </div>
      );
    }

    // LaTeX/Math output
    if (latexOutput) {
      return (
        <div className="p-3 bg-muted rounded overflow-x-auto">
          <MathBlock content={latexOutput} />
        </div>
      );
    }

    // HTML output (e.g., pandas DataFrames)
    if (htmlOutput) {
      return (
        <div
          className={cn(
            'p-2 bg-muted rounded overflow-x-auto',
            'prose prose-sm dark:prose-invert max-w-none',
            '[&_table]:w-full [&_table]:border-collapse',
            '[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted',
            '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
            '[&_tr:hover]:bg-muted/50'
          )}
          dangerouslySetInnerHTML={{ __html: htmlOutput }}
        />
      );
    }

    // JSON output
    if (jsonOutput) {
      return (
        <div className="rounded overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 text-xs text-muted-foreground">
            <Braces className="h-3 w-3" />
            <span>JSON</span>
          </div>
          <pre className="text-sm font-mono p-2 bg-muted overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(jsonOutput, null, 2)}
          </pre>
        </div>
      );
    }

    // Plain text output
    if (textOutput) {
      const hasAnsi = hasAnsiCodes(textOutput);
      if (hasAnsi) {
        return (
          <pre
            className="text-sm font-mono p-2 bg-muted rounded overflow-x-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: parseAnsiToHtml(textOutput) }}
          />
        );
      }
      return (
        <pre className="text-sm font-mono p-2 bg-muted rounded overflow-x-auto whitespace-pre-wrap">
          {textOutput}
        </pre>
      );
    }
  }

  return null;
}

export default JupyterRenderer;
