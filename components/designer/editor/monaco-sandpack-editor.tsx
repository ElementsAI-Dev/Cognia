'use client';

/**
 * MonacoSandpackEditor - Monaco editor integrated with Sandpack
 * Provides VSCode-like code editing with live preview synchronization
 * Enhanced with:
 * - TypeScript/JSX language configuration with IntelliSense
 * - Full keyboard shortcuts matching VSCode (Command Palette, Go to Line, etc.)
 * - Editor actions (format, comment, fold, duplicate, transform, etc.)
 * - Code snippets and Emmet abbreviation support
 * - Document statistics and diagnostics
 * - Find and replace support
 * - Enhanced status bar (encoding, EOL, indentation, language, problems)
 * - Editor action toolbar (minimap, word wrap, formatting, settings)
 * - Configurable editor settings (font, tab size, theme, etc.)
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Loader2,
  Code2,
  FileCode,
  Hash,
  Type,
  WrapText,
  Map,
  Settings2,
  AlignLeft,
  ChevronDown,
  AlertTriangle,
  XCircle,
  Info,
  Minus,
  Plus,
  RotateCcw,
  Terminal,
  Braces,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { registerAllSnippets, registerEmmetSupport } from '@/lib/monaco/snippets';
import type * as Monaco from 'monaco-editor';

interface MonacoSandpackEditorProps {
  className?: string;
  language?: string;
  readOnly?: boolean;
  showStatusBar?: boolean;
  showToolbar?: boolean;
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

interface EditorDiagnostics {
  errors: number;
  warnings: number;
  info: number;
}

interface EditorPreferences {
  wordWrap: boolean;
  minimap: boolean;
  fontSize: number;
  tabSize: number;
  formatOnPaste: boolean;
  formatOnType: boolean;
  bracketPairColorization: boolean;
  stickyScroll: boolean;
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
}

const DEFAULT_PREFERENCES: EditorPreferences = {
  wordWrap: false,
  minimap: false,
  fontSize: 14,
  tabSize: 2,
  formatOnPaste: false,
  formatOnType: false,
  bracketPairColorization: true,
  stickyScroll: true,
  renderWhitespace: 'selection',
};

const MONACO_CDN_URL = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.0/min/vs';

// Detect end-of-line sequence
function detectEOL(text: string): 'LF' | 'CRLF' {
  const crlfCount = (text.match(/\r\n/g) || []).length;
  const lfCount = (text.match(/(?<!\r)\n/g) || []).length;
  return crlfCount > lfCount ? 'CRLF' : 'LF';
}

// Language display name mapping
const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  typescriptreact: 'TypeScript React',
  javascriptreact: 'JavaScript React',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  json: 'JSON',
  markdown: 'Markdown',
  python: 'Python',
  rust: 'Rust',
  go: 'Go',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  php: 'PHP',
  ruby: 'Ruby',
  shell: 'Shell',
  sql: 'SQL',
  yaml: 'YAML',
  xml: 'XML',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  mermaid: 'Mermaid',
  plaintext: 'Plain Text',
};

export function MonacoSandpackEditor({
  className,
  language = 'typescript',
  readOnly = false,
  showStatusBar = true,
  showToolbar = true,
  showLineNumbers = true,
  onSave,
  onFormat,
  onCursorChange,
}: MonacoSandpackEditorProps) {
  const t = useTranslations('sandboxEditor');
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const snippetDisposablesRef = useRef<Monaco.IDisposable[]>([]);
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
  const [diagnostics, setDiagnostics] = useState<EditorDiagnostics>({ errors: 0, warnings: 0, info: 0 });
  const [eolSequence, setEolSequence] = useState<'LF' | 'CRLF'>('LF');
  const [editorPrefs, setEditorPrefs] = useState<EditorPreferences>(() => {
    // Load persisted preferences
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cognia-editor-prefs');
        if (saved) return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      } catch { /* ignore */ }
    }
    return DEFAULT_PREFERENCES;
  });
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const preloadedRef = useRef(false);
  const typescriptConfiguredRef = useRef(false);

  const code = useDesignerStore((state) => state.code);
  const setCode = useDesignerStore((state) => state.setCode);
  const parseCodeToElements = useDesignerStore((state) => state.parseCodeToElements);

  const theme = useSettingsStore((state) => state.theme);

  // Persist editor preferences
  const updateEditorPref = useCallback(<K extends keyof EditorPreferences>(
    key: K,
    value: EditorPreferences[K]
  ) => {
    setEditorPrefs(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('cognia-editor-prefs', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Apply preferences to editor
  useEffect(() => {
    const editor = monacoEditorRef.current;
    if (!editor) return;
    editor.updateOptions({
      wordWrap: editorPrefs.wordWrap ? 'on' : 'off',
      minimap: { enabled: editorPrefs.minimap },
      fontSize: editorPrefs.fontSize,
      tabSize: editorPrefs.tabSize,
      formatOnPaste: editorPrefs.formatOnPaste,
      formatOnType: editorPrefs.formatOnType,
      bracketPairColorization: { enabled: editorPrefs.bracketPairColorization },
      stickyScroll: { enabled: editorPrefs.stickyScroll },
      renderWhitespace: editorPrefs.renderWhitespace,
    });
  }, [editorPrefs]);

  // Preload Monaco in background
  useEffect(() => {
    if (preloadedRef.current) return;
    preloadedRef.current = true;

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

    // Detect EOL
    setEolSequence(detectEOL(value));

    if (position) {
      onCursorChange?.({ line: position.lineNumber, column: position.column });
    }
  }, [onCursorChange]);

  // Update diagnostics from Monaco markers
  const updateDiagnostics = useCallback(() => {
    const monaco = monacoRef.current;
    const editor = monacoEditorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    let errors = 0, warnings = 0, info = 0;
    for (const marker of markers) {
      switch (marker.severity) {
        case monaco.MarkerSeverity.Error: errors++; break;
        case monaco.MarkerSeverity.Warning: warnings++; break;
        case monaco.MarkerSeverity.Info: info++; break;
      }
    }
    setDiagnostics({ errors, warnings, info });
  }, []);

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
      
      setLoadingProgress(40);

      // Register snippets and Emmet support
      snippetDisposablesRef.current = [
        ...registerAllSnippets(monaco),
        ...registerEmmetSupport(monaco),
      ];

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
        // Apply user preferences
        wordWrap: editorPrefs.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorPrefs.minimap },
        fontSize: editorPrefs.fontSize,
        tabSize: editorPrefs.tabSize,
        formatOnPaste: editorPrefs.formatOnPaste,
        formatOnType: editorPrefs.formatOnType,
        bracketPairColorization: { enabled: editorPrefs.bracketPairColorization },
        stickyScroll: { enabled: editorPrefs.stickyScroll },
        renderWhitespace: editorPrefs.renderWhitespace,
      });

      setLoadingProgress(70);

      monacoEditorRef.current = editor;

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newCode = editor.getValue();
        setCode(newCode, false);
        updateStats(editor);
        // Debounce diagnostics update
        setTimeout(updateDiagnostics, 500);
      });

      // Listen for cursor position changes
      editor.onDidChangeCursorPosition(() => {
        updateStats(editor);
      });

      // Listen for selection changes
      editor.onDidChangeCursorSelection(() => {
        updateStats(editor);
      });

      // Listen for marker changes (diagnostics)
      monaco.editor.onDidChangeMarkers(() => {
        updateDiagnostics();
      });

      // ==========================================
      // VSCode-compatible Keyboard Shortcuts
      // ==========================================

      // Save: Ctrl/Cmd + S
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const currentCode = editor.getValue();
        void parseCodeToElements(currentCode);
        onSave?.(currentCode);
      });

      // Format: Shift + Alt + F
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
        executeAction('format');
        onFormat?.();
      });

      // Command Palette: F1
      editor.addCommand(monaco.KeyCode.F1, () => {
        editor.trigger('keyboard', 'editor.action.quickCommand', null);
      });

      // Command Palette: Ctrl/Cmd + Shift + P
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
        editor.trigger('keyboard', 'editor.action.quickCommand', null);
      });

      // Go to Line: Ctrl/Cmd + G
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
        editor.trigger('keyboard', 'editor.action.gotoLine', null);
      });

      // Go to Symbol: Ctrl/Cmd + Shift + O
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO, () => {
        editor.trigger('keyboard', 'editor.action.quickOutline', null);
      });

      // Quick Fix / Code Actions: Ctrl/Cmd + .
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
        editor.trigger('keyboard', 'editor.action.quickFix', null);
      });

      // Comment toggle: Ctrl/Cmd + /
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        executeAction('comment');
      });

      // Block comment toggle: Shift + Alt + A
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyA, () => {
        editor.trigger('keyboard', 'editor.action.blockComment', null);
      });

      // Duplicate line: Shift + Alt + Down
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
        executeAction('duplicate');
      });

      // Copy line up: Shift + Alt + Up
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
        executeAction('copyLineUp');
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

      // Indent line: Ctrl/Cmd + ]
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight, () => {
        executeAction('indentLine');
      });

      // Outdent line: Ctrl/Cmd + [
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft, () => {
        executeAction('outdentLine');
      });

      // Fold: Ctrl/Cmd + Shift + [
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft, () => {
        executeAction('foldAll');
      });

      // Unfold: Ctrl/Cmd + Shift + ]
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight, () => {
        executeAction('unfoldAll');
      });

      // Select all occurrences: Ctrl/Cmd + Shift + L
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
        editor.trigger('keyboard', 'editor.action.selectHighlights', null);
      });

      // Add selection to next find match: Ctrl/Cmd + D
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
        editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null);
      });

      // Transform to uppercase: Ctrl/Cmd + Shift + U (custom)
      editor.addAction({
        id: 'editor.action.transformToUppercase',
        label: 'Transform to Uppercase',
        keybindings: [],
        run: () => { executeAction('transformToUppercase'); },
      });

      // Transform to lowercase: Ctrl/Cmd + Shift + L (registered as action, not keybinding)
      editor.addAction({
        id: 'editor.action.transformToLowercase',
        label: 'Transform to Lowercase',
        keybindings: [],
        run: () => { executeAction('transformToLowercase'); },
      });

      // Trim trailing whitespace
      editor.addAction({
        id: 'editor.action.trimTrailingWhitespace',
        label: 'Trim Trailing Whitespace',
        keybindings: [],
        run: () => { executeAction('trimTrailingWhitespace'); },
      });

      // Sort lines ascending
      editor.addAction({
        id: 'editor.action.sortLinesAscending',
        label: 'Sort Lines Ascending',
        keybindings: [],
        run: () => { executeAction('sortLinesAsc'); },
      });

      // Sort lines descending
      editor.addAction({
        id: 'editor.action.sortLinesDescending',
        label: 'Sort Lines Descending',
        keybindings: [],
        run: () => { executeAction('sortLinesDesc'); },
      });

      // Join lines
      editor.addAction({
        id: 'editor.action.joinLines',
        label: 'Join Lines',
        keybindings: [],
        run: () => { executeAction('joinLines'); },
      });

      // Toggle word wrap action (accessible from command palette)
      editor.addAction({
        id: 'editor.action.toggleWordWrap',
        label: 'Toggle Word Wrap',
        keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
        run: () => {
          updateEditorPref('wordWrap', !editorPrefs.wordWrap);
        },
      });

      // Toggle minimap action
      editor.addAction({
        id: 'editor.action.toggleMinimap',
        label: 'Toggle Minimap',
        keybindings: [],
        run: () => {
          updateEditorPref('minimap', !editorPrefs.minimap);
        },
      });

      // Zoom in: Ctrl/Cmd + =
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
        updateEditorPref('fontSize', Math.min(editorPrefs.fontSize + 1, 30));
      });

      // Zoom out: Ctrl/Cmd + -
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
        updateEditorPref('fontSize', Math.max(editorPrefs.fontSize - 1, 8));
      });

      // Reset zoom: Ctrl/Cmd + 0
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit0, () => {
        updateEditorPref('fontSize', 14);
      });

      setLoadingProgress(90);

      // Initial stats calculation
      updateStats(editor);
      updateDiagnostics();

      setLoadingProgress(100);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load Monaco editor:', err);
      setError(t('failedToLoadEditor'));
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, theme, readOnly, showLineNumbers, setCode, parseCodeToElements, onSave, onFormat, executeAction, updateStats, updateDiagnostics, t]);

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
      // Dispose snippet providers
      for (const d of snippetDisposablesRef.current) {
        d.dispose();
      }
      snippetDisposablesRef.current = [];
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
    const monacoLang = getMonacoLanguage(language);
    return LANGUAGE_DISPLAY_MAP[monacoLang] || monacoLang.charAt(0).toUpperCase() + monacoLang.slice(1);
  }, [language]);

  // Available languages for language selector
  const availableLanguages = useMemo(() => {
    return Object.entries(LANGUAGE_DISPLAY_MAP)
      .sort(([, a], [, b]) => a.localeCompare(b));
  }, []);

  // Total diagnostics count
  const totalDiagnostics = diagnostics.errors + diagnostics.warnings + diagnostics.info;

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-muted/30', className)}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('relative h-full flex flex-col', className)}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            {loadingProgress > 0 && (
              <Progress value={loadingProgress} className="w-32 h-1" />
            )}
          </div>
        )}

        {/* Editor Action Toolbar */}
        {showToolbar && !isLoading && (
          <div className="flex items-center justify-between px-2 py-1 bg-muted/20 border-b select-none">
            <div className="flex items-center gap-0.5">
              {/* Word Wrap Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editorPrefs.wordWrap ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateEditorPref('wordWrap', !editorPrefs.wordWrap)}
                  >
                    <WrapText className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('wordWrap')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">Alt+Z</kbd>
                </TooltipContent>
              </Tooltip>

              {/* Minimap Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editorPrefs.minimap ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateEditorPref('minimap', !editorPrefs.minimap)}
                  >
                    <Map className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('minimap')}</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="mx-1 h-4" />

              {/* Format Document */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { executeAction('format'); onFormat?.(); }}
                    disabled={readOnly}
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('formatDocument')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">Shift+Alt+F</kbd>
                </TooltipContent>
              </Tooltip>

              {/* Toggle Comment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => executeAction('comment')}
                    disabled={readOnly}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('toggleComment')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">Ctrl+/</kbd>
                </TooltipContent>
              </Tooltip>

              {/* Bracket Matching */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editorPrefs.bracketPairColorization ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateEditorPref('bracketPairColorization', !editorPrefs.bracketPairColorization)}
                  >
                    <Braces className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('bracketPairs')}</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="mx-1 h-4" />

              {/* Font Size Controls */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateEditorPref('fontSize', Math.max(editorPrefs.fontSize - 1, 8))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('zoomOut')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">Ctrl+-</kbd>
                </TooltipContent>
              </Tooltip>

              <span className="text-[10px] text-muted-foreground min-w-6 text-center tabular-nums">
                {editorPrefs.fontSize}
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateEditorPref('fontSize', Math.min(editorPrefs.fontSize + 1, 30))}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('zoomIn')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">Ctrl+=</kbd>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => updateEditorPref('fontSize', 14)}
                    disabled={editorPrefs.fontSize === 14}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('resetZoom')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">Ctrl+0</kbd>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Command Palette */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const editor = monacoEditorRef.current;
                      if (editor) {
                        editor.focus();
                        editor.trigger('keyboard', 'editor.action.quickCommand', null);
                      }
                    }}
                  >
                    <Terminal className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <span>{t('commandPalette')}</span>
                  <kbd className="ml-2 px-1 py-0.5 text-[10px] bg-muted rounded">F1</kbd>
                </TooltipContent>
              </Tooltip>

              {/* Editor Settings */}
              <Popover open={showSettingsPopover} onOpenChange={setShowSettingsPopover}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end" side="bottom">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">{t('editorSettings')}</h4>

                    {/* Tab Size */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t('tabSize')}</Label>
                      <Select
                        value={String(editorPrefs.tabSize)}
                        onValueChange={(v) => updateEditorPref('tabSize', Number(v))}
                      >
                        <SelectTrigger className="w-16 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="8">8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Render Whitespace */}
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{t('renderWhitespace')}</Label>
                      <Select
                        value={editorPrefs.renderWhitespace}
                        onValueChange={(v) => updateEditorPref('renderWhitespace', v as EditorPreferences['renderWhitespace'])}
                      >
                        <SelectTrigger className="w-24 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="boundary">Boundary</SelectItem>
                          <SelectItem value="selection">Selection</SelectItem>
                          <SelectItem value="trailing">Trailing</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    {/* Toggle Settings */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{t('formatOnPaste')}</Label>
                        <Switch
                          checked={editorPrefs.formatOnPaste}
                          onCheckedChange={(v) => updateEditorPref('formatOnPaste', v)}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{t('formatOnType')}</Label>
                        <Switch
                          checked={editorPrefs.formatOnType}
                          onCheckedChange={(v) => updateEditorPref('formatOnType', v)}
                          className="scale-75"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">{t('stickyScroll')}</Label>
                        <Switch
                          checked={editorPrefs.stickyScroll}
                          onCheckedChange={(v) => updateEditorPref('stickyScroll', v)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <div ref={editorRef} className="flex-1 min-h-0" />
        
        {/* Enhanced VSCode-like Status Bar */}
        {showStatusBar && !isLoading && (
          <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-muted-foreground bg-muted/30 border-t select-none">
            <div className="flex items-center gap-2">
              {/* Diagnostics Indicator */}
              <button
                className={cn(
                  'flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent transition-colors',
                  diagnostics.errors > 0 && 'text-destructive',
                  diagnostics.errors === 0 && diagnostics.warnings > 0 && 'text-yellow-500'
                )}
                onClick={() => {
                  const editor = monacoEditorRef.current;
                  if (editor) {
                    editor.focus();
                    editor.trigger('keyboard', 'editor.action.marker.nextInFiles', null);
                  }
                }}
              >
                {diagnostics.errors > 0 && (
                  <>
                    <XCircle className="h-3 w-3" />
                    <span>{diagnostics.errors}</span>
                  </>
                )}
                {diagnostics.warnings > 0 && (
                  <>
                    <AlertTriangle className="h-3 w-3" />
                    <span>{diagnostics.warnings}</span>
                  </>
                )}
                {diagnostics.info > 0 && (
                  <>
                    <Info className="h-3 w-3" />
                    <span>{diagnostics.info}</span>
                  </>
                )}
                {totalDiagnostics === 0 && (
                  <>
                    <Info className="h-3 w-3" />
                    <span>0</span>
                  </>
                )}
              </button>

              <Separator orientation="vertical" className="h-3.5" />

              {/* Cursor Position - clickable to go to line */}
              <button
                className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent transition-colors"
                onClick={() => {
                  const editor = monacoEditorRef.current;
                  if (editor) {
                    editor.focus();
                    editor.trigger('keyboard', 'editor.action.gotoLine', null);
                  }
                }}
              >
                <Type className="h-3 w-3" />
                <span>Ln {editorStats.cursorLine}, Col {editorStats.cursorColumn}</span>
              </button>
              
              {/* Selection Info */}
              {editorStats.selection && (
                <span className="text-primary">
                  ({editorStats.selection.lines} {editorStats.selection.lines === 1 ? 'line' : 'lines'}, {editorStats.selection.characters} selected)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Indentation Indicator */}
              <button
                className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent transition-colors"
                onClick={() => setShowSettingsPopover(true)}
              >
                <span>{t('spaces')}: {editorPrefs.tabSize}</span>
              </button>

              <Separator orientation="vertical" className="h-3.5" />

              {/* Encoding */}
              <span className="px-1 py-0.5">{t('encoding')}: UTF-8</span>

              <Separator orientation="vertical" className="h-3.5" />

              {/* EOL Sequence */}
              <span className="px-1 py-0.5">{eolSequence}</span>

              <Separator orientation="vertical" className="h-3.5" />

              {/* Language Selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent transition-colors">
                    <FileCode className="h-3 w-3" />
                    <span>{languageDisplay}</span>
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1 max-h-64 overflow-auto" align="end" side="top">
                  {availableLanguages.map(([id, name]) => (
                    <button
                      key={id}
                      className={cn(
                        'w-full text-left px-2 py-1 text-xs rounded hover:bg-accent transition-colors',
                        getMonacoLanguage(language) === id && 'bg-accent font-medium'
                      )}
                      onClick={() => {
                        const monaco = monacoRef.current;
                        const editor = monacoEditorRef.current;
                        if (monaco && editor) {
                          const model = editor.getModel();
                          if (model) {
                            monaco.editor.setModelLanguage(model, id);
                          }
                        }
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <Separator orientation="vertical" className="h-3.5" />

              {/* Line/Char Count */}
              <div className="flex items-center gap-1 px-1 py-0.5">
                <Hash className="h-3 w-3" />
                <span>{editorStats.lines} lines</span>
              </div>

              {/* Read-only indicator */}
              {readOnly && (
                <>
                  <Separator orientation="vertical" className="h-3.5" />
                  <span className="text-yellow-500 px-1 py-0.5">{t('readOnly')}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default MonacoSandpackEditor;
