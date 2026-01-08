/**
 * Context Module - Dynamic Context Discovery
 * 
 * This module provides file-based abstractions for dynamic context discovery,
 * inspired by Cursor's approach to context engineering. Instead of injecting
 * all context statically into prompts, content is persisted to files that
 * the agent can access on-demand through read/tail/grep tools.
 * 
 * Key components:
 * - ContextFS: Core file system abstraction
 * - Tool Output Handler: Persist long outputs instead of truncating
 * - History Handler: Preserve chat history for summarization recovery
 * - MCP Tools Sync: On-demand MCP tool description loading
 * - Skills Sync: Dynamic skill discovery
 * - Terminal Sync: Terminal session output as files
 * - Agent Context Tools: Tools for agent to access context files
 */

// Core file system
export {
  CONTEXT_CONSTANTS,
  CATEGORY_DIRS,
  estimateTokens,
  formatSize,
  writeContextFile,
  readContextFile,
  tailContextFile,
  searchContextFiles,
  grepContextFiles,
  deleteContextFile,
  getContextStats,
  gcContextFiles,
  createToolOutputRef,
  isLongOutput,
  clearAllContextFiles,
  getFilesByCategory,
  getNewContextPath,
} from './context-fs';

// Tool output handling
export {
  processToolOutput,
  formatToolOutputRefForPrompt,
  formatToolOutputRefsForPrompt,
  readToolOutput,
  tailToolOutput,
  getToolOutputSummary,
  type ProcessedToolOutput,
  type ProcessToolOutputOptions,
} from './tool-output-handler';

// Chat history handling
export {
  writeHistoryFile,
  createSummaryWithHistoryRef,
  searchHistory,
  getSessionHistoryFiles,
  readHistoryFile,
  formatHistoryRefForPrompt,
  shouldSummarize,
  chunkHistory,
  type HistoryMessage,
  type WriteHistoryOptions,
  type CreateSummaryOptions,
} from './history-handler';

// MCP tools sync
export {
  syncMcpTool,
  syncMcpServer,
  readMcpToolDescription,
  getSyncedToolsForServer,
  searchMcpTools,
  getMcpToolRefs,
  getMcpServerStatuses,
  generateMcpStaticPrompt,
  updateMcpServerStatus,
  clearMcpServerTools,
  type McpServerStatus,
  type McpToolRef,
  type McpSyncResult,
} from './mcp-tools-sync';

// Skills sync
export {
  syncSkill,
  syncSkills,
  readSkillDescription,
  searchSkills,
  getSkillRefs,
  generateSkillsStaticPrompt,
  discoverSkills,
  type SkillRef,
} from './skills-sync';

// Terminal sync
export {
  syncTerminalCommands,
  appendTerminalCommand,
  getTerminalSessionFile,
  tailTerminalSession,
  searchTerminalSessions,
  listTerminalSessions,
  getTerminalActivitySummary,
  generateTerminalStaticPrompt,
  findTerminalErrors,
  syncSandboxExecution,
  type TerminalSession,
  type TerminalCommand,
  type SyncTerminalOptions,
} from './terminal-sync';

// Agent tools
export {
  createReadContextFileTool,
  createTailContextFileTool,
  createGrepContextTool,
  createListContextFilesTool,
  createContextStatsTool,
  createContextTools,
  getContextToolsPrompt,
} from './agent-context-tools';
