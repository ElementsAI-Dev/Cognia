import type { StoreApi } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  ExternalAgentConfig,
  ExternalAgentConnectionStatus,
  ExternalAgentDelegationRule,
  CreateExternalAgentInput,
  UpdateExternalAgentInput,
} from '@/types/agent/external-agent';
import {
  createAgentFromPreset,
  type ExternalAgentPresetId,
} from '@/lib/ai/agent/external/presets';
import { isTauri } from '@/lib/utils';
import {
  ExternalAgentSpawnConfig,
  TerminalInfo,
  TerminalOutputResult,
  spawnExternalAgent,
  sendToExternalAgent,
  killExternalAgent,
  getExternalAgentStatus,
  listExternalAgents,
  killAllExternalAgents,
  acpTerminalCreate,
  acpTerminalOutput,
  acpTerminalKill,
  acpTerminalRelease,
  acpTerminalWaitForExit,
  acpTerminalWrite,
  acpTerminalGetSessionTerminals,
  acpTerminalKillSessionTerminals,
  acpTerminalIsRunning,
  acpTerminalGetInfo,
  acpTerminalList,
} from '@/lib/native/external-agent';
import { initialState } from '../initial-state';
import type {
  StoredExternalAgentConfig,
  RunningAgentInstance,
  TerminalInstance,
  ExternalAgentState,
  ExternalAgentStore,
} from '../types';

type ExternalAgentStoreSet = StoreApi<ExternalAgentStore>['setState'];
type ExternalAgentStoreGet = StoreApi<ExternalAgentStore>['getState'];

type ExternalAgentActionsSlice = Omit<ExternalAgentStore, keyof typeof initialState>;

export const createExternalAgentActionsSlice = (
  set: ExternalAgentStoreSet,
  get: ExternalAgentStoreGet
): ExternalAgentActionsSlice => ({
// ========================================
      // Agent CRUD
      // ========================================

      addAgent: (input: CreateExternalAgentInput): string => {
        const id = nanoid();
        const now = new Date().toISOString();

        const config: StoredExternalAgentConfig = {
          id,
          name: input.name,
          description: input.description,
          protocol: input.protocol,
          transport: input.transport,
          enabled: true,
          process: input.process,
          network: input.network,
          defaultPermissionMode: input.defaultPermissionMode || get().defaultPermissionMode,
          autoApprovePatterns: input.autoApprovePatterns,
          requireApprovalFor: input.requireApprovalFor,
          timeout: input.timeout || 300000,
          retryConfig: {
            maxRetries: input.retryConfig?.maxRetries ?? 3,
            retryDelay: input.retryConfig?.retryDelay ?? 1000,
            exponentialBackoff: input.retryConfig?.exponentialBackoff ?? true,
          },
          tags: input.tags,
          metadata: input.metadata,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          agents: { ...state.agents, [id]: config },
          connectionStatus: { ...state.connectionStatus, [id]: 'disconnected' },
        }));

        return id;
      },

      addAgentFromPreset: (presetId: string, overrides?: Partial<CreateExternalAgentInput>): string | null => {
        const config = createAgentFromPreset(
          presetId as ExternalAgentPresetId,
          overrides as Partial<ExternalAgentConfig>
        );
        if (!config) {
          return null;
        }

        const now = new Date().toISOString();
        const stored: StoredExternalAgentConfig = {
          ...config,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          agents: { ...state.agents, [config.id]: stored },
          connectionStatus: { ...state.connectionStatus, [config.id]: 'disconnected' },
        }));

        return config.id;
      },

      updateAgent: (id: string, updates: UpdateExternalAgentInput): void => {
        set((state) => {
          const agent = state.agents[id];
          if (!agent) return state;

          const now = new Date().toISOString();
          const updated: StoredExternalAgentConfig = {
            ...agent,
            name: updates.name ?? agent.name,
            description: updates.description ?? agent.description,
            enabled: updates.enabled ?? agent.enabled,
            process: updates.process 
              ? { ...agent.process, ...updates.process } as StoredExternalAgentConfig['process']
              : agent.process,
            network: updates.network 
              ? { ...agent.network, ...updates.network } as StoredExternalAgentConfig['network']
              : agent.network,
            defaultPermissionMode: updates.defaultPermissionMode ?? agent.defaultPermissionMode,
            autoApprovePatterns: updates.autoApprovePatterns ?? agent.autoApprovePatterns,
            requireApprovalFor: updates.requireApprovalFor ?? agent.requireApprovalFor,
            timeout: updates.timeout ?? agent.timeout,
            retryConfig: updates.retryConfig 
              ? { ...agent.retryConfig, ...updates.retryConfig } as StoredExternalAgentConfig['retryConfig']
              : agent.retryConfig,
            tags: updates.tags ?? agent.tags,
            metadata: updates.metadata 
              ? { ...agent.metadata, ...updates.metadata } 
              : agent.metadata,
            updatedAt: now,
          };

          return { agents: { ...state.agents, [id]: updated } };
        });
      },

      removeAgent: (id: string): void => {
        set((state) => {
          const { [id]: _removed, ...rest } = state.agents;
          const { [id]: _removedStatus, ...restStatus } = state.connectionStatus;

          return {
            agents: rest,
            connectionStatus: restStatus,
            activeAgentId: state.activeAgentId === id ? null : state.activeAgentId,
            delegationRules: state.delegationRules.filter((r) => r.targetAgentId !== id),
          };
        });
      },

      getAgent: (id: string): ExternalAgentConfig | undefined => {
        const stored = get().agents[id];
        if (!stored) return undefined;

        return {
          ...stored,
          createdAt: new Date(stored.createdAt),
          updatedAt: new Date(stored.updatedAt),
        };
      },

      getAllAgents: (): ExternalAgentConfig[] => {
        return Object.values(get().agents).map((stored) => ({
          ...stored,
          createdAt: new Date(stored.createdAt),
          updatedAt: new Date(stored.updatedAt),
        }));
      },

      // ========================================
      // Connection Status
      // ========================================

      setConnectionStatus: (id: string, status: ExternalAgentConnectionStatus): void => {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [id]: status },
        }));
      },

      getConnectionStatus: (id: string): ExternalAgentConnectionStatus => {
        return get().connectionStatus[id] || 'disconnected';
      },

      // ========================================
      // Active Agent
      // ========================================

      setActiveAgent: (id: string | null): void => {
        set({ activeAgentId: id });
      },

      // ========================================
      // Delegation Rules
      // ========================================

      addDelegationRule: (rule: Omit<ExternalAgentDelegationRule, 'id'>): string => {
        const id = nanoid();
        const newRule: ExternalAgentDelegationRule = { ...rule, id };

        set((state) => ({
          delegationRules: [...state.delegationRules, newRule].sort(
            (a, b) => b.priority - a.priority
          ),
        }));

        return id;
      },

      updateDelegationRule: (id: string, updates: Partial<ExternalAgentDelegationRule>): void => {
        set((state) => ({
          delegationRules: state.delegationRules
            .map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
            .sort((a, b) => b.priority - a.priority),
        }));
      },

      removeDelegationRule: (id: string): void => {
        set((state) => ({
          delegationRules: state.delegationRules.filter((rule) => rule.id !== id),
        }));
      },

      reorderDelegationRules: (ruleIds: string[]): void => {
        set((state) => {
          const rulesMap = new Map(state.delegationRules.map((r) => [r.id, r]));
          const reordered = ruleIds
            .map((id, index) => {
              const rule = rulesMap.get(id);
              if (rule) {
                return { ...rule, priority: ruleIds.length - index };
              }
              return null;
            })
            .filter((r): r is ExternalAgentDelegationRule => r !== null);

          return { delegationRules: reordered };
        });
      },

      // ========================================
      // Settings
      // ========================================

      setEnabled: (enabled: boolean): void => {
        set({ enabled });
      },

      setDefaultPermissionMode: (mode: ExternalAgentState['defaultPermissionMode']): void => {
        set({ defaultPermissionMode: mode });
      },

      setAutoConnectOnStartup: (enabled: boolean): void => {
        set({ autoConnectOnStartup: enabled });
      },

      setShowConnectionNotifications: (enabled: boolean): void => {
        set({ showConnectionNotifications: enabled });
      },

      // ========================================
      // Bulk Operations
      // ========================================

      importAgents: (agents: ExternalAgentConfig[]): void => {
        set((state) => {
          const newAgents = { ...state.agents };
          const newStatus = { ...state.connectionStatus };

          for (const agent of agents) {
            const stored: StoredExternalAgentConfig = {
              ...agent,
              createdAt: agent.createdAt?.toISOString() || new Date().toISOString(),
              updatedAt: agent.updatedAt?.toISOString() || new Date().toISOString(),
            };
            newAgents[agent.id] = stored;
            newStatus[agent.id] = 'disconnected';
          }

          return { agents: newAgents, connectionStatus: newStatus };
        });
      },

      exportAgents: (): ExternalAgentConfig[] => {
        return get().getAllAgents();
      },

      clearAllAgents: (): void => {
        set({
          agents: {},
          connectionStatus: {},
          activeAgentId: null,
          delegationRules: [],
        });
      },

      // ========================================
      // Reset
      // ========================================

      reset: (): void => {
        set(initialState);
      },

      // ========================================
      // Runtime Operations - Spawned Agents
      // ========================================

      spawnAgent: async (config: ExternalAgentSpawnConfig): Promise<string> => {
        if (!isTauri()) {
          throw new Error('External agent is only available in Tauri environment');
        }

        set({ isLoading: true, lastError: null });

        try {
          const id = await spawnExternalAgent(config);
          set((state) => ({
            runningAgents: {
              ...state.runningAgents,
              [id]: {
                id,
                status: 'running',
                output: [],
                spawnedAt: Date.now(),
              },
            },
            runningAgentIds: [...state.runningAgentIds, id],
            isLoading: false,
          }));
          return id;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message, isLoading: false });
          throw err;
        }
      },

      sendToAgent: async (agentId: string, message: string): Promise<void> => {
        if (!isTauri()) {
          throw new Error('External agent is only available in Tauri environment');
        }

        try {
          await sendToExternalAgent(agentId, message);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          set({ lastError: errorMessage });
          throw err;
        }
      },

      killRunningAgent: async (agentId: string): Promise<void> => {
        if (!isTauri()) return;

        try {
          await killExternalAgent(agentId);
          set((state) => {
            const agent = state.runningAgents[agentId];
            if (agent) {
              return {
                runningAgents: {
                  ...state.runningAgents,
                  [agentId]: { ...agent, status: 'stopped' },
                },
              };
            }
            return state;
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      getRunningAgentStatus: async (agentId: string): Promise<string> => {
        if (!isTauri()) {
          throw new Error('External agent is only available in Tauri environment');
        }

        return getExternalAgentStatus(agentId);
      },

      refreshRunningAgents: async (): Promise<void> => {
        if (!isTauri()) return;

        set({ isLoading: true });

        try {
          const agentIds = await listExternalAgents();
          const runningAgents: Record<string, RunningAgentInstance> = {};

          for (const id of agentIds) {
            const status = await getExternalAgentStatus(id);
            const existing = get().runningAgents[id];
            runningAgents[id] = {
              id,
              status: status === 'Running' ? 'running' : 'stopped',
              output: existing?.output ?? [],
              exitCode: existing?.exitCode,
              spawnedAt: existing?.spawnedAt ?? Date.now(),
            };
          }

          set({ runningAgents, runningAgentIds: agentIds, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message, isLoading: false });
        }
      },

      killAllRunningAgents: async (): Promise<void> => {
        if (!isTauri()) return;

        try {
          await killAllExternalAgents();
          set({ runningAgents: {}, runningAgentIds: [] });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      // ========================================
      // Runtime Operations - ACP Terminals
      // ========================================

      createTerminal: async (
        sessionId: string,
        command: string,
        args: string[] = [],
        cwd?: string
      ): Promise<string> => {
        if (!isTauri()) {
          throw new Error('ACP terminal is only available in Tauri environment');
        }

        set({ isLoading: true, lastError: null });

        try {
          const terminalId = await acpTerminalCreate(sessionId, command, args, cwd);
          set((state) => ({
            terminals: {
              ...state.terminals,
              [terminalId]: {
                id: terminalId,
                sessionId,
                command,
                isRunning: true,
                output: '',
                exitCode: null,
                createdAt: Date.now(),
              },
            },
            terminalIds: [...state.terminalIds, terminalId],
            isLoading: false,
          }));
          return terminalId;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message, isLoading: false });
          throw err;
        }
      },

      writeToTerminal: async (terminalId: string, data: string): Promise<void> => {
        if (!isTauri()) {
          throw new Error('ACP terminal is only available in Tauri environment');
        }

        try {
          await acpTerminalWrite(terminalId, data);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      getTerminalOutput: async (terminalId: string): Promise<TerminalOutputResult> => {
        if (!isTauri()) {
          throw new Error('ACP terminal is only available in Tauri environment');
        }

        const result = await acpTerminalOutput(terminalId);

        set((state) => {
          const terminal = state.terminals[terminalId];
          if (terminal) {
            return {
              terminals: {
                ...state.terminals,
                [terminalId]: {
                  ...terminal,
                  output: result.output,
                  exitCode: result.exitCode,
                },
              },
            };
          }
          return state;
        });

        return result;
      },

      killTerminal: async (terminalId: string): Promise<void> => {
        if (!isTauri()) return;

        try {
          await acpTerminalKill(terminalId);
          set((state) => {
            const terminal = state.terminals[terminalId];
            if (terminal) {
              return {
                terminals: {
                  ...state.terminals,
                  [terminalId]: { ...terminal, isRunning: false },
                },
              };
            }
            return state;
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      releaseTerminal: async (terminalId: string): Promise<void> => {
        if (!isTauri()) return;

        try {
          await acpTerminalRelease(terminalId);
          set((state) => {
            const { [terminalId]: _, ...terminals } = state.terminals;
            return {
              terminals,
              terminalIds: state.terminalIds.filter((id) => id !== terminalId),
            };
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      waitForTerminalExit: async (terminalId: string, timeout?: number): Promise<number> => {
        if (!isTauri()) {
          throw new Error('ACP terminal is only available in Tauri environment');
        }

        try {
          const exitCode = await acpTerminalWaitForExit(terminalId, timeout);
          set((state) => {
            const terminal = state.terminals[terminalId];
            if (terminal) {
              return {
                terminals: {
                  ...state.terminals,
                  [terminalId]: { ...terminal, isRunning: false, exitCode },
                },
              };
            }
            return state;
          });
          return exitCode;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      getSessionTerminals: async (sessionId: string): Promise<string[]> => {
        if (!isTauri()) return [];
        return acpTerminalGetSessionTerminals(sessionId);
      },

      killSessionTerminals: async (sessionId: string): Promise<void> => {
        if (!isTauri()) return;

        try {
          await acpTerminalKillSessionTerminals(sessionId);

          set((state) => {
            const terminals: Record<string, TerminalInstance> = {};
            const terminalIds: string[] = [];

            for (const [id, terminal] of Object.entries(state.terminals)) {
              if (terminal.sessionId !== sessionId) {
                terminals[id] = terminal;
                terminalIds.push(id);
              }
            }

            return { terminals, terminalIds };
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message });
          throw err;
        }
      },

      isTerminalRunning: async (terminalId: string): Promise<boolean> => {
        if (!isTauri()) return false;

        const isRunning = await acpTerminalIsRunning(terminalId);

        set((state) => {
          const terminal = state.terminals[terminalId];
          if (terminal) {
            return {
              terminals: {
                ...state.terminals,
                [terminalId]: { ...terminal, isRunning },
              },
            };
          }
          return state;
        });

        return isRunning;
      },

      getTerminalInfo: async (terminalId: string): Promise<TerminalInfo> => {
        if (!isTauri()) {
          throw new Error('ACP terminal is only available in Tauri environment');
        }
        return acpTerminalGetInfo(terminalId);
      },

      refreshTerminals: async (): Promise<void> => {
        if (!isTauri()) return;

        set({ isLoading: true });

        try {
          const terminalIds = await acpTerminalList();
          const terminals: Record<string, TerminalInstance> = {};

          for (const id of terminalIds) {
            try {
              const info = await acpTerminalGetInfo(id);
              const output = await acpTerminalOutput(id);
              const isRunning = await acpTerminalIsRunning(id);
              const existing = get().terminals[id];

              terminals[id] = {
                id,
                sessionId: info.sessionId,
                command: info.command,
                isRunning,
                output: output.output,
                exitCode: output.exitCode,
                createdAt: existing?.createdAt ?? Date.now(),
              };
            } catch {
              // Terminal may have been released
            }
          }

          set({ terminals, terminalIds, isLoading: false });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          set({ lastError: message, isLoading: false });
        }
      },

      // ========================================
      // Error Handling
      // ========================================

      clearLastError: (): void => {
        set({ lastError: null });
      },
});
