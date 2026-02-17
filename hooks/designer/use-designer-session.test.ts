/**
 * useDesignerSession tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useDesignerSession } from './use-designer-session';

const mockSetFramework = jest.fn();
const mockSetCode = jest.fn();
const mockParseCodeToElements = jest.fn();
const mockRestoreCodeAndParse = jest.fn();
const mockUndo = jest.fn();
const mockRedo = jest.fn();
const mockExecuteDesignerAIEdit = jest.fn();
const mockGetConfig = jest.fn(() => ({ provider: 'openai', model: 'gpt-4o-mini', apiKey: 'test-key' }));

let storeState: {
  code: string;
  framework: 'react' | 'vue' | 'html';
  history: Array<{ id: string; action: string; previousCode: string; newCode: string; timestamp: Date }>;
  historyIndex: number;
  setFramework: typeof mockSetFramework;
  setCode: typeof mockSetCode;
  parseCodeToElements: typeof mockParseCodeToElements;
  restoreCodeAndParse: typeof mockRestoreCodeAndParse;
  undo: typeof mockUndo;
  redo: typeof mockRedo;
};

jest.mock('@/stores/designer', () => ({
  useDesignerStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

jest.mock('@/hooks/utils/use-debounce', () => ({
  useDebouncedCallback: (fn: (value: unknown) => void) => fn,
}));

jest.mock('./use-designer-ai-config', () => ({
  useDesignerAIConfig: () => ({
    getConfig: mockGetConfig,
    provider: 'openai',
    hasApiKey: true,
  }),
}));

jest.mock('@/lib/designer', () => ({
  executeDesignerAIEdit: (...args: unknown[]) => mockExecuteDesignerAIEdit(...args),
}));

describe('useDesignerSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeState = {
      code: '<div>initial</div>',
      framework: 'react',
      history: [],
      historyIndex: -1,
      setFramework: mockSetFramework.mockImplementation((framework: 'react' | 'vue' | 'html') => {
        storeState.framework = framework;
      }),
      setCode: mockSetCode.mockImplementation((code: string) => {
        storeState.code = code;
      }),
      parseCodeToElements: mockParseCodeToElements.mockResolvedValue(undefined),
      restoreCodeAndParse: mockRestoreCodeAndParse.mockResolvedValue(undefined),
      undo: mockUndo,
      redo: mockRedo,
    };
  });

  it('applies initial framework when provided', async () => {
    renderHook(() => useDesignerSession({ framework: 'vue' }));

    await waitFor(() => {
      expect(mockSetFramework).toHaveBeenCalledWith('vue');
    });
  });

  it('restores initial code once and notifies onCodeChange', async () => {
    const onCodeChange = jest.fn();
    renderHook(() => useDesignerSession({ initialCode: '<div>boot</div>', onCodeChange }));

    await waitFor(() => {
      expect(mockRestoreCodeAndParse).toHaveBeenCalledWith('<div>boot</div>');
      expect(onCodeChange).toHaveBeenCalledWith('<div>boot</div>');
    });
  });

  it('updateCode supports immediate parse mode', () => {
    const { result } = renderHook(() => useDesignerSession());

    act(() => {
      result.current.updateCode('<div>next</div>', { addToHistory: false, parseMode: 'immediate' });
    });

    expect(mockSetCode).toHaveBeenCalledWith('<div>next</div>', false);
    expect(mockParseCodeToElements).toHaveBeenCalledWith('<div>next</div>');
  });

  it('updateCode defaults to history add and debounced parse', () => {
    const { result } = renderHook(() => useDesignerSession());

    act(() => {
      result.current.updateCode('<div>debounced</div>');
    });

    expect(mockSetCode).toHaveBeenCalledWith('<div>debounced</div>', true);
    expect(mockParseCodeToElements).toHaveBeenCalledWith('<div>debounced</div>');
  });

  it('updateCode with parseMode none skips parsing', () => {
    const { result } = renderHook(() => useDesignerSession());

    act(() => {
      result.current.updateCode('<div>no-parse</div>', { parseMode: 'none' });
    });

    expect(mockSetCode).toHaveBeenCalledWith('<div>no-parse</div>', true);
    expect(mockParseCodeToElements).not.toHaveBeenCalled();
  });

  it('restoreHistoryEntry routes through restoreCodeAndParse and onCodeChange', async () => {
    const onCodeChange = jest.fn();
    const { result } = renderHook(() => useDesignerSession({ onCodeChange }));
    const entry = {
      id: 'h1',
      action: 'restore',
      previousCode: '<div>a</div>',
      newCode: '<div>b</div>',
      timestamp: new Date(),
    };

    act(() => {
      result.current.restoreHistoryEntry(entry);
    });

    await waitFor(() => {
      expect(mockRestoreCodeAndParse).toHaveBeenCalledWith('<div>b</div>');
      expect(onCodeChange).toHaveBeenCalledWith('<div>b</div>');
    });
  });

  it('executeAIEdit supports custom onAIRequest', async () => {
    const onAIRequest = jest.fn().mockResolvedValue('<div>ai-custom</div>');
    const { result } = renderHook(() => useDesignerSession({ onAIRequest }));

    await act(async () => {
      const out = await result.current.executeAIEdit('refine');
      expect(out).toBe('<div>ai-custom</div>');
    });

    expect(onAIRequest).toHaveBeenCalledWith('refine', '<div>initial</div>');
    expect(mockSetCode).toHaveBeenCalledWith('<div>ai-custom</div>', true);
    expect(mockParseCodeToElements).toHaveBeenCalledWith('<div>ai-custom</div>');
  });

  it('executeAIEdit falls back to designer AI api and records errors', async () => {
    mockExecuteDesignerAIEdit.mockResolvedValueOnce({ success: false, error: 'AI failed' });
    const { result } = renderHook(() => useDesignerSession());

    await act(async () => {
      const out = await result.current.executeAIEdit('refine');
      expect(out).toBeNull();
    });

    expect(result.current.aiError).toBe('AI failed');
    act(() => {
      result.current.clearAIError();
    });
    expect(result.current.aiError).toBeNull();
  });

  it('exposes undo/redo availability from history index', () => {
    storeState.history = [
      { id: 'h1', action: 'Code change', previousCode: '<div>a</div>', newCode: '<div>b</div>', timestamp: new Date() },
      { id: 'h2', action: 'Code change', previousCode: '<div>b</div>', newCode: '<div>c</div>', timestamp: new Date() },
    ];
    storeState.historyIndex = 0;

    const { result } = renderHook(() => useDesignerSession());

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.undo();
      result.current.redo();
    });
    expect(mockUndo).toHaveBeenCalled();
    expect(mockRedo).toHaveBeenCalled();
  });
});

