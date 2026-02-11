'use client';

/**
 * JupyterRenderer - Renders Jupyter notebook cells with proper styling
 * Enhanced with toolbar, LaTeX support, ANSI colors, and export functionality
 */

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loggers } from '@/lib/logger';
import { downloadFile } from '@/lib/utils/download';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  parseNotebook,
  getCellSource,
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
import { NotebookToolbar } from './jupyter-toolbar';
import { NotebookCell, AddCellButton } from './jupyter-cell';

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
      loggers.ui.error('Failed to parse notebook', { error: err instanceof Error ? err.message : String(err) });
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
