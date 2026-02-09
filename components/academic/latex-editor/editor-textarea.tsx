'use client';

/**
 * Editor Textarea - Reusable textarea component for LaTeX editor
 * Eliminates duplicate textarea rendering code in source and split modes
 */

import { forwardRef, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useInputCompletionUnified } from '@/hooks/chat/use-input-completion-unified';
import { useCompletionSettingsStore } from '@/stores/settings/completion-settings-store';
import { GhostTextOverlay } from '@/components/chat/ghost-text-overlay';

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
  /** Enable AI ghost text completion */
  enableAiCompletion?: boolean;
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
      enableAiCompletion = false,
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref && 'current' in ref ? ref : internalRef) as React.RefObject<HTMLTextAreaElement>;
    const [textareaMounted, setTextareaMounted] = useState(false);
    const ghostTextOpacity = useCompletionSettingsStore((s) => s.ghostTextOpacity);

    useEffect(() => {
      setTextareaMounted(!!textareaRef.current);
    }, [textareaRef]);

    // AI ghost text completion for LaTeX
    const {
      state: completionState,
      handleInputChange: handleCompletionChange,
      handleKeyDown: handleCompletionKeyDown,
      acceptGhostText,
      dismissGhostText,
    } = useInputCompletionUnified({
      enableAiCompletion: enableAiCompletion && !readOnly,
      onAiCompletionAccept: (text) => {
        // Simulate onChange event with the accepted text
        const textarea = textareaRef.current;
        if (textarea) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
          )?.set;
          nativeInputValueSetter?.call(textarea, value + text);
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    });

    const ghostText = completionState.ghostText;

    // Enhanced onChange that notifies the completion system
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e);
        if (enableAiCompletion) {
          const pos = e.target.selectionStart || 0;
          handleCompletionChange(e.target.value, pos);
        }
      },
      [onChange, enableAiCompletion, handleCompletionChange]
    );

    // Enhanced onKeyDown with ghost text support
    const handleKeyDownEnhanced = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (enableAiCompletion) {
          const handled = handleCompletionKeyDown(e.nativeEvent);
          if (handled) return;
        }
        onKeyDown(e);
      },
      [enableAiCompletion, handleCompletionKeyDown, onKeyDown]
    );

    const lineCount = useMemo(() => value.split('\n').length, [value]);
    const lineNumbers = useMemo(() => 
      Array.from({ length: lineCount }, (_, i) => i + 1), 
      [lineCount]
    );
    const lineHeightPx = config.fontSize * 1.5;
    const showLineNumbers = config.lineNumbers !== false;

    if (!showLineNumbers) {
      return (
        <div className="relative w-full h-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDownEnhanced}
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
          {ghostText && textareaMounted && (
            <GhostTextOverlay
              text={ghostText}
              textareaRef={textareaRef}
              onAccept={acceptGhostText}
              onDismiss={dismissGhostText}
              opacity={ghostTextOpacity}
            />
          )}
        </div>
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
        <div className="relative flex-1 h-full">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDownEnhanced}
            onSelect={onSelect}
            onClick={onClick}
            onContextMenu={onContextMenu}
            className={cn(
              'w-full h-full min-h-0 p-4 resize-none focus:outline-none',
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
          {ghostText && textareaMounted && (
            <GhostTextOverlay
              text={ghostText}
              textareaRef={textareaRef}
              onAccept={acceptGhostText}
              onDismiss={dismissGhostText}
              opacity={ghostTextOpacity}
            />
          )}
        </div>
      </div>
    );
  }
);

EditorTextarea.displayName = 'EditorTextarea';

export default EditorTextarea;
