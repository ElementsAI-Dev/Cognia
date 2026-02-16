import type { StoreApi } from 'zustand';
import {
  DEFAULT_SELECTION_CONFIG,
  type ActionGroup,
  type ActionGroupConfig,
  type CustomUserAction,
  type SearchEngine,
  type SelectionAction,
  type SelectionConfig,
  type SelectionTemplate,
  type ToolbarMode,
  type ToolbarPreset,
} from '@/types';
import type { SelectionStore } from '../types';

type SelectionStoreSet = StoreApi<SelectionStore>['setState'];
type SelectionStoreGet = StoreApi<SelectionStore>['getState'];

type ConfigActionsSlice = Pick<
  SelectionStore,
  | 'updateConfig'
  | 'resetConfig'
  | 'setToolbarMode'
  | 'toggleToolbarMode'
  | 'updateQuickActions'
  | 'toggleActionGroup'
  | 'updateActionGroups'
  | 'savePreset'
  | 'loadPreset'
  | 'deletePreset'
  | 'addCustomAction'
  | 'updateCustomAction'
  | 'removeCustomAction'
  | 'reorderCustomActions'
  | 'incrementCustomActionUsage'
  | 'addTemplate'
  | 'updateTemplate'
  | 'removeTemplate'
  | 'toggleTemplateFavorite'
  | 'incrementTemplateUsage'
  | 'importTemplates'
  | 'exportTemplates'
  | 'trackActionUsage'
  | 'getActionUsageCount'
  | 'setSearchEngine'
  | 'setEnableReplaceInPlace'
  | 'reorderPinnedActions'
>;

export const createConfigActionsSlice = (
  set: SelectionStoreSet,
  get: SelectionStoreGet
): ConfigActionsSlice => ({
  updateConfig: (config: Partial<SelectionConfig>) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  resetConfig: () =>
    set({
      config: DEFAULT_SELECTION_CONFIG,
    }),

  // Toolbar mode actions
  setToolbarMode: (mode: ToolbarMode) =>
    set((state) => ({
      config: { ...state.config, toolbarMode: mode },
    })),

  toggleToolbarMode: () =>
    set((state) => ({
      config: {
        ...state.config,
        toolbarMode: state.config.toolbarMode === 'full' ? 'compact' : 'full',
      },
    })),

  updateQuickActions: (actions: SelectionAction[]) =>
    set((state) => ({
      config: { ...state.config, quickActions: actions },
    })),

  toggleActionGroup: (groupId: ActionGroup) =>
    set((state) => ({
      config: {
        ...state.config,
        actionGroups: state.config.actionGroups.map((g) =>
          g.id === groupId ? { ...g, expanded: !g.expanded } : g
        ),
      },
    })),

  updateActionGroups: (groups: ActionGroupConfig[]) =>
    set((state) => ({
      config: { ...state.config, actionGroups: groups },
    })),

  // Preset actions
  savePreset: (preset: Omit<ToolbarPreset, 'id'>) =>
    set((state) => {
      const newPreset: ToolbarPreset = {
        ...preset,
        id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      };
      return {
        config: {
          ...state.config,
          presets: [...state.config.presets, newPreset],
          activePreset: newPreset.id,
        },
      };
    }),

  loadPreset: (presetId: string) =>
    set((state) => {
      const preset = state.config.presets.find((p) => p.id === presetId);
      if (!preset) return state;
      return {
        config: {
          ...state.config,
          toolbarMode: preset.mode,
          quickActions: preset.quickActions,
          actionGroups: preset.groups,
          activePreset: presetId,
        },
      };
    }),

  deletePreset: (presetId: string) =>
    set((state) => ({
      config: {
        ...state.config,
        presets: state.config.presets.filter((p) => p.id !== presetId),
        activePreset: state.config.activePreset === presetId ? null : state.config.activePreset,
      },
    })),

  // Custom user action actions
  addCustomAction: (action) =>
    set((state) => {
      const newAction: CustomUserAction = {
        ...action,
        id: `custom-action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
      };
      return {
        config: {
          ...state.config,
          customUserActions: [...state.config.customUserActions, newAction],
        },
      };
    }),

  updateCustomAction: (id, updates) =>
    set((state) => ({
      config: {
        ...state.config,
        customUserActions: state.config.customUserActions.map((a) =>
          a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a
        ),
      },
    })),

  removeCustomAction: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        customUserActions: state.config.customUserActions.filter((a) => a.id !== id),
      },
    })),

  reorderCustomActions: (ids) =>
    set((state) => {
      const actionMap = new Map(state.config.customUserActions.map((a) => [a.id, a]));
      const reordered = ids.map((id) => actionMap.get(id)).filter(Boolean) as CustomUserAction[];
      return {
        config: { ...state.config, customUserActions: reordered },
      };
    }),

  incrementCustomActionUsage: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        customUserActions: state.config.customUserActions.map((a) =>
          a.id === id ? { ...a, usageCount: a.usageCount + 1 } : a
        ),
      },
    })),

  // Template actions (persisted)
  addTemplate: (template) =>
    set((state) => {
      const newTemplate: SelectionTemplate = {
        ...template,
        id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        isFavorite: false,
        usageCount: 0,
        isBuiltIn: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        config: {
          ...state.config,
          templates: [...state.config.templates, newTemplate],
        },
      };
    }),

  updateTemplate: (id, updates) =>
    set((state) => ({
      config: {
        ...state.config,
        templates: state.config.templates.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
        ),
      },
    })),

  removeTemplate: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        templates: state.config.templates.filter((t) => t.id !== id),
      },
    })),

  toggleTemplateFavorite: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        templates: state.config.templates.map((t) =>
          t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
        ),
      },
    })),

  incrementTemplateUsage: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        templates: state.config.templates.map((t) =>
          t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
        ),
      },
    })),

  importTemplates: (json: string) => {
    try {
      const items = JSON.parse(json) as SelectionTemplate[];
      if (Array.isArray(items)) {
        set((state) => {
          const existingIds = new Set(state.config.templates.map((t) => t.id));
          const newTemplates: SelectionTemplate[] = items
            .filter((t) => !existingIds.has(t.id))
            .map((t) => ({ ...t, isBuiltIn: false as const, updatedAt: Date.now() }));
          return {
            config: {
              ...state.config,
              templates: [...state.config.templates, ...newTemplates],
            },
          };
        });
        return true;
      }
    } catch {
      // Invalid JSON
    }
    return false;
  },

  exportTemplates: () => {
    const state = get();
    return JSON.stringify(state.config.templates, null, 2);
  },

  // Usage tracking
  trackActionUsage: (actionId: string) =>
    set((state) => ({
      config: {
        ...state.config,
        actionUsageCounts: {
          ...state.config.actionUsageCounts,
          [actionId]: (state.config.actionUsageCounts[actionId] || 0) + 1,
        },
      },
    })),

  getActionUsageCount: (actionId: string) => {
    const state = get();
    return state.config.actionUsageCounts[actionId] || 0;
  },

  // Search engine
  setSearchEngine: (engine: SearchEngine) =>
    set((state) => ({
      config: { ...state.config, searchEngine: engine },
    })),

  // Replace-in-place
  setEnableReplaceInPlace: (enabled: boolean) =>
    set((state) => ({
      config: { ...state.config, enableReplaceInPlace: enabled },
    })),

  // Pinned action reorder
  reorderPinnedActions: (actions: SelectionAction[]) =>
    set((state) => ({
      config: { ...state.config, pinnedActions: actions },
    })),
});
