/**
 * Agent Prompts - Unified prompt management for agents
 *
 * Exports:
 * - Base prompts for agent roles
 * - ReAct format prompts
 * - Tool guidance prompts
 * - PromptBuilder for composing prompts
 */

export {
  getBaseAgentPrompt,
  getRolePrompt,
  type AgentRole,
} from './base-prompts';

export {
  getReActPrompt,
  getReActFormat,
  type ReActStyle,
} from './react-prompts';

export {
  getToolGuidancePrompt,
  getToolCategoryPrompt,
  getToolUsageExamples,
  type ToolCategory,
} from './tool-prompts';

export {
  PromptBuilder,
  createPromptBuilder,
} from './prompt-builder';
