/**
 * ConvexProvider unit tests
 *
 * Covers: constructor, testConnection, upload (with metadata round-trip),
 * download (with Convex system field stripping and metadata reconstruction),
 * getRemoteMetadata, listBackups, disconnect.
 */

import { ConvexProvider } from './convex-provider';
import type { ConvexSyncConfig, SyncData } from '@/types/sync';
import { DEFAULT_CONVEX_CONFIG } from '@/types/sync';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

function createProvider(overrides?: Partial<ConvexSyncConfig>): ConvexProvider {
  const config: ConvexSyncConfig = {
    ...DEFAULT_CONVEX_CONFIG,
    deploymentUrl: 'https://test-app.convex.cloud',
    projectSlug: 'test-app',
    ...overrides,
  };
  return new ConvexProvider(config, 'prod:test_deploy_key_123');
}

function createMockSyncData(overrides?: Partial<SyncData>): SyncData {
  return {
    version: '1.1',
    syncedAt: new Date().toISOString(),
    deviceId: 'device-test123',
    deviceName: 'Test Device',
    checksum: 'abc123',
    dataTypes: ['sessions', 'messages'],
    data: {
      sessions: [
        {
          id: 'session-1',
          title: 'Test Session',
          provider: 'openai',
          model: 'gpt-4',
          mode: 'chat',
          messageCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          // Extra fields that MUST survive round-trip via metadata
          topP: 0.9,
          frequencyPenalty: 0.5,
          tags: ['tag1', 'tag2'],
          isArchived: false,
          branches: [{ id: 'main', name: 'main' }],
          carriedContext: { enabled: true, maxTokens: 4096 },
        } as never,
      ],
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          bookmarkedAt: new Date('2024-01-02T12:00:00Z'),
          isBookmarked: true,
        } as never,
      ],
      folders: [
        {
          id: 'folder-1',
          name: 'Work',
          order: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        } as never,
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'My Project',
          description: 'desc',
          tags: ['a', 'b'],
          isArchived: false,
          sessionIds: ['session-1'],
          sessionCount: 1,
          messageCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          lastAccessedAt: new Date('2024-01-02'),
        } as never,
      ],
    },
    ...overrides,
  };
}

describe('ConvexProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create provider with correct type', () => {
      const provider = createProvider();
      expect(provider.type).toBe('convex');
    });

    it('should strip trailing slash from deployment URL', () => {
      const provider = createProvider({ deploymentUrl: 'https://test.convex.cloud/' });
      expect(provider.type).toBe('convex');
    });
  });

  describe('testConnection', () => {
    it('should return success when health check returns ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok', timestamp: new Date().toISOString() }),
      });

      const provider = createProvider();
      const result = await provider.testConnection();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-app.convex.cloud/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return failure on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const provider = createProvider();
      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
    });

    it('should return failure on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network unreachable'));

      const provider = createProvider();
      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return failure on unexpected health response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'degraded' }),
      });

      const provider = createProvider();
      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected');
    });
  });

  describe('upload', () => {
    it('should upload sync data successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ imported: 6, errors: 0 }),
      });

      const provider = createProvider();
      const data = createMockSyncData();
      const result = await provider.upload(data);

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(6);
      expect(result.direction).toBe('upload');
    });

    it('should serialize extra session fields into metadata JSON', async () => {
      let sentBody: string | undefined;
      mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
        sentBody = init.body as string;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ imported: 1, errors: 0 }),
        });
      });

      const provider = createProvider();
      const data = createMockSyncData();
      await provider.upload(data);

      expect(sentBody).toBeDefined();
      const parsed = JSON.parse(sentBody!);
      const session = parsed.tables.sessions[0];

      // Indexed fields should be top-level
      expect(session.localId).toBe('session-1');
      expect(session.title).toBe('Test Session');
      expect(session.provider).toBe('openai');

      // Extra fields should be in metadata JSON string
      expect(typeof session.metadata).toBe('string');
      const meta = JSON.parse(session.metadata);
      expect(meta.topP).toBe(0.9);
      expect(meta.frequencyPenalty).toBe(0.5);
      expect(meta.tags).toEqual(['tag1', 'tag2']);
      expect(meta.branches).toEqual([{ id: 'main', name: 'main' }]);
      expect(meta.carriedContext).toEqual({ enabled: true, maxTokens: 4096 });
    });

    it('should serialize bookmarkedAt as ISO string', async () => {
      let sentBody: string | undefined;
      mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
        sentBody = init.body as string;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ imported: 1, errors: 0 }),
        });
      });

      const provider = createProvider();
      const data = createMockSyncData();
      await provider.upload(data);

      const parsed = JSON.parse(sentBody!);
      const msg = parsed.tables.messages[0];
      expect(msg.bookmarkedAt).toBe('2024-01-02T12:00:00.000Z');
    });

    it('should serialize project tags and sessionIds as JSON strings', async () => {
      let sentBody: string | undefined;
      mockFetch.mockImplementationOnce((_url: string, init: RequestInit) => {
        sentBody = init.body as string;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ imported: 1, errors: 0 }),
        });
      });

      const provider = createProvider();
      const data = createMockSyncData();
      await provider.upload(data);

      const parsed = JSON.parse(sentBody!);
      const project = parsed.tables.projects[0];
      expect(project.tags).toBe(JSON.stringify(['a', 'b']));
      expect(project.sessionIds).toBe(JSON.stringify(['session-1']));
      expect(project.isArchived).toBe(false);
    });

    it('should return error on upload failure', async () => {
      // retryFetch retries 5xx up to maxRetries times; mock all attempts
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      const provider = createProvider();
      const data = createMockSyncData();
      const result = await provider.upload(data);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call progress callback during upload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ imported: 1, errors: 0 }),
      });

      const onProgress = jest.fn();
      const provider = createProvider();
      await provider.upload(createMockSyncData(), onProgress);

      expect(onProgress).toHaveBeenCalled();
      const phases = onProgress.mock.calls.map(
        (call: [{ phase: string }]) => call[0].phase
      );
      expect(phases).toContain('preparing');
      expect(phases).toContain('uploading');
      expect(phases).toContain('completing');
    });
  });

  describe('download', () => {
    function mockDownloadResponses(exportData: Record<string, unknown>) {
      // Export endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exportData),
      });
      // Metadata endpoint
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '1.1',
            syncedAt: '2024-01-02T00:00:00.000Z',
            deviceId: 'device-remote',
            deviceName: 'Remote Device',
            checksum: 'xyz789',
          }),
      });
    }

    it('should download and map sessions correctly', async () => {
      mockDownloadResponses({
        sessions: [
          {
            _id: 'convex_id_123',
            _creationTime: 1704067200000,
            localId: 'session-1',
            title: 'Downloaded Session',
            provider: 'openai',
            model: 'gpt-4',
            mode: 'chat',
            messageCount: 3,
            localCreatedAt: '2024-01-01T00:00:00.000Z',
            localUpdatedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        messages: [],
        folders: [],
        projects: [],
      });

      const provider = createProvider();
      const result = await provider.download();

      expect(result).not.toBeNull();
      expect(result?.data.sessions).toHaveLength(1);
      const session = result?.data.sessions?.[0] as unknown as Record<string, unknown>;
      expect(session.id).toBe('session-1');
      // Convex internal fields should NOT be present
      expect(session._id).toBeUndefined();
      expect(session._creationTime).toBeUndefined();
    });

    it('should reconstruct extra session fields from metadata JSON', async () => {
      const extraFields = {
        topP: 0.9,
        frequencyPenalty: 0.5,
        tags: ['tag1', 'tag2'],
        branches: [{ id: 'main', name: 'main' }],
        carriedContext: { enabled: true, maxTokens: 4096 },
      };

      mockDownloadResponses({
        sessions: [
          {
            _id: 'convex_id_123',
            _creationTime: 1704067200000,
            localId: 'session-1',
            title: 'Session with metadata',
            provider: 'openai',
            model: 'gpt-4',
            mode: 'chat',
            messageCount: 3,
            metadata: JSON.stringify(extraFields),
            localCreatedAt: '2024-01-01T00:00:00.000Z',
            localUpdatedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
        messages: [],
        folders: [],
        projects: [],
      });

      const provider = createProvider();
      const result = await provider.download();
      const session = result?.data.sessions?.[0] as unknown as Record<string, unknown>;

      // Extra fields from metadata should be restored
      expect(session.topP).toBe(0.9);
      expect(session.frequencyPenalty).toBe(0.5);
      expect(session.tags).toEqual(['tag1', 'tag2']);
      expect(session.branches).toEqual([{ id: 'main', name: 'main' }]);
      expect(session.carriedContext).toEqual({ enabled: true, maxTokens: 4096 });

      // Indexed fields should still be correct (take precedence)
      expect(session.title).toBe('Session with metadata');
      expect(session.provider).toBe('openai');
    });

    it('should restore bookmarkedAt as Date on messages', async () => {
      mockDownloadResponses({
        sessions: [],
        messages: [
          {
            _id: 'convex_msg_1',
            _creationTime: 1704067200000,
            localId: 'msg-1',
            sessionId: 'session-1',
            role: 'user',
            content: 'Hello',
            isBookmarked: true,
            bookmarkedAt: '2024-01-02T12:00:00.000Z',
            localCreatedAt: '2024-01-01T10:00:00.000Z',
          },
        ],
        folders: [],
        projects: [],
      });

      const provider = createProvider();
      const result = await provider.download();
      const msg = result?.data.messages?.[0] as unknown as Record<string, unknown>;

      expect(msg.id).toBe('msg-1');
      expect(msg.bookmarkedAt).toEqual(new Date('2024-01-02T12:00:00.000Z'));
      expect(msg._id).toBeUndefined();
    });

    it('should deserialize project tags and sessionIds from JSON strings', async () => {
      mockDownloadResponses({
        sessions: [],
        messages: [],
        folders: [],
        projects: [
          {
            _id: 'convex_proj_1',
            _creationTime: 1704067200000,
            localId: 'proj-1',
            name: 'My Project',
            description: 'desc',
            tags: JSON.stringify(['a', 'b']),
            sessionIds: JSON.stringify(['session-1']),
            isArchived: false,
            sessionCount: 1,
            messageCount: 5,
            localCreatedAt: '2024-01-01T00:00:00.000Z',
            localUpdatedAt: '2024-01-02T00:00:00.000Z',
            lastAccessedAt: '2024-01-02T00:00:00.000Z',
          },
        ],
      });

      const provider = createProvider();
      const result = await provider.download();
      const project = result?.data.projects?.[0] as unknown as Record<string, unknown>;

      expect(project.id).toBe('proj-1');
      expect(project.tags).toEqual(['a', 'b']);
      expect(project.sessionIds).toEqual(['session-1']);
      expect(project.isArchived).toBe(false);
      expect(project._id).toBeUndefined();
    });

    it('should return null on download failure', async () => {
      // retryFetch retries 5xx up to maxRetries times; mock all attempts
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const provider = createProvider();
      const result = await provider.download();

      expect(result).toBeNull();
    });

    it('should handle missing metadata endpoint gracefully', async () => {
      // Export endpoint succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: [], messages: [], folders: [], projects: [] }),
      });
      // Metadata endpoint fails (retryFetch maxRetries=1 → needs 2 failures)
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const provider = createProvider();
      const result = await provider.download();

      expect(result).not.toBeNull();
      expect(result?.version).toBe('1.1');
      expect(result?.deviceId).toBe('unknown');
    });
  });

  describe('getRemoteMetadata', () => {
    it('should return metadata when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            version: '1.1',
            syncedAt: '2024-01-01T00:00:00.000Z',
            deviceId: 'device-1',
            deviceName: 'Test',
            checksum: 'abc',
          }),
      });

      const provider = createProvider();
      const metadata = await provider.getRemoteMetadata();

      expect(metadata).not.toBeNull();
      expect(metadata?.deviceId).toBe('device-1');
      expect(metadata?.size).toBe(0);
    });

    it('should return null on error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const provider = createProvider();
      const metadata = await provider.getRemoteMetadata();

      expect(metadata).toBeNull();
    });

    it('should return null on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('timeout'));

      const provider = createProvider();
      const metadata = await provider.getRemoteMetadata();

      expect(metadata).toBeNull();
    });
  });

  describe('listBackups', () => {
    it('should return empty array (Convex manages backups via dashboard)', async () => {
      const provider = createProvider();
      const backups = await provider.listBackups();
      expect(backups).toEqual([]);
    });
  });

  describe('downloadBackup / deleteBackup', () => {
    it('downloadBackup should return null', async () => {
      const provider = createProvider();
      expect(await provider.downloadBackup('any-id')).toBeNull();
    });

    it('deleteBackup should return false', async () => {
      const provider = createProvider();
      expect(await provider.deleteBackup('any-id')).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should complete without error', async () => {
      const provider = createProvider();
      await expect(provider.disconnect()).resolves.toBeUndefined();
    });
  });
});
