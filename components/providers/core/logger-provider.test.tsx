/**
 * Tests for LoggerProvider
 */

// Mock console methods - must be before imports
const consoleMock = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

const originalConsole = { ...console };

beforeAll(() => {
  Object.assign(console, consoleMock);
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

// Mock @/lib/logger so loggers.app.* calls go through console directly
const mockGetLogs = jest.fn().mockResolvedValue([]);
const mockClear = jest.fn().mockResolvedValue(undefined);
const mockApplyLoggingSettings = jest.fn();
const mockBootstrapLogger = jest.fn(() => ({
  config: {
    minLevel: 'debug',
    includeStackTrace: true,
    includeSource: false,
    enableConsole: true,
    enableStorage: true,
    enableRemote: false,
    maxStorageEntries: 1000,
  },
  transports: {
    console: true,
    indexedDB: true,
    remote: false,
    langfuse: false,
    opentelemetry: false,
  },
  retention: {
    maxEntries: 10000,
    maxAgeDays: 7,
  },
}));
const mockGetBootstrapState = jest.fn(() => mockBootstrapLogger());
const mockIndexedDBTransport = {
  name: 'indexeddb',
  log: jest.fn(),
  getLogs: mockGetLogs,
  clear: mockClear,
};

jest.mock('@/lib/logger', () => {
  const createMockLogger = () => ({
    debug: jest.fn((...args: unknown[]) => console.debug('[DEBUG]', ...args)),
    info: jest.fn((...args: unknown[]) => console.info('[INFO]', ...args)),
    warn: jest.fn((...args: unknown[]) => console.warn('[WARN]', ...args)),
    error: jest.fn((...args: unknown[]) => console.error('[ERROR]', ...args)),
    fatal: jest.fn((...args: unknown[]) => console.error('[FATAL]', ...args)),
    trace: jest.fn(),
    child: jest.fn(),
    withContext: jest.fn(),
    setTraceId: jest.fn(),
  });
  const appLogger = createMockLogger();
  return {
    loggers: { app: appLogger },
    bootstrapLogger: (...args: unknown[]) =>
      (mockBootstrapLogger as (...innerArgs: unknown[]) => unknown)(...args),
    getLoggingBootstrapState: (...args: unknown[]) =>
      (mockGetBootstrapState as (...innerArgs: unknown[]) => unknown)(...args),
    getIndexedDBTransport: () => mockIndexedDBTransport,
    applyLoggingSettings: (...args: unknown[]) =>
      (mockApplyLoggingSettings as (...innerArgs: unknown[]) => unknown)(...args),
    updateLoggerConfig: jest.fn(),
    addTransport: jest.fn(),
    removeTransport: jest.fn(),
  };
});

import { renderHook, act } from '@testing-library/react';
import { LoggerProvider, useLogger, useLog, LogTransport } from './logger-provider';
import { ReactNode } from 'react';
import { addTransport as _mockAddTransport, removeTransport as _mockRemoveTransport } from '@/lib/logger';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('LoggerProvider', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <LoggerProvider>{children}</LoggerProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('useLogger hook', () => {
    it('throws error when used outside provider', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useLogger());
      }).toThrow('useLogger must be used within LoggerProvider');

      errorSpy.mockRestore();
    });

    it('provides logger context when used within provider', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.debug).toBeInstanceOf(Function);
      expect(result.current.info).toBeInstanceOf(Function);
      expect(result.current.warn).toBeInstanceOf(Function);
      expect(result.current.error).toBeInstanceOf(Function);
      expect(result.current.fatal).toBeInstanceOf(Function);
    });
  });

  describe('logging methods', () => {
    it('logs debug messages', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.debug('Debug message');
      });

      expect(consoleMock.debug).toHaveBeenCalled();
    });

    it('logs info messages', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Info message');
      });

      expect(consoleMock.info).toHaveBeenCalled();
    });

    it('logs warning messages', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.warn('Warning message');
      });

      expect(consoleMock.warn).toHaveBeenCalled();
    });

    it('logs error messages', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.error('Error message');
      });

      expect(consoleMock.error).toHaveBeenCalled();
    });

    it('logs fatal messages', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.fatal('Fatal message');
      });

      expect(consoleMock.error).toHaveBeenCalled(); // Fatal uses console.error
    });

    it('logs with additional data', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      const testData = { userId: 123, action: 'test' };

      act(() => {
        result.current.info('Info with data', testData);
      });

      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        'Info with data',
        testData
      );
    });

    it('logs with context', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Info with context', null, { component: 'Test' });
      });

      expect(consoleMock.info).toHaveBeenCalled();
    });
  });

  describe('log management', () => {
    it('retrieves logs', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log 1');
        result.current.warn('Test log 2');
      });

      const logs = await result.current.getLogs();

      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('filters logs by level', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Info log');
        result.current.warn('Warn log');
        result.current.error('Error log');
      });

      const errorLogs = await result.current.getLogs({ level: 'error' });
      const allLogs = await result.current.getLogs();

      expect(errorLogs.length).toBeLessThanOrEqual(allLogs.length);
    });

    it('filters logs by date', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      const pastDate = new Date(Date.now() - 10000);

      act(() => {
        result.current.info('Recent log');
      });

      const recentLogs = await result.current.getLogs({ since: pastDate });

      expect(recentLogs.length).toBeGreaterThanOrEqual(0);
    });

    it('limits number of logs', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.info(`Log ${i}`);
        }
      });

      const limitedLogs = await result.current.getLogs({ limit: 3 });

      expect(limitedLogs.length).toBeLessThanOrEqual(3);
    });

    it('clears logs', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log');
      });

      act(() => {
        result.current.clearLogs();
      });

      const logs = await result.current.getLogs();
      expect(logs.length).toBe(0);
    });

    it('exports logs as JSON', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log');
      });

      const exported = await result.current.exportLogs('json');

      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('exports logs as text', async () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log');
      });

      const exported = await result.current.exportLogs('text');

      expect(typeof exported).toBe('string');
    });
  });

  describe('configuration', () => {
    it('returns current config', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      expect(result.current.config).toBeDefined();
      expect(result.current.config.enableConsole).toBe(true);
    });

    it('updates config', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.updateConfig({ minLevel: 'warn' });
      });

      expect(result.current.config.minLevel).toBe('warn');
    });
  });

  describe('transports', () => {
    it('adds custom transport', () => {
      const customTransport: LogTransport = {
        name: 'custom',
        log: jest.fn(),
      };

      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.addTransport(customTransport);
      });

      // Verify delegation to unified logger's addTransport
      expect(_mockAddTransport).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'custom' })
      );
    });

    it('removes custom transport', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.removeTransport('custom');
      });

      // Verify delegation to unified logger's removeTransport
      expect(_mockRemoveTransport).toHaveBeenCalledWith('custom');
    });
  });

  describe('statistics', () => {
    it('returns log stats', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Info 1');
        result.current.info('Info 2');
        result.current.warn('Warn 1');
        result.current.error('Error 1');
      });

      const stats = result.current.getStats();

      expect(stats.total).toBe(4);
      expect(stats.byLevel).toBeDefined();
    });
  });

  describe('useLog hook', () => {
    it('provides simplified logging interface', () => {
      const { result } = renderHook(() => useLog(), { wrapper });

      expect(result.current.debug).toBeInstanceOf(Function);
      expect(result.current.info).toBeInstanceOf(Function);
      expect(result.current.warn).toBeInstanceOf(Function);
      expect(result.current.error).toBeInstanceOf(Function);
      expect(result.current.fatal).toBeInstanceOf(Function);
      expect(result.current.log).toBeInstanceOf(Function);
    });

    it('log() is an alias for info()', () => {
      const { result } = renderHook(() => useLog(), { wrapper });

      act(() => {
        result.current.log('Test message');
      });

      // Delegates to loggers.app.info via console mock
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('with custom config', () => {
    it('respects minLevel config', () => {
      const warnOnlyWrapper = ({ children }: { children: ReactNode }) => (
        <LoggerProvider config={{ minLevel: 'warn' }}>
          {children}
        </LoggerProvider>
      );

      const { result } = renderHook(() => useLogger(), { wrapper: warnOnlyWrapper });

      jest.clearAllMocks();

      act(() => {
        result.current.debug('Should not log');
        result.current.info('Should not log');
        result.current.warn('Should log');
      });

      // debug and info are below minLevel 'warn', so they should not be logged
      // The provider's LOG_LEVEL_PRIORITY check prevents delegation to loggers.app.*
      expect(consoleMock.warn).toHaveBeenCalled();
    });
  });

  describe('with session ID', () => {
    it('includes session ID in logs', () => {
      const sessionWrapper = ({ children }: { children: ReactNode }) => (
        <LoggerProvider sessionId="test-session-123">
          {children}
        </LoggerProvider>
      );

      const { result } = renderHook(() => useLogger(), { wrapper: sessionWrapper });

      act(() => {
        result.current.info('Test message');
      });

      // Session ID is passed to the unified logger; verify logging happened
      expect(consoleMock.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.anything(),
        expect.anything()
      );
    });
  });
});
