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
  type RetryConfig,
  type ReActFormat,
  DEFAULT_RETRY_CONFIG,
  buildReActSystemPrompt,
  parseReActResponse,
} from './agent-executor';

export {
  initializeAgentTools,
  createCalculatorTool,
  createWebSearchTool,
  createWebScraperTool,
  createBulkWebScraperTool,
  createSearchAndScrapeTool,
  createRAGSearchTool,
  createListRAGCollectionsTool,
  createCodeExecutionTool,
  getToolDescriptions,
  buildRAGConfigFromSettings,
  createDesignerTool,
  getToolsFromRegistry,
  getToolsForCustomMode,
  filterToolsForMode,
  getSkillsSystemPrompt,
  initializeAgentToolsWithSkills,
  buildEnvironmentToolsSystemPrompt,
  buildProcessToolsSystemPrompt,
  buildAgentSystemPrompt,
  type AgentToolsConfig,
  type RAGSearchToolOptions,
} from './agent-tools';

// Process Tools exports
export {
  initializeProcessTools,
  createListProcessesTool,
  createGetProcessTool,
  createSearchProcessesTool,
  createTopMemoryProcessesTool,
  createStartProcessTool,
  createTerminateProcessTool,
  createCheckProgramTool,
  getProcessToolsSystemPrompt,
  getProcessToolsPromptSnippet,
  type ProcessToolsConfig,
} from './process-tools';

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
  // Intelligent tool selection
  scoreMcpToolRelevance,
  selectMcpToolsByRelevance,
  applyToolSelection,
  getMcpToolsWithSelection,
  getRecommendedMcpTools,
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

// Context Tools exports (Dynamic Context Discovery)
export {
  createContextTools,
  createReadContextFileTool,
  createTailContextFileTool,
  createGrepContextTool,
  createListContextFilesTool,
  createContextStatsTool,
  getContextToolsPrompt,
} from '@/lib/context';

// Context-Aware Executor exports
export {
  executeContextAwareAgent,
  createContextAwareAgent,
  getContextExecutionSummary,
  type ContextAwareAgentConfig,
  type ContextAwareAgentResult,
} from './context-aware-executor';

// Canvas Tools exports
export {
  createCanvasCreateTool,
  createCanvasUpdateTool,
  createCanvasReadTool,
  createCanvasOpenTool,
  createCanvasTools,
  getCanvasToolsRecord,
  type CanvasCreateInput,
  type CanvasUpdateInput,
  type CanvasReadInput,
} from './canvas-tool';

// Tool Cache exports
export {
  ToolCache,
  globalToolCache,
  type ToolCacheEntry,
  type ToolCacheConfig,
  type ToolCacheStats,
} from './tool-cache';

// Performance Metrics exports
export {
  globalMetricsCollector,
  type AgentMetrics,
  type StepMetrics,
  type ToolCallMetrics,
  type TokenUsageMetrics,
  type CacheMetrics,
  type MetricsSummary,
} from './performance-metrics';

// Memory Manager exports
export {
  MemoryManager,
  globalMemoryManager,
  type MemoryEntry,
  type MemoryQuery,
  type MemoryStats,
  type MemoryManagerConfig,
} from './memory-manager';

// Artifact Tools exports (from lib/ai/tools)
export {
  artifactTools,
  artifactCreateTool,
  artifactUpdateTool,
  artifactReadTool,
  artifactSearchTool,
  artifactRenderTool,
  artifactExportTool,
  artifactDeleteTool,
  executeArtifactCreate,
  executeArtifactUpdate,
  executeArtifactRead,
  executeArtifactSearch,
  executeArtifactRender,
  executeArtifactExport,
  executeArtifactDelete,
  registerArtifactTools,
  getArtifactToolsPrompt,
  artifactCreateInputSchema,
  artifactUpdateInputSchema,
  artifactReadInputSchema,
  artifactSearchInputSchema,
  artifactRenderInputSchema,
  artifactExportInputSchema,
  artifactDeleteInputSchema,
  ARTIFACT_TYPES,
  type ArtifactCreateInput,
  type ArtifactUpdateInput,
  type ArtifactReadInput,
  type ArtifactSearchInput,
  type ArtifactRenderInput,
  type ArtifactExportInput,
  type ArtifactDeleteInput,
  type ArtifactToolResult,
} from '../tools';

// Memory Tools exports (from lib/ai/tools)
export {
  memoryTools,
  memoryStoreTool,
  memoryRecallTool,
  memorySearchTool,
  memoryDeleteTool,
  memoryListTool,
  memoryUpdateTool,
  executeMemoryStore,
  executeMemoryRecall,
  executeMemorySearch,
  executeMemoryDelete,
  executeMemoryList,
  executeMemoryUpdate,
  registerMemoryTools,
  getMemoryToolsPrompt,
  memoryStoreInputSchema,
  memoryRecallInputSchema,
  memorySearchInputSchema,
  memoryDeleteInputSchema,
  memoryListInputSchema,
  memoryUpdateInputSchema,
  type MemoryStoreInput,
  type MemoryRecallInput,
  type MemorySearchInput,
  type MemoryDeleteInput,
  type MemoryListInput,
  type MemoryUpdateInput,
  type MemoryToolResult,
} from '../tools';

// Capabilities exports
export {
  detectCapabilities,
  isTauriEnvironment,
  getCapabilitySummary,
  getCapabilitySystemPrompt,
  hasCapability,
  createCapabilityAwareTool,
  type AgentCapabilities,
} from './capabilities';

// Prompts exports
export {
  getBaseAgentPrompt,
  getRolePrompt,
  getReActPrompt,
  getReActFormat,
  getToolGuidancePrompt,
  getToolCategoryPrompt,
  getToolUsageExamples,
  PromptBuilder,
  createPromptBuilder,
  type AgentRole,
  type ReActStyle,
  type ToolCategory,
} from './prompts';
