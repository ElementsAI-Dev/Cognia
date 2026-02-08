/**
 * Agent Bridge - Inter-agent communication and delegation system
 *
 * Connects SubAgent, AgentTeam, and BackgroundAgent systems:
 * - BackgroundAgent → AgentTeam delegation (spawn team for complex tasks)
 * - AgentTeam → SubAgent reuse (execute teammate tasks via sub-agent executor)
 * - SubAgent → BackgroundAgent promotion (promote long-running sub-agents)
 * - Shared memory across systems (blackboard pattern)
 * - Unified event bus for cross-system events
 *
 * Follows existing patterns: singleton manager, event emitter, nanoid IDs.
 */

import { nanoid } from 'nanoid';
import { loggers } from '@/lib/logger';
import type {
  AgentDelegation,
  AgentSystemType,
  SharedMemoryEntry,
  SharedMemoryNamespace,
  AgentTeamConfig,
} from '@/types/agent/agent-team';
import type { SubAgentResult } from '@/types/agent/sub-agent';
import type { BackgroundAgentResult } from '@/types/agent/background-agent';

const log = loggers.agent;

// ============================================================================
// Bridge Event Types
// ============================================================================

export type BridgeEventType =
  | 'delegation:created'
  | 'delegation:started'
  | 'delegation:completed'
  | 'delegation:failed'
  | 'delegation:cancelled'
  | 'memory:write'
  | 'memory:read'
  | 'memory:delete'
  | 'memory:expire';

export interface BridgeEventPayloads {
  'delegation:created': { delegation: AgentDelegation };
  'delegation:started': { delegation: AgentDelegation };
  'delegation:completed': { delegation: AgentDelegation; result: string };
  'delegation:failed': { delegation: AgentDelegation; error: string };
  'delegation:cancelled': { delegation: AgentDelegation };
  'memory:write': { namespace: string; entry: SharedMemoryEntry };
  'memory:read': { namespace: string; key: string; readerId: string };
  'memory:delete': { namespace: string; key: string };
  'memory:expire': { namespace: string; key: string };
}

export type BridgeEventListener<T extends BridgeEventType> = (
  payload: BridgeEventPayloads[T]
) => void;

// ============================================================================
// Bridge Event Emitter
// ============================================================================

export class BridgeEventEmitter {
  private listeners: Map<BridgeEventType, Set<BridgeEventListener<BridgeEventType>>> = new Map();

  on<T extends BridgeEventType>(
    event: T,
    listener: BridgeEventListener<T>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as BridgeEventListener<BridgeEventType>);
    return () => this.off(event, listener);
  }

  off<T extends BridgeEventType>(
    event: T,
    listener: BridgeEventListener<T>
  ): void {
    this.listeners.get(event)?.delete(listener as BridgeEventListener<BridgeEventType>);
  }

  emit<T extends BridgeEventType>(
    event: T,
    payload: BridgeEventPayloads[T]
  ): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        log.error(`Bridge event listener error for ${event}`, error as Error);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// ============================================================================
// Shared Memory Manager (Blackboard Pattern)
// ============================================================================

export class SharedMemoryManager {
  private namespaces: Map<string, Map<string, SharedMemoryEntry>> = new Map();
  private eventEmitter: BridgeEventEmitter;
  private expirationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(eventEmitter: BridgeEventEmitter) {
    this.eventEmitter = eventEmitter;
    this.startExpirationCheck();
  }

  /**
   * Write a value to shared memory
   */
  write(
    namespace: SharedMemoryNamespace | string,
    key: string,
    value: unknown,
    writtenBy: string,
    options: {
      writerName?: string;
      expiresInMs?: number;
      tags?: string[];
      readableBy?: string[];
    } = {}
  ): SharedMemoryEntry {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, new Map());
    }

    const ns = this.namespaces.get(namespace)!;
    const existing = ns.get(key);

    const entry: SharedMemoryEntry = {
      key,
      value,
      writtenBy,
      writerName: options.writerName,
      writtenAt: new Date(),
      expiresAt: options.expiresInMs
        ? new Date(Date.now() + options.expiresInMs)
        : undefined,
      version: existing ? existing.version + 1 : 1,
      tags: options.tags,
      readableBy: options.readableBy,
    };

    ns.set(key, entry);

    this.eventEmitter.emit('memory:write', { namespace, entry });
    log.debug('Shared memory write', { namespace, key, writtenBy, version: entry.version });

    return entry;
  }

  /**
   * Read a value from shared memory
   */
  read(
    namespace: SharedMemoryNamespace | string,
    key: string,
    readerId?: string
  ): SharedMemoryEntry | undefined {
    const ns = this.namespaces.get(namespace);
    if (!ns) return undefined;

    const entry = ns.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt && entry.expiresAt.getTime() < Date.now()) {
      ns.delete(key);
      this.eventEmitter.emit('memory:expire', { namespace, key });
      return undefined;
    }

    // Check access control
    if (readerId && entry.readableBy && entry.readableBy.length > 0) {
      if (!entry.readableBy.includes(readerId)) {
        return undefined;
      }
    }

    if (readerId) {
      this.eventEmitter.emit('memory:read', { namespace, key, readerId });
    }

    return entry;
  }

  /**
   * Read all entries in a namespace
   */
  readAll(
    namespace: SharedMemoryNamespace | string,
    readerId?: string
  ): SharedMemoryEntry[] {
    const ns = this.namespaces.get(namespace);
    if (!ns) return [];

    const now = Date.now();
    const entries: SharedMemoryEntry[] = [];

    for (const [key, entry] of ns.entries()) {
      // Skip expired
      if (entry.expiresAt && entry.expiresAt.getTime() < now) {
        ns.delete(key);
        continue;
      }

      // Check access control
      if (readerId && entry.readableBy && entry.readableBy.length > 0) {
        if (!entry.readableBy.includes(readerId)) continue;
      }

      entries.push(entry);
    }

    return entries;
  }

  /**
   * Search entries by tags
   */
  searchByTags(
    namespace: SharedMemoryNamespace | string,
    tags: string[],
    readerId?: string
  ): SharedMemoryEntry[] {
    return this.readAll(namespace, readerId).filter((entry) =>
      entry.tags && tags.some((tag) => entry.tags!.includes(tag))
    );
  }

  /**
   * Delete an entry
   */
  delete(namespace: SharedMemoryNamespace | string, key: string): boolean {
    const ns = this.namespaces.get(namespace);
    if (!ns) return false;

    const deleted = ns.delete(key);
    if (deleted) {
      this.eventEmitter.emit('memory:delete', { namespace, key });
    }
    return deleted;
  }

  /**
   * Clear all entries in a namespace
   */
  clearNamespace(namespace: SharedMemoryNamespace | string): void {
    this.namespaces.delete(namespace);
  }

  /**
   * Clear all shared memory
   */
  clearAll(): void {
    this.namespaces.clear();
  }

  /**
   * Get all namespace names
   */
  getNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Get entry count for a namespace
   */
  getEntryCount(namespace: string): number {
    return this.namespaces.get(namespace)?.size ?? 0;
  }

  /**
   * Export shared memory state as a context string for prompts
   */
  toContextString(namespace: SharedMemoryNamespace | string, readerId?: string): string {
    const entries = this.readAll(namespace, readerId);
    if (entries.length === 0) return '';

    const parts = entries.map((entry) => {
      const value = typeof entry.value === 'string'
        ? entry.value
        : JSON.stringify(entry.value, null, 2);
      const meta = entry.writerName ? ` (by ${entry.writerName})` : '';
      return `[${entry.key}]${meta}: ${value}`;
    });

    return `--- Shared Memory (${namespace}) ---\n${parts.join('\n')}`;
  }

  private startExpirationCheck(): void {
    this.expirationTimer = setInterval(() => {
      const now = Date.now();
      for (const [namespace, ns] of this.namespaces.entries()) {
        for (const [key, entry] of ns.entries()) {
          if (entry.expiresAt && entry.expiresAt.getTime() < now) {
            ns.delete(key);
            this.eventEmitter.emit('memory:expire', { namespace, key });
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  dispose(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
    this.clearAll();
  }
}

// ============================================================================
// Agent Bridge
// ============================================================================

export interface DelegateToTeamOptions {
  task: string;
  teamName?: string;
  teamDescription?: string;
  teamConfig?: Partial<AgentTeamConfig>;
  templateId?: string;
  sourceType: AgentSystemType;
  sourceId: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface DelegateToBackgroundOptions {
  task: string;
  name?: string;
  description?: string;
  sourceType: AgentSystemType;
  sourceId: string;
  sessionId?: string;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface DelegateToSubAgentOptions {
  task: string;
  name?: string;
  sourceType: AgentSystemType;
  sourceId: string;
  parentAgentId?: string;
  config?: Record<string, unknown>;
}

/**
 * AgentBridge - Central coordinator for cross-system agent communication
 *
 * Provides:
 * 1. Delegation: Route tasks between SubAgent, AgentTeam, BackgroundAgent
 * 2. Shared Memory: Blackboard pattern for cross-system data sharing
 * 3. Event Bus: Unified events for delegation lifecycle
 */
export class AgentBridge {
  private delegations: Map<string, AgentDelegation> = new Map();
  private eventEmitter: BridgeEventEmitter;
  private sharedMemory: SharedMemoryManager;

  // Lazy-loaded managers (to avoid circular dependencies)
  private teamManagerGetter?: () => import('./agent-team').AgentTeamManager;
  private backgroundManagerGetter?: () => import('./background-agent-manager').BackgroundAgentManager;

  constructor() {
    this.eventEmitter = new BridgeEventEmitter();
    this.sharedMemory = new SharedMemoryManager(this.eventEmitter);
  }

  /**
   * Set the team manager getter (lazy to avoid circular deps)
   */
  setTeamManagerGetter(getter: () => import('./agent-team').AgentTeamManager): void {
    this.teamManagerGetter = getter;
  }

  /**
   * Set the background manager getter (lazy to avoid circular deps)
   */
  setBackgroundManagerGetter(
    getter: () => import('./background-agent-manager').BackgroundAgentManager
  ): void {
    this.backgroundManagerGetter = getter;
  }

  // ==========================================================================
  // Delegation
  // ==========================================================================

  /**
   * Create a delegation record
   */
  createDelegation(
    sourceType: AgentSystemType,
    sourceId: string,
    targetType: AgentSystemType,
    task: string,
    config?: Record<string, unknown>
  ): AgentDelegation {
    const delegation: AgentDelegation = {
      id: nanoid(),
      sourceType,
      sourceId,
      targetType,
      task,
      config,
      status: 'pending',
      createdAt: new Date(),
    };

    this.delegations.set(delegation.id, delegation);
    this.eventEmitter.emit('delegation:created', { delegation });
    log.info('Delegation created', {
      id: delegation.id,
      source: `${sourceType}:${sourceId}`,
      target: targetType,
    });

    return delegation;
  }

  /**
   * Delegate a task to an AgentTeam
   * BackgroundAgent or SubAgent can spawn a team for complex decomposable tasks
   */
  async delegateToTeam(options: DelegateToTeamOptions): Promise<AgentDelegation> {
    const delegation = this.createDelegation(
      options.sourceType,
      options.sourceId,
      'team',
      options.task,
      options.metadata as Record<string, unknown>
    );

    if (!this.teamManagerGetter) {
      delegation.status = 'failed';
      delegation.error = 'Team manager not available';
      this.eventEmitter.emit('delegation:failed', {
        delegation,
        error: delegation.error,
      });
      return delegation;
    }

    try {
      const teamManager = this.teamManagerGetter();

      // Create team
      const team = teamManager.createTeam({
        name: options.teamName || `Delegated: ${options.task.slice(0, 50)}`,
        description: options.teamDescription || `Auto-delegated from ${options.sourceType}:${options.sourceId}`,
        task: options.task,
        config: options.teamConfig,
        sessionId: options.sessionId,
        metadata: {
          ...options.metadata,
          delegationId: delegation.id,
          sourceType: options.sourceType,
          sourceId: options.sourceId,
        },
      });

      delegation.targetId = team.id;
      delegation.status = 'active';
      this.eventEmitter.emit('delegation:started', { delegation });

      // Store the delegation reference on the team
      if (!team.delegationIds) team.delegationIds = [];
      team.delegationIds.push(delegation.id);
      team.parentDelegationId = delegation.id;

      // Execute team
      const result = await teamManager.executeTeam(team.id);

      delegation.status = result.status === 'completed' ? 'completed' : 'failed';
      delegation.result = result.finalResult;
      delegation.error = result.error;
      delegation.completedAt = new Date();

      if (delegation.status === 'completed') {
        this.eventEmitter.emit('delegation:completed', {
          delegation,
          result: delegation.result || '',
        });

        // Write result to shared memory for the source to read
        this.sharedMemory.write(
          'results',
          `delegation:${delegation.id}`,
          delegation.result,
          delegation.targetId || '',
          { writerName: team.name, tags: ['delegation', 'team_result'] }
        );
      } else {
        this.eventEmitter.emit('delegation:failed', {
          delegation,
          error: delegation.error || 'Team execution failed',
        });
      }

      return delegation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      delegation.status = 'failed';
      delegation.error = errorMessage;
      delegation.completedAt = new Date();

      this.eventEmitter.emit('delegation:failed', {
        delegation,
        error: errorMessage,
      });

      return delegation;
    }
  }

  /**
   * Delegate a task to a BackgroundAgent
   * Useful for promoting a sub-agent or team task to background execution
   */
  async delegateToBackground(options: DelegateToBackgroundOptions): Promise<AgentDelegation> {
    const delegation = this.createDelegation(
      options.sourceType,
      options.sourceId,
      'background',
      options.task,
      options.config
    );

    if (!this.backgroundManagerGetter) {
      delegation.status = 'failed';
      delegation.error = 'Background manager not available';
      this.eventEmitter.emit('delegation:failed', {
        delegation,
        error: delegation.error,
      });
      return delegation;
    }

    try {
      const bgManager = this.backgroundManagerGetter();

      const agent = bgManager.createAgent({
        sessionId: options.sessionId || '',
        name: options.name || `Delegated: ${options.task.slice(0, 50)}`,
        description: options.description || `Auto-delegated from ${options.sourceType}:${options.sourceId}`,
        task: options.task,
        priority: options.priority ?? 1,
        metadata: {
          delegationId: delegation.id,
          sourceType: options.sourceType,
          sourceId: options.sourceId,
        },
      });

      delegation.targetId = agent.id;
      delegation.status = 'active';
      this.eventEmitter.emit('delegation:started', { delegation });

      // Queue the agent
      bgManager.queueAgent(agent.id);

      // Wait for completion via event
      const bgEventEmitter = (await import('./background-agent-events')).getBackgroundAgentEventEmitter();

      return new Promise<AgentDelegation>((resolve) => {
        const onCompleted = bgEventEmitter.on('agent:completed', ({ agent: completedAgent, result }) => {
          if (completedAgent.id === agent.id) {
            onCompleted();
            onFailed();

            delegation.status = 'completed';
            delegation.result = result.finalResponse;
            delegation.completedAt = new Date();

            this.sharedMemory.write(
              'results',
              `delegation:${delegation.id}`,
              delegation.result,
              agent.id,
              { writerName: agent.name, tags: ['delegation', 'background_result'] }
            );

            this.eventEmitter.emit('delegation:completed', {
              delegation,
              result: delegation.result || '',
            });

            resolve(delegation);
          }
        });

        const onFailed = bgEventEmitter.on('agent:failed', ({ agent: failedAgent, error }) => {
          if (failedAgent.id === agent.id) {
            onCompleted();
            onFailed();

            delegation.status = 'failed';
            delegation.error = error;
            delegation.completedAt = new Date();

            this.eventEmitter.emit('delegation:failed', {
              delegation,
              error,
            });

            resolve(delegation);
          }
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      delegation.status = 'failed';
      delegation.error = errorMessage;
      delegation.completedAt = new Date();

      this.eventEmitter.emit('delegation:failed', {
        delegation,
        error: errorMessage,
      });

      return delegation;
    }
  }

  /**
   * Cancel an active delegation
   */
  cancelDelegation(delegationId: string): boolean {
    const delegation = this.delegations.get(delegationId);
    if (!delegation || delegation.status !== 'active') return false;

    delegation.status = 'cancelled';
    delegation.completedAt = new Date();

    // Cancel the target
    if (delegation.targetId) {
      if (delegation.targetType === 'team' && this.teamManagerGetter) {
        this.teamManagerGetter().cancelTeam(delegation.targetId);
      } else if (delegation.targetType === 'background' && this.backgroundManagerGetter) {
        this.backgroundManagerGetter().cancelAgent(delegation.targetId);
      }
    }

    this.eventEmitter.emit('delegation:cancelled', { delegation });
    return true;
  }

  /**
   * Get a delegation by ID
   */
  getDelegation(delegationId: string): AgentDelegation | undefined {
    return this.delegations.get(delegationId);
  }

  /**
   * Get all delegations for a source
   */
  getDelegationsBySource(sourceType: AgentSystemType, sourceId: string): AgentDelegation[] {
    return Array.from(this.delegations.values()).filter(
      (d) => d.sourceType === sourceType && d.sourceId === sourceId
    );
  }

  /**
   * Get all active delegations
   */
  getActiveDelegations(): AgentDelegation[] {
    return Array.from(this.delegations.values()).filter(
      (d) => d.status === 'active' || d.status === 'pending'
    );
  }

  // ==========================================================================
  // Shared Memory Access
  // ==========================================================================

  getSharedMemory(): SharedMemoryManager {
    return this.sharedMemory;
  }

  // ==========================================================================
  // Event Bus Access
  // ==========================================================================

  getEventEmitter(): BridgeEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Subscribe to delegation events
   */
  onDelegation<T extends BridgeEventType>(
    event: T,
    listener: BridgeEventListener<T>
  ): () => void {
    return this.eventEmitter.on(event, listener);
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  /**
   * Convert a SubAgentResult to a format suitable for team shared memory
   */
  storeSubAgentResult(
    namespace: SharedMemoryNamespace,
    subAgentId: string,
    subAgentName: string,
    result: SubAgentResult
  ): SharedMemoryEntry {
    return this.sharedMemory.write(
      namespace,
      `subagent:${subAgentId}`,
      {
        success: result.success,
        response: result.finalResponse,
        steps: result.totalSteps,
        duration: result.duration,
        error: result.error,
      },
      subAgentId,
      {
        writerName: subAgentName,
        tags: ['subagent', result.success ? 'success' : 'failure'],
      }
    );
  }

  /**
   * Convert a BackgroundAgentResult to shared memory entry
   */
  storeBackgroundResult(
    namespace: SharedMemoryNamespace,
    agentId: string,
    agentName: string,
    result: BackgroundAgentResult
  ): SharedMemoryEntry {
    return this.sharedMemory.write(
      namespace,
      `background:${agentId}`,
      {
        success: result.success,
        response: result.finalResponse,
        steps: result.totalSteps,
        duration: result.duration,
        error: result.error,
      },
      agentId,
      {
        writerName: agentName,
        tags: ['background', result.success ? 'success' : 'failure'],
      }
    );
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.sharedMemory.dispose();
    this.eventEmitter.removeAllListeners();
    this.delegations.clear();
  }

  /**
   * Get bridge statistics
   */
  getStatistics(): {
    totalDelegations: number;
    activeDelegations: number;
    completedDelegations: number;
    failedDelegations: number;
    sharedMemoryNamespaces: number;
    totalMemoryEntries: number;
  } {
    const delegations = Array.from(this.delegations.values());
    const namespaces = this.sharedMemory.getNamespaces();

    return {
      totalDelegations: delegations.length,
      activeDelegations: delegations.filter((d) => d.status === 'active').length,
      completedDelegations: delegations.filter((d) => d.status === 'completed').length,
      failedDelegations: delegations.filter((d) => d.status === 'failed').length,
      sharedMemoryNamespaces: namespaces.length,
      totalMemoryEntries: namespaces.reduce(
        (sum, ns) => sum + this.sharedMemory.getEntryCount(ns),
        0
      ),
    };
  }
}

// ============================================================================
// Singleton
// ============================================================================

let globalBridge: AgentBridge | null = null;

/**
 * Get the global agent bridge instance
 */
export function getAgentBridge(): AgentBridge {
  if (!globalBridge) {
    globalBridge = new AgentBridge();
  }
  return globalBridge;
}

/**
 * Set the global agent bridge instance
 */
export function setAgentBridge(bridge: AgentBridge): void {
  globalBridge = bridge;
}

/**
 * Reset the global agent bridge
 */
export function resetAgentBridge(): void {
  if (globalBridge) {
    globalBridge.dispose();
  }
  globalBridge = null;
}
