/**
 * usePresetSelector - store access and logic for the preset dropdown selector.
 *
 * Extracted from components/presets/preset-selector.tsx to separate
 * business logic from UI rendering.
 */

import { useState, useMemo, useCallback } from 'react';
import { usePresetStore } from '@/stores';
import {
  filterPresetsBySearch,
  getRecentPresets,
  getPopularPresets,
} from '@/lib/presets';
import type { Preset } from '@/types/content/preset';

interface UsePresetSelectorOptions {
  onSelect?: (preset: Preset) => void;
}

export function usePresetSelector({ onSelect }: UsePresetSelectorOptions = {}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const presets = usePresetStore((state) => state.presets);
  const selectedPresetId = usePresetStore((state) => state.selectedPresetId);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);

  const selectedPreset = useMemo(
    () =>
      selectedPresetId
        ? presets.find((p) => p.id === selectedPresetId)
        : presets.find((p) => p.isDefault),
    [selectedPresetId, presets],
  );

  const filteredPresets = useMemo(
    () => filterPresetsBySearch(presets, search),
    [presets, search],
  );

  const recentPresets = useMemo(
    () => getRecentPresets(presets, 3),
    [presets],
  );

  const popularPresets = useMemo(
    () => getPopularPresets(presets, 3),
    [presets],
  );

  const handleSelect = useCallback(
    (preset: Preset) => {
      selectPreset(preset.id);
      trackPresetUsage(preset.id);
      onSelect?.(preset);
      setOpen(false);
      setSearch('');
    },
    [selectPreset, trackPresetUsage, onSelect],
  );

  return {
    search,
    setSearch,
    open,
    setOpen,
    presets,
    selectedPresetId,
    selectedPreset,
    filteredPresets,
    recentPresets,
    popularPresets,
    handleSelect,
  };
}
