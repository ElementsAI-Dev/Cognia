/**
 * Preset filtering, sorting, and categorisation utilities.
 *
 * Shared across preset-quick-switcher, preset-selector, and presets-manager.
 */

import type { Preset } from '@/types/content/preset';

/**
 * Filter presets by a search query (matches name or description, case-insensitive).
 */
export function filterPresetsBySearch(presets: Preset[], query: string): Preset[] {
  if (!query.trim()) return presets;
  const q = query.toLowerCase();
  return presets.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q),
  );
}

/**
 * Return only favourite presets.
 */
export function getFavoritePresets(presets: Preset[]): Preset[] {
  return presets.filter((p) => p.isFavorite);
}

/**
 * Return the most recently used presets, sorted by lastUsedAt descending.
 * @param limit Maximum number of results (default 5).
 */
export function getRecentPresets(presets: Preset[], limit = 5): Preset[] {
  return [...presets]
    .filter((p) => p.lastUsedAt)
    .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
    .slice(0, limit);
}

/**
 * Return the most popular presets, sorted by usageCount descending.
 * Only includes presets with usageCount > 0.
 * @param limit Maximum number of results (default 3).
 */
export function getPopularPresets(presets: Preset[], limit = 3): Preset[] {
  return [...presets]
    .filter((p) => p.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}

/**
 * Return presets that are neither favourites nor in the recent list.
 */
export function getOtherPresets(
  presets: Preset[],
  recentPresets: Preset[],
): Preset[] {
  const recentIds = new Set(recentPresets.map((r) => r.id));
  return presets.filter((p) => !p.isFavorite && !recentIds.has(p.id));
}
