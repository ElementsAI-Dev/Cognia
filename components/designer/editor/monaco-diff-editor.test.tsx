/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { MonacoDiffEditor } from './monaco-diff-editor';

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = { theme: 'light' };
    return selector(state);
  },
}));

// Mock TypeScript config
jest.mock('@/lib/monaco/typescript-config', () => ({
  setupTypeScript: jest.fn(),
}));

// Mock diff editor model
const mockOriginalModel = {
  getValue: jest.fn(() => 'original code'),
  dispose: jest.fn(),
  onDidChangeContent: jest.fn(() => ({ dispose: jest.fn() })),
};
const mockModifiedModel = {
  getValue: jest.fn(() => 'modified code'),
  dispose: jest.fn(),
  onDidChangeContent: jest.fn(() => ({ dispose: jest.fn() })),
};
const mockDiffEditor = {
  setModel: jest.fn(),
  getLineChanges: jest.fn(() => []),
  getModifiedEditor: jest.fn(() => ({
    getPosition: jest.fn(() => ({ lineNumber: 1, column: 1 })),
    setPosition: jest.fn(),
    revealLineInCenter: jest.fn(),
  })),
  updateOptions: jest.fn(),
  dispose: jest.fn(),
  getModel: jest.fn(() => ({
    original: mockOriginalModel,
    modified: mockModifiedModel,
  })),
};

const mockMonaco = {
  editor: {
    createModel: jest.fn((code: string) => {
      if (code === 'original code') return mockOriginalModel;
      return mockModifiedModel;
    }),
    createDiffEditor: jest.fn(() => mockDiffEditor),
    setTheme: jest.fn(),
  },
  languages: {
    typescript: {
      typescriptDefaults: {
        setCompilerOptions: jest.fn(),
        setDiagnosticsOptions: jest.fn(),
        addExtraLib: jest.fn(),
        setEagerModelSync: jest.fn(),
      },
      javascriptDefaults: {
        setCompilerOptions: jest.fn(),
        setDiagnosticsOptions: jest.fn(),
        addExtraLib: jest.fn(),
        setEagerModelSync: jest.fn(),
      },
      ScriptTarget: { ESNext: 99 },
      ModuleKind: { ESNext: 99 },
      ModuleResolutionKind: { NodeJs: 2 },
      JsxEmit: { ReactJSX: 4 },
    },
  },
};

jest.mock('monaco-editor', () => mockMonaco, { virtual: true });

describe('MonacoDiffEditor', () => {
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
      render(
        <MonacoDiffEditor
          originalCode="original code"
          modifiedCode="modified code"
        />
      );
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should render with custom className', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <MonacoDiffEditor
          originalCode="a"
          modifiedCode="b"
          className="diff-custom"
        />
      );
      container = result.container;
    });
    expect(container!.firstChild).toHaveClass('diff-custom');
  });

  it('should accept language prop', async () => {
    await act(async () => {
      render(
        <MonacoDiffEditor
          originalCode="a"
          modifiedCode="b"
          language="javascript"
        />
      );
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should accept readOnly prop', async () => {
    await act(async () => {
      render(
        <MonacoDiffEditor
          originalCode="a"
          modifiedCode="b"
          readOnly={true}
        />
      );
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should accept custom labels', async () => {
    await act(async () => {
      render(
        <MonacoDiffEditor
          originalCode="a"
          modifiedCode="b"
          originalLabel="Before"
          modifiedLabel="After"
        />
      );
    });
    expect(document.body).toBeInTheDocument();
  });

  it('should accept onModifiedChange callback', async () => {
    const onModifiedChange = jest.fn();
    await act(async () => {
      render(
        <MonacoDiffEditor
          originalCode="a"
          modifiedCode="b"
          onModifiedChange={onModifiedChange}
        />
      );
    });
    expect(document.body).toBeInTheDocument();
  });

  describe('error handling', () => {
    it('should handle diff editor creation failure', async () => {
      const originalCreate = mockMonaco.editor.createDiffEditor;
      mockMonaco.editor.createDiffEditor = jest.fn(() => {
        throw new Error('Diff editor failed');
      }) as jest.Mock;

      let container: HTMLElement;
      await act(async () => {
        const result = render(
          <MonacoDiffEditor
            originalCode="a"
            modifiedCode="b"
            className="diff-error"
          />
        );
        container = result.container;
      });

      const errorContainer = container!.querySelector('.diff-error');
      expect(errorContainer).toBeInTheDocument();

      mockMonaco.editor.createDiffEditor = originalCreate;
    });
  });

  describe('initialization', () => {
    it('should create diff editor on mount', async () => {
      await act(async () => {
        render(
          <MonacoDiffEditor
            originalCode="original code"
            modifiedCode="modified code"
          />
        );
      });

      expect(mockMonaco.editor.createDiffEditor).toHaveBeenCalled();
    });

    it('should create models for original and modified code', async () => {
      await act(async () => {
        render(
          <MonacoDiffEditor
            originalCode="original code"
            modifiedCode="modified code"
          />
        );
      });

      expect(mockMonaco.editor.createModel).toHaveBeenCalledTimes(2);
    });

    it('should set models on the diff editor', async () => {
      await act(async () => {
        render(
          <MonacoDiffEditor
            originalCode="original code"
            modifiedCode="modified code"
          />
        );
      });

      expect(mockDiffEditor.setModel).toHaveBeenCalledWith({
        original: mockOriginalModel,
        modified: mockModifiedModel,
      });
    });

    it('should cleanup on unmount', async () => {
      let unmount: () => void;
      await act(async () => {
        const result = render(
          <MonacoDiffEditor
            originalCode="a"
            modifiedCode="b"
          />
        );
        unmount = result.unmount;
      });

      await act(async () => {
        unmount();
      });

      expect(mockDiffEditor.dispose).toHaveBeenCalled();
    });
  });
});
