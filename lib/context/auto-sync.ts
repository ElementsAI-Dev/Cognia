/**
 * Auto-Sync Service - Automatic context synchronization
 * 
 * Provides automatic synchronization of MCP tools, skills, and terminal sessions
 * to context files, enabling dynamic discovery by the agent.
 */

import { syncMcpServer, type McpSyncResult } from './mcp-tools-sync';
import { syncSkills } from './skills-sync';
import type { McpTool } from '@/types/mcp';
import type { Skill } from '@/types/system/skill';

/**
 * Sync configuration
 */
export interface AutoSyncConfig {
  /** Enable MCP tools sync */
  syncMcpTools?: boolean;
  /** Enable skills sync */
  syncSkills?: boolean;
  /** Sync interval in ms (0 = manual only) */
  syncIntervalMs?: number;
  /** Callback when sync completes */
  onSyncComplete?: (result: AutoSyncResult) => void;
}

/**
 * Result of auto-sync operation
 */
export interface AutoSyncResult {
  /** MCP sync results by server */
  mcp: Map<string, McpSyncResult>;
  /** Skills sync result */
  skills: { synced: number; errors: Array<{ skillId: string; error: string }> };
  /** Total time taken */
  durationMs: number;
  /** Timestamp */
  syncedAt: Date;
}

/**
 * Auto-sync service state
 */
let syncIntervalId: NodeJS.Timeout | null = null;
let lastSyncResult: AutoSyncResult | null = null;

/**
 * Sync all MCP servers
 */
export async function syncAllMcpServers(
  servers: Array<{
    id: string;
    name: string;
    tools: McpTool[];
    status: 'connected' | 'disconnected' | 'error' | 'auth-required';
  }>
): Promise<Map<string, McpSyncResult>> {
  const results = new Map<string, McpSyncResult>();
  
  for (const server of servers) {
    try {
      const result = await syncMcpServer(
        server.id,
        server.name,
        server.tools,
        server.status
      );
      results.set(server.id, result);
    } catch (error) {
      results.set(server.id, {
        toolsSynced: 0,
        filesWritten: [],
        errors: [{ tool: '*', error: String(error) }],
      });
    }
  }
  
  return results;
}

/**
 * Sync all active skills
 */
export async function syncAllSkills(
  skills: Skill[]
): Promise<{ synced: number; errors: Array<{ skillId: string; error: string }> }> {
  return syncSkills(skills);
}

/**
 * Run a full sync of all context sources
 */
export async function runFullSync(options: {
  mcpServers?: Array<{
    id: string;
    name: string;
    tools: McpTool[];
    status: 'connected' | 'disconnected' | 'error' | 'auth-required';
  }>;
  skills?: Skill[];
}): Promise<AutoSyncResult> {
  const startTime = Date.now();
  
  // Sync MCP tools
  const mcpResults = options.mcpServers
    ? await syncAllMcpServers(options.mcpServers)
    : new Map<string, McpSyncResult>();
  
  // Sync skills
  const skillsResult = options.skills
    ? await syncAllSkills(options.skills)
    : { synced: 0, errors: [] };
  
  const result: AutoSyncResult = {
    mcp: mcpResults,
    skills: skillsResult,
    durationMs: Date.now() - startTime,
    syncedAt: new Date(),
  };
  
  lastSyncResult = result;
  return result;
}

/**
 * Start automatic sync with interval
 */
export function startAutoSync(
  config: AutoSyncConfig,
  getDataFn: () => {
    mcpServers?: Array<{
      id: string;
      name: string;
      tools: McpTool[];
      status: 'connected' | 'disconnected' | 'error' | 'auth-required';
    }>;
    skills?: Skill[];
  }
): void {
  // Stop any existing sync
  stopAutoSync();
  
  if (!config.syncIntervalMs || config.syncIntervalMs <= 0) {
    return;
  }
  
  // Run initial sync
  const runSync = async () => {
    const data = getDataFn();
    const result = await runFullSync({
      mcpServers: config.syncMcpTools ? data.mcpServers : undefined,
      skills: config.syncSkills ? data.skills : undefined,
    });
    config.onSyncComplete?.(result);
  };
  
  // Initial sync
  runSync();
  
  // Set interval
  syncIntervalId = setInterval(runSync, config.syncIntervalMs);
}

/**
 * Stop automatic sync
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

/**
 * Get last sync result
 */
export function getLastSyncResult(): AutoSyncResult | null {
  return lastSyncResult;
}

/**
 * Check if auto-sync is running
 */
export function isAutoSyncRunning(): boolean {
  return syncIntervalId !== null;
}

/**
 * Create a sync trigger that can be called from stores
 * This allows stores to trigger sync when their data changes
 */
export function createSyncTrigger(
  type: 'mcp' | 'skills',
  getData: () => unknown
): () => Promise<void> {
  return async () => {
    const data = getData();
    
    if (type === 'mcp') {
      const servers = data as Array<{
        id: string;
        name: string;
        tools: McpTool[];
        status: 'connected' | 'disconnected' | 'error' | 'auth-required';
      }>;
      await syncAllMcpServers(servers);
    } else if (type === 'skills') {
      const skills = data as Skill[];
      await syncAllSkills(skills);
    }
  };
}
