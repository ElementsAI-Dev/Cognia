/**
 * Transformers Store tests
 */

import { useTransformersStore } from './transformers-store';
import { buildTransformersModelCacheKey } from '@/types/transformers';

beforeEach(() => {
  useTransformersStore.getState().reset();
});

describe('useTransformersStore', () => {
  describe('settings', () => {
    it('has correct default settings', () => {
      const { settings } = useTransformersStore.getState();
      expect(settings.enabled).toBe(false);
      expect(settings.preferWebGPU).toBe(true);
      expect(settings.defaultDtype).toBe('q8');
      expect(settings.cacheModels).toBe(true);
      expect(settings.maxCachedModels).toBe(5);
    });

    it('updates settings partially', () => {
      useTransformersStore.getState().updateSettings({ enabled: true });
      const { settings } = useTransformersStore.getState();
      expect(settings.enabled).toBe(true);
      expect(settings.preferWebGPU).toBe(true);
    });
  });

  describe('WebGPU availability', () => {
    it('defaults to false', () => {
      expect(useTransformersStore.getState().isWebGPUAvailable).toBe(false);
    });

    it('can be set', () => {
      useTransformersStore.getState().setWebGPUAvailable(true);
      expect(useTransformersStore.getState().isWebGPUAvailable).toBe(true);
    });
  });

  describe('model state management', () => {
    it('uses composite cache key (task + modelId)', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/test-model', 'downloading', 25);

      const model = useTransformersStore.getState().models[0];
      expect(model.cacheKey).toBe(
        buildTransformersModelCacheKey('text-classification', 'Xenova/test-model')
      );
      expect(model.task).toBe('text-classification');
      expect(model.modelId).toBe('Xenova/test-model');
    });

    it('does not conflict same modelId across tasks', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/shared', 'ready', 100);
      store.setModelStatus('feature-extraction', 'Xenova/shared', 'downloading', 50);

      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(2);
      expect(store.isModelReady('text-classification', 'Xenova/shared')).toBe(true);
      expect(store.isModelReady('feature-extraction', 'Xenova/shared')).toBe(false);
    });

    it('updates existing model status by composite key', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/test-model', 'downloading', 25);
      store.setModelStatus('text-classification', 'Xenova/test-model', 'ready', 100);

      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(1);
      expect(models[0].status).toBe('ready');
      expect(models[0].loadedAt).toBeDefined();
    });

    it('updates model via updateModelProgress with task', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/test-model', 'downloading', 0);

      store.updateModelProgress({
        task: 'text-classification',
        modelId: 'Xenova/test-model',
        status: 'downloading',
        progress: 75,
      });

      const model = useTransformersStore.getState().models[0];
      expect(model.progress).toBe(75);
      expect(model.status).toBe('downloading');
    });

    it('removeModel removes only the targeted task+model entry', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/shared', 'ready', 100);
      store.setModelStatus('feature-extraction', 'Xenova/shared', 'ready', 100);

      store.removeModel('text-classification', 'Xenova/shared');

      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(1);
      expect(models[0].task).toBe('feature-extraction');
    });

    it('syncModelsFromStatus replaces ready runtime snapshots', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/stale', 'ready', 100);
      store.setModelStatus('translation', 'Xenova/downloading', 'downloading', 30);

      store.syncModelsFromStatus({
        loadedModels: [
          {
            cacheKey: buildTransformersModelCacheKey('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
            task: 'feature-extraction',
            modelId: 'Xenova/all-MiniLM-L6-v2',
            loadedAt: Date.now() - 1000,
            lastUsedAt: Date.now(),
            hitCount: 3,
          },
        ],
        count: 1,
        cache: {
          enabled: true,
          maxCachedModels: 5,
          currentCachedModels: 1,
        },
      });

      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(2);
      expect(store.getModel('feature-extraction', 'Xenova/all-MiniLM-L6-v2')?.status).toBe('ready');
      expect(store.getModel('translation', 'Xenova/downloading')?.status).toBe('downloading');
      expect(store.getModel('text-classification', 'Xenova/stale')).toBeUndefined();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const store = useTransformersStore.getState();
      store.setModelStatus('text-classification', 'Xenova/ready-model', 'ready', 100);
      store.setModelStatus('feature-extraction', 'Xenova/downloading-model', 'downloading', 50);
      store.setModelStatus('translation', 'Xenova/loading-model', 'loading', 80);
    });

    it('getModel returns the correct model', () => {
      const model = useTransformersStore
        .getState()
        .getModel('text-classification', 'Xenova/ready-model');
      expect(model).toBeDefined();
      expect(model!.status).toBe('ready');
    });

    it('getLoadedModels returns only ready models', () => {
      const loaded = useTransformersStore.getState().getLoadedModels();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].modelId).toBe('Xenova/ready-model');
    });

    it('getDownloadingModels returns downloading + loading models', () => {
      const downloading = useTransformersStore.getState().getDownloadingModels();
      expect(downloading).toHaveLength(2);
    });

    it('isModelReady returns correct status by task+model', () => {
      expect(
        useTransformersStore.getState().isModelReady('text-classification', 'Xenova/ready-model')
      ).toBe(true);
      expect(
        useTransformersStore.getState().isModelReady('feature-extraction', 'Xenova/downloading-model')
      ).toBe(false);
      expect(useTransformersStore.getState().isModelReady('translation', 'Xenova/unknown')).toBe(
        false
      );
    });
  });

  describe('reset', () => {
    it('resets to defaults', () => {
      const store = useTransformersStore.getState();
      store.updateSettings({ enabled: true, defaultDtype: 'fp32' });
      store.setModelStatus('text-classification', 'Xenova/test', 'ready', 100);

      store.reset();

      const state = useTransformersStore.getState();
      expect(state.settings.enabled).toBe(false);
      expect(state.settings.defaultDtype).toBe('q8');
      expect(state.models).toHaveLength(0);
    });
  });
});
