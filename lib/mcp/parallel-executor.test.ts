/**
 * MCP Parallel Tool Executor Tests
 */

import {
  ParallelToolExecutor,
  createParallelExecutor,
  type ToolExecutionRequest,
} from './parallel-executor';

describe('ParallelToolExecutor', () => {
  const mockCallTool = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ success: true, result: 'mock result' });
  });

  describe('constructor', () => {
    it('should create executor with default config', () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      const status = executor.getStatus();
      
      expect(status.running).toBe(0);
      expect(status.queued).toBe(0);
    });

    it('should create executor with custom config', () => {
      const executor = new ParallelToolExecutor(mockCallTool, {
        maxConcurrent: 10,
        timeout: 60000,
      });
      
      expect(executor).toBeDefined();
    });
  });

  describe('submit', () => {
    it('should execute tool and return result', async () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      
      const request: ToolExecutionRequest = {
        callId: 'call-1',
        serverId: 'server-1',
        toolName: 'test-tool',
        args: { input: 'test' },
      };

      const result = await executor.submit(request);

      expect(result.callId).toBe('call-1');
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockCallTool).toHaveBeenCalledWith('server-1', 'test-tool', { input: 'test' });
    });

    it('should handle tool execution failure', async () => {
      mockCallTool.mockRejectedValue(new Error('Tool failed'));
      const executor = new ParallelToolExecutor(mockCallTool);
      
      const request: ToolExecutionRequest = {
        callId: 'call-fail',
        serverId: 'server-1',
        toolName: 'failing-tool',
        args: {},
      };

      const result = await executor.submit(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should respect concurrency limit', async () => {
      const slowCallTool = jest.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50))
      );
      
      const executor = new ParallelToolExecutor(slowCallTool, { maxConcurrent: 2 });
      
      const requests = [
        { callId: 'call-1', serverId: 's1', toolName: 't1', args: {} },
        { callId: 'call-2', serverId: 's1', toolName: 't2', args: {} },
        { callId: 'call-3', serverId: 's1', toolName: 't3', args: {} },
      ];

      const promises = requests.map((req) => executor.submit(req));
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const status = executor.getStatus();
      expect(status.running).toBeLessThanOrEqual(2);

      await Promise.all(promises);
    });

    it('should process queued requests after completion', async () => {
      const callOrder: string[] = [];
      const slowCallTool = jest.fn().mockImplementation((serverId, toolName) => {
        callOrder.push(toolName);
        return Promise.resolve({ success: true });
      });
      
      const executor = new ParallelToolExecutor(slowCallTool, { maxConcurrent: 1 });
      
      const request1: ToolExecutionRequest = {
        callId: 'call-1',
        serverId: 'server-1',
        toolName: 'tool-1',
        args: {},
      };
      
      const request2: ToolExecutionRequest = {
        callId: 'call-2',
        serverId: 'server-1',
        toolName: 'tool-2',
        args: {},
      };

      await Promise.all([
        executor.submit(request1),
        executor.submit(request2),
      ]);

      expect(callOrder).toContain('tool-1');
      expect(callOrder).toContain('tool-2');
    });

    it('should respect priority in queue', async () => {
      const callOrder: string[] = [];
      const resolvers: Array<() => void> = [];
      
      const controlledCallTool = jest.fn().mockImplementation((serverId, toolName) => {
        callOrder.push(toolName);
        return new Promise<{ success: boolean }>((resolve) => {
          resolvers.push(() => resolve({ success: true }));
        });
      });
      
      const executor = new ParallelToolExecutor(controlledCallTool, { maxConcurrent: 1 });
      
      const lowPriority: ToolExecutionRequest = {
        callId: 'low',
        serverId: 's1',
        toolName: 'low-priority',
        args: {},
        priority: 1,
      };
      
      const highPriority: ToolExecutionRequest = {
        callId: 'high',
        serverId: 's1',
        toolName: 'high-priority',
        args: {},
        priority: 10,
      };
      
      const blocking: ToolExecutionRequest = {
        callId: 'blocking',
        serverId: 's1',
        toolName: 'blocking',
        args: {},
      };

      const blockingPromise = executor.submit(blocking);
      
      await new Promise((resolve) => setTimeout(resolve, 5));
      
      const lowPromise = executor.submit(lowPriority);
      const highPromise = executor.submit(highPriority);

      await new Promise((resolve) => setTimeout(resolve, 5));
      resolvers[0]();
      
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (resolvers[1]) resolvers[1]();
      
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (resolvers[2]) resolvers[2]();

      await Promise.all([blockingPromise, lowPromise, highPromise]);

      expect(callOrder[0]).toBe('blocking');
      expect(callOrder[1]).toBe('high-priority');
      expect(callOrder[2]).toBe('low-priority');
    });
  });

  describe('submitBatch', () => {
    it('should submit multiple requests', async () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      
      const requests: ToolExecutionRequest[] = [
        { callId: 'batch-1', serverId: 's1', toolName: 't1', args: {} },
        { callId: 'batch-2', serverId: 's1', toolName: 't2', args: {} },
        { callId: 'batch-3', serverId: 's1', toolName: 't3', args: {} },
      ];

      const results = await executor.submitBatch(requests);

      expect(results.length).toBe(3);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should cancel running execution', async () => {
      let resolveCall: () => void;
      const controlledCallTool = jest.fn().mockImplementation(() => 
        new Promise<{ success: boolean }>((resolve) => {
          resolveCall = () => resolve({ success: true });
        })
      );
      
      const executor = new ParallelToolExecutor(controlledCallTool);
      
      const request: ToolExecutionRequest = {
        callId: 'cancel-me',
        serverId: 's1',
        toolName: 't1',
        args: {},
      };

      const promise = executor.submit(request);
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const cancelled = executor.cancel('cancel-me');
      
      expect(cancelled).toBe(true);
      
      resolveCall!();
      
      const result = await promise;
      expect(result.success).toBe(false);
    });

    it('should cancel queued execution', async () => {
      let resolveCall: () => void;
      const controlledCallTool = jest.fn().mockImplementation(() => 
        new Promise<{ success: boolean }>((resolve) => {
          resolveCall = () => resolve({ success: true });
        })
      );
      
      const executor = new ParallelToolExecutor(controlledCallTool, { maxConcurrent: 1 });
      
      const blocking: ToolExecutionRequest = {
        callId: 'blocking',
        serverId: 's1',
        toolName: 'blocking',
        args: {},
      };
      
      const toCancel: ToolExecutionRequest = {
        callId: 'to-cancel',
        serverId: 's1',
        toolName: 'queued',
        args: {},
      };

      const blockingPromise = executor.submit(blocking);
      
      await new Promise((resolve) => setTimeout(resolve, 5));
      
      const cancelPromise = executor.submit(toCancel);
      
      await new Promise((resolve) => setTimeout(resolve, 5));
      
      const cancelled = executor.cancel('to-cancel');
      expect(cancelled).toBe(true);
      
      const cancelResult = await cancelPromise;
      expect(cancelResult.success).toBe(false);

      resolveCall!();
      await blockingPromise;
    });

    it('should return false for non-existent call', () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      
      const cancelled = executor.cancel('nonexistent');
      
      expect(cancelled).toBe(false);
    });
  });

  describe('cancelAll', () => {
    it('should cancel all running and queued executions', async () => {
      const resolvers: Array<() => void> = [];
      const controlledCallTool = jest.fn().mockImplementation(() => 
        new Promise<{ success: boolean }>((resolve) => {
          resolvers.push(() => resolve({ success: true }));
        })
      );
      
      const executor = new ParallelToolExecutor(controlledCallTool, { maxConcurrent: 2 });
      
      const requests = [
        { callId: 'c1', serverId: 's1', toolName: 't1', args: {} },
        { callId: 'c2', serverId: 's1', toolName: 't2', args: {} },
        { callId: 'c3', serverId: 's1', toolName: 't3', args: {} },
      ];

      const promises = requests.map((req) => executor.submit(req));
      
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      executor.cancelAll();
      
      resolvers.forEach((r) => r());
      
      const _results = await Promise.all(promises);
      
      const status = executor.getStatus();
      expect(status.running).toBe(0);
      expect(status.queued).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return current status', async () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      
      const status = executor.getStatus();
      
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('queued');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
    });

    it('should track completed count', async () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      
      await executor.submit({ callId: 'c1', serverId: 's1', toolName: 't1', args: {} });
      await executor.submit({ callId: 'c2', serverId: 's1', toolName: 't2', args: {} });
      
      const status = executor.getStatus();
      expect(status.completed).toBe(2);
    });

    it('should track failed count', async () => {
      mockCallTool.mockRejectedValue(new Error('fail'));
      const executor = new ParallelToolExecutor(mockCallTool);
      
      await executor.submit({ callId: 'c1', serverId: 's1', toolName: 't1', args: {} });
      
      const status = executor.getStatus();
      expect(status.failed).toBe(1);
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', async () => {
      const executor = new ParallelToolExecutor(mockCallTool);
      
      await executor.submit({ callId: 'c1', serverId: 's1', toolName: 't1', args: {} });
      
      executor.resetStats();
      
      const status = executor.getStatus();
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
    });
  });

  describe('timeout handling', () => {
    it('should timeout long-running executions', async () => {
      const slowCallTool = jest.fn().mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      );
      
      const executor = new ParallelToolExecutor(slowCallTool, { timeout: 50 });
      
      const result = await executor.submit({
        callId: 'timeout-test',
        serverId: 's1',
        toolName: 't1',
        args: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createParallelExecutor', () => {
    it('should create executor instance', () => {
      const executor = createParallelExecutor(mockCallTool);
      
      expect(executor).toBeInstanceOf(ParallelToolExecutor);
    });

    it('should accept custom config', () => {
      const executor = createParallelExecutor(mockCallTool, {
        maxConcurrent: 10,
        timeout: 60000,
      });
      
      expect(executor).toBeInstanceOf(ParallelToolExecutor);
    });
  });
});
