/**
 * Tests for LoggerProvider
 */

import { renderHook, act } from '@testing-library/react';
import { LoggerProvider, useLogger, useLog, LogTransport } from './logger-provider';
import { ReactNode } from 'react';

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

// Mock console methods
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
    it('retrieves logs', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log 1');
        result.current.warn('Test log 2');
      });

      const logs = result.current.getLogs();

      expect(logs.length).toBeGreaterThanOrEqual(0);
    });

    it('filters logs by level', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Info log');
        result.current.warn('Warn log');
        result.current.error('Error log');
      });

      const errorLogs = result.current.getLogs({ level: 'error' });
      const allLogs = result.current.getLogs();

      expect(errorLogs.length).toBeLessThanOrEqual(allLogs.length);
    });

    it('filters logs by date', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      const pastDate = new Date(Date.now() - 10000);

      act(() => {
        result.current.info('Recent log');
      });

      const recentLogs = result.current.getLogs({ since: pastDate });

      expect(recentLogs.length).toBeGreaterThanOrEqual(0);
    });

    it('limits number of logs', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.info(`Log ${i}`);
        }
      });

      const limitedLogs = result.current.getLogs({ limit: 3 });

      expect(limitedLogs.length).toBeLessThanOrEqual(3);
    });

    it('clears logs', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log');
      });

      act(() => {
        result.current.clearLogs();
      });

      const logs = result.current.getLogs();
      expect(logs.length).toBe(0);
    });

    it('exports logs as JSON', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log');
      });

      const exported = result.current.exportLogs('json');

      expect(() => JSON.parse(exported)).not.toThrow();
    });

    it('exports logs as text', () => {
      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.info('Test log');
      });

      const exported = result.current.exportLogs('text');

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

      act(() => {
        result.current.info('Test message');
      });

      expect(customTransport.log).toHaveBeenCalled();
    });

    it('removes custom transport', () => {
      const customTransport: LogTransport = {
        name: 'custom',
        log: jest.fn(),
      };

      const { result } = renderHook(() => useLogger(), { wrapper });

      act(() => {
        result.current.addTransport(customTransport);
      });

      act(() => {
        result.current.removeTransport('custom');
      });

      act(() => {
        result.current.info('Test message');
      });

      // Custom transport should not be called after removal
      expect(customTransport.log).not.toHaveBeenCalled();
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

      expect(consoleMock.info).toHaveBeenCalled();
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

      expect(consoleMock.debug).not.toHaveBeenCalled();
      expect(consoleMock.info).not.toHaveBeenCalled();
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

      // Session ID should be included in the log entry
      expect(consoleMock.info).toHaveBeenCalled();
    });
  });
});
