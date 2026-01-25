/**
 * Video Worker Pool
 *
 * Manages a pool of Web Workers for parallel video processing.
 * Features:
 * - Dynamic worker allocation
 * - Task queuing with priority
 * - Automatic cleanup of idle workers
 * - Progress tracking
 */

import { nanoid } from 'nanoid';
import type {
  VideoWorkerMessage,
  VideoWorkerResponse,
  WorkerPoolConfig,
  WorkerInstance,
  WorkerTask,
  VideoOperationType,
  VideoWorkerPayload,
  ProgressCallback,
} from './worker-types';
import { DEFAULT_WORKER_POOL_CONFIG } from './worker-types';

/**
 * Video Worker Pool class
 */
export class VideoWorkerPool {
  private workers: Map<string, WorkerInstance> = new Map();
  private taskQueue: WorkerTask[] = [];
  private config: WorkerPoolConfig;
  private progressCallbacks: Map<string, ProgressCallback> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = { ...DEFAULT_WORKER_POOL_CONFIG, ...config };
    this.startCleanupInterval();
  }

  /**
   * Start the idle worker cleanup interval
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleWorkers();
    }, this.config.idleTimeout);
  }

  /**
   * Clean up idle workers
   */
  private cleanupIdleWorkers(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.workers.forEach((instance, id) => {
      if (
        instance.status === 'idle' &&
        now - instance.lastUsedAt > this.config.idleTimeout
      ) {
        toRemove.push(id);
      }
    });

    toRemove.forEach((id) => {
      const instance = this.workers.get(id);
      if (instance) {
        instance.worker.terminate();
        this.workers.delete(id);
      }
    });
  }

  /**
   * Create a new worker instance
   */
  private createWorker(): WorkerInstance {
    const id = nanoid();
    const worker = new Worker(new URL('./video-worker.ts', import.meta.url), {
      type: 'module',
    });

    const instance: WorkerInstance = {
      id,
      worker,
      status: 'idle',
      currentTaskId: null,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    worker.onmessage = (e: MessageEvent<VideoWorkerResponse>) => {
      this.handleWorkerResponse(id, e.data);
    };

    worker.onerror = (error) => {
      console.error(`Worker ${id} error:`, error);
      this.handleWorkerError(id, error);
    };

    this.workers.set(id, instance);
    return instance;
  }

  /**
   * Get an available worker or create a new one
   */
  private getAvailableWorker(): WorkerInstance | null {
    // First, try to find an idle worker
    for (const instance of this.workers.values()) {
      if (instance.status === 'idle') {
        return instance;
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.config.maxWorkers) {
      return this.createWorker();
    }

    return null;
  }

  /**
   * Handle response from worker
   */
  private handleWorkerResponse(workerId: string, response: VideoWorkerResponse): void {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    const taskId = instance.currentTaskId;
    if (!taskId) return;

    // Handle progress updates
    if (response.type === 'progress') {
      const callback = this.progressCallbacks.get(taskId);
      if (callback && response.progress !== undefined) {
        callback(response.progress);
      }
      return;
    }

    // Find and resolve the task
    const taskIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;

    const task = this.taskQueue[taskIndex];
    this.taskQueue.splice(taskIndex, 1);

    // Update worker status
    instance.status = 'idle';
    instance.currentTaskId = null;
    instance.lastUsedAt = Date.now();

    // Clean up progress callback
    this.progressCallbacks.delete(taskId);

    // Resolve or reject
    if (response.type === 'error') {
      task.reject(new Error(response.error || 'Unknown worker error'));
    } else {
      task.resolve(response);
    }

    // Process next task in queue
    this.processNextTask();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    const instance = this.workers.get(workerId);
    if (!instance) return;

    instance.status = 'error';

    const taskId = instance.currentTaskId;
    if (taskId) {
      const taskIndex = this.taskQueue.findIndex((t) => t.id === taskId);
      if (taskIndex !== -1) {
        const task = this.taskQueue[taskIndex];
        this.taskQueue.splice(taskIndex, 1);
        task.reject(new Error(error.message || 'Worker error'));
      }
      this.progressCallbacks.delete(taskId);
    }

    // Terminate and remove the errored worker
    instance.worker.terminate();
    this.workers.delete(workerId);

    // Process next task
    this.processNextTask();
  }

  /**
   * Process the next task in the queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length === 0) return;

    // Sort by priority (higher first) and creation time
    this.taskQueue.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });

    // Find tasks that are waiting (not assigned to a worker)
    const waitingTasks = this.taskQueue.filter(
      (t) => !Array.from(this.workers.values()).some((w) => w.currentTaskId === t.id)
    );

    if (waitingTasks.length === 0) return;

    const worker = this.getAvailableWorker();
    if (!worker) return;

    const task = waitingTasks[0];

    // Assign task to worker
    worker.status = 'busy';
    worker.currentTaskId = task.id;
    worker.lastUsedAt = Date.now();

    // Send message to worker
    const transferables: Transferable[] = [];
    if (task.message.payload.videoData) {
      transferables.push(task.message.payload.videoData);
    }
    if (task.message.payload.frameData?.data?.buffer) {
      transferables.push(task.message.payload.frameData.data.buffer);
    }

    if (transferables.length > 0) {
      worker.worker.postMessage(task.message, transferables);
    } else {
      worker.worker.postMessage(task.message);
    }

    // Set up timeout
    setTimeout(() => {
      if (worker.currentTaskId === task.id) {
        this.handleTaskTimeout(worker.id, task.id);
      }
    }, this.config.taskTimeout);
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(workerId: string, taskId: string): void {
    const instance = this.workers.get(workerId);
    if (!instance || instance.currentTaskId !== taskId) return;

    const taskIndex = this.taskQueue.findIndex((t) => t.id === taskId);
    if (taskIndex !== -1) {
      const task = this.taskQueue[taskIndex];
      this.taskQueue.splice(taskIndex, 1);
      task.reject(new Error('Task timeout'));
    }

    // Terminate and recreate worker
    instance.worker.terminate();
    this.workers.delete(workerId);

    this.progressCallbacks.delete(taskId);
    this.processNextTask();
  }

  /**
   * Submit a task to the worker pool
   */
  public submit(
    type: VideoOperationType,
    payload: VideoWorkerPayload,
    options: { priority?: number; onProgress?: ProgressCallback } = {}
  ): Promise<VideoWorkerResponse> {
    return new Promise((resolve, reject) => {
      const taskId = nanoid();

      const message: VideoWorkerMessage = {
        id: taskId,
        type,
        payload,
      };

      const task: WorkerTask = {
        id: taskId,
        message,
        priority: options.priority ?? 0,
        createdAt: Date.now(),
        resolve,
        reject,
      };

      if (options.onProgress) {
        this.progressCallbacks.set(taskId, options.onProgress);
      }

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  /**
   * Get the current status of the worker pool
   */
  public getStatus(): {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queuedTasks: number;
  } {
    let busyWorkers = 0;
    let idleWorkers = 0;

    this.workers.forEach((instance) => {
      if (instance.status === 'busy') {
        busyWorkers++;
      } else if (instance.status === 'idle') {
        idleWorkers++;
      }
    });

    return {
      totalWorkers: this.workers.size,
      busyWorkers,
      idleWorkers,
      queuedTasks: this.taskQueue.length,
    };
  }

  /**
   * Terminate all workers and clean up
   */
  public terminate(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Reject all pending tasks
    this.taskQueue.forEach((task) => {
      task.reject(new Error('Worker pool terminated'));
    });
    this.taskQueue = [];

    // Terminate all workers
    this.workers.forEach((instance) => {
      instance.worker.terminate();
    });
    this.workers.clear();

    this.progressCallbacks.clear();
  }

  /**
   * Update pool configuration
   */
  public updateConfig(config: Partial<WorkerPoolConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart cleanup interval if timeout changed
    if (config.idleTimeout !== undefined && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.startCleanupInterval();
    }
  }
}

// Singleton instance
let workerPoolInstance: VideoWorkerPool | null = null;

/**
 * Get the global worker pool instance
 */
export function getWorkerPool(config?: Partial<WorkerPoolConfig>): VideoWorkerPool {
  if (!workerPoolInstance) {
    workerPoolInstance = new VideoWorkerPool(config);
  } else if (config) {
    workerPoolInstance.updateConfig(config);
  }
  return workerPoolInstance;
}

/**
 * Terminate the global worker pool
 */
export function terminateWorkerPool(): void {
  if (workerPoolInstance) {
    workerPoolInstance.terminate();
    workerPoolInstance = null;
  }
}
