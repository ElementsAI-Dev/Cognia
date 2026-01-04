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
} from '@/types/mcp';

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

const mcpToolsAdapter = {
  convertMcpToolToAgentTool,
  convertMcpServerTools,
  convertAllMcpTools,
  createMcpToolsFromStore,
  getMcpToolDescriptions,
  filterMcpToolsByServers,
  getMcpToolByOriginalName,
  formatMcpToolResult,
};

export default mcpToolsAdapter;
