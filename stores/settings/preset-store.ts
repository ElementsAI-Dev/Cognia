/**
 * Preset Store - manages saved chat configurations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import {
  type Preset,
  type CreatePresetInput,
  type UpdatePresetInput,
  type PresetCategory,
  DEFAULT_PRESETS,
} from '@/types/content/preset';

export interface CreateFromSessionInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  provider: string;
  model: string;
  mode: string;
  systemPrompt?: string;
  builtinPrompts?: Preset['builtinPrompts'];
  temperature?: number;
  maxTokens?: number;
  webSearchEnabled?: boolean;
  thinkingEnabled?: boolean;
  category?: PresetCategory;
}

interface PresetState {
  // State
  presets: Preset[];
  selectedPresetId: string | null;
  isInitialized: boolean;

  // Actions
  initializeDefaults: () => void;
  createPreset: (input: CreatePresetInput) => Preset;
  createFromSession: (input: CreateFromSessionInput) => Preset;
  updatePreset: (id: string, input: UpdatePresetInput) => void;
  deletePreset: (id: string) => void;
  duplicatePreset: (id: string) => Preset | null;
  selectPreset: (id: string | null) => void;
  usePreset: (id: string) => void;
  setDefaultPreset: (id: string) => void;
  toggleFavorite: (id: string) => void;
  reorderPresets: (activeId: string, overId: string) => void;
  resetToDefaults: () => void;

  // Selectors
  getPreset: (id: string) => Preset | undefined;
  getDefaultPreset: () => Preset | undefined;
  getRecentPresets: (limit?: number) => Preset[];
  getMostUsedPresets: (limit?: number) => Preset[];
  searchPresets: (query: string) => Preset[];
  getPresetsByCategory: (category: PresetCategory) => Preset[];
}

export const usePresetStore = create<PresetState>()(
  persist(
    (set, get) => ({
      presets: [],
      selectedPresetId: null,
      isInitialized: false,

      initializeDefaults: () => {
        const { isInitialized } = get();

        if (isInitialized) return;

        // Use setTimeout to avoid synchronous state updates during render
        setTimeout(() => {
          const currentState = get();
          if (currentState.isInitialized) return;

          // Only add defaults if no presets exist
          if (currentState.presets.length === 0) {
            const now = new Date();
            const defaultPresets: Preset[] = DEFAULT_PRESETS.map((preset) => ({
              ...preset,
              id: nanoid(),
              usageCount: 0,
              createdAt: now,
              updatedAt: now,
            }));

            set({
              presets: defaultPresets,
              isInitialized: true,
              selectedPresetId: defaultPresets.find((p) => p.isDefault)?.id || null,
            });
          } else {
            set({ isInitialized: true });
          }
        }, 0);
      },

      createPreset: (input) => {
        const now = new Date();
        const newPreset: Preset = {
          id: nanoid(),
          name: input.name,
          description: input.description,
          icon: input.icon || '💬',
          color: input.color || '#6366f1',
          provider: input.provider,
          model: input.model,
          mode: input.mode || 'chat',
          systemPrompt: input.systemPrompt,
          builtinPrompts: input.builtinPrompts,
          temperature: input.temperature ?? 0.7,
          maxTokens: input.maxTokens,
          webSearchEnabled: input.webSearchEnabled,
          thinkingEnabled: input.thinkingEnabled,
          category: input.category,
          isDefault: false,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          presets: [...state.presets, newPreset],
        }));

        return newPreset;
      },

      createFromSession: (input) => {
        const { createPreset } = get();
        return createPreset({
          name: input.name,
          description: input.description,
          icon: input.icon || '💬',
          color: input.color || '#6366f1',
          provider: input.provider as CreatePresetInput['provider'],
          model: input.model,
          mode: input.mode as CreatePresetInput['mode'],
          systemPrompt: input.systemPrompt,
          builtinPrompts: input.builtinPrompts,
          temperature: input.temperature,
          maxTokens: input.maxTokens,
          webSearchEnabled: input.webSearchEnabled,
          thinkingEnabled: input.thinkingEnabled,
          category: input.category,
        });
      },

      updatePreset: (id, input) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  ...input,
                  updatedAt: new Date(),
                }
              : preset
          ),
        }));
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
          selectedPresetId: state.selectedPresetId === id ? null : state.selectedPresetId,
        }));
      },

      duplicatePreset: (id) => {
        const { presets, createPreset } = get();
        const original = presets.find((p) => p.id === id);

        if (!original) return null;

        return createPreset({
          name: `${original.name} (Copy)`,
          description: original.description,
          icon: original.icon,
          color: original.color,
          provider: original.provider,
          model: original.model,
          mode: original.mode,
          systemPrompt: original.systemPrompt,
          builtinPrompts: original.builtinPrompts,
          temperature: original.temperature,
          maxTokens: original.maxTokens,
          webSearchEnabled: original.webSearchEnabled,
          thinkingEnabled: original.thinkingEnabled,
          category: original.category,
        });
      },

      selectPreset: (id) => {
        set({ selectedPresetId: id });
      },

      usePreset: (id) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  usageCount: preset.usageCount + 1,
                  lastUsedAt: new Date(),
                }
              : preset
          ),
        }));
      },

      setDefaultPreset: (id) => {
        set((state) => ({
          presets: state.presets.map((preset) => ({
            ...preset,
            isDefault: preset.id === id,
          })),
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id ? { ...preset, isFavorite: !preset.isFavorite } : preset
          ),
        }));
      },

      reorderPresets: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.presets.findIndex((p) => p.id === activeId);
          const newIndex = state.presets.findIndex((p) => p.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newPresets = [...state.presets];
          const [removed] = newPresets.splice(oldIndex, 1);
          newPresets.splice(newIndex, 0, removed);

          // Update sortOrder for all presets
          const updatedPresets = newPresets.map((preset, index) => ({
            ...preset,
            sortOrder: index,
          }));

          return { presets: updatedPresets };
        });
      },

      resetToDefaults: () => {
        const now = new Date();
        const defaultPresets: Preset[] = DEFAULT_PRESETS.map((preset) => ({
          ...preset,
          id: nanoid(),
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        }));

        set({
          presets: defaultPresets,
          selectedPresetId: defaultPresets.find((p) => p.isDefault)?.id || null,
        });
      },

      getPreset: (id) => {
        return get().presets.find((p) => p.id === id);
      },

      getDefaultPreset: () => {
        return get().presets.find((p) => p.isDefault);
      },

      getRecentPresets: (limit = 5) => {
        return [...get().presets]
          .filter((p) => p.lastUsedAt)
          .sort((a, b) => (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0))
          .slice(0, limit);
      },

      getMostUsedPresets: (limit = 5) => {
        return [...get().presets].sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
      },

      searchPresets: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().presets.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.description?.toLowerCase().includes(lowerQuery) ||
            p.category?.toLowerCase().includes(lowerQuery)
        );
      },

      getPresetsByCategory: (category) => {
        return get().presets.filter((p) => p.category === category);
      },
    }),
    {
      name: 'cognia-presets',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        presets: state.presets.map((p) => ({
          ...p,
          createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
          updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
          lastUsedAt: p.lastUsedAt
            ? p.lastUsedAt instanceof Date
              ? p.lastUsedAt.toISOString()
              : p.lastUsedAt
            : undefined,
        })),
        selectedPresetId: state.selectedPresetId,
        isInitialized: state.isInitialized,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.presets) {
          state.presets = state.presets.map((p) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
            lastUsedAt: p.lastUsedAt ? new Date(p.lastUsedAt) : undefined,
          }));
        }
      },
    }
  )
);

// Selectors
export const selectPresets = (state: PresetState) => state.presets;
export const selectSelectedPresetId = (state: PresetState) => state.selectedPresetId;

export default usePresetStore;
