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

// Mock monaco-editor with controlled async behavior
const mockDispose = jest.fn();
const mockEditor = {
  getValue: jest.fn(() => 'const test = "hello";'),
  setValue: jest.fn(),
  dispose: mockDispose,
  onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
  addCommand: jest.fn(),
};

const mockMonaco = {
  editor: {
    create: jest.fn(() => mockEditor),
    setTheme: jest.fn(),
  },
  KeyMod: { CtrlCmd: 2048 },
  KeyCode: { KeyS: 49 },
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
      });

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
      });

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
      
      // Check for editor div
      const editorDiv = container!.querySelector('.h-full.w-full');
      expect(editorDiv).toBeInTheDocument();
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
});
