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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  const handleCopyCell = useCallback((cellIndex: number) => {
    if (!notebook) return;
    const source = getCellSource(notebook.cells[cellIndex]);
    navigator.clipboard.writeText(source);
    setCopied(`cell-${cellIndex}`);
    setTimeout(() => setCopied(null), 2000);
  }, [notebook]);

  const toggleCellCollapse = (index: number) => {
    setCollapsedCells(prev => {
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
    setCollapsedOutputs(prev => {
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
    let code = 0, markdown = 0, outputs = 0;
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
        <div className="p-4 space-y-3">
          {notebook.cells.map((cell, index) => (
            <NotebookCell
              key={cell.id || index}
              cell={cell}
              index={index}
              language={language}
              isCollapsed={collapsedCells.has(index)}
              isOutputCollapsed={collapsedOutputs.has(index)}
              onToggleCollapse={() => toggleCellCollapse(index)}
              onToggleOutputCollapse={() => toggleOutputCollapse(index)}
              onExecute={onCellExecute ? () => onCellExecute(index, getCellSource(cell)) : undefined}
              onCopy={() => handleCopyCell(index)}
              isCopied={copied === `cell-${index}`}
              t={t}
            />
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

          <div className="w-px h-4 bg-border mx-1" />

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
              <div className="w-px h-4 bg-border mx-1" />
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

interface NotebookCellProps {
  cell: JupyterCell;
  index: number;
  language: string;
  isCollapsed: boolean;
  isOutputCollapsed: boolean;
  onToggleCollapse: () => void;
  onToggleOutputCollapse: () => void;
  onExecute?: () => void;
  onCopy: () => void;
  isCopied: boolean;
  t: ReturnType<typeof useTranslations>;
}

function NotebookCell({
  cell,
  index,
  language,
  isCollapsed,
  isOutputCollapsed,
  onToggleCollapse,
  onToggleOutputCollapse,
  onExecute,
  onCopy,
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
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        <div className="flex items-center gap-1.5 min-w-0">
          {isCodeCell ? (
            <Code className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          ) : isMarkdownCell ? (
            <FileText className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <Terminal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground">
            [{index + 1}]
          </span>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={onCopy}
                >
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={onExecute}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('runCell')}</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* Cell content */}
      {!isCollapsed && (
        <div className="relative">
          {isCodeCell ? (
            <div className="text-sm">
              <CodeBlock
                code={source}
                language={language as 'python' | 'javascript' | 'typescript'}
              />
            </div>
          ) : isMarkdownCell ? (
            <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
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
    const text = Array.isArray(output.text) ? output.text.join('') : (output.text || '');
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
          <span>{output.ename}: {output.evalue}</span>
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
      const src = imageOutput.mimeType === 'image/svg+xml'
        ? `data:image/svg+xml,${encodeURIComponent(imageOutput.data)}`
        : isBase64
          ? `data:${imageOutput.mimeType};base64,${imageOutput.data}`
          : imageOutput.data;

      return (
        <div className="flex justify-center p-2 bg-white dark:bg-muted rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Cell output"
            className="max-w-full max-h-[500px] object-contain"
          />
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
