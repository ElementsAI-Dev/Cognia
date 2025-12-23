'use client';

/**
 * MathInline - Renders inline LaTeX math expressions using KaTeX
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathInlineProps {
  content: string;
  className?: string;
}

export function MathInline({ content, className }: MathInlineProps) {
  const result = useMemo(() => {
    try {
      const cleanContent = content
        .replace(/^\$/, '')
        .replace(/\$$/, '')
        .replace(/^\\\(/, '')
        .replace(/\\\)$/, '')
        .trim();

      const rendered = katex.renderToString(cleanContent, {
        displayMode: false,
        throwOnError: false,
        trust: true,
        strict: false,
        output: 'html',
      });

      return { html: rendered, error: null };
    } catch (err) {
      return { html: '', error: err instanceof Error ? err.message : 'Failed to render math' };
    }
  }, [content]);

  if (result.error) {
    return (
      <code className={cn('px-1 py-0.5 rounded bg-destructive/10 text-destructive text-sm', className)}>
        {content}
      </code>
    );
  }

  return (
    <span
      className={cn('katex-inline', className)}
      dangerouslySetInnerHTML={{ __html: result.html }}
    />
  );
}
