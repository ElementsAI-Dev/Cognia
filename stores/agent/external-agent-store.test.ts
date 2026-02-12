/**
 * Tests for External Agent Store
 */

import { act } from '@testing-library/react';
import {
  useExternalAgentStore,
  selectRunningAgents,
  selectActiveRunningAgents,
  selectTerminals,
  selectRunningTerminals,
  selectSessionTerminals,
  selectIsLoading,
  selectLastError,
  type ExternalAgentStore,
} from './external-agent-store';
import type { ExternalAgentConfig } from '@/types/agent/external-agent';

// Mock Tauri
jest.mock('@/lib/utils', () => ({
  isTauri: jest.fn(() => false),
  cn: jest.fn((...args: unknown[]) => args.filter(Boolean).join(' ')),
}));

jest.mock('@/lib/native/external-agent', () => ({
  spawnExternalAgent: jest.fn(),
  sendToExternalAgent: jest.fn(),
  killExternalAgent: jest.fn(),
  getExternalAgentStatus: jest.fn(),
  listExternalAgents: jest.fn(),
  killAllExternalAgents: jest.fn(),
  acpTerminalCreate: jest.fn(),
  acpTerminalOutput: jest.fn(),
  acpTerminalKill: jest.fn(),
  acpTerminalRelease: jest.fn(),
  acpTerminalWaitForExit: jest.fn(),
  acpTerminalWrite: jest.fn(),
  acpTerminalGetSessionTerminals: jest.fn(),
  acpTerminalKillSessionTerminals: jest.fn(),
  acpTerminalIsRunning: jest.fn(),
  acpTerminalGetInfo: jest.fn(),
  acpTerminalList: jest.fn(),
}));

// Helper function to create mock state for selectors
function createMockState(partial: Partial<ExternalAgentStore>): ExternalAgentStore {
  return partial as ExternalAgentStore;
}

describe('useExternalAgentStore', () => {
  beforeEach(() => {
    act(() => {
      useExternalAgentStore.getState().reset();
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useExternalAgentStore.getState();
      expect(state.agents).toEqual({});
      expect(state.connectionStatus).toEqual({});
      expect(state.activeAgentId).toBeNull();
      expect(state.delegationRules).toEqual([]);
      expect(state.enabled).toBe(true);
      expect(state.defaultPermissionMode).toBe('default');
      expect(state.autoConnectOnStartup).toBe(false);
      expect(state.showConnectionNotifications).toBe(true);
    });
  });

  describe('Agent CRUD operations', () => {
    describe('addAgent', () => {
      it('should create a new agent with defaults', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(agent).toBeDefined();
        expect(agent!.name).toBe('Test Agent');
        expect(agent!.protocol).toBe('acp');
        expect(agent!.transport).toBe('stdio');
        expect(agent!.enabled).toBe(true);
        expect(agent!.timeout).toBe(300000);
      });

      it('should create a agent with all custom properties', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Claude Code',
            description: 'Claude Code ACP agent',
            protocol: 'acp',
            transport: 'stdio',
            process: {
              command: 'claude-code',
              args: ['--acp'],
              cwd: '/home/user',
            },
            defaultPermissionMode: 'acceptEdits',
            timeout: 600000,
            tags: ['coding', 'ai'],
          });
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(agent!.name).toBe('Claude Code');
        expect(agent!.description).toBe('Claude Code ACP agent');
        expect(agent!.process?.command).toBe('claude-code');
        expect(agent!.process?.args).toEqual(['--acp']);
        expect(agent!.defaultPermissionMode).toBe('acceptEdits');
        expect(agent!.timeout).toBe(600000);
        expect(agent!.tags).toEqual(['coding', 'ai']);
      });

      it('should set initial connection status to disconnected', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        const status = useExternalAgentStore.getState().getConnectionStatus(agentId!);
        expect(status).toBe('disconnected');
      });

      it('should generate unique IDs for each agent', () => {
        let id1 = '';
        let id2 = '';
        act(() => {
          id1 = useExternalAgentStore.getState().addAgent({
            name: 'Agent 1',
            protocol: 'acp',
            transport: 'stdio',
          });
          id2 = useExternalAgentStore.getState().addAgent({
            name: 'Agent 2',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        expect(id1).not.toBe(id2);
      });
    });

    describe('updateAgent', () => {
      it('should update agent properties', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        act(() => {
          useExternalAgentStore.getState().updateAgent(agentId!, {
            name: 'Updated Agent',
            description: 'Updated description',
          });
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(agent!.name).toBe('Updated Agent');
        expect(agent!.description).toBe('Updated description');
      });

      it('should update nested process config', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
            process: { command: 'test' },
          });
        });

        act(() => {
          useExternalAgentStore.getState().updateAgent(agentId!, {
            process: { args: ['--new-arg'] },
          });
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(agent!.process?.command).toBe('test');
        expect(agent!.process?.args).toEqual(['--new-arg']);
      });

      it('should update updatedAt timestamp', () => {
        let agentId: string;
        
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        const originalAgent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(originalAgent).toBeDefined();
        const originalUpdatedAt = originalAgent!.updatedAt!;

        act(() => {
          useExternalAgentStore.getState().updateAgent(agentId!, {
            name: 'Updated Agent',
          });
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!)!;
        expect(agent).toBeDefined();
        expect(agent.updatedAt!.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      });

      it('should not update non-existent agent', () => {
        act(() => {
          useExternalAgentStore.getState().updateAgent('non-existent', {
            name: 'Updated Agent',
          });
        });

        const agent = useExternalAgentStore.getState().getAgent('non-existent');
        expect(agent).toBeUndefined();
      });
    });

    describe('removeAgent', () => {
      it('should remove agent from store', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        act(() => {
          useExternalAgentStore.getState().removeAgent(agentId!);
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(agent).toBeUndefined();
      });

      it('should remove connection status when agent is removed', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
          useExternalAgentStore.getState().setConnectionStatus(agentId!, 'connected');
        });

        act(() => {
          useExternalAgentStore.getState().removeAgent(agentId!);
        });

        const status = useExternalAgentStore.getState().getConnectionStatus(agentId!);
        expect(status).toBe('disconnected');
      });

      it('should clear activeAgentId if removed agent was active', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
          useExternalAgentStore.getState().setActiveAgent(agentId!);
        });

        expect(useExternalAgentStore.getState().activeAgentId).toBe(agentId!);

        act(() => {
          useExternalAgentStore.getState().removeAgent(agentId!);
        });

        expect(useExternalAgentStore.getState().activeAgentId).toBeNull();
      });

      it('should remove delegation rules for removed agent', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
          useExternalAgentStore.getState().addDelegationRule({
            name: 'Test Rule',
            targetAgentId: agentId!,
            condition: 'keyword',
            matcher: 'test',
            priority: 1,
            enabled: true,
          });
        });

        expect(useExternalAgentStore.getState().delegationRules.length).toBe(1);

        act(() => {
          useExternalAgentStore.getState().removeAgent(agentId!);
        });

        expect(useExternalAgentStore.getState().delegationRules.length).toBe(0);
      });
    });

    describe('getAgent', () => {
      it('should return agent with Date objects for timestamps', () => {
        let agentId: string;
        act(() => {
          agentId = useExternalAgentStore.getState().addAgent({
            name: 'Test Agent',
            protocol: 'acp',
            transport: 'stdio',
          });
        });

        const agent = useExternalAgentStore.getState().getAgent(agentId!);
        expect(agent!.createdAt).toBeInstanceOf(Date);
        expect(agent!.updatedAt).toBeInstanceOf(Date);
      });

      it('should return undefined for non-existent agent', () => {
        const agent = useExternalAgentStore.getState().getAgent('non-existent');
        expect(agent).toBeUndefined();
      });
    });

    describe('getAllAgents', () => {
      it('should return all agents as array', () => {
        act(() => {
          useExternalAgentStore.getState().addAgent({
            name: 'Agent 1',
            protocol: 'acp',
            transport: 'stdio',
          });
          useExternalAgentStore.getState().addAgent({
            name: 'Agent 2',
            protocol: 'http',
            transport: 'http',
          });
        });

        const agents = useExternalAgentStore.getState().getAllAgents();
        expect(agents.length).toBe(2);
        expect(agents.map((a) => a.name).sort()).toEqual(['Agent 1', 'Agent 2']);
      });

      it('should return empty array when no agents', () => {
        const agents = useExternalAgentStore.getState().getAllAgents();
        expect(agents).toEqual([]);
      });
    });
  });

  describe('Connection Status', () => {
    it('should set connection status', () => {
      let agentId: string;
      act(() => {
        agentId = useExternalAgentStore.getState().addAgent({
          name: 'Test Agent',
          protocol: 'acp',
          transport: 'stdio',
        });
      });

      act(() => {
        useExternalAgentStore.getState().setConnectionStatus(agentId!, 'connected');
      });

      const status = useExternalAgentStore.getState().getConnectionStatus(agentId!);
      expect(status).toBe('connected');
    });

    it('should return disconnected for unknown agent', () => {
      const status = useExternalAgentStore.getState().getConnectionStatus('unknown');
      expect(status).toBe('disconnected');
    });

    it('should track multiple connection statuses', () => {
      let id1: string, id2: string;
      act(() => {
        id1 = useExternalAgentStore.getState().addAgent({
          name: 'Agent 1',
          protocol: 'acp',
          transport: 'stdio',
        });
        id2 = useExternalAgentStore.getState().addAgent({
          name: 'Agent 2',
          protocol: 'acp',
          transport: 'stdio',
        });
      });

      act(() => {
        useExternalAgentStore.getState().setConnectionStatus(id1!, 'connected');
        useExternalAgentStore.getState().setConnectionStatus(id2!, 'error');
      });

      expect(useExternalAgentStore.getState().getConnectionStatus(id1!)).toBe('connected');
      expect(useExternalAgentStore.getState().getConnectionStatus(id2!)).toBe('error');
    });
  });

  describe('Active Agent', () => {
    it('should set active agent', () => {
      let agentId: string;
      act(() => {
        agentId = useExternalAgentStore.getState().addAgent({
          name: 'Test Agent',
          protocol: 'acp',
          transport: 'stdio',
        });
      });

      act(() => {
        useExternalAgentStore.getState().setActiveAgent(agentId!);
      });

      expect(useExternalAgentStore.getState().activeAgentId).toBe(agentId!);
    });

    it('should clear active agent with null', () => {
      let agentId: string;
      act(() => {
        agentId = useExternalAgentStore.getState().addAgent({
          name: 'Test Agent',
          protocol: 'acp',
          transport: 'stdio',
        });
        useExternalAgentStore.getState().setActiveAgent(agentId!);
      });

      act(() => {
        useExternalAgentStore.getState().setActiveAgent(null);
      });

      expect(useExternalAgentStore.getState().activeAgentId).toBeNull();
    });
  });

  describe('Delegation Rules', () => {
    let agentId: string;

    beforeEach(() => {
      act(() => {
        agentId = useExternalAgentStore.getState().addAgent({
          name: 'Test Agent',
          protocol: 'acp',
          transport: 'stdio',
        });
      });
    });

    it('should add delegation rule', () => {
      let ruleId: string;
      act(() => {
        ruleId = useExternalAgentStore.getState().addDelegationRule({
          name: 'Code Rule',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'code',
          priority: 1,
          enabled: true,
        });
      });

      const rules = useExternalAgentStore.getState().delegationRules;
      expect(rules.length).toBe(1);
      expect(rules[0].id).toBe(ruleId!);
      expect(rules[0].targetAgentId).toBe(agentId);
    });

    it('should sort rules by priority descending', () => {
      act(() => {
        useExternalAgentStore.getState().addDelegationRule({
          name: 'Low Priority',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'low',
          priority: 1,
          enabled: true,
        });
        useExternalAgentStore.getState().addDelegationRule({
          name: 'High Priority',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'high',
          priority: 10,
          enabled: true,
        });
      });

      const rules = useExternalAgentStore.getState().delegationRules;
      expect(rules[0].priority).toBe(10);
      expect(rules[1].priority).toBe(1);
    });

    it('should update delegation rule', () => {
      let ruleId: string;
      act(() => {
        ruleId = useExternalAgentStore.getState().addDelegationRule({
          name: 'Code Rule',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'code',
          priority: 1,
          enabled: true,
        });
      });

      act(() => {
        useExternalAgentStore.getState().updateDelegationRule(ruleId!, {
          enabled: false,
          priority: 5,
        });
      });

      const rules = useExternalAgentStore.getState().delegationRules;
      expect(rules[0].enabled).toBe(false);
      expect(rules[0].priority).toBe(5);
    });

    it('should remove delegation rule', () => {
      let ruleId: string;
      act(() => {
        ruleId = useExternalAgentStore.getState().addDelegationRule({
          name: 'Code Rule',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'code',
          priority: 1,
          enabled: true,
        });
      });

      act(() => {
        useExternalAgentStore.getState().removeDelegationRule(ruleId!);
      });

      expect(useExternalAgentStore.getState().delegationRules.length).toBe(0);
    });

    it('should reorder delegation rules', () => {
      let id1: string, id2: string, id3: string;
      act(() => {
        id1 = useExternalAgentStore.getState().addDelegationRule({
          name: 'Rule One',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'one',
          priority: 3,
          enabled: true,
        });
        id2 = useExternalAgentStore.getState().addDelegationRule({
          name: 'Rule Two',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'two',
          priority: 2,
          enabled: true,
        });
        id3 = useExternalAgentStore.getState().addDelegationRule({
          name: 'Rule Three',
          targetAgentId: agentId,
          condition: 'keyword',
          matcher: 'three',
          priority: 1,
          enabled: true,
        });
      });

      act(() => {
        useExternalAgentStore.getState().reorderDelegationRules([id3!, id1!, id2!]);
      });

      const rules = useExternalAgentStore.getState().delegationRules;
      expect(rules[0].id).toBe(id3!);
      expect(rules[1].id).toBe(id1!);
      expect(rules[2].id).toBe(id2!);
    });
  });

  describe('Settings', () => {
    it('should set enabled', () => {
      act(() => {
        useExternalAgentStore.getState().setEnabled(false);
      });

      expect(useExternalAgentStore.getState().enabled).toBe(false);
    });

    it('should set default permission mode', () => {
      act(() => {
        useExternalAgentStore.getState().setDefaultPermissionMode('acceptEdits');
      });

      expect(useExternalAgentStore.getState().defaultPermissionMode).toBe('acceptEdits');
    });

    it('should set auto connect on startup', () => {
      act(() => {
        useExternalAgentStore.getState().setAutoConnectOnStartup(true);
      });

      expect(useExternalAgentStore.getState().autoConnectOnStartup).toBe(true);
    });

    it('should set show connection notifications', () => {
      act(() => {
        useExternalAgentStore.getState().setShowConnectionNotifications(false);
      });

      expect(useExternalAgentStore.getState().showConnectionNotifications).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should import agents', () => {
      const agents: ExternalAgentConfig[] = [
        {
          id: 'imported-1',
          name: 'Imported Agent 1',
          protocol: 'acp',
          transport: 'stdio',
          enabled: true,
          defaultPermissionMode: 'default',
          timeout: 300000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'imported-2',
          name: 'Imported Agent 2',
          protocol: 'http',
          transport: 'http',
          enabled: true,
          defaultPermissionMode: 'default',
          timeout: 300000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      act(() => {
        useExternalAgentStore.getState().importAgents(agents);
      });

      const allAgents = useExternalAgentStore.getState().getAllAgents();
      expect(allAgents.length).toBe(2);
    });

    it('should export agents', () => {
      act(() => {
        useExternalAgentStore.getState().addAgent({
          name: 'Agent 1',
          protocol: 'acp',
          transport: 'stdio',
        });
        useExternalAgentStore.getState().addAgent({
          name: 'Agent 2',
          protocol: 'http',
          transport: 'http',
        });
      });

      const exported = useExternalAgentStore.getState().exportAgents();
      expect(exported.length).toBe(2);
      expect(exported[0].createdAt).toBeInstanceOf(Date);
    });

    it('should clear all agents', () => {
      act(() => {
        useExternalAgentStore.getState().addAgent({
          name: 'Agent 1',
          protocol: 'acp',
          transport: 'stdio',
        });
        useExternalAgentStore.getState().addAgent({
          name: 'Agent 2',
          protocol: 'http',
          transport: 'http',
        });
      });

      expect(useExternalAgentStore.getState().getAllAgents().length).toBe(2);

      act(() => {
        useExternalAgentStore.getState().clearAllAgents();
      });

      expect(useExternalAgentStore.getState().getAllAgents().length).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useExternalAgentStore.getState().addAgent({
          name: 'Test Agent',
          protocol: 'acp',
          transport: 'stdio',
        });
        useExternalAgentStore.getState().setEnabled(false);
        useExternalAgentStore.getState().setDefaultPermissionMode('bypassPermissions');
      });

      act(() => {
        useExternalAgentStore.getState().reset();
      });

      const state = useExternalAgentStore.getState();
      expect(state.agents).toEqual({});
      expect(state.enabled).toBe(true);
      expect(state.defaultPermissionMode).toBe('default');
    });
  });

  describe('Runtime State', () => {
    describe('initial runtime state', () => {
      it('has correct initial runtime state', () => {
        const state = useExternalAgentStore.getState();
        expect(state.runningAgents).toEqual({});
        expect(state.runningAgentIds).toEqual([]);
        expect(state.terminals).toEqual({});
        expect(state.terminalIds).toEqual([]);
        expect(state.isLoading).toBe(false);
        expect(state.lastError).toBeNull();
      });
    });

    describe('Runtime Selectors', () => {
      it('selectRunningAgents should return array of running agents', () => {
        const state = createMockState({
          runningAgents: {
            'agent-1': {
              id: 'agent-1',
              status: 'running' as const,
              output: [],
              spawnedAt: Date.now(),
            },
            'agent-2': {
              id: 'agent-2',
              status: 'stopped' as const,
              output: [],
              spawnedAt: Date.now(),
            },
          },
          runningAgentIds: ['agent-1', 'agent-2'],
        });

        const agents = selectRunningAgents(state);
        expect(agents).toHaveLength(2);
      });

      it('selectActiveRunningAgents should filter active agents', () => {
        const state = createMockState({
          runningAgents: {
            'agent-1': {
              id: 'agent-1',
              status: 'running' as const,
              output: [],
              spawnedAt: Date.now(),
            },
            'agent-2': {
              id: 'agent-2',
              status: 'stopped' as const,
              output: [],
              spawnedAt: Date.now(),
            },
          },
          runningAgentIds: ['agent-1', 'agent-2'],
        });

        const activeAgents = selectActiveRunningAgents(state);
        expect(activeAgents).toHaveLength(1);
        expect(activeAgents[0].id).toBe('agent-1');
      });

      it('selectTerminals should return array of terminals', () => {
        const state = createMockState({
          terminals: {
            'term_1': {
              id: 'term_1',
              sessionId: 'session-1',
              command: 'bash',
              isRunning: true,
              output: '',
              exitCode: null,
              createdAt: Date.now(),
            },
          },
          terminalIds: ['term_1'],
        });

        const terminals = selectTerminals(state);
        expect(terminals).toHaveLength(1);
        expect(terminals[0].id).toBe('term_1');
      });

      it('selectRunningTerminals should filter running terminals', () => {
        const state = createMockState({
          terminals: {
            'term_1': {
              id: 'term_1',
              sessionId: 'session-1',
              command: 'bash',
              isRunning: true,
              output: '',
              exitCode: null,
              createdAt: Date.now(),
            },
            'term_2': {
              id: 'term_2',
              sessionId: 'session-1',
              command: 'node',
              isRunning: false,
              output: '',
              exitCode: 0,
              createdAt: Date.now(),
            },
          },
          terminalIds: ['term_1', 'term_2'],
        });

        const runningTerminals = selectRunningTerminals(state);
        expect(runningTerminals).toHaveLength(1);
        expect(runningTerminals[0].id).toBe('term_1');
      });

      it('selectSessionTerminals should filter by session', () => {
        const state = createMockState({
          terminals: {
            'term_1': {
              id: 'term_1',
              sessionId: 'session-1',
              command: 'bash',
              isRunning: true,
              output: '',
              exitCode: null,
              createdAt: Date.now(),
            },
            'term_2': {
              id: 'term_2',
              sessionId: 'session-2',
              command: 'node',
              isRunning: true,
              output: '',
              exitCode: null,
              createdAt: Date.now(),
            },
          },
          terminalIds: ['term_1', 'term_2'],
        });

        const session1Terminals = selectSessionTerminals('session-1')(state);
        expect(session1Terminals).toHaveLength(1);
        expect(session1Terminals[0].sessionId).toBe('session-1');
      });

      it('selectIsLoading should return loading state', () => {
        const state = createMockState({ isLoading: true });
        expect(selectIsLoading(state)).toBe(true);
      });

      it('selectLastError should return error message', () => {
        const state = createMockState({ lastError: 'test error' });
        expect(selectLastError(state)).toBe('test error');
      });
    });

    describe('Runtime Actions (outside Tauri)', () => {
      it('should throw error when spawning agent outside Tauri', async () => {
        await expect(
          useExternalAgentStore.getState().spawnAgent({
            id: 'test',
            command: 'node',
          })
        ).rejects.toThrow('External agent is only available in Tauri environment');
      });

      it('should throw error when creating terminal outside Tauri', async () => {
        await expect(
          useExternalAgentStore.getState().createTerminal('session-1', 'bash')
        ).rejects.toThrow('ACP terminal is only available in Tauri environment');
      });

      it('should clear last error', () => {
        act(() => {
          useExternalAgentStore.setState({ lastError: 'test error' });
        });

        expect(useExternalAgentStore.getState().lastError).toBe('test error');

        act(() => {
          useExternalAgentStore.getState().clearLastError();
        });

        expect(useExternalAgentStore.getState().lastError).toBeNull();
      });
    });
  });
});
