/**
 * Prompts library - utilities for prompt template management
 */

export { buildTemplateVariables } from './template-utils';
export { default as skillPromptConverter } from './skill-prompt-converter';
export {
  promptTemplateToSkill,
  skillToPromptTemplate,
  extractPromptFromSkill,
  mergePromptIntoSkill,
  skillToSystemPrompt,
  batchConvertTemplatesToSkills,
  batchConvertSkillsToTemplates,
  analyzeCompatibility,
} from './skill-prompt-converter';
