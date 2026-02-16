/**
 * Tool Settings Constants
 *
 * Constants and configuration for tool settings components.
 * Icons are kept in components due to React JSX dependency.
 */

import type { SkillCategory } from '@/types/system/skill';
import type { SourceVerificationMode } from '@/types/search';
import type { ToolCategoryConfig, VerificationModeInfo } from '@/types/settings/tools';

/**
 * Skill category translation keys
 * Maps category enum values to i18n keys
 */
export const SKILL_CATEGORY_KEYS: Record<SkillCategory, string> = {
  'creative-design': 'creativeDesign',
  development: 'development',
  enterprise: 'enterprise',
  productivity: 'productivity',
  'data-analysis': 'dataAnalysis',
  communication: 'communication',
  meta: 'metaSkills',
  custom: 'custom',
};

/**
 * Verification mode label and description keys
 */
export const VERIFICATION_MODE_KEYS: Record<SourceVerificationMode, VerificationModeInfo> = {
  ask: {
    label: 'modeAsk',
    description: 'modeAskDesc',
  },
  auto: {
    label: 'modeAuto',
    description: 'modeAutoDesc',
  },
  disabled: {
    label: 'modeDisabled',
    description: 'modeDisabledDesc',
  },
};

/**
 * Tool category configurations
 * Defines the structure and tools for each category
 */
export const TOOL_CATEGORY_CONFIGS: ToolCategoryConfig[] = [
  {
    id: 'file',
    nameKey: 'fileOperations',
    descriptionKey: 'fileOperationsDesc',
    requiresApproval: true,
    tools: [
      { name: 'file_read', descriptionKey: 'tools.fileRead', requiresApproval: false },
      { name: 'file_write', descriptionKey: 'tools.fileWrite', requiresApproval: true },
      { name: 'file_binary_write', descriptionKey: 'tools.fileBinaryWrite', requiresApproval: true },
      { name: 'file_list', descriptionKey: 'tools.fileList', requiresApproval: false },
      { name: 'file_exists', descriptionKey: 'tools.fileExists', requiresApproval: false },
      { name: 'file_delete', descriptionKey: 'tools.fileDelete', requiresApproval: true },
      { name: 'file_copy', descriptionKey: 'tools.fileCopy', requiresApproval: true },
      { name: 'file_rename', descriptionKey: 'tools.fileRename', requiresApproval: true },
      { name: 'file_move', descriptionKey: 'tools.fileMove', requiresApproval: true },
      { name: 'file_info', descriptionKey: 'tools.fileInfo', requiresApproval: false },
      { name: 'file_search', descriptionKey: 'tools.fileSearch', requiresApproval: false },
      { name: 'file_append', descriptionKey: 'tools.fileAppend', requiresApproval: true },
      { name: 'file_hash', descriptionKey: 'tools.fileHash', requiresApproval: false },
      { name: 'content_search', descriptionKey: 'tools.contentSearch', requiresApproval: false },
      { name: 'directory_create', descriptionKey: 'tools.directoryCreate', requiresApproval: true },
      { name: 'directory_delete', descriptionKey: 'tools.directoryDelete', requiresApproval: true },
    ],
  },
  {
    id: 'document',
    nameKey: 'documentProcessing',
    descriptionKey: 'documentProcessingDesc',
    tools: [
      { name: 'document_summarize', descriptionKey: 'tools.documentSummarize', requiresApproval: false },
      { name: 'document_chunk', descriptionKey: 'tools.documentChunk', requiresApproval: false },
      { name: 'document_analyze', descriptionKey: 'tools.documentAnalyze', requiresApproval: false },
    ],
  },
  {
    id: 'search',
    nameKey: 'webSearch',
    descriptionKey: 'webSearchDesc',
    tools: [{ name: 'web_search', descriptionKey: 'tools.webSearch', requiresApproval: false }],
  },
  {
    id: 'rag',
    nameKey: 'knowledgeBase',
    descriptionKey: 'knowledgeBaseDesc',
    tools: [{ name: 'rag_search', descriptionKey: 'tools.ragSearch', requiresApproval: false }],
  },
  {
    id: 'calculator',
    nameKey: 'calculator',
    descriptionKey: 'calculatorDesc',
    tools: [{ name: 'calculator', descriptionKey: 'tools.calculator', requiresApproval: false }],
  },
  {
    id: 'code',
    nameKey: 'codeExecution',
    descriptionKey: 'codeExecutionDesc',
    requiresApproval: true,
    tools: [{ name: 'execute_code', descriptionKey: 'tools.executeCode', requiresApproval: true }],
  },
  {
    id: 'shell',
    nameKey: 'shellExecution',
    descriptionKey: 'shellExecutionDesc',
    requiresApproval: true,
    tools: [{ name: 'shell_execute', descriptionKey: 'tools.shellExecute', requiresApproval: true }],
  },
  {
    id: 'process',
    nameKey: 'processManagement',
    descriptionKey: 'processManagementDesc',
    requiresApproval: true,
    tools: [
      { name: 'list_processes', descriptionKey: 'tools.listProcesses', requiresApproval: false },
      { name: 'search_processes', descriptionKey: 'tools.searchProcesses', requiresApproval: false },
      { name: 'get_process', descriptionKey: 'tools.getProcess', requiresApproval: false },
      { name: 'top_memory_processes', descriptionKey: 'tools.topMemoryProcesses', requiresApproval: false },
      { name: 'check_program_allowed', descriptionKey: 'tools.checkProgramAllowed', requiresApproval: false },
      { name: 'get_process_manager_status', descriptionKey: 'tools.getProcessManagerStatus', requiresApproval: false },
      { name: 'get_tracked_processes', descriptionKey: 'tools.getTrackedProcesses', requiresApproval: false },
      { name: 'get_process_operation', descriptionKey: 'tools.getProcessOperation', requiresApproval: false },
      { name: 'list_process_operations', descriptionKey: 'tools.listProcessOperations', requiresApproval: false },
      { name: 'start_process', descriptionKey: 'tools.startProcess', requiresApproval: true },
      { name: 'start_processes_parallel', descriptionKey: 'tools.startProcessesParallel', requiresApproval: true },
      { name: 'start_processes_async', descriptionKey: 'tools.startProcessesAsync', requiresApproval: true },
      { name: 'terminate_process', descriptionKey: 'tools.terminateProcess', requiresApproval: true },
      { name: 'terminate_processes_parallel', descriptionKey: 'tools.terminateProcessesParallel', requiresApproval: true },
      { name: 'terminate_processes_async', descriptionKey: 'tools.terminateProcessesAsync', requiresApproval: true },
      { name: 'set_process_manager_enabled', descriptionKey: 'tools.setProcessManagerEnabled', requiresApproval: true },
    ],
  },
  {
    id: 'environment',
    nameKey: 'environmentManagement',
    descriptionKey: 'environmentManagementDesc',
    requiresApproval: true,
    tools: [
      { name: 'create_virtual_env', descriptionKey: 'tools.createVirtualEnv', requiresApproval: true },
      { name: 'install_packages', descriptionKey: 'tools.installPackages', requiresApproval: true },
      { name: 'run_python', descriptionKey: 'tools.runPython', requiresApproval: true },
      { name: 'list_env_packages', descriptionKey: 'tools.listEnvPackages', requiresApproval: false },
    ],
  },
];

/**
 * Get tool category config by ID
 */
export function getToolCategoryById(id: string): ToolCategoryConfig | undefined {
  return TOOL_CATEGORY_CONFIGS.find((config) => config.id === id);
}
