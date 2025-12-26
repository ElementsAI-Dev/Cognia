/**
 * Agent module exports
 */

export {
  executeAgent,
  createAgent,
  type ToolCall,
  type AgentExecutionState,
  type AgentTool,
  type AgentConfig,
  type AgentResult,
  type AgentStep,
} from './agent-executor';

export {
  executeAgentLoop,
  createAgentLoop,
  type AgentTask,
  type AgentLoopConfig,
  type AgentLoopResult,
} from './agent-loop';

export {
  stepCountIs,
  durationExceeds,
  noToolCalls,
  toolCalled,
  responseContains,
  allToolsSucceeded,
  anyToolFailed,
  allOf,
  anyOf,
  not,
  defaultStopCondition,
  checkStopCondition,
  namedCondition,
  type StopCondition,
  type StopConditionResult,
} from './stop-conditions';

export {
  initializeAgentTools,
  createCalculatorTool,
  createWebSearchTool,
  createRAGSearchTool,
  createCodeExecutionTool,
  getToolDescriptions,
  buildRAGConfigFromSettings,
  type AgentToolsConfig,
} from './agent-tools';

// MCP Tools exports
export {
  convertMcpToolToAgentTool,
  convertMcpServerTools,
  convertAllMcpTools,
  createMcpToolsFromStore,
  createMcpToolsFromBackend,
  getMcpToolDescriptions,
  filterMcpToolsByServers,
  getMcpToolByOriginalName,
  formatMcpToolResult,
  type McpToolAdapterConfig,
} from './mcp-tools';

// SubAgent exports
export {
  createSubAgent,
  executeSubAgent,
  executeSubAgentsParallel,
  executeSubAgentsSequential,
  cancelSubAgent,
  cancelAllSubAgents,
  type SubAgentExecutorConfig,
} from './sub-agent-executor';

// Orchestrator exports
export {
  AgentOrchestrator,
  createOrchestrator,
  executeOrchestrated,
  type OrchestratorConfig,
  type OrchestratorExecutionOptions,
  type OrchestratorProgress,
  type OrchestratorResult,
  type SubAgentPlan,
} from './agent-orchestrator';

// Background Agent Manager exports
export {
  BackgroundAgentManager,
  createBackgroundAgentManager,
  getBackgroundAgentManager,
  setBackgroundAgentManager,
} from './background-agent-manager';
