'use client';

/**
 * LaTeX Editor Component
 * A real-time LaTeX editor with preview, syntax highlighting, and autocomplete
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
  startTransition,
} from 'react';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { LaTeXPreview } from './latex-preview';
import { LaTeXToolbar } from './latex-toolbar';
import { LaTeXAutocomplete } from './latex-autocomplete';
import { LatexAIContextMenu } from './latex-ai-context-menu';
import { EditorTextarea } from './editor-textarea';
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
  onOpenAIChat?: () => void;
  onOpenEquationDialog?: () => void;
  onOpenAISettings?: () => void;
  onAITextAction?: (action: import('@/hooks/latex/use-latex-ai').LatexAITextAction) => void;
  className?: string;
  readOnly?: boolean;
}

export interface LaTeXEditorHandle {
  insertText: (text: string) => void;
  replaceSelection: (text: string) => void;
  getSelectedText: () => string;
  focus: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const LaTeXEditor = forwardRef<LaTeXEditorHandle, LaTeXEditorProps>(function LaTeXEditor(
  {
    initialContent = '',
    config: userConfig,
    onChange,
    onSave,
    onError,
    onOpenAIChat,
    onOpenEquationDialog,
    onOpenAISettings,
    onAITextAction,
    className,
    readOnly = false,
  },
  ref
) {
  // State
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<LaTeXEditMode>('split');
  const [errors, setErrors] = useState<LaTeXError[]>([]);
  const [suggestions, _setSuggestions] = useState<LaTeXSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selectedText, setSelectedText] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const selectionRangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Config with defaults - memoized to prevent useCallback dependency changes
  const config: LaTeXEditorConfig = useMemo(() => ({
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
  }), [userConfig]);

  // Validate content on change - use ref to avoid cascading renders
  const errorsRef = useRef<LaTeXError[]>([]);

  useEffect(() => {
    startTransition(() => {
      setContent((prev) => (prev === initialContent ? prev : initialContent));
    });
  }, [initialContent]);
  
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
    const selectionEnd = textarea.selectionEnd;

    selectionRangeRef.current = { start: selectionStart, end: selectionEnd };
    if (selectionEnd > selectionStart) {
      setSelectedText(value.slice(selectionStart, selectionEnd));
    } else {
      setSelectedText('');
    }

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

  const replaceSelection = useCallback(
    (text: string) => {
      if (!editorRef.current) return;
      const textarea = editorRef.current;

      const { start, end } = selectionRangeRef.current;
      textarea.focus();
      textarea.selectionStart = start;
      textarea.selectionEnd = end;
      insertAtCursor(text);
    },
    [insertAtCursor]
  );

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => insertAtCursor(text),
      replaceSelection: (text: string) => replaceSelection(text),
      getSelectedText: () => selectedText,
      focus: () => {
        editorRef.current?.focus();
      },
    }),
    [insertAtCursor, replaceSelection, selectedText]
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
        onOpenAIChat={onOpenAIChat}
        onOpenEquationDialog={onOpenEquationDialog}
        onOpenAISettings={onOpenAISettings}
        onAITextAction={onAITextAction}
        readOnly={readOnly}
      />

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'source' && (
          <div className="h-full">
            {readOnly ? (
              <EditorTextarea
                ref={editorRef}
                value={content}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                onSelect={handleCursorChange}
                onClick={handleCursorChange}
                onContextMenu={handleCursorChange}
                config={config}
                readOnly={readOnly}
              />
            ) : (
              <LatexAIContextMenu
                selectedText={selectedText}
                onReplaceSelection={replaceSelection}
              >
                <div className="h-full">
                  <EditorTextarea
                    ref={editorRef}
                    value={content}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    onSelect={handleCursorChange}
                    onClick={handleCursorChange}
                    onContextMenu={handleCursorChange}
                    config={config}
                    readOnly={readOnly}
                  />
                </div>
              </LatexAIContextMenu>
            )}
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
              {readOnly ? (
                <EditorTextarea
                  ref={editorRef}
                  value={content}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  onSelect={handleCursorChange}
                  onClick={handleCursorChange}
                  onContextMenu={handleCursorChange}
                  config={config}
                  readOnly={readOnly}
                />
              ) : (
                <LatexAIContextMenu
                  selectedText={selectedText}
                  onReplaceSelection={replaceSelection}
                >
                  <div className="h-full">
                    <EditorTextarea
                      ref={editorRef}
                      value={content}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      onSelect={handleCursorChange}
                      onClick={handleCursorChange}
                      onContextMenu={handleCursorChange}
                      config={config}
                      readOnly={readOnly}
                    />
                  </div>
                </LatexAIContextMenu>
              )}
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
});

LaTeXEditor.displayName = 'LaTeXEditor';

export default LaTeXEditor;
