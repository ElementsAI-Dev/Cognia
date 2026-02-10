/**
 * Transformers Store tests
 */

import { useTransformersStore } from './transformers-store';

// Reset store before each test
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
      expect(settings.preferWebGPU).toBe(true); // unchanged
    });

    it('updates multiple settings at once', () => {
      useTransformersStore.getState().updateSettings({
        enabled: true,
        defaultDtype: 'fp16',
        maxCachedModels: 10,
      });
      const { settings } = useTransformersStore.getState();
      expect(settings.enabled).toBe(true);
      expect(settings.defaultDtype).toBe('fp16');
      expect(settings.maxCachedModels).toBe(10);
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
    it('starts with no models', () => {
      expect(useTransformersStore.getState().models).toHaveLength(0);
    });

    it('adds a new model via setModelStatus', () => {
      useTransformersStore.getState().setModelStatus(
        'Xenova/test-model',
        'text-classification',
        'downloading',
        25
      );
      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(1);
      expect(models[0].modelId).toBe('Xenova/test-model');
      expect(models[0].task).toBe('text-classification');
      expect(models[0].status).toBe('downloading');
      expect(models[0].progress).toBe(25);
    });

    it('updates existing model status', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('Xenova/test-model', 'text-classification', 'downloading', 25);
      store.setModelStatus('Xenova/test-model', 'text-classification', 'ready', 100);

      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(1);
      expect(models[0].status).toBe('ready');
      expect(models[0].progress).toBe(100);
      expect(models[0].loadedAt).toBeDefined();
    });

    it('sets loadedAt only when status is ready', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('Xenova/test-model', 'text-classification', 'downloading', 50);
      expect(useTransformersStore.getState().models[0].loadedAt).toBeUndefined();

      store.setModelStatus('Xenova/test-model', 'text-classification', 'ready', 100);
      expect(useTransformersStore.getState().models[0].loadedAt).toBeDefined();
    });

    it('sets error on model', () => {
      useTransformersStore.getState().setModelStatus(
        'Xenova/bad-model',
        'text-classification',
        'error',
        0,
        'Model not found'
      );
      const model = useTransformersStore.getState().models[0];
      expect(model.status).toBe('error');
      expect(model.error).toBe('Model not found');
    });

    it('updates model via updateModelProgress', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('Xenova/test-model', 'text-classification', 'downloading', 0);

      store.updateModelProgress({
        modelId: 'Xenova/test-model',
        status: 'downloading',
        progress: 75,
      });

      const model = useTransformersStore.getState().models[0];
      expect(model.progress).toBe(75);
      expect(model.status).toBe('downloading');
    });

    it('removeModel removes a model', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('Xenova/model-a', 'text-classification', 'ready', 100);
      store.setModelStatus('Xenova/model-b', 'feature-extraction', 'ready', 100);

      store.removeModel('Xenova/model-a');
      const models = useTransformersStore.getState().models;
      expect(models).toHaveLength(1);
      expect(models[0].modelId).toBe('Xenova/model-b');
    });

    it('clearAllModels removes all models', () => {
      const store = useTransformersStore.getState();
      store.setModelStatus('Xenova/model-a', 'text-classification', 'ready', 100);
      store.setModelStatus('Xenova/model-b', 'feature-extraction', 'ready', 100);

      store.clearAllModels();
      expect(useTransformersStore.getState().models).toHaveLength(0);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const store = useTransformersStore.getState();
      store.setModelStatus('Xenova/ready-model', 'text-classification', 'ready', 100);
      store.setModelStatus('Xenova/downloading-model', 'feature-extraction', 'downloading', 50);
      store.setModelStatus('Xenova/loading-model', 'translation', 'loading', 80);
    });

    it('getModel returns the correct model', () => {
      const model = useTransformersStore.getState().getModel('Xenova/ready-model');
      expect(model).toBeDefined();
      expect(model!.status).toBe('ready');
    });

    it('getModel returns undefined for unknown model', () => {
      const model = useTransformersStore.getState().getModel('Xenova/unknown');
      expect(model).toBeUndefined();
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

    it('isModelReady returns true for ready model', () => {
      expect(useTransformersStore.getState().isModelReady('Xenova/ready-model')).toBe(true);
    });

    it('isModelReady returns false for non-ready model', () => {
      expect(useTransformersStore.getState().isModelReady('Xenova/downloading-model')).toBe(false);
    });

    it('isModelReady returns false for unknown model', () => {
      expect(useTransformersStore.getState().isModelReady('Xenova/unknown')).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets to defaults', () => {
      const store = useTransformersStore.getState();
      store.updateSettings({ enabled: true, defaultDtype: 'fp32' });
      store.setModelStatus('Xenova/test', 'text-classification', 'ready', 100);

      store.reset();

      const state = useTransformersStore.getState();
      expect(state.settings.enabled).toBe(false);
      expect(state.settings.defaultDtype).toBe('q8');
      expect(state.models).toHaveLength(0);
    });
  });
});
