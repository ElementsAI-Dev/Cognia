'use client';

/**
 * Editor Textarea - Reusable textarea component for LaTeX editor
 * Eliminates duplicate textarea rendering code in source and split modes
 */

import { forwardRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface EditorTextareaConfig {
  fontFamily: string;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  spellCheck: boolean;
  lineNumbers?: boolean;
}

export interface EditorTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSelect: () => void;
  onClick: () => void;
  onContextMenu: () => void;
  config: EditorTextareaConfig;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  currentLine?: number;
}

export const EditorTextarea = forwardRef<HTMLTextAreaElement, EditorTextareaProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onSelect,
      onClick,
      onContextMenu,
      config,
      readOnly = false,
      placeholder = 'Enter LaTeX code here...',
      className,
      currentLine,
    },
    ref
  ) => {
    const lineCount = useMemo(() => value.split('\n').length, [value]);
    const lineNumbers = useMemo(() => 
      Array.from({ length: lineCount }, (_, i) => i + 1), 
      [lineCount]
    );
    const lineHeightPx = config.fontSize * 1.5;
    const showLineNumbers = config.lineNumbers !== false;

    if (!showLineNumbers) {
      return (
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={onSelect}
          onClick={onClick}
          onContextMenu={onContextMenu}
          className={cn(
            'w-full h-full min-h-0 p-4 resize-none focus:outline-none',
            'font-mono text-sm bg-muted/30',
            'overflow-auto',
            config.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre',
            className
          )}
          style={{
            fontFamily: config.fontFamily,
            fontSize: config.fontSize,
            tabSize: config.tabSize,
          }}
          spellCheck={config.spellCheck}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      );
    }

    return (
      <div className={cn('flex h-full w-full', className)}>
        {/* Line Numbers */}
        <div
          className="select-none text-right pr-2 text-muted-foreground/60 border-r border-border/50 bg-muted/20 overflow-hidden"
          style={{
            fontSize: `${config.fontSize}px`,
            lineHeight: `${lineHeightPx}px`,
            fontFamily: config.fontFamily,
            paddingTop: '1rem',
            paddingBottom: '1rem',
            minWidth: `${Math.max(3, String(lineCount).length + 1)}ch`,
          }}
        >
          {lineNumbers.map((num) => (
            <div
              key={num}
              className={cn(
                'px-1',
                currentLine === num && 'text-foreground bg-primary/10 rounded-sm'
              )}
            >
              {num}
            </div>
          ))}
        </div>
        
        {/* Textarea */}
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={onSelect}
          onClick={onClick}
          onContextMenu={onContextMenu}
          className={cn(
            'flex-1 h-full min-h-0 p-4 resize-none focus:outline-none',
            'font-mono text-sm bg-muted/30',
            'overflow-auto',
            config.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
          )}
          style={{
            fontFamily: config.fontFamily,
            fontSize: config.fontSize,
            tabSize: config.tabSize,
            lineHeight: `${lineHeightPx}px`,
          }}
          spellCheck={config.spellCheck}
          readOnly={readOnly}
          placeholder={placeholder}
        />
      </div>
    );
  }
);

EditorTextarea.displayName = 'EditorTextarea';

export default EditorTextarea;
