/**
 * External Agent Manager
 *
 * Centralized manager for all external agent connections and interactions.
 * Handles agent lifecycle, routing, and coordination.
 */

import type {
  ExternalAgentConfig,
  ExternalAgentSession,
  ExternalAgentMessage,
  ExternalAgentEvent,
  ExternalAgentResult,
  ExternalAgentExecutionOptions,
  ExternalAgentInstance,
  ExternalAgentDelegationRule,
  ExternalAgentDelegationResult,
  ExternalAgentConnectionStatus,
  AcpCapabilities,
  AcpToolInfo,
  AcpPermissionMode,
  AcpPermissionResponse,
  AcpAuthMethod,
  AcpSessionModelState,
  AcpConfigOption,
} from '@/types/agent/external-agent';
import type { AgentTool } from '@/lib/ai/agent';
import {
  type ProtocolAdapter,
  protocolAdapterRegistry,
  type SessionCreateOptions,
} from './protocol-adapter';
import { AcpClientAdapter } from './acp-client';
import { acpToolsToAgentTools } from './translators';
import { createExternalAgentTraceBridge } from './agent-trace-bridge';

// ============================================================================
// External Agent Manager
// ============================================================================

/**
 * Manager configuration
 */
export interface ExternalAgentManagerConfig {
  /** Maximum concurrent connections */
  maxConnections?: number;
  /** Health check interval (ms) */
  healthCheckInterval?: number;
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
  /** Enable connection pooling */
  connectionPooling?: boolean;
}

/**
 * Default manager configuration
 */
const DEFAULT_MANAGER_CONFIG: Required<ExternalAgentManagerConfig> = {
  maxConnections: 10,
  healthCheckInterval: 30000,
  autoReconnect: true,
  connectionPooling: true,
};

/**
 * External Agent Manager
 *
 * Singleton manager for all external agent connections.
 * Provides a unified interface for connecting to, managing, and executing on external agents.
 */
export class ExternalAgentManager {
  private static _instance: ExternalAgentManager | null = null;

  private config: Required<ExternalAgentManagerConfig>;
  private instances: Map<string, ExternalAgentInstance> = new Map();
  private adapters: Map<string, ProtocolAdapter> = new Map();
  private delegationRules: ExternalAgentDelegationRule[] = [];
  private healthCheckTimer?: ReturnType<typeof setInterval>;
  private eventListeners: Map<string, Set<(event: ExternalAgentEvent) => void>> = new Map();

  private constructor(config: ExternalAgentManagerConfig = {}) {
    this.config = { ...DEFAULT_MANAGER_CONFIG, ...config };

    // Register default protocol adapters
    this.registerDefaultAdapters();

    // Start health check if interval is set
    if (this.config.healthCheckInterval > 0) {
      this.startHealthCheck();
    }
  }

  // ==========================================================================
  // ACP-specific helpers (optional)
  // ==========================================================================

  async respondToPermission(
    agentId: string,
    sessionId: string,
    response: AcpPermissionResponse
  ): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (!adapter) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    await adapter.respondToPermission(sessionId, response);
  }

  async setSessionMode(agentId: string, sessionId: string, modeId: AcpPermissionMode): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.setSessionMode) {
      throw new Error('Agent does not support session mode changes');
    }
    await adapter.setSessionMode(sessionId, modeId);
  }

  async setSessionModel(agentId: string, sessionId: string, modelId: string): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.setSessionModel) {
      throw new Error('Agent does not support model selection');
    }
    await adapter.setSessionModel(sessionId, modelId);
  }

  getSessionModels(agentId: string, sessionId: string): AcpSessionModelState | undefined {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.getSessionModels) {
      return undefined;
    }
    return adapter.getSessionModels(sessionId);
  }

  /**
   * Set a session config option
   * @see https://agentclientprotocol.com/protocol/session-config-options
   */
  async setConfigOption(agentId: string, sessionId: string, configId: string, value: string): Promise<AcpConfigOption[]> {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.setConfigOption) {
      throw new Error('Agent does not support config options');
    }
    return adapter.setConfigOption(sessionId, configId, value);
  }

  /**
   * Get session config options
   * @see https://agentclientprotocol.com/protocol/session-config-options
   */
  getConfigOptions(agentId: string, sessionId: string): AcpConfigOption[] | undefined {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.getConfigOptions) {
      return undefined;
    }
    return adapter.getConfigOptions(sessionId);
  }

  async listSessions(agentId: string): Promise<Array<{ sessionId: string; title?: string; createdAt?: string; updatedAt?: string }>> {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.listSessions) {
      throw new Error('Agent does not support session listing');
    }
    return adapter.listSessions();
  }

  async forkSession(agentId: string, sessionId: string): Promise<ExternalAgentSession> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);
    if (!adapter?.forkSession || !instance) {
      throw new Error('Agent does not support session forking');
    }
    const forked = await adapter.forkSession(sessionId);
    instance.sessions.set(forked.id, forked);
    return forked;
  }

  async resumeSession(agentId: string, sessionId: string, options?: SessionCreateOptions): Promise<ExternalAgentSession> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);
    if (!adapter?.resumeSession || !instance) {
      throw new Error('Agent does not support session resume');
    }
    const resumed = await adapter.resumeSession(sessionId, options);
    instance.sessions.set(resumed.id, resumed);
    return resumed;
  }

  getAuthMethods(agentId: string): AcpAuthMethod[] {
    const adapter = this.adapters.get(agentId);
    return adapter?.getAuthMethods ? adapter.getAuthMethods() : [];
  }

  isAuthenticationRequired(agentId: string): boolean {
    const adapter = this.adapters.get(agentId);
    return adapter?.isAuthenticationRequired ? adapter.isAuthenticationRequired() : false;
  }

  async authenticate(agentId: string, methodId: string, credentials?: Record<string, unknown>): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (!adapter?.authenticate) {
      throw new Error('Agent does not support authentication');
    }
    await adapter.authenticate(methodId, credentials);
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ExternalAgentManagerConfig): ExternalAgentManager {
    if (!ExternalAgentManager._instance) {
      ExternalAgentManager._instance = new ExternalAgentManager(config);
    }
    return ExternalAgentManager._instance;
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (ExternalAgentManager._instance) {
      ExternalAgentManager._instance.dispose();
      ExternalAgentManager._instance = null;
    }
  }

  /**
   * Register default protocol adapters
   */
  private registerDefaultAdapters(): void {
    protocolAdapterRegistry.register('acp', () => new AcpClientAdapter());
    // Future: Register more adapters
    // protocolAdapterRegistry.register('a2a', () => new A2aClientAdapter());
    // protocolAdapterRegistry.register('http', () => new HttpClientAdapter());
  }

  // ============================================================================
  // Agent Lifecycle
  // ============================================================================

  /**
   * Add and connect to an external agent
   */
  async addAgent(config: ExternalAgentConfig): Promise<ExternalAgentInstance> {
    if (this.instances.has(config.id)) {
      throw new Error(`Agent already exists: ${config.id}`);
    }

    if (this.instances.size >= this.config.maxConnections) {
      throw new Error(`Maximum connections reached: ${this.config.maxConnections}`);
    }

    // Create adapter for the protocol
    const adapter = protocolAdapterRegistry.create(config.protocol);
    if (!adapter) {
      throw new Error(`Unsupported protocol: ${config.protocol}`);
    }

    // Create instance
    const instance: ExternalAgentInstance = {
      config,
      connectionStatus: 'disconnected',
      status: 'idle',
      sessions: new Map(),
      connectionAttempts: 0,
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalTokensUsed: 0,
        averageResponseTime: 0,
      },
    };

    this.instances.set(config.id, instance);
    this.adapters.set(config.id, adapter);

    // Connect if enabled
    if (config.enabled) {
      await this.connect(config.id);
    }

    console.log('[ExternalAgentManager] Added agent:', config.id, config.name);
    return instance;
  }

  /**
   * Remove an external agent
   */
  async removeAgent(agentId: string): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(agentId);
    }

    this.instances.delete(agentId);
    this.eventListeners.delete(agentId);

    console.log('[ExternalAgentManager] Removed agent:', agentId);
  }

  /**
   * Connect to an external agent
   */
  async connect(agentId: string): Promise<void> {
    const instance = this.instances.get(agentId);
    const adapter = this.adapters.get(agentId);

    if (!instance || !adapter) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    instance.connectionAttempts++;
    instance.lastConnectionAttempt = new Date();
    instance.connectionStatus = 'connecting';

    try {
      await adapter.connect(instance.config);
      instance.connectionStatus = 'connected';
      instance.capabilities = adapter.capabilities;
      instance.tools = adapter.tools;
      instance.status = 'ready';
      instance.lastError = undefined;

      console.log('[ExternalAgentManager] Connected to agent:', agentId);
    } catch (error) {
      instance.connectionStatus = 'error';
      instance.status = 'failed';
      instance.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * Disconnect from an external agent
   */
  async disconnect(agentId: string): Promise<void> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);

    if (adapter) {
      await adapter.disconnect();
    }

    if (instance) {
      instance.connectionStatus = 'disconnected';
      instance.status = 'idle';
      instance.sessions.clear();
    }

    console.log('[ExternalAgentManager] Disconnected from agent:', agentId);
  }

  /**
   * Reconnect to an external agent
   */
  async reconnect(agentId: string): Promise<void> {
    await this.disconnect(agentId);
    await this.connect(agentId);
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  private buildSessionOptions(options?: ExternalAgentExecutionOptions): SessionCreateOptions {
    const custom = options?.context?.custom as Record<string, unknown> | undefined;
    const mcpServers = Array.isArray(custom?.mcpServers)
      ? (custom?.mcpServers as SessionCreateOptions['mcpServers'])
      : undefined;
    return {
      systemPrompt: options?.systemPrompt,
      context: options?.context as Record<string, unknown> | undefined,
      permissionMode: options?.permissionMode,
      timeout: options?.timeout,
      mcpServers,
    };
  }

  private resolveTraceSessionId(options: ExternalAgentExecutionOptions | undefined, acpSessionId: string): string {
    const traceSessionId = options?.traceContext?.sessionId;
    if (typeof traceSessionId === 'string' && traceSessionId.trim().length > 0) {
      return traceSessionId;
    }

    const legacySessionId = options?.context?.custom?.sessionId;
    if (typeof legacySessionId === 'string' && legacySessionId.trim().length > 0) {
      return legacySessionId;
    }

    return acpSessionId;
  }

  private createTraceBridge(
    agentId: string,
    instance: ExternalAgentInstance,
    session: ExternalAgentSession,
    options?: ExternalAgentExecutionOptions
  ) {
    const traceSessionId = this.resolveTraceSessionId(options, session.id);
    const traceMetadata = options?.traceContext?.metadata;
    const modelIdFromMetadata =
      traceMetadata && typeof traceMetadata.modelId === 'string'
        ? traceMetadata.modelId
        : undefined;

    return createExternalAgentTraceBridge({
      sessionId: traceSessionId,
      turnId: options?.traceContext?.turnId ?? traceSessionId,
      modelId: modelIdFromMetadata,
      agentId,
      agentName: instance.config.name,
      protocol: instance.config.protocol,
      transport: instance.config.transport,
      acpSessionId: session.id,
      tags: ['external-agent', ...(options?.traceContext?.tags ?? [])],
      metadata: {
        ...traceMetadata,
      },
    });
  }

  /**
   * Create a session with an external agent
   */
  async createSession(
    agentId: string,
    options?: SessionCreateOptions
  ): Promise<ExternalAgentSession> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);

    if (!adapter || !instance) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (!adapter.isConnected()) {
      throw new Error(`Agent not connected: ${agentId}`);
    }

    const session = await adapter.createSession(options);
    instance.sessions.set(session.id, session);

    return session;
  }

  /**
   * Close a session
   */
  async closeSession(agentId: string, sessionId: string): Promise<void> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);

    if (adapter) {
      await adapter.closeSession(sessionId);
    }

    if (instance) {
      instance.sessions.delete(sessionId);
    }
  }

  /**
   * Get a session by ID
   */
  getSession(agentId: string, sessionId: string): ExternalAgentSession | undefined {
    const adapter = this.adapters.get(agentId);
    return adapter?.getSession(sessionId);
  }

  // ============================================================================
  // Execution
  // ============================================================================

  /**
   * Execute a prompt on an external agent (streaming)
   */
  async *executeStreaming(
    agentId: string,
    prompt: string,
    options?: ExternalAgentExecutionOptions
  ): AsyncIterable<ExternalAgentEvent> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);

    if (!adapter || !instance) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (!adapter.isConnected()) {
      // Try to connect
      await this.connect(agentId);
    }

    instance.status = 'executing';
    instance.stats.totalExecutions++;
    const startTime = Date.now();

    // Create session if not provided
    let session: ExternalAgentSession;
    const existingSession = options?.context?.custom?.sessionId as string | undefined;

    const sessionOptions = this.buildSessionOptions(options);

    if (existingSession) {
      const existing = instance.sessions.get(existingSession);
      if (existing) {
        session = existing;
      } else {
        session = await adapter.createSession(sessionOptions);
      }
    } else {
      session = await adapter.createSession(sessionOptions);
    }

    if (options?.permissionMode && adapter.setSessionMode && session.permissionMode !== options.permissionMode) {
      await adapter.setSessionMode(session.id, options.permissionMode);
    }

    instance.sessions.set(session.id, session);
    const traceBridge = this.createTraceBridge(agentId, instance, session, options);
    await traceBridge.onStart(prompt);

    // Create message
    const message: ExternalAgentMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: prompt }],
      timestamp: new Date(),
    };

    let streamSuccess = true;
    let streamError: string | undefined;

    try {
      for await (const event of adapter.prompt(session.id, message, options)) {
        if (event.type === 'session_start' && event.tools) {
          instance.tools = event.tools;
        }

        if (event.type === 'done') {
          streamSuccess = event.success;
        } else if (event.type === 'error') {
          streamSuccess = false;
          streamError = event.error;
        }
        // Emit to listeners
        this.emitEvent(agentId, event);
        options?.onEvent?.(event);
        void traceBridge.onEvent(event);

        // Yield to caller
        yield event;
      }

      await traceBridge.onComplete({
        success: streamSuccess,
        finalResponse: '',
        duration: Date.now() - startTime,
        error: streamError,
      });

      if (streamSuccess) {
        instance.stats.successfulExecutions++;
        instance.status = 'ready';
      } else {
        instance.stats.failedExecutions++;
        instance.status = 'failed';
        instance.lastError = streamError ?? 'External agent execution failed';
      }
      instance.tools = adapter.tools ?? instance.tools;
    } catch (error) {
      instance.stats.failedExecutions++;
      instance.status = 'failed';
      instance.lastError = error instanceof Error ? error.message : String(error);
      await traceBridge.onError(error);
      throw error;
    }
  }

  /**
   * Execute a prompt on an external agent (non-streaming)
   */
  async execute(
    agentId: string,
    prompt: string,
    options?: ExternalAgentExecutionOptions
  ): Promise<ExternalAgentResult> {
    const adapter = this.adapters.get(agentId);
    const instance = this.instances.get(agentId);

    if (!adapter || !instance) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    if (!adapter.isConnected()) {
      await this.connect(agentId);
    }

    instance.status = 'executing';
    instance.stats.totalExecutions++;
    const startTime = Date.now();

    // Create session
    const sessionOptions = this.buildSessionOptions(options);
    const session = await adapter.createSession(sessionOptions);

    if (options?.permissionMode && adapter.setSessionMode && session.permissionMode !== options.permissionMode) {
      await adapter.setSessionMode(session.id, options.permissionMode);
    }

    instance.sessions.set(session.id, session);
    const traceBridge = this.createTraceBridge(agentId, instance, session, options);
    await traceBridge.onStart(prompt);

    // Create message
    const message: ExternalAgentMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: [{ type: 'text', text: prompt }],
      timestamp: new Date(),
    };

    try {
      const wrappedOptions: ExternalAgentExecutionOptions = {
        ...options,
        onEvent: (event) => {
          options?.onEvent?.(event);
          void traceBridge.onEvent(event);
        },
      };
      const result = await adapter.execute(session.id, message, wrappedOptions);
      await traceBridge.onComplete(result);

      const responseTime = Date.now() - startTime;
      instance.stats.averageResponseTime =
        (instance.stats.averageResponseTime * (instance.stats.totalExecutions - 1) + responseTime) /
        instance.stats.totalExecutions;

      if (result.success) {
        instance.stats.successfulExecutions++;
        instance.status = 'ready';
      } else {
        instance.stats.failedExecutions++;
        instance.status = 'failed';
        instance.lastError = result.error ?? 'External agent execution failed';
      }

      // Update stats
      instance.tools = adapter.tools ?? instance.tools;
      if (result.tokenUsage) {
        instance.stats.totalTokensUsed += result.tokenUsage.totalTokens;
      }
      return result;
    } catch (error) {
      instance.stats.failedExecutions++;
      instance.status = 'failed';
      instance.lastError = error instanceof Error ? error.message : String(error);
      await traceBridge.onError(error);
      throw error;
    }
  }

  /**
   * Cancel an ongoing execution
   */
  async cancel(agentId: string, sessionId: string): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (adapter) {
      await adapter.cancel(sessionId);
    }

    const instance = this.instances.get(agentId);
    if (instance) {
      instance.status = 'ready';
    }
  }

  // ============================================================================
  // Tool Integration
  // ============================================================================

  /**
   * Get all tools from an external agent as Cognia AgentTools
   */
  getAgentTools(
    agentId: string,
    executeCallback?: (toolId: string, name: string, input: Record<string, unknown>) => Promise<string>
  ): Record<string, AgentTool> {
    const instance = this.instances.get(agentId);
    if (!instance?.tools) {
      return {};
    }

    const defaultCallback = async (
      toolId: string,
      name: string,
      input: Record<string, unknown>
    ): Promise<string> => {
      // Execute tool via external agent
      const result = await this.executeToolOnAgent(agentId, toolId, name, input);
      return typeof result === 'string' ? result : JSON.stringify(result);
    };

    return acpToolsToAgentTools(instance.tools, executeCallback || defaultCallback);
  }

  /**
   * Execute a tool on an external agent
   */
  private async executeToolOnAgent(
    agentId: string,
    _toolId: string,
    toolName: string,
    input: Record<string, unknown>
  ): Promise<string | Record<string, unknown>> {
    // Create a prompt that asks the agent to execute the tool
    const prompt = `Execute the tool "${toolName}" with the following input:\n${JSON.stringify(input, null, 2)}`;

    const result = await this.execute(agentId, prompt, {
      maxSteps: 1,
    });

    return result.finalResponse || result.output || '';
  }

  /**
   * Get all tools from all connected agents
   */
  getAllAgentTools(): Record<string, AgentTool> {
    const allTools: Record<string, AgentTool> = {};

    for (const [agentId, instance] of this.instances) {
      if (instance.connectionStatus === 'connected' && instance.tools) {
        const agentTools = this.getAgentTools(agentId);
        // Prefix with agent ID to avoid conflicts
        for (const [name, tool] of Object.entries(agentTools)) {
          allTools[`${agentId}:${name}`] = tool;
        }
      }
    }

    return allTools;
  }

  // ============================================================================
  // Delegation Rules
  // ============================================================================

  /**
   * Add a delegation rule
   */
  addDelegationRule(rule: ExternalAgentDelegationRule): void {
    this.delegationRules.push(rule);
    // Sort by priority (descending)
    this.delegationRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a delegation rule
   */
  removeDelegationRule(ruleId: string): void {
    const index = this.delegationRules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      this.delegationRules.splice(index, 1);
    }
  }

  /**
   * Check if a task should be delegated to an external agent
   */
  checkDelegation(task: string, _context?: Record<string, unknown>): ExternalAgentDelegationResult {
    for (const rule of this.delegationRules) {
      if (!rule.enabled) continue;

      const instance = this.instances.get(rule.targetAgentId);
      if (!instance || instance.connectionStatus !== 'connected') continue;

      let matched = false;

      switch (rule.condition) {
        case 'always':
          matched = true;
          break;

        case 'keyword':
          matched = new RegExp(rule.matcher, 'i').test(task);
          break;

        case 'task-type':
          matched = this.matchTaskType(task, rule.matcher);
          break;

        case 'capability':
          matched = this.matchCapability(instance, rule.matcher);
          break;

        case 'tool-needed':
          matched = this.matchToolNeeded(task, instance, rule.matcher);
          break;

        case 'custom':
          // Custom matchers would be evaluated differently
          // For now, treat as a regex
          matched = new RegExp(rule.matcher, 'i').test(task);
          break;
      }

      if (matched) {
        return {
          shouldDelegate: true,
          targetAgentId: rule.targetAgentId,
          matchedRule: rule,
          reason: `Matched rule: ${rule.name}`,
        };
      }
    }

    return {
      shouldDelegate: false,
      reason: 'No matching delegation rule',
    };
  }

  /**
   * Match task type
   */
  private matchTaskType(task: string, matcher: string): boolean {
    const taskTypes: Record<string, RegExp> = {
      coding: /\b(code|implement|fix|debug|refactor|write.*function|create.*class|build)\b/i,
      analysis: /\b(analyze|review|audit|check|examine|investigate)\b/i,
      documentation: /\b(document|write.*readme|add.*comments|explain)\b/i,
      testing: /\b(test|unit test|e2e|coverage|mock)\b/i,
      deployment: /\b(deploy|release|build|publish|ci|cd)\b/i,
    };

    const regex = taskTypes[matcher];
    return regex ? regex.test(task) : false;
  }

  /**
   * Match capability
   */
  private matchCapability(instance: ExternalAgentInstance, capability: string): boolean {
    if (!instance.capabilities) return false;

    const caps = instance.capabilities as Record<string, unknown>;
    return !!caps[capability];
  }

  /**
   * Match tool needed
   */
  private matchToolNeeded(
    task: string,
    instance: ExternalAgentInstance,
    toolPattern: string
  ): boolean {
    if (!instance.tools) return false;

    const regex = new RegExp(toolPattern, 'i');
    const hasMatchingTool = instance.tools.some((t) => regex.test(t.name));

    // Also check if task mentions the tool
    const taskMentionsTool = instance.tools.some(
      (t) => task.toLowerCase().includes(t.name.toLowerCase())
    );

    return hasMatchingTool && taskMentionsTool;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get an agent instance by ID
   */
  getAgent(agentId: string): ExternalAgentInstance | undefined {
    return this.instances.get(agentId);
  }

  /**
   * Get all agent instances
   */
  getAllAgents(): ExternalAgentInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: ExternalAgentConnectionStatus): ExternalAgentInstance[] {
    return Array.from(this.instances.values()).filter(
      (i) => i.connectionStatus === status
    );
  }

  /**
   * Get connected agents
   */
  getConnectedAgents(): ExternalAgentInstance[] {
    return this.getAgentsByStatus('connected');
  }

  /**
   * Check if any agents are connected
   */
  hasConnectedAgents(): boolean {
    return this.getConnectedAgents().length > 0;
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(agentId: string): AcpCapabilities | undefined {
    return this.instances.get(agentId)?.capabilities;
  }

  /**
   * Get agent tools
   */
  getAgentToolInfo(agentId: string): AcpToolInfo[] | undefined {
    return this.instances.get(agentId)?.tools;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Stop periodic health checks
   */
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Perform health check on all connected agents
   */
  async performHealthCheck(): Promise<void> {
    for (const [agentId, adapter] of this.adapters) {
      const instance = this.instances.get(agentId);
      if (!instance || instance.connectionStatus !== 'connected') continue;

      try {
        const healthy = await adapter.healthCheck();
        if (!healthy && this.config.autoReconnect) {
          console.warn('[ExternalAgentManager] Agent unhealthy, reconnecting:', agentId);
          await this.reconnect(agentId);
        }
      } catch (error) {
        console.error('[ExternalAgentManager] Health check failed:', agentId, error);
        if (this.config.autoReconnect) {
          await this.reconnect(agentId);
        }
      }
    }
  }

  /**
   * Manual health check for a specific agent
   */
  async checkAgentHealth(agentId: string): Promise<boolean> {
    const adapter = this.adapters.get(agentId);
    if (!adapter) return false;

    try {
      return await adapter.healthCheck();
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Add event listener for an agent
   */
  addEventListener(
    agentId: string,
    listener: (event: ExternalAgentEvent) => void
  ): () => void {
    let listeners = this.eventListeners.get(agentId);
    if (!listeners) {
      listeners = new Set();
      this.eventListeners.set(agentId, listeners);
    }
    listeners.add(listener);

    return () => {
      listeners?.delete(listener);
    };
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(agentId: string, event: ExternalAgentEvent): void {
    const listeners = this.eventListeners.get(agentId);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('[ExternalAgentManager] Event listener error:', error);
        }
      }
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Dispose of the manager
   */
  async dispose(): Promise<void> {
    this.stopHealthCheck();

    // Disconnect all agents
    for (const agentId of this.instances.keys()) {
      try {
        await this.disconnect(agentId);
      } catch (error) {
        console.error('[ExternalAgentManager] Error disconnecting:', agentId, error);
      }
    }

    this.instances.clear();
    this.adapters.clear();
    this.delegationRules = [];
    this.eventListeners.clear();
  }
}

/**
 * Get the global external agent manager instance
 */
export function getExternalAgentManager(
  config?: ExternalAgentManagerConfig
): ExternalAgentManager {
  return ExternalAgentManager.getInstance(config);
}

/**
 * Convenience function to check delegation for a task
 */
export function checkExternalAgentDelegation(
  task: string,
  context?: Record<string, unknown>
): ExternalAgentDelegationResult {
  return getExternalAgentManager().checkDelegation(task, context);
}

/**
 * Convenience function to execute on the best matching external agent
 */
export async function executeOnExternalAgent(
  prompt: string,
  options?: ExternalAgentExecutionOptions & { agentId?: string }
): Promise<ExternalAgentResult | null> {
  const manager = getExternalAgentManager();

  // If specific agent ID provided, use it
  if (options?.agentId) {
    return manager.execute(options.agentId, prompt, options);
  }

  // Check delegation rules
  const delegation = manager.checkDelegation(prompt);
  if (delegation.shouldDelegate && delegation.targetAgentId) {
    return manager.execute(delegation.targetAgentId, prompt, options);
  }

  // No suitable external agent found
  return null;
}
