/**
 * MCP Tools Adapter - Convert MCP tools to AgentTool format
 * 
 * This module bridges the MCP (Model Context Protocol) tool system with
 * the Agent execution system, allowing MCP tools to be used seamlessly
 * within agent workflows.
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import type {
  McpTool,
  McpServerState,
  ToolCallResult,
  ContentItem,
  McpToolSelectionConfig,
  ToolUsageRecord,
  ToolSelectionResult,
  ToolSelectionContext,
  ScoredTool,
} from '@/types/mcp';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';

/**
 * Configuration for MCP tool adapter
 */
export interface McpToolAdapterConfig {
  /** Function to call MCP tools */
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  /** Whether to require approval for MCP tools */
  requireApproval?: boolean;
  /** Timeout for tool execution in milliseconds */
  timeout?: number;
  /** Custom error handler */
  onError?: (error: Error, serverId: string, toolName: string) => void;
}

/**
 * Convert JSON Schema to Zod schema
 * Handles common JSON Schema types used in MCP tools
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodType {
  const type = schema.type as string;
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = schema.required as string[] | undefined;

  if (type === 'object' && properties) {
    const shape: Record<string, z.ZodType> = {};
    
    for (const [key, propSchema] of Object.entries(properties)) {
      let zodType = jsonSchemaToZod(propSchema);
      
      // Make optional if not in required array
      if (!required?.includes(key)) {
        zodType = zodType.optional();
      }
      
      // Add description if available
      if (propSchema.description) {
        zodType = zodType.describe(propSchema.description as string);
      }
      
      shape[key] = zodType;
    }
    
    return z.object(shape);
  }

  switch (type) {
    case 'string':
      if (schema.enum) {
        return z.enum(schema.enum as [string, ...string[]]);
      }
      return z.string();
    case 'number':
    case 'integer':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      const items = schema.items as Record<string, unknown> | undefined;
      if (items) {
        return z.array(jsonSchemaToZod(items));
      }
      return z.array(z.unknown());
    case 'null':
      return z.null();
    default:
      return z.unknown();
  }
}

/**
 * Format MCP tool result content for display
 */
export function formatMcpToolResult(result: ToolCallResult): string {
  return result.content.map((item: ContentItem) => {
    switch (item.type) {
      case 'text':
        return item.text;
      case 'image':
        return `[Image: ${item.mimeType}]`;
      case 'resource':
        return item.resource.text || `[Resource: ${item.resource.uri}]`;
      default:
        return '[Unknown content]';
    }
  }).join('\n');
}

/**
 * Check if a tool name is an MCP tool
 */
export function isMcpTool(toolName: string): boolean {
  return toolName.startsWith('mcp_');
}

/**
 * Extract MCP server info from tool name
 * MCP tools follow the pattern: mcp_${serverId}_${toolName}
 */
export function extractMcpServerInfo(toolName: string): { serverId: string; originalToolName: string } | null {
  if (!isMcpTool(toolName)) return null;
  
  // Remove 'mcp_' prefix and split by underscore
  const withoutPrefix = toolName.slice(4); // Remove 'mcp_'
  const firstUnderscoreIdx = withoutPrefix.indexOf('_');
  
  if (firstUnderscoreIdx === -1) return null;
  
  return {
    serverId: withoutPrefix.slice(0, firstUnderscoreIdx),
    originalToolName: withoutPrefix.slice(firstUnderscoreIdx + 1),
  };
}

/**
 * Convert a single MCP tool to AgentTool format
 */
export function convertMcpToolToAgentTool(
  serverId: string,
  serverName: string,
  mcpTool: McpTool,
  config: McpToolAdapterConfig
): AgentTool {
  const { callTool, requireApproval = false, timeout = 30000, onError } = config;

  // Convert JSON Schema to Zod
  let parameters: z.ZodType;
  try {
    parameters = jsonSchemaToZod(mcpTool.inputSchema);
  } catch {
    // Fallback to accepting any object if schema conversion fails
    parameters = z.record(z.string(), z.unknown());
  }

  // Create unique tool name with server prefix
  const toolName = `mcp_${serverId}_${mcpTool.name}`.replace(/[^a-zA-Z0-9_]/g, '_');

  return {
    name: toolName,
    description: `[MCP: ${serverName}] ${mcpTool.description || mcpTool.name}`,
    parameters,
    execute: async (args: Record<string, unknown>) => {
      const startTime = Date.now();
      
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`MCP tool timeout after ${timeout}ms`)), timeout);
        });

        // Execute the tool with timeout
        const result = await Promise.race([
          callTool(serverId, mcpTool.name, args),
          timeoutPromise,
        ]);

        const duration = Date.now() - startTime;

        if (result.isError) {
          return {
            success: false,
            error: formatMcpToolResult(result),
            serverId,
            serverName,
            toolName: mcpTool.name,
            duration,
          };
        }

        return {
          success: true,
          result: formatMcpToolResult(result),
          serverId,
          serverName,
          toolName: mcpTool.name,
          duration,
          rawContent: result.content,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'MCP tool execution failed';
        onError?.(error instanceof Error ? error : new Error(errorMessage), serverId, mcpTool.name);
        
        return {
          success: false,
          error: errorMessage,
          serverId,
          serverName,
          toolName: mcpTool.name,
          duration: Date.now() - startTime,
        };
      }
    },
    requiresApproval: requireApproval,
  };
}

/**
 * Convert all tools from an MCP server to AgentTool format
 */
export function convertMcpServerTools(
  server: McpServerState,
  config: McpToolAdapterConfig
): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {};

  // Only process connected servers with tools
  if (server.status.type !== 'connected' || !server.tools || server.tools.length === 0) {
    return tools;
  }

  for (const mcpTool of server.tools) {
    const agentTool = convertMcpToolToAgentTool(
      server.id,
      server.name,
      mcpTool,
      config
    );
    tools[agentTool.name] = agentTool;
  }

  return tools;
}

/**
 * Convert all tools from multiple MCP servers to AgentTool format
 */
export function convertAllMcpTools(
  servers: McpServerState[],
  config: McpToolAdapterConfig
): Record<string, AgentTool> {
  const allTools: Record<string, AgentTool> = {};

  for (const server of servers) {
    const serverTools = convertMcpServerTools(server, config);
    Object.assign(allTools, serverTools);
  }

  return allTools;
}

/**
 * Create MCP tools from store state
 * This is a convenience function for use with useMcpStore
 */
export function createMcpToolsFromStore(
  servers: McpServerState[],
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>,
  options: Partial<Omit<McpToolAdapterConfig, 'callTool'>> = {}
): Record<string, AgentTool> {
  return convertAllMcpTools(servers, {
    callTool,
    requireApproval: options.requireApproval ?? false,
    timeout: options.timeout ?? 30000,
    onError: options.onError,
  });
}

/**
 * Create MCP tools using the getAllTools API from Rust backend
 * This is more efficient as it fetches all tools in a single call
 * 
 * @param getAllTools - Function from useMcpStore that calls Rust backend
 * @param callTool - Function from useMcpStore to execute tool calls
 * @param servers - Server states for name lookup
 * @param options - Additional configuration options
 */
export async function createMcpToolsFromBackend(
  getAllTools: () => Promise<Array<{ serverId: string; tool: McpTool }>>,
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>,
  servers: McpServerState[],
  options: Partial<Omit<McpToolAdapterConfig, 'callTool'>> = {}
): Promise<Record<string, AgentTool>> {
  const tools: Record<string, AgentTool> = {};
  
  try {
    // Use the Rust backend to get all tools efficiently
    const allTools = await getAllTools();
    
    const config: McpToolAdapterConfig = {
      callTool,
      requireApproval: options.requireApproval ?? false,
      timeout: options.timeout ?? 30000,
      onError: options.onError,
    };
    
    for (const { serverId, tool: mcpTool } of allTools) {
      // Find server name for display
      const server = servers.find(s => s.id === serverId);
      const serverName = server?.name || serverId;
      
      const agentTool = convertMcpToolToAgentTool(
        serverId,
        serverName,
        mcpTool,
        config
      );
      tools[agentTool.name] = agentTool;
    }
  } catch (error) {
    console.error('Failed to get MCP tools from backend:', error);
  }
  
  return tools;
}

/**
 * Get tool descriptions for MCP tools (for display purposes)
 */
export function getMcpToolDescriptions(
  servers: McpServerState[]
): Array<{
  serverId: string;
  serverName: string;
  toolName: string;
  description: string;
  isConnected: boolean;
}> {
  const descriptions: Array<{
    serverId: string;
    serverName: string;
    toolName: string;
    description: string;
    isConnected: boolean;
  }> = [];

  for (const server of servers) {
    const isConnected = server.status.type === 'connected';
    
    for (const tool of server.tools || []) {
      descriptions.push({
        serverId: server.id,
        serverName: server.name,
        toolName: tool.name,
        description: tool.description || tool.name,
        isConnected,
      });
    }
  }

  return descriptions;
}

/**
 * Filter MCP tools by server IDs
 */
export function filterMcpToolsByServers(
  tools: Record<string, AgentTool>,
  serverIds: string[]
): Record<string, AgentTool> {
  const filtered: Record<string, AgentTool> = {};
  
  for (const [name, tool] of Object.entries(tools)) {
    // Check if tool name starts with any of the allowed server prefixes
    const matchesServer = serverIds.some(serverId => 
      name.startsWith(`mcp_${serverId}_`)
    );
    
    if (matchesServer) {
      filtered[name] = tool;
    }
  }
  
  return filtered;
}

/**
 * Get MCP tool by original name (without prefix)
 */
export function getMcpToolByOriginalName(
  tools: Record<string, AgentTool>,
  serverId: string,
  originalToolName: string
): AgentTool | undefined {
  const prefixedName = `mcp_${serverId}_${originalToolName}`.replace(/[^a-zA-Z0-9_]/g, '_');
  return tools[prefixedName];
}

// =============================================================================
// Intelligent Tool Selection
// =============================================================================

/**
 * Tokenize text into lowercase words for matching
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Calculate word overlap score between two token sets
 */
function calculateOverlap(tokens1: string[], tokens2: string[]): number {
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  const set2 = new Set(tokens2);
  const matches = tokens1.filter(t => set2.has(t)).length;
  
  // Jaccard-like similarity
  return matches / Math.max(tokens1.length, 1);
}

/**
 * Calculate fuzzy name similarity
 */
function calculateNameSimilarity(query: string, toolName: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = toolName.toLowerCase();
  
  // Exact match
  if (queryLower.includes(nameLower) || nameLower.includes(queryLower)) {
    return 1.0;
  }
  
  // Check if any query word matches tool name parts
  const queryTokens = tokenize(query);
  const nameTokens = nameLower.split(/[_\-\s]+/);
  
  let matchScore = 0;
  for (const qt of queryTokens) {
    for (const nt of nameTokens) {
      if (nt.includes(qt) || qt.includes(nt)) {
        matchScore += 0.5;
      }
    }
  }
  
  return Math.min(1.0, matchScore / Math.max(queryTokens.length, 1));
}

/**
 * Calculate history-based boost for a tool
 */
function calculateHistoryBoost(
  toolName: string,
  usageHistory?: Map<string, ToolUsageRecord>
): number {
  if (!usageHistory) return 0;
  
  const record = usageHistory.get(toolName);
  if (!record) return 0;
  
  // Factors: usage count, recency, success rate
  const usageScore = Math.min(1, record.usageCount / 10);
  const successRate = record.usageCount > 0 
    ? record.successCount / record.usageCount 
    : 0;
  
  // Recency: decay over 7 days
  const daysSinceUse = (Date.now() - record.lastUsedAt) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 1 - daysSinceUse / 7);
  
  return (usageScore * 0.4 + successRate * 0.3 + recencyScore * 0.3);
}

/**
 * Score a single tool's relevance to a query
 */
export function scoreMcpToolRelevance(
  tool: AgentTool,
  context: ToolSelectionContext,
  usageHistory?: Map<string, ToolUsageRecord>,
  priorityServerIds?: string[]
): ScoredTool {
  const { query } = context;
  const queryTokens = tokenize(query);
  const descTokens = tokenize(tool.description || '');
  
  // Extract server info from tool name
  const serverInfo = extractMcpServerInfo(tool.name);
  const serverId = serverInfo?.serverId || '';
  
  // Calculate score components
  const descriptionMatch = calculateOverlap(queryTokens, descTokens) * 0.4;
  const nameMatch = calculateNameSimilarity(query, tool.name) * 0.25;
  const historyBoost = calculateHistoryBoost(tool.name, usageHistory) * 0.2;
  
  // Priority boost for preferred servers
  const priorityBoost = priorityServerIds?.includes(serverId) ? 0.15 : 0;
  
  const totalScore = Math.min(1, descriptionMatch + nameMatch + historyBoost + priorityBoost);
  
  return {
    name: tool.name,
    description: tool.description || '',
    serverId,
    serverName: serverInfo?.originalToolName || '',
    relevanceScore: totalScore,
    scoreBreakdown: {
      descriptionMatch,
      nameMatch,
      historyBoost,
      priorityBoost,
    },
  };
}

/**
 * Select relevant MCP tools based on query and configuration
 */
export function selectMcpToolsByRelevance(
  tools: Record<string, AgentTool>,
  context: ToolSelectionContext,
  config: Partial<McpToolSelectionConfig> = {},
  usageHistory?: Map<string, ToolUsageRecord>
): ToolSelectionResult {
  const mergedConfig: McpToolSelectionConfig = {
    ...DEFAULT_TOOL_SELECTION_CONFIG,
    ...config,
  };
  
  const {
    maxTools,
    enableRelevanceScoring,
    minRelevanceScore,
    priorityServerIds,
    alwaysIncludeTools,
    alwaysExcludeTools,
  } = mergedConfig;
  
  const allToolNames = Object.keys(tools);
  const totalAvailable = allToolNames.length;
  
  // If tools count is within limit, return all
  if (totalAvailable <= maxTools && !enableRelevanceScoring) {
    return {
      selectedToolNames: allToolNames,
      excludedToolNames: [],
      totalAvailable,
      selectionReason: 'All tools included (within limit)',
      relevanceScores: {},
      wasLimited: false,
    };
  }
  
  // Score all tools
  const scoredTools: ScoredTool[] = [];
  const relevanceScores: Record<string, number> = {};
  
  for (const [name, tool] of Object.entries(tools)) {
    // Skip excluded tools
    if (alwaysExcludeTools?.includes(name)) continue;
    
    const scored = scoreMcpToolRelevance(
      tool,
      context,
      usageHistory,
      priorityServerIds
    );
    scoredTools.push(scored);
    relevanceScores[name] = scored.relevanceScore;
  }
  
  // Sort by relevance score
  scoredTools.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Build selection
  const selectedToolNames: string[] = [];
  const excludedToolNames: string[] = [];
  
  // First, add always-include tools
  if (alwaysIncludeTools) {
    for (const toolName of alwaysIncludeTools) {
      if (tools[toolName] && !selectedToolNames.includes(toolName)) {
        selectedToolNames.push(toolName);
      }
    }
  }
  
  // Then, add by relevance score
  for (const scored of scoredTools) {
    if (selectedToolNames.length >= maxTools) {
      excludedToolNames.push(scored.name);
      continue;
    }
    
    if (selectedToolNames.includes(scored.name)) continue;
    
    // Check minimum score threshold
    if (enableRelevanceScoring && scored.relevanceScore < minRelevanceScore) {
      excludedToolNames.push(scored.name);
      continue;
    }
    
    selectedToolNames.push(scored.name);
  }
  
  // Add any excluded tools that weren't processed
  for (const name of alwaysExcludeTools || []) {
    if (!excludedToolNames.includes(name)) {
      excludedToolNames.push(name);
    }
  }
  
  const wasLimited = selectedToolNames.length < totalAvailable;
  let selectionReason = wasLimited
    ? `Selected top ${selectedToolNames.length} of ${totalAvailable} tools by relevance`
    : 'All qualifying tools included';
  
  if (enableRelevanceScoring && context.query) {
    selectionReason += ` (query: "${context.query.slice(0, 50)}${context.query.length > 50 ? '...' : ''}")`;
  }
  
  return {
    selectedToolNames,
    excludedToolNames,
    totalAvailable,
    selectionReason,
    relevanceScores,
    wasLimited,
  };
}

/**
 * Filter tools by selection result
 */
export function applyToolSelection(
  tools: Record<string, AgentTool>,
  selection: ToolSelectionResult
): Record<string, AgentTool> {
  const filtered: Record<string, AgentTool> = {};
  
  for (const name of selection.selectedToolNames) {
    if (tools[name]) {
      filtered[name] = tools[name];
    }
  }
  
  return filtered;
}

/**
 * Get MCP tools with automatic selection if needed
 * This is the main entry point for intelligent tool selection
 */
export function getMcpToolsWithSelection(
  tools: Record<string, AgentTool>,
  context: ToolSelectionContext,
  config?: Partial<McpToolSelectionConfig>,
  usageHistory?: Map<string, ToolUsageRecord>
): {
  tools: Record<string, AgentTool>;
  selection: ToolSelectionResult;
} {
  const mergedConfig: McpToolSelectionConfig = {
    ...DEFAULT_TOOL_SELECTION_CONFIG,
    ...config,
  };
  
  const totalTools = Object.keys(tools).length;
  
  // If manual strategy or tools within limit, return all
  if (mergedConfig.strategy === 'manual' || totalTools <= mergedConfig.maxTools) {
    return {
      tools,
      selection: {
        selectedToolNames: Object.keys(tools),
        excludedToolNames: [],
        totalAvailable: totalTools,
        selectionReason: 'All tools included',
        relevanceScores: {},
        wasLimited: false,
      },
    };
  }
  
  // Apply intelligent selection
  const selection = selectMcpToolsByRelevance(tools, context, mergedConfig, usageHistory);
  const selectedTools = applyToolSelection(tools, selection);
  
  return { tools: selectedTools, selection };
}

/**
 * Get recommended tools for a query (for UI suggestions)
 */
export function getRecommendedMcpTools(
  tools: Record<string, AgentTool>,
  query: string,
  limit: number = 5,
  usageHistory?: Map<string, ToolUsageRecord>
): ScoredTool[] {
  const context: ToolSelectionContext = { query };
  const scoredTools: ScoredTool[] = [];
  
  for (const tool of Object.values(tools)) {
    const scored = scoreMcpToolRelevance(tool, context, usageHistory);
    scoredTools.push(scored);
  }
  
  return scoredTools
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}

const mcpToolsAdapter = {
  convertMcpToolToAgentTool,
  convertMcpServerTools,
  convertAllMcpTools,
  createMcpToolsFromStore,
  getMcpToolDescriptions,
  filterMcpToolsByServers,
  getMcpToolByOriginalName,
  formatMcpToolResult,
  // New intelligent selection functions
  scoreMcpToolRelevance,
  selectMcpToolsByRelevance,
  applyToolSelection,
  getMcpToolsWithSelection,
  getRecommendedMcpTools,
};

export default mcpToolsAdapter;
