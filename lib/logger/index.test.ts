/**
 * Logger System Tests
 */

import { 
  createLogger, 
  initLogger, 
  addTransport, 
  removeTransport,
  updateLoggerConfig,
  getLoggerConfig,
  flushLogs,
  shutdownLogger,
  logContext,
  generateTraceId,
  logSampler,
  configureSampling,
  LEVEL_PRIORITY,
  logger,
  loggers,
  log,
} from './index';
import type { Transport, StructuredLogEntry } from './types';

describe('Logger System', () => {
  // Mock transport for testing
  let mockTransport: Transport & { logs: StructuredLogEntry[] };

  beforeEach(() => {
    mockTransport = {
      name: 'test',
      logs: [],
      log: jest.fn((entry: StructuredLogEntry) => {
        mockTransport.logs.push(entry);
      }),
      flush: jest.fn(),
      close: jest.fn(),
    };

    // Initialize with test transport
    initLogger({ minLevel: 'trace' }, [mockTransport]);
  });

  afterEach(async () => {
    await shutdownLogger();
    logSampler.reset();
  });

  describe('createLogger', () => {
    it('should create a logger with module name', () => {
      const testLogger = createLogger('test-module');
      testLogger.info('Test message');

      expect(mockTransport.log).toHaveBeenCalled();
      const entry = mockTransport.logs[0];
      expect(entry.module).toBe('test-module');
      expect(entry.message).toBe('Test message');
    });

    it('should support child loggers', () => {
      const parentLogger = createLogger('parent');
      const childLogger = parentLogger.child('child');
      childLogger.info('Child message');

      const entry = mockTransport.logs[0];
      expect(entry.module).toBe('parent:child');
    });

    it('should support context injection', () => {
      const testLogger = createLogger('test').withContext({ userId: '123' });
      testLogger.info('With context');

      const entry = mockTransport.logs[0];
      expect(entry.data).toEqual({ userId: '123' });
    });
  });

  describe('Log Levels', () => {
    it('should log at all levels', () => {
      const testLogger = createLogger('levels');
      
      testLogger.trace('Trace message');
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warn message');
      testLogger.error('Error message');
      testLogger.fatal('Fatal message');

      expect(mockTransport.logs).toHaveLength(6);
      expect(mockTransport.logs.map(l => l.level)).toEqual([
        'trace', 'debug', 'info', 'warn', 'error', 'fatal'
      ]);
    });

    it('should respect minimum log level', () => {
      updateLoggerConfig({ minLevel: 'warn' });
      const testLogger = createLogger('filtered');
      
      testLogger.debug('Should not log');
      testLogger.info('Should not log');
      testLogger.warn('Should log');
      testLogger.error('Should log');

      expect(mockTransport.logs).toHaveLength(2);
      expect(mockTransport.logs.map(l => l.level)).toEqual(['warn', 'error']);
    });

    it('should have correct level priorities', () => {
      expect(LEVEL_PRIORITY.trace).toBeLessThan(LEVEL_PRIORITY.debug);
      expect(LEVEL_PRIORITY.debug).toBeLessThan(LEVEL_PRIORITY.info);
      expect(LEVEL_PRIORITY.info).toBeLessThan(LEVEL_PRIORITY.warn);
      expect(LEVEL_PRIORITY.warn).toBeLessThan(LEVEL_PRIORITY.error);
      expect(LEVEL_PRIORITY.error).toBeLessThan(LEVEL_PRIORITY.fatal);
    });
  });

  describe('Error Logging', () => {
    it('should capture error details', () => {
      const testLogger = createLogger('errors');
      const error = new Error('Test error');
      
      testLogger.error('An error occurred', error);

      const entry = mockTransport.logs[0];
      expect(entry.data?.errorName).toBe('Error');
      expect(entry.data?.errorMessage).toBe('Test error');
      expect(entry.stack).toBeDefined();
    });

    it('should handle non-Error objects', () => {
      const testLogger = createLogger('errors');
      
      testLogger.error('An error occurred', { code: 500 });

      const entry = mockTransport.logs[0];
      expect(entry.data?.error).toEqual({ code: 500 });
    });
  });

  describe('Context Management', () => {
    it('should provide session ID', () => {
      expect(logContext.sessionId).toBeDefined();
      expect(typeof logContext.sessionId).toBe('string');
    });

    it('should manage trace IDs', () => {
      expect(logContext.traceId).toBeUndefined();
      
      const traceId = logContext.newTraceId();
      expect(logContext.traceId).toBe(traceId);
      
      logContext.clearTraceId();
      expect(logContext.traceId).toBeUndefined();
    });

    it('should include trace ID in log entries', () => {
      const traceId = logContext.newTraceId();
      const testLogger = createLogger('traced');
      testLogger.info('Traced message');

      const entry = mockTransport.logs[0];
      expect(entry.traceId).toBe(traceId);
      expect(entry.sessionId).toBe(logContext.sessionId);
    });

    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('Sampling', () => {
    it('should sample based on configuration', () => {
      configureSampling({
        'sampled': { rate: 0 }, // Never log
      });

      expect(logSampler.shouldLog('sampled', 'info')).toBe(false);
      expect(logSampler.shouldLog('other', 'info')).toBe(true);
    });

    it('should always log errors regardless of sampling', () => {
      configureSampling({
        'sampled': { rate: 0 },
      });

      expect(logSampler.shouldLog('sampled', 'error')).toBe(true);
      expect(logSampler.shouldLog('sampled', 'fatal')).toBe(true);
    });
  });

  describe('Transport Management', () => {
    it('should add and remove transports', () => {
      const newTransport: Transport = {
        name: 'new-transport',
        log: jest.fn(),
      };

      addTransport(newTransport);
      const testLogger = createLogger('transport-test');
      testLogger.info('Test');

      expect(newTransport.log).toHaveBeenCalled();

      removeTransport('new-transport');
      (newTransport.log as jest.Mock).mockClear();
      
      // Create a new logger after removing transport
      const testLogger2 = createLogger('transport-test-2');
      testLogger2.info('Test 2');

      // newTransport should not be called since it was removed
      expect(newTransport.log).not.toHaveBeenCalled();
    });

    it('should not add duplicate transports', () => {
      const transport1: Transport = { name: 'dup', log: jest.fn() };
      const transport2: Transport = { name: 'dup', log: jest.fn() };

      addTransport(transport1);
      addTransport(transport2);

      const testLogger = createLogger('dup-test');
      testLogger.info('Test');

      expect(transport1.log).toHaveBeenCalledTimes(1);
      expect(transport2.log).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      updateLoggerConfig({ minLevel: 'error' });
      const config = getLoggerConfig();
      expect(config.minLevel).toBe('error');
    });

    it('should preserve other config options when updating', () => {
      const originalConfig = getLoggerConfig();
      updateLoggerConfig({ minLevel: 'warn' });
      const newConfig = getLoggerConfig();

      expect(newConfig.minLevel).toBe('warn');
      expect(newConfig.enableConsole).toBe(originalConfig.enableConsole);
    });
  });

  describe('Flush and Shutdown', () => {
    it('should flush all transports', async () => {
      await flushLogs();
      expect(mockTransport.flush).toHaveBeenCalled();
    });

    it('should close all transports on shutdown', async () => {
      await shutdownLogger();
      expect(mockTransport.flush).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });
  });

  describe('Pre-configured Loggers', () => {
    it('should have default logger', () => {
      // Pre-configured loggers are created at module load time
      // They should be defined
      expect(logger).toBeDefined();
    });

    it('should have module loggers', () => {
      expect(loggers.ai).toBeDefined();
      expect(loggers.chat).toBeDefined();
      expect(loggers.agent).toBeDefined();
      expect(loggers.mcp).toBeDefined();
      expect(loggers.plugin).toBeDefined();
    });

    it('should have quick log functions', () => {
      // log functions should be defined and callable
      expect(log.info).toBeDefined();
      expect(log.debug).toBeDefined();
      expect(log.error).toBeDefined();
      expect(typeof log.info).toBe('function');
    });

    it('should use createLogger for new loggers', () => {
      const testLogger = createLogger('pre-config-test');
      testLogger.info('Pre-config test message');
      expect(mockTransport.logs.some(l => l.module === 'pre-config-test')).toBe(true);
    });
  });
});
