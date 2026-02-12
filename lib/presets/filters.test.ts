/**
 * @jest-environment jsdom
 */

/**
 * Tests for lib/presets/filters
 */

import {
  filterPresetsBySearch,
  getFavoritePresets,
  getRecentPresets,
  getPopularPresets,
  getOtherPresets,
} from './filters';
import type { Preset } from '@/types/content/preset';

// Helper to create a minimal Preset for testing
function makePreset(overrides: Partial<Preset> = {}): Preset {
  return {
    id: 'p1',
    name: 'Test Preset',
    description: 'A description',
    icon: '💬',
    color: '#6366f1',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: undefined,
    webSearchEnabled: false,
    thinkingEnabled: false,
    isFavorite: false,
    isDefault: false,
    usageCount: 0,
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  } as Preset;
}

// --- filterPresetsBySearch ---

describe('filterPresetsBySearch', () => {
  const presets = [
    makePreset({ id: '1', name: 'Code Assistant', description: 'Helps with code' }),
    makePreset({ id: '2', name: 'Writer', description: 'Creative writing' }),
    makePreset({ id: '3', name: 'Translator', description: 'Language translation' }),
  ];

  it('returns all presets when query is empty', () => {
    expect(filterPresetsBySearch(presets, '')).toEqual(presets);
    expect(filterPresetsBySearch(presets, '   ')).toEqual(presets);
  });

  it('filters by name (case-insensitive)', () => {
    const result = filterPresetsBySearch(presets, 'code');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by description (case-insensitive)', () => {
    const result = filterPresetsBySearch(presets, 'creative');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty when nothing matches', () => {
    expect(filterPresetsBySearch(presets, 'nonexistent')).toEqual([]);
  });
});

// --- getFavoritePresets ---

describe('getFavoritePresets', () => {
  it('returns only favorites', () => {
    const presets = [
      makePreset({ id: '1', isFavorite: true }),
      makePreset({ id: '2', isFavorite: false }),
      makePreset({ id: '3', isFavorite: true }),
    ];
    const result = getFavoritePresets(presets);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(['1', '3']);
  });

  it('returns empty when none are favorites', () => {
    const presets = [makePreset({ isFavorite: false })];
    expect(getFavoritePresets(presets)).toEqual([]);
  });
});

// --- getRecentPresets ---

describe('getRecentPresets', () => {
  it('returns presets sorted by lastUsedAt descending', () => {
    const presets = [
      makePreset({ id: '1', lastUsedAt: new Date('2024-01-01') }),
      makePreset({ id: '2', lastUsedAt: new Date('2024-03-01') }),
      makePreset({ id: '3', lastUsedAt: new Date('2024-02-01') }),
    ];
    const result = getRecentPresets(presets);
    expect(result.map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('excludes presets without lastUsedAt', () => {
    const presets = [
      makePreset({ id: '1', lastUsedAt: new Date('2024-01-01') }),
      makePreset({ id: '2', lastUsedAt: undefined }),
    ];
    const result = getRecentPresets(presets);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('respects the limit parameter', () => {
    const presets = [
      makePreset({ id: '1', lastUsedAt: new Date('2024-01-01') }),
      makePreset({ id: '2', lastUsedAt: new Date('2024-02-01') }),
      makePreset({ id: '3', lastUsedAt: new Date('2024-03-01') }),
    ];
    const result = getRecentPresets(presets, 2);
    expect(result).toHaveLength(2);
  });
});

// --- getPopularPresets ---

describe('getPopularPresets', () => {
  it('returns presets sorted by usageCount descending', () => {
    const presets = [
      makePreset({ id: '1', usageCount: 5 }),
      makePreset({ id: '2', usageCount: 20 }),
      makePreset({ id: '3', usageCount: 10 }),
    ];
    const result = getPopularPresets(presets);
    expect(result.map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('excludes presets with usageCount 0', () => {
    const presets = [
      makePreset({ id: '1', usageCount: 0 }),
      makePreset({ id: '2', usageCount: 3 }),
    ];
    const result = getPopularPresets(presets);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('respects the limit parameter', () => {
    const presets = [
      makePreset({ id: '1', usageCount: 5 }),
      makePreset({ id: '2', usageCount: 20 }),
      makePreset({ id: '3', usageCount: 10 }),
      makePreset({ id: '4', usageCount: 15 }),
    ];
    const result = getPopularPresets(presets, 2);
    expect(result).toHaveLength(2);
  });
});

// --- getOtherPresets ---

describe('getOtherPresets', () => {
  it('excludes favorites and recent presets', () => {
    const all = [
      makePreset({ id: '1', isFavorite: true }),
      makePreset({ id: '2', isFavorite: false }),
      makePreset({ id: '3', isFavorite: false }),
    ];
    const recent = [all[1]]; // id '2' is recent
    const result = getOtherPresets(all, recent);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('returns all non-favorite presets when recent is empty', () => {
    const all = [
      makePreset({ id: '1', isFavorite: false }),
      makePreset({ id: '2', isFavorite: true }),
    ];
    const result = getOtherPresets(all, []);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
