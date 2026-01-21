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
      { name: 'file_list', descriptionKey: 'tools.fileList', requiresApproval: false },
      { name: 'file_exists', descriptionKey: 'tools.fileExists', requiresApproval: false },
      { name: 'file_delete', descriptionKey: 'tools.fileDelete', requiresApproval: true },
      { name: 'file_copy', descriptionKey: 'tools.fileCopy', requiresApproval: true },
      { name: 'file_rename', descriptionKey: 'tools.fileRename', requiresApproval: true },
      { name: 'file_info', descriptionKey: 'tools.fileInfo', requiresApproval: false },
      { name: 'file_search', descriptionKey: 'tools.fileSearch', requiresApproval: false },
      { name: 'file_append', descriptionKey: 'tools.fileAppend', requiresApproval: true },
      { name: 'directory_create', descriptionKey: 'tools.directoryCreate', requiresApproval: true },
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
];

/**
 * Get tool category config by ID
 */
export function getToolCategoryById(id: string): ToolCategoryConfig | undefined {
  return TOOL_CATEGORY_CONFIGS.find((config) => config.id === id);
}
