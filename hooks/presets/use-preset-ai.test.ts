/**
 * @jest-environment jsdom
 */

/**
 * Tests for usePresetAI hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePresetAI } from './use-preset-ai';

// Mock dependencies
const mockProviderSettings = {
  openai: { apiKey: 'sk-test-key', baseURL: 'https://api.openai.com' },
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = { providerSettings: mockProviderSettings };
    return selector(state);
  },
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    error: jest.fn(),
    warning: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    ui: { error: jest.fn() },
  },
}));

const mockGeneratePreset = jest.fn();
const mockOptimizePrompt = jest.fn();
const mockGenerateBuiltinPrompts = jest.fn();

jest.mock('@/lib/ai/presets', () => ({
  generatePresetFromDescription: (...args: unknown[]) => mockGeneratePreset(...args),
  optimizePresetPrompt: (...args: unknown[]) => mockOptimizePrompt(...args),
  generateBuiltinPrompts: (...args: unknown[]) => mockGenerateBuiltinPrompts(...args),
}));

const mockGetPresetAIConfig = jest.fn().mockImplementation(
  (settings: Record<string, { apiKey?: string } | undefined>) => {
    const openai = settings['openai'];
    if (openai?.apiKey) {
      return { provider: 'openai', apiKey: openai.apiKey, baseURL: 'https://api.openai.com' };
    }
    return null;
  },
);

jest.mock('@/lib/presets', () => ({
  getPresetAIConfig: (...args: unknown[]) => mockGetPresetAIConfig(...args),
}));

describe('usePresetAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns correct initial loading states', () => {
      const { result } = renderHook(() => usePresetAI());
      expect(result.current.isGeneratingPreset).toBe(false);
      expect(result.current.isOptimizingPrompt).toBe(false);
      expect(result.current.isGeneratingPrompts).toBe(false);
    });

    it('returns handler functions', () => {
      const { result } = renderHook(() => usePresetAI());
      expect(typeof result.current.handleGeneratePreset).toBe('function');
      expect(typeof result.current.handleOptimizePrompt).toBe('function');
      expect(typeof result.current.handleGenerateBuiltinPrompts).toBe('function');
    });
  });

  describe('handleGeneratePreset', () => {
    it('calls generatePresetFromDescription on success', async () => {
      const mockPreset = { name: 'Test', description: 'Desc', icon: '💬', color: '#333' };
      mockGeneratePreset.mockResolvedValue({ success: true, preset: mockPreset });
      const onGenerateSuccess = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onGenerateSuccess }));

      await act(async () => {
        await result.current.handleGeneratePreset('a coding assistant');
      });

      expect(mockGeneratePreset).toHaveBeenCalledTimes(1);
      expect(mockGeneratePreset).toHaveBeenCalledWith('a coding assistant', expect.objectContaining({ provider: 'openai' }));
      expect(onGenerateSuccess).toHaveBeenCalledWith(mockPreset);
      expect(result.current.isGeneratingPreset).toBe(false);
    });

    it('skips empty descriptions', async () => {
      const { result } = renderHook(() => usePresetAI());

      await act(async () => {
        await result.current.handleGeneratePreset('  ');
      });

      expect(mockGeneratePreset).not.toHaveBeenCalled();
    });

    it('calls onError on failure result', async () => {
      mockGeneratePreset.mockResolvedValue({ success: false, error: 'Generation failed' });
      const onError = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleGeneratePreset('test');
      });

      expect(onError).toHaveBeenCalledWith('Generation failed');
    });

    it('calls onError on exception', async () => {
      mockGeneratePreset.mockRejectedValue(new Error('Network error'));
      const onError = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleGeneratePreset('test');
      });

      expect(onError).toHaveBeenCalledWith('Failed to generate preset');
      expect(result.current.isGeneratingPreset).toBe(false);
    });
  });

  describe('handleOptimizePrompt', () => {
    it('calls optimizePresetPrompt on success', async () => {
      mockOptimizePrompt.mockResolvedValue({ success: true, optimizedPrompt: 'Better prompt' });
      const onOptimizeSuccess = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onOptimizeSuccess }));

      await act(async () => {
        await result.current.handleOptimizePrompt('old prompt');
      });

      expect(mockOptimizePrompt).toHaveBeenCalledTimes(1);
      expect(onOptimizeSuccess).toHaveBeenCalledWith('Better prompt');
      expect(result.current.isOptimizingPrompt).toBe(false);
    });

    it('skips empty prompts', async () => {
      const { result } = renderHook(() => usePresetAI());

      await act(async () => {
        await result.current.handleOptimizePrompt('');
      });

      expect(mockOptimizePrompt).not.toHaveBeenCalled();
    });

    it('calls onError on failure', async () => {
      mockOptimizePrompt.mockResolvedValue({ success: false, error: 'Optimize failed' });
      const onError = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleOptimizePrompt('test prompt');
      });

      expect(onError).toHaveBeenCalledWith('Optimize failed');
    });

    it('calls onError on exception', async () => {
      mockOptimizePrompt.mockRejectedValue(new Error('Network error'));
      const onError = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleOptimizePrompt('test prompt');
      });

      expect(onError).toHaveBeenCalledWith('Failed to optimize prompt');
      expect(result.current.isOptimizingPrompt).toBe(false);
    });
  });

  describe('handleGenerateBuiltinPrompts', () => {
    it('calls generateBuiltinPrompts on success', async () => {
      const mockPrompts = [
        { name: 'Prompt 1', content: 'Content 1', description: 'Desc 1' },
        { name: 'Prompt 2', content: 'Content 2', description: 'Desc 2' },
      ];
      mockGenerateBuiltinPrompts.mockResolvedValue({ success: true, prompts: mockPrompts });
      const onGeneratePromptsSuccess = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onGeneratePromptsSuccess }));

      await act(async () => {
        await result.current.handleGenerateBuiltinPrompts(
          'Coding Assistant',
          'A helper for coding',
          'You are a coder',
          [],
        );
      });

      expect(mockGenerateBuiltinPrompts).toHaveBeenCalledTimes(1);
      expect(onGeneratePromptsSuccess).toHaveBeenCalledWith(mockPrompts);
      expect(result.current.isGeneratingPrompts).toBe(false);
    });

    it('skips empty name', async () => {
      const { result } = renderHook(() => usePresetAI());

      await act(async () => {
        await result.current.handleGenerateBuiltinPrompts('', undefined, undefined, []);
      });

      expect(mockGenerateBuiltinPrompts).not.toHaveBeenCalled();
    });

    it('passes count parameter', async () => {
      mockGenerateBuiltinPrompts.mockResolvedValue({ success: true, prompts: [] });

      const { result } = renderHook(() => usePresetAI());

      await act(async () => {
        await result.current.handleGenerateBuiltinPrompts(
          'Test',
          undefined,
          undefined,
          [],
          undefined,
          5,
        );
      });

      expect(mockGenerateBuiltinPrompts).toHaveBeenCalledWith(
        'Test', undefined, undefined, [],
        expect.objectContaining({ provider: 'openai' }),
        5,
      );
    });

    it('calls onError on failure', async () => {
      mockGenerateBuiltinPrompts.mockResolvedValue({ success: false, error: 'Prompt gen failed' });
      const onError = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleGenerateBuiltinPrompts('Test', undefined, undefined, []);
      });

      expect(onError).toHaveBeenCalledWith('Prompt gen failed');
    });

    it('calls onError on exception', async () => {
      mockGenerateBuiltinPrompts.mockRejectedValue(new Error('Network error'));
      const onError = jest.fn();

      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleGenerateBuiltinPrompts('Test', undefined, undefined, []);
      });

      expect(onError).toHaveBeenCalledWith('Failed to generate prompts');
      expect(result.current.isGeneratingPrompts).toBe(false);
    });
  });

  describe('no API key', () => {
    it('calls onError with noApiKey when no config available', async () => {
      mockGetPresetAIConfig.mockReturnValueOnce(null);

      const onError = jest.fn();
      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleGeneratePreset('test');
      });

      expect(onError).toHaveBeenCalledWith('noApiKey');
      expect(mockGeneratePreset).not.toHaveBeenCalled();
    });

    it('calls onError with noApiKey for optimize when no config', async () => {
      mockGetPresetAIConfig.mockReturnValueOnce(null);

      const onError = jest.fn();
      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleOptimizePrompt('test prompt');
      });

      expect(onError).toHaveBeenCalledWith('noApiKey');
      expect(mockOptimizePrompt).not.toHaveBeenCalled();
    });

    it('calls onError with noApiKey for builtin prompts when no config', async () => {
      mockGetPresetAIConfig.mockReturnValueOnce(null);

      const onError = jest.fn();
      const { result } = renderHook(() => usePresetAI({ onError }));

      await act(async () => {
        await result.current.handleGenerateBuiltinPrompts('Test', undefined, undefined, []);
      });

      expect(onError).toHaveBeenCalledWith('noApiKey');
      expect(mockGenerateBuiltinPrompts).not.toHaveBeenCalled();
    });
  });
});
