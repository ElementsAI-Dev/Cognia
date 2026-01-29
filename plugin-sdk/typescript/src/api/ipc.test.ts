/**
 * IPC API Tests
 *
 * @description Tests for IPC communication API type definitions.
 */

import type {
  IPCMessage,
  IPCRequest,
  IPCResponse,
  RPCHandler,
  RPCMethod,
  IPCConnectionState,
  IPCConnection,
  PluginIPCAPI,
} from './ipc';

describe('IPC API Types', () => {
  describe('IPCMessage', () => {
    it('should create a valid IPC message', () => {
      const msg: IPCMessage = {
        id: 'msg-123',
        from: 'plugin-a',
        to: 'plugin-b',
        channel: 'data-sync',
        data: { key: 'value' },
        timestamp: Date.now(),
      };

      expect(msg.id).toBe('msg-123');
      expect(msg.from).toBe('plugin-a');
      expect(msg.to).toBe('plugin-b');
      expect(msg.channel).toBe('data-sync');
      expect(msg.data).toEqual({ key: 'value' });
    });
  });

  describe('IPCRequest', () => {
    it('should create a basic RPC request', () => {
      const req: IPCRequest = {
        id: 'req-456',
        method: 'getData',
        args: [1, 2, 3],
      };

      expect(req.id).toBe('req-456');
      expect(req.method).toBe('getData');
      expect(req.args).toEqual([1, 2, 3]);
      expect(req.timeout).toBeUndefined();
    });

    it('should create a request with timeout', () => {
      const req: IPCRequest = {
        id: 'req-789',
        method: 'slowOperation',
        args: [],
        timeout: 30000,
      };

      expect(req.timeout).toBe(30000);
    });
  });

  describe('IPCResponse', () => {
    it('should create a successful response', () => {
      const res: IPCResponse<{ data: string }> = {
        requestId: 'req-123',
        success: true,
        result: { data: 'test' },
      };

      expect(res.success).toBe(true);
      expect(res.result).toEqual({ data: 'test' });
      expect(res.error).toBeUndefined();
    });

    it('should create a failed response', () => {
      const res: IPCResponse = {
        requestId: 'req-456',
        success: false,
        error: 'Method not found',
      };

      expect(res.success).toBe(false);
      expect(res.error).toBe('Method not found');
      expect(res.result).toBeUndefined();
    });
  });

  describe('RPCHandler', () => {
    it('should define a sync handler', () => {
      const handler: RPCHandler<{ id: number }, string> = (args) => {
        return `Result for ${args.id}`;
      };

      const result = handler({ id: 42 });
      expect(result).toBe('Result for 42');
    });

    it('should define an async handler', async () => {
      const handler: RPCHandler<string, number> = async (args) => {
        return args.length;
      };

      const result = await handler('hello');
      expect(result).toBe(5);
    });
  });

  describe('RPCMethod', () => {
    it('should create an RPC method definition', () => {
      const method: RPCMethod = {
        name: 'processData',
        description: 'Processes input data and returns result',
        handler: async (args) => ({ processed: true }),
      };

      expect(method.name).toBe('processData');
      expect(method.description).toBeDefined();
      expect(method.handler).toBeDefined();
    });

    it('should create a method without description', () => {
      const method: RPCMethod = {
        name: 'simpleMethod',
        handler: () => 'done',
      };

      expect(method.description).toBeUndefined();
    });
  });

  describe('IPCConnectionState', () => {
    it('should support all connection states', () => {
      const states: IPCConnectionState[] = ['connected', 'disconnected', 'connecting'];

      expect(states).toContain('connected');
      expect(states).toContain('disconnected');
      expect(states).toContain('connecting');
      expect(states).toHaveLength(3);
    });
  });

  describe('IPCConnection', () => {
    it('should create a connected connection', () => {
      const conn: IPCConnection = {
        pluginId: 'other-plugin',
        state: 'connected',
        connectedAt: new Date(),
        lastMessageAt: new Date(),
      };

      expect(conn.state).toBe('connected');
      expect(conn.connectedAt).toBeDefined();
      expect(conn.lastMessageAt).toBeDefined();
    });

    it('should create a disconnected connection', () => {
      const conn: IPCConnection = {
        pluginId: 'offline-plugin',
        state: 'disconnected',
      };

      expect(conn.state).toBe('disconnected');
      expect(conn.connectedAt).toBeUndefined();
    });

    it('should create a connecting connection', () => {
      const conn: IPCConnection = {
        pluginId: 'slow-plugin',
        state: 'connecting',
      };

      expect(conn.state).toBe('connecting');
    });
  });

  describe('PluginIPCAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      expect(mockAPI.send).toBeDefined();
      expect(mockAPI.broadcast).toBeDefined();
      expect(mockAPI.on).toBeDefined();
      expect(mockAPI.once).toBeDefined();
      expect(mockAPI.invoke).toBeDefined();
      expect(mockAPI.expose).toBeDefined();
      expect(mockAPI.unexpose).toBeDefined();
      expect(mockAPI.getMethods).toBeDefined();
      expect(mockAPI.isAvailable).toBeDefined();
      expect(mockAPI.getConnection).toBeDefined();
      expect(mockAPI.getConnections).toBeDefined();
      expect(mockAPI.onConnectionChange).toBeDefined();
    });

    it('should send and broadcast messages', () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      mockAPI.send('target-plugin', 'update', { key: 'value' });
      expect(mockAPI.send).toHaveBeenCalledWith('target-plugin', 'update', { key: 'value' });

      mockAPI.broadcast('global-event', { message: 'hello all' });
      expect(mockAPI.broadcast).toHaveBeenCalledWith('global-event', { message: 'hello all' });
    });

    it('should listen for messages', () => {
      const handlers: Record<string, (data: unknown, senderId: string) => void> = {};
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn().mockImplementation((channel, handler) => {
          handlers[channel] = handler;
          return () => delete handlers[channel];
        }),
        once: jest.fn().mockImplementation((channel, handler) => {
          const wrappedHandler = (data: unknown, senderId: string) => {
            handler(data, senderId);
            delete handlers[channel];
          };
          handlers[channel] = wrappedHandler;
          return () => delete handlers[channel];
        }),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      const unsubscribe = mockAPI.on('data-update', (data, senderId) => {
        expect(senderId).toBeDefined();
      });

      expect(mockAPI.on).toHaveBeenCalledWith('data-update', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');

      const unsubOnce = mockAPI.once('one-time', () => {});
      expect(typeof unsubOnce).toBe('function');
    });

    it('should invoke RPC methods', async () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn().mockResolvedValue({ result: 'success' }),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      const result = await mockAPI.invoke<{ result: string }>(
        'target-plugin',
        'processData',
        { input: 'test' },
        5000
      );

      expect(result).toEqual({ result: 'success' });
      expect(mockAPI.invoke).toHaveBeenCalledWith(
        'target-plugin',
        'processData',
        { input: 'test' },
        5000
      );
    });

    it('should expose and unexpose methods', () => {
      const exposedMethods: Record<string, RPCHandler> = {};
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn().mockImplementation((methods) => {
          Object.assign(exposedMethods, methods);
          return () => {
            Object.keys(methods).forEach(k => delete exposedMethods[k]);
          };
        }),
        unexpose: jest.fn().mockImplementation((name) => {
          delete exposedMethods[name];
        }),
        getMethods: jest.fn().mockReturnValue(Object.keys(exposedMethods)),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      const methods = {
        getData: async () => ({ data: 'test' }),
        processItem: async (args: unknown) => ({ processed: true }),
      };

      const unsubscribe = mockAPI.expose(methods);
      expect(mockAPI.expose).toHaveBeenCalledWith(methods);
      expect(typeof unsubscribe).toBe('function');

      mockAPI.unexpose('getData');
      expect(mockAPI.unexpose).toHaveBeenCalledWith('getData');
    });

    it('should get methods from plugins', async () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn().mockImplementation(async (pluginId) => {
          if (pluginId === 'other-plugin') {
            return ['getData', 'processItem', 'cleanup'];
          }
          return ['myMethod1', 'myMethod2'];
        }),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      const otherMethods = await mockAPI.getMethods('other-plugin');
      expect(otherMethods).toContain('getData');
      expect(otherMethods).toHaveLength(3);

      const myMethods = await mockAPI.getMethods();
      expect(myMethods).toHaveLength(2);
    });

    it('should check plugin availability', () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn().mockImplementation((id) => id === 'online-plugin'),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn(),
      };

      expect(mockAPI.isAvailable('online-plugin')).toBe(true);
      expect(mockAPI.isAvailable('offline-plugin')).toBe(false);
    });

    it('should get connection info', () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn(),
        getConnection: jest.fn().mockImplementation((id) => {
          if (id === 'connected-plugin') {
            return {
              pluginId: 'connected-plugin',
              state: 'connected' as IPCConnectionState,
              connectedAt: new Date(),
              lastMessageAt: new Date(),
            };
          }
          return null;
        }),
        getConnections: jest.fn().mockReturnValue([
          { pluginId: 'plugin-a', state: 'connected' as IPCConnectionState },
          { pluginId: 'plugin-b', state: 'connected' as IPCConnectionState },
        ]),
        onConnectionChange: jest.fn(),
      };

      const conn = mockAPI.getConnection('connected-plugin');
      expect(conn).not.toBeNull();
      expect(conn!.state).toBe('connected');

      const missing = mockAPI.getConnection('missing-plugin');
      expect(missing).toBeNull();

      const all = mockAPI.getConnections();
      expect(all).toHaveLength(2);
    });

    it('should listen for connection changes', () => {
      const mockAPI: PluginIPCAPI = {
        send: jest.fn(),
        broadcast: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        invoke: jest.fn(),
        expose: jest.fn(),
        unexpose: jest.fn(),
        getMethods: jest.fn(),
        isAvailable: jest.fn(),
        getConnection: jest.fn(),
        getConnections: jest.fn(),
        onConnectionChange: jest.fn().mockReturnValue(() => {}),
      };

      const unsubscribe = mockAPI.onConnectionChange((pluginId, state) => {
        expect(pluginId).toBeDefined();
        expect(['connected', 'disconnected', 'connecting']).toContain(state);
      });

      expect(mockAPI.onConnectionChange).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
