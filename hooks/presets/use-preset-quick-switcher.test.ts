/**
 * @jest-environment jsdom
 */

/**
 * Tests for usePresetQuickSwitcher hook
 */

import { renderHook, act } from '@testing-library/react';
import { usePresetQuickSwitcher } from './use-preset-quick-switcher';
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
    isFavorite: true,
    isDefault: true,
    usageCount: 5,
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastUsedAt: new Date('2024-06-01'),
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
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  } as Preset,
];

const mockSelectPreset = jest.fn();
const mockTrackUsage = jest.fn();
const mockToggleFavorite = jest.fn();
const mockReorderPresets = jest.fn();
const mockUpdateSession = jest.fn();

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: unknown) => unknown) => {
    const state = {
      presets: mockPresets,
      selectPreset: mockSelectPreset,
      usePreset: mockTrackUsage,
      toggleFavorite: mockToggleFavorite,
      reorderPresets: mockReorderPresets,
    };
    return selector(state);
  },
  useSessionStore: (selector: (state: unknown) => unknown) => {
    const state = {
      activeSessionId: 'session-1',
      sessions: [{ id: 'session-1', presetId: 'p1' }],
      updateSession: mockUpdateSession,
    };
    return selector(state);
  },
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock('@/lib/presets', () => ({
  filterPresetsBySearch: jest.fn((presets: Preset[], query: string) => {
    if (!query.trim()) return presets;
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description?.toLowerCase().includes(query.toLowerCase()),
    );
  }),
  getFavoritePresets: jest.fn((presets: Preset[]) =>
    presets.filter((p) => p.isFavorite),
  ),
  getRecentPresets: jest.fn((presets: Preset[]) =>
    presets.filter((p) => p.lastUsedAt),
  ),
  getOtherPresets: jest.fn((presets: Preset[], recent: Preset[]) => {
    const recentIds = new Set(recent.map((r) => r.id));
    return presets.filter((p) => !p.isFavorite && !recentIds.has(p.id));
  }),
}));

const mockT = jest.fn((key: string) => key);

describe('usePresetQuickSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ t: mockT }),
    );

    expect(result.current.open).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.presets).toEqual(mockPresets);
    expect(result.current.currentPreset).toBeDefined();
    expect(result.current.currentPreset?.id).toBe('p1');
    expect(result.current.hasActivePreset).toBe(true);
  });

  it('categorises presets into favorites, recent, other', () => {
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ t: mockT }),
    );

    expect(result.current.favoritePresets.length).toBeGreaterThanOrEqual(1);
  });

  it('updates searchQuery via setSearchQuery', () => {
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ t: mockT }),
    );

    act(() => {
      result.current.setSearchQuery('Preset 1');
    });

    expect(result.current.searchQuery).toBe('Preset 1');
    expect(result.current.isSearching).toBe(true);
  });

  it('handleSelectPreset calls store actions and updates session', () => {
    const onPresetChange = jest.fn();
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ onPresetChange, t: mockT }),
    );

    act(() => {
      result.current.handleSelectPreset(mockPresets[1]);
    });

    expect(mockSelectPreset).toHaveBeenCalledWith('p2');
    expect(mockTrackUsage).toHaveBeenCalledWith('p2');
    expect(mockUpdateSession).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({ presetId: 'p2' }),
    );
    expect(onPresetChange).toHaveBeenCalledWith(mockPresets[1]);
    expect(result.current.open).toBe(false);
  });

  it('handleToggleFavorite calls toggleFavorite and stops propagation', () => {
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ t: mockT }),
    );

    const mockEvent = {
      stopPropagation: jest.fn(),
    } as unknown as React.MouseEvent;

    act(() => {
      result.current.handleToggleFavorite(mockEvent, 'p1');
    });

    expect(mockEvent.stopPropagation).toHaveBeenCalled();
    expect(mockToggleFavorite).toHaveBeenCalledWith('p1');
  });

  it('handleDragEnd reorders presets', () => {
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ t: mockT }),
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'p1' },
        over: { id: 'p2' },
      } as unknown as import('@dnd-kit/core').DragEndEvent);
    });

    expect(mockReorderPresets).toHaveBeenCalledWith('p1', 'p2');
  });

  it('handleDragEnd does nothing when over is null', () => {
    const { result } = renderHook(() =>
      usePresetQuickSwitcher({ t: mockT }),
    );

    act(() => {
      result.current.handleDragEnd({
        active: { id: 'p1' },
        over: null,
      } as unknown as import('@dnd-kit/core').DragEndEvent);
    });

    expect(mockReorderPresets).not.toHaveBeenCalled();
  });
});
