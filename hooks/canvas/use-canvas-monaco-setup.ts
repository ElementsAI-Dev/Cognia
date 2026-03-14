'use client';

/**
 * useCanvasMonacoSetup - Central hook for integrating Canvas infrastructure with Monaco Editor
 * 
 * Bridges orphaned modules into the Canvas panel:
 * - SnippetProvider → Monaco completion provider
 * - SymbolParser → breadcrumb navigation + symbol outline
 * - ThemeRegistry → Monaco defineTheme
 * - PluginManager → editor lifecycle hooks
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type * as Monaco from 'monaco-editor';
import type { CanvasEditorContext, CanvasEditorLocation } from '@/types';
import { snippetProvider, type CodeSnippet } from '@/lib/canvas/snippets/snippet-registry';
import { symbolParser, type DocumentSymbol } from '@/lib/canvas/symbols/symbol-parser';
import { themeRegistry, type EditorTheme } from '@/lib/canvas/themes/theme-registry';
import { pluginManager } from '@/lib/canvas/plugins/plugin-manager';
import { registerAllSnippets, registerEmmetSupport } from '@/lib/monaco/snippets';
import { useCanvasSettingsStore } from '@/stores/canvas/canvas-settings-store';
import type { CanvasPerformanceProfile } from '@/lib/canvas/utils';

interface UseCanvasMonacoSetupOptions {
  documentId: string | null;
  language: string;
  content: string;
  cursorLine?: number;
  initialEditorContext?: CanvasEditorContext | null;
  performanceProfile?: Pick<CanvasPerformanceProfile, 'mode' | 'symbolParseDebounceMs'>;
  onContentChange?: (content: string) => void;
  onSelectionChange?: (selection: string) => void;
  onEditorContextChange?: (context: Partial<CanvasEditorContext>) => void;
}

interface UseCanvasMonacoSetupReturn {
  symbols: DocumentSymbol[];
  breadcrumb: string[];
  breadcrumbSymbols: DocumentSymbol[];
  currentSymbol: DocumentSymbol | null;
  activeLocation: CanvasEditorLocation | null;
  availableThemes: EditorTheme[];
  activeThemeId: string;
  setActiveTheme: (themeId: string) => void;
  snippetCount: number;
  goToSymbol: (symbol: DocumentSymbol) => void;
  goToBreadcrumb: (index: number) => void;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  handleEditorMount: (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void;
  handleEditorWillUnmount: () => void;
}

export function useCanvasMonacoSetup(
  options: UseCanvasMonacoSetupOptions
): UseCanvasMonacoSetupReturn {
  const {
    documentId,
    language,
    content,
    cursorLine: initialCursorLine = 1,
    initialEditorContext,
    performanceProfile,
    onSelectionChange,
    onEditorContextChange,
  } = options;

  // Track cursor line for symbol derivation
  const [trackedCursorLine, setTrackedCursorLine] = useState(initialCursorLine);
  const [trackedCursorColumn, setTrackedCursorColumn] = useState(
    initialEditorContext?.cursorColumn ?? 0
  );
  const [locationOverride, setLocationOverride] = useState<CanvasEditorLocation | null>(null);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);
  const restoredDocumentIdRef = useRef<string | null>(null);
  const pendingDeferredRestoreDocIdRef = useRef<string | null>(null);
  const isRestoringEditorContextRef = useRef(false);

  // Symbol parsing state - debounced
  const [debouncedContent, setDebouncedContent] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme state - synced with settings store as single source of truth
  const settingsTheme = useCanvasSettingsStore((state) => state.settings.theme);
  const updateSettings = useCanvasSettingsStore((state) => state.updateSettings);
  const [activeThemeId, setActiveThemeIdState] = useState(settingsTheme || themeRegistry.getActiveThemeId());

  // Debounce content for symbol parsing (avoid re-parsing on every keystroke)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedContent(content);
    }, performanceProfile?.symbolParseDebounceMs ?? 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, performanceProfile?.symbolParseDebounceMs]);

  // Parse symbols from debounced content (pure derivation)
  const symbols = useMemo<DocumentSymbol[]>(() => {
    if (!debouncedContent || !language) return [];
    try {
      return symbolParser.parseSymbols(debouncedContent, language);
    } catch {
      return [];
    }
  }, [debouncedContent, language]);

  const currentSymbolLocation = useMemo(() => {
    if (symbols.length === 0) return null;
    return symbolParser.getSymbolLocation(trackedCursorLine, symbols);
  }, [symbols, trackedCursorLine]);

  // Derive breadcrumb from symbols + cursor (pure derivation)
  const breadcrumb = useMemo(() => {
    return currentSymbolLocation?.path || [];
  }, [currentSymbolLocation]);

  const breadcrumbSymbols = useMemo(() => {
    return currentSymbolLocation?.chain || [];
  }, [currentSymbolLocation]);

  // Derive current symbol from symbols + cursor (pure derivation)
  const currentSymbol = useMemo<DocumentSymbol | null>(() => {
    return currentSymbolLocation?.symbol || null;
  }, [currentSymbolLocation]);

  const activeLocation = useMemo<CanvasEditorLocation | null>(() => {
    const matchingOverride =
      locationOverride?.lineNumber === trackedCursorLine ? locationOverride : null;

    if (!matchingOverride && !currentSymbolLocation) return null;

    return {
      source: matchingOverride?.source ?? 'cursor',
      path: currentSymbolLocation?.path || matchingOverride?.path || [],
      lineNumber: trackedCursorLine,
      column:
        matchingOverride?.column ??
        (trackedCursorColumn > 0
          ? trackedCursorColumn
          : currentSymbolLocation?.symbol.selectionRange.startColumn || 1),
      symbolName: currentSymbolLocation?.symbol.name ?? matchingOverride?.symbolName,
    };
  }, [currentSymbolLocation, locationOverride, trackedCursorColumn, trackedCursorLine]);

  // Available themes from registry
  const availableThemes = useMemo(() => themeRegistry.getAllThemes(), []);

  // Snippet count for the current language
  const snippetCount = useMemo(() => {
    return snippetProvider.getSnippets(language).length;
  }, [language]);

  // Set active theme and apply to Monaco + persist to settings store
  const setActiveTheme = useCallback((themeId: string) => {
    themeRegistry.setActiveTheme(themeId);
    setActiveThemeIdState(themeId);
    updateSettings({ theme: themeId });

    const monaco = monacoRef.current;
    if (monaco) {
      const theme = themeRegistry.getTheme(themeId);
      if (theme) {
        const monacoThemeDef = themeRegistry.toMonacoTheme(theme);
        monaco.editor.defineTheme(themeId, monacoThemeDef);
        monaco.editor.setTheme(themeId);
      }
    }
  }, [updateSettings]);

  // Navigate to a symbol in the editor
  const goToSymbol = useCallback((symbol: DocumentSymbol) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.revealLineInCenter(symbol.range.startLine);
    editor.setPosition({
      lineNumber: symbol.selectionRange.startLine,
      column: symbol.selectionRange.startColumn,
    });
    setTrackedCursorLine(symbol.selectionRange.startLine);
    setTrackedCursorColumn(symbol.selectionRange.startColumn);
    setLocationOverride({
      source: 'outline',
      path: [symbol.name],
      lineNumber: symbol.selectionRange.startLine,
      column: symbol.selectionRange.startColumn,
      symbolName: symbol.name,
    });
    onEditorContextChange?.({
      cursorLine: symbol.selectionRange.startLine,
      cursorColumn: symbol.selectionRange.startColumn,
      location: {
        source: 'outline',
        path: [symbol.name],
        lineNumber: symbol.selectionRange.startLine,
        column: symbol.selectionRange.startColumn,
        symbolName: symbol.name,
      },
    });
    editor.focus();
  }, [onEditorContextChange]);

  const goToBreadcrumb = useCallback((index: number) => {
    const symbol = breadcrumbSymbols[index];
    const editor = editorRef.current;
    if (!editor || !symbol) return;

    editor.revealLineInCenter(symbol.range.startLine);
    editor.setPosition({
      lineNumber: symbol.selectionRange.startLine,
      column: symbol.selectionRange.startColumn,
    });
    setTrackedCursorLine(symbol.selectionRange.startLine);
    setTrackedCursorColumn(symbol.selectionRange.startColumn);
    setLocationOverride({
      source: 'breadcrumb',
      path: breadcrumb.slice(0, index + 1),
      lineNumber: symbol.selectionRange.startLine,
      column: symbol.selectionRange.startColumn,
      symbolName: symbol.name,
    });
    onEditorContextChange?.({
      cursorLine: symbol.selectionRange.startLine,
      cursorColumn: symbol.selectionRange.startColumn,
      location: {
        source: 'breadcrumb',
        path: breadcrumb.slice(0, index + 1),
        lineNumber: symbol.selectionRange.startLine,
        column: symbol.selectionRange.startColumn,
        symbolName: symbol.name,
      },
    });
    editor.focus();
  }, [breadcrumb, breadcrumbSymbols, onEditorContextChange]);

  const restoreEditorContext = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    if (!initialEditorContext) return;

    const model = editor.getModel();
    const lineCount = model?.getLineCount?.() || 1;
    const rawLine = initialEditorContext.cursorLine || 1;
    const safeLine =
      rawLine >= 1 && rawLine <= lineCount ? rawLine : 1;
    const safeColumn =
      safeLine === rawLine && initialEditorContext.cursorColumn && initialEditorContext.cursorColumn > 0
        ? initialEditorContext.cursorColumn
        : 1;
    const needsDeferredRestore = rawLine > lineCount;

    if (documentId) {
      pendingDeferredRestoreDocIdRef.current = needsDeferredRestore ? documentId : null;
    }

    isRestoringEditorContextRef.current = true;
    editor.setPosition({
      lineNumber: safeLine,
      column: safeColumn,
    });

    if (
      initialEditorContext.selection &&
      safeLine !== 1 &&
      editor.setSelection
    ) {
      editor.setSelection(initialEditorContext.selection);
    }

    if (initialEditorContext.visibleRange?.scrollTop !== undefined && editor.setScrollTop) {
      editor.setScrollTop(safeLine === 1 ? 0 : initialEditorContext.visibleRange.scrollTop);
    }

    if (needsDeferredRestore) {
      queueMicrotask(() => {
        isRestoringEditorContextRef.current = false;
      });
      return;
    }

    editor.revealLineInCenter(safeLine);
    setTrackedCursorLine(safeLine);
    setTrackedCursorColumn(safeColumn);

    const restoredLocation: CanvasEditorLocation = {
      source: 'restore',
      path: initialEditorContext.location?.path || [],
      lineNumber: safeLine,
      column: safeColumn,
      symbolName: initialEditorContext.location?.symbolName,
    };
    setLocationOverride(restoredLocation);
    onEditorContextChange?.({
      cursorLine: safeLine,
      cursorColumn: safeColumn,
      selection: initialEditorContext.selection,
      visibleRange:
        safeLine === 1
          ? {
              startLineNumber: 1,
              endLineNumber: initialEditorContext.visibleRange?.endLineNumber || 1,
              scrollTop: 0,
              scrollLeft: initialEditorContext.visibleRange?.scrollLeft,
            }
          : initialEditorContext.visibleRange,
      location: restoredLocation,
      lastRestoredAt: new Date(),
    });
    queueMicrotask(() => {
      isRestoringEditorContextRef.current = false;
    });
  }, [documentId, initialEditorContext, onEditorContextChange]);

  useEffect(() => {
    if (!documentId) {
      restoredDocumentIdRef.current = null;
      pendingDeferredRestoreDocIdRef.current = null;
      return;
    }

    const editor = editorRef.current;
    if (!editor || restoredDocumentIdRef.current === documentId) return;

    restoredDocumentIdRef.current = documentId;
    restoreEditorContext(editor);
  }, [documentId, restoreEditorContext]);

  useEffect(() => {
    if (!documentId || pendingDeferredRestoreDocIdRef.current !== documentId || !initialEditorContext) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) return;

    const lineCount = editor.getModel()?.getLineCount?.() || 1;
    const targetLine = initialEditorContext.cursorLine || 1;
    if (targetLine <= 1 || targetLine > lineCount) return;

    restoreEditorContext(editor);
  }, [content, documentId, initialEditorContext, restoreEditorContext]);

  // Register canvas snippets as Monaco completion provider
  const registerCanvasSnippets = useCallback((monaco: typeof Monaco) => {
    const supportedLanguages = ['javascript', 'typescript', 'python', 'html', 'css', 'json'];

    for (const lang of supportedLanguages) {
      const snippets = snippetProvider.getSnippets(lang);
      if (snippets.length === 0) continue;

      const disposable = monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range: Monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: Monaco.languages.CompletionItem[] = snippets.map(
            (snippet: CodeSnippet) => {
              const body = Array.isArray(snippet.body)
                ? snippet.body.join('\n')
                : snippet.body;
              return {
                label: snippet.prefix,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: body,
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: snippet.description,
                detail: `Canvas Snippet: ${snippet.description}`,
                range,
                sortText: `!0${snippet.prefix}`,
              };
            }
          );

          return { suggestions };
        },
      });
      disposablesRef.current.push(disposable);
    }
  }, []);

  // Register all themes from the registry with Monaco
  const registerThemes = useCallback((monaco: typeof Monaco) => {
    const themes = themeRegistry.getAllThemes();
    for (const theme of themes) {
      const monacoThemeDef = themeRegistry.toMonacoTheme(theme);
      monaco.editor.defineTheme(theme.id, monacoThemeDef);
    }
  }, []);

  // Setup plugin manager context
  const setupPluginContext = useCallback((editor: Monaco.editor.IStandaloneCodeEditor) => {
    if (!documentId) return;

    pluginManager.setContext({
      documentId,
      language,
      getContent: () => editor.getValue(),
      setContent: (newContent: string) => editor.setValue(newContent),
      getSelection: () => {
        const selection = editor.getSelection();
        if (!selection) return '';
        return editor.getModel()?.getValueInRange(selection) || '';
      },
      insertText: (text: string, position?) => {
        const pos = position
          ? { lineNumber: position.line, column: position.column }
          : editor.getPosition();
        if (pos) {
          editor.executeEdits('plugin', [{
            range: {
              startLineNumber: pos.lineNumber,
              startColumn: pos.column,
              endLineNumber: pos.lineNumber,
              endColumn: pos.column,
            },
            text,
          }]);
        }
      },
      replaceSelection: (text: string) => {
        const selection = editor.getSelection();
        if (selection) {
          editor.executeEdits('plugin', [{
            range: selection,
            text,
          }]);
        }
      },
      showNotification: (message: string, type: 'info' | 'warning' | 'error') => {
        console.log(`[Canvas Plugin ${type}]: ${message}`);
      },
      registerCommand: (command) => {
        // Commands are handled by the plugin manager internally
        pluginManager.getCommands();
        void command;
      },
    });
  }, [documentId, language]);

  // Handle editor mount - central integration point
  const handleEditorMount = useCallback((
    editor: Monaco.editor.IStandaloneCodeEditor,
    monaco: typeof Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Phase B: Register canvas snippets
    registerCanvasSnippets(monaco);

    // Phase B: Also register Monaco built-in snippets and Emmet
    const builtinDisposables = registerAllSnippets(monaco);
    disposablesRef.current.push(...builtinDisposables);
    const emmetDisposables = registerEmmetSupport(monaco);
    disposablesRef.current.push(...emmetDisposables);

    // Phase D: Register and apply themes
    registerThemes(monaco);
    const activeTheme = themeRegistry.getActiveTheme();
    if (activeTheme) {
      monaco.editor.setTheme(activeTheme.id);
    }

    // Phase G: Setup plugin context
    setupPluginContext(editor);

    // Track cursor line for symbol breadcrumb derivation
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      if (isRestoringEditorContextRef.current) return;
      setTrackedCursorLine(e.position.lineNumber);
      setTrackedCursorColumn(e.position.column);
      setLocationOverride((previous) =>
        previous?.lineNumber === e.position.lineNumber ? previous : null
      );
      onEditorContextChange?.({
        cursorLine: e.position.lineNumber,
        cursorColumn: e.position.column,
        location: {
          source: 'cursor',
          path: symbolParser.getSymbolBreadcrumb(e.position.lineNumber, symbols),
          lineNumber: e.position.lineNumber,
          column: e.position.column,
          symbolName: symbolParser.findSymbolAtLine(e.position.lineNumber, symbols)?.name,
        },
      });
    });
    disposablesRef.current.push(cursorDisposable);

    // Notify plugins of content changes
    const contentDisposable = editor.onDidChangeModelContent(() => {
      if (
        documentId &&
        pendingDeferredRestoreDocIdRef.current === documentId &&
        initialEditorContext
      ) {
        const targetLine = initialEditorContext.cursorLine || 1;
        const lineCount = editor.getModel()?.getLineCount?.() || 1;
        if (targetLine > 1 && targetLine <= lineCount) {
          restoreEditorContext(editor);
        }
      }
      pluginManager.executeHook('onContentChange', editor.getValue(), language);
    });
    disposablesRef.current.push(contentDisposable);

    // Notify plugins of selection changes
    const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
      if (isRestoringEditorContextRef.current) return;
      const model = editor.getModel();
      if (model) {
        const selectedText = model.getValueInRange(e.selection);
        onSelectionChange?.(selectedText);
        onEditorContextChange?.({
          selection: {
            startLineNumber: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLineNumber: e.selection.endLineNumber,
            endColumn: e.selection.endColumn,
          },
        });
        if (selectedText) {
          pluginManager.executeHook('onSelectionChange', selectedText, {
            startLine: e.selection.startLineNumber,
            startColumn: e.selection.startColumn,
            endLine: e.selection.endLineNumber,
            endColumn: e.selection.endColumn,
          });
        }
      }
    });
    disposablesRef.current.push(selectionDisposable);

    const scrollDisposable = editor.onDidScrollChange(() => {
      if (isRestoringEditorContextRef.current) return;
      const visibleRange = editor.getVisibleRanges?.()[0];
      if (!visibleRange) return;

      onEditorContextChange?.({
        visibleRange: {
          startLineNumber: visibleRange.startLineNumber,
          endLineNumber: visibleRange.endLineNumber,
          scrollTop: editor.getScrollTop?.(),
          scrollLeft: editor.getScrollLeft?.(),
        },
      });
    });
    disposablesRef.current.push(scrollDisposable);

    restoreEditorContext(editor);
    if (documentId) {
      restoredDocumentIdRef.current = documentId;
    }
  }, [
    documentId,
    initialEditorContext,
    language,
    onEditorContextChange,
    onSelectionChange,
    registerCanvasSnippets,
    registerThemes,
    restoreEditorContext,
    setupPluginContext,
    symbols,
  ]);

  // Handle editor unmount
  const handleEditorWillUnmount = useCallback(() => {
    // Dispose all registered providers
    for (const disposable of disposablesRef.current) {
      disposable.dispose();
    }
    disposablesRef.current = [];

    // Clear plugin context
    pluginManager.clearContext();

    editorRef.current = null;
    monacoRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleEditorWillUnmount();
    };
  }, [handleEditorWillUnmount]);

  return {
    symbols,
    breadcrumb,
    currentSymbol,
    activeLocation,
    availableThemes,
    activeThemeId,
    setActiveTheme,
    snippetCount,
    goToSymbol,
    goToBreadcrumb,
    breadcrumbSymbols,
    editorRef,
    handleEditorMount,
    handleEditorWillUnmount,
  };
}

export default useCanvasMonacoSetup;
