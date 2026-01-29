'use client';

/**
 * LaTeX Editor Component
 * A real-time LaTeX editor with preview, syntax highlighting, and autocomplete
 */

import React, { useState, useCallback, useRef, useEffect, startTransition } from 'react';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { LaTeXPreview } from './latex-preview';
import { LaTeXToolbar } from './latex-toolbar';
import { LaTeXAutocomplete } from './latex-autocomplete';
import { validate, extractMetadata } from '@/lib/latex/parser';
import type {
  LaTeXEditorConfig,
  LaTeXEditMode,
  LaTeXError,
  LaTeXSuggestion,
} from '@/types/latex';

// ============================================================================
// Types
// ============================================================================

interface LaTeXEditorProps {
  initialContent?: string;
  config?: Partial<LaTeXEditorConfig>;
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
  onError?: (errors: LaTeXError[]) => void;
  className?: string;
  readOnly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LaTeXEditor({
  initialContent = '',
  config: userConfig,
  onChange,
  onSave,
  onError,
  className,
  readOnly = false,
}: LaTeXEditorProps) {
  // State
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<LaTeXEditMode>('split');
  const [errors, setErrors] = useState<LaTeXError[]>([]);
  const [suggestions, _setSuggestions] = useState<LaTeXSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Config with defaults
  const config: LaTeXEditorConfig = {
    theme: 'system',
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontSize: 14,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: true,
    lineNumbers: true,
    minimap: false,
    autocomplete: true,
    syntaxHighlighting: true,
    bracketMatching: true,
    autoClosingBrackets: true,
    spellCheck: true,
    spellCheckLanguage: 'en',
    previewDelay: 500,
    livePreview: true,
    previewScale: 1,
    syncScroll: true,
    vimMode: false,
    keybindings: [],
    ...userConfig,
  };

  // Validate content on change - use ref to avoid cascading renders
  const errorsRef = useRef<LaTeXError[]>([]);
  
  useEffect(() => {
    const validationErrors = validate(content);
    // Only update state if errors actually changed
    if (JSON.stringify(validationErrors) !== JSON.stringify(errorsRef.current)) {
      errorsRef.current = validationErrors;
      // Use startTransition to avoid blocking renders
      startTransition(() => {
        setErrors(validationErrors);
      });
      onError?.(validationErrors);
    }
  }, [content, onError]);

  // Handle content change
  const handleContentChange = useCallback(
    (newContent: string) => {
      // Save to undo stack
      setUndoStack((prev) => [...prev.slice(-49), content]);
      setRedoStack([]);

      setContent(newContent);
      onChange?.(newContent);
    },
    [content, onChange]
  );

  // Handle text area input
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleContentChange(e.target.value);
    },
    [handleContentChange]
  );

  // Update cursor position
  const handleCursorChange = useCallback(() => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;

    const lines = value.slice(0, selectionStart).split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    setCursorPosition({ line, column });

    // Check for autocomplete trigger
    if (config.autocomplete) {
      const currentLine = lines[lines.length - 1];
      const lastWord = currentLine.match(/\\?[a-zA-Z]*$/)?.[0] || '';

      if (lastWord.startsWith('\\') && lastWord.length > 1) {
        // Show autocomplete for LaTeX commands
        const rect = textarea.getBoundingClientRect();
        setAutocompletePosition({
          x: rect.left + column * 8, // Approximate character width
          y: rect.top + line * 20, // Approximate line height
        });
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    }
  }, [config.autocomplete]);

  // Undo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, content]);
    setContent(previous);
    onChange?.(previous);
  }, [undoStack, content, onChange]);

  // Redo
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, content]);
    setContent(next);
    onChange?.(next);
  }, [redoStack, content, onChange]);

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;

      // Tab handling
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const spaces = config.insertSpaces ? ' '.repeat(config.tabSize) : '\t';

        const newContent =
          content.slice(0, start) + spaces + content.slice(end);
        handleContentChange(newContent);

        // Set cursor position after tab
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
        }, 0);
      }

      // Auto-close brackets
      if (config.autoClosingBrackets) {
        const pairs: Record<string, string> = {
          '{': '}',
          '[': ']',
          '(': ')',
          '$': '$',
        };

        if (pairs[e.key]) {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selectedText = content.slice(start, end);

          const newContent =
            content.slice(0, start) +
            e.key +
            selectedText +
            pairs[e.key] +
            content.slice(end);

          handleContentChange(newContent);

          setTimeout(() => {
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = start + 1 + selectedText.length;
          }, 0);
        }
      }

      // Undo/Redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 's') {
          e.preventDefault();
          onSave?.(content);
        }
      }

      // Escape to close autocomplete
      if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    },
    [content, config, handleContentChange, onSave, handleUndo, handleRedo]
  );

  // Insert text at cursor
  const insertAtCursor = useCallback(
    (text: string) => {
      if (!editorRef.current) return;

      const textarea = editorRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newContent = content.slice(0, start) + text + content.slice(end);
      handleContentChange(newContent);

      // Set cursor position after inserted text
      setTimeout(() => {
        const cursorPos = start + text.length;
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
        textarea.focus();
      }, 0);
    },
    [content, handleContentChange]
  );

  // Handle autocomplete selection
  const handleAutocompleteSelect = useCallback(
    (suggestion: LaTeXSuggestion) => {
      insertAtCursor(suggestion.insertText);
      setShowAutocomplete(false);
    },
    [insertAtCursor]
  );

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle file import
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.tex,.latex,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          handleContentChange(text);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [handleContentChange]);

  // Handle file export
  const handleExport = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.tex';
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  // Get metadata
  const metadata = extractMetadata(content);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col h-full border rounded-lg bg-background',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* Toolbar */}
      <LaTeXToolbar
        onInsert={insertAtCursor}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        mode={mode}
        onModeChange={setMode}
        onImport={handleImport}
        onExport={handleExport}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        readOnly={readOnly}
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'source' && (
          <div className="h-full">
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onSelect={handleCursorChange}
              onClick={handleCursorChange}
              className={cn(
                'w-full h-full p-4 resize-none focus:outline-none',
                'font-mono text-sm bg-muted/30',
                config.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
              )}
              style={{
                fontFamily: config.fontFamily,
                fontSize: config.fontSize,
                tabSize: config.tabSize,
              }}
              spellCheck={config.spellCheck}
              readOnly={readOnly}
              placeholder="Enter LaTeX code here..."
            />
          </div>
        )}

        {mode === 'visual' && (
          <div ref={previewRef} className="h-full overflow-auto p-4">
            <LaTeXPreview content={content} scale={config.previewScale} />
          </div>
        )}

        {mode === 'split' && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              <textarea
                ref={editorRef}
                value={content}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onSelect={handleCursorChange}
                onClick={handleCursorChange}
                className={cn(
                  'w-full h-full p-4 resize-none focus:outline-none',
                  'font-mono text-sm bg-muted/30',
                  config.wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                )}
                style={{
                  fontFamily: config.fontFamily,
                  fontSize: config.fontSize,
                  tabSize: config.tabSize,
                }}
                spellCheck={config.spellCheck}
                readOnly={readOnly}
                placeholder="Enter LaTeX code here..."
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              <div ref={previewRef} className="h-full overflow-auto p-4 bg-white dark:bg-gray-900">
                <LaTeXPreview content={content} scale={config.previewScale} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>
            Line {cursorPosition.line}, Column {cursorPosition.column}
          </span>
          {metadata.wordCount > 0 && (
            <span>{metadata.wordCount} words</span>
          )}
          {metadata.characterCount > 0 && (
            <span>{metadata.characterCount} characters</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {errors.length > 0 && (
            <span className="text-destructive">
              {errors.filter((e) => e.severity === 'error').length} errors,{' '}
              {errors.filter((e) => e.severity === 'warning').length} warnings
            </span>
          )}
          {metadata.documentClass && (
            <span>Class: {metadata.documentClass}</span>
          )}
        </div>
      </div>

      {/* Autocomplete Popup */}
      {showAutocomplete && (
        <LaTeXAutocomplete
          position={autocompletePosition}
          suggestions={suggestions}
          onSelect={handleAutocompleteSelect}
          onClose={() => setShowAutocomplete(false)}
        />
      )}
    </div>
  );
}

export default LaTeXEditor;
