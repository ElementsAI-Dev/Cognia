/**
 * TransformersManager tests
 */

import { TransformersManager, isWebGPUAvailable, isWebWorkerAvailable } from './transformers-manager';

const workerBehavior = {
  delayMs: 10,
  noResponseTypes: new Set<string>(),
};

class MockWorker {
  private listeners = new Map<string, Array<(event: unknown) => void>>();
  private loaded = new Set<string>();

  postMessage(data: unknown) {
    const msg = data as {
      id: string;
      type: 'load' | 'infer' | 'dispose' | 'status';
      payload: {
        task?: string;
        modelId?: string;
        input?: unknown;
      };
    };

    if (workerBehavior.noResponseTypes.has(msg.type)) {
      return;
    }

    setTimeout(() => {
      if (msg.type === 'load') {
        this.dispatchEvent('message', {
          data: {
            id: msg.id,
            type: 'progress',
            progress: {
              task: msg.payload.task,
              modelId: msg.payload.modelId,
              status: 'downloading',
              progress: 50,
            },
          },
        });

        const key = `${msg.payload.task}::${msg.payload.modelId}`;
        this.loaded.add(key);
        this.dispatchEvent('message', {
          data: {
            id: msg.id,
            type: 'loaded',
            data: { task: msg.payload.task, modelId: msg.payload.modelId },
            duration: 100,
          },
        });
        return;
      }

      if (msg.type === 'infer') {
        let data: unknown = [{ label: 'POSITIVE', score: 0.99 }];

        if (msg.payload.task === 'feature-extraction') {
          if (Array.isArray(msg.payload.input)) {
            data = (msg.payload.input as string[]).map((_, index) => [index + 0.1, index + 0.2]);
          } else {
            data = [0.1, 0.2, 0.3];
          }
        }

        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'result', data, duration: 50 },
        });
        return;
      }

      if (msg.type === 'dispose') {
        if (msg.payload.task && msg.payload.modelId) {
          this.loaded.delete(`${msg.payload.task}::${msg.payload.modelId}`);
        } else {
          this.loaded.clear();
        }
        this.dispatchEvent('message', {
          data: { id: msg.id, type: 'result', data: { disposed: true } },
        });
        return;
      }

      if (msg.type === 'status') {
        const loadedModels = Array.from(this.loaded).map((entry, index) => {
          const [task, modelId] = entry.split('::');
          return {
            cacheKey: entry,
            task,
            modelId,
            loadedAt: Date.now() - 1000,
            lastUsedAt: Date.now() - 100 * index,
            hitCount: index + 1,
          };
        });

        this.dispatchEvent('message', {
          data: {
            id: msg.id,
            type: 'status',
            data: {
              loadedModels,
              count: loadedModels.length,
              cache: {
                enabled: true,
                maxCachedModels: 5,
                currentCachedModels: loadedModels.length,
              },
            },
          },
        });
      }
    }, workerBehavior.delayMs);
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
    this.loaded.clear();
  }

  private dispatchEvent(type: string, event: unknown) {
    const listeners = this.listeners.get(type);
    if (!listeners) return;
    for (const listener of listeners) {
      listener(event);
    }
  }
}

const originalWorker = globalThis.Worker;

beforeAll(() => {
  (globalThis as { Worker: typeof Worker }).Worker = MockWorker as unknown as typeof Worker;
});

afterAll(() => {
  globalThis.Worker = originalWorker;
});

afterEach(() => {
  workerBehavior.noResponseTypes.clear();
  workerBehavior.delayMs = 10;
  try {
    TransformersManager.getInstance().terminate();
  } catch {
    // ignore
  }
});

describe('TransformersManager', () => {
  it('returns singleton instance', () => {
    const a = TransformersManager.getInstance();
    const b = TransformersManager.getInstance();
    expect(a).toBe(b);
  });

  it('loads a model and emits progress', async () => {
    const manager = TransformersManager.getInstance();
    const progressCalls: unknown[] = [];

    const result = await manager.loadModel('text-classification', 'Xenova/test-model', {
      onProgress: (progress) => progressCalls.push(progress),
    });

    expect(result.task).toBe('text-classification');
    expect(result.modelId).toBe('Xenova/test-model');
    expect(progressCalls.length).toBeGreaterThan(0);
  });

  it('runs inference with auto-load', async () => {
    const manager = TransformersManager.getInstance();

    const result = await manager.infer('text-classification', 'Xenova/test-model', 'I love this!');

    expect(result.task).toBe('text-classification');
    expect(result.modelId).toBe('Xenova/test-model');
    expect(result.output).toBeDefined();
  });

  it('supports batched embeddings and batch callbacks', async () => {
    const manager = TransformersManager.getInstance();
    const batchCalls: Array<{ batchIndex: number; totalBatches: number; processed: number; total: number }> = [];

    const result = await manager.generateEmbeddings(['a', 'b', 'c'], 'Xenova/all-MiniLM-L6-v2', {
      batchSize: 2,
      onBatchComplete: (batch) => batchCalls.push(batch),
    });

    expect(result.embeddings).toHaveLength(3);
    expect(batchCalls.length).toBe(2);
    expect(batchCalls[0].processed).toBe(2);
    expect(batchCalls[1].processed).toBe(3);
  });

  it('disposeAll clears loaded status', async () => {
    const manager = TransformersManager.getInstance();

    await manager.loadModel('text-classification', 'Xenova/test-model');
    let status = await manager.getStatus();
    expect(status.count).toBe(1);

    await manager.disposeAll();
    status = await manager.getStatus();
    expect(status.count).toBe(0);
  });

  it('returns default status when worker is not initialized', async () => {
    const manager = TransformersManager.getInstance();
    const status = await manager.getStatus();

    expect(status).toEqual({
      loadedModels: [],
      count: 0,
      cache: {
        enabled: true,
        maxCachedModels: 5,
        currentCachedModels: 0,
      },
    });
  });

  it('times out requests with normalized error code', async () => {
    const manager = TransformersManager.getInstance();
    await manager.loadModel('text-classification', 'Xenova/test-model', { timeoutMs: 100 });
    manager.setRuntimeSettings({ requestTimeoutMs: 5 });
    workerBehavior.noResponseTypes.add('status');

    await expect(manager.getStatus()).rejects.toMatchObject({
      code: 'request_timeout',
    });
  });

  it('rejects pending requests on terminate', async () => {
    const manager = TransformersManager.getInstance();
    workerBehavior.delayMs = 100;

    const pending = manager.loadModel('text-classification', 'Xenova/test-model');
    manager.terminate();

    await expect(pending).rejects.toThrow('Manager terminated');
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
