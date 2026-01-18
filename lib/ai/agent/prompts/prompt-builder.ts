/**
 * PromptBuilder - Composable prompt construction
 */

import type { AgentTool } from '../agent-executor';
import type { MemoryEntry } from '../memory-manager';
import type { Skill } from '@/types/system/skill';
import { getBaseAgentPrompt, type AgentRole } from './base-prompts';
import { getReActPrompt, type ReActStyle } from './react-prompts';
import { getToolCategoryPrompt, type ToolCategory } from './tool-prompts';

interface PromptSection {
  id: string;
  content: string;
  priority: number;
}

export interface PromptBuilderConfig {
  maxLength?: number;
  separator?: string;
  includeSectionHeaders?: boolean;
}

const DEFAULT_CONFIG: PromptBuilderConfig = {
  maxLength: 32000,
  separator: '\n\n---\n\n',
  includeSectionHeaders: true,
};

/**
 * PromptBuilder - Fluent API for composing agent prompts
 */
export class PromptBuilder {
  private sections: PromptSection[] = [];
  private config: PromptBuilderConfig;

  constructor(config: Partial<PromptBuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a base role prompt
   */
  addRole(role: AgentRole, priority: number = 100): this {
    this.sections.push({
      id: `role-${role}`,
      content: getBaseAgentPrompt(role),
      priority,
    });
    return this;
  }

  /**
   * Add ReAct reasoning format
   */
  addReAct(style: ReActStyle = 'standard', priority: number = 90): this {
    const prompt = getReActPrompt(style);
    if (prompt) {
      this.sections.push({
        id: `react-${style}`,
        content: prompt,
        priority,
      });
    }
    return this;
  }

  /**
   * Add tool category guidance
   */
  addToolGuidance(categories: ToolCategory[], priority: number = 70): this {
    for (const category of categories) {
      this.sections.push({
        id: `tools-${category}`,
        content: getToolCategoryPrompt(category),
        priority,
      });
    }
    return this;
  }

  /**
   * Add tool list from available tools
   */
  addTools(tools: Record<string, AgentTool>, priority: number = 60): this {
    if (Object.keys(tools).length === 0) return this;

    const toolList = Object.values(tools)
      .map(t => `- **${t.name}**: ${t.description.slice(0, 100)}${t.description.length > 100 ? '...' : ''}`)
      .join('\n');

    this.sections.push({
      id: 'available-tools',
      content: `## Available Tools\n\n${toolList}`,
      priority,
    });
    return this;
  }

  /**
   * Add memory context
   */
  addMemories(memories: MemoryEntry[], priority: number = 50): this {
    if (memories.length === 0) return this;

    const memoryList = memories
      .map((m, i) => {
        const valueStr = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
        return `${i + 1}. [${m.key}] ${valueStr.slice(0, 200)}${valueStr.length > 200 ? '...' : ''}`;
      })
      .join('\n');

    this.sections.push({
      id: 'memories',
      content: `## Relevant Context from Memory\n\n${memoryList}`,
      priority,
    });
    return this;
  }

  /**
   * Add skill-based prompts
   */
  addSkills(skills: Skill[], priority: number = 80): this {
    if (skills.length === 0) return this;

    for (const skill of skills) {
      let content = `## Skill: ${skill.metadata.name}\n\n`;
      if (skill.metadata.description) {
        content += `${skill.metadata.description}\n\n`;
      }
      if (skill.content) {
        content += skill.content;
      }

      this.sections.push({
        id: `skill-${skill.id}`,
        content,
        priority,
      });
    }
    return this;
  }

  /**
   * Add custom section
   */
  addSection(id: string, content: string, priority: number = 50): this {
    this.sections.push({ id, content, priority });
    return this;
  }

  /**
   * Add capabilities summary
   */
  addCapabilities(capabilities: {
    canSearch?: boolean;
    canExecuteCode?: boolean;
    canAccessFiles?: boolean;
    canCreateArtifacts?: boolean;
    canUseMemory?: boolean;
    customCapabilities?: string[];
  }, priority: number = 85): this {
    const caps: string[] = [];

    if (capabilities.canSearch) caps.push('Search the web for information');
    if (capabilities.canExecuteCode) caps.push('Execute code');
    if (capabilities.canAccessFiles) caps.push('Read and write files');
    if (capabilities.canCreateArtifacts) caps.push('Create visual artifacts');
    if (capabilities.canUseMemory) caps.push('Remember information across sessions');
    if (capabilities.customCapabilities) {
      caps.push(...capabilities.customCapabilities);
    }

    if (caps.length > 0) {
      this.sections.push({
        id: 'capabilities',
        content: `## Your Capabilities\n\nYou can:\n${caps.map(c => `- ${c}`).join('\n')}`,
        priority,
      });
    }
    return this;
  }

  /**
   * Add constraints/limitations
   */
  addConstraints(constraints: string[], priority: number = 95): this {
    if (constraints.length === 0) return this;

    this.sections.push({
      id: 'constraints',
      content: `## Important Constraints\n\n${constraints.map(c => `- ${c}`).join('\n')}`,
      priority,
    });
    return this;
  }

  /**
   * Remove a section by ID
   */
  removeSection(id: string): this {
    this.sections = this.sections.filter(s => s.id !== id);
    return this;
  }

  /**
   * Clear all sections
   */
  clear(): this {
    this.sections = [];
    return this;
  }

  /**
   * Build the final prompt
   */
  build(): string {
    // Sort by priority (higher first)
    const sorted = [...this.sections].sort((a, b) => b.priority - a.priority);

    // Combine sections
    let result = sorted.map(s => s.content).join(this.config.separator);

    // Truncate if necessary
    if (this.config.maxLength && result.length > this.config.maxLength) {
      result = result.slice(0, this.config.maxLength - 3) + '...';
    }

    return result;
  }

  /**
   * Get the current sections (for debugging)
   */
  getSections(): PromptSection[] {
    return [...this.sections];
  }

  /**
   * Get estimated token count (rough)
   */
  getEstimatedTokens(): number {
    const text = this.build();
    // Rough estimate: 4 characters per token
    return Math.ceil(text.length / 4);
  }
}

/**
 * Create a new PromptBuilder instance
 */
export function createPromptBuilder(config?: Partial<PromptBuilderConfig>): PromptBuilder {
  return new PromptBuilder(config);
}

export default PromptBuilder;
