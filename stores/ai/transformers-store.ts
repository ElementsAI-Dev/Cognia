/**
 * Transformers.js Store
 * Manages browser-based ML model state, download progress, and settings.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  TransformersSettings,
  TransformersModelState,
  TransformersTask,
  ModelDownloadProgress,
} from '@/types/transformers';

const DEFAULT_SETTINGS: TransformersSettings = {
  enabled: false,
  preferWebGPU: true,
  defaultDtype: 'q8',
  cacheModels: true,
  maxCachedModels: 5,
};

export interface TransformersState {
  settings: TransformersSettings;
  models: TransformersModelState[];
  isWebGPUAvailable: boolean;

  // Actions
  updateSettings: (updates: Partial<TransformersSettings>) => void;
  setWebGPUAvailable: (available: boolean) => void;

  // Model state management
  setModelStatus: (
    modelId: string,
    task: TransformersTask,
    status: TransformersModelState['status'],
    progress?: number,
    error?: string
  ) => void;
  updateModelProgress: (progress: ModelDownloadProgress) => void;
  removeModel: (modelId: string) => void;
  clearAllModels: () => void;

  // Selectors
  getModel: (modelId: string) => TransformersModelState | undefined;
  getLoadedModels: () => TransformersModelState[];
  getDownloadingModels: () => TransformersModelState[];
  isModelReady: (modelId: string) => boolean;

  // Reset
  reset: () => void;
}

export const useTransformersStore = create<TransformersState>()(
  persist(
    (set, get) => ({
      settings: { ...DEFAULT_SETTINGS },
      models: [],
      isWebGPUAvailable: false,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      setWebGPUAvailable: (available) =>
        set({ isWebGPUAvailable: available }),

      setModelStatus: (modelId, task, status, progress = 0, error) =>
        set((state) => {
          const existingIndex = state.models.findIndex((m) => m.modelId === modelId);
          const newModel: TransformersModelState = {
            modelId,
            task,
            status,
            progress,
            error,
            loadedAt: status === 'ready' ? Date.now() : undefined,
          };

          if (existingIndex >= 0) {
            const updated = [...state.models];
            updated[existingIndex] = { ...updated[existingIndex], ...newModel };
            return { models: updated };
          }

          return { models: [...state.models, newModel] };
        }),

      updateModelProgress: (progress) =>
        set((state) => {
          const existingIndex = state.models.findIndex(
            (m) => m.modelId === progress.modelId
          );

          if (existingIndex >= 0) {
            const updated = [...state.models];
            updated[existingIndex] = {
              ...updated[existingIndex],
              status: progress.status === 'ready' ? 'ready' : progress.status === 'error' ? 'error' : 'downloading',
              progress: progress.progress,
              error: progress.error,
              loadedAt: progress.status === 'ready' ? Date.now() : updated[existingIndex].loadedAt,
            };
            return { models: updated };
          }

          return state;
        }),

      removeModel: (modelId) =>
        set((state) => ({
          models: state.models.filter((m) => m.modelId !== modelId),
        })),

      clearAllModels: () => set({ models: [] }),

      getModel: (modelId) => get().models.find((m) => m.modelId === modelId),

      getLoadedModels: () => get().models.filter((m) => m.status === 'ready'),

      getDownloadingModels: () =>
        get().models.filter((m) => m.status === 'downloading' || m.status === 'loading'),

      isModelReady: (modelId) => {
        const model = get().models.find((m) => m.modelId === modelId);
        return model?.status === 'ready';
      },

      reset: () =>
        set({
          settings: { ...DEFAULT_SETTINGS },
          models: [],
        }),
    }),
    {
      name: 'cognia-transformers',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        // Only persist model metadata, not transient download state
        models: state.models
          .filter((m) => m.status === 'ready')
          .map((m) => ({ ...m, progress: 100 })),
      }),
    }
  )
);
