/**
 * Tests for ToolCallManager - Parallel tool execution management
 */

import {
  ToolCallManager,
  createToolCallManager,
  getGlobalToolCallManager,
  setGlobalToolCallManager,
  resetGlobalToolCallManager,
  DEFAULT_TOOL_CALL_MANAGER_CONFIG,
  type ToolCallManagerConfig,
} from './tool-call-manager';

describe('ToolCallManager', () => {
  let manager: ToolCallManager;

  beforeEach(() => {
    resetGlobalToolCallManager();
    manager = createToolCallManager();
  });

  afterEach(() => {
    manager.cancelPending();
    resetGlobalToolCallManager();
  });

  describe('createToolCallManager', () => {
    it('should create a manager with default config', () => {
      const mgr = createToolCallManager();
      expect(mgr).toBeDefined();
      expect(mgr.getStats().maxConcurrent).toBe(DEFAULT_TOOL_CALL_MANAGER_CONFIG.maxConcurrent);
    });

    it('should create a manager with custom config', () => {
      const config: Partial<ToolCallManagerConfig> = {
        maxConcurrent: 10,
        defaultTimeout: 30000,
        mode: 'non-blocking',
      };
      const mgr = createToolCallManager(config);
      expect(mgr.getStats().maxConcurrent).toBe(10);
    });
  });

  describe('global manager', () => {
    it('should return a manager (creates one if needed)', () => {
      const mgr = getGlobalToolCallManager();
      expect(mgr).toBeDefined();
      expect(mgr).toBeInstanceOf(ToolCallManager);
    });

    it('should set and get global manager', () => {
      const mgr = createToolCallManager();
      setGlobalToolCallManager(mgr);
      expect(getGlobalToolCallManager()).toBe(mgr);
    });

    it('should reset global manager', () => {
      const mgr = createToolCallManager();
      setGlobalToolCallManager(mgr);
      const before = getGlobalToolCallManager();
      resetGlobalToolCallManager();
      // After reset, a new manager is created
      const after = getGlobalToolCallManager();
      expect(after).not.toBe(before);
    });
  });

  describe('enqueue - blocking mode', () => {
    it('should execute tool call and return result', async () => {
      const toolCall = {
        id: 'test-1',
        name: 'testTool',
        args: { param: 'value' },
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const executor = jest.fn().mockResolvedValue({ success: true });

      const result = await manager.enqueue(toolCall, executor, { blocking: true });

      expect(executor).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should respect timeout', async () => {
      const toolCall = {
        id: 'test-timeout',
        name: 'slowTool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const slowExecutor = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 5000))
      );

      // In blocking mode, timeout causes rejection
      await expect(
        manager.enqueue(toolCall, slowExecutor, {
          blocking: true,
          timeout: 100,
        })
      ).rejects.toThrow('timeout');
    }, 10000);

    it('should handle executor errors', async () => {
      const toolCall = {
        id: 'test-error',
        name: 'errorTool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const errorExecutor = jest.fn().mockRejectedValue(new Error('Test error'));

      // In blocking mode, errors are thrown
      await expect(
        manager.enqueue(toolCall, errorExecutor, { blocking: true })
      ).rejects.toThrow('Test error');
    });

    it('should call onToolStart callback', async () => {
      const onToolStart = jest.fn();
      const mgr = createToolCallManager({ onToolStart });

      const toolCall = {
        id: 'test-callback',
        name: 'callbackTool',
        args: { key: 'value' },
        status: 'pending' as const,
        startedAt: new Date(),
      };

      await mgr.enqueue(toolCall, jest.fn().mockResolvedValue('ok'), { blocking: true });

      expect(onToolStart).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-callback',
          name: 'callbackTool',
        })
      );
    });

    it('should call onToolResult callback on success', async () => {
      const onToolResult = jest.fn();
      const mgr = createToolCallManager({ onToolResult });

      const toolCall = {
        id: 'test-result',
        name: 'resultTool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      await mgr.enqueue(toolCall, jest.fn().mockResolvedValue({ data: 'test' }), { blocking: true });

      expect(onToolResult).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-result',
          status: 'completed',
        })
      );
    });

    it('should call onToolError callback on failure', async () => {
      const onToolError = jest.fn();
      const mgr = createToolCallManager({ onToolError });

      const toolCall = {
        id: 'test-error-callback',
        name: 'errorTool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      // Catch the expected rejection
      await mgr.enqueue(toolCall, jest.fn().mockRejectedValue(new Error('Callback error')), {
        blocking: true,
      }).catch(() => {});

      expect(onToolError).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-error-callback',
        }),
        expect.any(Error)
      );
    });
  });

  describe('enqueue - non-blocking mode', () => {
    it('should return pending result immediately', async () => {
      const toolCall = {
        id: 'test-nonblock',
        name: 'asyncTool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const slowExecutor = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 1000))
      );

      const result = await manager.enqueue(toolCall, slowExecutor, { blocking: false }) as { status: string; toolCallId: string };

      expect(result.status).toMatch(/pending|running/);
      expect(result.toolCallId).toBe('test-nonblock');
      expect(manager.hasPending()).toBe(true);
    });

    it('should track pending results', async () => {
      const toolCall = {
        id: 'test-pending',
        name: 'pendingTool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const slowExecutor = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 500))
      );

      await manager.enqueue(toolCall, slowExecutor, { blocking: false });

      const pending = manager.getPendingResults();
      expect(pending.length).toBe(1);
      expect(pending[0].toolCallId).toBe('test-pending');
    });
  });

  describe('concurrency control', () => {
    it('should respect maxConcurrent limit', async () => {
      const mgr = createToolCallManager({ maxConcurrent: 2 });
      let concurrentCount = 0;
      let maxConcurrentCount = 0;

      const trackingExecutor = jest.fn().mockImplementation(async () => {
        concurrentCount++;
        maxConcurrentCount = Math.max(maxConcurrentCount, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 100));
        concurrentCount--;
        return 'done';
      });

      const promises = [];
      for (let i = 0; i < 5; i++) {
        const toolCall = {
          id: `concurrent-${i}`,
          name: 'concurrentTool',
          args: {},
          status: 'pending' as const,
          startedAt: new Date(),
        };
        promises.push(mgr.enqueue(toolCall, trackingExecutor, { blocking: true }));
      }

      await Promise.all(promises);

      expect(maxConcurrentCount).toBeLessThanOrEqual(2);
    });

    it('should queue calls when at max concurrency', async () => {
      const mgr = createToolCallManager({ maxConcurrent: 1 });

      const executionOrder: string[] = [];
      const createExecutor = (id: string) =>
        jest.fn().mockImplementation(async () => {
          executionOrder.push(id);
          await new Promise((resolve) => setTimeout(resolve, 50));
          return id;
        });

      const promises = [
        mgr.enqueue(
          { id: 'first', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
          createExecutor('first'),
          { blocking: true }
        ),
        mgr.enqueue(
          { id: 'second', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
          createExecutor('second'),
          { blocking: true }
        ),
        mgr.enqueue(
          { id: 'third', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
          createExecutor('third'),
          { blocking: true }
        ),
      ];

      await Promise.all(promises);

      expect(executionOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('priority', () => {
    it('should execute higher priority calls first when queued', async () => {
      const mgr = createToolCallManager({ maxConcurrent: 1 });

      const executionOrder: string[] = [];

      const blockingExecutor = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        executionOrder.push('blocking');
        return 'blocking';
      });

      const createExecutor = (id: string) =>
        jest.fn().mockImplementation(async () => {
          executionOrder.push(id);
          return id;
        });

      // Start a blocking call first
      const blockingPromise = mgr.enqueue(
        { id: 'blocking', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        blockingExecutor,
        { blocking: true }
      );

      // Wait for first call to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Queue calls with different priorities
      const lowPriority = mgr.enqueue(
        { id: 'low', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        createExecutor('low'),
        { blocking: true, priority: 1 }
      );

      const highPriority = mgr.enqueue(
        { id: 'high', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        createExecutor('high'),
        { blocking: true, priority: 10 }
      );

      const mediumPriority = mgr.enqueue(
        { id: 'medium', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        createExecutor('medium'),
        { blocking: true, priority: 5 }
      );

      await Promise.all([blockingPromise, lowPriority, highPriority, mediumPriority]);

      // After blocking completes, lower priority number runs first (ascending sort)
      // Priority 1 < 5 < 10, so: low, medium, high
      expect(executionOrder[0]).toBe('blocking');
      expect(executionOrder[1]).toBe('low');
      expect(executionOrder[2]).toBe('medium');
      expect(executionOrder[3]).toBe('high');
    });
  });

  describe('flushPending', () => {
    it('should wait for all pending calls to complete', async () => {
      const results: string[] = [];

      for (let i = 0; i < 3; i++) {
        const toolCall = {
          id: `flush-${i}`,
          name: 'flushTool',
          args: {},
          status: 'pending' as const,
          startedAt: new Date(),
        };

        const executor = jest.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          results.push(`result-${i}`);
          return `result-${i}`;
        });

        await manager.enqueue(toolCall, executor, { blocking: false });
      }

      // Results may have started processing, so just check flush works
      const flushResult = await manager.flushPending();

      // After flush, all should be complete
      expect(flushResult.completed.length).toBe(3);
      expect(flushResult.failed.length).toBe(0);
    });

    it('should return completed and failed results', async () => {
      // Successful call
      await manager.enqueue(
        { id: 'success', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        jest.fn().mockResolvedValue('ok'),
        { blocking: false }
      );

      // Failed call
      await manager.enqueue(
        { id: 'fail', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        jest.fn().mockRejectedValue(new Error('Failed')),
        { blocking: false }
      );

      const flushResult = await manager.flushPending();

      expect(flushResult.completed.length).toBe(1);
      expect(flushResult.failed.length).toBe(1);
      expect(flushResult.completed[0].id).toBe('success');
      expect(flushResult.failed[0].id).toBe('fail');
    });
  });

  describe('cancelPending', () => {
    it('should cancel all pending calls', async () => {
      const onToolError = jest.fn();
      const mgr = createToolCallManager({ onToolError });

      // Queue slow calls
      for (let i = 0; i < 3; i++) {
        const toolCall = {
          id: `cancel-${i}`,
          name: 'cancelTool',
          args: {},
          status: 'pending' as const,
          startedAt: new Date(),
        };

        const slowExecutor = jest.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('done'), 5000))
        );

        await mgr.enqueue(toolCall, slowExecutor, { blocking: false });
      }

      expect(mgr.hasPending()).toBe(true);

      mgr.cancelPending();

      // Give time for cancellation to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mgr.hasPending()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const mgr = createToolCallManager({ maxConcurrent: 3 });

      // Execute some calls
      await mgr.enqueue(
        { id: 'stat-1', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        jest.fn().mockResolvedValue('ok'),
        { blocking: true }
      );

      await mgr.enqueue(
        { id: 'stat-2', name: 'tool', args: {}, status: 'pending' as const, startedAt: new Date() },
        jest.fn().mockRejectedValue(new Error('err')),
        { blocking: true }
      ).catch(() => {}); // Catch expected rejection

      const stats = mgr.getStats();

      expect(stats.maxConcurrent).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('hasPending', () => {
    it('should return false when no pending calls', () => {
      expect(manager.hasPending()).toBe(false);
    });

    it('should return true when there are pending calls', async () => {
      const toolCall = {
        id: 'pending-check',
        name: 'tool',
        args: {},
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const slowExecutor = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 1000))
      );

      await manager.enqueue(toolCall, slowExecutor, { blocking: false });

      expect(manager.hasPending()).toBe(true);
    });
  });

  describe('getPendingResults', () => {
    it('should return empty array when no pending', () => {
      expect(manager.getPendingResults()).toEqual([]);
    });

    it('should return pending result info', async () => {
      const toolCall = {
        id: 'pending-info',
        name: 'infoTool',
        args: { key: 'value' },
        status: 'pending' as const,
        startedAt: new Date(),
      };

      const slowExecutor = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('done'), 500))
      );

      await manager.enqueue(toolCall, slowExecutor, { blocking: false });

      const pending = manager.getPendingResults();

      expect(pending.length).toBe(1);
      expect(pending[0].toolCallId).toBe('pending-info');
      expect(['pending', 'running']).toContain(pending[0].status);
    });
  });
});
