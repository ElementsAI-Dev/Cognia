/**
 * Tests for MCP Server Repository
 */

import 'fake-indexeddb/auto';
import { db } from '../schema';
import { mcpServerRepository } from './mcp-server-repository';

describe('mcpServerRepository', () => {
  beforeEach(async () => {
    await db.mcpServers.clear();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('create', () => {
    it('creates a server with required fields', async () => {
      const server = await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      expect(server.id).toBeDefined();
      expect(server.name).toBe('Test Server');
      expect(server.url).toBe('http://localhost:3000');
      expect(server.connected).toBe(false);
      expect(server.tools).toEqual([]);
    });

    it('creates a server with optional fields', async () => {
      const server = await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
        connected: true,
        tools: [{ name: 'tool1', description: 'A tool', inputSchema: {} }],
      });

      expect(server.connected).toBe(true);
      expect(server.tools).toHaveLength(1);
      expect(server.tools[0].name).toBe('tool1');
    });
  });

  describe('getById', () => {
    it('returns server when found', async () => {
      const created = await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      const found = await mcpServerRepository.getById(created.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Server');
    });

    it('returns undefined when not found', async () => {
      const found = await mcpServerRepository.getById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getByName', () => {
    it('returns server by name', async () => {
      await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      const found = await mcpServerRepository.getByName('Test Server');
      expect(found).toBeDefined();
      expect(found?.url).toBe('http://localhost:3000');
    });
  });

  describe('getByUrl', () => {
    it('returns server by URL', async () => {
      await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      const found = await mcpServerRepository.getByUrl('http://localhost:3000');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Server');
    });
  });

  describe('getAll', () => {
    it('returns all servers', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000' });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002' });

      const all = await mcpServerRepository.getAll();
      expect(all).toHaveLength(2);
    });
  });

  describe('getConnected', () => {
    it('returns only connected servers', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000', connected: true });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002', connected: false });
      await mcpServerRepository.create({ name: 'Server 3', url: 'http://localhost:3003', connected: true });

      const connected = await mcpServerRepository.getConnected();
      expect(connected).toHaveLength(2);
    });
  });

  describe('getDisconnected', () => {
    it('returns only disconnected servers', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000', connected: true });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002', connected: false });

      const disconnected = await mcpServerRepository.getDisconnected();
      expect(disconnected).toHaveLength(1);
      expect(disconnected[0].name).toBe('Server 2');
    });
  });

  describe('update', () => {
    it('updates server fields', async () => {
      const created = await mcpServerRepository.create({
        name: 'Original',
        url: 'http://localhost:3000',
      });

      const updated = await mcpServerRepository.update(created.id, {
        name: 'Updated',
        connected: true,
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.connected).toBe(true);
    });

    it('returns undefined for non-existent server', async () => {
      const result = await mcpServerRepository.update('non-existent', {
        name: 'Test',
      });
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes a server', async () => {
      const created = await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      await mcpServerRepository.delete(created.id);
      const found = await mcpServerRepository.getById(created.id);
      expect(found).toBeUndefined();
    });
  });

  describe('setConnectionStatus', () => {
    it('updates connection status', async () => {
      const created = await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
        connected: false,
      });

      await mcpServerRepository.setConnectionStatus(created.id, true);

      const updated = await mcpServerRepository.getById(created.id);
      expect(updated?.connected).toBe(true);
    });
  });

  describe('updateTools', () => {
    it('updates server tools', async () => {
      const created = await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      await mcpServerRepository.updateTools(created.id, [
        { name: 'tool1', description: 'Tool 1', inputSchema: {} },
        { name: 'tool2', description: 'Tool 2', inputSchema: {} },
      ]);

      const updated = await mcpServerRepository.getById(created.id);
      expect(updated?.tools).toHaveLength(2);
    });
  });

  describe('existsByUrl', () => {
    it('returns true when server exists', async () => {
      await mcpServerRepository.create({
        name: 'Test Server',
        url: 'http://localhost:3000',
      });

      const exists = await mcpServerRepository.existsByUrl('http://localhost:3000');
      expect(exists).toBe(true);
    });

    it('returns false when server does not exist', async () => {
      const exists = await mcpServerRepository.existsByUrl('http://localhost:9999');
      expect(exists).toBe(false);
    });
  });

  describe('bulkCreate', () => {
    it('creates multiple servers', async () => {
      const servers = await mcpServerRepository.bulkCreate([
        { name: 'Server 1', url: 'http://localhost:3000' },
        { name: 'Server 2', url: 'http://localhost:3002' },
      ]);

      expect(servers).toHaveLength(2);
      expect(servers[0].name).toBe('Server 1');
      expect(servers[1].name).toBe('Server 2');
    });
  });

  describe('disconnectAll', () => {
    it('disconnects all servers', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000', connected: true });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002', connected: true });

      await mcpServerRepository.disconnectAll();

      const connected = await mcpServerRepository.getConnected();
      expect(connected).toHaveLength(0);
    });
  });

  describe('searchByName', () => {
    it('finds servers by name', async () => {
      await mcpServerRepository.create({ name: 'Test Server', url: 'http://localhost:3000' });
      await mcpServerRepository.create({ name: 'Production Server', url: 'http://localhost:3002' });
      await mcpServerRepository.create({ name: 'Dev Server', url: 'http://localhost:3003' });

      const results = await mcpServerRepository.searchByName('Server');
      expect(results).toHaveLength(3);

      const testResults = await mcpServerRepository.searchByName('Test');
      expect(testResults).toHaveLength(1);
    });
  });

  describe('getCount', () => {
    it('returns correct count', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000' });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002' });

      const count = await mcpServerRepository.getCount();
      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all servers', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000' });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002' });

      await mcpServerRepository.clear();

      const count = await mcpServerRepository.getCount();
      expect(count).toBe(0);
    });
  });

  describe('getConnectedCount', () => {
    it('returns count of connected servers', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000', connected: true });
      await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002', connected: true });
      await mcpServerRepository.create({ name: 'Server 3', url: 'http://localhost:3003', connected: false });

      const count = await mcpServerRepository.getConnectedCount();
      expect(count).toBe(2);
    });

    it('returns 0 when no servers are connected', async () => {
      await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000', connected: false });

      const count = await mcpServerRepository.getConnectedCount();
      expect(count).toBe(0);
    });
  });

  describe('bulkDelete', () => {
    it('deletes multiple servers by IDs', async () => {
      const server1 = await mcpServerRepository.create({ name: 'Server 1', url: 'http://localhost:3000' });
      const server2 = await mcpServerRepository.create({ name: 'Server 2', url: 'http://localhost:3002' });
      await mcpServerRepository.create({ name: 'Server 3', url: 'http://localhost:3003' });

      await mcpServerRepository.bulkDelete([server1.id, server2.id]);

      const remaining = await mcpServerRepository.getAll();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].name).toBe('Server 3');
    });
  });
});
