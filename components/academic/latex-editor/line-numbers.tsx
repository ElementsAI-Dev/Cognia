'use client';

/**
 * Line Numbers Component
 * Displays line numbers for the LaTeX editor
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface LineNumbersProps {
  content: string;
  fontSize?: number;
  lineHeight?: number;
  currentLine?: number;
  className?: string;
}

export function LineNumbers({
  content,
  fontSize = 14,
  lineHeight = 1.5,
  currentLine,
  className,
}: LineNumbersProps) {
  const lineCount = useMemo(() => {
    return content.split('\n').length;
  }, [content]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  const lineHeightPx = fontSize * lineHeight;

  return (
    <div
      className={cn(
        'select-none text-right pr-2 text-muted-foreground/60 border-r border-border/50',
        className
      )}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeightPx}px`,
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        paddingTop: '0.75rem',
        paddingBottom: '0.75rem',
        minWidth: `${Math.max(3, String(lineCount).length + 1)}ch`,
      }}
    >
      {lineNumbers.map((num) => (
        <div
          key={num}
          className={cn(
            'px-1',
            currentLine === num && 'text-foreground bg-muted/50 rounded-sm'
          )}
        >
          {num}
        </div>
      ))}
    </div>
  );
}

export default LineNumbers;
