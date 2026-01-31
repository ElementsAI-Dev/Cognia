/**
 * Unified Tool Registry - Central registry for all agent tools
 * 
 * This module provides a unified interface for managing tools from different sources:
 * - Built-in tools (calculator, web search, RAG, etc.)
 * - Skill-based tools
 * - MCP server tools
 * - Custom tools
 * 
 * Features:
 * - Centralized tool registration and discovery
 * - Tool categorization and filtering
 * - Dynamic tool updates
 * - Tool metadata and descriptions
 * 
 * Note: This registry manages runtime AgentTool instances and complements the
 * existing ToolRegistry (registry.ts) which manages ToolDefinition factories.
 * Use this registry for dynamic tool management at runtime, and the existing
 * ToolRegistry for static tool definitions.
 */

import type { AgentTool } from '../agent/agent-executor';
import type { Skill } from '@/types/system/skill';
import type { McpServerState, ToolCallResult } from '@/types/mcp';
import type { RAGConfig } from '../rag';
import { getGlobalToolRegistry } from './registry';

/**
 * Tool source types
 */
export type ToolSource = 'builtin' | 'skill' | 'mcp' | 'custom';

/**
 * Tool category for organization
 */
export type ToolCategory = 
  | 'search'      // Web search, RAG search
  | 'compute'     // Calculator, code execution
  | 'file'        // File operations
  | 'document'    // Document processing
  | 'design'      // Designer tools
  | 'external'    // MCP and external tools
  | 'skill'       // Skill-based tools
  | 'video'       // Video generation and analysis
  | 'image'       // Image generation and editing
  | 'academic'    // Academic search and analysis
  | 'ppt'         // Presentation generation
  | 'learning'    // Learning/generative UI tools
  | 'system'      // Process management, system tools
  | 'other';      // Uncategorized

/**
 * Extended tool metadata
 */
export interface ToolMetadata {
  name: string;
  description: string;
  source: ToolSource;
  category: ToolCategory;
  sourceId?: string;        // Skill ID, MCP server ID, etc.
  sourceName?: string;      // Human-readable source name
  requiresApproval: boolean;
  isEnabled: boolean;
  tags?: string[];
  version?: string;
}

/**
 * Partial metadata for registration (name, description, requiresApproval, isEnabled are auto-filled)
 */
export type ToolRegistrationMetadata = Partial<Omit<ToolMetadata, 'name' | 'description' | 'requiresApproval'>> & {
  source: ToolSource;
  category: ToolCategory;
};

/**
 * Registered tool with metadata
 */
export interface RegisteredTool {
  tool: AgentTool;
  metadata: ToolMetadata;
}

/**
 * Tool registry configuration
 */
export interface ToolRegistryConfig {
  enableBuiltinTools?: boolean;
  enableSkillTools?: boolean;
  enableMcpTools?: boolean;
  enableCustomTools?: boolean;
  defaultRequireApproval?: boolean;
}

/**
 * Tool filter options
 */
export interface ToolFilterOptions {
  sources?: ToolSource[];
  categories?: ToolCategory[];
  sourceIds?: string[];
  tags?: string[];
  requiresApproval?: boolean;
  isEnabled?: boolean;
  searchQuery?: string;
}

/**
 * Unified Tool Registry class
 */
export class UnifiedToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private config: ToolRegistryConfig;
  private listeners: Set<(tools: RegisteredTool[]) => void> = new Set();

  constructor(config: ToolRegistryConfig = {}) {
    this.config = {
      enableBuiltinTools: true,
      enableSkillTools: true,
      enableMcpTools: true,
      enableCustomTools: true,
      defaultRequireApproval: false,
      ...config,
    };
  }

  /**
   * Register a single tool
   */
  register(
    tool: AgentTool,
    metadata: ToolRegistrationMetadata
  ): void {
    const fullMetadata: ToolMetadata = {
      name: tool.name,
      description: tool.description,
      requiresApproval: tool.requiresApproval ?? this.config.defaultRequireApproval ?? false,
      isEnabled: metadata.isEnabled ?? true,
      source: metadata.source,
      category: metadata.category,
      sourceId: metadata.sourceId,
      sourceName: metadata.sourceName,
      tags: metadata.tags,
      version: metadata.version,
    };

    this.tools.set(tool.name, { tool, metadata: fullMetadata });
    this.notifyListeners();
  }

  /**
   * Register multiple tools at once
   */
  registerBatch(
    tools: Record<string, AgentTool>,
    metadata: ToolRegistrationMetadata
  ): void {
    for (const [name, tool] of Object.entries(tools)) {
      const fullMetadata: ToolMetadata = {
        name,
        description: tool.description,
        requiresApproval: tool.requiresApproval ?? this.config.defaultRequireApproval ?? false,
        isEnabled: metadata.isEnabled ?? true,
        source: metadata.source,
        category: metadata.category,
        sourceId: metadata.sourceId,
        sourceName: metadata.sourceName,
        tags: metadata.tags,
        version: metadata.version,
      };
      this.tools.set(name, { tool, metadata: fullMetadata });
    }
    this.notifyListeners();
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    const result = this.tools.delete(name);
    if (result) {
      this.notifyListeners();
    }
    return result;
  }

  /**
   * Unregister all tools from a specific source
   */
  unregisterBySource(source: ToolSource, sourceId?: string): number {
    let count = 0;
    for (const [name, registered] of this.tools.entries()) {
      if (registered.metadata.source === source) {
        if (!sourceId || registered.metadata.sourceId === sourceId) {
          this.tools.delete(name);
          count++;
        }
      }
    }
    if (count > 0) {
      this.notifyListeners();
    }
    return count;
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools as a record (for agent execution)
   */
  getToolsRecord(filter?: ToolFilterOptions): Record<string, AgentTool> {
    const filtered = this.filter(filter);
    const record: Record<string, AgentTool> = {};
    for (const registered of filtered) {
      if (registered.metadata.isEnabled) {
        record[registered.metadata.name] = registered.tool;
      }
    }
    return record;
  }

  /**
   * Filter tools based on options
   */
  filter(options?: ToolFilterOptions): RegisteredTool[] {
    if (!options) {
      return this.getAll();
    }

    return this.getAll().filter(registered => {
      const { metadata } = registered;

      // Filter by sources
      if (options.sources && !options.sources.includes(metadata.source)) {
        return false;
      }

      // Filter by categories
      if (options.categories && !options.categories.includes(metadata.category)) {
        return false;
      }

      // Filter by source IDs
      if (options.sourceIds && metadata.sourceId && !options.sourceIds.includes(metadata.sourceId)) {
        return false;
      }

      // Filter by tags
      if (options.tags && metadata.tags) {
        const hasMatchingTag = options.tags.some(tag => metadata.tags?.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Filter by approval requirement
      if (options.requiresApproval !== undefined && metadata.requiresApproval !== options.requiresApproval) {
        return false;
      }

      // Filter by enabled status
      if (options.isEnabled !== undefined && metadata.isEnabled !== options.isEnabled) {
        return false;
      }

      // Filter by search query
      if (options.searchQuery) {
        const query = options.searchQuery.toLowerCase();
        const matchesName = metadata.name.toLowerCase().includes(query);
        const matchesDescription = metadata.description.toLowerCase().includes(query);
        const matchesSource = metadata.sourceName?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription && !matchesSource) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Enable or disable a tool
   */
  setEnabled(name: string, enabled: boolean): boolean {
    const registered = this.tools.get(name);
    if (registered) {
      registered.metadata.isEnabled = enabled;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Get tool count by source
   */
  getCountBySource(): Record<ToolSource, number> {
    const counts: Record<ToolSource, number> = {
      builtin: 0,
      skill: 0,
      mcp: 0,
      custom: 0,
    };

    for (const registered of this.tools.values()) {
      counts[registered.metadata.source]++;
    }

    return counts;
  }

  /**
   * Get tool descriptions for display
   */
  getDescriptions(filter?: ToolFilterOptions): ToolMetadata[] {
    return this.filter(filter).map(r => r.metadata);
  }

  /**
   * Subscribe to tool changes
   */
  subscribe(listener: (tools: RegisteredTool[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const tools = this.getAll();
    for (const listener of this.listeners) {
      listener(tools);
    }
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    this.notifyListeners();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    bySource: Record<ToolSource, number>;
    byCategory: Record<ToolCategory, number>;
  } {
    const all = this.getAll();
    const bySource = this.getCountBySource();
    const byCategory: Record<ToolCategory, number> = {
      search: 0,
      compute: 0,
      file: 0,
      document: 0,
      design: 0,
      external: 0,
      skill: 0,
      video: 0,
      image: 0,
      academic: 0,
      ppt: 0,
      learning: 0,
      system: 0,
      other: 0,
    };

    let enabled = 0;
    let disabled = 0;

    for (const registered of all) {
      if (registered.metadata.isEnabled) {
        enabled++;
      } else {
        disabled++;
      }
      byCategory[registered.metadata.category]++;
    }

    return {
      total: all.length,
      enabled,
      disabled,
      bySource,
      byCategory,
    };
  }
}

/**
 * Global registry instance
 */
let globalRegistry: UnifiedToolRegistry | null = null;

/**
 * Get the global tool registry
 */
export function getUnifiedToolRegistry(): UnifiedToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new UnifiedToolRegistry();
  }
  return globalRegistry;
}

/**
 * Set the global tool registry
 */
export function setUnifiedToolRegistry(registry: UnifiedToolRegistry): void {
  globalRegistry = registry;
}

/**
 * Helper to determine tool category from tool name/description
 */
export function inferToolCategory(name: string, description: string): ToolCategory {
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();

  // Video tools
  if (lowerName.includes('video') || lowerName.includes('subtitle') || lowerDesc.includes('video') || lowerDesc.includes('subtitle') || lowerDesc.includes('transcri')) {
    return 'video';
  }
  // Image tools
  if (lowerName.includes('image') || lowerDesc.includes('image') || lowerDesc.includes('dall-e') || lowerDesc.includes('imagen')) {
    return 'image';
  }
  // Academic tools
  if (lowerName.includes('academic') || lowerName.includes('paper') || lowerDesc.includes('academic') || lowerDesc.includes('paper') || lowerDesc.includes('arxiv')) {
    return 'academic';
  }
  // PPT tools
  if (lowerName.includes('ppt') || lowerName.includes('slide') || lowerDesc.includes('presentation') || lowerDesc.includes('powerpoint')) {
    return 'ppt';
  }
  // Learning tools
  if (lowerName.includes('flashcard') || lowerName.includes('quiz') || lowerName.includes('review') || lowerName.includes('learning') || lowerDesc.includes('flashcard') || lowerDesc.includes('quiz')) {
    return 'learning';
  }
  // Search tools
  if (lowerName.includes('search') || lowerName.includes('rag') || lowerName.includes('scrape') || lowerDesc.includes('search') || lowerDesc.includes('scrape')) {
    return 'search';
  }
  // Compute tools
  if (lowerName.includes('calc') || lowerName.includes('code') || lowerDesc.includes('calculate') || lowerDesc.includes('execute')) {
    return 'compute';
  }
  // File tools
  if (lowerName.includes('file') || lowerDesc.includes('file')) {
    return 'file';
  }
  // Document tools
  if (lowerName.includes('doc') || lowerDesc.includes('document')) {
    return 'document';
  }
  // Design tools
  if (lowerName.includes('design') || lowerDesc.includes('design')) {
    return 'design';
  }
  // MCP/External tools
  if (lowerName.includes('mcp') || lowerName.startsWith('mcp_')) {
    return 'external';
  }
  // Skill tools
  if (lowerName.includes('skill')) {
    return 'skill';
  }
  // System tools (process management, environment)
  if (lowerName.includes('process') || lowerName.includes('terminate') || 
      lowerName.includes('program') || lowerDesc.includes('process') ||
      lowerDesc.includes('terminate') || lowerName.includes('env') ||
      lowerName.includes('venv') || lowerDesc.includes('virtual environment')) {
    return 'system';
  }

  return 'other';
}

/**
 * Register built-in tools to the registry
 * Can use tools directly or fetch from the global ToolRegistry
 */
export function registerBuiltinTools(
  registry: UnifiedToolRegistry,
  tools: Record<string, AgentTool>
): void {
  for (const [name, tool] of Object.entries(tools)) {
    // Check if tool exists in global ToolRegistry for category info
    const globalRegistry = getGlobalToolRegistry();
    const toolDef = globalRegistry.get(name);
    const category = toolDef?.category 
      ? (toolDef.category as ToolCategory)
      : inferToolCategory(name, tool.description);
    
    registry.register(tool, {
      source: 'builtin',
      category,
    });
  }
}

/**
 * Register skill tools to the registry
 */
export function registerSkillTools(
  registry: UnifiedToolRegistry,
  skills: Skill[],
  skillTools: Record<string, AgentTool>
): void {
  for (const [name, tool] of Object.entries(skillTools)) {
    // Find the skill this tool belongs to
    const skill = skills.find(s => name.includes(s.id) || name.includes(s.metadata.name.toLowerCase().replace(/\s+/g, '_')));
    
    registry.register(tool, {
      source: 'skill',
      category: 'skill',
      sourceId: skill?.id,
      sourceName: skill?.metadata.name,
      tags: undefined, // Skills don't have tags in metadata
    });
  }
}

/**
 * Register MCP tools to the registry
 */
export function registerMcpTools(
  registry: UnifiedToolRegistry,
  servers: McpServerState[],
  mcpTools: Record<string, AgentTool>
): void {
  for (const [name, tool] of Object.entries(mcpTools)) {
    // Extract server ID from tool name (format: mcp_serverId_toolName)
    const match = name.match(/^mcp_([^_]+)_/);
    const serverId = match?.[1];
    const server = servers.find(s => s.id === serverId);

    registry.register(tool, {
      source: 'mcp',
      category: 'external',
      sourceId: serverId,
      sourceName: server?.name,
    });
  }
}

/**
 * Register custom tools to the registry
 */
export function registerCustomTools(
  registry: UnifiedToolRegistry,
  tools: Record<string, AgentTool>
): void {
  for (const [name, tool] of Object.entries(tools)) {
    registry.register(tool, {
      source: 'custom',
      category: inferToolCategory(name, tool.description),
    });
  }
}

// Type exports for external use
export type {
  AgentTool,
  Skill,
  McpServerState,
  ToolCallResult,
  RAGConfig,
};
