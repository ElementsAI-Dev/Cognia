/**
 * @jest-environment jsdom
 */

/**
 * Tests for usePresetManager hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePresetManager } from './use-preset-manager';
import type { Preset } from '@/types/content/preset';

// Mock data
const mockPresets: Preset[] = [
  {
    id: 'p1',
    name: 'Preset 1',
    description: 'First',
    icon: '💬',
    color: '#6366f1',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: '',
    temperature: 0.7,
    webSearchEnabled: false,
    thinkingEnabled: false,
    isFavorite: false,
    isDefault: true,
    usageCount: 5,
    sortOrder: 0,
    category: 'general',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Preset,
  {
    id: 'p2',
    name: 'Preset 2',
    description: 'Second',
    icon: '🔥',
    color: '#ef4444',
    provider: 'anthropic',
    model: 'claude-3',
    mode: 'agent',
    systemPrompt: '',
    temperature: 0.5,
    webSearchEnabled: false,
    thinkingEnabled: false,
    isFavorite: false,
    isDefault: false,
    usageCount: 0,
    sortOrder: 1,
    category: 'coding',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Preset,
];

const mockSelectPreset = jest.fn();
const mockApplyPreset = jest.fn();
const mockDeletePreset = jest.fn();
const mockDuplicatePreset = jest.fn();
const mockSetDefaultPreset = jest.fn();
const mockResetToDefaults = jest.fn();
const mockSearchPresets = jest.fn((query: string) =>
  mockPresets.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
);
const mockCreatePreset = jest.fn((input) => ({ ...input, id: 'new-id' }));
const mockToggleFavorite = jest.fn();

jest.mock('@/stores', () => ({
  usePresetStore: Object.assign(
    (selector: (state: unknown) => unknown) => {
      const state = {
        presets: mockPresets,
        selectedPresetId: 'p1',
        selectPreset: mockSelectPreset,
        usePreset: mockApplyPreset,
        deletePreset: mockDeletePreset,
        duplicatePreset: mockDuplicatePreset,
        setDefaultPreset: mockSetDefaultPreset,
        resetToDefaults: mockResetToDefaults,
        searchPresets: mockSearchPresets,
        createPreset: mockCreatePreset,
        toggleFavorite: mockToggleFavorite,
      };
      return selector(state);
    },
    {
      getState: () => ({
        toggleFavorite: mockToggleFavorite,
      }),
    },
  ),
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'sk-test', enabled: true },
      },
    };
    return selector(state);
  },
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    ui: { error: jest.fn() },
  },
}));

const mockExportPresetsToFile = jest.fn();
const mockParsePresetImportFile = jest.fn();
const mockGetPresetAIConfig = jest.fn();

jest.mock('@/lib/presets', () => ({
  exportPresetsToFile: (...args: unknown[]) => mockExportPresetsToFile(...args),
  parsePresetImportFile: (...args: unknown[]) => mockParsePresetImportFile(...args),
  getPresetAIConfig: (...args: unknown[]) => mockGetPresetAIConfig(...args),
}));

const mockGeneratePreset = jest.fn();

jest.mock('@/lib/ai/presets', () => ({
  generatePresetFromDescription: (...args: unknown[]) => mockGeneratePreset(...args),
}));

jest.mock('nanoid', () => ({
  nanoid: () => 'mock-nanoid',
}));

const mockT = jest.fn((key: string) => key);

describe('usePresetManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    expect(result.current.search).toBe('');
    expect(result.current.createDialogOpen).toBe(false);
    expect(result.current.editPreset).toBeNull();
    expect(result.current.deletePreset).toBeNull();
    expect(result.current.showResetDialog).toBe(false);
    expect(result.current.aiDescription).toBe('');
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.categoryFilter).toBe('all');
    expect(result.current.filteredPresets).toEqual(mockPresets);
  });

  it('filters presets by search', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.setSearch('Preset 1');
    });

    expect(mockSearchPresets).toHaveBeenCalledWith('Preset 1');
  });

  it('filters presets by category', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.setCategoryFilter('coding');
    });

    expect(result.current.filteredPresets).toHaveLength(1);
    expect(result.current.filteredPresets[0].id).toBe('p2');
  });

  it('handleSelect calls store actions and optional callback', () => {
    const onSelectPreset = jest.fn();
    const { result } = renderHook(() =>
      usePresetManager({ onSelectPreset, t: mockT }),
    );

    act(() => {
      result.current.handleSelect(mockPresets[0]);
    });

    expect(mockSelectPreset).toHaveBeenCalledWith('p1');
    expect(mockApplyPreset).toHaveBeenCalledWith('p1');
    expect(onSelectPreset).toHaveBeenCalledWith(mockPresets[0]);
  });

  it('handleEdit sets editPreset and opens dialog', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.handleEdit(mockPresets[1]);
    });

    expect(result.current.editPreset).toEqual(mockPresets[1]);
    expect(result.current.createDialogOpen).toBe(true);
  });

  it('handleDuplicate calls store duplicatePreset', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.handleDuplicate(mockPresets[0]);
    });

    expect(mockDuplicatePreset).toHaveBeenCalledWith('p1');
  });

  it('handleDelete deletes preset and clears state', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.setDeletePreset(mockPresets[0]);
    });

    act(() => {
      result.current.handleDelete();
    });

    expect(mockDeletePreset).toHaveBeenCalledWith('p1');
    expect(result.current.deletePreset).toBeNull();
  });

  it('handleReset resets to defaults and closes dialog', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.setShowResetDialog(true);
    });

    act(() => {
      result.current.handleReset();
    });

    expect(mockResetToDefaults).toHaveBeenCalled();
    expect(result.current.showResetDialog).toBe(false);
  });

  it('handleCreateDialogClose clears state', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.handleEdit(mockPresets[0]);
    });

    act(() => {
      result.current.handleCreateDialogClose();
    });

    expect(result.current.createDialogOpen).toBe(false);
    expect(result.current.editPreset).toBeNull();
  });

  it('handleExport calls exportPresetsToFile', () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.handleExport();
    });

    expect(mockExportPresetsToFile).toHaveBeenCalledWith(mockPresets);
  });

  it('handleAIGenerate shows warning when no API key', async () => {
    mockGetPresetAIConfig.mockReturnValue(null);

    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.setAiDescription('Build a coding assistant');
    });

    await act(async () => {
      await result.current.handleAIGenerate();
    });

    const sonner = await import('@/components/ui/sonner');
    expect(sonner.toast.warning).toHaveBeenCalled();
  });

  it('handleAIGenerate creates preset on success', async () => {
    mockGetPresetAIConfig.mockReturnValue({
      provider: 'openai',
      apiKey: 'sk-test',
    });
    mockGeneratePreset.mockResolvedValue({
      success: true,
      preset: {
        name: 'AI Preset',
        description: 'Generated',
        systemPrompt: 'You are a coder.',
        mode: 'chat',
      },
    });

    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    act(() => {
      result.current.setAiDescription('Build a coding assistant');
    });

    await act(async () => {
      await result.current.handleAIGenerate();
    });

    expect(mockCreatePreset).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'AI Preset' }),
    );
    expect(result.current.aiDescription).toBe('');
  });

  it('handleAIGenerate does nothing when description is empty', async () => {
    const { result } = renderHook(() =>
      usePresetManager({ t: mockT }),
    );

    await act(async () => {
      await result.current.handleAIGenerate();
    });

    expect(mockGetPresetAIConfig).not.toHaveBeenCalled();
  });
});
