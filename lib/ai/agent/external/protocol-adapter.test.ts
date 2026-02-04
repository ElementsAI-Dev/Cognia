/**
 * @jest-environment jsdom
 */

/**
 * Tests for Protocol Adapter Interface
 */

import {
  BaseProtocolAdapter,
  ProtocolAdapterRegistry,
  protocolAdapterRegistry,
  type SessionCreateOptions,
} from './protocol-adapter';
import type {
  ExternalAgentConfig,
  ExternalAgentSession,
  ExternalAgentMessage,
  ExternalAgentEvent,
  AcpPermissionResponse,
  ExternalAgentExecutionOptions,
} from '@/types/agent/external-agent';

// ============================================================================
// Test Implementation of BaseProtocolAdapter
// ============================================================================

class TestProtocolAdapter extends BaseProtocolAdapter {
  readonly protocol = 'test';
  private _shouldFail = false;
  private _events: ExternalAgentEvent[] = [];

  setShouldFail(fail: boolean): void {
    this._shouldFail = fail;
  }

  setMockEvents(events: ExternalAgentEvent[]): void {
    this._events = events;
  }

  async connect(config: ExternalAgentConfig): Promise<void> {
    if (this._shouldFail) {
      throw new Error('Connection failed');
    }
    this._config = config;
    this._connectionStatus = 'connected';
    this._capabilities = { streaming: true, thinking: false };
    this._tools = [{ id: 'tool_1', name: 'test_tool', parameters: {} }];
  }

  async disconnect(): Promise<void> {
    this._connectionStatus = 'disconnected';
    this._sessions.clear();
  }

  async createSession(options?: SessionCreateOptions): Promise<ExternalAgentSession> {
    if (!this.isConnected()) {
      throw new Error('Not connected');
    }

    const session: ExternalAgentSession = {
      id: this.generateSessionId(),
      agentId: this._config?.id || 'unknown',
      status: 'active',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      context: options?.context,
    };

    this._sessions.set(session.id, session);
    return session;
  }

  async closeSession(sessionId: string): Promise<void> {
    this._sessions.delete(sessionId);
  }

  async *prompt(
    sessionId: string,
    _message: ExternalAgentMessage,
    _options?: ExternalAgentExecutionOptions
  ): AsyncIterable<ExternalAgentEvent> {
    const session = this._sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Yield mock events if set
    for (const event of this._events) {
      yield event;
    }

    // Default events
    if (this._events.length === 0) {
      yield { type: 'message_start', timestamp: new Date() };
      yield { type: 'message_delta', delta: { type: 'text', text: 'Test response' }, timestamp: new Date() };
      yield { type: 'message_end', timestamp: new Date() };
      yield { type: 'done', success: true, timestamp: new Date() };
    }
  }

  async respondToPermission(_sessionId: string, _response: AcpPermissionResponse): Promise<void> {
    // Mock implementation
  }

  async cancel(_sessionId: string): Promise<void> {
    // Mock implementation
  }
}

// ============================================================================
// BaseProtocolAdapter Tests
// ============================================================================

describe('BaseProtocolAdapter', () => {
  let adapter: TestProtocolAdapter;
  const mockConfig: ExternalAgentConfig = {
    id: 'test-agent',
    name: 'Test Agent',
    protocol: 'test',
    transport: 'stdio',
    enabled: true,
    defaultPermissionMode: 'default',
    timeout: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    adapter = new TestProtocolAdapter();
  });

  describe('initial state', () => {
    it('should be disconnected initially', () => {
      expect(adapter.isConnected()).toBe(false);
      expect(adapter.connectionStatus).toBe('disconnected');
    });

    it('should have no capabilities initially', () => {
      expect(adapter.capabilities).toBeUndefined();
    });

    it('should have no tools initially', () => {
      expect(adapter.tools).toBeUndefined();
    });

    it('should have no sessions initially', () => {
      expect(adapter.getSessions()).toHaveLength(0);
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      await adapter.connect(mockConfig);

      expect(adapter.isConnected()).toBe(true);
      expect(adapter.connectionStatus).toBe('connected');
    });

    it('should set capabilities after connect', async () => {
      await adapter.connect(mockConfig);

      expect(adapter.capabilities).toBeDefined();
      expect(adapter.capabilities?.streaming).toBe(true);
    });

    it('should set tools after connect', async () => {
      await adapter.connect(mockConfig);

      expect(adapter.tools).toBeDefined();
      expect(adapter.tools).toHaveLength(1);
      expect(adapter.tools?.[0].name).toBe('test_tool');
    });

    it('should throw on connection failure', async () => {
      adapter.setShouldFail(true);

      await expect(adapter.connect(mockConfig)).rejects.toThrow('Connection failed');
      expect(adapter.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await adapter.connect(mockConfig);
      await adapter.disconnect();

      expect(adapter.isConnected()).toBe(false);
      expect(adapter.connectionStatus).toBe('disconnected');
    });

    it('should clear sessions on disconnect', async () => {
      await adapter.connect(mockConfig);
      await adapter.createSession();

      expect(adapter.getSessions()).toHaveLength(1);

      await adapter.disconnect();
      expect(adapter.getSessions()).toHaveLength(0);
    });
  });

  describe('createSession', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig);
    });

    it('should create a session', async () => {
      const session = await adapter.createSession();

      expect(session.id).toMatch(/^session_/);
      expect(session.agentId).toBe('test-agent');
      expect(session.status).toBe('active');
      expect(session.createdAt).toBeInstanceOf(Date);
    });

    it('should create session with context', async () => {
      const session = await adapter.createSession({ context: { key: 'value' } });

      expect(session.context).toEqual({ key: 'value' });
    });

    it('should throw when not connected', async () => {
      await adapter.disconnect();

      await expect(adapter.createSession()).rejects.toThrow('Not connected');
    });

    it('should track sessions', async () => {
      await adapter.createSession();
      await adapter.createSession();

      expect(adapter.getSessions()).toHaveLength(2);
    });
  });

  describe('closeSession', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig);
    });

    it('should close session', async () => {
      const session = await adapter.createSession();
      expect(adapter.getSessions()).toHaveLength(1);

      await adapter.closeSession(session.id);
      expect(adapter.getSessions()).toHaveLength(0);
    });

    it('should not throw for non-existent session', async () => {
      await expect(adapter.closeSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getSession', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig);
    });

    it('should return session by ID', async () => {
      const created = await adapter.createSession();
      const retrieved = adapter.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for non-existent session', () => {
      const session = adapter.getSession('non-existent');
      expect(session).toBeUndefined();
    });
  });

  describe('getSessions', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig);
    });

    it('should return all sessions', async () => {
      await adapter.createSession();
      await adapter.createSession();
      await adapter.createSession();

      const sessions = adapter.getSessions();
      expect(sessions).toHaveLength(3);
    });
  });

  describe('healthCheck', () => {
    it('should return false when disconnected', async () => {
      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(false);
    });

    it('should return true when connected', async () => {
      await adapter.connect(mockConfig);
      const healthy = await adapter.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(async () => {
      await adapter.connect(mockConfig);
    });

    it('should execute and return result', async () => {
      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test prompt' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(session.id);
      expect(result.finalResponse).toBe('Test response');
    });

    it('should handle message_delta events', async () => {
      adapter.setMockEvents([
        { type: 'message_delta', delta: { type: 'text', text: 'Part 1 ' }, timestamp: new Date() },
        { type: 'message_delta', delta: { type: 'text', text: 'Part 2' }, timestamp: new Date() },
        { type: 'done', success: true, timestamp: new Date() },
      ]);

      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);
      expect(result.finalResponse).toBe('Part 1 Part 2');
    });

    it('should handle thinking events', async () => {
      adapter.setMockEvents([
        { type: 'message_delta', delta: { type: 'thinking', text: 'Thinking...' }, timestamp: new Date() },
        { type: 'message_delta', delta: { type: 'text', text: 'Response' }, timestamp: new Date() },
        { type: 'done', success: true, timestamp: new Date() },
      ]);

      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);
      expect(result.finalResponse).toBe('Response');
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should handle tool use events', async () => {
      adapter.setMockEvents([
        { type: 'tool_use_start', toolUseId: 'tc_1', toolName: 'test_tool', timestamp: new Date() },
        { type: 'tool_use_end', toolUseId: 'tc_1', input: { arg: 'value' }, timestamp: new Date() },
        { type: 'tool_result', toolUseId: 'tc_1', result: 'Tool output', isError: false, timestamp: new Date() },
        { type: 'done', success: true, timestamp: new Date() },
      ]);

      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].name).toBe('test_tool');
      expect(result.toolCalls[0].result).toBe('Tool output');
    });

    it('should handle error events', async () => {
      adapter.setMockEvents([
        { type: 'error', error: 'Something went wrong', timestamp: new Date() },
        { type: 'done', success: false, timestamp: new Date() },
      ]);

      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Something went wrong');
    });

    it('should handle progress events with callback', async () => {
      const progressCallback = jest.fn();
      adapter.setMockEvents([
        { type: 'progress', progress: 50, message: 'Half done', timestamp: new Date() },
        { type: 'done', success: true, timestamp: new Date() },
      ]);

      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      await adapter.execute(session.id, message, { onProgress: progressCallback });
      expect(progressCallback).toHaveBeenCalledWith(50, 'Half done');
    });

    it('should record duration', async () => {
      const session = await adapter.createSession();
      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle execution errors gracefully', async () => {
      const session = await adapter.createSession();

      // Close session to trigger error
      await adapter.closeSession(session.id);

      const message: ExternalAgentMessage = {
        id: 'msg_1',
        role: 'user',
        content: [{ type: 'text', text: 'Test' }],
        timestamp: new Date(),
      };

      const result = await adapter.execute(session.id, message);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// ProtocolAdapterRegistry Tests
// ============================================================================

describe('ProtocolAdapterRegistry', () => {
  let registry: ProtocolAdapterRegistry;

  beforeEach(() => {
    registry = new ProtocolAdapterRegistry();
  });

  describe('register', () => {
    it('should register a protocol adapter factory', () => {
      const factory = () => new TestProtocolAdapter();
      registry.register('test', factory);

      expect(registry.has('test')).toBe(true);
    });

    it('should allow overwriting registered adapter', () => {
      const factory1 = () => new TestProtocolAdapter();
      const factory2 = () => new TestProtocolAdapter();

      registry.register('test', factory1);
      registry.register('test', factory2);

      expect(registry.has('test')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister a protocol adapter', () => {
      registry.register('test', () => new TestProtocolAdapter());
      expect(registry.has('test')).toBe(true);

      registry.unregister('test');
      expect(registry.has('test')).toBe(false);
    });

    it('should not throw when unregistering non-existent adapter', () => {
      expect(() => registry.unregister('non-existent')).not.toThrow();
    });
  });

  describe('create', () => {
    it('should create adapter instance', () => {
      registry.register('test', () => new TestProtocolAdapter());

      const adapter = registry.create('test');
      expect(adapter).toBeInstanceOf(TestProtocolAdapter);
    });

    it('should create new instance each time', () => {
      registry.register('test', () => new TestProtocolAdapter());

      const adapter1 = registry.create('test');
      const adapter2 = registry.create('test');

      expect(adapter1).not.toBe(adapter2);
    });

    it('should return undefined for unregistered protocol', () => {
      const adapter = registry.create('unregistered');
      expect(adapter).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered protocol', () => {
      registry.register('test', () => new TestProtocolAdapter());
      expect(registry.has('test')).toBe(true);
    });

    it('should return false for unregistered protocol', () => {
      expect(registry.has('unregistered')).toBe(false);
    });
  });

  describe('getProtocols', () => {
    it('should return all registered protocol identifiers', () => {
      registry.register('test1', () => new TestProtocolAdapter());
      registry.register('test2', () => new TestProtocolAdapter());
      registry.register('test3', () => new TestProtocolAdapter());

      const protocols = registry.getProtocols();

      expect(protocols).toContain('test1');
      expect(protocols).toContain('test2');
      expect(protocols).toContain('test3');
      expect(protocols).toHaveLength(3);
    });

    it('should return empty array when no protocols registered', () => {
      const protocols = registry.getProtocols();
      expect(protocols).toEqual([]);
    });
  });
});

// ============================================================================
// Global Registry Tests
// ============================================================================

describe('protocolAdapterRegistry (global)', () => {
  it('should be a singleton instance', () => {
    expect(protocolAdapterRegistry).toBeInstanceOf(ProtocolAdapterRegistry);
  });

  it('should be accessible globally', () => {
    expect(protocolAdapterRegistry).toBeDefined();
    expect(typeof protocolAdapterRegistry.register).toBe('function');
    expect(typeof protocolAdapterRegistry.create).toBe('function');
  });
});
