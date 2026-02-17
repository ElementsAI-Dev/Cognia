/**
 * Tauri Log Bridge Tests
 */

import {
  cleanupTauriLogBridge,
  forwardTauriLog,
  initTauriLogBridge,
  isTauriLogBridgeActive,
  type TauriLogEvent,
} from './tauri-log-bridge';

// Create mock child logger
const mockChildLogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock dependencies before imports
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => false),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    native: {
      info: jest.fn(),
      error: jest.fn(),
      child: jest.fn(() => mockChildLogger),
    },
  },
  logContext: {
    setTraceId: jest.fn(),
    clearTraceId: jest.fn(),
  },
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

// Import mocks after setup
import { loggers, logContext } from '@/lib/logger';
import { isTauri } from '@/lib/utils';
import { listen } from '@tauri-apps/api/event';

describe('tauri-log-bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTauriLogBridge();
  });

  describe('TauriLogEvent interface', () => {
    it('should accept valid event structure', () => {
      const event: TauriLogEvent = {
        level: 'INFO',
        target: 'app_lib::mcp',
        message: 'Test message',
        timestamp: new Date().toISOString(),
        traceId: 'trace-123',
        data: { key: 'value' },
      };

      forwardTauriLog(event);
      expect(loggers.native.child).toHaveBeenCalledWith('mcp');
    });
  });

  describe('isTauriLogBridgeActive', () => {
    it('should return false when not initialized', () => {
      expect(isTauriLogBridgeActive()).toBe(false);
    });
  });

  describe('init/cleanup', () => {
    it('initializes bridge and registers listener in tauri environment', async () => {
      (isTauri as jest.Mock).mockReturnValue(true);
      (listen as jest.Mock).mockResolvedValue(() => {});

      await initTauriLogBridge();

      expect(listen).toHaveBeenCalledWith('log://message', expect.any(Function));
      expect(isTauriLogBridgeActive()).toBe(true);
    });

    it('cleans up listener and marks bridge inactive', async () => {
      const unlisten = jest.fn();
      (isTauri as jest.Mock).mockReturnValue(true);
      (listen as jest.Mock).mockResolvedValue(unlisten);

      await initTauriLogBridge();
      await cleanupTauriLogBridge();

      expect(unlisten).toHaveBeenCalled();
      expect(isTauriLogBridgeActive()).toBe(false);
    });
  });

  describe('forwardTauriLog', () => {
    it('should forward TRACE level log', () => {
      forwardTauriLog({
        level: 'TRACE',
        target: 'app_lib::mcp::transport',
        message: 'Trace message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(loggers.native.child).toHaveBeenCalledWith('mcp:transport');
      expect(mockChildLogger.trace).toHaveBeenCalledWith('Trace message', expect.any(Object));
    });

    it('should forward DEBUG level log', () => {
      forwardTauriLog({
        level: 'DEBUG',
        target: 'app_lib::awareness',
        message: 'Debug message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(mockChildLogger.debug).toHaveBeenCalledWith('Debug message', expect.any(Object));
    });

    it('should forward INFO level log', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'app_lib::context',
        message: 'Info message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(mockChildLogger.info).toHaveBeenCalledWith('Info message', expect.any(Object));
    });

    it('should forward WARN level log', () => {
      forwardTauriLog({
        level: 'WARN',
        target: 'app_lib::selection',
        message: 'Warn message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(mockChildLogger.warn).toHaveBeenCalledWith('Warn message', expect.any(Object));
    });

    it('should forward WARNING level log as warn', () => {
      forwardTauriLog({
        level: 'WARNING',
        target: 'app_lib::test',
        message: 'Warning message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(mockChildLogger.warn).toHaveBeenCalledWith('Warning message', expect.any(Object));
    });

    it('should forward ERROR level log', () => {
      forwardTauriLog({
        level: 'ERROR',
        target: 'app_lib::sandbox',
        message: 'Error message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(mockChildLogger.error).toHaveBeenCalledWith('Error message', undefined, expect.any(Object));
    });

    it('should default to info for unknown level', () => {
      forwardTauriLog({
        level: 'UNKNOWN',
        target: 'app_lib::test',
        message: 'Unknown level message',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(mockChildLogger.info).toHaveBeenCalledWith('Unknown level message', expect.any(Object));
    });

    it('should set and clear trace ID when provided', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'app_lib::mcp',
        message: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'trace-abc-123',
      });

      expect(logContext.setTraceId).toHaveBeenCalledWith('trace-abc-123');
      expect(logContext.clearTraceId).toHaveBeenCalled();
    });

    it('should not set trace ID when not provided', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'app_lib::mcp',
        message: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(logContext.setTraceId).not.toHaveBeenCalled();
      expect(logContext.clearTraceId).not.toHaveBeenCalled();
    });

    it('should parse target correctly - remove app_lib prefix', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'app_lib::mcp::transport::http',
        message: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(loggers.native.child).toHaveBeenCalledWith('mcp:transport:http');
    });

    it('should handle target without app_lib prefix', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'custom::module',
        message: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
      });

      expect(loggers.native.child).toHaveBeenCalledWith('custom:module');
    });

    it('should include additional data in log context', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'app_lib::mcp',
        message: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
        data: { custom: 'value', count: 42 },
      });

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          source: 'tauri',
          target: 'app_lib::mcp',
          custom: 'value',
          count: 42,
        })
      );
    });

    it('should include tauriTimestamp in log data', () => {
      forwardTauriLog({
        level: 'INFO',
        target: 'app_lib::test',
        message: 'Test',
        timestamp: '2024-01-01T12:00:00Z',
      });

      expect(mockChildLogger.info).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          tauriTimestamp: '2024-01-01T12:00:00Z',
        })
      );
    });

    it('should parse field aliases from payload', () => {
      forwardTauriLog({
        lvl: 'WARN',
        module: 'app_lib::alias::module',
        msg: 'Alias payload',
        ts: '2024-01-01T12:00:00Z',
        trace_id: 'trace-from-alias',
        metadata: { alias: true },
      });

      expect(loggers.native.child).toHaveBeenCalledWith('alias:module');
      expect(logContext.setTraceId).toHaveBeenCalledWith('trace-from-alias');
      expect(mockChildLogger.warn).toHaveBeenCalledWith(
        'Alias payload',
        expect.objectContaining({
          alias: true,
        })
      );
    });
  });
});
