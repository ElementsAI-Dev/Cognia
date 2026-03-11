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
import { LatexAIContextMenu } from './latex-ai-context-menu';
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from './codemirror-editor';
import { LatexAIPanel } from './latex-ai-panel';
import { ErrorPanel } from './error-panel';
import { DocumentOutline } from './document-outline';
import { validate, extractMetadata, format } from '@/lib/latex/parser';
import type {
  LaTeXEditorConfig,
  LaTeXEditMode,
  LaTeXError,
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
  onImportResult?: (result: { success: boolean; message: string; fileName?: string }) => void;
  onExportResult?: (result: { success: boolean; message: string; fileName?: string }) => void;
  onFormatResult?: (result: { success: boolean; message: string }) => void;
  onOpenAIChat?: () => void;
  onOpenEquationDialog?: () => void;
  onOpenAISettings?: () => void;
  onAITextAction?: (action: import('@/hooks/latex/use-latex-ai').LatexAITextAction) => void;
  className?: string;
  readOnly?: boolean;
  showAIPanel?: boolean;
  onAIPanelToggle?: (open: boolean) => void;
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
    onImportResult,
    onExportResult,
    onFormatResult,
    onOpenAIChat,
    onOpenEquationDialog,
    onOpenAISettings,
    onAITextAction,
    className,
    readOnly = false,
    showAIPanel: controlledAIPanel,
    onAIPanelToggle,
  },
  ref
) {
  // State
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<LaTeXEditMode>('split');
  const [errors, setErrors] = useState<LaTeXError[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selectedText, setSelectedText] = useState('');
  const [internalAIPanel, setInternalAIPanel] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  // Support both controlled and uncontrolled AI panel state
  const aiPanelOpen = controlledAIPanel ?? internalAIPanel;
  const handleAIPanelToggle = useCallback(() => {
    const newState = !aiPanelOpen;
    setInternalAIPanel(newState);
    onAIPanelToggle?.(newState);
  }, [aiPanelOpen, onAIPanelToggle]);

  // Refs
  const cmEditorRef = useRef<CodeMirrorEditorHandle>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const resolveScrollRatio = (scrollTop: number, scrollHeight: number, clientHeight: number) => {
    const maxScrollable = Math.max(0, scrollHeight - clientHeight);
    return maxScrollable === 0 ? 0 : scrollTop / maxScrollable;
  };

  const applyScrollRatio = (target: HTMLElement, ratio: number) => {
    const maxScrollable = Math.max(0, target.scrollHeight - target.clientHeight);
    target.scrollTop = maxScrollable === 0 ? 0 : ratio * maxScrollable;
  };

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

  // Handle content change from CodeMirror
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      onChange?.(newContent);
    },
    [onChange]
  );

  // Handle save (Ctrl+S in CM6 triggers this)
  const handleSave = useCallback(() => {
    onSave?.(content);
  }, [onSave, content]);

  // Cursor/selection callbacks from CodeMirror
  const handleCursorChange = useCallback((pos: { line: number; column: number }) => {
    setCursorPosition(pos);
  }, []);

  const handleSelectionChange = useCallback((text: string) => {
    setSelectedText(text);
  }, []);

  // Keep editing context focused when user exits visual-only mode
  useEffect(() => {
    if (mode !== 'visual') {
      requestAnimationFrame(() => {
        cmEditorRef.current?.focus();
      });
    }
  }, [mode]);

  // Insert text via CodeMirror handle
  const insertAtCursor = useCallback(
    (text: string) => {
      cmEditorRef.current?.insertText(text);
    },
    []
  );

  const replaceSelection = useCallback(
    (text: string) => {
      cmEditorRef.current?.replaceSelection(text);
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      insertText: (text: string) => cmEditorRef.current?.insertText(text),
      replaceSelection: (text: string) => cmEditorRef.current?.replaceSelection(text),
      getSelectedText: () => cmEditorRef.current?.getSelectedText() ?? selectedText,
      focus: () => cmEditorRef.current?.focus(),
    }),
    [selectedText]
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
      if (!file) return;

      const isSupported = /\.(tex|latex|txt)$/i.test(file.name);
      if (!isSupported) {
        onImportResult?.({
          success: false,
          message: 'Unsupported file type. Please import .tex, .latex, or .txt files.',
          fileName: file.name,
        });
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        onImportResult?.({
          success: false,
          message: 'Failed to read selected file.',
          fileName: file.name,
        });
      };
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          onImportResult?.({
            success: false,
            message: 'Imported file content is invalid.',
            fileName: file.name,
          });
          return;
        }

        handleContentChange(text);
        onImportResult?.({
          success: true,
          message: 'File imported successfully.',
          fileName: file.name,
        });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [handleContentChange, onImportResult]);

  // Handle file export
  const handleExport = useCallback(() => {
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const fileName = 'document.tex';
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      onExportResult?.({
        success: true,
        message: 'Source exported successfully.',
        fileName,
      });
    } catch (error) {
      onExportResult?.({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to export source file.',
      });
    }
  }, [content, onExportResult]);

  // Handle format document
  const handleFormat = useCallback(() => {
    try {
      const formatted = format(content, {
        indentSize: config.tabSize,
        insertSpaces: config.insertSpaces,
      });
      handleContentChange(formatted);
      onFormatResult?.({
        success: true,
        message: 'Document formatted successfully.',
      });
    } catch (error) {
      onFormatResult?.({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to format document.',
      });
    }
  }, [content, config.tabSize, config.insertSpaces, handleContentChange, onFormatResult]);

  // Sync scroll between editor and preview
  const handleEditorScroll = useCallback(() => {
    if (!config.syncScroll || isSyncingScroll.current || !editorContainerRef.current || !previewRef.current) return;
    
    isSyncingScroll.current = true;
    const editor = editorContainerRef.current;
    const preview = previewRef.current;
    
    const scrollRatio = resolveScrollRatio(editor.scrollTop, editor.scrollHeight, editor.clientHeight);
    applyScrollRatio(preview, scrollRatio);
    
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, [config.syncScroll]);

  const handleEditorContentScroll = useCallback(
    (scrollTop: number, scrollHeight: number, clientHeight: number) => {
      if (!config.syncScroll || isSyncingScroll.current || !previewRef.current) return;

      isSyncingScroll.current = true;
      const preview = previewRef.current;
      const scrollRatio = resolveScrollRatio(scrollTop, scrollHeight, clientHeight);
      applyScrollRatio(preview, scrollRatio);

      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    },
    [config.syncScroll]
  );

  const handlePreviewScroll = useCallback(() => {
    if (!config.syncScroll || isSyncingScroll.current || !editorContainerRef.current || !previewRef.current) return;
    
    isSyncingScroll.current = true;
    const editorHost = editorContainerRef.current;
    const editorScroller = editorHost.querySelector('.cm-scroller') as HTMLElement | null;
    const editor = editorScroller ?? editorHost;
    const preview = previewRef.current;
    
    const scrollRatio = resolveScrollRatio(preview.scrollTop, preview.scrollHeight, preview.clientHeight);
    applyScrollRatio(editor, scrollRatio);
    
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, [config.syncScroll]);

  const focusEditorLine = useCallback(
    (line: number, column: number = 1) => {
      const navigate = () => {
        cmEditorRef.current?.scrollToLine(line);
        setCursorPosition({ line, column });
      };

      if (mode === 'visual') {
        setMode('source');
        requestAnimationFrame(() => {
          requestAnimationFrame(navigate);
        });
        return;
      }

      navigate();
    },
    [mode]
  );

  // Handle outline navigation
  const handleOutlineNavigate = useCallback((line: number) => {
    focusEditorLine(line);
  }, [focusEditorLine]);

  // Handle error click - navigate to error location via CodeMirror
  const handleErrorClick = useCallback((error: LaTeXError) => {
    focusEditorLine(error.line, error.column);
  }, [focusEditorLine]);

  // Get metadata
  const metadata = extractMetadata(content);

  return (
    <div
      ref={containerRef}
      data-testid="latex-editor-root"
      className={cn(
        'flex flex-col flex-1 min-h-0 border rounded-lg bg-background',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* Toolbar — undo/redo now handled natively by CM6 history() */}
      <LaTeXToolbar
        onInsert={insertAtCursor}
        onUndo={() => cmEditorRef.current?.undo()}
        onRedo={() => cmEditorRef.current?.redo()}
        canUndo={true}
        canRedo={true}
        mode={mode}
        onModeChange={setMode}
        onFormat={handleFormat}
        onToggleAIPanel={handleAIPanelToggle}
        isAIPanelOpen={aiPanelOpen}
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

      {/* Editor Area with AI Panel */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Document Outline Panel */}
          {showOutline && (
            <>
              <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
                <DocumentOutline
                  content={content}
                  currentLine={cursorPosition.line}
                  onNavigate={handleOutlineNavigate}
                  className="h-full border-r"
                />
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          {/* Main Editor Panel */}
          <ResizablePanel defaultSize={showOutline ? 60 : 75} minSize={50}>
            <div className="h-full overflow-hidden">
              {mode === 'source' && (
                <LatexAIContextMenu
                  selectedText={selectedText}
                  onReplaceSelection={replaceSelection}
                >
                  <div className="h-full">
                    <CodeMirrorEditor
                      ref={cmEditorRef}
                      value={content}
                      onChange={handleContentChange}
                      onSave={handleSave}
                      onCursorChange={handleCursorChange}
                      onSelectionChange={handleSelectionChange}
                      onScroll={handleEditorContentScroll}
                      config={config}
                      readOnly={readOnly}
                    />
                  </div>
                </LatexAIContextMenu>
              )}

              {mode === 'visual' && (
                <div ref={previewRef} className="h-full overflow-auto p-4" data-testid="latex-preview-pane">
                  <LaTeXPreview content={content} scale={config.previewScale} />
                </div>
              )}

              {mode === 'split' && (
                <ResizablePanelGroup direction="horizontal" className="h-full">
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div
                      ref={editorContainerRef}
                      className="h-full"
                      onScroll={handleEditorScroll}
                    >
                      <LatexAIContextMenu
                        selectedText={selectedText}
                        onReplaceSelection={replaceSelection}
                      >
                        <div className="h-full">
                          <CodeMirrorEditor
                            ref={cmEditorRef}
                            value={content}
                            onChange={handleContentChange}
                            onSave={handleSave}
                            onCursorChange={handleCursorChange}
                            onSelectionChange={handleSelectionChange}
                            onScroll={handleEditorContentScroll}
                            config={config}
                            readOnly={readOnly}
                          />
                        </div>
                      </LatexAIContextMenu>
                    </div>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={50} minSize={30}>
                    <div
                      ref={previewRef}
                      className="h-full overflow-auto p-4 bg-white dark:bg-gray-900"
                      data-testid="latex-preview-pane"
                      onScroll={handlePreviewScroll}
                    >
                      <LaTeXPreview content={content} scale={config.previewScale} />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              )}
            </div>
          </ResizablePanel>

          {/* AI Sidebar Panel */}
          {aiPanelOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                defaultSize={25}
                minSize={15}
                maxSize={40}
              >
                <LatexAIPanel
                  open={aiPanelOpen}
                  onToggle={handleAIPanelToggle}
                  selectedText={selectedText}
                  onInsertText={insertAtCursor}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Error Panel */}
      <ErrorPanel
        errors={errors}
        onErrorClick={handleErrorClick}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <button
            className={cn('hover:text-foreground transition-colors', showOutline && 'text-primary')}
            onClick={() => setShowOutline((v) => !v)}
            title="Toggle Outline"
          >
            ☰
          </button>
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
    </div>
  );
});

LaTeXEditor.displayName = 'LaTeXEditor';

export default LaTeXEditor;
