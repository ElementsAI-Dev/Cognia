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

// =============================================================================
// MCP Tool Association (Claude Best Practice)
// Skills provide workflow knowledge, MCP provides tool connectivity.
// =============================================================================

/**
 * MCP tool information for matching
 */
export interface McpToolInfo {
  serverId: string;
  toolName: string;
  description: string;
}

/**
 * Result of skill-MCP matching
 */
export interface SkillMcpMatchResult {
  skill: Skill;
  matchScore: number;
  matchReason: 'server' | 'tool' | 'keyword' | 'description';
}

/**
 * Find skills that match a specific MCP server
 */
export function findSkillsForMcpServer(
  skills: Skill[],
  serverId: string
): Skill[] {
  return skills.filter(
    skill => 
      skill.status === 'enabled' &&
      skill.associatedMcpServers?.includes(serverId)
  );
}

/**
 * Find skills that match a specific MCP tool
 */
export function findSkillsForMcpTool(
  skills: Skill[],
  serverId: string,
  toolName: string
): Skill[] {
  const toolFullName = `${serverId}_${toolName}`;
  
  return skills.filter(skill => {
    if (skill.status !== 'enabled') return false;
    
    // Check direct tool association
    if (skill.recommendedTools?.includes(toolFullName)) return true;
    if (skill.recommendedTools?.includes(toolName)) return true;
    
    // Check server association
    if (skill.associatedMcpServers?.includes(serverId)) return true;
    
    return false;
  });
}

/**
 * Match skills to MCP tools by keyword matching
 * Returns scored results for intelligent selection
 */
export function matchSkillsToMcpTool(
  skills: Skill[],
  toolInfo: McpToolInfo,
  maxResults: number = 3
): SkillMcpMatchResult[] {
  const results: SkillMcpMatchResult[] = [];
  
  for (const skill of skills) {
    if (skill.status !== 'enabled') continue;
    
    let matchScore = 0;
    let matchReason: SkillMcpMatchResult['matchReason'] = 'description';
    
    // Check server association (highest priority)
    if (skill.associatedMcpServers?.includes(toolInfo.serverId)) {
      matchScore += 100;
      matchReason = 'server';
    }
    
    // Check tool association
    const toolFullName = `${toolInfo.serverId}_${toolInfo.toolName}`;
    if (skill.recommendedTools?.includes(toolFullName) ||
        skill.recommendedTools?.includes(toolInfo.toolName)) {
      matchScore += 80;
      matchReason = 'tool';
    }
    
    // Check keyword matching against tool description
    if (skill.toolMatchKeywords && skill.toolMatchKeywords.length > 0) {
      const lowerDesc = toolInfo.description.toLowerCase();
      const lowerToolName = toolInfo.toolName.toLowerCase();
      
      for (const keyword of skill.toolMatchKeywords) {
        const lowerKeyword = keyword.toLowerCase();
        if (lowerDesc.includes(lowerKeyword) || lowerToolName.includes(lowerKeyword)) {
          matchScore += 20;
          if (matchReason === 'description') {
            matchReason = 'keyword';
          }
        }
      }
    }
    
    // Check general description match (lowest priority)
    if (matchScore === 0) {
      const descScore = matchSkillToQuery(skill, toolInfo.description);
      if (descScore > 5) {
        matchScore = descScore;
        matchReason = 'description';
      }
    }
    
    if (matchScore > 0) {
      results.push({ skill, matchScore, matchReason });
    }
  }
  
  return results
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);
}

/**
 * Get skills to auto-load when specific MCP tools are being used
 * This implements Claude's recommendation: "Skills handle expertise"
 */
export function getAutoLoadSkillsForTools(
  skills: Skill[],
  activeToolNames: string[]
): Skill[] {
  const matchedSkills = new Map<string, Skill>();
  
  for (const toolName of activeToolNames) {
    // Parse tool name (format: mcp_serverId_toolName)
    const parts = toolName.split('_');
    if (parts.length >= 3 && parts[0] === 'mcp') {
      const serverId = parts[1];
      const actualToolName = parts.slice(2).join('_');
      
      // Find matching skills
      const matched = findSkillsForMcpTool(skills, serverId, actualToolName);
      for (const skill of matched) {
        matchedSkills.set(skill.id, skill);
      }
    }
  }
  
  return Array.from(matchedSkills.values());
}

/**
 * Build a combined prompt that includes both skill instructions and MCP tool guidance
 * This implements Claude's best practice of combining Skills (workflow) with MCP (tools)
 */
export function buildSkillMcpPrompt(
  skills: Skill[],
  mcpTools: McpToolInfo[],
  config: SkillExecutorConfig = {}
): string {
  if (skills.length === 0) return '';
  
  const parts: string[] = [];
  
  parts.push('# Skill-Guided Tool Usage');
  parts.push('');
  parts.push('The following skills provide guidance for using the available MCP tools effectively:');
  parts.push('');
  
  for (const skill of skills) {
    // Find which tools this skill guides
    const guidedTools = mcpTools.filter(tool => {
      if (skill.associatedMcpServers?.includes(tool.serverId)) return true;
      if (skill.recommendedTools?.some(rt => 
        rt === tool.toolName || rt === `${tool.serverId}_${tool.toolName}`
      )) return true;
      return false;
    });
    
    if (guidedTools.length > 0) {
      parts.push(`## ${skill.metadata.name}`);
      parts.push(`**For tools:** ${guidedTools.map(t => t.toolName).join(', ')}`);
      parts.push('');
      
      // Include skill content (truncated)
      const maxChars = Math.floor((config.maxContentLength || 5000) / skills.length);
      const content = skill.content.length > maxChars
        ? skill.content.substring(0, maxChars) + '\n[...]'
        : skill.content;
      parts.push(content);
      parts.push('');
      parts.push('---');
      parts.push('');
    }
  }
  
  return parts.join('\n');
}

// =============================================================================
// Skill Version Check
// =============================================================================

/**
 * Compare two semantic version strings
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const maxLen = Math.max(partsA.length, partsB.length);
  
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * Result of a version check for a single skill
 */
export interface SkillVersionCheckResult {
  skillId: string;
  skillName: string;
  currentVersion: string;
  latestVersion?: string;
  hasUpdate: boolean;
  source: string;
}

/**
 * Check if skills have newer versions available
 * Compares local skill versions against a source of truth (e.g., marketplace items)
 */
export function checkSkillVersions(
  skills: Skill[],
  availableVersions: Array<{ name: string; version?: string; id?: string }>
): SkillVersionCheckResult[] {
  const results: SkillVersionCheckResult[] = [];

  for (const skill of skills) {
    const currentVersion = skill.version || '1.0.0';
    
    // Find matching available version by name
    const match = availableVersions.find(
      (av) =>
        av.name === skill.metadata.name ||
        av.id === skill.id
    );

    if (match && match.version) {
      const hasUpdate = compareVersions(currentVersion, match.version) < 0;
      results.push({
        skillId: skill.id,
        skillName: skill.metadata.name,
        currentVersion,
        latestVersion: match.version,
        hasUpdate,
        source: skill.source,
      });
    } else {
      results.push({
        skillId: skill.id,
        skillName: skill.metadata.name,
        currentVersion,
        hasUpdate: false,
        source: skill.source,
      });
    }
  }

  return results;
}

/**
 * Get only skills that have updates available
 */
export function getSkillsWithUpdates(
  skills: Skill[],
  availableVersions: Array<{ name: string; version?: string; id?: string }>
): SkillVersionCheckResult[] {
  return checkSkillVersions(skills, availableVersions).filter((r) => r.hasUpdate);
}

// =============================================================================
// Active Skill Conflict Detection
// =============================================================================

/**
 * Potential conflict between two active skills
 */
export interface SkillConflict {
  skillA: { id: string; name: string };
  skillB: { id: string; name: string };
  conflictType: 'category' | 'tag' | 'mcp-server' | 'tool-keyword';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Detect potential conflicts between active skills
 * Two skills may conflict if they operate in the same domain
 * with potentially contradictory instructions
 */
export function detectSkillConflicts(activeSkills: Skill[]): SkillConflict[] {
  const conflicts: SkillConflict[] = [];

  for (let i = 0; i < activeSkills.length; i++) {
    for (let j = i + 1; j < activeSkills.length; j++) {
      const a = activeSkills[i];
      const b = activeSkills[j];

      // Check for same category (low severity - common and often fine)
      if (a.category === b.category && a.category !== 'custom') {
        conflicts.push({
          skillA: { id: a.id, name: a.metadata.name },
          skillB: { id: b.id, name: b.metadata.name },
          conflictType: 'category',
          description: `Both skills are in the "${a.category}" category`,
          severity: 'low',
        });
      }

      // Check for overlapping MCP server associations (high severity)
      const sharedServers = (a.associatedMcpServers || []).filter(
        (s) => (b.associatedMcpServers || []).includes(s)
      );
      if (sharedServers.length > 0) {
        conflicts.push({
          skillA: { id: a.id, name: a.metadata.name },
          skillB: { id: b.id, name: b.metadata.name },
          conflictType: 'mcp-server',
          description: `Both skills target MCP server(s): ${sharedServers.join(', ')}`,
          severity: 'high',
        });
      }

      // Check for overlapping tool keywords (medium severity)
      const sharedKeywords = (a.toolMatchKeywords || []).filter(
        (k) => (b.toolMatchKeywords || []).some(
          (bk) => bk.toLowerCase() === k.toLowerCase()
        )
      );
      if (sharedKeywords.length > 0) {
        conflicts.push({
          skillA: { id: a.id, name: a.metadata.name },
          skillB: { id: b.id, name: b.metadata.name },
          conflictType: 'tool-keyword',
          description: `Shared tool keywords: ${sharedKeywords.join(', ')}`,
          severity: 'medium',
        });
      }

      // Check for significant tag overlap (medium severity)
      const sharedTags = a.tags.filter((t) => b.tags.includes(t));
      if (sharedTags.length >= 3) {
        conflicts.push({
          skillA: { id: a.id, name: a.metadata.name },
          skillB: { id: b.id, name: b.metadata.name },
          conflictType: 'tag',
          description: `Many shared tags: ${sharedTags.join(', ')}`,
          severity: 'medium',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check if activating a new skill would cause high-severity conflicts
 */
export function wouldCauseConflicts(
  candidateSkill: Skill,
  activeSkills: Skill[]
): SkillConflict[] {
  return detectSkillConflicts([...activeSkills, candidateSkill]).filter(
    (c) =>
      c.skillA.id === candidateSkill.id || c.skillB.id === candidateSkill.id
  );
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
};

export default skillExecutor;
