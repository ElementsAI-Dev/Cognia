/**
 * Background Agent Manager - Manage agents running in the background
 * 
 * Features:
 * - Queue management for background agents
 * - Priority-based scheduling
 * - Pause/Resume/Cancel operations
 * - State persistence and recovery
 * - Notification system
 */

import { nanoid } from 'nanoid';
import type { ProviderName } from '../client';
import {
  AgentOrchestrator,
  type OrchestratorConfig,
} from './agent-orchestrator';
import { createMcpToolsFromStore } from './mcp-tools';
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
} from '@/types/background-agent';
import type { AgentTool } from './agent-executor';
import type { Skill } from '@/types/skill';
import { createSkillTools, buildMultiSkillSystemPrompt } from '@/lib/skills/executor';
import type { McpServerState, ToolCallResult } from '@/types/mcp';

/**
 * Background Agent Manager class
 */
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

  // External dependencies for Skills, RAG, and MCP integration
  private skillsProvider?: () => { skills: Record<string, Skill>; activeSkillIds: string[] };
  private mcpProvider?: () => { servers: McpServerState[]; callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult> };
  private vectorSettingsProvider?: () => { mode: 'embedded' | 'server'; serverUrl: string; embeddingProvider: string; embeddingModel: string };
  private apiKeyProvider?: (provider: string) => string;

  constructor(maxConcurrent: number = 3) {
    this.queue.maxConcurrent = maxConcurrent;
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
      id: nanoid(),
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

    return agent;
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

    return this.agents.delete(agentId);
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
    if (!agent || agent.status !== 'idle') return false;

    agent.status = 'queued';
    agent.queuedAt = new Date();
    this.executionOptions.set(agentId, options);

    // Add to queue with priority
    this.queue.items.push({
      agentId,
      priority: agent.priority,
      queuedAt: new Date(),
    });

    // Sort queue by priority (lower number = higher priority)
    this.queue.items.sort((a, b) => a.priority - b.priority);

    this.addLog(agent, 'info', 'Agent queued for execution', 'system');

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
      this.executeAgentInternal(agent).finally(() => {
        this.queue.currentlyRunning--;
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

    this.addLog(agent, 'info', 'Starting background agent execution', 'system');
    options.onStart?.(agent);

    if (agent.config.notifyOnProgress) {
      this.addNotification(agent, 'started', 'Agent Started', `${agent.name} has started executing.`);
    }

    try {
      // Build enhanced tools with Skills, RAG, and MCP integration
      const enhancedTools = await this.buildEnhancedTools(agent, options);
      
      // Build enhanced system prompt with Skills
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(agent, options);

      // Create orchestrator
      const orchestratorConfig: OrchestratorConfig = {
        provider: (agent.config.provider || 'openai') as ProviderName,
        model: agent.config.model || 'gpt-4o',
        apiKey: '', // Will be set from settings
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
          options.onSubAgentCreate?.(agent, subAgent);
        },
        onSubAgentStart: (subAgent) => {
          agent.executionState.activeSubAgents.push(subAgent.id);
          const step = this.addStep(agent, 'sub_agent', subAgent.name, subAgent.description);
          this.updateStep(agent, step.id, { status: 'running', subAgentId: subAgent.id });
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

          // Update progress
          const total = agent.subAgents.length;
          const completed = agent.executionState.completedSubAgents.length;
          agent.progress = Math.round((completed / total) * 90);
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

          this.addLog(agent, 'error', `Sub-agent failed: ${error}`, 'sub-agent', subAgent.id);
        },
        onToolCall: (toolCall) => {
          this.addLog(agent, 'info', `Tool call: ${toolCall.name}`, 'tool', toolCall.id);
          options.onToolCall?.(agent, toolCall);
        },
        onToolResult: (toolCall) => {
          this.addLog(agent, 'info', `Tool result: ${toolCall.name}`, 'tool', toolCall.id);
          options.onToolResult?.(agent, toolCall);
        },
        onProgress: (progress) => {
          agent.executionState.currentPhase = progress.phase === 'completed' ? 'completed' : 'executing';
          options.onProgress?.(agent, progress.progress);
        },
      });

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
        options.onComplete?.(agent, agentResult);
      } else {
        agent.error = result.error;
        this.addLog(agent, 'error', `Background agent failed: ${result.error}`, 'system');
        if (agent.config.notifyOnError) {
          this.addNotification(agent, 'failed', 'Agent Failed', `${agent.name} failed: ${result.error}`);
        }
        options.onError?.(agent, result.error || 'Unknown error');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Background agent execution failed';
      
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
      // Persist state if configured
      if (agent.config.persistState) {
        this.persistState();
      }

      // Clean up orchestrator
      this.orchestrators.delete(agent.id);
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
    this.executeAgentInternal(agent).finally(() => {
      this.queue.currentlyRunning--;
      this.processQueue();
    });

    return true;
  }

  /**
   * Pause a running agent
   */
  pauseAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'running') return false;

    agent.status = 'paused';
    agent.executionState.pausedAt = new Date();
    
    // Pause orchestrator
    const orchestrator = this.orchestrators.get(agentId);
    if (orchestrator) {
      orchestrator.cancel();
    }

    this.addLog(agent, 'info', 'Agent paused', 'system');
    const options = this.executionOptions.get(agentId);
    options?.onPause?.(agent);

    return true;
  }

  /**
   * Resume a paused agent
   */
  resumeAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'paused') return false;

    agent.status = 'queued';
    agent.executionState.resumedAt = new Date();
    
    this.addLog(agent, 'info', 'Agent resumed', 'system');
    const options = this.executionOptions.get(agentId);
    options?.onResume?.(agent);

    // Re-queue for execution
    this.queueAgent(agentId, options || {});

    return true;
  }

  /**
   * Cancel a running or queued agent
   */
  cancelAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    if (agent.status === 'queued') {
      this.queue.items = this.queue.items.filter(item => item.agentId !== agentId);
    }

    if (agent.status === 'running') {
      const orchestrator = this.orchestrators.get(agentId);
      if (orchestrator) {
        orchestrator.cancel();
      }
      this.queue.currentlyRunning--;
    }

    agent.status = 'cancelled';
    agent.completedAt = new Date();
    
    this.addLog(agent, 'info', 'Agent cancelled', 'system');
    const options = this.executionOptions.get(agentId);
    options?.onCancel?.(agent);

    return true;
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
    return { ...this.queue };
  }

  /**
   * Pause the queue
   */
  pauseQueue(): void {
    this.queue.isPaused = true;
  }

  /**
   * Resume the queue
   */
  resumeQueue(): void {
    this.queue.isPaused = false;
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
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsRead(agentId?: string): void {
    if (agentId) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.notifications.forEach(n => n.read = true);
      }
    } else {
      this.agents.forEach(agent => {
        agent.notifications.forEach(n => n.read = true);
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
      console.error('Failed to persist background agent state:', error);
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
      agents.forEach(data => {
        try {
          const agent = deserializeBackgroundAgent(data);
          // Only restore agents that were running or queued
          if (agent.status === 'running' || agent.status === 'queued') {
            agent.status = 'queued';
            this.agents.set(agent.id, agent);
          } else if (agent.status === 'completed' || agent.status === 'failed') {
            this.agents.set(agent.id, agent);
          }
        } catch {
          // Skip invalid entries
        }
      });
    } catch (error) {
      console.error('Failed to restore background agent state:', error);
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
