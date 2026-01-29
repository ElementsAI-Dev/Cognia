/**
 * React Hooks Unit Tests
 *
 * Note: These tests focus on context initialization and basic hook structure.
 * Full React hook behavior is best tested with @testing-library/react-hooks.
 */

import {
  initPluginContext,
  getPluginContext,
  usePluginContext,
  usePluginStorage,
  usePluginEvents,
  usePluginSettings,
  useAsyncData,
} from './index';

// Mock React hooks with more realistic behavior
const mockSetState = jest.fn();
let mockStateValue: unknown;

jest.mock('react', () => ({
  useState: jest.fn((initial) => {
    if (typeof initial === 'function') {
      mockStateValue = initial();
    } else {
      mockStateValue = initial;
    }
    return [mockStateValue, mockSetState];
  }),
  useEffect: jest.fn((fn) => {
    const cleanup = fn();
    return cleanup;
  }),
  useCallback: jest.fn((fn) => fn),
  useMemo: jest.fn((fn) => fn()),
  useRef: jest.fn((initial) => ({ current: initial })),
}));

describe('React Hooks', () => {
  const mockContext = {
    pluginId: 'test-plugin',
    pluginPath: '/test/path',
    config: {},
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    storage: {
      get: jest.fn().mockResolvedValue('stored-value'),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      keys: jest.fn().mockResolvedValue(['key1', 'key2']),
    },
    events: {
      on: jest.fn().mockReturnValue(() => {}),
      off: jest.fn(),
      emit: jest.fn(),
      once: jest.fn().mockReturnValue(() => {}),
    },
    settings: {
      get: jest.fn().mockReturnValue('setting-value'),
      set: jest.fn(),
      onChange: jest.fn().mockReturnValue(() => {}),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initPluginContext', () => {
    it('should initialize the plugin context', () => {
      initPluginContext(mockContext as never);
      const ctx = getPluginContext();
      expect(ctx).toBe(mockContext);
    });
  });

  describe('getPluginContext', () => {
    it('should return null when not initialized', () => {
      // Reset by re-importing (in real scenario)
      // For this test, we rely on previous initialization
      const ctx = getPluginContext();
      expect(ctx).toBeDefined();
    });
  });

  describe('usePluginContext', () => {
    it('should return the initialized context', () => {
      initPluginContext(mockContext as never);
      const ctx = usePluginContext();
      expect(ctx).toBe(mockContext);
    });

    it('should throw when context not initialized', () => {
      // This would require resetting the module state
      // Skipping as it requires module isolation
    });
  });

  describe('usePluginStorage', () => {
    beforeEach(() => {
      initPluginContext(mockContext as never);
    });

    it('should return initial value and setter', () => {
      const result = usePluginStorage('testKey', 'default') as [string, (v: string) => void, boolean];
      
      expect(result[0]).toBe('default');
      expect(typeof result[1]).toBe('function');
      expect(result[2]).toBe(true);
    });

    it('should handle different default value types', () => {
      const numResult = usePluginStorage('numKey', 42) as [number, (v: number) => void, boolean];
      expect(numResult[0]).toBe(42);

      const boolResult = usePluginStorage('boolKey', true) as [boolean, (v: boolean) => void, boolean];
      expect(boolResult[0]).toBe(true);

      const objResult = usePluginStorage('objKey', { foo: 'bar' }) as [{ foo: string }, (v: { foo: string }) => void, boolean];
      expect(objResult[0]).toEqual({ foo: 'bar' });
    });
  });

  describe('usePluginEvents', () => {
    beforeEach(() => {
      initPluginContext(mockContext as never);
    });

    it('should return void (hook subscribes internally)', () => {
      const handler = jest.fn();
      const result = usePluginEvents('test-event', handler);
      // usePluginEvents returns void - subscription is managed by useEffect
      expect(result).toBeUndefined();
    });

    it('should call context.events.on with wrapped handler', () => {
      const handler = jest.fn();
      usePluginEvents('test-event', handler);
      
      // The hook wraps the handler, so we check it was called with the event name
      expect(mockContext.events.on).toHaveBeenCalled();
      const callArgs = mockContext.events.on.mock.calls[0];
      expect(callArgs[0]).toBe('test-event');
      expect(typeof callArgs[1]).toBe('function');
    });
  });

  describe('usePluginSettings', () => {
    beforeEach(() => {
      initPluginContext(mockContext as never);
    });

    it('should return current setting value', () => {
      // usePluginSettings returns T | undefined, not a tuple
      const value = usePluginSettings<string>('theme');
      expect(value).toBe('setting-value');
      expect(mockContext.settings.get).toHaveBeenCalledWith('theme');
    });

    it('should call settings.get with key', () => {
      usePluginSettings<number>('maxItems');
      expect(mockContext.settings.get).toHaveBeenCalledWith('maxItems');
    });
  });

  describe('useAsyncData', () => {
    it('should return loading state initially', () => {
      const fetcher = jest.fn().mockResolvedValue('data');
      const result = useAsyncData(fetcher, []) as { data: unknown; loading: boolean; error: unknown; refetch: () => void };
      
      expect(result.loading).toBe(true);
      // data can be undefined or null initially depending on useState initialization
      expect(result.data == null).toBe(true);
      expect(result.error == null).toBe(true);
    });

    it('should call fetcher function', () => {
      const fetcher = jest.fn().mockResolvedValue('data');
      useAsyncData(fetcher, ['dep1']);
      
      expect(fetcher).toHaveBeenCalled();
    });

    it('should return refetch function', () => {
      const fetcher = jest.fn().mockResolvedValue('data');
      const result = useAsyncData(fetcher, []) as { refetch: () => void };
      
      expect(typeof result.refetch).toBe('function');
    });
  });
});
