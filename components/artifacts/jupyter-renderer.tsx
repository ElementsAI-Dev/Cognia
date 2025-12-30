'use client';

/**
 * JupyterRenderer - Renders Jupyter notebook cells with proper styling
 */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Play, Code, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CodeBlock } from '@/components/ai-elements/code-block';
import { MarkdownRenderer } from './artifact-renderers';
import {
  parseNotebook,
  getCellSource,
  getCellTextOutput,
  getCellHtmlOutput,
  getCellImageOutput,
  getNotebookLanguage,
} from '@/lib/jupyter';
import type { JupyterCell, JupyterOutput } from '@/types';

interface JupyterRendererProps {
  content: string;
  className?: string;
  onCellExecute?: (cellIndex: number, source: string) => void;
}

export function JupyterRenderer({ content, className, onCellExecute }: JupyterRendererProps) {
  const t = useTranslations('jupyterRenderer');
  const [collapsedCells, setCollapsedCells] = useState<Set<number>>(new Set());
  const [collapsedOutputs, setCollapsedOutputs] = useState<Set<number>>(new Set());

  const notebook = useMemo(() => {
    try {
      return parseNotebook(content);
    } catch (err) {
      console.error('Failed to parse notebook:', err);
      return null;
    }
  }, [content]);

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

  const language = getNotebookLanguage(notebook);

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

  return (
    <ScrollArea className={cn('h-full', className)}>
      <div className="p-4 space-y-4">
        {/* Notebook header */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <Badge variant="outline" className="text-xs">
            {language}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {notebook.cells.length} {t('cells')}
          </span>
        </div>

        {/* Cells */}
        {notebook.cells.map((cell, index) => (
          <NotebookCell
            key={index}
            cell={cell}
            index={index}
            language={language}
            isCollapsed={collapsedCells.has(index)}
            isOutputCollapsed={collapsedOutputs.has(index)}
            onToggleCollapse={() => toggleCellCollapse(index)}
            onToggleOutputCollapse={() => toggleOutputCollapse(index)}
            onExecute={onCellExecute ? () => onCellExecute(index, getCellSource(cell)) : undefined}
            t={t}
          />
        ))}
      </div>
    </ScrollArea>
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
  t,
}: NotebookCellProps) {
  const source = getCellSource(cell);
  const isCodeCell = cell.cell_type === 'code';
  const isMarkdownCell = cell.cell_type === 'markdown';

  return (
    <div className="group rounded-lg border bg-card overflow-hidden">
      {/* Cell header */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>

        <div className="flex items-center gap-1.5">
          {isCodeCell ? (
            <Code className="h-3.5 w-3.5 text-blue-500" />
          ) : isMarkdownCell ? (
            <FileText className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-mono text-muted-foreground">
            [{index + 1}]
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {cell.cell_type}
          </Badge>
        </div>

        {isCodeCell && cell.execution_count !== null && (
          <span className="text-xs text-muted-foreground ml-auto">
            In [{cell.execution_count}]
          </span>
        )}

        {isCodeCell && onExecute && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onExecute}
            title={t('runCell')}
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
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
            <pre className="p-4 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              {source}
            </pre>
          )}
        </div>
      )}

      {/* Cell outputs */}
      {isCodeCell && cell.outputs && cell.outputs.length > 0 && !isCollapsed && (
        <div className="border-t">
          {/* Output header */}
          <div
            className="flex items-center gap-2 px-3 py-1 bg-muted/20 cursor-pointer hover:bg-muted/30"
            onClick={onToggleOutputCollapse}
          >
            {isOutputCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            <span className="text-xs text-muted-foreground">
              {t('output')} ({cell.outputs.length})
            </span>
          </div>

          {/* Output content */}
          {!isOutputCollapsed && (
            <div className="p-3 space-y-2">
              {cell.outputs.map((output, outputIndex) => (
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
  // Handle different output types
  if (output.output_type === 'stream') {
    const text = Array.isArray(output.text) ? output.text.join('') : (output.text || '');
    const isError = output.name === 'stderr';

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

  if (output.output_type === 'error') {
    return (
      <div className="bg-destructive/10 text-destructive rounded p-3">
        <div className="font-semibold text-sm">{output.ename}: {output.evalue}</div>
        {output.traceback && (
          <pre className="text-xs mt-2 overflow-x-auto whitespace-pre-wrap">
            {output.traceback.join('\n').replace(/\x1b\[[0-9;]*m/g, '')}
          </pre>
        )}
      </div>
    );
  }

  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    // Try to render in order of preference
    const imageOutput = getCellImageOutput(cell);
    const htmlOutput = getCellHtmlOutput(cell);
    const textOutput = getCellTextOutput(cell);

    if (imageOutput) {
      const isBase64 = !imageOutput.data.startsWith('http') && !imageOutput.data.startsWith('<');
      const src = imageOutput.mimeType === 'image/svg+xml'
        ? `data:image/svg+xml,${encodeURIComponent(imageOutput.data)}`
        : isBase64
          ? `data:${imageOutput.mimeType};base64,${imageOutput.data}`
          : imageOutput.data;

      return (
        <div className="flex justify-center p-2 bg-muted rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Cell output"
            className="max-w-full max-h-[400px] object-contain"
          />
        </div>
      );
    }

    if (htmlOutput) {
      return (
        <div
          className="p-2 bg-muted rounded overflow-x-auto prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlOutput }}
        />
      );
    }

    if (textOutput) {
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
