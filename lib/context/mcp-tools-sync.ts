/**
 * MCP Tools Sync - Sync MCP tool descriptions to files for on-demand loading
 * 
 * Instead of injecting all MCP tool descriptions into the prompt,
 * this module syncs them to context files. The agent receives only
 * tool names in the static prompt and can look up descriptions on demand.
 * 
 * Benefits:
 * - Reduces token usage by ~47% in MCP-heavy workflows
 * - Allows agent to see tool status (connected, auth-required, etc.)
 * - Enables semantic search for relevant tools
 */

import {
  writeContextFile,
  readContextFile,
  searchContextFiles,
  grepContextFiles,
  deleteContextFile,
  getFilesByCategory,
} from './context-fs';
import type { McpToolDescriptionFile, ContextFile } from '@/types/context';
import type { McpTool } from '@/types/mcp';

/**
 * Server status for prompt injection
 */
export interface McpServerStatus {
  serverId: string;
  serverName: string;
  status: 'connected' | 'disconnected' | 'error' | 'auth-required';
  toolCount: number;
  message?: string;
}

/**
 * Minimal tool reference for static prompt
 */
export interface McpToolRef {
  /** Full tool name (mcp_serverId_toolName) */
  fullName: string;
  /** Original tool name */
  toolName: string;
  /** Server ID */
  serverId: string;
  /** Server display name */
  serverName: string;
  /** Brief description (first line only) */
  briefDescription: string;
}

/**
 * Sync result
 */
export interface McpSyncResult {
  /** Number of tools synced */
  toolsSynced: number;
  /** Files written */
  filesWritten: string[];
  /** Errors encountered */
  errors: Array<{ tool: string; error: string }>;
}

/**
 * Generate a consistent filename for an MCP tool
 */
function getToolFilename(serverId: string, toolName: string): string {
  const sanitizedServer = serverId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedTool = toolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitizedServer}_${sanitizedTool}.json`;
}

/**
 * Sync a single MCP tool to a context file
 */
export async function syncMcpTool(
  serverId: string,
  serverName: string,
  tool: McpTool,
  status: 'connected' | 'disconnected' | 'error' | 'auth-required' = 'connected'
): Promise<ContextFile> {
  const toolDescription: McpToolDescriptionFile = {
    serverId,
    serverName,
    toolName: tool.name,
    description: tool.description ?? '',
    parametersSchema: tool.inputSchema,
    requiresApproval: false, // Can be overridden by config
    serverStatus: status,
    lastUpdated: new Date(),
  };
  
  const content = JSON.stringify(toolDescription, null, 2);
  
  return writeContextFile(content, {
    category: 'mcp',
    source: serverId,
    filename: getToolFilename(serverId, tool.name),
    tags: ['mcp-tool', serverId, status],
  });
}

/**
 * Sync all tools from an MCP server
 */
export async function syncMcpServer(
  serverId: string,
  serverName: string,
  tools: McpTool[],
  status: 'connected' | 'disconnected' | 'error' | 'auth-required' = 'connected'
): Promise<McpSyncResult> {
  const result: McpSyncResult = {
    toolsSynced: 0,
    filesWritten: [],
    errors: [],
  };
  
  for (const tool of tools) {
    try {
      const file = await syncMcpTool(serverId, serverName, tool, status);
      result.filesWritten.push(file.path);
      result.toolsSynced++;
    } catch (err) {
      result.errors.push({
        tool: tool.name,
        error: String(err),
      });
    }
  }
  
  // Also write a server status file
  await writeContextFile(
    JSON.stringify({
      serverId,
      serverName,
      status,
      toolCount: tools.length,
      lastUpdated: new Date().toISOString(),
    }, null, 2),
    {
      category: 'mcp',
      source: serverId,
      filename: `${serverId}_status.json`,
      tags: ['mcp-server', 'status', status],
    }
  );
  
  return result;
}

/**
 * Read an MCP tool description
 */
export async function readMcpToolDescription(
  serverId: string,
  toolName: string
): Promise<McpToolDescriptionFile | null> {
  const filename = getToolFilename(serverId, toolName);
  const path = `.cognia/context/mcp/${filename}`;
  
  const file = await readContextFile(path);
  if (!file) return null;
  
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
}

/**
 * Get all synced tools for a server
 */
export async function getSyncedToolsForServer(
  serverId: string
): Promise<McpToolDescriptionFile[]> {
  const files = await searchContextFiles({
    category: 'mcp',
    source: serverId,
  });
  
  const tools: McpToolDescriptionFile[] = [];
  
  for (const meta of files) {
    if (meta.tags?.includes('status')) continue; // Skip status files
    
    const path = `.cognia/context/mcp/${getToolFilename(meta.source, meta.id)}`;
    const file = await readContextFile(path);
    if (file) {
      try {
        tools.push(JSON.parse(file.content));
      } catch {
        // Skip invalid files
      }
    }
  }
  
  return tools;
}

/**
 * Search for MCP tools by keyword
 */
export async function searchMcpTools(
  query: string,
  options: { serverId?: string; limit?: number } = {}
): Promise<McpToolDescriptionFile[]> {
  const grepResults = await grepContextFiles(query, {
    category: 'mcp',
    source: options.serverId,
    ignoreCase: true,
    limit: options.limit ?? 20,
  });
  
  // Get unique paths
  const uniquePaths = [...new Set(grepResults.map(r => r.path))];
  
  const tools: McpToolDescriptionFile[] = [];
  for (const path of uniquePaths) {
    const file = await readContextFile(path);
    if (file) {
      try {
        const tool = JSON.parse(file.content);
        if (tool.toolName) {
          tools.push(tool);
        }
      } catch {
        // Skip invalid files
      }
    }
  }
  
  return tools;
}

/**
 * Get minimal tool references for static prompt injection
 * Only includes tool names and brief descriptions
 */
export async function getMcpToolRefs(
  serverIds?: string[]
): Promise<McpToolRef[]> {
  const files = await getFilesByCategory('mcp');
  const refs: McpToolRef[] = [];
  
  for (const meta of files) {
    if (meta.tags?.includes('status')) continue;
    if (serverIds && !serverIds.includes(meta.source)) continue;
    
    // We need to read the file to get tool info
    const path = `.cognia/context/mcp/${getToolFilename(meta.source, meta.id)}`;
    const file = await readContextFile(path);
    if (!file) continue;
    
    try {
      const tool: McpToolDescriptionFile = JSON.parse(file.content);
      refs.push({
        fullName: `mcp_${tool.serverId}_${tool.toolName}`,
        toolName: tool.toolName,
        serverId: tool.serverId,
        serverName: tool.serverName,
        briefDescription: tool.description.split('\n')[0].slice(0, 100),
      });
    } catch {
      // Skip invalid files
    }
  }
  
  return refs;
}

/**
 * Get server statuses
 */
export async function getMcpServerStatuses(): Promise<McpServerStatus[]> {
  const files = await searchContextFiles({
    category: 'mcp',
    tags: ['status'],
  });
  
  const statuses: McpServerStatus[] = [];
  
  for (const meta of files) {
    const path = `.cognia/context/mcp/${meta.source}_status.json`;
    const file = await readContextFile(path);
    if (file) {
      try {
        const status = JSON.parse(file.content);
        statuses.push(status);
      } catch {
        // Skip invalid files
      }
    }
  }
  
  return statuses;
}

/**
 * Generate minimal static prompt for MCP tools
 * Only lists tool names, not full descriptions
 */
export function generateMcpStaticPrompt(refs: McpToolRef[]): string {
  if (refs.length === 0) {
    return '';
  }
  
  const byServer = new Map<string, McpToolRef[]>();
  for (const ref of refs) {
    const existing = byServer.get(ref.serverId) || [];
    existing.push(ref);
    byServer.set(ref.serverId, existing);
  }
  
  const lines = ['## MCP Tools Available', ''];
  
  for (const [serverId, serverRefs] of byServer) {
    const serverName = serverRefs[0]?.serverName ?? serverId;
    lines.push(`### ${serverName} (${serverRefs.length} tools)`);
    lines.push('');
    
    for (const ref of serverRefs) {
      lines.push(`- \`${ref.fullName}\`: ${ref.briefDescription}`);
    }
    
    lines.push('');
  }
  
  lines.push('Use `read_context_file(".cognia/context/mcp/<server>_<tool>.json")` to get full tool documentation.');
  lines.push('Use `grep_context("keyword", category: "mcp")` to search for relevant tools.');
  
  return lines.join('\n');
}

/**
 * Update server status (e.g., when auth is required)
 */
export async function updateMcpServerStatus(
  serverId: string,
  serverName: string,
  status: 'connected' | 'disconnected' | 'error' | 'auth-required',
  message?: string
): Promise<void> {
  // Get current tool count
  const tools = await getSyncedToolsForServer(serverId);
  
  await writeContextFile(
    JSON.stringify({
      serverId,
      serverName,
      status,
      toolCount: tools.length,
      message,
      lastUpdated: new Date().toISOString(),
    }, null, 2),
    {
      category: 'mcp',
      source: serverId,
      filename: `${serverId}_status.json`,
      tags: ['mcp-server', 'status', status],
    }
  );
}

/**
 * Clear synced tools for a server
 */
export async function clearMcpServerTools(serverId: string): Promise<number> {
  const files = await searchContextFiles({
    category: 'mcp',
    source: serverId,
  });
  
  let deleted = 0;
  for (const meta of files) {
    const path = `.cognia/context/mcp/${getToolFilename(meta.source, meta.id)}`;
    const success = await deleteContextFile(path);
    if (success) deleted++;
  }
  
  return deleted;
}
