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

function applySortOrder(presets: Preset[]): Preset[] {
  return presets.map((preset, index) =>
    preset.sortOrder === index
      ? preset
      : {
          ...preset,
          sortOrder: index,
        },
  );
}

function enforceDefaultInvariant(
  presets: Preset[],
  preferredDefaultId?: string,
): Preset[] {
  if (presets.length === 0) return presets;

  if (preferredDefaultId && presets.some((preset) => preset.id === preferredDefaultId)) {
    return presets.map((preset) =>
      preset.isDefault === (preset.id === preferredDefaultId)
        ? preset
        : {
            ...preset,
            isDefault: preset.id === preferredDefaultId,
          },
    );
  }

  let hasDefault = false;
  return presets.map((preset) => {
    const nextIsDefault = Boolean(preset.isDefault) && !hasDefault;
    if (nextIsDefault) hasDefault = true;

    return preset.isDefault === nextIsDefault
      ? preset
      : {
          ...preset,
          isDefault: nextIsDefault,
        };
  });
}

function resolveSelectedPresetId(
  selectedPresetId: string | null,
  presets: Preset[],
): string | null {
  if (selectedPresetId && presets.some((preset) => preset.id === selectedPresetId)) {
    return selectedPresetId;
  }

  const defaultPreset = presets.find((preset) => preset.isDefault);
  if (defaultPreset) return defaultPreset.id;

  return presets[0]?.id || null;
}

function sanitizePresetState(
  presets: Preset[],
  selectedPresetId: string | null,
  options?: {
    preferredDefaultId?: string;
  },
): Pick<PresetState, 'presets' | 'selectedPresetId'> {
  const withDefault = enforceDefaultInvariant(presets, options?.preferredDefaultId);
  const withSortOrder = applySortOrder(withDefault);
  return {
    presets: withSortOrder,
    selectedPresetId: resolveSelectedPresetId(selectedPresetId, withSortOrder),
  };
}

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

            const sanitized = sanitizePresetState(defaultPresets, null);
            set({
              presets: sanitized.presets,
              isInitialized: true,
              selectedPresetId: sanitized.selectedPresetId,
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
          isDefault: Boolean(input.isDefault),
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
          sortOrder: get().presets.length,
        };

        set((state) =>
          sanitizePresetState(
            [...state.presets, newPreset],
            state.selectedPresetId,
            input.isDefault ? { preferredDefaultId: newPreset.id } : undefined,
          ),
        );

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
        set((state) => {
          const updatedPresets = state.presets.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  ...input,
                  updatedAt: new Date(),
                }
              : preset,
          );

          return sanitizePresetState(
            updatedPresets,
            state.selectedPresetId,
            input.isDefault ? { preferredDefaultId: id } : undefined,
          );
        });
      },

      deletePreset: (id) => {
        set((state) => {
          const remainingPresets = state.presets.filter((p) => p.id !== id);
          return sanitizePresetState(
            remainingPresets,
            state.selectedPresetId === id ? null : state.selectedPresetId,
          );
        });
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
        set((state) => ({
          selectedPresetId: resolveSelectedPresetId(id, state.presets),
        }));
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
        set((state) =>
          sanitizePresetState(state.presets, state.selectedPresetId, {
            preferredDefaultId: id,
          }),
        );
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
          return sanitizePresetState(newPresets, state.selectedPresetId);
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

        const sanitized = sanitizePresetState(defaultPresets, null);
        set({
          presets: sanitized.presets,
          selectedPresetId: sanitized.selectedPresetId,
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
          .filter((p) => p.lastUsedAt instanceof Date && !isNaN(p.lastUsedAt.getTime()))
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
      partialize: (state) => {
        const safeDateToISO = (d: Date | string | undefined): string | undefined => {
          if (!d) return undefined;
          if (d instanceof Date) {
            return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
          }
          return d as string;
        };
        return {
          presets: state.presets.map((p) => ({
            ...p,
            createdAt: safeDateToISO(p.createdAt) ?? new Date().toISOString(),
            updatedAt: safeDateToISO(p.updatedAt) ?? new Date().toISOString(),
            lastUsedAt: safeDateToISO(p.lastUsedAt),
          })),
          selectedPresetId: state.selectedPresetId,
          isInitialized: state.isInitialized,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state?.presets) {
          const safeDate = (v: unknown): Date => {
            const d = new Date(v as string | number);
            return isNaN(d.getTime()) ? new Date() : d;
          };
          const rehydratedPresets = state.presets.map((p) => ({
            ...p,
            createdAt: safeDate(p.createdAt),
            updatedAt: safeDate(p.updatedAt),
            lastUsedAt: p.lastUsedAt ? safeDate(p.lastUsedAt) : undefined,
          }));
          const sanitized = sanitizePresetState(rehydratedPresets, state.selectedPresetId);
          state.presets = sanitized.presets;
          state.selectedPresetId = sanitized.selectedPresetId;
        }
      },
    }
  )
);

// Selectors
export const selectPresets = (state: PresetState) => state.presets;
export const selectSelectedPresetId = (state: PresetState) => state.selectedPresetId;

export default usePresetStore;
