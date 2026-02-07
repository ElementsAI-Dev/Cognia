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
import { snippetProvider, type CodeSnippet } from '@/lib/canvas/snippets/snippet-registry';
import { symbolParser, type DocumentSymbol } from '@/lib/canvas/symbols/symbol-parser';
import { themeRegistry, type EditorTheme } from '@/lib/canvas/themes/theme-registry';
import { pluginManager } from '@/lib/canvas/plugins/plugin-manager';
import { registerAllSnippets, registerEmmetSupport } from '@/lib/monaco/snippets';

interface UseCanvasMonacoSetupOptions {
  documentId: string | null;
  language: string;
  content: string;
  cursorLine?: number;
  onContentChange?: (content: string) => void;
  onSelectionChange?: (selection: string) => void;
}

interface UseCanvasMonacoSetupReturn {
  symbols: DocumentSymbol[];
  breadcrumb: string[];
  currentSymbol: DocumentSymbol | null;
  availableThemes: EditorTheme[];
  activeThemeId: string;
  setActiveTheme: (themeId: string) => void;
  snippetCount: number;
  goToSymbol: (symbol: DocumentSymbol) => void;
  editorRef: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
  handleEditorMount: (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => void;
  handleEditorWillUnmount: () => void;
}

export function useCanvasMonacoSetup(
  options: UseCanvasMonacoSetupOptions
): UseCanvasMonacoSetupReturn {
  const { documentId, language, content, cursorLine: initialCursorLine = 1 } = options;

  // Track cursor line for symbol derivation
  const [trackedCursorLine, setTrackedCursorLine] = useState(initialCursorLine);

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const disposablesRef = useRef<Monaco.IDisposable[]>([]);

  // Symbol parsing state - debounced
  const [debouncedContent, setDebouncedContent] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme state
  const [activeThemeId, setActiveThemeIdState] = useState(themeRegistry.getActiveThemeId());

  // Debounce content for symbol parsing (avoid re-parsing on every keystroke)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedContent(content);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content]);

  // Parse symbols from debounced content (pure derivation)
  const symbols = useMemo<DocumentSymbol[]>(() => {
    if (!debouncedContent || !language) return [];
    try {
      return symbolParser.parseSymbols(debouncedContent, language);
    } catch {
      return [];
    }
  }, [debouncedContent, language]);

  // Derive breadcrumb from symbols + cursor (pure derivation)
  const breadcrumb = useMemo(() => {
    if (symbols.length === 0) return [];
    return symbolParser.getSymbolBreadcrumb(trackedCursorLine, symbols);
  }, [symbols, trackedCursorLine]);

  // Derive current symbol from symbols + cursor (pure derivation)
  const currentSymbol = useMemo<DocumentSymbol | null>(() => {
    if (symbols.length === 0) return null;
    return symbolParser.findSymbolAtLine(trackedCursorLine, symbols);
  }, [symbols, trackedCursorLine]);

  // Available themes from registry
  const availableThemes = useMemo(() => themeRegistry.getAllThemes(), []);

  // Snippet count for the current language
  const snippetCount = useMemo(() => {
    return snippetProvider.getSnippets(language).length;
  }, [language]);

  // Set active theme and apply to Monaco
  const setActiveTheme = useCallback((themeId: string) => {
    themeRegistry.setActiveTheme(themeId);
    setActiveThemeIdState(themeId);

    const monaco = monacoRef.current;
    if (monaco) {
      const theme = themeRegistry.getTheme(themeId);
      if (theme) {
        const monacoThemeDef = themeRegistry.toMonacoTheme(theme);
        monaco.editor.defineTheme(themeId, monacoThemeDef);
        monaco.editor.setTheme(themeId);
      }
    }
  }, []);

  // Navigate to a symbol in the editor
  const goToSymbol = useCallback((symbol: DocumentSymbol) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.revealLineInCenter(symbol.range.startLine);
    editor.setPosition({
      lineNumber: symbol.selectionRange.startLine,
      column: symbol.selectionRange.startColumn,
    });
    editor.focus();
  }, []);

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
      setTrackedCursorLine(e.position.lineNumber);
    });
    disposablesRef.current.push(cursorDisposable);

    // Notify plugins of content changes
    const contentDisposable = editor.onDidChangeModelContent(() => {
      pluginManager.executeHook('onContentChange', editor.getValue(), language);
    });
    disposablesRef.current.push(contentDisposable);

    // Notify plugins of selection changes
    const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel();
      if (model) {
        const selectedText = model.getValueInRange(e.selection);
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
  }, [registerCanvasSnippets, registerThemes, setupPluginContext, language]);

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
    availableThemes,
    activeThemeId,
    setActiveTheme,
    snippetCount,
    goToSymbol,
    editorRef,
    handleEditorMount,
    handleEditorWillUnmount,
  };
}

export default useCanvasMonacoSetup;
