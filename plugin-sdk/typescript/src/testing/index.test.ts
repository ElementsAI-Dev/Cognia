/**
 * Testing Utilities Unit Tests
 */

import {
  createMockLogger,
  createMockStorage,
  createMockEventEmitter,
  createMockSettings,
  createMockContext,
  createMockToolContext,
  testTool,
  createSpy,
} from './index';

describe('Testing Utilities', () => {
  describe('createMockLogger', () => {
    it('should create a logger with all log methods', () => {
      const logger = createMockLogger();

      expect(typeof logger.trace).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.fatal).toBe('function');
      expect(typeof logger.child).toBe('function');
      expect(typeof logger.withContext).toBe('function');
    });

    it('should capture log calls', () => {
      const logger = createMockLogger();

      logger.trace?.('trace message');
      logger.info('test message', { data: 'value' });
      logger.error('error message');
      logger.fatal?.('fatal message');

      expect(logger.logs).toHaveLength(4);
      expect(logger.logs[0]).toEqual({
        level: 'trace',
        message: 'trace message',
        args: [],
      });
      expect(logger.logs[1]).toEqual({
        level: 'info',
        message: 'test message',
        args: [{ data: 'value' }],
      });
      expect(logger.logs[2]).toEqual({
        level: 'error',
        message: 'error message',
        args: [],
      });
      expect(logger.logs[3]).toEqual({
        level: 'fatal',
        message: 'fatal message',
        args: [],
      });
    });

    it('should clear logs', () => {
      const logger = createMockLogger();

      logger.info('test');
      logger.warn('warning');
      expect(logger.logs).toHaveLength(2);

      logger.clear();
      expect(logger.logs).toHaveLength(0);
    });

    it('should filter logs by level', () => {
      const logger = createMockLogger();

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');
      logger.fatal?.('fatal msg');

      const errors = logger.getByLevel('error');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('error msg');

      const warnings = logger.getByLevel('warn');
      expect(warnings).toHaveLength(1);

      const fatals = logger.getByLevel('fatal');
      expect(fatals).toHaveLength(1);
    });
  });

  describe('createMockStorage', () => {
    it('should create storage with all methods', () => {
      const storage = createMockStorage();

      expect(typeof storage.get).toBe('function');
      expect(typeof storage.set).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.keys).toBe('function');
      expect(typeof storage.clear).toBe('function');
    });

    it('should store and retrieve values', async () => {
      const storage = createMockStorage();

      await storage.set('key1', 'value1');
      const value = await storage.get<string>('key1');

      expect(value).toBe('value1');
    });

    it('should initialize with data', async () => {
      const storage = createMockStorage({ existingKey: 'existingValue' });

      const value = await storage.get<string>('existingKey');
      expect(value).toBe('existingValue');
    });

    it('should delete values', async () => {
      const storage = createMockStorage({ toDelete: 'value' });

      await storage.delete('toDelete');
      const value = await storage.get('toDelete');

      expect(value).toBeUndefined();
    });

    it('should list keys', async () => {
      const storage = createMockStorage({ a: 1, b: 2, c: 3 });

      const keys = await storage.keys();
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('should clear all data', async () => {
      const storage = createMockStorage({ a: 1, b: 2 });

      await storage.clear();
      const keys = await storage.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('createMockEventEmitter', () => {
    it('should create emitter with all methods', () => {
      const emitter = createMockEventEmitter();

      expect(typeof emitter.on).toBe('function');
      expect(typeof emitter.off).toBe('function');
      expect(typeof emitter.emit).toBe('function');
      expect(typeof emitter.once).toBe('function');
    });

    it('should register and call handlers', () => {
      const emitter = createMockEventEmitter();
      const handler = jest.fn();

      emitter.on('test', handler);
      emitter.emit('test', 'arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should capture emitted events', () => {
      const emitter = createMockEventEmitter();

      emitter.emit('event1', 'data1');
      emitter.emit('event2', 'data2', 'data3');

      expect(emitter.emittedEvents).toHaveLength(2);
      expect(emitter.getEvents('event1')).toEqual([['data1']]);
      expect(emitter.getEvents('event2')).toEqual([['data2', 'data3']]);
    });

    it('should unsubscribe handlers', () => {
      const emitter = createMockEventEmitter();
      const handler = jest.fn();

      const unsubscribe = emitter.on('test', handler);
      unsubscribe();
      emitter.emit('test');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle once subscriptions', () => {
      const emitter = createMockEventEmitter();
      const handler = jest.fn();

      emitter.once('test', handler);
      emitter.emit('test', 'first');
      emitter.emit('test', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should clear events and handlers', () => {
      const emitter = createMockEventEmitter();
      const handler = jest.fn();

      emitter.on('test', handler);
      emitter.emit('test');
      emitter.clear();

      expect(emitter.emittedEvents).toHaveLength(0);
      expect(emitter.handlers.size).toBe(0);
    });
  });

  describe('createMockSettings', () => {
    it('should get and set values', () => {
      const settings = createMockSettings({ theme: 'dark' });

      expect(settings.get('theme')).toBe('dark');

      settings.set('theme', 'light');
      expect(settings.get('theme')).toBe('light');
    });

    it('should notify on change', () => {
      const settings = createMockSettings();
      const handler = jest.fn();

      settings.onChange('theme', handler);
      settings.set('theme', 'dark');

      expect(handler).toHaveBeenCalledWith('dark');
    });

    it('should unsubscribe from changes', () => {
      const settings = createMockSettings();
      const handler = jest.fn();

      const unsubscribe = settings.onChange('theme', handler);
      unsubscribe();
      settings.set('theme', 'dark');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('createMockContext', () => {
    it('should create context with default values', () => {
      const context = createMockContext();

      expect(context.pluginId).toBe('test-plugin');
      expect(context.pluginPath).toBe('/test/plugins/test-plugin');
      expect(context.config).toEqual({});
    });

    it('should accept custom options', () => {
      const context = createMockContext({
        pluginId: 'custom-plugin',
        pluginPath: '/custom/path',
        config: { key: 'value' },
      });

      expect(context.pluginId).toBe('custom-plugin');
      expect(context.pluginPath).toBe('/custom/path');
      expect(context.config).toEqual({ key: 'value' });
    });

    it('should initialize storage with data', async () => {
      const context = createMockContext({
        storageData: { savedKey: 'savedValue' },
      });

      const value = await context.storage.get('savedKey');
      expect(value).toBe('savedValue');
    });

    it('should initialize settings', () => {
      const context = createMockContext({
        settings: { theme: 'dark' },
      });

      const theme = context.settings.get('theme');
      expect(theme).toBe('dark');
    });

    it('should have reset method', async () => {
      const context = createMockContext();

      context.logger.info('test');
      await context.storage.set('key', 'value');
      context.events.emit('event');

      context.reset();

      expect(context.logger.logs).toHaveLength(0);
      expect(context.events.emittedEvents).toHaveLength(0);
    });

    it('should support overrides', () => {
      const customLogger = createMockLogger();
      const context = createMockContext({
        overrides: { logger: customLogger },
      });

      expect(context.logger).toBe(customLogger);
    });
  });

  describe('createMockToolContext', () => {
    it('should create tool context with defaults', () => {
      const context = createMockToolContext();

      expect(context.sessionId).toBe('test-session');
      expect(context.messageId).toBe('test-message');
      expect(context.config).toEqual({});
      expect(typeof context.reportProgress).toBe('function');
    });

    it('should accept overrides', () => {
      const context = createMockToolContext({
        sessionId: 'custom-session',
        config: { apiKey: 'test' },
      });

      expect(context.sessionId).toBe('custom-session');
      expect(context.config).toEqual({ apiKey: 'test' });
    });
  });

  describe('testTool', () => {
    it('should execute tool with mock context', async () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        parametersSchema: {
          type: 'object' as const,
          properties: {
            input: { type: 'string' },
          },
        },
        execute: jest.fn().mockResolvedValue({ result: 'success' }),
      };

      const result = await testTool(tool, { input: 'test' });

      expect(tool.execute).toHaveBeenCalledWith(
        { input: 'test' },
        expect.objectContaining({ sessionId: 'test-session' })
      );
      expect(result).toEqual({ result: 'success' });
    });

    it('should pass custom context', async () => {
      const tool = {
        name: 'test-tool',
        description: 'A test tool',
        parametersSchema: { type: 'object' as const, properties: {} },
        execute: jest.fn().mockResolvedValue({}),
      };

      await testTool(tool, {}, { sessionId: 'custom-session' });

      expect(tool.execute).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ sessionId: 'custom-session' })
      );
    });
  });

  describe('createSpy', () => {
    it('should track function calls', () => {
      const spy = createSpy((...args: unknown[]) => (args[0] as number) * 2);

      spy(5);
      spy(10);

      expect(spy.callCount).toBe(2);
      expect(spy.calls[0]).toEqual({ args: [5], result: 10 });
      expect(spy.calls[1]).toEqual({ args: [10], result: 20 });
    });

    it('should track last call', () => {
      const spy = createSpy((...args: unknown[]) => (args[0] as number) + 1);

      spy(1);
      spy(2);
      spy(3);

      expect(spy.lastCall).toEqual({ args: [3], result: 4 });
    });

    it('should reset calls', () => {
      const spy = createSpy();

      spy('a');
      spy('b');
      expect(spy.callCount).toBe(2);

      spy.reset();
      expect(spy.callCount).toBe(0);
      expect(spy.lastCall).toBeUndefined();
    });

    it('should work without implementation', () => {
      const spy = createSpy();

      const result = spy('arg');

      expect(result).toBeUndefined();
      expect(spy.callCount).toBe(1);
    });
  });
});
