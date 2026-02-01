'use client';

/**
 * MonacoSandpackEditor - Monaco editor integrated with Sandpack
 * Provides code editing with live preview synchronization
 * Enhanced with:
 * - TypeScript language configuration
 * - Multiple keyboard shortcuts
 * - Editor actions (format, comment, fold, etc.)
 * - Document statistics
 * - Find and replace support
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Code2, FileCode, Hash, Type } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDesignerStore } from '@/stores/designer';
import { useSettingsStore } from '@/stores';
import {
  MONACO_DESIGNER_OPTIONS,
  getMonacoTheme,
  getMonacoLanguage,
  EDITOR_ACTION_IDS,
  type EditorActionType,
} from '@/lib/monaco';
import { setupTypeScript } from '@/lib/monaco/typescript-config';
import type * as Monaco from 'monaco-editor';

interface MonacoSandpackEditorProps {
  className?: string;
  language?: string;
  readOnly?: boolean;
  showStatusBar?: boolean;
  showLineNumbers?: boolean;
  onSave?: (code: string) => void;
  onFormat?: () => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
}

interface EditorStats {
  lines: number;
  characters: number;
  words: number;
  cursorLine: number;
  cursorColumn: number;
  selection: { lines: number; characters: number } | null;
}

const MONACO_CDN_URL = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.0/min/vs';

export function MonacoSandpackEditor({
  className,
  language = 'typescript',
  readOnly = false,
  showStatusBar = true,
  showLineNumbers = true,
  onSave,
  onFormat,
  onCursorChange,
}: MonacoSandpackEditorProps) {
  const t = useTranslations('sandboxEditor');
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editorStats, setEditorStats] = useState<EditorStats>({
    lines: 0,
    characters: 0,
    words: 0,
    cursorLine: 1,
    cursorColumn: 1,
    selection: null,
  });
  const preloadedRef = useRef(false);
  const typescriptConfiguredRef = useRef(false);

  const code = useDesignerStore((state) => state.code);
  const setCode = useDesignerStore((state) => state.setCode);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);

  const theme = useSettingsStore((state) => state.theme);

  // Preload Monaco in background
  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

    // Add preload hints for Monaco resources
    const preloadLinks = [
      { href: `${MONACO_CDN_URL}/loader.js`, as: 'script' },
      { href: `${MONACO_CDN_URL}/editor/editor.main.js`, as: 'script' },
      { href: `${MONACO_CDN_URL}/editor/editor.main.css`, as: 'style' },
    ];

    preloadLinks.forEach(({ href, as }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (as === 'style') {
        link.crossOrigin = 'anonymous';
      }
      document.head.appendChild(link);
    });
  }, []);

  // Calculate document statistics
  const updateStats = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (!model) return;

    const value = model.getValue();
    const position = editor.getPosition();
    const selection = editor.getSelection();

    let selectionStats: { lines: number; characters: number } | null = null;
    if (selection && !selection.isEmpty()) {
      const selectedText = model.getValueInRange(selection);
      selectionStats = {
        lines: selection.endLineNumber - selection.startLineNumber + 1,
        characters: selectedText.length,
      };
    }

    setEditorStats({
      lines: model.getLineCount(),
      characters: value.length,
      words: value.trim() ? value.trim().split(/\s+/).length : 0,
      cursorLine: position?.lineNumber || 1,
      cursorColumn: position?.column || 1,
      selection: selectionStats,
    });

    if (position) {
      onCursorChange?.({ line: position.lineNumber, column: position.column });
    }
  }, [onCursorChange]);

  // Execute editor action
  const executeAction = useCallback((actionType: EditorActionType) => {
    const editor = monacoEditorRef.current;
    if (!editor) return;

    const actionId = EDITOR_ACTION_IDS[actionType];
    editor.trigger('keyboard', actionId, null);
  }, []);

  // Initialize Monaco editor with progress tracking
  const initMonaco = useCallback(async () => {
    try {
      setLoadingProgress(10);
      
      // Dynamically import Monaco
      const monaco = await import('monaco-editor');
      monacoRef.current = monaco;
      
      setLoadingProgress(30);

      // Configure TypeScript defaults (only once)
      if (!typescriptConfiguredRef.current) {
        setupTypeScript(monaco);
        typescriptConfiguredRef.current = true;
      }
      
      setLoadingProgress(50);
      
      if (!editorRef.current) return;

      // Create editor with optimized designer settings
      const editor = monaco.editor.create(editorRef.current, {
        ...MONACO_DESIGNER_OPTIONS,
        value: code,
        language: getMonacoLanguage(language),
        theme: getMonacoTheme(theme),
        readOnly,
        lineNumbers: showLineNumbers ? 'on' : 'off',
      });

      setLoadingProgress(70);

      monacoEditorRef.current = editor;

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newCode = editor.getValue();
        setCode(newCode, false);
        updateStats(editor);
      });

      // Listen for cursor position changes
      editor.onDidChangeCursorPosition(() => {
        updateStats(editor);
      });

      // Listen for selection changes
      editor.onDidChangeCursorSelection(() => {
        updateStats(editor);
      });

      // Register keyboard shortcuts
      // Save: Ctrl/Cmd + S
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const currentCode = editor.getValue();
        parseCodeToElements(currentCode);
        onSave?.(currentCode);
      });

      // Format: Shift + Alt + F
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
        executeAction('format');
        onFormat?.();
      });

      // Comment toggle: Ctrl/Cmd + /
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        executeAction('comment');
      });

      // Duplicate line: Shift + Alt + Down
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
        executeAction('duplicate');
      });

      // Delete line: Ctrl/Cmd + Shift + K
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
        executeAction('deleteLine');
      });

      // Move line up: Alt + Up
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
        executeAction('moveLineUp');
      });

      // Move line down: Alt + Down
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
        executeAction('moveLineDown');
      });

      // Fold all: Ctrl/Cmd + K, Ctrl/Cmd + 0
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft, () => {
        executeAction('foldAll');
      });

      // Unfold all: Ctrl/Cmd + K, Ctrl/Cmd + J
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight, () => {
        executeAction('unfoldAll');
      });

      setLoadingProgress(90);

      // Initial stats calculation
      updateStats(editor);

      setLoadingProgress(100);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Monaco editor:', err);
      setError(t('failedToLoadEditor'));
      setIsLoading(false);
    }
  }, [code, language, theme, readOnly, showLineNumbers, setCode, parseCodeToElements, onSave, onFormat, executeAction, updateStats, t]);

  // Initialize Monaco editor
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      await initMonaco();
    };

    init();

    return () => {
      mounted = false;
      if (monacoEditorRef.current) {
        (monacoEditorRef.current as { dispose: () => void }).dispose();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor value when code changes externally
  useEffect(() => {
    const editor = monacoEditorRef.current;
    if (editor && editor.getValue() !== code) {
      // Preserve cursor position during external updates
      const position = editor.getPosition();
      editor.setValue(code);
      if (position) {
        editor.setPosition(position);
      }
      updateStats(editor);
    }
  }, [code, updateStats]);

  // Update theme
  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco && monacoEditorRef.current) {
      monaco.editor.setTheme(getMonacoTheme(theme));
    }
  }, [theme]);

  // Update language
  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = monacoEditorRef.current;
    if (monaco && editor) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getMonacoLanguage(language));
      }
    }
  }, [language]);

  // Update readOnly state
  useEffect(() => {
    const editor = monacoEditorRef.current;
    if (editor) {
      editor.updateOptions({ readOnly });
    }
  }, [readOnly]);

  // Format language display name
  const languageDisplay = useMemo(() => {
    const langMap: Record<string, string> = {
      typescript: 'TypeScript',
      javascript: 'JavaScript',
      typescriptreact: 'TypeScript React',
      javascriptreact: 'JavaScript React',
      html: 'HTML',
      css: 'CSS',
      json: 'JSON',
      markdown: 'Markdown',
      python: 'Python',
    };
    const monacoLang = getMonacoLanguage(language);
    return langMap[monacoLang] || monacoLang.charAt(0).toUpperCase() + monacoLang.slice(1);
  }, [language]);

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-muted/30', className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full flex flex-col', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          {loadingProgress > 0 && (
            <Progress value={loadingProgress} className="w-32 h-1" />
          )}
        </div>
      )}
      <div ref={editorRef} className="flex-1 min-h-0" />
      
      {/* Status Bar */}
      {showStatusBar && !isLoading && (
        <div className="flex items-center justify-between px-3 py-1 text-xs text-muted-foreground bg-muted/30 border-t select-none">
          <div className="flex items-center gap-3">
            {/* Language */}
            <div className="flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              <span>{languageDisplay}</span>
            </div>
            
            {/* Cursor Position */}
            <div className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              <span>Ln {editorStats.cursorLine}, Col {editorStats.cursorColumn}</span>
            </div>
            
            {/* Selection Info */}
            {editorStats.selection && (
              <div className="flex items-center gap-1 text-primary">
                <span>
                  ({editorStats.selection.lines} lines, {editorStats.selection.characters} chars selected)
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Line Count */}
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>{editorStats.lines} lines</span>
            </div>
            
            {/* Character Count */}
            <div className="flex items-center gap-1">
              <Code2 className="h-3 w-3" />
              <span>{editorStats.characters.toLocaleString()} chars</span>
            </div>
            
            {/* Read-only indicator */}
            {readOnly && (
              <span className="text-yellow-500">Read-only</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MonacoSandpackEditor;
