/**
 * MCP Server Repository - data access layer for MCP servers
 */

import { db, type DBMCPServer } from '../schema';
import type { McpTool } from '@/types/mcp';
import { nanoid } from 'nanoid';

// Simple MCP Server interface for repository storage
export interface StoredMCPServer {
  id: string;
  name: string;
  url: string;
  connected: boolean;
  tools: McpTool[];
  createdAt: Date;
  updatedAt: Date;
}

// Convert DBMCPServer to StoredMCPServer
function toStoredMCPServer(dbServer: DBMCPServer): StoredMCPServer {
  return {
    id: dbServer.id,
    name: dbServer.name,
    url: dbServer.url,
    connected: dbServer.connected,
    tools: dbServer.tools ? JSON.parse(dbServer.tools) : [],
    createdAt: dbServer.createdAt,
    updatedAt: dbServer.updatedAt,
  };
}

// Convert StoredMCPServer to DBMCPServer
function toDBMCPServer(server: StoredMCPServer): DBMCPServer {
  return {
    id: server.id,
    name: server.name,
    url: server.url,
    connected: server.connected,
    tools: server.tools ? JSON.stringify(server.tools) : undefined,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
}

export interface CreateMCPServerInput {
  name: string;
  url: string;
  connected?: boolean;
  tools?: McpTool[];
}

export interface UpdateMCPServerInput {
  name?: string;
  url?: string;
  connected?: boolean;
  tools?: McpTool[];
}

export const mcpServerRepository = {
  /**
   * Get all MCP servers
   */
  async getAll(): Promise<StoredMCPServer[]> {
    const servers = await db.mcpServers.orderBy('name').toArray();
    return servers.map(toStoredMCPServer);
  },

  /**
   * Get a single MCP server by ID
   */
  async getById(id: string): Promise<StoredMCPServer | undefined> {
    const server = await db.mcpServers.get(id);
    return server ? toStoredMCPServer(server) : undefined;
  },

  /**
   * Get MCP server by name
   */
  async getByName(name: string): Promise<StoredMCPServer | undefined> {
    const server = await db.mcpServers.where('name').equals(name).first();
    return server ? toStoredMCPServer(server) : undefined;
  },

  /**
   * Get MCP server by URL
   */
  async getByUrl(url: string): Promise<StoredMCPServer | undefined> {
    const server = await db.mcpServers.where('url').equals(url).first();
    return server ? toStoredMCPServer(server) : undefined;
  },

  /**
   * Get connected servers
   */
  async getConnected(): Promise<StoredMCPServer[]> {
    const servers = await db.mcpServers
      .filter((server) => server.connected === true)
      .toArray();
    return servers.map(toStoredMCPServer);
  },

  /**
   * Get disconnected servers
   */
  async getDisconnected(): Promise<StoredMCPServer[]> {
    const servers = await db.mcpServers
      .filter((server) => server.connected === false)
      .toArray();
    return servers.map(toStoredMCPServer);
  },

  /**
   * Create a new MCP server
   */
  async create(input: CreateMCPServerInput): Promise<StoredMCPServer> {
    const now = new Date();
    const server: StoredMCPServer = {
      id: nanoid(),
      name: input.name,
      url: input.url,
      connected: input.connected ?? false,
      tools: input.tools ?? [],
      createdAt: now,
      updatedAt: now,
    };

    await db.mcpServers.add(toDBMCPServer(server));
    return server;
  },

  /**
   * Update an existing MCP server
   */
  async update(id: string, updates: UpdateMCPServerInput): Promise<StoredMCPServer | undefined> {
    const existing = await db.mcpServers.get(id);
    if (!existing) return undefined;

    const updateData: Partial<DBMCPServer> = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.url !== undefined) updateData.url = updates.url;
    if (updates.connected !== undefined) updateData.connected = updates.connected;
    if (updates.tools !== undefined) updateData.tools = JSON.stringify(updates.tools);

    await db.mcpServers.update(id, updateData);
    const updated = await db.mcpServers.get(id);
    return updated ? toStoredMCPServer(updated) : undefined;
  },

  /**
   * Delete an MCP server
   */
  async delete(id: string): Promise<void> {
    await db.mcpServers.delete(id);
  },

  /**
   * Update connection status
   */
  async setConnectionStatus(id: string, connected: boolean): Promise<void> {
    await db.mcpServers.update(id, {
      connected,
      updatedAt: new Date(),
    });
  },

  /**
   * Update tools for a server
   */
  async updateTools(id: string, tools: McpTool[]): Promise<void> {
    await db.mcpServers.update(id, {
      tools: JSON.stringify(tools),
      updatedAt: new Date(),
    });
  },

  /**
   * Get server count
   */
  async getCount(): Promise<number> {
    return db.mcpServers.count();
  },

  /**
   * Get connected server count
   */
  async getConnectedCount(): Promise<number> {
    return db.mcpServers.filter((s) => s.connected === true).count();
  },

  /**
   * Check if server exists by URL
   */
  async existsByUrl(url: string): Promise<boolean> {
    const server = await db.mcpServers.where('url').equals(url).first();
    return server !== undefined;
  },

  /**
   * Bulk create servers
   */
  async bulkCreate(inputs: CreateMCPServerInput[]): Promise<StoredMCPServer[]> {
    const now = new Date();
    const servers: StoredMCPServer[] = inputs.map((input) => ({
      id: nanoid(),
      name: input.name,
      url: input.url,
      connected: input.connected ?? false,
      tools: input.tools ?? [],
      createdAt: now,
      updatedAt: now,
    }));

    const dbServers = servers.map(toDBMCPServer);
    await db.mcpServers.bulkAdd(dbServers);
    return servers;
  },

  /**
   * Bulk delete servers
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await db.mcpServers.bulkDelete(ids);
  },

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const servers = await db.mcpServers.toArray();
    const updates = servers.map((s) => ({
      key: s.id,
      changes: { connected: false, updatedAt: new Date() },
    }));
    
    for (const update of updates) {
      await db.mcpServers.update(update.key, update.changes);
    }
  },

  /**
   * Clear all servers
   */
  async clear(): Promise<void> {
    await db.mcpServers.clear();
  },

  /**
   * Search servers by name
   */
  async searchByName(query: string): Promise<StoredMCPServer[]> {
    const lowerQuery = query.toLowerCase();
    const servers = await db.mcpServers
      .filter((server) => server.name.toLowerCase().includes(lowerQuery))
      .toArray();
    return servers.map(toStoredMCPServer);
  },
};

export default mcpServerRepository;
