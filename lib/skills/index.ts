/**
 * Skills module exports
 */

export {
  parseSkillMd,
  generateSkillMd,
  validateSkill,
  validateSkillName,
  validateSkillDescription,
  validateSkillContent,
  extractTagsFromContent,
  inferCategoryFromContent,
  getResourceType,
  getMimeType,
  createSkillResource,
  toHyphenCase,
  isSkillValid,
  type SkillParseResult,
  type SkillDirectoryParseResult,
} from './parser';

export {
  SKILL_TEMPLATES,
  SKILL_CREATOR_TEMPLATE,
  MCP_BUILDER_TEMPLATE,
  ARTIFACTS_BUILDER_TEMPLATE,
  CANVAS_DESIGN_TEMPLATE,
  INTERNAL_COMMS_TEMPLATE,
  BRAND_GUIDELINES_TEMPLATE,
  WEBAPP_TESTING_TEMPLATE,
  DATA_ANALYSIS_TEMPLATE,
  TEMPLATE_SKILL,
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  searchTemplates,
  getTemplateCategoriesWithCounts,
} from './templates';

export {
  buildSkillSystemPrompt,
  buildMultiSkillSystemPrompt,
  createSkillTool,
  createSkillTools,
  executeSkill,
  getSkillScripts,
  getSkillReferences,
  getSkillAssets,
  matchSkillToQuery,
  findMatchingSkills,
  estimateSkillTokens,
  checkSkillTokenBudget,
  // Progressive Disclosure
  buildSkillSummary,
  buildSkillPartial,
  buildProgressiveSkillsPrompt,
  loadSkillContent,
  selectSkillsForContext,
  // MCP Tool Association
  findSkillsForMcpServer,
  findSkillsForMcpTool,
  matchSkillsToMcpTool,
  getAutoLoadSkillsForTools,
  buildSkillMcpPrompt,
  // Version Check
  compareVersions,
  checkSkillVersions,
  getSkillsWithUpdates,
  // Conflict Detection
  detectSkillConflicts,
  wouldCauseConflicts,
  type SkillExecutorConfig,
  type DisclosureLevel,
  type McpToolInfo,
  type SkillMcpMatchResult,
  type SkillVersionCheckResult,
  type SkillConflict,
} from './executor';

export {
  buildGenerationPrompt,
  buildRefinementPrompt,
  buildSuggestionsPrompt,
  parseGeneratedSkill,
  parseSuggestions,
  getStarterContent,
  generateCategoryExample,
  validateGeneratedContent,
  type SkillGenerationResult,
  type SkillSuggestionsResult,
} from './generator';

export {
  PACKAGE_FORMAT_VERSION,
  exportSkillToPackage,
  importSkillFromPackage,
  exportSkillToMarkdown,
  importSkillFromMarkdown,
  exportSkillBundle,
  importSkillBundle,
  generateChecksum,
  validatePackage,
  downloadSkillAsMarkdown,
  downloadSkillAsPackage,
  readSkillFile,
} from './packager';

export {
  BUILTIN_SKILLS,
  ADDITIONAL_SKILLS,
  EXPERT_SKILLS,
  getAllBuiltinSkills,
  initializeBuiltinSkills,
} from './builtin';
