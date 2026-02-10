/**
 * TransformersManager tests
 * Tests the Web Worker manager for browser-based ML inference.
 */

import { TransformersManager, isWebGPUAvailable, isWebWorkerAvailable } from './transformers-manager';

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners = new Map<string, Array<(event: unknown) => void>>();

  postMessage(data: unknown) {
    // Simulate async worker response
    const msg = data as { id: string; type: string; payload: Record<string, unknown> };
    setTimeout(() => {
      if (msg.type === 'load') {
        // Send progress then loaded
        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'progress', progress: { modelId: msg.payload.modelId, status: 'downloading', progress: 50 } },
        });
        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'loaded', data: { task: msg.payload.task, modelId: msg.payload.modelId }, duration: 100 },
        });
      } else if (msg.type === 'infer') {
        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'result', data: [{ label: 'POSITIVE', score: 0.99 }], duration: 50 },
        });
      } else if (msg.type === 'dispose') {
        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'result', data: { disposed: true } },
        });
      } else if (msg.type === 'status') {
        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'status', data: { loadedModels: [], count: 0 } },
        });
      }
    }, 10);
  }

  addEventListener(type: string, listener: (event: unknown) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: (event: unknown) => void) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    }
  }

  terminate() {
    this.listeners.clear();
  }

  private dispatchEvent(type: string, event: unknown) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }
}

// Mock Worker constructor
const originalWorker = globalThis.Worker;
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Worker = MockWorker;
});

afterAll(() => {
  globalThis.Worker = originalWorker;
});

afterEach(() => {
  // Terminate any existing instance
  try {
    TransformersManager.getInstance().terminate();
  } catch {
    // Already terminated
  }
});

describe('TransformersManager', () => {
  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = TransformersManager.getInstance();
      const b = TransformersManager.getInstance();
      expect(a).toBe(b);
    });

    it('creates new instance after terminate', () => {
      const a = TransformersManager.getInstance();
      a.terminate();
      const b = TransformersManager.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('loadModel', () => {
    it('loads a model and returns task/modelId/duration', async () => {
      const manager = TransformersManager.getInstance();
      const result = await manager.loadModel('text-classification', 'Xenova/test-model');
      expect(result.task).toBe('text-classification');
      expect(result.modelId).toBe('Xenova/test-model');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('calls onProgress callback during loading', async () => {
      const manager = TransformersManager.getInstance();
      const progressCalls: unknown[] = [];
      await manager.loadModel('text-classification', 'Xenova/test-model', {
        onProgress: (p) => progressCalls.push(p),
      });
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('infer', () => {
    it('runs inference and returns result', async () => {
      const manager = TransformersManager.getInstance();
      const result = await manager.infer(
        'text-classification',
        'Xenova/test-model',
        'I love this!'
      );
      expect(result.task).toBe('text-classification');
      expect(result.modelId).toBe('Xenova/test-model');
      expect(result.output).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('dispose', () => {
    it('disposes a specific model', async () => {
      const manager = TransformersManager.getInstance();
      await expect(
        manager.dispose('text-classification', 'Xenova/test-model')
      ).resolves.not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('returns status when no worker exists', async () => {
      const manager = TransformersManager.getInstance();
      const status = await manager.getStatus();
      expect(status).toEqual({ loadedModels: [], count: 0 });
    });
  });

  describe('terminate', () => {
    it('terminates worker and cleans up', () => {
      const manager = TransformersManager.getInstance();
      expect(() => manager.terminate()).not.toThrow();
    });

    it('rejects pending requests on terminate', async () => {
      const manager = TransformersManager.getInstance();
      // Start a load (won't resolve instantly)
      const loadPromise = manager.loadModel('text-classification', 'Xenova/test-model');
      // Immediately terminate
      manager.terminate();
      await expect(loadPromise).rejects.toThrow('Manager terminated');
    });
  });

  describe('setProgressCallback', () => {
    it('calls global progress callback', async () => {
      const manager = TransformersManager.getInstance();
      const calls: unknown[] = [];
      manager.setProgressCallback((p) => calls.push(p));
      await manager.loadModel('text-classification', 'Xenova/test-model');
      expect(calls.length).toBeGreaterThan(0);
      manager.setProgressCallback(null);
    });
  });
});

describe('utility functions', () => {
  it('isWebGPUAvailable returns boolean', () => {
    expect(typeof isWebGPUAvailable()).toBe('boolean');
  });

  it('isWebWorkerAvailable returns true in test env', () => {
    expect(isWebWorkerAvailable()).toBe(true);
  });
});
