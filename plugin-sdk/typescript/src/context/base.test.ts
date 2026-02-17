/**
 * Base Context Tests
 *
 * @description Tests for base plugin context type definitions.
 */

import type {
  PluginLogger,
  PluginStorage,
  PluginEventEmitter,
  PluginSettingsAPI,
  PluginPythonAPI,
  PluginPythonModule,
  PluginContext,
} from './base';

describe('Base Context Types', () => {
  describe('PluginLogger', () => {
    it('should define all log levels', () => {
      const mockLogger: PluginLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        child: jest.fn(),
        withContext: jest.fn(),
      };

      expect(mockLogger.debug).toBeDefined();
      expect(mockLogger.info).toBeDefined();
      expect(mockLogger.warn).toBeDefined();
      expect(mockLogger.error).toBeDefined();
      expect(mockLogger.trace).toBeDefined();
      expect(mockLogger.fatal).toBeDefined();
      expect(mockLogger.child).toBeDefined();
      expect(mockLogger.withContext).toBeDefined();
    });

    it('should call log methods with message and args', () => {
      const mockLogger: PluginLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      mockLogger.debug('Debug message', { key: 'value' });
      mockLogger.info('Info message', 123, 'extra');
      mockLogger.warn('Warning message');
      mockLogger.error('Error message', new Error('test'));

      expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', { key: 'value' });
      expect(mockLogger.info).toHaveBeenCalledWith('Info message', 123, 'extra');
      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message');
      expect(mockLogger.error).toHaveBeenCalledWith('Error message', expect.any(Error));
    });
  });

  describe('PluginStorage', () => {
    it('should define all storage methods', () => {
      const mockStorage: PluginStorage = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        keys: jest.fn(),
        clear: jest.fn(),
      };

      expect(mockStorage.get).toBeDefined();
      expect(mockStorage.set).toBeDefined();
      expect(mockStorage.delete).toBeDefined();
      expect(mockStorage.keys).toBeDefined();
      expect(mockStorage.clear).toBeDefined();
    });

    it('should handle typed storage operations', async () => {
      interface UserSettings {
        theme: string;
        language: string;
      }

      const mockStorage: PluginStorage = {
        get: jest.fn().mockResolvedValue({ theme: 'dark', language: 'en' }),
        set: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        keys: jest.fn().mockResolvedValue(['settings', 'cache']),
        clear: jest.fn().mockResolvedValue(undefined),
      };

      const settings = await mockStorage.get<UserSettings>('settings');
      expect(settings?.theme).toBe('dark');

      await mockStorage.set('settings', { theme: 'light', language: 'en' });
      expect(mockStorage.set).toHaveBeenCalled();

      const keys = await mockStorage.keys();
      expect(keys).toContain('settings');
    });
  });

  describe('PluginEventEmitter', () => {
    it('should define all event methods', () => {
      const mockEmitter: PluginEventEmitter = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn(),
      };

      expect(mockEmitter.on).toBeDefined();
      expect(mockEmitter.off).toBeDefined();
      expect(mockEmitter.emit).toBeDefined();
      expect(mockEmitter.once).toBeDefined();
    });

    it('should handle event subscription', () => {
      const unsubscribe = jest.fn();
      const handler = jest.fn();

      const mockEmitter: PluginEventEmitter = {
        on: jest.fn().mockReturnValue(unsubscribe),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn().mockReturnValue(unsubscribe),
      };

      const unsub = mockEmitter.on('custom-event', handler);
      expect(mockEmitter.on).toHaveBeenCalledWith('custom-event', handler);
      expect(unsub).toBe(unsubscribe);

      mockEmitter.emit('custom-event', { data: 'test' });
      expect(mockEmitter.emit).toHaveBeenCalledWith('custom-event', { data: 'test' });
    });

    it('should handle once subscription', () => {
      const unsubscribe = jest.fn();
      const handler = jest.fn();

      const mockEmitter: PluginEventEmitter = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        once: jest.fn().mockReturnValue(unsubscribe),
      };

      const unsub = mockEmitter.once('one-time-event', handler);
      expect(mockEmitter.once).toHaveBeenCalledWith('one-time-event', handler);
      expect(unsub).toBe(unsubscribe);
    });
  });

  describe('PluginSettingsAPI', () => {
    it('should define all settings methods', () => {
      const mockSettings: PluginSettingsAPI = {
        get: jest.fn(),
        set: jest.fn(),
        onChange: jest.fn(),
      };

      expect(mockSettings.get).toBeDefined();
      expect(mockSettings.set).toBeDefined();
      expect(mockSettings.onChange).toBeDefined();
    });

    it('should handle settings operations', () => {
      const unsubscribe = jest.fn();

      const mockSettings: PluginSettingsAPI = {
        get: jest.fn().mockReturnValue('dark'),
        set: jest.fn(),
        onChange: jest.fn().mockReturnValue(unsubscribe),
      };

      const theme = mockSettings.get<string>('theme');
      expect(theme).toBe('dark');

      mockSettings.set('theme', 'light');
      expect(mockSettings.set).toHaveBeenCalledWith('theme', 'light');

      const unsub = mockSettings.onChange('theme', jest.fn());
      expect(unsub).toBe(unsubscribe);
    });
  });

  describe('PluginPythonAPI', () => {
    it('should define all Python methods', () => {
      const mockPython: PluginPythonAPI = {
        call: jest.fn(),
        eval: jest.fn(),
        import: jest.fn(),
      };

      expect(mockPython.call).toBeDefined();
      expect(mockPython.eval).toBeDefined();
      expect(mockPython.import).toBeDefined();
    });

    it('should call Python functions', async () => {
      const mockPython: PluginPythonAPI = {
        call: jest.fn().mockResolvedValue(42),
        eval: jest.fn().mockResolvedValue(100),
        import: jest.fn(),
      };

      const result = await mockPython.call<number>('add', 10, 32);
      expect(result).toBe(42);
      expect(mockPython.call).toHaveBeenCalledWith('add', 10, 32);

      const evalResult = await mockPython.eval<number>('x + y', { x: 40, y: 60 });
      expect(evalResult).toBe(100);
    });

    it('should import Python modules', async () => {
      const mockModule: PluginPythonModule = {
        call: jest.fn().mockResolvedValue(4),
        getattr: jest.fn().mockResolvedValue(3.14159),
      };

      const mockPython: PluginPythonAPI = {
        call: jest.fn(),
        eval: jest.fn(),
        import: jest.fn().mockResolvedValue(mockModule),
      };

      const math = await mockPython.import('math');
      const sqrt = await math.call<number>('sqrt', 16);
      expect(sqrt).toBe(4);

      const pi = await math.getattr<number>('pi');
      expect(pi).toBe(3.14159);
    });
  });

  describe('PluginContext', () => {
    it('should define all context properties', () => {
      const mockContext: PluginContext = {
        pluginId: 'com.example.plugin',
        pluginPath: '/plugins/com.example.plugin',
        config: { setting1: 'value1' },
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        },
        storage: {
          get: jest.fn(),
          set: jest.fn(),
          delete: jest.fn(),
          keys: jest.fn(),
          clear: jest.fn(),
        },
        events: {
          on: jest.fn(),
          off: jest.fn(),
          emit: jest.fn(),
          once: jest.fn(),
        },
        ui: {} as any,
        a2ui: {} as any,
        agent: {} as any,
        settings: {
          get: jest.fn(),
          set: jest.fn(),
          onChange: jest.fn(),
        },
        network: {} as any,
        fs: {} as any,
        clipboard: {} as any,
        shell: {} as any,
        db: {} as any,
        shortcuts: {} as any,
        contextMenu: {} as any,
        window: {} as any,
        secrets: {} as any,
        scheduler: {} as any,
      };

      expect(mockContext.pluginId).toBe('com.example.plugin');
      expect(mockContext.pluginPath).toBe('/plugins/com.example.plugin');
      expect(mockContext.config.setting1).toBe('value1');
      expect(mockContext.logger).toBeDefined();
      expect(mockContext.storage).toBeDefined();
      expect(mockContext.events).toBeDefined();
      expect(mockContext.ui).toBeDefined();
      expect(mockContext.a2ui).toBeDefined();
      expect(mockContext.agent).toBeDefined();
      expect(mockContext.settings).toBeDefined();
      expect(mockContext.network).toBeDefined();
      expect(mockContext.fs).toBeDefined();
      expect(mockContext.clipboard).toBeDefined();
      expect(mockContext.shell).toBeDefined();
      expect(mockContext.db).toBeDefined();
      expect(mockContext.shortcuts).toBeDefined();
      expect(mockContext.contextMenu).toBeDefined();
      expect(mockContext.window).toBeDefined();
      expect(mockContext.secrets).toBeDefined();
    });

    it('should support optional Python API', () => {
      const contextWithPython: PluginContext = {
        pluginId: 'hybrid-plugin',
        pluginPath: '/plugins/hybrid',
        config: {},
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        storage: { get: jest.fn(), set: jest.fn(), delete: jest.fn(), keys: jest.fn(), clear: jest.fn() },
        events: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), once: jest.fn() },
        ui: {} as any,
        a2ui: {} as any,
        agent: {} as any,
        settings: { get: jest.fn(), set: jest.fn(), onChange: jest.fn() },
        network: {} as any,
        fs: {} as any,
        clipboard: {} as any,
        shell: {} as any,
        db: {} as any,
        shortcuts: {} as any,
        contextMenu: {} as any,
        window: {} as any,
        secrets: {} as any,
        scheduler: {} as any,
        python: {
          call: jest.fn(),
          eval: jest.fn(),
          import: jest.fn(),
        },
      };

      expect(contextWithPython.python).toBeDefined();

      const contextWithoutPython: PluginContext = {
        pluginId: 'frontend-plugin',
        pluginPath: '/plugins/frontend',
        config: {},
        logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
        storage: { get: jest.fn(), set: jest.fn(), delete: jest.fn(), keys: jest.fn(), clear: jest.fn() },
        events: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), once: jest.fn() },
        ui: {} as any,
        a2ui: {} as any,
        agent: {} as any,
        settings: { get: jest.fn(), set: jest.fn(), onChange: jest.fn() },
        network: {} as any,
        fs: {} as any,
        clipboard: {} as any,
        shell: {} as any,
        db: {} as any,
        shortcuts: {} as any,
        contextMenu: {} as any,
        window: {} as any,
        secrets: {} as any,
        scheduler: {} as any,
      };

      expect(contextWithoutPython.python).toBeUndefined();
    });

    it('should use context APIs together', () => {
      const mockContext: PluginContext = {
        pluginId: 'test-plugin',
        pluginPath: '/plugins/test',
        config: {},
        logger: {
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        },
        storage: {
          get: jest.fn().mockResolvedValue({ count: 5 }),
          set: jest.fn(),
          delete: jest.fn(),
          keys: jest.fn(),
          clear: jest.fn(),
        },
        events: {
          on: jest.fn(),
          off: jest.fn(),
          emit: jest.fn(),
          once: jest.fn(),
        },
        ui: {} as any,
        a2ui: {} as any,
        agent: {} as any,
        settings: { get: jest.fn(), set: jest.fn(), onChange: jest.fn() },
        network: {} as any,
        fs: {} as any,
        clipboard: {} as any,
        shell: {} as any,
        db: {} as any,
        shortcuts: {} as any,
        contextMenu: {} as any,
        window: {} as any,
        secrets: {} as any,
        scheduler: {} as any,
      };

      // Simulate plugin usage
      mockContext.logger.info('Plugin initializing');
      mockContext.storage.get('state');
      mockContext.events.emit('initialized');

      expect(mockContext.logger.info).toHaveBeenCalledWith('Plugin initializing');
      expect(mockContext.storage.get).toHaveBeenCalledWith('state');
      expect(mockContext.events.emit).toHaveBeenCalledWith('initialized');
    });
  });
});
