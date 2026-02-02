/**
 * Invoke With Trace Tests
 */

import { isTauri } from '@/lib/utils';
import { loggers, logContext } from '@/lib/logger';
import { invoke } from '@tauri-apps/api/core';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    native: {
      debug: jest.fn(),
      error: jest.fn(),
    },
  },
  logContext: {
    traceId: null as string | null,
    newTraceId: jest.fn(() => 'test-trace-id-123'),
    setTraceId: jest.fn(),
    clearTraceId: jest.fn(),
  },
}));

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

const mockIsTauri = isTauri as jest.Mock;
const mockInvoke = invoke as jest.Mock;

describe('invoke-with-trace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (logContext as { traceId: string | null }).traceId = null;
  });

  describe('invokeWithTrace', () => {
    it('should throw error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const { invokeWithTrace } = await import('./invoke-with-trace');

      await expect(invokeWithTrace('test_command')).rejects.toThrow(
        'invokeWithTrace can only be used in Tauri environment'
      );
    });

    it('should invoke command with trace ID', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('result');

      const { invokeWithTrace } = await import('./invoke-with-trace');
      const result = await invokeWithTrace('test_command', { arg1: 'value' });

      expect(mockInvoke).toHaveBeenCalledWith('test_command', {
        arg1: 'value',
        __trace_id: expect.any(String),
      });
      expect(result).toBe('result');
    });

    it('should use existing trace ID if available', async () => {
      mockIsTauri.mockReturnValue(true);
      (logContext as { traceId: string | null }).traceId = 'existing-trace-id';
      mockInvoke.mockResolvedValue('result');

      const { invokeWithTrace } = await import('./invoke-with-trace');
      await invokeWithTrace('test_command');

      expect(mockInvoke).toHaveBeenCalledWith('test_command', {
        __trace_id: 'existing-trace-id',
      });
    });

    it('should log debug messages on success', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('result');

      const { invokeWithTrace } = await import('./invoke-with-trace');
      await invokeWithTrace('test_command');

      expect(loggers.native.debug).toHaveBeenCalledTimes(2);
    });

    it('should log error on failure', async () => {
      mockIsTauri.mockReturnValue(true);
      const error = new Error('Command failed');
      mockInvoke.mockRejectedValue(error);

      const { invokeWithTrace } = await import('./invoke-with-trace');

      await expect(invokeWithTrace('test_command')).rejects.toThrow('Command failed');
      expect(loggers.native.error).toHaveBeenCalled();
    });
  });

  describe('createTracedInvoke', () => {
    it('should create a typed invoke function', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('file content');

      const { createTracedInvoke } = await import('./invoke-with-trace');
      const getFileContent = createTracedInvoke<{ path: string }, string>('get_file_content');

      const result = await getFileContent({ path: '/test/path' });

      expect(mockInvoke).toHaveBeenCalledWith('get_file_content', {
        path: '/test/path',
        __trace_id: expect.any(String),
      });
      expect(result).toBe('file content');
    });

    it('should work without arguments', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('result');

      const { createTracedInvoke } = await import('./invoke-with-trace');
      const getConfig = createTracedInvoke<Record<string, unknown>, string>('get_config');

      const result = await getConfig();

      expect(mockInvoke).toHaveBeenCalledWith('get_config', {
        __trace_id: expect.any(String),
      });
      expect(result).toBe('result');
    });
  });

  describe('batchInvokeWithTrace', () => {
    it('should throw error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);

      const { batchInvokeWithTrace } = await import('./invoke-with-trace');

      await expect(
        batchInvokeWithTrace([{ cmd: 'cmd1' }, { cmd: 'cmd2' }])
      ).rejects.toThrow('batchInvokeWithTrace can only be used in Tauri environment');
    });

    it('should invoke multiple commands with same trace ID', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke
        .mockResolvedValueOnce('result1')
        .mockResolvedValueOnce('result2');

      const { batchInvokeWithTrace } = await import('./invoke-with-trace');
      const results = await batchInvokeWithTrace([
        { cmd: 'cmd1', args: { arg: 'value1' } },
        { cmd: 'cmd2', args: { arg: 'value2' } },
      ]);

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(results).toEqual(['result1', 'result2']);

      // Both calls should have same trace ID
      const call1 = mockInvoke.mock.calls[0];
      const call2 = mockInvoke.mock.calls[1];
      expect(call1[1].__trace_id).toBe(call2[1].__trace_id);
    });

    it('should log batch completion', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('result');

      const { batchInvokeWithTrace } = await import('./invoke-with-trace');
      await batchInvokeWithTrace([{ cmd: 'cmd1' }, { cmd: 'cmd2' }]);

      expect(loggers.native.debug).toHaveBeenCalledWith(
        expect.stringContaining('Batch'),
        expect.any(Object)
      );
    });

    it('should handle batch failure', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke
        .mockResolvedValueOnce('result1')
        .mockRejectedValueOnce(new Error('Command 2 failed'));

      const { batchInvokeWithTrace } = await import('./invoke-with-trace');

      await expect(
        batchInvokeWithTrace([{ cmd: 'cmd1' }, { cmd: 'cmd2' }])
      ).rejects.toThrow('Command 2 failed');
      expect(loggers.native.error).toHaveBeenCalled();
    });
  });

  describe('withTrace', () => {
    it('should execute function within traced context', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');

      const { withTrace } = await import('./invoke-with-trace');
      const result = await withTrace(mockFn);

      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe('result');
      expect(logContext.newTraceId).toHaveBeenCalled();
    });

    it('should restore previous trace ID after execution', async () => {
      (logContext as { traceId: string | null }).traceId = 'previous-trace-id';

      const { withTrace } = await import('./invoke-with-trace');
      await withTrace(async () => 'result');

      expect(logContext.setTraceId).toHaveBeenCalledWith('previous-trace-id');
    });

    it('should clear trace ID if no previous exists', async () => {
      (logContext as { traceId: string | null }).traceId = null;

      const { withTrace } = await import('./invoke-with-trace');
      await withTrace(async () => 'result');

      expect(logContext.clearTraceId).toHaveBeenCalled();
    });

    it('should handle errors and still cleanup', async () => {
      const error = new Error('Function failed');
      const mockFn = jest.fn().mockRejectedValue(error);

      const { withTrace } = await import('./invoke-with-trace');

      await expect(withTrace(mockFn)).rejects.toThrow('Function failed');
      expect(loggers.native.error).toHaveBeenCalled();
      expect(logContext.clearTraceId).toHaveBeenCalled();
    });

    it('should log start and completion', async () => {
      const { withTrace } = await import('./invoke-with-trace');
      await withTrace(async () => 'result');

      expect(loggers.native.debug).toHaveBeenCalledWith(
        'Starting traced operation',
        expect.any(Object)
      );
      expect(loggers.native.debug).toHaveBeenCalledWith(
        'Traced operation completed',
        expect.any(Object)
      );
    });
  });
});
