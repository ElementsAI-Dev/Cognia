'use client';

/**
 * MathInline - Renders inline LaTeX math expressions using KaTeX
 * Features:
 * - Click to copy LaTeX source
 * - Hover tooltip showing source
 * - Accessibility support
 */

import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCopy } from '@/hooks/ui';
import { Check, Copy } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathInlineProps {
  content: string;
  className?: string;
  scale?: number;
  showCopyOnHover?: boolean;
}

export function MathInline({ 
  content, 
  className, 
  scale = 1,
  showCopyOnHover = true,
}: MathInlineProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { copy, isCopying } = useCopy({ toastMessage: 'LaTeX copied' });

  const cleanContent = useMemo(() => {
    return content
      .replace(/^\$/, '')
      .replace(/\$$/, '')
      .replace(/^\\\(/, '')
      .replace(/\\\)$/, '')
      .trim();
  }, [content]);

  const result = useMemo(() => {
    try {
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
  }, [cleanContent]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await copy(cleanContent);
  }, [copy, cleanContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copy(cleanContent);
    }
  }, [copy, cleanContent]);

  if (result.error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <code 
            className={cn(
              'px-1 py-0.5 rounded bg-destructive/10 text-destructive text-sm cursor-help',
              className
            )}
            role="math"
            aria-label={`Invalid math expression: ${cleanContent}`}
          >
            {content}
          </code>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <p className="font-medium text-destructive">LaTeX Error</p>
            <p className="text-muted-foreground">{result.error}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  const scaleStyle = scale !== 1 ? { fontSize: `${scale}em` } : undefined;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'katex-inline inline-flex items-center gap-0.5 cursor-pointer',
            'hover:bg-muted/50 rounded px-0.5 -mx-0.5 transition-colors',
            className
          )}
          style={scaleStyle}
          role="math"
          aria-label={`Math: ${cleanContent}`}
          tabIndex={0}
          onClick={handleCopy}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span dangerouslySetInnerHTML={{ __html: result.html }} />
          {showCopyOnHover && isHovered && (
            <span className="inline-flex items-center text-muted-foreground ml-0.5">
              {isCopying ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p className="font-mono bg-muted px-1.5 py-0.5 rounded">{cleanContent}</p>
          <p className="text-muted-foreground">Click to copy</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
