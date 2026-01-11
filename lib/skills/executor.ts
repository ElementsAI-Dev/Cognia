/**
 * Skill Executor - Execute skills within agent context
 * 
 * Handles the integration between Claude Skills and the agent execution system.
 */

import { z } from 'zod';
import type { AgentTool } from '@/lib/ai/agent/agent-executor';
import type {
  Skill,
  SkillExecutionContext,
  SkillSandboxExecutionResult,
  SkillResource,
} from '@/types/system/skill';

/**
 * Configuration for skill execution
 */
export interface SkillExecutorConfig {
  /** Maximum content length to load into context */
  maxContentLength?: number;
  /** Whether to include resource content in prompt */
  includeResources?: boolean;
  /** Custom system prompt prefix */
  systemPromptPrefix?: string;
}

const DEFAULT_CONFIG: Required<SkillExecutorConfig> = {
  maxContentLength: 10000,
  includeResources: true,
  systemPromptPrefix: '',
};

/**
 * Build the system prompt for a skill
 */
export function buildSkillSystemPrompt(
  skill: Skill,
  config: SkillExecutorConfig = {}
): string {
  const { maxContentLength, includeResources, systemPromptPrefix } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const parts: string[] = [];

  // Add custom prefix if provided
  if (systemPromptPrefix) {
    parts.push(systemPromptPrefix);
  }

  // Add skill metadata context
  parts.push(`## Active Skill: ${skill.metadata.name}`);
  parts.push(`**Description:** ${skill.metadata.description}`);
  parts.push('');

  // Add skill content (instructions)
  let content = skill.content;
  if (content.length > maxContentLength) {
    content = content.substring(0, maxContentLength) + '\n\n[Content truncated...]';
  }
  parts.push('## Skill Instructions');
  parts.push(content);

  // Add reference resources if enabled
  if (includeResources) {
    const references = skill.resources.filter(r => r.type === 'reference');
    if (references.length > 0) {
      parts.push('');
      parts.push('## Reference Materials');
      for (const ref of references) {
        if (ref.content) {
          parts.push(`### ${ref.name}`);
          parts.push(ref.content);
          parts.push('');
        }
      }
    }
  }

  return parts.join('\n');
}

/**
 * Build a combined system prompt from multiple skills
 */
export function buildMultiSkillSystemPrompt(
  skills: Skill[],
  config: SkillExecutorConfig = {}
): string {
  if (skills.length === 0) {
    return '';
  }

  if (skills.length === 1) {
    return buildSkillSystemPrompt(skills[0], config);
  }

  const parts: string[] = [];
  
  parts.push('# Active Skills');
  parts.push('The following skills are available and should be used when relevant:');
  parts.push('');

  for (const skill of skills) {
    parts.push(`## ${skill.metadata.name}`);
    parts.push(`**Description:** ${skill.metadata.description}`);
    parts.push('');
    
    // Truncate each skill's content to fit multiple skills
    const maxPerSkill = Math.floor((config.maxContentLength || 10000) / skills.length);
    let content = skill.content;
    if (content.length > maxPerSkill) {
      content = content.substring(0, maxPerSkill) + '\n[Content truncated...]';
    }
    parts.push(content);
    parts.push('');
    parts.push('---');
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Create an AgentTool from a Skill
 * This allows skills to be used as tools in the agent system
 */
export function createSkillTool(skill: Skill): AgentTool {
  return {
    name: `skill_${skill.metadata.name.replace(/-/g, '_')}`,
    description: `Use the "${skill.metadata.name}" skill. ${skill.metadata.description}`,
    parameters: z.object({
      query: z.string().describe('The specific request or question for this skill'),
      context: z.string().optional().describe('Additional context for the skill'),
    }),
    execute: async (args) => {
      const { query, context } = args as { query: string; context?: string };
      
      // Build the skill prompt
      const skillPrompt = buildSkillSystemPrompt(skill);
      
      return {
        success: true,
        skillId: skill.id,
        skillName: skill.metadata.name,
        instructions: skillPrompt,
        query,
        context,
        message: `Skill "${skill.metadata.name}" has been activated. Follow the skill instructions to complete the request.`,
      };
    },
    requiresApproval: false,
  };
}

/**
 * Create multiple skill tools from an array of skills
 */
export function createSkillTools(skills: Skill[]): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {};
  
  for (const skill of skills) {
    if (skill.status === 'enabled') {
      const tool = createSkillTool(skill);
      tools[tool.name] = tool;
    }
  }
  
  return tools;
}

/**
 * Execute a skill and track the result
 */
export async function executeSkill(
  skill: Skill,
  context: SkillExecutionContext,
  config: SkillExecutorConfig = {}
): Promise<SkillSandboxExecutionResult> {
  const startTime = Date.now();
  const loadedResources: string[] = [];
  
  try {
    // Build the skill system prompt
    const systemPrompt = buildSkillSystemPrompt(skill, config);
    
    // Track which resources were loaded
    if (config.includeResources !== false) {
      for (const resource of skill.resources) {
        if (resource.type === 'reference' && resource.content) {
          loadedResources.push(resource.path);
        }
      }
    }
    
    // Return the prepared execution context
    // The actual AI call will be made by the agent executor
    return {
      success: true,
      output: systemPrompt,
      duration: Date.now() - startTime,
      loadedResources,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Skill execution failed',
      duration: Date.now() - startTime,
      loadedResources,
    };
  }
}

/**
 * Get available scripts from a skill that can be executed
 */
export function getSkillScripts(skill: Skill): SkillResource[] {
  return skill.resources.filter(r => r.type === 'script');
}

/**
 * Get reference documents from a skill
 */
export function getSkillReferences(skill: Skill): SkillResource[] {
  return skill.resources.filter(r => r.type === 'reference');
}

/**
 * Get assets from a skill
 */
export function getSkillAssets(skill: Skill): SkillResource[] {
  return skill.resources.filter(r => r.type === 'asset');
}

/**
 * Check if a skill matches a given query/prompt
 * Used for automatic skill discovery
 */
export function matchSkillToQuery(skill: Skill, query: string): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;
  
  // Check name match
  if (lowerQuery.includes(skill.metadata.name.replace(/-/g, ' '))) {
    score += 10;
  }
  
  // Check description match
  const descWords = skill.metadata.description.toLowerCase().split(/\s+/);
  for (const word of descWords) {
    if (word.length > 3 && lowerQuery.includes(word)) {
      score += 2;
    }
  }
  
  // Check tag match
  for (const tag of skill.tags) {
    if (lowerQuery.includes(tag.toLowerCase())) {
      score += 5;
    }
  }
  
  // Check content keywords
  const contentWords = skill.content.toLowerCase().split(/\s+/).slice(0, 100);
  for (const word of contentWords) {
    if (word.length > 4 && lowerQuery.includes(word)) {
      score += 1;
    }
  }
  
  return score;
}

/**
 * Find the best matching skills for a query
 */
export function findMatchingSkills(
  skills: Skill[],
  query: string,
  maxResults: number = 3
): Skill[] {
  const scored = skills
    .filter(s => s.status === 'enabled')
    .map(skill => ({
      skill,
      score: matchSkillToQuery(skill, query),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  
  return scored.map(({ skill }) => skill);
}

/**
 * Estimate token count for skill content
 * Rough estimate: 1 token ≈ 4 characters or 0.75 words
 */
export function estimateSkillTokens(skill: Skill): number {
  let totalChars = 0;
  
  // Metadata
  totalChars += skill.metadata.name.length;
  totalChars += skill.metadata.description.length;
  
  // Content
  totalChars += skill.content.length;
  
  // Reference resources
  for (const resource of skill.resources) {
    if (resource.type === 'reference' && resource.content) {
      totalChars += resource.content.length;
    }
  }
  
  // Rough token estimate (4 chars per token)
  return Math.ceil(totalChars / 4);
}

/**
 * Check if skills fit within a token budget
 */
export function checkSkillTokenBudget(
  skills: Skill[],
  budget: number
): { fits: boolean; totalTokens: number; excess: number } {
  const totalTokens = skills.reduce((sum, skill) => sum + estimateSkillTokens(skill), 0);
  const fits = totalTokens <= budget;
  const excess = fits ? 0 : totalTokens - budget;
  
  return { fits, totalTokens, excess };
}

/**
 * Progressive Disclosure Level
 * - summary: Only name and description (~20-50 tokens per skill)
 * - partial: Summary + first 500 chars of content (~150-200 tokens per skill)
 * - full: Complete skill content (variable, can be 500+ tokens)
 */
export type DisclosureLevel = 'summary' | 'partial' | 'full';

/**
 * Build a summary-level skill prompt (Progressive Disclosure Level 1)
 * Only includes metadata for minimal token usage
 */
export function buildSkillSummary(skill: Skill): string {
  return `- **${skill.metadata.name}**: ${skill.metadata.description}`;
}

/**
 * Build a partial skill prompt (Progressive Disclosure Level 2)
 * Includes metadata and truncated content
 */
export function buildSkillPartial(skill: Skill, maxChars: number = 500): string {
  const parts: string[] = [];
  parts.push(`### ${skill.metadata.name}`);
  parts.push(`${skill.metadata.description}`);
  parts.push('');
  
  const truncatedContent = skill.content.length > maxChars
    ? skill.content.substring(0, maxChars) + '\n\n[... use skill for full instructions]'
    : skill.content;
  
  parts.push(truncatedContent);
  return parts.join('\n');
}

/**
 * Build skills prompt with Progressive Disclosure
 * Automatically adjusts disclosure level based on token budget
 */
export function buildProgressiveSkillsPrompt(
  skills: Skill[],
  tokenBudget: number = 2000,
  config: SkillExecutorConfig = {}
): { prompt: string; level: DisclosureLevel; tokenEstimate: number } {
  if (skills.length === 0) {
    return { prompt: '', level: 'summary', tokenEstimate: 0 };
  }

  // Try full disclosure first
  const fullCheck = checkSkillTokenBudget(skills, tokenBudget);
  if (fullCheck.fits) {
    const prompt = buildMultiSkillSystemPrompt(skills, config);
    return { prompt, level: 'full', tokenEstimate: fullCheck.totalTokens };
  }

  // Try partial disclosure
  const partialParts: string[] = ['# Available Skills\n'];
  let partialTokens = 10; // Header tokens
  
  for (const skill of skills) {
    const partial = buildSkillPartial(skill);
    const tokens = Math.ceil(partial.length / 4);
    partialParts.push(partial);
    partialParts.push('\n---\n');
    partialTokens += tokens + 2;
  }
  
  if (partialTokens <= tokenBudget) {
    return { prompt: partialParts.join('\n'), level: 'partial', tokenEstimate: partialTokens };
  }

  // Fall back to summary-only
  const summaryParts: string[] = [
    '# Available Skills',
    '',
    'The following skills are available. Ask to use a specific skill for detailed instructions:',
    '',
  ];
  let summaryTokens = 20;
  
  for (const skill of skills) {
    const summary = buildSkillSummary(skill);
    summaryParts.push(summary);
    summaryTokens += Math.ceil(summary.length / 4);
  }
  
  return { prompt: summaryParts.join('\n'), level: 'summary', tokenEstimate: summaryTokens };
}

/**
 * Get skill content on demand (Progressive Disclosure full load)
 * Used when user requests to use a specific skill
 */
export function loadSkillContent(
  skill: Skill,
  config: SkillExecutorConfig = {}
): { content: string; tokenEstimate: number } {
  const content = buildSkillSystemPrompt(skill, config);
  const tokenEstimate = estimateSkillTokens(skill);
  return { content, tokenEstimate };
}

/**
 * Smart skill selection for context window
 * Prioritizes active skills and fits within budget
 */
export function selectSkillsForContext(
  skills: Skill[],
  tokenBudget: number,
  priorityIds: string[] = []
): Skill[] {
  // Sort skills: priority first, then by token efficiency
  const sorted = [...skills].sort((a, b) => {
    const aPriority = priorityIds.includes(a.id) ? 1 : 0;
    const bPriority = priorityIds.includes(b.id) ? 1 : 0;
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    // Prefer smaller skills for efficiency
    return estimateSkillTokens(a) - estimateSkillTokens(b);
  });

  const selected: Skill[] = [];
  let usedTokens = 0;

  for (const skill of sorted) {
    const tokens = estimateSkillTokens(skill);
    if (usedTokens + tokens <= tokenBudget) {
      selected.push(skill);
      usedTokens += tokens;
    }
  }

  return selected;
}

const skillExecutor = {
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
  buildSkillSummary,
  buildSkillPartial,
  buildProgressiveSkillsPrompt,
  loadSkillContent,
  selectSkillsForContext,
};

export default skillExecutor;
