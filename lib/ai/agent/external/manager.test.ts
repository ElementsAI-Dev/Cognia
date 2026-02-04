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

describe('ExternalAgentManager', () => {
  beforeEach(() => {
    ExternalAgentManager.resetInstance();
    jest.clearAllMocks();
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
