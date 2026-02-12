/**
 * @jest-environment jsdom
 */

/**
 * Tests for usePresetForm hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePresetForm } from './use-preset-form';
import type { Preset } from '@/types/content/preset';

// Mock stores
const mockCreatePreset = jest.fn((input) => ({ ...input, id: 'new-id' }));
const mockUpdatePreset = jest.fn();
const mockInitializeDefaults = jest.fn();
const mockRecordUsage = jest.fn();

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: unknown) => unknown) => {
    const state = {
      createPreset: mockCreatePreset,
      updatePreset: mockUpdatePreset,
    };
    return selector(state);
  },
  usePromptTemplateStore: (selector: (state: unknown) => unknown) => {
    const state = {
      initializeDefaults: mockInitializeDefaults,
      recordUsage: mockRecordUsage,
    };
    return selector(state);
  },
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'mock-nanoid',
}));

describe('usePresetForm', () => {
  const defaultOptions = {
    editPreset: null,
    open: true,
    onSuccess: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default form state', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    expect(result.current.form.name).toBe('');
    expect(result.current.form.provider).toBe('auto');
    expect(result.current.form.model).toBe('gpt-4o');
    expect(result.current.form.mode).toBe('chat');
    expect(result.current.form.temperature).toBe(0.7);
    expect(result.current.form.builtinPrompts).toEqual([]);
  });

  it('updates a single field via updateField', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.updateField('name', 'My Preset');
    });

    expect(result.current.form.name).toBe('My Preset');
  });

  it('adds a builtin prompt', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.addBuiltinPrompt();
    });

    expect(result.current.form.builtinPrompts).toHaveLength(1);
    expect(result.current.form.builtinPrompts[0].id).toBe('mock-nanoid');
    expect(result.current.form.builtinPrompts[0].name).toBe('');
  });

  it('updates a builtin prompt', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.addBuiltinPrompt();
    });

    const promptId = result.current.form.builtinPrompts[0].id;

    act(() => {
      result.current.updateBuiltinPrompt(promptId, { name: 'Updated' });
    });

    expect(result.current.form.builtinPrompts[0].name).toBe('Updated');
  });

  it('removes a builtin prompt', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.addBuiltinPrompt();
    });

    const promptId = result.current.form.builtinPrompts[0].id;

    act(() => {
      result.current.removeBuiltinPrompt(promptId);
    });

    expect(result.current.form.builtinPrompts).toHaveLength(0);
  });

  it('applies an optimized prompt', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.applyOptimizedPrompt('Optimized system prompt');
    });

    expect(result.current.form.systemPrompt).toBe('Optimized system prompt');
  });

  it('applies generated builtin prompts (appends)', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.addBuiltinPrompt();
    });

    act(() => {
      result.current.applyGeneratedBuiltinPrompts([
        { name: 'AI Prompt', content: 'Do something' },
      ]);
    });

    expect(result.current.form.builtinPrompts).toHaveLength(2);
  });

  it('applies a generated preset', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.applyGeneratedPreset({
        name: 'AI Preset',
        description: 'Generated',
        mode: 'agent',
        temperature: 0.5,
      });
    });

    expect(result.current.form.name).toBe('AI Preset');
    expect(result.current.form.mode).toBe('agent');
    expect(result.current.form.temperature).toBe(0.5);
  });

  it('applies a prompt template and records usage', () => {
    const { result } = renderHook(() => usePresetForm(defaultOptions));

    act(() => {
      result.current.handleApplyTemplate({
        id: 'tpl-1',
        content: 'Template content',
        name: 'T',
        description: '',
        category: 'general',
        tags: [],
        variables: [],
        source: 'builtin',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    expect(result.current.form.systemPrompt).toBe('Template content');
    expect(mockRecordUsage).toHaveBeenCalledWith('tpl-1');
    expect(result.current.isTemplateSelectorOpen).toBe(false);
  });

  // --- handleSubmit ---

  describe('handleSubmit', () => {
    it('returns error when name is empty', () => {
      const { result } = renderHook(() => usePresetForm(defaultOptions));

      let submitResult: { valid: boolean; error?: string };
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult!.valid).toBe(false);
      expect(submitResult!.error).toBe('nameRequired');
    });

    it('returns error when model is empty', () => {
      const { result } = renderHook(() => usePresetForm(defaultOptions));

      act(() => {
        result.current.updateField('name', 'Test');
        result.current.updateField('model', '');
      });

      let submitResult: { valid: boolean; error?: string };
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult!.valid).toBe(false);
      expect(submitResult!.error).toBe('modelRequired');
    });

    it('creates a new preset on submit (no editPreset)', () => {
      const onClose = jest.fn();
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        usePresetForm({ ...defaultOptions, onClose, onSuccess }),
      );

      act(() => {
        result.current.updateField('name', 'New Preset');
      });

      let submitResult: { valid: boolean; error?: string };
      act(() => {
        submitResult = result.current.handleSubmit();
      });

      expect(submitResult!.valid).toBe(true);
      expect(mockCreatePreset).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('updates existing preset on submit (with editPreset)', async () => {
      const editPreset = {
        id: 'edit-1',
        name: 'Old Name',
        provider: 'openai',
        model: 'gpt-4o',
        mode: 'chat',
        temperature: 0.7,
      } as Preset;

      const onClose = jest.fn();
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        usePresetForm({ editPreset, open: true, onClose, onSuccess }),
      );

      // Wait for effect to populate form
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      act(() => {
        result.current.updateField('name', 'Updated Name');
      });

      act(() => {
        result.current.handleSubmit();
      });

      expect(mockUpdatePreset).toHaveBeenCalledWith('edit-1', expect.objectContaining({
        name: 'Updated Name',
      }));
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
