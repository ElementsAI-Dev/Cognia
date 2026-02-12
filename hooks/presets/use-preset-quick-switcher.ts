/**
 * usePresetQuickSwitcher - store access and logic for the quick preset switcher.
 *
 * Extracted from components/presets/preset-quick-switcher.tsx to separate
 * business logic from UI rendering.
 */

import { useState, useMemo, useCallback } from 'react';
import { usePresetStore, useSessionStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import {
  filterPresetsBySearch,
  getFavoritePresets,
  getRecentPresets,
  getOtherPresets,
} from '@/lib/presets';
import type { Preset } from '@/types/content/preset';
import type { DragEndEvent } from '@dnd-kit/core';

interface UsePresetQuickSwitcherOptions {
  onPresetChange?: (preset: Preset) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}

export function usePresetQuickSwitcher({
  onPresetChange,
  t,
}: UsePresetQuickSwitcherOptions) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Preset store
  const presets = usePresetStore((state) => state.presets);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const trackPresetUsage = usePresetStore((state) => state.usePreset);
  const toggleFavorite = usePresetStore((state) => state.toggleFavorite);
  const reorderPresets = usePresetStore((state) => state.reorderPresets);

  // Session store
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const sessions = useSessionStore((state) => state.sessions);
  const updateSession = useSessionStore((state) => state.updateSession);

  // Current session & preset
  const currentSession = useMemo(
    () => (activeSessionId ? sessions.find((s) => s.id === activeSessionId) : null),
    [activeSessionId, sessions],
  );

  const currentPresetId = currentSession?.presetId;
  const currentPreset = useMemo(
    () => (currentPresetId ? presets.find((p) => p.id === currentPresetId) : null),
    [currentPresetId, presets],
  );

  // Filtered & categorised presets
  const filteredPresets = useMemo(
    () => filterPresetsBySearch(presets, searchQuery),
    [presets, searchQuery],
  );

  const favoritePresets = useMemo(
    () => getFavoritePresets(filteredPresets),
    [filteredPresets],
  );

  const recentPresets = useMemo(
    () => getRecentPresets(filteredPresets.filter((p) => !p.isFavorite), 5),
    [filteredPresets],
  );

  const otherPresets = useMemo(
    () => getOtherPresets(filteredPresets, recentPresets),
    [filteredPresets, recentPresets],
  );

  const isSearching = searchQuery.trim().length > 0;
  const hasActivePreset = !!currentPreset;

  // Handlers
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        reorderPresets(active.id as string, over.id as string);
        toast.success(t('orderUpdated'));
      }
    },
    [reorderPresets, t],
  );

  const handleToggleFavorite = useCallback(
    (e: React.MouseEvent, presetId: string) => {
      e.stopPropagation();
      toggleFavorite(presetId);
      const preset = presets.find((p) => p.id === presetId);
      if (preset) {
        toast.dismiss('preset-fav');
        toast.success(
          preset.isFavorite ? t('removedFromFavorites') : t('addedToFavorites'),
          { id: 'preset-fav' },
        );
      }
    },
    [toggleFavorite, presets, t],
  );

  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      selectPreset(preset.id);
      trackPresetUsage(preset.id);

      if (currentSession) {
        updateSession(currentSession.id, {
          provider: preset.provider === 'auto' ? 'openai' : preset.provider,
          model: preset.model,
          mode: preset.mode,
          systemPrompt: preset.systemPrompt,
          builtinPrompts: preset.builtinPrompts,
          temperature: preset.temperature,
          maxTokens: preset.maxTokens,
          webSearchEnabled: preset.webSearchEnabled,
          thinkingEnabled: preset.thinkingEnabled,
          presetId: preset.id,
        });
      }

      onPresetChange?.(preset);
      setOpen(false);
      toast.success(t('switchedTo', { name: preset.name }));
    },
    [selectPreset, trackPresetUsage, currentSession, updateSession, onPresetChange, t],
  );

  return {
    open,
    setOpen,
    searchQuery,
    setSearchQuery,
    presets,
    currentPreset,
    currentPresetId,
    filteredPresets,
    favoritePresets,
    recentPresets,
    otherPresets,
    isSearching,
    hasActivePreset,
    handleDragEnd,
    handleToggleFavorite,
    handleSelectPreset,
  };
}
