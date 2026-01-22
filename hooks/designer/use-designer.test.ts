/**
 * useDesigner Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useDesigner } from './use-designer';

// Mock dependencies
jest.mock('@/stores', () => ({
  useDesignerStore: jest.fn((selector) => {
    const state = {
      mode: 'preview' as const,
      setMode: jest.fn(),
      viewport: 'desktop' as const,
      setViewport: jest.fn(),
      zoom: 100,
      setZoom: jest.fn(),
      showElementTree: false,
      toggleElementTree: jest.fn(),
      showStylePanel: false,
      toggleStylePanel: jest.fn(),
    };
    return selector(state);
  }),
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {},
      defaultProvider: 'openai',
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/designer', () => ({
  executeDesignerAIEdit: jest.fn().mockResolvedValue({ success: true, code: '<div>Edited</div>' }),
  generateDesignerComponent: jest
    .fn()
    .mockResolvedValue({ success: true, code: '<div>Generated</div>' }),
  getDesignerAIConfig: jest.fn().mockReturnValue({ model: 'gpt-4o' }),
  getDefaultTemplate: jest
    .fn()
    .mockReturnValue({ code: '<div>Default Template</div>', name: 'Blank' }),
}));

import { executeDesignerAIEdit, generateDesignerComponent } from '@/lib/designer';

const mockExecuteAIEdit = executeDesignerAIEdit as jest.MockedFunction<
  typeof executeDesignerAIEdit
>;
const mockGenerateComponent = generateDesignerComponent as jest.MockedFunction<
  typeof generateDesignerComponent
>;

describe('useDesigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default template', () => {
    const { result } = renderHook(() => useDesigner());

    expect(result.current.code).toBe('<div>Default Template</div>');
    expect(result.current.isDirty).toBe(false);
  });

  it('should initialize with provided code', () => {
    const { result } = renderHook(() => useDesigner({ initialCode: '<div>Custom Code</div>' }));

    expect(result.current.code).toBe('<div>Custom Code</div>');
  });

  it('should set code and mark as dirty', () => {
    const onCodeChange = jest.fn();
    const { result } = renderHook(() => useDesigner({ onCodeChange }));

    act(() => {
      result.current.setCode('<div>New Code</div>');
    });

    expect(result.current.code).toBe('<div>New Code</div>');
    expect(result.current.isDirty).toBe(true);
    expect(onCodeChange).toHaveBeenCalledWith('<div>New Code</div>');
  });

  it('should track history', () => {
    const { result } = renderHook(() => useDesigner());

    expect(result.current.history.length).toBe(1);
    expect(result.current.historyIndex).toBe(0);

    act(() => {
      result.current.setCode('<div>Change 1</div>');
    });

    expect(result.current.history.length).toBe(2);
    expect(result.current.historyIndex).toBe(1);
  });

  it('should undo and redo', () => {
    const { result } = renderHook(() => useDesigner());

    act(() => {
      result.current.setCode('<div>Change 1</div>');
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.code).toBe('<div>Default Template</div>');
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.code).toBe('<div>Change 1</div>');
  });

  it('should execute AI edit', async () => {
    mockExecuteAIEdit.mockResolvedValueOnce({
      success: true,
      code: '<div>AI Edited</div>',
      error: undefined,
    });

    const { result } = renderHook(() => useDesigner());

    act(() => {
      result.current.setAIPrompt('Make it blue');
    });

    let aiResult;
    await act(async () => {
      aiResult = await result.current.executeAIEdit();
    });

    expect(aiResult).toBeDefined();
  });

  it('should generate component from prompt', async () => {
    mockGenerateComponent.mockResolvedValueOnce({
      success: true,
      code: '<div>Generated Component</div>',
      error: undefined,
    });

    const { result } = renderHook(() => useDesigner());

    let genResult;
    await act(async () => {
      genResult = await result.current.generateFromPrompt('Create a button');
    });

    expect(genResult).toBeDefined();
  });

  it('should handle AI edit errors', async () => {
    mockExecuteAIEdit.mockResolvedValueOnce({
      success: false,
      error: 'AI edit failed',
      code: undefined,
    });

    const { result } = renderHook(() => useDesigner());

    act(() => {
      result.current.setAIPrompt('Invalid request');
    });

    await act(async () => {
      await result.current.executeAIEdit();
    });

    expect(result.current.aiError).toBe('AI edit failed');
  });

  it('should clear AI error', () => {
    const { result } = renderHook(() => useDesigner());

    // Just verify clearAIError function exists and can be called
    act(() => {
      result.current.clearAIError();
    });

    expect(result.current.aiError).toBeNull();
  });

  it('should expose designer store state', () => {
    const { result } = renderHook(() => useDesigner());

    expect(result.current.mode).toBe('preview');
    expect(result.current.viewport).toBe('desktop');
    expect(result.current.zoom).toBe(100);
    expect(result.current.showElementTree).toBe(false);
    expect(result.current.showStylePanel).toBe(false);
  });

  it('should expose designer store actions', () => {
    const { result } = renderHook(() => useDesigner());

    expect(typeof result.current.setMode).toBe('function');
    expect(typeof result.current.setViewport).toBe('function');
    expect(typeof result.current.setZoom).toBe('function');
    expect(typeof result.current.toggleElementTree).toBe('function');
    expect(typeof result.current.toggleStylePanel).toBe('function');
  });

  it('should add to history manually', () => {
    const { result } = renderHook(() => useDesigner());

    const initialLength = result.current.history.length;

    act(() => {
      result.current.addToHistory('<div>Manual Entry</div>');
    });

    expect(result.current.history.length).toBe(initialLength + 1);
  });
});
