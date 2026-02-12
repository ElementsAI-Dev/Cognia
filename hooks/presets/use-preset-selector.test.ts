/**
 * @jest-environment jsdom
 */

/**
 * Tests for usePresetSelector hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePresetSelector } from './use-preset-selector';
import type { Preset } from '@/types/content/preset';

// Mock data
const mockPresets: Preset[] = [
  {
    id: 'p1',
    name: 'Default Preset',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    isDefault: true,
    isFavorite: false,
    usageCount: 10,
    sortOrder: 0,
    lastUsedAt: new Date('2024-06-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Preset,
  {
    id: 'p2',
    name: 'Agent Preset',
    provider: 'anthropic',
    model: 'claude-3',
    mode: 'agent',
    isDefault: false,
    isFavorite: false,
    usageCount: 5,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Preset,
];

const mockSelectPreset = jest.fn();
const mockTrackUsage = jest.fn();

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: unknown) => unknown) => {
    const state = {
      presets: mockPresets,
      selectedPresetId: null,
      selectPreset: mockSelectPreset,
      usePreset: mockTrackUsage,
    };
    return selector(state);
  },
}));

jest.mock('@/lib/presets', () => ({
  filterPresetsBySearch: jest.fn((presets: Preset[], query: string) => {
    if (!query.trim()) return presets;
    return presets.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()),
    );
  }),
  getRecentPresets: jest.fn((presets: Preset[], limit: number) =>
    [...presets]
      .filter((p) => p.lastUsedAt)
      .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
      .slice(0, limit),
  ),
  getPopularPresets: jest.fn((presets: Preset[], limit: number) =>
    [...presets]
      .filter((p) => p.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit),
  ),
}));

describe('usePresetSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => usePresetSelector());

    expect(result.current.search).toBe('');
    expect(result.current.open).toBe(false);
    expect(result.current.presets).toEqual(mockPresets);
  });

  it('selects the default preset when no selectedPresetId', () => {
    const { result } = renderHook(() => usePresetSelector());

    expect(result.current.selectedPreset?.id).toBe('p1');
  });

  it('filters presets by search', () => {
    const { result } = renderHook(() => usePresetSelector());

    act(() => {
      result.current.setSearch('Agent');
    });

    expect(result.current.filteredPresets).toHaveLength(1);
    expect(result.current.filteredPresets[0].id).toBe('p2');
  });

  it('computes recent presets', () => {
    const { result } = renderHook(() => usePresetSelector());

    expect(result.current.recentPresets.length).toBeGreaterThanOrEqual(1);
  });

  it('computes popular presets', () => {
    const { result } = renderHook(() => usePresetSelector());

    expect(result.current.popularPresets.length).toBeGreaterThanOrEqual(1);
  });

  it('handleSelect calls store actions and closes', () => {
    const onSelect = jest.fn();
    const { result } = renderHook(() => usePresetSelector({ onSelect }));

    act(() => {
      result.current.setOpen(true);
    });

    act(() => {
      result.current.handleSelect(mockPresets[1]);
    });

    expect(mockSelectPreset).toHaveBeenCalledWith('p2');
    expect(mockTrackUsage).toHaveBeenCalledWith('p2');
    expect(onSelect).toHaveBeenCalledWith(mockPresets[1]);
    expect(result.current.open).toBe(false);
    expect(result.current.search).toBe('');
  });
});
