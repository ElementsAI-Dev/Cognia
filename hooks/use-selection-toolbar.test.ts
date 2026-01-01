/**
 * useSelectionToolbar Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSelectionToolbar } from './use-selection-toolbar';

// Mock dependencies
jest.mock('@/stores/selection-store', () => ({
  useSelectionStore: jest.fn(() => ({
    config: {
      enabled: true,
      defaultActions: ['explain', 'translate', 'summarize'],
    },
    setSelectedText: jest.fn(),
    setToolbarPosition: jest.fn(),
    clearSelection: jest.fn(),
  })),
}));

jest.mock('@/stores/settings-store', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: { apiKey: 'test-key' },
      },
    };
    return selector(state);
  }),
}));

jest.mock('@/lib/ai/generation/use-ai-chat', () => ({
  useAIChat: jest.fn(() => ({
    messages: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    cancel: jest.fn(),
    clearMessages: jest.fn(),
  })),
}));

jest.mock('@/types', () => ({
  getLanguageName: jest.fn((code: string) => {
    const names: Record<string, string> = {
      'zh-CN': 'Chinese',
      'en': 'English',
    };
    return names[code] || code;
  }),
}));

describe('useSelectionToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(result.current.state.isVisible).toBe(false);
    expect(result.current.state.selectedText).toBe('');
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.activeAction).toBeNull();
    expect(result.current.state.result).toBeNull();
  });

  it('should provide showToolbar function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.showToolbar).toBe('function');
  });

  it('should provide hideToolbar function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.hideToolbar).toBe('function');
  });

  it('should provide executeAction function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.executeAction).toBe('function');
  });

  it('should provide clearResult function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.clearResult).toBe('function');
  });

  it('should show toolbar with selection', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Hello world', { x: 100, y: 200 });
    });

    expect(result.current.state.isVisible).toBe(true);
    expect(result.current.state.selectedText).toBe('Hello world');
    expect(result.current.state.position).toEqual({ x: 100, y: 200 });
  });

  it('should hide toolbar', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    // Show first
    act(() => {
      result.current.showToolbar('Test text', { x: 50, y: 50 });
    });

    expect(result.current.state.isVisible).toBe(true);

    // Hide
    act(() => {
      result.current.hideToolbar();
    });

    expect(result.current.state.isVisible).toBe(false);
  });

  it('should clear result', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.clearResult();
    });

    expect(result.current.state.result).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('should handle copy action', async () => {
    // Mock clipboard
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Copy this text', { x: 0, y: 0 });
    });

    await act(async () => {
      await result.current.executeAction('copy');
    });

    expect(mockWriteText).toHaveBeenCalledWith('Copy this text');
  });

  it('should set active action during execution', async () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.showToolbar('Text to explain', { x: 0, y: 0 });
    });

    // Start action (don't await to check active state)
    act(() => {
      result.current.executeAction('explain');
    });

    // Action should be set
    expect(result.current.state.activeAction).toBe('explain');
  });

  it('should provide setSelectionMode function', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(typeof result.current.setSelectionMode).toBe('function');

    act(() => {
      result.current.setSelectionMode('manual');
    });

    expect(result.current.state.selectionMode).toBe('manual');
  });

  it('should toggle multi-select mode', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(result.current.state.isMultiSelectMode).toBe(false);

    act(() => {
      result.current.toggleMultiSelect();
    });

    expect(result.current.state.isMultiSelectMode).toBe(true);

    act(() => {
      result.current.toggleMultiSelect();
    });

    expect(result.current.state.isMultiSelectMode).toBe(false);
  });

  it('should add selection in multi-select mode', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.toggleMultiSelect();
    });

    act(() => {
      result.current.addSelection({
        text: 'Selection 1',
        position: { x: 10, y: 10 },
      });
    });

    expect(result.current.state.selections).toHaveLength(1);

    act(() => {
      result.current.addSelection({
        text: 'Selection 2',
        position: { x: 20, y: 20 },
      });
    });

    expect(result.current.state.selections).toHaveLength(2);
  });

  it('should clear all selections', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    act(() => {
      result.current.toggleMultiSelect();
      result.current.addSelection({ text: 'Test', position: { x: 0, y: 0 } });
    });

    expect(result.current.state.selections.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearSelections();
    });

    expect(result.current.state.selections).toHaveLength(0);
  });

  it('should toggle more menu', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(result.current.state.showMoreMenu).toBe(false);

    act(() => {
      result.current.toggleMoreMenu();
    });

    expect(result.current.state.showMoreMenu).toBe(true);
  });

  it('should provide config from store', () => {
    const { result } = renderHook(() => useSelectionToolbar());

    expect(result.current.config).toBeDefined();
    expect(result.current.config.enabled).toBe(true);
  });
});
