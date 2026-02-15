'use client';

/**
 * CellOutput - Renders individual Jupyter cell outputs
 * Supports stream, error, execute_result, and display_data output types
 */

import DOMPurify from 'dompurify';
import { AlertCircle, Braces } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MathBlock } from '@/components/chat/renderers/math-block';
import {
  parseAnsiToHtml,
  hasAnsiCodes,
} from '@/lib/jupyter';
import type { JupyterOutput } from '@/types';

interface CellOutputProps {
  output: JupyterOutput;
  cell?: unknown;
}

export function CellOutput({ output }: CellOutputProps) {
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
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseAnsiToHtml(text)) }}
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
              __html: DOMPurify.sanitize(hasAnsi ? parseAnsiToHtml(traceback) : traceback),
            }}
          />
        )}
      </div>
    );
  }

  // Handle execute_result and display_data
  if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
    const data = output.data || {};
    const resolveField = (field: string | string[] | undefined): string =>
      Array.isArray(field) ? field.join('') : field || '';

    // Try to render in order of preference: image > latex > html > json > text
    const imageMimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    const imageMime = imageMimeTypes.find((m) => data[m]);
    if (imageMime) {
      const imgData = resolveField(data[imageMime]);
      const isBase64 = !imgData.startsWith('http') && !imgData.startsWith('<');
      const src =
        imageMime === 'image/svg+xml'
          ? `data:image/svg+xml,${encodeURIComponent(imgData)}`
          : isBase64
            ? `data:${imageMime};base64,${imgData}`
            : imgData;

      return (
        <div className="flex justify-center p-2 bg-white dark:bg-muted rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Cell output" className="max-w-full max-h-[500px] object-contain" />
        </div>
      );
    }

    // LaTeX/Math output
    if (data['text/latex']) {
      return (
        <div className="p-3 bg-muted rounded overflow-x-auto">
          <MathBlock content={resolveField(data['text/latex'])} />
        </div>
      );
    }

    // HTML output (e.g., pandas DataFrames)
    if (data['text/html']) {
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
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resolveField(data['text/html']), { ADD_TAGS: ['style'], ADD_ATTR: ['class', 'colspan', 'rowspan'] }) }}
        />
      );
    }

    // JSON output
    if (data['application/json']) {
      return (
        <div className="rounded overflow-hidden">
          <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 text-xs text-muted-foreground">
            <Braces className="h-3 w-3" />
            <span>JSON</span>
          </div>
          <pre className="text-sm font-mono p-2 bg-muted overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(data['application/json'], null, 2)}
          </pre>
        </div>
      );
    }

    // Plain text output
    if (data['text/plain']) {
      const textOutput = resolveField(data['text/plain']);
      const hasAnsi = hasAnsiCodes(textOutput);
      if (hasAnsi) {
        return (
          <pre
            className="text-sm font-mono p-2 bg-muted rounded overflow-x-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseAnsiToHtml(textOutput)) }}
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
