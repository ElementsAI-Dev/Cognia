'use client';

/**
 * JupyterRenderer - Renders Jupyter notebook cells with proper styling
 * Enhanced with toolbar, LaTeX support, ANSI colors, and export functionality
 */

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCellSource } from '@/lib/jupyter';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useJupyterNotebook } from '@/hooks/artifacts';
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
  const {
    t,
    notebook,
    language,
    collapsedCells,
    collapsedOutputs,
    copied,
    editingCell,
    editSource,
    stats,
    handleExportScript,
    handleExportMarkdown,
    handleExportNotebook,
    handleClearOutputs,
    handleCopyCell,
    handleAddCell,
    handleDeleteCell,
    handleMoveCell,
    handleStartEdit,
    handleSaveEdit,
    handleCancelEdit,
    setEditSource,
    toggleCellCollapse,
    toggleOutputCollapse,
    collapseAll,
    expandAll,
  } = useJupyterNotebook({ content, onNotebookChange });

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
