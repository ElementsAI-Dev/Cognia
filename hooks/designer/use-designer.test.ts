/**
 * useDesigner Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useDesigner } from './use-designer';

const mockUpdateCode = jest.fn();
const mockExecuteAIEdit = jest.fn();
const mockClearAIError = jest.fn();
const mockUndo = jest.fn();
const mockRedo = jest.fn();

jest.mock('./use-designer-session', () => ({
  useDesignerSession: () => ({
    code: '<div>Session Code</div>',
    history: [
      { id: 'h1', previousCode: '<div>Start</div>', newCode: '<div>Session Code</div>', action: 'Code change', timestamp: new Date() },
    ],
    historyIndex: 0,
    canUndo: true,
    canRedo: false,
    isAIProcessing: false,
    aiError: null,
    updateCode: mockUpdateCode,
    executeAIEdit: mockExecuteAIEdit,
    clearAIError: mockClearAIError,
    undo: mockUndo,
    redo: mockRedo,
  }),
}));

jest.mock('./use-designer-ai-config', () => ({
  useDesignerAIConfig: () => ({
    getConfig: jest.fn(() => ({ provider: 'openai', model: 'gpt-4o' })),
    provider: 'openai',
    hasApiKey: true,
  }),
}));

jest.mock('@/lib/designer', () => ({
  generateDesignerComponent: jest.fn().mockResolvedValue({ success: true, code: '<div>Generated</div>' }),
  getDefaultTemplate: jest.fn(() => ({ code: '<div>Default</div>' })),
}));

const mockSetMode = jest.fn();
const mockSetViewport = jest.fn();
const mockSetZoom = jest.fn();
const mockToggleElementTree = jest.fn();
const mockToggleStylePanel = jest.fn();

jest.mock('@/stores', () => ({
  useDesignerStore: jest.fn((selector) => {
    const state = {
      mode: 'preview',
      setMode: mockSetMode,
      viewport: 'desktop',
      setViewport: mockSetViewport,
      zoom: 100,
      setZoom: mockSetZoom,
      showElementTree: false,
      toggleElementTree: mockToggleElementTree,
      showStylePanel: false,
      toggleStylePanel: mockToggleStylePanel,
      isDirty: false,
    };
    return selector(state);
  }),
}));

describe('useDesigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes code and legacy history shape', () => {
    const { result } = renderHook(() => useDesigner());

    expect(result.current.code).toBe('<div>Session Code</div>');
    expect(result.current.history).toEqual(['<div>Start</div>', '<div>Session Code</div>']);
    expect(result.current.historyIndex).toBe(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('setCode proxies to unified session updateCode', () => {
    const { result } = renderHook(() => useDesigner());

    act(() => {
      result.current.setCode('<div>Next</div>');
    });

    expect(mockUpdateCode).toHaveBeenCalledWith('<div>Next</div>', {
      addToHistory: true,
      parseMode: 'debounced',
    });
  });

  it('addToHistory proxies to session with no parse', () => {
    const { result } = renderHook(() => useDesigner());

    act(() => {
      result.current.addToHistory('<div>Manual</div>');
    });

    expect(mockUpdateCode).toHaveBeenCalledWith('<div>Manual</div>', {
      addToHistory: true,
      parseMode: 'none',
    });
  });

  it('executeAIEdit uses aiPrompt and session execute method', async () => {
    mockExecuteAIEdit.mockResolvedValue('<div>AI</div>');
    const { result } = renderHook(() => useDesigner());

    act(() => {
      result.current.setAIPrompt('Improve layout');
    });

    await act(async () => {
      const out = await result.current.executeAIEdit();
      expect(out).toEqual({ success: true, code: '<div>AI</div>' });
    });

    expect(mockExecuteAIEdit).toHaveBeenCalledWith('Improve layout');
  });

  it('exposes designer store state and actions', () => {
    const { result } = renderHook(() => useDesigner());

    expect(result.current.mode).toBe('preview');
    expect(result.current.viewport).toBe('desktop');
    expect(result.current.zoom).toBe(100);
    expect(result.current.showElementTree).toBe(false);
    expect(result.current.showStylePanel).toBe(false);

    act(() => {
      result.current.setMode('code');
      result.current.setViewport('mobile');
      result.current.setZoom(120);
      result.current.toggleElementTree();
      result.current.toggleStylePanel();
    });

    expect(mockSetMode).toHaveBeenCalledWith('code');
    expect(mockSetViewport).toHaveBeenCalledWith('mobile');
    expect(mockSetZoom).toHaveBeenCalledWith(120);
    expect(mockToggleElementTree).toHaveBeenCalled();
    expect(mockToggleStylePanel).toHaveBeenCalled();
  });
});
