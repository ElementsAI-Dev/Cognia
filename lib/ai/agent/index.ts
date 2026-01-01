/**
 * Agent module exports
 */

export {
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
  executeAgent,
  createAgent,
  stopConditions,
  type AgentTool,
  type AgentConfig,
  type AgentResult,
  type AgentStep,
  type ToolCall,
  type AgentExecutionState,
} from './agent-executor';

export {
  initializeAgentTools,
  createCalculatorTool,
  createWebSearchTool,
  createWebScraperTool,
  createBulkWebScraperTool,
  createSearchAndScrapeTool,
  createRAGSearchTool,
  createCodeExecutionTool,
  getToolDescriptions,
  buildRAGConfigFromSettings,
  createDesignerTool,
  getToolsFromRegistry,
  getSkillsSystemPrompt,
  initializeAgentToolsWithSkills,
  buildEnvironmentToolsSystemPrompt,
  buildAgentSystemPrompt,
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

// Agent Loop exports
export {
  executeAgentLoop,
  createAgentLoop,
  type AgentLoopConfig,
  type AgentLoopResult,
  type AgentTask,
} from './agent-loop';

// Environment Tools exports
export {
  getEnvironmentTools,
  initializeEnvironmentTools,
  createVenvTool,
  createInstallPackagesTool,
  createRunPythonTool,
  createRunInEnvTool,
  createListPackagesTool,
  createCheckEnvTool,
  createGetPythonVersionsTool,
  getEnvironmentToolsSystemPrompt,
  getEnvironmentToolsPromptSnippet,
} from './environment-tools';
