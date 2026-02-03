'use client';

/**
 * Editor Textarea - Reusable textarea component for LaTeX editor
 * Eliminates duplicate textarea rendering code in source and split modes
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface EditorTextareaConfig {
  fontFamily: string;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  spellCheck: boolean;
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
    },
    ref
  ) => {
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
);

EditorTextarea.displayName = 'EditorTextarea';

export default EditorTextarea;
