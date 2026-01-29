/**
 * Debug API Tests
 *
 * @description Tests for debug API type definitions.
 */

import type {
  DebugLogLevel,
  DebugLogEntry,
  TraceEntry,
  PerformanceMetrics,
  Breakpoint,
  DebugSession,
  SlowOperation,
  PluginDebugAPI,
} from './debug';

describe('Debug API Types', () => {
  describe('DebugLogLevel', () => {
    it('should support all log levels', () => {
      const levels: DebugLogLevel[] = ['trace', 'debug', 'info', 'warn', 'error'];

      expect(levels).toContain('trace');
      expect(levels).toContain('debug');
      expect(levels).toContain('info');
      expect(levels).toContain('warn');
      expect(levels).toContain('error');
      expect(levels).toHaveLength(5);
    });
  });

  describe('DebugLogEntry', () => {
    it('should create a basic log entry', () => {
      const entry: DebugLogEntry = {
        level: 'info',
        message: 'Test message',
        timestamp: Date.now(),
      };

      expect(entry.level).toBe('info');
      expect(entry.message).toBe('Test message');
      expect(entry.timestamp).toBeDefined();
    });

    it('should create a log entry with additional data', () => {
      const entry: DebugLogEntry = {
        level: 'debug',
        message: 'Debug info',
        timestamp: Date.now(),
        data: { key: 'value', count: 42 },
        source: 'plugin.ts:25',
      };

      expect(entry.data).toEqual({ key: 'value', count: 42 });
      expect(entry.source).toBe('plugin.ts:25');
    });

    it('should create an error log entry with stack trace', () => {
      const entry: DebugLogEntry = {
        level: 'error',
        message: 'Something went wrong',
        timestamp: Date.now(),
        stack: 'Error: Something went wrong\n    at function (file.ts:10)',
      };

      expect(entry.level).toBe('error');
      expect(entry.stack).toContain('Error:');
    });
  });

  describe('TraceEntry', () => {
    it('should create a basic trace entry', () => {
      const trace: TraceEntry = {
        name: 'fetchData',
        startTime: 1000,
      };

      expect(trace.name).toBe('fetchData');
      expect(trace.startTime).toBe(1000);
    });

    it('should create a completed trace entry', () => {
      const trace: TraceEntry = {
        name: 'processItems',
        startTime: 1000,
        endTime: 1500,
        duration: 500,
      };

      expect(trace.duration).toBe(500);
      expect(trace.endTime).toBe(1500);
    });

    it('should create a trace with nested children', () => {
      const trace: TraceEntry = {
        name: 'parentOperation',
        startTime: 1000,
        endTime: 2000,
        duration: 1000,
        children: [
          { name: 'childOp1', startTime: 1100, endTime: 1400, duration: 300 },
          { name: 'childOp2', startTime: 1500, endTime: 1800, duration: 300 },
        ],
      };

      expect(trace.children).toHaveLength(2);
      expect(trace.children![0].name).toBe('childOp1');
    });

    it('should create a trace with metadata', () => {
      const trace: TraceEntry = {
        name: 'apiCall',
        startTime: 1000,
        metadata: {
          endpoint: '/api/data',
          method: 'GET',
          statusCode: 200,
        },
      };

      expect(trace.metadata).toEqual({
        endpoint: '/api/data',
        method: 'GET',
        statusCode: 200,
      });
    });
  });

  describe('PerformanceMetrics', () => {
    it('should create valid performance metrics', () => {
      const metrics: PerformanceMetrics = {
        pluginId: 'my-plugin',
        totalTime: 5000,
        toolCallCount: 10,
        avgToolCallDuration: 150,
        hookInvocationCount: 5,
        avgHookDuration: 50,
        traces: [],
      };

      expect(metrics.pluginId).toBe('my-plugin');
      expect(metrics.totalTime).toBe(5000);
      expect(metrics.toolCallCount).toBe(10);
      expect(metrics.avgToolCallDuration).toBe(150);
    });

    it('should include memory usage', () => {
      const metrics: PerformanceMetrics = {
        pluginId: 'my-plugin',
        totalTime: 1000,
        toolCallCount: 5,
        avgToolCallDuration: 100,
        hookInvocationCount: 2,
        avgHookDuration: 25,
        memoryUsage: 1024 * 1024 * 50, // 50MB
        traces: [],
      };

      expect(metrics.memoryUsage).toBe(1024 * 1024 * 50);
    });

    it('should include trace entries', () => {
      const metrics: PerformanceMetrics = {
        pluginId: 'my-plugin',
        totalTime: 2000,
        toolCallCount: 3,
        avgToolCallDuration: 200,
        hookInvocationCount: 1,
        avgHookDuration: 100,
        traces: [
          { name: 'init', startTime: 0, endTime: 500, duration: 500 },
          { name: 'process', startTime: 500, endTime: 1500, duration: 1000 },
        ],
      };

      expect(metrics.traces).toHaveLength(2);
    });
  });

  describe('Breakpoint', () => {
    it('should create a hook breakpoint', () => {
      const bp: Breakpoint = {
        id: 'bp-1',
        type: 'hook',
        target: 'onAgentStep',
        enabled: true,
        hitCount: 0,
      };

      expect(bp.type).toBe('hook');
      expect(bp.target).toBe('onAgentStep');
      expect(bp.enabled).toBe(true);
    });

    it('should create a tool breakpoint with condition', () => {
      const bp: Breakpoint = {
        id: 'bp-2',
        type: 'tool',
        target: 'searchFiles',
        condition: 'args.query.length > 10',
        enabled: true,
        hitCount: 3,
      };

      expect(bp.type).toBe('tool');
      expect(bp.condition).toBe('args.query.length > 10');
      expect(bp.hitCount).toBe(3);
    });

    it('should support all breakpoint types', () => {
      const types: Breakpoint['type'][] = ['hook', 'tool', 'event', 'custom'];

      expect(types).toContain('hook');
      expect(types).toContain('tool');
      expect(types).toContain('event');
      expect(types).toContain('custom');
      expect(types).toHaveLength(4);
    });
  });

  describe('DebugSession', () => {
    it('should create a valid debug session', () => {
      const session: DebugSession = {
        id: 'session-1',
        pluginId: 'my-plugin',
        startedAt: new Date(),
        active: true,
        breakpoints: [],
        logs: [],
        metrics: {
          pluginId: 'my-plugin',
          totalTime: 0,
          toolCallCount: 0,
          avgToolCallDuration: 0,
          hookInvocationCount: 0,
          avgHookDuration: 0,
          traces: [],
        },
      };

      expect(session.id).toBe('session-1');
      expect(session.active).toBe(true);
      expect(session.breakpoints).toEqual([]);
    });

    it('should create a session with breakpoints and logs', () => {
      const session: DebugSession = {
        id: 'session-2',
        pluginId: 'my-plugin',
        startedAt: new Date(),
        active: true,
        breakpoints: [
          { id: 'bp-1', type: 'hook', target: 'onInit', enabled: true, hitCount: 1 },
        ],
        logs: [
          { level: 'info', message: 'Session started', timestamp: Date.now() },
        ],
        metrics: {
          pluginId: 'my-plugin',
          totalTime: 100,
          toolCallCount: 1,
          avgToolCallDuration: 50,
          hookInvocationCount: 1,
          avgHookDuration: 25,
          traces: [],
        },
      };

      expect(session.breakpoints).toHaveLength(1);
      expect(session.logs).toHaveLength(1);
    });
  });

  describe('SlowOperation', () => {
    it('should create a slow operation alert', () => {
      const op: SlowOperation = {
        type: 'tool',
        name: 'searchFiles',
        duration: 5000,
        threshold: 1000,
        timestamp: Date.now(),
      };

      expect(op.type).toBe('tool');
      expect(op.duration).toBe(5000);
      expect(op.threshold).toBe(1000);
    });

    it('should include context information', () => {
      const op: SlowOperation = {
        type: 'ipc',
        name: 'rpc:getData',
        duration: 3000,
        threshold: 500,
        timestamp: Date.now(),
        context: {
          targetPlugin: 'other-plugin',
          method: 'getData',
          args: { id: '123' },
        },
      };

      expect(op.context).toBeDefined();
      expect(op.context!.targetPlugin).toBe('other-plugin');
    });

    it('should support all operation types', () => {
      const types: SlowOperation['type'][] = ['tool', 'hook', 'ipc', 'custom'];

      expect(types).toContain('tool');
      expect(types).toContain('hook');
      expect(types).toContain('ipc');
      expect(types).toContain('custom');
      expect(types).toHaveLength(4);
    });
  });

  describe('PluginDebugAPI', () => {
    it('should define all session management methods', () => {
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      expect(mockAPI.startSession).toBeDefined();
      expect(mockAPI.endSession).toBeDefined();
      expect(mockAPI.getSession).toBeDefined();
      expect(mockAPI.isActive).toBeDefined();
    });

    it('should start and manage debug session', () => {
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn().mockReturnValue('session-123'),
        endSession: jest.fn(),
        getSession: jest.fn().mockReturnValue({
          id: 'session-123',
          pluginId: 'test',
          startedAt: new Date(),
          active: true,
          breakpoints: [],
          logs: [],
          metrics: {
            pluginId: 'test',
            totalTime: 0,
            toolCallCount: 0,
            avgToolCallDuration: 0,
            hookInvocationCount: 0,
            avgHookDuration: 0,
            traces: [],
          },
        }),
        isActive: jest.fn().mockReturnValue(true),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const sessionId = mockAPI.startSession();
      expect(sessionId).toBe('session-123');
      expect(mockAPI.isActive()).toBe(true);

      const session = mockAPI.getSession();
      expect(session).not.toBeNull();
      expect(session!.id).toBe('session-123');
    });

    it('should manage breakpoints', () => {
      const breakpoints: Breakpoint[] = [];
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn().mockImplementation((type, target) => {
          const bp: Breakpoint = { id: `bp-${breakpoints.length}`, type, target, enabled: true, hitCount: 0 };
          breakpoints.push(bp);
          return bp.id;
        }),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn().mockReturnValue(breakpoints),
        clearBreakpoints: jest.fn().mockImplementation(() => breakpoints.length = 0),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const bpId = mockAPI.setBreakpoint('hook', 'onAgentStep');
      expect(bpId).toBe('bp-0');
      expect(mockAPI.getBreakpoints()).toHaveLength(1);

      mockAPI.clearBreakpoints();
      expect(mockAPI.getBreakpoints()).toHaveLength(0);
    });

    it('should trace performance', () => {
      const mockEndTrace = jest.fn();
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn().mockReturnValue(mockEndTrace),
        measure: jest.fn().mockImplementation(async (name, fn) => fn()),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const endTrace = mockAPI.startTrace('myOperation', { detail: 'test' });
      expect(mockAPI.startTrace).toHaveBeenCalledWith('myOperation', { detail: 'test' });

      endTrace();
      expect(mockEndTrace).toHaveBeenCalled();
    });

    it('should measure async functions', async () => {
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn().mockImplementation(async (_name, fn) => fn()),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const result = await mockAPI.measure('fetchData', async () => {
        return { data: 'test' };
      });

      expect(result).toEqual({ data: 'test' });
      expect(mockAPI.measure).toHaveBeenCalled();
    });

    it('should manage logs', () => {
      const logs: DebugLogEntry[] = [];
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn().mockImplementation((level, message, data) => {
          logs.push({ level, message, timestamp: Date.now(), data });
        }),
        getLogs: jest.fn().mockImplementation((level, limit) => {
          let result = logs;
          if (level) result = result.filter(l => l.level === level);
          if (limit) result = result.slice(0, limit);
          return result;
        }),
        clearLogs: jest.fn().mockImplementation(() => logs.length = 0),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      mockAPI.log('info', 'Test message', { key: 'value' });
      mockAPI.log('error', 'Error occurred');

      expect(mockAPI.getLogs()).toHaveLength(2);
      expect(mockAPI.getLogs('error')).toHaveLength(1);

      mockAPI.clearLogs();
      expect(mockAPI.getLogs()).toHaveLength(0);
    });

    it('should capture snapshots', () => {
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn().mockReturnValue({
          pluginId: 'test',
          totalTime: 1000,
          toolCallCount: 5,
          avgToolCallDuration: 100,
          hookInvocationCount: 2,
          avgHookDuration: 50,
          traces: [],
        }),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn().mockReturnValue([]),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn().mockImplementation((label) => ({
          label,
          timestamp: Date.now(),
          metrics: mockAPI.getMetrics(),
          logs: mockAPI.getLogs(),
        })),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const snapshot = mockAPI.captureSnapshot('before-update');

      expect(snapshot.label).toBe('before-update');
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.metrics).toBeDefined();
    });

    it('should monitor slow operations', () => {
      const slowOps: SlowOperation[] = [];
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn().mockImplementation((threshold, handler) => {
          return () => {};
        }),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const unsubscribe = mockAPI.onSlowOperation(1000, (op) => {
        slowOps.push(op);
      });

      expect(mockAPI.onSlowOperation).toHaveBeenCalledWith(1000, expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should export debug data', () => {
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn().mockReturnValue(JSON.stringify({
          session: { id: 'session-1' },
          logs: [],
          metrics: {},
        })),
        assert: jest.fn(),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      const data = mockAPI.exportData();
      const parsed = JSON.parse(data);

      expect(parsed.session).toBeDefined();
      expect(parsed.logs).toBeDefined();
    });

    it('should handle assertions', () => {
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn().mockImplementation((condition, message) => {
          if (!condition) throw new Error(message);
        }),
        time: jest.fn(),
        timeEnd: jest.fn(),
        logMemory: jest.fn(),
      };

      expect(() => mockAPI.assert(true, 'Should pass')).not.toThrow();
      expect(() => mockAPI.assert(false, 'Should fail')).toThrow('Should fail');
    });

    it('should handle console.time-like API', () => {
      const timers: Record<string, number> = {};
      const mockAPI: PluginDebugAPI = {
        startSession: jest.fn(),
        endSession: jest.fn(),
        getSession: jest.fn(),
        isActive: jest.fn(),
        setBreakpoint: jest.fn(),
        removeBreakpoint: jest.fn(),
        toggleBreakpoint: jest.fn(),
        getBreakpoints: jest.fn(),
        clearBreakpoints: jest.fn(),
        startTrace: jest.fn(),
        measure: jest.fn(),
        getMetrics: jest.fn(),
        resetMetrics: jest.fn(),
        log: jest.fn(),
        getLogs: jest.fn(),
        clearLogs: jest.fn(),
        onSlowOperation: jest.fn(),
        captureSnapshot: jest.fn(),
        exportData: jest.fn(),
        assert: jest.fn(),
        time: jest.fn().mockImplementation((label) => {
          timers[label] = Date.now();
        }),
        timeEnd: jest.fn().mockImplementation((label) => {
          delete timers[label];
        }),
        logMemory: jest.fn(),
      };

      mockAPI.time('operation');
      expect(mockAPI.time).toHaveBeenCalledWith('operation');

      mockAPI.timeEnd('operation');
      expect(mockAPI.timeEnd).toHaveBeenCalledWith('operation');
    });
  });
});
