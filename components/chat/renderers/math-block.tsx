'use client';

/**
 * MathBlock - Renders block-level LaTeX math expressions using KaTeX
 */

import { useMemo, useState } from 'react';
import { AlertCircle, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  content: string;
  className?: string;
}

export function MathBlock({ content, className }: MathBlockProps) {
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      const cleanContent = content
        .replace(/^\$\$/, '')
        .replace(/\$\$$/, '')
        .replace(/^\\\[/, '')
        .replace(/\\\]$/, '')
        .trim();

      const rendered = katex.renderToString(cleanContent, {
        displayMode: true,
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result.error) {
    return (
      <div className={cn('flex flex-col gap-2 p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}>
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">LaTeX Error</span>
        </div>
        <p className="text-xs text-muted-foreground">{result.error}</p>
        <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-auto">
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={cn('group relative my-4', className)}>
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div
        className="overflow-x-auto py-2 text-center katex-block"
        dangerouslySetInnerHTML={{ __html: result.html }}
      />
    </div>
  );
}
