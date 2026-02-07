/**
 * Tests for useCanvasMonacoSetup hook
 */

import { renderHook, act } from '@testing-library/react';

// Mock all external dependencies
jest.mock('@/lib/canvas/snippets/snippet-registry', () => ({
  snippetProvider: {
    getSnippets: jest.fn((lang: string) => {
      if (lang === 'typescript') {
        return [
          { id: '1', prefix: 'log', body: 'console.log($1)', description: 'Log', language: 'typescript' },
          { id: '2', prefix: 'fn', body: 'function $1() {\n  $2\n}', description: 'Function', language: 'typescript' },
        ];
      }
      return [];
    }),
  },
}));

jest.mock('@/lib/canvas/symbols/symbol-parser', () => ({
  symbolParser: {
    parseSymbols: jest.fn((content: string, language: string) => {
      if (!content || !language) return [];
      if (content.includes('function')) {
        return [
          {
            name: 'myFunc',
            kind: 'function',
            range: { startLine: 1, endLine: 5, startColumn: 1, endColumn: 1 },
            selectionRange: { startLine: 1, endLine: 1, startColumn: 10, endColumn: 16 },
          },
        ];
      }
      return [];
    }),
    getSymbolBreadcrumb: jest.fn((line: number, symbols: unknown[]) => {
      if (symbols.length === 0) return [];
      return ['myFunc'];
    }),
    findSymbolAtLine: jest.fn((line: number, symbols: unknown[]) => {
      if (symbols.length === 0) return null;
      return symbols[0];
    }),
    getSymbolIcon: jest.fn(() => '🔧'),
  },
}));

jest.mock('@/lib/canvas/themes/theme-registry', () => ({
  themeRegistry: {
    getActiveThemeId: jest.fn(() => 'vs-dark'),
    getActiveTheme: jest.fn(() => ({
      id: 'vs-dark',
      name: 'Dark',
      dark: true,
      base: 'vs-dark',
      colors: { background: '#1e1e1e', foreground: '#d4d4d4' },
      tokenColors: [],
    })),
    getAllThemes: jest.fn(() => [
      {
        id: 'vs-dark',
        name: 'Dark',
        dark: true,
        base: 'vs-dark',
        colors: { background: '#1e1e1e', foreground: '#d4d4d4' },
        tokenColors: [],
      },
      {
        id: 'vs-light',
        name: 'Light',
        dark: false,
        base: 'vs',
        colors: { background: '#ffffff', foreground: '#333333' },
        tokenColors: [],
      },
    ]),
    setActiveTheme: jest.fn(() => true),
    getTheme: jest.fn((id: string) => ({
      id,
      name: id === 'vs-dark' ? 'Dark' : 'Light',
      dark: id === 'vs-dark',
      base: id === 'vs-dark' ? 'vs-dark' : 'vs',
      colors: {},
      tokenColors: [],
    })),
    toMonacoTheme: jest.fn(() => ({
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {},
    })),
  },
}));

jest.mock('@/lib/canvas/plugins/plugin-manager', () => ({
  pluginManager: {
    setContext: jest.fn(),
    clearContext: jest.fn(),
    executeHook: jest.fn(),
    getCommands: jest.fn(() => []),
  },
}));

jest.mock('@/lib/monaco/snippets', () => ({
  registerAllSnippets: jest.fn(() => []),
  registerEmmetSupport: jest.fn(() => []),
}));

import { useCanvasMonacoSetup } from './use-canvas-monaco-setup';
import { snippetProvider } from '@/lib/canvas/snippets/snippet-registry';
import { symbolParser } from '@/lib/canvas/symbols/symbol-parser';
import { themeRegistry } from '@/lib/canvas/themes/theme-registry';
import { pluginManager } from '@/lib/canvas/plugins/plugin-manager';
import { registerAllSnippets, registerEmmetSupport } from '@/lib/monaco/snippets';

describe('useCanvasMonacoSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const defaultOptions = {
    documentId: 'doc-1',
    language: 'typescript',
    content: '',
  };

  describe('initial state', () => {
    it('should return empty symbols for empty content', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      expect(result.current.symbols).toEqual([]);
      expect(result.current.breadcrumb).toEqual([]);
      expect(result.current.currentSymbol).toBeNull();
    });

    it('should return available themes from registry', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      expect(result.current.availableThemes).toHaveLength(2);
      expect(result.current.availableThemes[0].id).toBe('vs-dark');
      expect(result.current.availableThemes[1].id).toBe('vs-light');
    });

    it('should return active theme id', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      expect(result.current.activeThemeId).toBe('vs-dark');
    });

    it('should return snippet count for language', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      expect(result.current.snippetCount).toBe(2);
      expect(snippetProvider.getSnippets).toHaveBeenCalledWith('typescript');
    });

    it('should return 0 snippets for unknown language', () => {
      const { result } = renderHook(() =>
        useCanvasMonacoSetup({ ...defaultOptions, language: 'unknown' })
      );

      expect(result.current.snippetCount).toBe(0);
    });

    it('should have null editorRef initially', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      expect(result.current.editorRef.current).toBeNull();
    });
  });

  describe('symbol parsing with debounce', () => {
    it('should parse symbols after debounce period', () => {
      const { result } = renderHook(
        (props) => useCanvasMonacoSetup(props),
        { initialProps: { ...defaultOptions, content: 'function myFunc() {}' } }
      );

      // Before debounce fires
      expect(result.current.symbols).toEqual([]);

      // Advance past debounce
      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(symbolParser.parseSymbols).toHaveBeenCalledWith(
        'function myFunc() {}',
        'typescript'
      );
      expect(result.current.symbols).toHaveLength(1);
      expect(result.current.symbols[0].name).toBe('myFunc');
    });

    it('should debounce rapid content changes', () => {
      const { rerender } = renderHook(
        (props) => useCanvasMonacoSetup(props),
        { initialProps: { ...defaultOptions, content: 'a' } }
      );

      // Rapid changes
      rerender({ ...defaultOptions, content: 'ab' });
      rerender({ ...defaultOptions, content: 'abc' });
      rerender({ ...defaultOptions, content: 'function myFunc() {}' });

      // Only after debounce should it parse
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // parseSymbols should only be called once with the final content
      const calls = (symbolParser.parseSymbols as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe('function myFunc() {}');
    });

    it('should derive breadcrumb from symbols and cursor', () => {
      const { result } = renderHook(() =>
        useCanvasMonacoSetup({ ...defaultOptions, content: 'function myFunc() {}' })
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.breadcrumb).toEqual(['myFunc']);
    });

    it('should derive currentSymbol from symbols and cursor', () => {
      const { result } = renderHook(() =>
        useCanvasMonacoSetup({ ...defaultOptions, content: 'function myFunc() {}' })
      );

      act(() => {
        jest.advanceTimersByTime(600);
      });

      expect(result.current.currentSymbol).not.toBeNull();
      expect(result.current.currentSymbol?.name).toBe('myFunc');
    });
  });

  describe('setActiveTheme', () => {
    it('should update active theme id', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      act(() => {
        result.current.setActiveTheme('vs-light');
      });

      expect(result.current.activeThemeId).toBe('vs-light');
      expect(themeRegistry.setActiveTheme).toHaveBeenCalledWith('vs-light');
    });
  });

  describe('handleEditorMount', () => {
    it('should register snippets and themes on mount', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      expect(registerAllSnippets).toHaveBeenCalledWith(mockMonaco);
      expect(registerEmmetSupport).toHaveBeenCalledWith(mockMonaco);
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalled();
      expect(mockMonaco.editor.setTheme).toHaveBeenCalled();
    });

    it('should set up plugin context on mount', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      expect(pluginManager.setContext).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-1',
          language: 'typescript',
        })
      );
    });

    it('should not set plugin context when documentId is null', () => {
      const { result } = renderHook(() =>
        useCanvasMonacoSetup({ ...defaultOptions, documentId: null })
      );

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      expect(pluginManager.setContext).not.toHaveBeenCalled();
    });

    it('should register cursor position listener', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled();
    });

    it('should register content change listener', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      expect(mockEditor.onDidChangeModelContent).toHaveBeenCalled();
    });

    it('should register selection change listener', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      expect(mockEditor.onDidChangeCursorSelection).toHaveBeenCalled();
    });

    it('should register canvas snippets for supported languages', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockMonaco = createMockMonaco();
      const mockEditor = createMockEditor();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      // Should register completion providers for languages with snippets
      expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
    });
  });

  describe('handleEditorWillUnmount', () => {
    it('should dispose all registered disposables', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      act(() => {
        result.current.handleEditorWillUnmount();
      });

      expect(pluginManager.clearContext).toHaveBeenCalled();
      expect(result.current.editorRef.current).toBeNull();
    });
  });

  describe('goToSymbol', () => {
    it('should navigate editor to symbol location', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      const symbol = {
        name: 'testFunc',
        kind: 'function' as const,
        range: { startLine: 10, endLine: 20, startColumn: 1, endColumn: 1 },
        selectionRange: { startLine: 10, endLine: 10, startColumn: 10, endColumn: 18 },
      };

      act(() => {
        result.current.goToSymbol(symbol);
      });

      expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(10);
      expect(mockEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 10,
        column: 10,
      });
      expect(mockEditor.focus).toHaveBeenCalled();
    });

    it('should do nothing when editor is not mounted', () => {
      const { result } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const symbol = {
        name: 'testFunc',
        kind: 'function' as const,
        range: { startLine: 10, endLine: 20, startColumn: 1, endColumn: 1 },
        selectionRange: { startLine: 10, endLine: 10, startColumn: 10, endColumn: 18 },
      };

      // Should not throw
      act(() => {
        result.current.goToSymbol(symbol);
      });
    });
  });

  describe('cleanup on unmount', () => {
    it('should clean up disposables and clear context on unmount', () => {
      const { result, unmount } = renderHook(() => useCanvasMonacoSetup(defaultOptions));

      const mockEditor = createMockEditor();
      const mockMonaco = createMockMonaco();

      act(() => {
        result.current.handleEditorMount(mockEditor as never, mockMonaco as never);
      });

      unmount();

      expect(pluginManager.clearContext).toHaveBeenCalled();
    });
  });
});

// Helper: create a mock Monaco editor
function createMockEditor() {
  const disposable = { dispose: jest.fn() };
  return {
    getValue: jest.fn(() => 'mock content'),
    setValue: jest.fn(),
    getSelection: jest.fn(() => ({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 5,
    })),
    getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
    getModel: jest.fn(() => ({
      getValueInRange: jest.fn(() => 'selected'),
      getWordUntilPosition: jest.fn(() => ({ word: '', startColumn: 1, endColumn: 1 })),
    })),
    executeEdits: jest.fn(),
    revealLineInCenter: jest.fn(),
    setPosition: jest.fn(),
    focus: jest.fn(),
    onDidChangeCursorPosition: jest.fn(() => disposable),
    onDidChangeModelContent: jest.fn(() => disposable),
    onDidChangeCursorSelection: jest.fn(() => disposable),
  };
}

// Helper: create a mock Monaco namespace
function createMockMonaco() {
  const disposable = { dispose: jest.fn() };
  return {
    editor: {
      defineTheme: jest.fn(),
      setTheme: jest.fn(),
    },
    languages: {
      registerCompletionItemProvider: jest.fn(() => disposable),
      CompletionItemKind: { Snippet: 27 },
      CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    },
  };
}
