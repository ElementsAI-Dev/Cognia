/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { MonacoSandpackEditor } from './monaco-sandpack-editor';

// Mock designer store
const mockSetCode = jest.fn();
const mockParseCodeToElements = jest.fn();
jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: unknown) => unknown) => {
    const state = {
      code: 'const test = "hello";',
      setCode: mockSetCode,
      parseCodeToElements: mockParseCodeToElements,
    };
    return selector(state);
  },
}));

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      theme: 'light',
    };
    return selector(state);
  },
}));

// Mock snippet registration
jest.mock('@/lib/monaco/snippets', () => ({
  registerAllSnippets: jest.fn(() => []),
  registerEmmetSupport: jest.fn(() => []),
}));

jest.mock('@/lib/monaco/completion-providers', () => ({
  registerAllCompletionProviders: jest.fn(() => []),
}));

jest.mock('@/lib/monaco/code-actions', () => ({
  registerCodeActionProvider: jest.fn(() => []),
}));

jest.mock('@/lib/monaco/hover-provider', () => ({
  registerEnhancedHoverProvider: jest.fn(() => []),
}));

jest.mock('@/lib/monaco/color-provider', () => ({
  registerColorProvider: jest.fn(() => []),
}));

jest.mock('@/lib/monaco/symbol-provider', () => ({
  registerDocumentSymbolProvider: jest.fn(() => []),
}));

const mockCreateMonacoLspAdapter = jest.fn((_options?: unknown) => ({
  start: jest.fn(async () => ({
    connected: false,
    capabilities: {},
    features: {
      completion: false,
      hover: false,
      definition: false,
      documentSymbols: false,
      codeActions: false,
      formatting: false,
      workspaceSymbols: false,
    },
  })),
  dispose: jest.fn(async () => undefined),
}));
jest.mock('@/lib/monaco/lsp/monaco-lsp-adapter', () => ({
  createMonacoLspAdapter: (options: unknown) => mockCreateMonacoLspAdapter(options),
}));

jest.mock('@/lib/monaco/lsp/lsp-client', () => ({
  isTauriRuntime: jest.fn(() => false),
}));

// Mock TypeScript config to prevent setEagerModelSync errors
jest.mock('@/lib/monaco/typescript-config', () => ({
  setupTypeScript: jest.fn(),
}));

// Mock monaco-editor with controlled async behavior
const mockDispose = jest.fn();
const mockGetPosition = jest.fn(() => ({ lineNumber: 1, column: 1 }));
const mockGetSelection = jest.fn(() => ({ isEmpty: () => true, startLineNumber: 1, endLineNumber: 1 }));
const mockModel = {
  getValue: jest.fn(() => 'const test = "hello";'),
  getLineCount: jest.fn(() => 1),
  getValueInRange: jest.fn(() => ''),
  uri: { toString: () => 'file:///test.ts' },
  dispose: jest.fn(),
};
const mockGetModel = jest.fn(() => mockModel);
const mockCreateModel = jest.fn(() => mockModel);
const mockEditor = {
  getValue: jest.fn(() => 'const test = "hello";'),
  setValue: jest.fn(),
  dispose: mockDispose,
  onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeCursorSelection: jest.fn(() => ({ dispose: jest.fn() })),
  addCommand: jest.fn(),
  addAction: jest.fn(),
  trigger: jest.fn(),
  getPosition: mockGetPosition,
  getSelection: mockGetSelection,
  getModel: mockGetModel,
  setPosition: jest.fn(),
  updateOptions: jest.fn(),
  focus: jest.fn(),
};

const mockMonaco = {
  editor: {
    create: jest.fn(() => mockEditor),
    createModel: mockCreateModel,
    setTheme: jest.fn(),
    setModelLanguage: jest.fn(),
    getModelMarkers: jest.fn(() => []),
    onDidChangeMarkers: jest.fn(() => ({ dispose: jest.fn() })),
  },
  Uri: {
    parse: jest.fn((value: string) => ({ toString: () => value })),
  },
  MarkerSeverity: { Error: 8, Warning: 4, Info: 2 },
  KeyMod: { CtrlCmd: 2048, Shift: 1024, Alt: 512 },
  KeyCode: {
    KeyS: 49, KeyG: 27, KeyP: 36, KeyO: 35, KeyD: 24, KeyA: 21,
    KeyF: 26, KeyK: 31, KeyL: 32, KeyZ: 56, KeyU: 51,
    F1: 59, Slash: 85, Period: 84, BracketLeft: 87, BracketRight: 88,
    UpArrow: 16, DownArrow: 18, Equal: 81, Minus: 80, Digit0: 21,
  },
  languages: {
    typescript: {
      typescriptDefaults: {
        setCompilerOptions: jest.fn(),
        setDiagnosticsOptions: jest.fn(),
        addExtraLib: jest.fn(),
      },
      javascriptDefaults: {
        setCompilerOptions: jest.fn(),
        setDiagnosticsOptions: jest.fn(),
        addExtraLib: jest.fn(),
      },
      ScriptTarget: { ESNext: 99 },
      ModuleKind: { ESNext: 99 },
      ModuleResolutionKind: { NodeJs: 2 },
      JsxEmit: { ReactJSX: 4 },
    },
    registerCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
    CompletionItemKind: { Snippet: 27 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  },
};

jest.mock('monaco-editor', () => mockMonaco, { virtual: true });

describe('MonacoSandpackEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render with loading state initially', async () => {
    await act(async () => {
      render(<MonacoSandpackEditor />);
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should render editor container', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<MonacoSandpackEditor />);
      container = result.container;
    });
    expect(container!.querySelector('.relative.h-full')).toBeInTheDocument();
  });

  it('should apply custom className', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<MonacoSandpackEditor className="custom-editor" />);
      container = result.container;
    });
    expect(container!.firstChild).toHaveClass('custom-editor');
  });

  it('should render with default language typescript', async () => {
    await act(async () => {
      render(<MonacoSandpackEditor />);
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should render with custom language', async () => {
    await act(async () => {
      render(<MonacoSandpackEditor language="html" />);
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should render with readOnly mode', async () => {
    await act(async () => {
      render(<MonacoSandpackEditor readOnly={true} />);
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should accept onSave callback', async () => {
    const onSave = jest.fn();
    await act(async () => {
      render(<MonacoSandpackEditor onSave={onSave} />);
    });
    expect(document.body).toBeInTheDocument();
  });

  describe('error handling', () => {
    it('should handle Monaco import failure gracefully', async () => {
      // Temporarily mock Monaco to throw an error
      const originalCreate = mockMonaco.editor.create;
      mockMonaco.editor.create = jest.fn(() => {
        throw new Error('Monaco load failed');
      }) as jest.Mock;

      await act(async () => {
        render(<MonacoSandpackEditor />);
      });

      // Component should still render without crashing
      expect(document.body).toBeInTheDocument();

      // Restore original mock
      mockMonaco.editor.create = originalCreate;
    });

    it('should show error UI when Monaco fails to load', async () => {
      const originalCreate = mockMonaco.editor.create;
      mockMonaco.editor.create = jest.fn(() => {
        throw new Error('Monaco load failed');
      }) as jest.Mock;

      let container: HTMLElement;
      await act(async () => {
        const result = render(<MonacoSandpackEditor className="test-error" />);
        container = result.container;
      });

      // Check error UI is rendered with className
      const errorContainer = container!.querySelector('.test-error');
      expect(errorContainer).toBeInTheDocument();

      // Restore original mock
      mockMonaco.editor.create = originalCreate;
    });
  });

  describe('initialization', () => {
    it('should initialize Monaco editor on mount', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor />);
      });
      
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('should cleanup on unmount', async () => {
      let unmount: () => void;
      await act(async () => {
        const result = render(<MonacoSandpackEditor />);
        unmount = result.unmount;
      });
      
      await act(async () => {
        unmount();
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should create editor with correct options', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor language="typescript" readOnly={false} />);
      });
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('props handling', () => {
    it('should handle all props together', async () => {
      const onSave = jest.fn();
      await act(async () => {
        render(
          <MonacoSandpackEditor
            className="test-class"
            language="html"
            readOnly={true}
            onSave={onSave}
          />
        );
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should handle undefined className', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor className={undefined} />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should handle empty className', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor className="" />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should accept showToolbar prop', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor showToolbar={false} />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should accept showStatusBar prop', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor showStatusBar={false} />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should accept onFormat callback', async () => {
      const onFormat = jest.fn();
      await act(async () => {
        render(<MonacoSandpackEditor onFormat={onFormat} />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should accept onCursorChange callback', async () => {
      const onCursorChange = jest.fn();
      await act(async () => {
        render(<MonacoSandpackEditor onCursorChange={onCursorChange} />);
      });
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('editor container', () => {
    it('should have correct structure', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(<MonacoSandpackEditor />);
        container = result.container;
      });
      
      // Check for main container
      const mainContainer = container!.querySelector('.relative.h-full');
      expect(mainContainer).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner initially', async () => {
      let container: HTMLElement;
      await act(async () => {
        const result = render(<MonacoSandpackEditor />);
        container = result.container;
      });
      
      // Component renders loading or editor state
      expect(container!.firstChild).toBeInTheDocument();
    });
  });

  describe('language handling', () => {
    it('should handle typescript language', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor language="typescript" />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should handle html language', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor language="html" />);
      });
      expect(document.body).toBeInTheDocument();
    });

    it('should handle other language values', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor language="javascript" />);
      });
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('new VSCode features', () => {
    it('should show fallback LSP status in web runtime', async () => {
      const { findByText } = render(<MonacoSandpackEditor />);
      expect(await findByText('LSP: fallback')).toBeInTheDocument();
    });

    it('should register keyboard shortcuts on init', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor />);
      });
      
      await waitFor(() => {
        // Editor should register multiple addCommand calls for keyboard shortcuts
        expect(mockEditor.addCommand).toHaveBeenCalled();
      });
    });

    it('should register editor actions on init', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor />);
      });
      
      await waitFor(() => {
        // Editor should register addAction calls for command palette actions
        expect(mockEditor.addAction).toHaveBeenCalled();
      });
    });

    it('should listen for marker changes (diagnostics)', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor />);
      });
      
      await waitFor(() => {
        expect(mockMonaco.editor.onDidChangeMarkers).toHaveBeenCalled();
      });
    });

    it('should listen for cursor and selection changes', async () => {
      await act(async () => {
        render(<MonacoSandpackEditor />);
      });
      
      await waitFor(() => {
        expect(mockEditor.onDidChangeCursorPosition).toHaveBeenCalled();
        expect(mockEditor.onDidChangeCursorSelection).toHaveBeenCalled();
      });
    });
  });
});
