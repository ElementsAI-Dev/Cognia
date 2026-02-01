/**
 * @jest-environment jsdom
 */

import {
  initLogger,
  createLogger,
  addTransport,
  removeTransport,
  updateLoggerConfig,
  getLoggerConfig,
  flushLogs,
  shutdownLogger,
} from './core';
import type { Transport, StructuredLogEntry } from './types';

// Mock context and sampling
jest.mock('./context', () => ({
  logContext: {
    traceId: 'test-trace-id',
    sessionId: 'test-session-id',
  },
}));

jest.mock('./sampling', () => ({
  logSampler: {
    shouldLog: jest.fn().mockReturnValue(true),
  },
}));

// Mock console transport
jest.mock('./transports/console-transport', () => ({
  createConsoleTransport: jest.fn().mockReturnValue({
    name: 'console',
    log: jest.fn(),
  }),
}));

describe('Logger Core', () => {
  let mockTransport: Transport;
  let loggedEntries: StructuredLogEntry[];

  beforeEach(() => {
    loggedEntries = [];
    mockTransport = {
      name: 'test-transport',
      log: jest.fn((entry: StructuredLogEntry) => {
        loggedEntries.push(entry);
      }),
      flush: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Reset logger state
    shutdownLogger();
  });

  afterEach(async () => {
    await shutdownLogger();
  });

  describe('initLogger', () => {
    it('should initialize with default config', () => {
      initLogger();
      const config = getLoggerConfig();
      expect(config.minLevel).toBeDefined();
    });

    it('should initialize with custom config', () => {
      initLogger({ minLevel: 'warn' });
      const config = getLoggerConfig();
      expect(config.minLevel).toBe('warn');
    });

    it('should initialize with custom transports', () => {
      initLogger({}, [mockTransport]);
      const logger = createLogger('test');
      logger.info('test message');
      expect(mockTransport.log).toHaveBeenCalled();
    });
  });

  describe('createLogger', () => {
    beforeEach(() => {
      initLogger({ minLevel: 'trace' }, [mockTransport]);
    });

    it('should create a logger with module name', () => {
      const logger = createLogger('test-module');
      expect(logger).toBeDefined();
    });

    it('should log messages with correct level', () => {
      const logger = createLogger('test-module');
      
      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.fatal('fatal message');

      expect(loggedEntries).toHaveLength(6);
      expect(loggedEntries[0].level).toBe('trace');
      expect(loggedEntries[5].level).toBe('fatal');
    });

    it('should include module name in log entries', () => {
      const logger = createLogger('my-module');
      logger.info('test');
      
      expect(loggedEntries[0].module).toBe('my-module');
    });

    it('should include data in log entries', () => {
      const logger = createLogger('test');
      logger.info('test', { key: 'value' });
      
      expect(loggedEntries[0].data).toEqual({ key: 'value' });
    });

    it('should handle error objects', () => {
      const logger = createLogger('test');
      const error = new Error('test error');
      logger.error('error occurred', error);
      
      expect(loggedEntries[0].data).toMatchObject({
        errorName: 'Error',
        errorMessage: 'test error',
      });
    });
  });

  describe('Logger.child', () => {
    beforeEach(() => {
      initLogger({ minLevel: 'info' }, [mockTransport]);
    });

    it('should create child logger with concatenated module name', () => {
      const logger = createLogger('parent');
      const childLogger = logger.child('child');
      
      childLogger.info('test');
      
      expect(loggedEntries[0].module).toBe('parent:child');
    });
  });

  describe('Logger.withContext', () => {
    beforeEach(() => {
      initLogger({ minLevel: 'info' }, [mockTransport]);
    });

    it('should create logger with additional context', () => {
      const logger = createLogger('test').withContext({ userId: '123' });
      
      logger.info('test');
      
      expect(loggedEntries[0].data).toMatchObject({ userId: '123' });
    });

    it('should merge context with log data', () => {
      const logger = createLogger('test').withContext({ userId: '123' });
      
      logger.info('test', { action: 'login' });
      
      expect(loggedEntries[0].data).toMatchObject({
        userId: '123',
        action: 'login',
      });
    });
  });

  describe('Logger.setTraceId', () => {
    beforeEach(() => {
      initLogger({ minLevel: 'info' }, [mockTransport]);
    });

    it('should set trace ID for logger instance', () => {
      const logger = createLogger('test');
      logger.setTraceId('custom-trace-id');
      
      logger.info('test');
      
      expect(loggedEntries[0].traceId).toBe('custom-trace-id');
    });
  });

  describe('Level filtering', () => {
    it('should filter logs below minimum level', () => {
      initLogger({ minLevel: 'warn' }, [mockTransport]);
      const logger = createLogger('test');
      
      logger.trace('trace');
      logger.debug('debug');
      logger.info('info');
      logger.warn('warn');
      logger.error('error');
      
      expect(loggedEntries).toHaveLength(2);
      expect(loggedEntries[0].level).toBe('warn');
      expect(loggedEntries[1].level).toBe('error');
    });
  });

  describe('addTransport', () => {
    it('should add transport to logger', () => {
      initLogger({ minLevel: 'info' });
      addTransport(mockTransport);
      
      const logger = createLogger('test');
      logger.info('test');
      
      expect(mockTransport.log).toHaveBeenCalled();
    });

    it('should not add duplicate transport', () => {
      initLogger({ minLevel: 'info' }, []);
      addTransport(mockTransport);
      addTransport(mockTransport);
      
      const logger = createLogger('test');
      logger.info('test');
      
      expect(mockTransport.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeTransport', () => {
    it('should remove transport from logger', () => {
      initLogger({ minLevel: 'info' }, [mockTransport]);
      removeTransport('test-transport');
      
      const logger = createLogger('test');
      logger.info('test');
      
      expect(mockTransport.log).not.toHaveBeenCalled();
    });
  });

  describe('updateLoggerConfig', () => {
    it('should update logger configuration', () => {
      initLogger({ minLevel: 'info' });
      updateLoggerConfig({ minLevel: 'error' });
      
      const config = getLoggerConfig();
      expect(config.minLevel).toBe('error');
    });
  });

  describe('flushLogs', () => {
    it('should flush all transports', async () => {
      initLogger({}, [mockTransport]);
      
      await flushLogs();
      
      expect(mockTransport.flush).toHaveBeenCalled();
    });
  });

  describe('shutdownLogger', () => {
    it('should close all transports', async () => {
      initLogger({}, [mockTransport]);
      
      await shutdownLogger();
      
      expect(mockTransport.flush).toHaveBeenCalled();
      expect(mockTransport.close).toHaveBeenCalled();
    });
  });

  describe('Transport error handling', () => {
    it('should catch and log transport errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const failingTransport: Transport = {
        name: 'failing',
        log: jest.fn(() => {
          throw new Error('Transport error');
        }),
      };
      
      initLogger({ minLevel: 'info' }, [failingTransport]);
      const logger = createLogger('test');
      
      expect(() => logger.info('test')).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });
  });
});
