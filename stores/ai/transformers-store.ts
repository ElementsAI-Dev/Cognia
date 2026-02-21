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
  TransformersWorkerStatusData,
} from '@/types/transformers';
import { buildTransformersModelCacheKey } from '@/types/transformers';

const DEFAULT_SETTINGS: TransformersSettings = {
  enabled: false,
  preferWebGPU: true,
  defaultDtype: 'q8',
  cacheModels: true,
  maxCachedModels: 5,
};

function mapProgressStatusToModelStatus(
  status: ModelDownloadProgress['status']
): TransformersModelState['status'] {
  if (status === 'ready') return 'ready';
  if (status === 'error') return 'error';
  if (status === 'loading') return 'loading';
  return 'downloading';
}

export interface TransformersState {
  settings: TransformersSettings;
  models: TransformersModelState[];
  isWebGPUAvailable: boolean;

  // Actions
  updateSettings: (updates: Partial<TransformersSettings>) => void;
  setWebGPUAvailable: (available: boolean) => void;

  // Model state management
  setModelStatus: (
    task: TransformersTask,
    modelId: string,
    status: TransformersModelState['status'],
    progress?: number,
    error?: string
  ) => void;
  updateModelProgress: (progress: ModelDownloadProgress) => void;
  removeModel: (task: TransformersTask, modelId: string) => void;
  clearAllModels: () => void;
  syncModelsFromStatus: (status: TransformersWorkerStatusData) => void;

  // Selectors
  getModel: (task: TransformersTask, modelId: string) => TransformersModelState | undefined;
  getLoadedModels: () => TransformersModelState[];
  getDownloadingModels: () => TransformersModelState[];
  isModelReady: (task: TransformersTask, modelId: string) => boolean;

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

      setModelStatus: (task, modelId, status, progress = 0, error) =>
        set((state) => {
          const cacheKey = buildTransformersModelCacheKey(task, modelId);
          const existingIndex = state.models.findIndex((m) => m.cacheKey === cacheKey);
          const now = Date.now();
          const existing = existingIndex >= 0 ? state.models[existingIndex] : undefined;

          const newModel: TransformersModelState = {
            cacheKey,
            modelId,
            task,
            status,
            progress,
            error,
            loadedAt: status === 'ready' ? existing?.loadedAt ?? now : existing?.loadedAt,
            lastUsedAt: existing?.lastUsedAt,
            hitCount: existing?.hitCount,
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
          const cacheKey = buildTransformersModelCacheKey(progress.task, progress.modelId);
          const existingIndex = state.models.findIndex((m) => m.cacheKey === cacheKey);

          if (existingIndex >= 0) {
            const updated = [...state.models];
            const now = Date.now();
            updated[existingIndex] = {
              ...updated[existingIndex],
              status: mapProgressStatusToModelStatus(progress.status),
              progress: progress.progress,
              error: progress.error,
              loadedAt:
                progress.status === 'ready'
                  ? updated[existingIndex].loadedAt ?? now
                  : updated[existingIndex].loadedAt,
            };
            return { models: updated };
          }

          return {
            models: [
              ...state.models,
              {
                cacheKey,
                task: progress.task,
                modelId: progress.modelId,
                status: mapProgressStatusToModelStatus(progress.status),
                progress: progress.progress,
                error: progress.error,
                loadedAt: progress.status === 'ready' ? Date.now() : undefined,
              },
            ],
          };
        }),

      removeModel: (task, modelId) =>
        set((state) => ({
          models: state.models.filter(
            (m) => m.cacheKey !== buildTransformersModelCacheKey(task, modelId)
          ),
        })),

      clearAllModels: () => set({ models: [] }),

      syncModelsFromStatus: (status) =>
        set((state) => {
          const runtimeReadyModels: TransformersModelState[] = status.loadedModels.map((model) => ({
            cacheKey: model.cacheKey,
            task: model.task,
            modelId: model.modelId,
            status: 'ready',
            progress: 100,
            loadedAt: model.loadedAt,
            lastUsedAt: model.lastUsedAt,
            hitCount: model.hitCount,
          }));

          const runtimeReadyKeys = new Set(runtimeReadyModels.map((model) => model.cacheKey));
          const nonReadyModels = state.models.filter(
            (model) => model.status !== 'ready' && !runtimeReadyKeys.has(model.cacheKey)
          );

          return {
            models: [...nonReadyModels, ...runtimeReadyModels],
          };
        }),

      getModel: (task, modelId) =>
        get().models.find((m) => m.cacheKey === buildTransformersModelCacheKey(task, modelId)),

      getLoadedModels: () => get().models.filter((m) => m.status === 'ready'),

      getDownloadingModels: () =>
        get().models.filter((m) => m.status === 'downloading' || m.status === 'loading'),

      isModelReady: (task, modelId) => {
        const model = get().models.find(
          (m) => m.cacheKey === buildTransformersModelCacheKey(task, modelId)
        );
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
