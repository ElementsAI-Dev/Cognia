/**
 * Background Agent Manager - Manage agents running in the background
 * 
 * Features:
 * - Queue management for background agents
 * - Priority-based scheduling
 * - Pause/Resume/Cancel operations with checkpoint support
 * - State persistence and recovery
 * - Notification system
 * - Execution timeout handling
 * - Health monitoring and stall detection
 * - Event-driven state synchronization
 */

import { nanoid } from 'nanoid';
import type { ProviderName } from '../core/client';
import {
  AgentOrchestrator,
  type OrchestratorConfig,
} from './agent-orchestrator';
import { createMcpToolsFromStore } from '../tools/mcp-tools';
import { createRAGSearchTool, buildRAGConfigFromSettings } from './agent-tools';
import {
  DEFAULT_BACKGROUND_AGENT_CONFIG,
  serializeBackgroundAgent,
  deserializeBackgroundAgent,
  type BackgroundAgent,
  type BackgroundAgentConfig,
  type BackgroundAgentStatus,
  type BackgroundAgentLog,
  type BackgroundAgentStep,
  type BackgroundAgentResult,
  type BackgroundAgentNotification,
  type BackgroundAgentExecutionOptions,
  type BackgroundAgentQueueState,
  type CreateBackgroundAgentInput,
  type UpdateBackgroundAgentInput,
} from '@/types/agent/background-agent';
import type { AgentTool } from './agent-executor';
import type { Skill } from '@/types/system/skill';
import { createSkillTools, buildMultiSkillSystemPrompt } from '@/lib/skills/executor';
import type { McpServerState, ToolCallResult } from '@/types/mcp';
import {
  getBackgroundAgentEventEmitter,
  type BackgroundAgentEventEmitter,
  type BackgroundAgentEventPayloads,
  type BackgroundAgentEventType,
  type AgentCheckpoint,
  type HealthWarning,
} from './background-agent-events';
import { getAgentBridge } from './agent-bridge';
import { loggers } from '@/lib/logger';

const log = loggers.agent;

function isInterruptedStatus(status: BackgroundAgentStatus): boolean {
  return status === 'paused' || status === 'cancelled' || status === 'timeout';
}

/**
 * Background Agent Manager class
 */
/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  intervalMs: number;
  stallThresholdMs: number;
  slowProgressThresholdMs: number;
}

const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds
  stallThresholdMs: 120000, // 2 minutes
  slowProgressThresholdMs: 60000, // 1 minute
};

export class BackgroundAgentManager {
  private agents: Map<string, BackgroundAgent> = new Map();
  private queue: BackgroundAgentQueueState = {
    items: [],
    maxConcurrent: 3,
    currentlyRunning: 0,
    isPaused: false,
  };
  private orchestrators: Map<string, AgentOrchestrator> = new Map();
  private executionOptions: Map<string, BackgroundAgentExecutionOptions> = new Map();
  private persistenceKey = 'cognia-background-agents';

  // Checkpoint storage for pause/resume
  private checkpoints: Map<string, AgentCheckpoint> = new Map();

  // Timeout handlers
  private timeoutHandlers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // Health check
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckConfig: HealthCheckConfig = DEFAULT_HEALTH_CHECK_CONFIG;
  private lastActivityTimes: Map<string, number> = new Map();

  // Event emitter
  private eventEmitter: BackgroundAgentEventEmitter;

  // External dependencies for Skills, RAG, and MCP integration
  private skillsProvider?: () => { skills: Record<string, Skill>; activeSkillIds: string[] };
  private mcpProvider?: () => { servers: McpServerState[]; callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult> };
  private vectorSettingsProvider?: () => { mode: 'embedded' | 'server'; serverUrl: string; embeddingProvider: string; embeddingModel: string };
  private apiKeyProvider?: (provider: string) => string;

  constructor(maxConcurrent: number = 3, healthCheckConfig?: Partial<HealthCheckConfig>) {
    this.queue.maxConcurrent = maxConcurrent;
    this.eventEmitter = getBackgroundAgentEventEmitter();
    
    if (healthCheckConfig) {
      this.healthCheckConfig = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...healthCheckConfig };
    }
    
    // Start health check if enabled
    if (this.healthCheckConfig.enabled) {
      this.startHealthCheck();
    }

    // Register with bridge for cross-system delegation
    const bridge = getAgentBridge();
    bridge.setBackgroundManagerGetter(() => this);
  }

  /**
   * Get the event emitter for subscribing to events
   */
  getEventEmitter(): BackgroundAgentEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Start health check interval
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckConfig.intervalMs);
  }

  /**
   * Stop health check interval
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform health check on all running agents
   */
  private performHealthCheck(): void {
    const now = Date.now();
    const runningAgents = this.getRunningAgents();

    for (const agent of runningAgents) {
      const lastActivity = this.lastActivityTimes.get(agent.id) ?? agent.startedAt?.getTime() ?? now;
      const timeSinceActivity = now - lastActivity;

      // Check for stalled agent
      if (timeSinceActivity > this.healthCheckConfig.stallThresholdMs) {
        const warning: HealthWarning = {
          type: 'stalled',
          message: `Agent "${agent.name}" has been inactive for ${Math.round(timeSinceActivity / 1000)}s`,
          timestamp: new Date(),
          metrics: { inactiveMs: timeSinceActivity, progress: agent.progress },
        };
        this.emitEvent('agent:health_warning', { agent, warning });
        this.addLog(agent, 'warn', warning.message, 'system');
      }
      // Check for slow progress
      else if (timeSinceActivity > this.healthCheckConfig.slowProgressThresholdMs && agent.progress < 50) {
        const warning: HealthWarning = {
          type: 'slow_progress',
          message: `Agent "${agent.name}" is making slow progress (${agent.progress}%)`,
          timestamp: new Date(),
          metrics: { inactiveMs: timeSinceActivity, progress: agent.progress },
        };
        this.emitEvent('agent:health_warning', { agent, warning });
      }

      // Check for high retry count
      if (agent.retryCount >= 2) {
        const warning: HealthWarning = {
          type: 'high_retry_count',
          message: `Agent "${agent.name}" has retried ${agent.retryCount} times`,
          timestamp: new Date(),
          metrics: { retryCount: agent.retryCount },
        };
        this.emitEvent('agent:health_warning', { agent, warning });
      }
    }
  }

  /**
   * Update last activity time for an agent
   */
  private updateActivityTime(agentId: string): void {
    this.lastActivityTimes.set(agentId, Date.now());
  }

  /**
   * Emit queue state update event
   */
  private emitQueueUpdated(): void {
    this.emitEvent('queue:updated', {
      queueLength: this.queue.items.length,
      running: this.queue.currentlyRunning,
      maxConcurrent: this.queue.maxConcurrent,
    });
  }

  /**
   * Normalize and clone an agent snapshot before importing it into manager state.
   */
  private normalizeSnapshotAgent(
    snapshot: BackgroundAgent,
    options: { normalizeRunningToQueued?: boolean } = {}
  ): BackgroundAgent {
    const hydrated = deserializeBackgroundAgent(serializeBackgroundAgent(snapshot));

    if (options.normalizeRunningToQueued && hydrated.status === 'running') {
      hydrated.status = 'queued';
      hydrated.queuedAt = hydrated.queuedAt || new Date();
      hydrated.executionState.activeSubAgents = [];
      hydrated.executionState.currentPhase = 'planning';
      hydrated.executionState.resumedAt = new Date();
    }

    return hydrated;
  }

  /**
   * Clone queue state to avoid leaking mutable references.
   */
  private cloneQueueState(queue: BackgroundAgentQueueState = this.queue): BackgroundAgentQueueState {
    return {
      ...queue,
      items: queue.items.map((item) => ({
        ...item,
        queuedAt: new Date(item.queuedAt),
        estimatedStartTime: item.estimatedStartTime ? new Date(item.estimatedStartTime) : undefined,
      })),
    };
  }

  /**
   * Best-effort clone helper for event payload fragments.
   */
  private safeClone<T>(value: T): T {
    if (value === null || value === undefined) return value;
    try {
      return structuredClone(value);
    } catch {
      try {
        return JSON.parse(JSON.stringify(value)) as T;
      } catch {
        return value;
      }
    }
  }

  /**
   * Clone event payload to avoid exposing mutable internal references.
   */
  private cloneEventPayload<T extends BackgroundAgentEventType>(
    payload: BackgroundAgentEventPayloads[T]
  ): BackgroundAgentEventPayloads[T] {
    const cloned = { ...payload } as Record<string, unknown>;

    if ('agent' in cloned && cloned.agent) {
      cloned.agent = this.normalizeSnapshotAgent(cloned.agent as BackgroundAgent);
    }
    if ('checkpoint' in cloned && cloned.checkpoint) {
      cloned.checkpoint = this.safeClone(cloned.checkpoint);
    }
    if ('warning' in cloned && cloned.warning) {
      cloned.warning = this.safeClone(cloned.warning);
    }
    if ('subAgent' in cloned && cloned.subAgent) {
      cloned.subAgent = this.safeClone(cloned.subAgent);
    }
    if ('result' in cloned && cloned.result) {
      cloned.result = this.safeClone(cloned.result);
    }
    if ('toolCall' in cloned && cloned.toolCall) {
      cloned.toolCall = this.safeClone(cloned.toolCall);
    }
    if ('log' in cloned && cloned.log) {
      cloned.log = this.safeClone(cloned.log);
    }
    if ('notification' in cloned && cloned.notification) {
      cloned.notification = this.safeClone(cloned.notification);
    }

    if ('completedAgents' in cloned && Array.isArray(cloned.completedAgents)) {
      cloned.completedAgents = [...cloned.completedAgents];
    }
    if ('cancelledAgents' in cloned && Array.isArray(cloned.cancelledAgents)) {
      cloned.cancelledAgents = [...cloned.cancelledAgents];
    }
    if ('savedCheckpoints' in cloned && Array.isArray(cloned.savedCheckpoints)) {
      cloned.savedCheckpoints = [...cloned.savedCheckpoints];
    }

    return cloned as BackgroundAgentEventPayloads[T];
  }

  /**
   * Emit event with cloned payload snapshots.
   */
  private emitEvent<T extends BackgroundAgentEventType>(
    event: T,
    payload: BackgroundAgentEventPayloads[T]
  ): void {
    this.eventEmitter.emit(event, this.cloneEventPayload(payload));
  }

  /**
   * Set up execution timeout for an agent
   */
  private setupTimeout(agent: BackgroundAgent): void {
    if (!agent.config.timeout) return;

    // Clear existing timeout
    this.clearTimeout(agent.id);

    const timeoutHandler = setTimeout(() => {
      if (agent.status === 'running') {
        this.handleTimeout(agent);
      }
    }, agent.config.timeout);

    this.timeoutHandlers.set(agent.id, timeoutHandler);
  }

  /**
   * Clear timeout for an agent
   */
  private clearTimeout(agentId: string): void {
    const handler = this.timeoutHandlers.get(agentId);
    if (handler) {
      clearTimeout(handler);
      this.timeoutHandlers.delete(agentId);
    }
  }

  /**
   * Handle agent timeout
   */
  private handleTimeout(agent: BackgroundAgent): void {
    const duration = agent.startedAt ? Date.now() - agent.startedAt.getTime() : 0;

    // Cancel the orchestrator
    const orchestrator = this.orchestrators.get(agent.id);
    if (orchestrator) {
      orchestrator.cancel();
    }

    // Update agent state
    agent.status = 'timeout';
    agent.completedAt = new Date();
    agent.error = `Execution timeout after ${Math.round(duration / 1000)}s`;
    agent.result = {
      success: false,
      finalResponse: '',
      steps: agent.steps,
      totalSteps: agent.steps.length,
      duration,
      retryCount: agent.retryCount,
      error: agent.error,
    };

    this.addLog(agent, 'error', agent.error, 'system');
    
    if (agent.config.notifyOnError) {
      this.addNotification(agent, 'failed', 'Agent Timeout', agent.error);
    }

    // Emit timeout event
    this.emitEvent('agent:timeout', { agent, duration });

    // Notify via callback
    const options = this.executionOptions.get(agent.id);
    options?.onError?.(agent, agent.error);

    // Cleanup
    this.cleanupAgent(agent.id);
    this.emitQueueUpdated();
  }

  /**
   * Create a checkpoint for pause/resume
   */
  createCheckpoint(agent: BackgroundAgent): AgentCheckpoint {
    const checkpoint: AgentCheckpoint = {
      id: nanoid(),
      agentId: agent.id,
      timestamp: new Date(),
      currentStep: agent.executionState.currentStep,
      currentPhase: agent.executionState.currentPhase as 'planning' | 'executing' | 'summarizing',
      completedSubAgents: [...agent.executionState.completedSubAgents],
      pendingSubAgents: agent.subAgents
        .filter(sa => sa.status === 'pending' || sa.status === 'running')
        .map(sa => sa.id),
      accumulatedContext: {},
      partialResults: {},
      conversationHistory: [],
    };

    // Store completed sub-agent results
    agent.subAgents
      .filter(sa => sa.status === 'completed' && sa.result)
      .forEach(sa => {
        checkpoint.partialResults[sa.id] = sa.result;
      });

    this.checkpoints.set(agent.id, checkpoint);
    this.emitEvent('agent:checkpoint', { agent, checkpoint });

    return checkpoint;
  }

  /**
   * Get checkpoint for an agent
   */
  getCheckpoint(agentId: string): AgentCheckpoint | undefined {
    return this.checkpoints.get(agentId);
  }

  /**
   * Clear checkpoint for an agent
   */
  clearCheckpoint(agentId: string): void {
    this.checkpoints.delete(agentId);
  }

  /**
   * Cleanup resources for an agent
   */
  private cleanupAgent(agentId: string): void {
    this.clearTimeout(agentId);
    this.orchestrators.delete(agentId);
    this.executionOptions.delete(agentId);
    this.lastActivityTimes.delete(agentId);
  }

  /**
   * Set external providers for Skills, RAG, and MCP integration
   */
  setProviders(providers: {
    skills?: () => { skills: Record<string, Skill>; activeSkillIds: string[] };
    mcp?: () => { servers: McpServerState[]; callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult> };
    vectorSettings?: () => { mode: 'embedded' | 'server'; serverUrl: string; embeddingProvider: string; embeddingModel: string };
    apiKey?: (provider: string) => string;
  }): void {
    this.skillsProvider = providers.skills;
    this.mcpProvider = providers.mcp;
    this.vectorSettingsProvider = providers.vectorSettings;
    this.apiKeyProvider = providers.apiKey;
  }

  /**
   * Build enhanced tools with Skills, RAG, and MCP integration
   */
  private async buildEnhancedTools(
    agent: BackgroundAgent,
    _options: BackgroundAgentExecutionOptions
  ): Promise<Record<string, AgentTool>> {
    const tools: Record<string, AgentTool> = {};

    // Add Skill tools if enabled
    if (agent.config.enableSkills && this.skillsProvider) {
      const { skills, activeSkillIds } = this.skillsProvider();
      const skillIdsToUse = agent.config.activeSkillIds || activeSkillIds;
      const activeSkills = skillIdsToUse
        .map(id => skills[id])
        .filter((s): s is Skill => s !== undefined);
      
      if (activeSkills.length > 0) {
        const skillTools = createSkillTools(activeSkills);
        Object.assign(tools, skillTools);
      }
    }

    // Add MCP tools if enabled
    if (agent.config.enableMcpTools && this.mcpProvider) {
      const { servers, callTool } = this.mcpProvider();
      const serverIdsToUse = agent.config.mcpServerIds;
      const serversToUse = serverIdsToUse 
        ? servers.filter(s => serverIdsToUse.includes(s.id))
        : servers;
      
      if (serversToUse.length > 0) {
        const mcpTools = createMcpToolsFromStore(serversToUse, callTool);
        Object.assign(tools, mcpTools);
      }
    }

    // Add RAG tool if enabled
    if (agent.config.enableRAG && this.vectorSettingsProvider && this.apiKeyProvider) {
      const vectorSettings = this.vectorSettingsProvider();
      const apiKey = this.apiKeyProvider(vectorSettings.embeddingProvider);
      
      if (apiKey) {
        const ragConfig = buildRAGConfigFromSettings(vectorSettings, apiKey);
        const ragTool = createRAGSearchTool(ragConfig);
        tools[ragTool.name] = ragTool;
      }
    }

    return tools;
  }

  /**
   * Build enhanced system prompt with Skills
   */
  private buildEnhancedSystemPrompt(
    agent: BackgroundAgent,
    _options: BackgroundAgentExecutionOptions
  ): string {
    let systemPrompt = agent.config.systemPrompt || 'You are a helpful AI assistant.';

    // Add Skills system prompt if enabled
    if (agent.config.enableSkills && this.skillsProvider) {
      const { skills, activeSkillIds } = this.skillsProvider();
      const skillIdsToUse = agent.config.activeSkillIds || activeSkillIds;
      const activeSkills = skillIdsToUse
        .map(id => skills[id])
        .filter((s): s is Skill => s !== undefined);
      
      if (activeSkills.length > 0) {
        const skillsPrompt = buildMultiSkillSystemPrompt(activeSkills, {
          maxContentLength: 8000,
          includeResources: true,
        });
        systemPrompt = `${skillsPrompt}\n\n---\n\n${systemPrompt}`;
      }
    }

    return systemPrompt;
  }

  /**
   * Create a new background agent
   */
  createAgent(input: CreateBackgroundAgentInput): BackgroundAgent {
    const now = new Date();
    const config: BackgroundAgentConfig = {
      ...DEFAULT_BACKGROUND_AGENT_CONFIG,
      ...input.config,
    };

    const agent: BackgroundAgent = {
      id: input.id || nanoid(),
      sessionId: input.sessionId,
      name: input.name,
      description: input.description,
      task: input.task,
      status: 'idle',
      progress: 0,
      config,
      executionState: {
        currentStep: 0,
        totalSteps: 0,
        currentPhase: 'planning',
        activeSubAgents: [],
        completedSubAgents: [],
        failedSubAgents: [],
        pendingApprovals: [],
        lastActivity: now,
      },
      subAgents: [],
      steps: [],
      logs: [],
      notifications: [],
      createdAt: now,
      retryCount: 0,
      priority: input.priority ?? 5,
      tags: input.tags,
      metadata: input.metadata,
    };

    this.agents.set(agent.id, agent);
    this.addLog(agent, 'info', 'Background agent created', 'system');
    
    // Emit created event
    this.emitEvent('agent:created', { agent });

    return agent;
  }

  /**
   * Hydrate (upsert) a full agent snapshot into manager state.
   * Useful when manager needs to recover from an external source of truth (e.g. Zustand store).
   */
  hydrateAgent(
    snapshot: BackgroundAgent,
    options: { normalizeRunningToQueued?: boolean } = {}
  ): BackgroundAgent {
    const hydrated = this.normalizeSnapshotAgent(snapshot, options);
    const existing = this.agents.get(hydrated.id);

    if (existing) {
      if (existing.status === 'running') {
        this.queue.currentlyRunning = Math.max(0, this.queue.currentlyRunning - 1);
      }
      const existingOrchestrator = this.orchestrators.get(hydrated.id);
      existingOrchestrator?.cancel();
      this.cleanupAgent(hydrated.id);
    }

    this.queue.items = this.queue.items.filter((item) => item.agentId !== hydrated.id);
    if (hydrated.status === 'queued') {
      this.queue.items.push({
        agentId: hydrated.id,
        priority: hydrated.priority,
        queuedAt: hydrated.queuedAt || new Date(),
      });
      this.queue.items.sort((a, b) => a.priority - b.priority);
    }

    this.agents.set(hydrated.id, hydrated);
    this.emitQueueUpdated();

    return hydrated;
  }

  /**
   * Update an existing background agent
   */
  updateAgent(agentId: string, updates: UpdateBackgroundAgentInput): BackgroundAgent | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;

    if (updates.name !== undefined) agent.name = updates.name;
    if (updates.description !== undefined) agent.description = updates.description;
    if (updates.task !== undefined) agent.task = updates.task;
    if (updates.config !== undefined) {
      agent.config = { ...agent.config, ...updates.config };
    }
    if (updates.priority !== undefined) agent.priority = updates.priority;
    if (updates.tags !== undefined) agent.tags = updates.tags;
    if (updates.metadata !== undefined) {
      agent.metadata = { ...agent.metadata, ...updates.metadata };
    }

    return agent;
  }

  /**
   * Delete a background agent
   */
  deleteAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Cancel if running
    if (agent.status === 'running' || agent.status === 'queued') {
      this.cancelAgent(agentId);
    }

    // Remove from queue
    this.queue.items = this.queue.items.filter(item => item.agentId !== agentId);

    // Clean up orchestrator
    this.orchestrators.delete(agentId);
    this.executionOptions.delete(agentId);

    const deleted = this.agents.delete(agentId);
    this.emitQueueUpdated();
    return deleted;
  }

  /**
   * Add log entry to agent
   */
  private addLog(
    agent: BackgroundAgent,
    level: BackgroundAgentLog['level'],
    message: string,
    source: BackgroundAgentLog['source'],
    sourceId?: string,
    data?: unknown,
    stepNumber?: number
  ): BackgroundAgentLog {
    const log: BackgroundAgentLog = {
      id: nanoid(),
      timestamp: new Date(),
      level,
      message,
      source,
      sourceId,
      data,
      stepNumber,
    };
    agent.logs.push(log);
    agent.executionState.lastActivity = new Date();

    // Emit log event
    this.emitEvent('agent:log', { agent, log });

    // Notify via callback
    const options = this.executionOptions.get(agent.id);
    options?.onLog?.(agent, log);

    return log;
  }

  /**
   * Add notification to agent
   */
  private addNotification(
    agent: BackgroundAgent,
    type: BackgroundAgentNotification['type'],
    title: string,
    message: string,
    data?: unknown,
    actions?: BackgroundAgentNotification['actions']
  ): BackgroundAgentNotification {
    const notification: BackgroundAgentNotification = {
      id: nanoid(),
      agentId: agent.id,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      data,
      actions,
    };
    agent.notifications.push(notification);

    // Emit notification event
    this.emitEvent('agent:notification', { agent, notification });

    // Notify via callback
    const options = this.executionOptions.get(agent.id);
    options?.onNotification?.(agent, notification);

    return notification;
  }

  /**
   * Add step to agent
   */
  private addStep(
    agent: BackgroundAgent,
    type: BackgroundAgentStep['type'],
    title: string,
    description?: string
  ): BackgroundAgentStep {
    const step: BackgroundAgentStep = {
      id: nanoid(),
      stepNumber: agent.steps.length + 1,
      type,
      status: 'pending',
      title,
      description,
    };
    agent.steps.push(step);
    agent.executionState.totalSteps = agent.steps.length;

    return step;
  }

  /**
   * Update step status
   */
  private updateStep(
    agent: BackgroundAgent,
    stepId: string,
    updates: Partial<BackgroundAgentStep>
  ): void {
    const step = agent.steps.find(s => s.id === stepId);
    if (step) {
      Object.assign(step, updates);
      if (updates.status === 'running') {
        step.startedAt = new Date();
        agent.executionState.currentStep = step.stepNumber;
      }
      if (updates.status === 'completed' || updates.status === 'failed') {
        step.completedAt = new Date();
        if (step.startedAt) {
          step.duration = step.completedAt.getTime() - step.startedAt.getTime();
        }
      }
    }
  }

  /**
   * Queue an agent for execution
   */
  queueAgent(agentId: string, options: BackgroundAgentExecutionOptions = {}): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    if (agent.status === 'running' || agent.status === 'cancelled') return false;

    agent.status = 'queued';
    agent.queuedAt = agent.queuedAt || new Date();
    this.executionOptions.set(agentId, options);

    // Add to queue with priority (skip duplicates)
    const alreadyQueued = this.queue.items.some((item) => item.agentId === agentId);
    if (!alreadyQueued) {
      this.queue.items.push({
        agentId,
        priority: agent.priority,
        queuedAt: new Date(),
      });
    }

    // Sort queue by priority (lower number = higher priority)
    this.queue.items.sort((a, b) => a.priority - b.priority);

    this.addLog(agent, 'info', 'Agent queued for execution', 'system');
    
    // Emit queued event with position
    const position = this.queue.items.findIndex(item => item.agentId === agentId) + 1;
    this.emitEvent('agent:queued', { agent, position });
    this.emitQueueUpdated();

    // Try to start execution
    this.processQueue();

    return true;
  }

  /**
   * Process the execution queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.isPaused) return;

    while (
      this.queue.currentlyRunning < this.queue.maxConcurrent &&
      this.queue.items.length > 0
    ) {
      const item = this.queue.items.shift();
      if (!item) break;

      const agent = this.agents.get(item.agentId);
      if (!agent || agent.status !== 'queued') continue;

      this.queue.currentlyRunning++;
      this.emitQueueUpdated();
      this.executeAgentInternal(agent).finally(() => {
        this.queue.currentlyRunning = Math.max(0, this.queue.currentlyRunning - 1);
        this.emitQueueUpdated();
        this.processQueue();
      });
    }
  }

  /**
   * Execute a background agent
   */
  private async executeAgentInternal(agent: BackgroundAgent): Promise<void> {
    const startTime = Date.now();
    const options = this.executionOptions.get(agent.id) || {};

    // Update status
    agent.status = 'running';
    agent.startedAt = new Date();
    agent.executionState.currentPhase = 'planning';
    agent.progress = 0;

    // Set up timeout
    this.setupTimeout(agent);
    this.updateActivityTime(agent.id);

    this.addLog(agent, 'info', 'Starting background agent execution', 'system');
    this.emitEvent('agent:started', { agent });
    options.onStart?.(agent);

    if (agent.config.notifyOnProgress) {
      this.addNotification(agent, 'started', 'Agent Started', `${agent.name} has started executing.`);
    }

    try {
      // Build enhanced tools with Skills, RAG, and MCP integration
      const enhancedTools = await this.buildEnhancedTools(agent, options);
      
      // Build enhanced system prompt with Skills
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(agent, options);
      const selectedProvider = (agent.config.provider || 'openai') as ProviderName;
      const providerApiKey = this.apiKeyProvider?.(selectedProvider) || '';

      // Create orchestrator
      const orchestratorConfig: OrchestratorConfig = {
        provider: selectedProvider,
        model: agent.config.model || 'gpt-4o',
        apiKey: providerApiKey,
        baseURL: undefined,
        systemPrompt: enhancedSystemPrompt,
        temperature: agent.config.temperature,
        maxSteps: agent.config.maxSteps,
        maxConcurrentSubAgents: agent.config.maxConcurrentSubAgents,
        tools: { ...agent.config.customTools, ...enhancedTools },
        enableAutoPlanning: agent.config.enablePlanning,
        enableDynamicSubAgents: true,
      };

      const orchestrator = new AgentOrchestrator(orchestratorConfig);
      this.orchestrators.set(agent.id, orchestrator);

      // Execute with orchestrator
      const result = await orchestrator.execute(agent.task, {
        onPlanGenerated: (plan) => {
          agent.executionState.currentPhase = 'executing';
          this.addLog(agent, 'info', `Plan generated with ${plan.subAgents.length} sub-agents`, 'agent');
          
          const step = this.addStep(agent, 'thinking', 'Planning', plan.reasoning);
          this.updateStep(agent, step.id, { status: 'completed', response: plan.reasoning });
        },
        onSubAgentCreate: (subAgent) => {
          agent.subAgents.push(subAgent);
          this.addLog(agent, 'info', `Sub-agent created: ${subAgent.name}`, 'sub-agent', subAgent.id);
          this.emitEvent('subagent:created', { agent, subAgent });
          options.onSubAgentCreate?.(agent, subAgent);
        },
        onSubAgentStart: (subAgent) => {
          agent.executionState.activeSubAgents.push(subAgent.id);
          const step = this.addStep(agent, 'sub_agent', subAgent.name, subAgent.description);
          this.updateStep(agent, step.id, { status: 'running', subAgentId: subAgent.id });
          this.updateActivityTime(agent.id);
          this.emitEvent('subagent:started', { agent, subAgent });
        },
        onSubAgentComplete: (subAgent, subResult) => {
          agent.executionState.activeSubAgents = agent.executionState.activeSubAgents.filter(id => id !== subAgent.id);
          agent.executionState.completedSubAgents.push(subAgent.id);
          
          const step = agent.steps.find(s => s.subAgentId === subAgent.id);
          if (step) {
            this.updateStep(agent, step.id, { 
              status: 'completed', 
              response: subResult.finalResponse,
              output: subResult.output,
            });
          }

          // Update activity time
          this.updateActivityTime(agent.id);

          // Update progress
          const total = agent.subAgents.length;
          const completed = agent.executionState.completedSubAgents.length;
          agent.progress = Math.round((completed / total) * 90);
          this.emitEvent('agent:progress', { agent, progress: agent.progress, phase: 'executing' });
          this.emitEvent('subagent:completed', { agent, subAgent, result: subResult });
          options.onProgress?.(agent, agent.progress);
          options.onSubAgentComplete?.(agent, subAgent, subResult);
        },
        onSubAgentError: (subAgent, error) => {
          agent.executionState.activeSubAgents = agent.executionState.activeSubAgents.filter(id => id !== subAgent.id);
          agent.executionState.failedSubAgents.push(subAgent.id);
          
          const step = agent.steps.find(s => s.subAgentId === subAgent.id);
          if (step) {
            this.updateStep(agent, step.id, { status: 'failed', error });
          }

          this.updateActivityTime(agent.id);
          this.addLog(agent, 'error', `Sub-agent failed: ${error}`, 'sub-agent', subAgent.id);
          this.emitEvent('subagent:failed', { agent, subAgent, error });
        },
        onToolCall: (toolCall) => {
          this.updateActivityTime(agent.id);
          this.addLog(agent, 'info', `Tool call: ${toolCall.name}`, 'tool', toolCall.id);
          this.emitEvent('tool:called', { agent, toolCall });
          options.onToolCall?.(agent, toolCall);
        },
        onToolResult: (toolCall) => {
          this.updateActivityTime(agent.id);
          this.addLog(agent, 'info', `Tool result: ${toolCall.name}`, 'tool', toolCall.id);
          this.emitEvent('tool:result', { agent, toolCall });
          options.onToolResult?.(agent, toolCall);
        },
        onProgress: (progress) => {
          agent.executionState.currentPhase = progress.phase === 'completed' ? 'completed' : 'executing';
          this.updateActivityTime(agent.id);
          this.emitEvent('agent:progress', {
            agent,
            progress: progress.progress,
            phase: progress.phase,
          });
          options.onProgress?.(agent, progress.progress);
        },
      });

      // Agent may have been paused/cancelled/timed out while orchestrator was unwinding
      if (isInterruptedStatus(agent.status)) {
        return;
      }

      // Process result
      const agentResult: BackgroundAgentResult = {
        success: result.success,
        finalResponse: result.finalResponse,
        steps: agent.steps,
        totalSteps: agent.steps.length,
        duration: Date.now() - startTime,
        subAgentResults: result.subAgentResults,
        toolResults: [],
        output: { response: result.finalResponse },
        tokenUsage: result.tokenUsage,
        retryCount: agent.retryCount,
        error: result.error,
      };

      agent.result = agentResult;
      agent.status = result.success ? 'completed' : 'failed';
      agent.completedAt = new Date();
      agent.progress = 100;
      agent.executionState.currentPhase = 'completed';

      if (result.success) {
        this.addLog(agent, 'info', 'Background agent completed successfully', 'system');
        if (agent.config.notifyOnComplete) {
          this.addNotification(agent, 'completed', 'Agent Completed', `${agent.name} has completed successfully.`);
        }
        this.emitEvent('agent:completed', { agent, result: agentResult });
        options.onComplete?.(agent, agentResult);
      } else {
        agent.error = result.error;
        this.addLog(agent, 'error', `Background agent failed: ${result.error}`, 'system');
        if (agent.config.notifyOnError) {
          this.addNotification(agent, 'failed', 'Agent Failed', `${agent.name} failed: ${result.error}`);
        }
        this.emitEvent('agent:failed', { agent, error: result.error || 'Unknown error' });
        options.onError?.(agent, result.error || 'Unknown error');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Background agent execution failed';

      // Interruption statuses are handled by their dedicated flow
      if (isInterruptedStatus(agent.status)) {
        return;
      }
      
      // Check for retry
      if (agent.config.autoRetry && agent.retryCount < agent.config.maxRetries) {
        agent.retryCount++;
        agent.status = 'queued';
        
        const retryDelay = agent.config.retryDelay * Math.pow(2, agent.retryCount - 1);
        this.addLog(agent, 'warn', `Retrying (attempt ${agent.retryCount}/${agent.config.maxRetries}) after ${retryDelay}ms`, 'system');
        
        setTimeout(() => {
          this.queueAgent(agent.id, options);
        }, retryDelay);
        
        return;
      }

      agent.status = 'failed';
      agent.completedAt = new Date();
      agent.error = errorMessage;
      agent.result = {
        success: false,
        finalResponse: '',
        steps: agent.steps,
        totalSteps: agent.steps.length,
        duration: Date.now() - startTime,
        retryCount: agent.retryCount,
        error: errorMessage,
      };

      this.addLog(agent, 'error', `Background agent failed: ${errorMessage}`, 'system');
      if (agent.config.notifyOnError) {
        this.addNotification(agent, 'failed', 'Agent Failed', `${agent.name} failed: ${errorMessage}`);
      }
      options.onError?.(agent, errorMessage);
    } finally {
      // Clear timeout
      this.clearTimeout(agent.id);

      // Persist state if configured
      if (agent.config.persistState) {
        this.persistState();
      }

      // Clean up resources
      this.cleanupAgent(agent.id);
    }
  }

  /**
   * Start a background agent immediately
   */
  async startAgent(agentId: string, options: BackgroundAgentExecutionOptions = {}): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent || (agent.status !== 'idle' && agent.status !== 'queued')) return false;

    this.executionOptions.set(agentId, options);
    
    // Remove from queue if present
    this.queue.items = this.queue.items.filter(item => item.agentId !== agentId);

    // Execute directly
    this.queue.currentlyRunning++;
    this.emitQueueUpdated();
    this.executeAgentInternal(agent).finally(() => {
      this.queue.currentlyRunning = Math.max(0, this.queue.currentlyRunning - 1);
      this.emitQueueUpdated();
      this.processQueue();
    });

    return true;
  }

  /**
   * Delegate a background agent's task to an AgentTeam via the bridge
   * Useful for complex tasks that benefit from multi-agent decomposition
   */
  async delegateToTeam(
    agentId: string,
    options: {
      teamName?: string;
      teamDescription?: string;
      teamConfig?: Record<string, unknown>;
      templateId?: string;
    } = {}
  ): Promise<string | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const bridge = getAgentBridge();

    this.addLog(agent, 'info', 'Delegating task to AgentTeam', 'system');

    try {
      const delegation = await bridge.delegateToTeam({
        task: agent.task,
        teamName: options.teamName || `Team for: ${agent.name}`,
        teamDescription: options.teamDescription || agent.description,
        teamConfig: options.teamConfig as Record<string, unknown> | undefined,
        templateId: options.templateId || agent.config.teamTemplateId,
        sourceType: 'background',
        sourceId: agentId,
        sessionId: agent.sessionId,
        metadata: {
          backgroundAgentId: agentId,
          ...agent.metadata,
        },
      });

      if (delegation.status === 'completed' && delegation.result) {
        // Update the background agent with the team's result
        agent.result = {
          success: true,
          finalResponse: delegation.result,
          steps: agent.steps,
          totalSteps: agent.steps.length,
          duration: agent.startedAt ? Date.now() - agent.startedAt.getTime() : 0,
          retryCount: agent.retryCount,
        };
        agent.status = 'completed';
        agent.completedAt = new Date();

        this.addLog(agent, 'info', 'Task completed via team delegation', 'system');
        this.emitEvent('agent:completed', { agent, result: agent.result });

        if (agent.config.notifyOnComplete) {
          this.addNotification(agent, 'completed', 'Task Completed', 'Task was completed via team delegation');
        }
      } else if (delegation.status === 'failed') {
        this.addLog(agent, 'error', `Team delegation failed: ${delegation.error}`, 'system');
      }

      return delegation.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Team delegation failed';
      this.addLog(agent, 'error', errorMessage, 'system');
      return null;
    }
  }

  /**
   * Pause a running agent with checkpoint
   */
  pauseAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'running') return false;

    // Create checkpoint before pausing
    const checkpoint = this.createCheckpoint(agent);

    agent.status = 'paused';
    agent.executionState.pausedAt = new Date();
    
    // Clear timeout
    this.clearTimeout(agentId);
    
    // Cancel orchestrator
    const orchestrator = this.orchestrators.get(agentId);
    if (orchestrator) {
      orchestrator.cancel();
    }

    this.addLog(agent, 'info', 'Agent paused with checkpoint', 'system');
    this.emitEvent('agent:paused', { agent, checkpoint });
    
    const options = this.executionOptions.get(agentId);
    options?.onPause?.(agent);

    return true;
  }

  /**
   * Resume a paused agent from checkpoint
   */
  resumeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'paused') return false;

    const checkpoint = this.getCheckpoint(agentId);
    const hasCheckpoint = !!checkpoint;

    agent.status = 'queued';
    agent.executionState.resumedAt = new Date();
    
    this.addLog(agent, 'info', `Agent resumed ${hasCheckpoint ? 'from checkpoint' : 'without checkpoint'}`, 'system');
    this.emitEvent('agent:resumed', { agent, fromCheckpoint: hasCheckpoint });
    
    const options = this.executionOptions.get(agentId);
    options?.onResume?.(agent);

    // Add to queue with high priority
    this.queue.items = this.queue.items.filter(item => item.agentId !== agentId);
    this.queue.items.unshift({
      agentId,
      priority: Math.max(0, agent.priority - 1), // Boost priority for resumed agents
      queuedAt: new Date(),
    });

    // Emit queue update
    this.emitQueueUpdated();

    // Try to process immediately
    this.processQueue();

    return true;
  }

  /**
   * Cancel a running or queued agent
   */
  cancelAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const wasRunning = agent.status === 'running';

    if (agent.status === 'queued') {
      this.queue.items = this.queue.items.filter(item => item.agentId !== agentId);
    }

    if (wasRunning) {
      const orchestrator = this.orchestrators.get(agentId);
      if (orchestrator) {
        orchestrator.cancel();
      }
    }

    agent.status = 'cancelled';
    agent.completedAt = new Date();
    
    // Clear timeout and checkpoint
    this.clearTimeout(agentId);
    this.clearCheckpoint(agentId);
    
    this.addLog(agent, 'info', 'Agent cancelled', 'system');
    this.emitEvent('agent:cancelled', { agent });
    
    const options = this.executionOptions.get(agentId);
    options?.onCancel?.(agent);

    // Clean up resources
    this.cleanupAgent(agentId);

    // Process next in queue if we freed a slot
    if (wasRunning) {
      this.processQueue();
    }

    this.emitQueueUpdated();

    return true;
  }

  /**
   * Cancel all active or queued agents
   */
  cancelAllAgents(): number {
    const cancellable = Array.from(this.agents.values())
      .filter((agent) => agent.status === 'running' || agent.status === 'queued' || agent.status === 'paused')
      .map((agent) => agent.id);

    cancellable.forEach((agentId) => {
      this.cancelAgent(agentId);
    });

    this.emitQueueUpdated();
    return cancellable.length;
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): BackgroundAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BackgroundAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by session
   */
  getAgentsBySession(sessionId: string): BackgroundAgent[] {
    return Array.from(this.agents.values()).filter(a => a.sessionId === sessionId);
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: BackgroundAgentStatus): BackgroundAgent[] {
    return Array.from(this.agents.values()).filter(a => a.status === status);
  }

  /**
   * Get running agents
   */
  getRunningAgents(): BackgroundAgent[] {
    return this.getAgentsByStatus('running');
  }

  /**
   * Get queue state
   */
  getQueueState(): BackgroundAgentQueueState {
    return this.cloneQueueState();
  }

  /**
   * Pause the queue
   */
  pauseQueue(): void {
    this.queue.isPaused = true;
    this.emitEvent('queue:paused', {});
    this.emitQueueUpdated();
  }

  /**
   * Resume the queue
   */
  resumeQueue(): void {
    this.queue.isPaused = false;
    this.emitEvent('queue:resumed', {});
    this.emitQueueUpdated();
    this.processQueue();
  }

  /**
   * Clear completed agents
   */
  clearCompleted(): void {
    const completedIds = Array.from(this.agents.values())
      .filter(a => a.status === 'completed' || a.status === 'failed' || a.status === 'cancelled')
      .map(a => a.id);

    completedIds.forEach(id => this.agents.delete(id));
    this.queue.items = this.queue.items.filter((item) => !completedIds.includes(item.agentId));
    this.emitQueueUpdated();
  }

  /**
   * Get unread notification count
   */
  getUnreadNotificationCount(): number {
    return Array.from(this.agents.values())
      .flatMap(a => a.notifications)
      .filter(n => !n.read)
      .length;
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(agentId: string, notificationId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const notification = agent.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emitEvent('agent:notification', { agent, notification });
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead(agentId?: string): void {
    if (agentId) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.notifications.forEach((n) => {
          if (!n.read) {
            n.read = true;
            this.emitEvent('agent:notification', { agent, notification: n });
          }
        });
      }
    } else {
      this.agents.forEach((agent) => {
        agent.notifications.forEach((n) => {
          if (!n.read) {
            n.read = true;
            this.emitEvent('agent:notification', { agent, notification: n });
          }
        });
      });
    }
  }

  /**
   * Persist state to storage
   */
  persistState(): void {
    try {
      const agents = Array.from(this.agents.values())
        .filter(a => a.config.persistState)
        .map(serializeBackgroundAgent);
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.persistenceKey, JSON.stringify(agents));
      }
    } catch (error) {
      log.error('Failed to persist background agent state', error as Error);
    }
  }

  /**
   * Restore state from storage
   */
  restoreState(): void {
    try {
      if (typeof localStorage === 'undefined') return;

      const stored = localStorage.getItem(this.persistenceKey);
      if (!stored) return;

      const agents = JSON.parse(stored) as string[];
      const restorableStatuses = new Set<BackgroundAgentStatus>([
        'running',
        'queued',
        'paused',
        'completed',
        'failed',
        'cancelled',
        'timeout',
      ]);

      this.queue.items = [];
      this.queue.currentlyRunning = 0;

      agents.forEach(data => {
        try {
          const agent = deserializeBackgroundAgent(data);
          if (!restorableStatuses.has(agent.status)) return;

          this.hydrateAgent(agent, {
            normalizeRunningToQueued: agent.status === 'running',
          });
        } catch {
          // Skip invalid entries
        }
      });
      this.processQueue();
    } catch (error) {
      log.error('Failed to restore background agent state', error as Error);
    }
  }

  /**
   * Clear persisted state
   */
  clearPersistedState(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.persistenceKey);
    }
  }

  /**
   * Get execution statistics for an agent
   */
  getExecutionStatistics(agentId: string): {
    agentId: string;
    totalDuration: number;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalSubAgents: number;
    completedSubAgents: number;
    failedSubAgents: number;
    totalToolCalls: number;
    retryCount: number;
    averageStepDuration: number;
    tokenUsage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  } | undefined {
    const agent = this.agents.get(agentId);
    if (!agent) return undefined;

    const completedSteps = agent.steps.filter(s => s.status === 'completed').length;
    const failedSteps = agent.steps.filter(s => s.status === 'failed').length;
    const totalDuration = agent.result?.duration ?? 
      (agent.startedAt ? Date.now() - agent.startedAt.getTime() : 0);
    
    const stepDurations = agent.steps
      .filter(s => s.duration)
      .map(s => s.duration!);
    const averageStepDuration = stepDurations.length > 0
      ? stepDurations.reduce((a, b) => a + b, 0) / stepDurations.length
      : 0;

    // Count tool calls from logs
    const toolCalls = agent.logs.filter(l => l.source === 'tool' && l.message.startsWith('Tool call:')).length;

    return {
      agentId: agent.id,
      totalDuration,
      totalSteps: agent.steps.length,
      completedSteps,
      failedSteps,
      totalSubAgents: agent.subAgents.length,
      completedSubAgents: agent.executionState.completedSubAgents.length,
      failedSubAgents: agent.executionState.failedSubAgents.length,
      totalToolCalls: toolCalls,
      retryCount: agent.retryCount,
      averageStepDuration,
      tokenUsage: agent.result?.tokenUsage,
    };
  }

  /**
   * Gracefully shutdown the manager
   * 
   * This method:
   * 1. Pauses queue processing
   * 2. Creates checkpoints for running agents
   * 3. Waits for graceful completion or timeout
   * 4. Persists state
   * 
   * @param options Shutdown options
   * @returns Promise that resolves when shutdown is complete
   */
  async shutdown(options: {
    /** Maximum time to wait for agents to complete in ms (default: 30000) */
    timeoutMs?: number;
    /** Force cancel running agents after timeout (default: true) */
    forceCancel?: boolean;
    /** Save checkpoints for running agents (default: true) */
    saveCheckpoints?: boolean;
  } = {}): Promise<{
    success: boolean;
    completedAgents: string[];
    cancelledAgents: string[];
    savedCheckpoints: string[];
    duration: number;
  }> {
    const {
      timeoutMs = 30000,
      forceCancel = true,
      saveCheckpoints = true,
    } = options;

    const startTime = Date.now();
    const completedAgents: string[] = [];
    const cancelledAgents: string[] = [];
    const savedCheckpoints: string[] = [];

    // 1. Pause queue processing
    this.pauseQueue();
    this.stopHealthCheck();

    // 2. Get running agents
    const runningAgents = this.getRunningAgents();

    // 3. Create checkpoints for running agents if requested
    if (saveCheckpoints) {
      for (const agent of runningAgents) {
        try {
          this.createCheckpoint(agent);
          savedCheckpoints.push(agent.id);
        } catch (error) {
          log.warn(`Failed to create checkpoint for agent ${agent.id}`, { agentId: agent.id, error: String(error) });
        }
      }
    }

    // 4. Wait for agents to complete or timeout
    const waitPromises = runningAgents.map(async (agent) => {
      return new Promise<void>((resolve) => {
        const checkCompletion = () => {
          const currentAgent = this.getAgent(agent.id);
          if (!currentAgent || 
              currentAgent.status === 'completed' || 
              currentAgent.status === 'failed' ||
              currentAgent.status === 'cancelled') {
            completedAgents.push(agent.id);
            resolve();
            return true;
          }
          return false;
        };

        // Check immediately
        if (checkCompletion()) return;

        // Set up interval to check periodically
        const interval = setInterval(() => {
          if (checkCompletion()) {
            clearInterval(interval);
          }
        }, 500);

        // Set up timeout
        setTimeout(() => {
          clearInterval(interval);
          resolve(); // Resolve anyway after timeout
        }, timeoutMs);
      });
    });

    await Promise.all(waitPromises);

    // 5. Force cancel remaining running agents if requested
    if (forceCancel) {
      const stillRunning = this.getRunningAgents();
      for (const agent of stillRunning) {
        this.cancelAgent(agent.id);
        cancelledAgents.push(agent.id);
      }
    }

    // 6. Persist state
    this.persistState();

    // 7. Emit shutdown event
    this.emitEvent('manager:shutdown', {
      completedAgents,
      cancelledAgents,
      savedCheckpoints,
      duration: Date.now() - startTime,
    });

    return {
      success: true,
      completedAgents,
      cancelledAgents,
      savedCheckpoints,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get aggregated statistics for all agents
   */
  getAggregatedStatistics(): {
    totalAgents: number;
    runningAgents: number;
    queuedAgents: number;
    completedAgents: number;
    failedAgents: number;
    pausedAgents: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    totalRetries: number;
    successRate: number;
  } {
    const agents = Array.from(this.agents.values());
    const completed = agents.filter(a => a.status === 'completed');
    const failed = agents.filter(a => a.status === 'failed');
    const running = agents.filter(a => a.status === 'running');
    const queued = agents.filter(a => a.status === 'queued');
    const paused = agents.filter(a => a.status === 'paused');

    const executionTimes = agents
      .filter(a => a.result?.duration)
      .map(a => a.result!.duration);
    const totalExecutionTime = executionTimes.reduce((a, b) => a + b, 0);
    const averageExecutionTime = executionTimes.length > 0
      ? totalExecutionTime / executionTimes.length
      : 0;

    const totalRetries = agents.reduce((sum, a) => sum + a.retryCount, 0);
    const finishedCount = completed.length + failed.length;
    const successRate = finishedCount > 0
      ? (completed.length / finishedCount) * 100
      : 0;

    return {
      totalAgents: agents.length,
      runningAgents: running.length,
      queuedAgents: queued.length,
      completedAgents: completed.length,
      failedAgents: failed.length,
      pausedAgents: paused.length,
      totalExecutionTime,
      averageExecutionTime,
      totalRetries,
      successRate,
    };
  }
}

/**
 * Create a background agent manager instance
 */
export function createBackgroundAgentManager(maxConcurrent: number = 3): BackgroundAgentManager {
  return new BackgroundAgentManager(maxConcurrent);
}

/**
 * Global background agent manager instance
 */
let globalManager: BackgroundAgentManager | null = null;

/**
 * Get the global background agent manager
 */
export function getBackgroundAgentManager(): BackgroundAgentManager {
  if (!globalManager) {
    globalManager = new BackgroundAgentManager(3);
  }
  return globalManager;
}

/**
 * Set the global background agent manager
 */
export function setBackgroundAgentManager(manager: BackgroundAgentManager): void {
  globalManager = manager;
}
