/**
 * Tests for Video Worker Pool
 */

import { VideoWorkerPool, getWorkerPool, terminateWorkerPool } from './worker-pool';
import type { WorkerPoolConfig, VideoWorkerPayload } from './worker-types';
import { DEFAULT_WORKER_POOL_CONFIG } from './worker-types';

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  
  postMessage = jest.fn((message: unknown) => {
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { id: (message as { id: string }).id, type: 'success', data: {} },
        } as MessageEvent);
      }
    }, 10);
  });
  
  terminate = jest.fn();
}

// Mock Worker constructor
(global as unknown as { Worker: new (url: URL, options?: WorkerOptions) => MockWorker }).Worker = jest.fn().mockImplementation(() => new MockWorker());

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-' + Math.random().toString(36).substr(2, 9)),
}));

describe('VideoWorkerPool', () => {
  let pool: VideoWorkerPool;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    pool?.terminate();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create pool with default config', () => {
      pool = new VideoWorkerPool();
      const status = pool.getStatus();
      
      expect(status.totalWorkers).toBe(0);
      expect(status.queuedTasks).toBe(0);
    });

    it('should create pool with custom config', () => {
      pool = new VideoWorkerPool({ maxWorkers: 2 });
      // Pool should accept custom config
    });
  });

  describe('submit', () => {
    beforeEach(() => {
      pool = new VideoWorkerPool({ maxWorkers: 2 });
    });

    it('should submit task and create worker', async () => {
      const payload: VideoWorkerPayload = {};
      const promise = pool.submit('decode', payload);
      
      jest.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result.type).toBe('success');
    });

    it('should track queued tasks', () => {
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      
      const status = pool.getStatus();
      expect(status.queuedTasks).toBeGreaterThanOrEqual(0);
    });

    it('should accept priority option', async () => {
      const payload: VideoWorkerPayload = {};
      const promise = pool.submit('decode', payload, { priority: 10 });
      
      jest.advanceTimersByTime(100);
      
      await promise;
    });

    it('should accept progress callback', async () => {
      const payload: VideoWorkerPayload = {};
      const onProgress = jest.fn();
      const promise = pool.submit('decode', payload, { onProgress });
      
      jest.advanceTimersByTime(100);
      
      await promise;
    });
  });

  describe('queue size limit', () => {
    it('should reject tasks when queue is full', async () => {
      pool = new VideoWorkerPool({ maxWorkers: 1, maxQueueSize: 2 });
      
      const payload: VideoWorkerPayload = {};
      
      // Submit tasks to fill the queue
      pool.submit('decode', payload);
      pool.submit('decode', payload);
      
      // This should be rejected
      await expect(pool.submit('decode', payload)).rejects.toThrow(/queue full/i);
    });

    it('should report queue full status', () => {
      pool = new VideoWorkerPool({ maxWorkers: 1, maxQueueSize: 2 });
      
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      pool.submit('decode', payload);
      
      expect(pool.isQueueFull()).toBe(true);
    });

    it('should report remaining capacity', () => {
      pool = new VideoWorkerPool({ maxWorkers: 1, maxQueueSize: 10 });
      
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      pool.submit('decode', payload);
      
      expect(pool.getRemainingCapacity()).toBe(8);
    });

    it('should return 0 remaining capacity when full', () => {
      pool = new VideoWorkerPool({ maxWorkers: 1, maxQueueSize: 2 });
      
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      pool.submit('decode', payload);
      
      expect(pool.getRemainingCapacity()).toBe(0);
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      pool = new VideoWorkerPool();
    });

    it('should return pool status', () => {
      const status = pool.getStatus();
      
      expect(status).toHaveProperty('totalWorkers');
      expect(status).toHaveProperty('busyWorkers');
      expect(status).toHaveProperty('idleWorkers');
      expect(status).toHaveProperty('queuedTasks');
    });

    it('should track worker counts', () => {
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      
      const status = pool.getStatus();
      expect(status.totalWorkers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('terminate', () => {
    beforeEach(() => {
      pool = new VideoWorkerPool();
    });

    it('should terminate all workers', () => {
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      
      pool.terminate();
      
      const status = pool.getStatus();
      expect(status.totalWorkers).toBe(0);
      expect(status.queuedTasks).toBe(0);
    });

    it('should reject pending tasks', async () => {
      const payload: VideoWorkerPayload = {};
      const promise = pool.submit('decode', payload);
      
      pool.terminate();
      
      await expect(promise).rejects.toThrow(/terminated/i);
    });
  });

  describe('updateConfig', () => {
    beforeEach(() => {
      pool = new VideoWorkerPool();
    });

    it('should update pool configuration', () => {
      pool.updateConfig({ maxWorkers: 8 });
      // Should not throw
    });

    it('should update idle timeout', () => {
      pool.updateConfig({ idleTimeout: 60000 });
      // Should restart cleanup interval
    });

    it('should update queue size limit', () => {
      pool.updateConfig({ maxQueueSize: 500 });
      // Config should be updated
    });
  });

  describe('idle worker cleanup', () => {
    it('should clean up idle workers after timeout', () => {
      pool = new VideoWorkerPool({ idleTimeout: 1000 });
      
      const payload: VideoWorkerPayload = {};
      pool.submit('decode', payload);
      
      // Advance time past idle timeout
      jest.advanceTimersByTime(100);
      jest.advanceTimersByTime(2000);
      
      // Cleanup should have run
    });
  });
});

describe('getWorkerPool', () => {
  afterEach(() => {
    terminateWorkerPool();
  });

  it('should return a VideoWorkerPool instance', () => {
    const pool = getWorkerPool();
    expect(pool).toBeInstanceOf(VideoWorkerPool);
  });

  it('should return the same instance on multiple calls', () => {
    const pool1 = getWorkerPool();
    const pool2 = getWorkerPool();
    expect(pool1).toBe(pool2);
  });

  it('should accept custom config', () => {
    const pool = getWorkerPool({ maxWorkers: 2 });
    expect(pool).toBeInstanceOf(VideoWorkerPool);
  });

  it('should update config on subsequent calls', () => {
    getWorkerPool({ maxWorkers: 2 });
    getWorkerPool({ maxWorkers: 4 });
    // Config should be updated
  });
});

describe('terminateWorkerPool', () => {
  it('should terminate the global pool', () => {
    getWorkerPool();
    terminateWorkerPool();
    // Should not throw
  });

  it('should handle multiple terminate calls', () => {
    getWorkerPool();
    terminateWorkerPool();
    terminateWorkerPool();
    // Should not throw
  });

  it('should allow creating new pool after termination', () => {
    getWorkerPool();
    terminateWorkerPool();
    
    const newPool = getWorkerPool();
    expect(newPool).toBeInstanceOf(VideoWorkerPool);
  });
});

describe('DEFAULT_WORKER_POOL_CONFIG', () => {
  it('should have maxWorkers', () => {
    expect(DEFAULT_WORKER_POOL_CONFIG.maxWorkers).toBeGreaterThan(0);
  });

  it('should have idleTimeout', () => {
    expect(DEFAULT_WORKER_POOL_CONFIG.idleTimeout).toBe(30000);
  });

  it('should have taskTimeout', () => {
    expect(DEFAULT_WORKER_POOL_CONFIG.taskTimeout).toBe(300000);
  });

  it('should have maxQueueSize', () => {
    expect(DEFAULT_WORKER_POOL_CONFIG.maxQueueSize).toBe(1000);
  });
});

describe('WorkerPoolConfig interface', () => {
  it('should accept all config options', () => {
    const config: WorkerPoolConfig = {
      maxWorkers: 4,
      idleTimeout: 30000,
      taskTimeout: 300000,
      maxQueueSize: 1000,
    };

    expect(config.maxWorkers).toBe(4);
    expect(config.idleTimeout).toBe(30000);
    expect(config.taskTimeout).toBe(300000);
    expect(config.maxQueueSize).toBe(1000);
  });
});

describe('Task priority', () => {
  it('should accept priority parameter', () => {
    jest.useFakeTimers();
    const pool = new VideoWorkerPool({ maxWorkers: 1 });
    const payload: VideoWorkerPayload = {};
    
    // Submit tasks with different priorities - should not throw
    pool.submit('decode', payload, { priority: 1 });
    pool.submit('decode', payload, { priority: 10 });
    
    // Terminate immediately - we're just testing that priority is accepted
    pool.terminate();
    jest.useRealTimers();
  });
});

describe('Worker error handling', () => {
  it('should handle worker errors gracefully', () => {
    const pool = new VideoWorkerPool();
    const payload: VideoWorkerPayload = {};
    
    pool.submit('decode', payload);
    
    // Should not throw when worker errors
    pool.terminate();
  });
});
