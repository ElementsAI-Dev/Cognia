/**
 * usePresetManager - store access and operations for the presets manager view.
 *
 * Extracted from components/presets/presets-manager.tsx to separate
 * business logic from UI rendering.
 */

import { useState, useRef, useMemo, useCallback } from 'react';
import { usePresetStore, useSettingsStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import { loggers } from '@/lib/logger';
import { getPresetAIConfig, exportPresetsToFile, parsePresetImportFile } from '@/lib/presets';
import { generatePresetFromDescription } from '@/lib/ai/presets';
import { nanoid } from 'nanoid';
import type { Preset, PresetCategory } from '@/types/content/preset';

interface UsePresetManagerOptions {
  onSelectPreset?: (preset: Preset) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}

export function usePresetManager({ onSelectPreset, t }: UsePresetManagerOptions) {
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPreset, setEditPreset] = useState<Preset | null>(null);
  const [deletePreset, setDeletePreset] = useState<Preset | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<PresetCategory | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Store
  const presets = usePresetStore((state) => state.presets);
  const selectedPresetId = usePresetStore((state) => state.selectedPresetId);
  const selectPreset = usePresetStore((state) => state.selectPreset);
  const applyPreset = usePresetStore((state) => state.usePreset);
  const deletePresetAction = usePresetStore((state) => state.deletePreset);
  const duplicatePreset = usePresetStore((state) => state.duplicatePreset);
  const setDefaultPreset = usePresetStore((state) => state.setDefaultPreset);
  const resetToDefaults = usePresetStore((state) => state.resetToDefaults);
  const searchPresets = usePresetStore((state) => state.searchPresets);
  const createPreset = usePresetStore((state) => state.createPreset);
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // Filtered presets
  const filteredPresets = useMemo(() => {
    const base = search ? searchPresets(search) : presets;
    if (categoryFilter === 'all') return base;
    return base.filter((p) => p.category === categoryFilter);
  }, [search, searchPresets, presets, categoryFilter]);

  // Actions
  const handleSelect = useCallback(
    (preset: Preset) => {
      selectPreset(preset.id);
      applyPreset(preset.id);
      onSelectPreset?.(preset);
    },
    [selectPreset, applyPreset, onSelectPreset],
  );

  const handleEdit = useCallback((preset: Preset) => {
    setEditPreset(preset);
    setCreateDialogOpen(true);
  }, []);

  const handleDuplicate = useCallback(
    (preset: Preset) => {
      duplicatePreset(preset.id);
    },
    [duplicatePreset],
  );

  const handleDelete = useCallback(() => {
    if (deletePreset) {
      deletePresetAction(deletePreset.id);
      setDeletePreset(null);
    }
  }, [deletePreset, deletePresetAction]);

  const handleReset = useCallback(() => {
    resetToDefaults();
    setShowResetDialog(false);
  }, [resetToDefaults]);

  const handleCreateDialogClose = useCallback(() => {
    setCreateDialogOpen(false);
    setEditPreset(null);
  }, []);

  // Export
  const handleExport = useCallback(() => {
    exportPresetsToFile(presets);
  }, [presets]);

  // Import
  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const { entries, skipped } = await parsePresetImportFile(file);
        let imported = 0;
        for (const entry of entries) {
          const { isFavorite, ...presetInput } = entry;
          const newPreset = createPreset(presetInput);
          if (isFavorite && newPreset) {
            usePresetStore.getState().toggleFavorite(newPreset.id);
          }
          imported++;
        }
        const msg =
          skipped > 0
            ? t('importSuccess', { count: imported }) + ` (${skipped} skipped)`
            : t('importSuccess', { count: imported });
        toast.success(msg);
      } catch (err) {
        const errorKey = err instanceof Error ? err.message : 'parseFileFailed';
        toast.error(t(`errors.${errorKey}`));
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [createPreset, t],
  );

  // AI Generate
  const handleAIGenerate = useCallback(async () => {
    if (!aiDescription.trim()) return;

    const aiConfig = getPresetAIConfig(providerSettings);
    if (!aiConfig) {
      toast.warning(t('errors.noApiKey'));
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generatePresetFromDescription(aiDescription, aiConfig);

      if (result.success && result.preset) {
        const preset = result.preset;
        createPreset({
          name: preset.name || 'AI Generated Preset',
          description: preset.description,
          icon: preset.icon || '✨',
          color: preset.color || '#6366f1',
          provider: 'auto',
          model: 'gpt-4o',
          mode: preset.mode || 'chat',
          systemPrompt: preset.systemPrompt,
          builtinPrompts: preset.builtinPrompts?.map((p) => ({
            id: nanoid(),
            name: p.name,
            content: p.content,
            description: p.description || '',
          })),
          temperature: preset.temperature ?? 0.7,
          webSearchEnabled: preset.webSearchEnabled,
          thinkingEnabled: preset.thinkingEnabled,
          category: preset.category as PresetCategory | undefined,
        });
        setAiDescription('');
        toast.success(t('aiGenerateSuccess'));
      } else {
        toast.error(result.error || t('errors.generateFailed'));
      }
    } catch (error) {
      loggers.ui.error('Failed to generate preset:', error);
      toast.error(t('errors.generateFailedRetry'));
    } finally {
      setIsGenerating(false);
    }
  }, [aiDescription, providerSettings, createPreset, t]);

  return {
    // State
    search,
    setSearch,
    createDialogOpen,
    setCreateDialogOpen,
    editPreset,
    setEditPreset,
    deletePreset,
    setDeletePreset,
    showResetDialog,
    setShowResetDialog,
    aiDescription,
    setAiDescription,
    isGenerating,
    categoryFilter,
    setCategoryFilter,
    fileInputRef,
    // Derived
    presets,
    selectedPresetId,
    filteredPresets,
    // Actions
    handleSelect,
    handleEdit,
    handleDuplicate,
    handleDelete,
    handleReset,
    handleCreateDialogClose,
    handleExport,
    handleImport,
    handleAIGenerate,
    setDefaultPreset,
  };
}
