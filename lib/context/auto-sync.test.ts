/**
 * Tests for auto-sync.ts
 * Automatic context synchronization service
 */

import {
  syncAllMcpServers,
  syncAllSkills,
  runFullSync,
  startAutoSync,
  stopAutoSync,
  getLastSyncResult,
  isAutoSyncRunning,
  createSyncTrigger,
} from './auto-sync';
import * as mcpToolsSync from './mcp-tools-sync';
import * as skillsSync from './skills-sync';
import type { McpTool } from '@/types/mcp';
import type { Skill } from '@/types/system/skill';

// Mock dependencies
jest.mock('./mcp-tools-sync');
jest.mock('./skills-sync');

const mockedMcpToolsSync = mcpToolsSync as jest.Mocked<typeof mcpToolsSync>;
const mockedSkillsSync = skillsSync as jest.Mocked<typeof skillsSync>;

// Mock MCP server
const createMockServer = (id: string, toolCount: number = 2) => ({
  id,
  name: `Server ${id}`,
  tools: Array.from({ length: toolCount }, (_, i) => ({
    name: `tool_${i}`,
    description: `Tool ${i} description`,
    inputSchema: { type: 'object' as const, properties: {} },
  })) as McpTool[],
  status: 'connected' as const,
});

// Mock Skill
const createMockSkill = (id: string): Skill => ({
  id,
  metadata: {
    name: `Skill ${id}`,
    description: 'Test skill description',
  },
  content: 'Test skill content',
  rawContent: '---\nname: Test\n---\nTest skill content',
  resources: [],
  status: 'enabled',
  source: 'custom',
  category: 'custom',
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('auto-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    stopAutoSync(); // Ensure clean state
  });

  afterEach(() => {
    stopAutoSync();
    jest.useRealTimers();
  });

  describe('syncAllMcpServers', () => {
    it('should sync all servers and return results', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 2,
        filesWritten: ['file1.json', 'file2.json'],
        errors: [],
      });

      const servers = [createMockServer('server1'), createMockServer('server2')];
      const results = await syncAllMcpServers(servers);

      expect(results.size).toBe(2);
      expect(results.get('server1')?.toolsSynced).toBe(2);
      expect(results.get('server2')?.toolsSynced).toBe(2);
      expect(mockedMcpToolsSync.syncMcpServer).toHaveBeenCalledTimes(2);
    });

    it('should handle sync errors gracefully', async () => {
      mockedMcpToolsSync.syncMcpServer
        .mockResolvedValueOnce({
          toolsSynced: 2,
          filesWritten: ['file1.json'],
          errors: [],
        })
        .mockRejectedValueOnce(new Error('Sync failed'));

      const servers = [createMockServer('server1'), createMockServer('server2')];
      const results = await syncAllMcpServers(servers);

      expect(results.size).toBe(2);
      expect(results.get('server1')?.toolsSynced).toBe(2);
      expect(results.get('server2')?.toolsSynced).toBe(0);
      expect(results.get('server2')?.errors[0].error).toContain('Sync failed');
    });

    it('should handle empty server list', async () => {
      const results = await syncAllMcpServers([]);

      expect(results.size).toBe(0);
      expect(mockedMcpToolsSync.syncMcpServer).not.toHaveBeenCalled();
    });
  });

  describe('syncAllSkills', () => {
    it('should sync all skills', async () => {
      mockedSkillsSync.syncSkills.mockResolvedValue({
        synced: 3,
        errors: [],
      });

      const skills = [createMockSkill('skill1'), createMockSkill('skill2'), createMockSkill('skill3')];
      const result = await syncAllSkills(skills);

      expect(result.synced).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(mockedSkillsSync.syncSkills).toHaveBeenCalledWith(skills);
    });

    it('should return errors from skill sync', async () => {
      mockedSkillsSync.syncSkills.mockResolvedValue({
        synced: 1,
        errors: [{ skillId: 'skill2', error: 'Failed to sync' }],
      });

      const skills = [createMockSkill('skill1'), createMockSkill('skill2')];
      const result = await syncAllSkills(skills);

      expect(result.synced).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].skillId).toBe('skill2');
    });
  });

  describe('runFullSync', () => {
    it('should run full sync with both MCP and skills', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 2,
        filesWritten: [],
        errors: [],
      });
      mockedSkillsSync.syncSkills.mockResolvedValue({
        synced: 1,
        errors: [],
      });

      const result = await runFullSync({
        mcpServers: [createMockServer('server1')],
        skills: [createMockSkill('skill1')],
      });

      expect(result.mcp.size).toBe(1);
      expect(result.skills.synced).toBe(1);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.syncedAt).toBeInstanceOf(Date);
    });

    it('should handle sync with only MCP servers', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 2,
        filesWritten: [],
        errors: [],
      });

      const result = await runFullSync({
        mcpServers: [createMockServer('server1')],
      });

      expect(result.mcp.size).toBe(1);
      expect(result.skills.synced).toBe(0);
      expect(mockedSkillsSync.syncSkills).not.toHaveBeenCalled();
    });

    it('should handle sync with only skills', async () => {
      mockedSkillsSync.syncSkills.mockResolvedValue({
        synced: 2,
        errors: [],
      });

      const result = await runFullSync({
        skills: [createMockSkill('skill1'), createMockSkill('skill2')],
      });

      expect(result.mcp.size).toBe(0);
      expect(result.skills.synced).toBe(2);
      expect(mockedMcpToolsSync.syncMcpServer).not.toHaveBeenCalled();
    });

    it('should update lastSyncResult', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 1,
        filesWritten: [],
        errors: [],
      });

      await runFullSync({ mcpServers: [createMockServer('server1')] });

      const lastResult = getLastSyncResult();
      expect(lastResult).not.toBeNull();
      expect(lastResult?.mcp.size).toBe(1);
    });
  });

  describe('startAutoSync / stopAutoSync', () => {
    it('should start auto-sync with interval', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 1,
        filesWritten: [],
        errors: [],
      });

      const onComplete = jest.fn();
      const getDataFn = jest.fn().mockReturnValue({
        mcpServers: [createMockServer('server1')],
      });

      startAutoSync(
        {
          syncMcpTools: true,
          syncIntervalMs: 1000,
          onSyncComplete: onComplete,
        },
        getDataFn
      );

      expect(isAutoSyncRunning()).toBe(true);

      // Wait for initial sync
      await jest.runAllTimersAsync();
      expect(getDataFn).toHaveBeenCalled();

      // Advance timer for next sync
      jest.advanceTimersByTime(1000);
      await jest.runAllTimersAsync();
      expect(getDataFn).toHaveBeenCalledTimes(2);

      stopAutoSync();
      expect(isAutoSyncRunning()).toBe(false);
    });

    it('should not start if interval is 0 or negative', () => {
      const getDataFn = jest.fn();

      startAutoSync({ syncIntervalMs: 0 }, getDataFn);
      expect(isAutoSyncRunning()).toBe(false);

      startAutoSync({ syncIntervalMs: -1000 }, getDataFn);
      expect(isAutoSyncRunning()).toBe(false);
    });

    it('should stop previous sync when starting new one', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 1,
        filesWritten: [],
        errors: [],
      });

      const getDataFn1 = jest.fn().mockReturnValue({ mcpServers: [] });
      const getDataFn2 = jest.fn().mockReturnValue({ mcpServers: [] });

      startAutoSync({ syncMcpTools: true, syncIntervalMs: 1000 }, getDataFn1);
      expect(isAutoSyncRunning()).toBe(true);

      startAutoSync({ syncMcpTools: true, syncIntervalMs: 2000 }, getDataFn2);
      expect(isAutoSyncRunning()).toBe(true);

      // Only second getDataFn should be called on interval
      jest.advanceTimersByTime(2000);
      await jest.runAllTimersAsync();

      // getDataFn2 should have been called more
      expect(getDataFn2.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getLastSyncResult', () => {
    it('should return null initially', () => {
      // Reset by running a fresh test
      expect(getLastSyncResult()).toBeNull();
    });
  });

  describe('isAutoSyncRunning', () => {
    it('should return false when not running', () => {
      stopAutoSync();
      expect(isAutoSyncRunning()).toBe(false);
    });

    it('should return true when running', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 1,
        filesWritten: [],
        errors: [],
      });

      startAutoSync(
        { syncMcpTools: true, syncIntervalMs: 1000 },
        () => ({ mcpServers: [] })
      );

      expect(isAutoSyncRunning()).toBe(true);
      stopAutoSync();
    });
  });

  describe('createSyncTrigger', () => {
    it('should create MCP sync trigger', async () => {
      mockedMcpToolsSync.syncMcpServer.mockResolvedValue({
        toolsSynced: 1,
        filesWritten: [],
        errors: [],
      });

      const servers = [createMockServer('server1')];
      const trigger = createSyncTrigger('mcp', () => servers);

      await trigger();

      expect(mockedMcpToolsSync.syncMcpServer).toHaveBeenCalledWith(
        'server1',
        'Server server1',
        expect.any(Array),
        'connected'
      );
    });

    it('should create skills sync trigger', async () => {
      mockedSkillsSync.syncSkills.mockResolvedValue({
        synced: 1,
        errors: [],
      });

      const skills = [createMockSkill('skill1')];
      const trigger = createSyncTrigger('skills', () => skills);

      await trigger();

      expect(mockedSkillsSync.syncSkills).toHaveBeenCalledWith(skills);
    });
  });
});
