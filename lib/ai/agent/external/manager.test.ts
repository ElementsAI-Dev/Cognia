/**
 * @jest-environment jsdom
 */

/**
 * Tests for External Agent Manager
 */

import {
  ExternalAgentManager,
  getExternalAgentManager,
  checkExternalAgentDelegation,
  executeOnExternalAgent,
} from './manager';
import { protocolAdapterRegistry } from './protocol-adapter';
import { createExternalAgentTraceBridge } from './agent-trace-bridge';
import type { ExternalAgentConfig, ExternalAgentDelegationRule } from '@/types/agent/external-agent';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn().mockReturnValue(false),
}));

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn().mockResolvedValue(() => {}),
  emit: jest.fn(),
}));

jest.mock('./agent-trace-bridge', () => ({
  createExternalAgentTraceBridge: jest.fn(() => ({
    onStart: jest.fn().mockResolvedValue(undefined),
    onEvent: jest.fn().mockResolvedValue(undefined),
    onComplete: jest.fn().mockResolvedValue(undefined),
    onError: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('ExternalAgentManager', () => {
  const mockCreateTraceBridge = createExternalAgentTraceBridge as jest.MockedFunction<
    typeof createExternalAgentTraceBridge
  >;

  const buildConfig = (id: string): ExternalAgentConfig => ({
    id,
    name: id,
    protocol: 'acp',
    transport: 'stdio',
    enabled: false,
    defaultPermissionMode: 'default',
    timeout: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const buildInstance = (id: string) => ({
    config: buildConfig(id),
    connectionStatus: 'connected' as const,
    status: 'ready' as const,
    capabilities: {},
    tools: [] as Array<{ id: string; name: string }>,
    sessions: new Map(),
    connectionAttempts: 0,
    stats: {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalTokensUsed: 0,
      averageResponseTime: 0,
    },
  });

  beforeEach(() => {
    ExternalAgentManager.resetInstance();
    jest.clearAllMocks();
    mockCreateTraceBridge.mockClear();
  });

  afterEach(() => {
    ExternalAgentManager.resetInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ExternalAgentManager.getInstance();
      const instance2 = ExternalAgentManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should accept configuration', () => {
      const instance = ExternalAgentManager.getInstance({ maxConnections: 5 });
      expect(instance).toBeDefined();
    });
  });

  describe('resetInstance', () => {
    it('should reset singleton', () => {
      const instance1 = ExternalAgentManager.getInstance();
      ExternalAgentManager.resetInstance();
      const instance2 = ExternalAgentManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('addAgent', () => {
    it('should add agent successfully', async () => {
      const manager = ExternalAgentManager.getInstance();
      const config: ExternalAgentConfig = {
        id: 'test-agent',
        name: 'Test Agent',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const instance = await manager.addAgent(config);

      expect(instance.config.id).toBe('test-agent');
      expect(instance.connectionStatus).toBe('disconnected');
    });

    it('should throw for duplicate agent ID', async () => {
      const manager = ExternalAgentManager.getInstance();
      const config: ExternalAgentConfig = {
        id: 'duplicate-agent',
        name: 'Duplicate',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await manager.addAgent(config);
      await expect(manager.addAgent(config)).rejects.toThrow('Agent already exists');
    });

    it('should throw when max connections reached', async () => {
      const manager = ExternalAgentManager.getInstance({ maxConnections: 1 });

      await manager.addAgent({
        id: 'agent-1',
        name: 'Agent 1',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        manager.addAgent({
          id: 'agent-2',
          name: 'Agent 2',
          protocol: 'acp',
          transport: 'stdio',
          enabled: false,
          defaultPermissionMode: 'default',
          timeout: 30000,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ).rejects.toThrow('Maximum connections reached');
    });
  });

  describe('removeAgent', () => {
    it('should remove agent', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'to-remove',
        name: 'To Remove',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.removeAgent('to-remove');
      expect(manager.getAgent('to-remove')).toBeUndefined();
    });

    it('should not throw for non-existent agent', async () => {
      const manager = ExternalAgentManager.getInstance();
      await expect(manager.removeAgent('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'get-test',
        name: 'Get Test',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const agent = manager.getAgent('get-test');
      expect(agent?.config.name).toBe('Get Test');
    });

    it('should return undefined for non-existent agent', () => {
      const manager = ExternalAgentManager.getInstance();
      expect(manager.getAgent('non-existent')).toBeUndefined();
    });
  });

  describe('getAllAgents', () => {
    it('should return all agents', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'agent-a',
        name: 'Agent A',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await manager.addAgent({
        id: 'agent-b',
        name: 'Agent B',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const agents = manager.getAllAgents();
      expect(agents).toHaveLength(2);
    });

    it('should return empty array initially', () => {
      const manager = ExternalAgentManager.getInstance();
      expect(manager.getAllAgents()).toEqual([]);
    });
  });

  describe('getAgentsByStatus', () => {
    it('should filter by connection status', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'status-test',
        name: 'Status Test',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const disconnected = manager.getAgentsByStatus('disconnected');
      expect(disconnected).toHaveLength(1);

      const connected = manager.getAgentsByStatus('connected');
      expect(connected).toHaveLength(0);
    });
  });

  describe('getConnectedAgents', () => {
    it('should return only connected agents', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'not-connected',
        name: 'Not Connected',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(manager.getConnectedAgents()).toHaveLength(0);
    });
  });

  describe('hasConnectedAgents', () => {
    it('should return false when no connected agents', () => {
      const manager = ExternalAgentManager.getInstance();
      expect(manager.hasConnectedAgents()).toBe(false);
    });
  });

  describe('delegation rules', () => {
    it('should add delegation rule', () => {
      const manager = ExternalAgentManager.getInstance();
      const rule: ExternalAgentDelegationRule = {
        id: 'rule-1',
        name: 'Code Rule',
        enabled: true,
        condition: 'keyword',
        matcher: 'code|implement',
        targetAgentId: 'code-agent',
        priority: 10,
      };

      manager.addDelegationRule(rule);
      const delegation = manager.checkDelegation('implement a feature');
      expect(delegation.shouldDelegate).toBe(false); // No connected agent
    });

    it('should remove delegation rule', () => {
      const manager = ExternalAgentManager.getInstance();
      manager.addDelegationRule({
        id: 'to-remove',
        name: 'To Remove',
        enabled: true,
        condition: 'always',
        matcher: '',
        targetAgentId: 'agent',
        priority: 1,
      });

      manager.removeDelegationRule('to-remove');
      const delegation = manager.checkDelegation('any task');
      expect(delegation.matchedRule).toBeUndefined();
    });

    it('should sort rules by priority', () => {
      const manager = ExternalAgentManager.getInstance();
      manager.addDelegationRule({
        id: 'low',
        name: 'Low',
        enabled: true,
        condition: 'always',
        matcher: '',
        targetAgentId: 'agent',
        priority: 1,
      });
      manager.addDelegationRule({
        id: 'high',
        name: 'High',
        enabled: true,
        condition: 'always',
        matcher: '',
        targetAgentId: 'agent',
        priority: 100,
      });

      // Rules should be sorted by priority
      expect(manager).toBeDefined();
    });
  });

  describe('checkDelegation', () => {
    it('should return shouldDelegate false when no matching rule', () => {
      const manager = ExternalAgentManager.getInstance();
      const result = manager.checkDelegation('random task');

      expect(result.shouldDelegate).toBe(false);
      expect(result.reason).toBe('No matching delegation rule');
    });

    it('should check keyword condition', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'code-agent',
        name: 'Code Agent',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      manager.addDelegationRule({
        id: 'keyword-rule',
        name: 'Keyword Rule',
        enabled: true,
        condition: 'keyword',
        matcher: 'implement|build',
        targetAgentId: 'code-agent',
        priority: 10,
      });

      // Agent is not connected so delegation won't happen
      const result = manager.checkDelegation('implement a new feature');
      expect(result.shouldDelegate).toBe(false);
    });

    it('should respect disabled rules', async () => {
      const manager = ExternalAgentManager.getInstance();
      manager.addDelegationRule({
        id: 'disabled',
        name: 'Disabled',
        enabled: false,
        condition: 'always',
        matcher: '',
        targetAgentId: 'agent',
        priority: 100,
      });

      const result = manager.checkDelegation('any task');
      expect(result.shouldDelegate).toBe(false);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'event-agent',
        name: 'Event Agent',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const listener = jest.fn();
      const unsubscribe = manager.addEventListener('event-agent', listener);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', async () => {
      const manager = ExternalAgentManager.getInstance();
      await manager.addAgent({
        id: 'dispose-test',
        name: 'Dispose Test',
        protocol: 'acp',
        transport: 'stdio',
        enabled: false,
        defaultPermissionMode: 'default',
        timeout: 30000,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await manager.dispose();
      expect(manager.getAllAgents()).toHaveLength(0);
    });
  });

  describe('ACP session extensions', () => {
    it('should throw when listSessions is unsupported', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const internal = manager as unknown as {
        adapters: Map<string, { listSessions?: () => Promise<unknown[]>; disconnect?: () => Promise<void> }>;
      };
      internal.adapters.set('agent-1', { disconnect: jest.fn().mockResolvedValue(undefined) });

      await expect(manager.listSessions('agent-1')).rejects.toThrow(
        'Agent does not support session listing'
      );
    });

    it('should delegate listSessions to adapter', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const listSessions = jest.fn().mockResolvedValue([{ sessionId: 'session-1' }]);
      const internal = manager as unknown as {
        adapters: Map<string, {
          listSessions?: () => Promise<Array<{ sessionId: string }>>;
          disconnect?: () => Promise<void>;
        }>;
      };
      internal.adapters.set('agent-1', {
        listSessions,
        disconnect: jest.fn().mockResolvedValue(undefined),
      });

      const sessions = await manager.listSessions('agent-1');

      expect(listSessions).toHaveBeenCalledTimes(1);
      expect(sessions).toEqual([{ sessionId: 'session-1' }]);
    });

    it('should store forked session into instance map', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const forkedSession = {
        id: 'forked-session',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const forkSession = jest.fn().mockResolvedValue(forkedSession);

      const internal = manager as unknown as {
        adapters: Map<string, {
          forkSession?: (sessionId: string) => Promise<typeof forkedSession>;
          disconnect?: () => Promise<void>;
        }>;
        instances: Map<string, ReturnType<typeof buildInstance>>;
      };
      internal.adapters.set('agent-1', {
        forkSession,
        disconnect: jest.fn().mockResolvedValue(undefined),
      });
      internal.instances.set('agent-1', buildInstance('agent-1'));

      const result = await manager.forkSession('agent-1', 'session-0');

      expect(forkSession).toHaveBeenCalledWith('session-0');
      expect(result.id).toBe('forked-session');
      expect(internal.instances.get('agent-1')?.sessions.get('forked-session')).toEqual(forkedSession);
    });

    it('should store resumed session into instance map', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const resumedSession = {
        id: 'resumed-session',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const resumeSession = jest.fn().mockResolvedValue(resumedSession);

      const internal = manager as unknown as {
        adapters: Map<string, {
          resumeSession?: (sessionId: string, options?: Record<string, unknown>) => Promise<typeof resumedSession>;
          disconnect?: () => Promise<void>;
        }>;
        instances: Map<string, ReturnType<typeof buildInstance>>;
      };
      internal.adapters.set('agent-1', {
        resumeSession,
        disconnect: jest.fn().mockResolvedValue(undefined),
      });
      internal.instances.set('agent-1', buildInstance('agent-1'));

      const result = await manager.resumeSession('agent-1', 'session-1', {
        systemPrompt: 'resume me',
      });

      expect(resumeSession).toHaveBeenCalledWith('session-1', { systemPrompt: 'resume me' });
      expect(result.id).toBe('resumed-session');
      expect(internal.instances.get('agent-1')?.sessions.get('resumed-session')).toEqual(resumedSession);
    });

    it('should throw when forkSession adapter or instance is missing', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      await expect(manager.forkSession('agent-1', 'session-1')).rejects.toThrow(
        'Agent does not support session forking'
      );
    });

    it('should throw when resumeSession adapter or instance is missing', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      await expect(manager.resumeSession('agent-1', 'session-1')).rejects.toThrow(
        'Agent does not support session resume'
      );
    });
  });

  describe('agent trace bridge integration', () => {
    it('should route execute events through trace bridge and prefer traceContext sessionId', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const session = {
        id: 'acp-session-1',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const executeResult = {
        success: true,
        sessionId: session.id,
        finalResponse: 'done',
        messages: [],
        steps: [],
        toolCalls: [],
        duration: 20,
      };

      const adapter = {
        isConnected: jest.fn().mockReturnValue(true),
        createSession: jest.fn().mockResolvedValue(session),
        execute: jest.fn().mockImplementation(async (_sessionId: string, _message: unknown, options?: { onEvent?: (event: Record<string, unknown>) => void }) => {
          options?.onEvent?.({
            type: 'tool_use_start',
            sessionId: session.id,
            timestamp: new Date(),
            toolUseId: 'tool-1',
            toolName: 'file_write',
          });
          options?.onEvent?.({
            type: 'tool_result',
            sessionId: session.id,
            timestamp: new Date(),
            toolUseId: 'tool-1',
            result: { success: true },
            isError: false,
          });
          return executeResult;
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      const instance = buildInstance('agent-1');
      const internal = manager as unknown as {
        adapters: Map<string, typeof adapter>;
        instances: Map<string, typeof instance>;
      };
      internal.adapters.set('agent-1', adapter);
      internal.instances.set('agent-1', instance);

      await manager.execute('agent-1', 'trace this', {
        traceContext: {
          sessionId: 'business-session-1',
          turnId: 'turn-1',
          tags: ['delegated-external'],
          metadata: { source: 'manager-test' },
        },
        context: { custom: { sessionId: 'legacy-session-1' } },
      });

      expect(mockCreateTraceBridge).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'business-session-1',
          turnId: 'turn-1',
          acpSessionId: 'acp-session-1',
          agentId: 'agent-1',
        })
      );
      const bridge = mockCreateTraceBridge.mock.results[0]?.value as {
        onStart: jest.Mock;
        onEvent: jest.Mock;
        onComplete: jest.Mock;
      };
      expect(bridge.onStart).toHaveBeenCalledWith('trace this');
      expect(bridge.onEvent).toHaveBeenCalledTimes(2);
      expect(bridge.onComplete).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('should fallback to legacy context sessionId when traceContext is missing', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const session = {
        id: 'acp-session-legacy',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const adapter = {
        isConnected: jest.fn().mockReturnValue(true),
        createSession: jest.fn().mockResolvedValue(session),
        execute: jest.fn().mockResolvedValue({
          success: true,
          sessionId: session.id,
          finalResponse: 'ok',
          messages: [],
          steps: [],
          toolCalls: [],
          duration: 10,
        }),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      const instance = buildInstance('agent-1');
      const internal = manager as unknown as {
        adapters: Map<string, typeof adapter>;
        instances: Map<string, typeof instance>;
      };
      internal.adapters.set('agent-1', adapter);
      internal.instances.set('agent-1', instance);

      await manager.execute('agent-1', 'legacy context', {
        context: { custom: { sessionId: 'legacy-session-42' } },
      });

      expect(mockCreateTraceBridge).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'legacy-session-42',
          acpSessionId: 'acp-session-legacy',
        })
      );
    });

    it('should route streaming errors to trace bridge onError', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const session = {
        id: 'acp-stream-1',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const adapter = {
        isConnected: jest.fn().mockReturnValue(true),
        createSession: jest.fn().mockResolvedValue(session),
        disconnect: jest.fn().mockResolvedValue(undefined),
        prompt: jest.fn(async function* () {
          yield {
            type: 'message_delta',
            sessionId: session.id,
            timestamp: new Date(),
            delta: { type: 'text', text: 'partial' },
          };
          throw new Error('stream failed');
        }),
      };
      const instance = buildInstance('agent-1');
      const internal = manager as unknown as {
        adapters: Map<string, typeof adapter>;
        instances: Map<string, typeof instance>;
      };
      internal.adapters.set('agent-1', adapter);
      internal.instances.set('agent-1', instance);

      await expect(
        (async () => {
          for await (const _event of manager.executeStreaming('agent-1', 'stream me')) {
            // consume until throw
          }
        })()
      ).rejects.toThrow('stream failed');

      const bridge = mockCreateTraceBridge.mock.results[0]?.value as {
        onEvent: jest.Mock;
        onComplete: jest.Mock;
        onError: jest.Mock;
      };
      expect(bridge.onEvent).toHaveBeenCalledTimes(1);
      expect(bridge.onComplete).not.toHaveBeenCalled();
      expect(bridge.onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('tool synchronization', () => {
    it('should refresh instance.tools after execute using adapter.tools', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const session = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const executeResult = {
        success: true,
        sessionId: 'session-1',
        finalResponse: 'ok',
        messages: [],
        steps: [],
        toolCalls: [],
        duration: 1,
      };
      const adapter = {
        isConnected: jest.fn().mockReturnValue(true),
        createSession: jest.fn().mockResolvedValue(session),
        execute: jest.fn().mockResolvedValue(executeResult),
        tools: [{ id: 'tool-final', name: 'final' }],
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      const instance = buildInstance('agent-1');
      instance.tools = [{ id: 'tool-initial', name: 'initial' }];

      const internal = manager as unknown as {
        adapters: Map<string, typeof adapter>;
        instances: Map<string, typeof instance>;
      };
      internal.adapters.set('agent-1', adapter);
      internal.instances.set('agent-1', instance);

      await manager.execute('agent-1', 'hello');

      expect(instance.tools).toEqual([{ id: 'tool-final', name: 'final' }]);
    });

    it('should retain existing tools when adapter.tools is undefined after execute', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const session = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const executeResult = {
        success: true,
        sessionId: 'session-1',
        finalResponse: 'ok',
        messages: [],
        steps: [],
        toolCalls: [],
        duration: 1,
      };
      const adapter = {
        isConnected: jest.fn().mockReturnValue(true),
        createSession: jest.fn().mockResolvedValue(session),
        execute: jest.fn().mockResolvedValue(executeResult),
        disconnect: jest.fn().mockResolvedValue(undefined),
      };
      const instance = buildInstance('agent-1');
      instance.tools = [{ id: 'tool-existing', name: 'existing' }];

      const internal = manager as unknown as {
        adapters: Map<string, typeof adapter>;
        instances: Map<string, typeof instance>;
      };
      internal.adapters.set('agent-1', adapter);
      internal.instances.set('agent-1', instance);

      await manager.execute('agent-1', 'hello');

      expect(instance.tools).toEqual([{ id: 'tool-existing', name: 'existing' }]);
    });

    it('should sync tools on session_start during executeStreaming', async () => {
      const manager = ExternalAgentManager.getInstance({ healthCheckInterval: 0 });
      const session = {
        id: 'session-1',
        agentId: 'agent-1',
        status: 'active',
        permissionMode: 'default',
        capabilities: {},
        tools: [],
        messages: [],
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };
      const adapter = {
        isConnected: jest.fn().mockReturnValue(true),
        createSession: jest.fn().mockResolvedValue(session),
        tools: [{ id: 'tool-after-stream', name: 'after-stream' }],
        disconnect: jest.fn().mockResolvedValue(undefined),
        prompt: jest.fn(async function* () {
          yield {
            type: 'session_start',
            sessionId: 'session-1',
            timestamp: new Date(),
            tools: [{ id: 'tool-from-event', name: 'from-event' }],
          };
          yield {
            type: 'done',
            sessionId: 'session-1',
            timestamp: new Date(),
            success: true,
          };
        }),
      };
      const instance = buildInstance('agent-1');

      const internal = manager as unknown as {
        adapters: Map<string, typeof adapter>;
        instances: Map<string, typeof instance>;
      };
      internal.adapters.set('agent-1', adapter);
      internal.instances.set('agent-1', instance);

      const iterator = manager.executeStreaming('agent-1', 'stream hello')[Symbol.asyncIterator]();
      const first = await iterator.next();

      expect(first.value?.type).toBe('session_start');
      expect(instance.tools).toEqual([{ id: 'tool-from-event', name: 'from-event' }]);

      await iterator.next();
      await iterator.next();
      expect(instance.tools).toEqual([{ id: 'tool-after-stream', name: 'after-stream' }]);
    });
  });
});

describe('getExternalAgentManager', () => {
  beforeEach(() => {
    ExternalAgentManager.resetInstance();
  });

  afterEach(() => {
    ExternalAgentManager.resetInstance();
  });

  it('should return manager instance', () => {
    const manager = getExternalAgentManager();
    expect(manager).toBeInstanceOf(ExternalAgentManager);
  });

  it('should return same instance', () => {
    const m1 = getExternalAgentManager();
    const m2 = getExternalAgentManager();
    expect(m1).toBe(m2);
  });
});

describe('checkExternalAgentDelegation', () => {
  beforeEach(() => {
    ExternalAgentManager.resetInstance();
  });

  afterEach(() => {
    ExternalAgentManager.resetInstance();
  });

  it('should use global manager for delegation check', () => {
    const result = checkExternalAgentDelegation('some task');
    expect(result).toHaveProperty('shouldDelegate');
    expect(result).toHaveProperty('reason');
  });
});

describe('executeOnExternalAgent', () => {
  beforeEach(() => {
    ExternalAgentManager.resetInstance();
  });

  afterEach(() => {
    ExternalAgentManager.resetInstance();
  });

  it('should return null when no suitable agent', async () => {
    const result = await executeOnExternalAgent('test prompt');
    expect(result).toBeNull();
  });

  it('should throw when specified agent not found', async () => {
    await expect(executeOnExternalAgent('test', { agentId: 'non-existent' })).rejects.toThrow();
  });
});

describe('Protocol Registration', () => {
  beforeEach(() => {
    ExternalAgentManager.resetInstance();
  });

  afterEach(() => {
    ExternalAgentManager.resetInstance();
  });

  it('should register ACP protocol on initialization', () => {
    ExternalAgentManager.getInstance();
    expect(protocolAdapterRegistry.has('acp')).toBe(true);
  });
});
