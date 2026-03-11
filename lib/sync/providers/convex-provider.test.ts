import { ConvexProvider } from './convex-provider';
import type { ConvexSyncConfig, SyncData } from '@/types/sync';
import { DEFAULT_CONVEX_CONFIG } from '@/types/sync';

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
    syncedAt: '2026-03-10T00:00:00.000Z',
    deviceId: 'device-test123',
    deviceName: 'Test Device',
    checksum: 'abc123',
    dataTypes: ['sessions', 'messages', 'settings', 'artifacts', 'folders', 'projects'],
    data: {
      settings: { theme: 'dark' },
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
          topP: 0.9,
        } as never,
      ],
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'user',
          content: 'Hello',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          isBookmarked: true,
          bookmarkedAt: new Date('2024-01-02T10:00:00Z'),
        } as never,
      ],
      artifacts: {
        artifact_1: { id: 'artifact_1', kind: 'code', content: 'console.log(1)' } as never,
      },
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
          tags: ['a', 'b'],
          sessionIds: ['session-1'],
          sessionCount: 1,
          messageCount: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
          lastAccessedAt: new Date('2024-01-02'),
        } as never,
      ],
    },
    ...overrides,
  };
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  };
}

describe('ConvexProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('normalizes cloud deployment URL to convex.site for HTTP actions', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ status: 'ok', timestamp: '2026-03-10T00:00:00.000Z' })
    );

    const provider = createProvider();
    const result = await provider.testConnection();

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-app.convex.site/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('uploads in bounded chunks with authoritative reconciliation contract', async () => {
    const manyMessages = Array.from({ length: 205 }, (_, index) => ({
      id: `msg-${index + 1}`,
      sessionId: 'session-1',
      role: 'user',
      content: `message-${index + 1}`,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    })) as never[];

    mockFetch.mockResolvedValue(jsonResponse({ imported: 1, errors: 0, deleted: 0 }));

    const provider = createProvider();
    const result = await provider.upload(
      createMockSyncData({
        data: {
          messages: manyMessages,
        },
      })
    );

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalled();

    const importCalls = mockFetch.mock.calls
      .map((call) => call[1])
      .filter((init) => (init as RequestInit)?.method === 'POST') as RequestInit[];
    expect(importCalls.length).toBeGreaterThan(1);

    const firstBody = JSON.parse(String(importCalls[0].body));
    const secondBody = JSON.parse(String(importCalls[1].body));

    expect(firstBody.reconciliation.mode).toBe('authoritative');
    expect(firstBody.reconciliation.replaceTables).toEqual(['messages']);
    expect(secondBody.reconciliation.replaceTables).toEqual([]);
  });

  it('surfaces structured API error messages on upload failure', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(
        { code: 'sync_auth_invalid', error: 'Invalid deploy key', message: 'Invalid deploy key' },
        401
      )
    );

    const provider = createProvider();
    const result = await provider.upload(createMockSyncData());

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid deploy key');
    expect(result.error).toContain('sync_auth_invalid');
  });

  it('downloads paged export contract and maps records', async () => {
    mockFetch
      // settings page
      .mockResolvedValueOnce(
        jsonResponse({
          table: 'settings',
          items: [{ localId: 'global-settings', payload: JSON.stringify({ locale: 'en-US' }) }],
          continueCursor: 'done',
          isDone: true,
        })
      )
      // sessions page
      .mockResolvedValueOnce(
        jsonResponse({
          table: 'sessions',
          items: [
            {
              localId: 'session-1',
              title: 'Downloaded Session',
              provider: 'openai',
              model: 'gpt-4',
              mode: 'chat',
              messageCount: 3,
              metadata: JSON.stringify({ topP: 0.9 }),
              localCreatedAt: '2024-01-01T00:00:00.000Z',
              localUpdatedAt: '2024-01-02T00:00:00.000Z',
            },
          ],
          continueCursor: 'done',
          isDone: true,
        })
      )
      // messages page
      .mockResolvedValueOnce(
        jsonResponse({
          table: 'messages',
          items: [],
          continueCursor: 'done',
          isDone: true,
        })
      )
      // artifacts page
      .mockResolvedValueOnce(
        jsonResponse({
          table: 'artifacts',
          items: [{ localId: 'artifact_1', payload: JSON.stringify({ id: 'artifact_1' }) }],
          continueCursor: 'done',
          isDone: true,
        })
      )
      // folders page
      .mockResolvedValueOnce(
        jsonResponse({
          table: 'folders',
          items: [],
          continueCursor: 'done',
          isDone: true,
        })
      )
      // projects page
      .mockResolvedValueOnce(
        jsonResponse({
          table: 'projects',
          items: [],
          continueCursor: 'done',
          isDone: true,
        })
      )
      // metadata
      .mockResolvedValueOnce(
        jsonResponse({
          version: '1.1',
          syncedAt: '2026-03-10T00:00:00.000Z',
          deviceId: 'device-remote',
          deviceName: 'Remote Device',
          checksum: 'xyz789',
        })
      );

    const provider = createProvider();
    const result = await provider.download();

    expect(result).not.toBeNull();
    expect(result?.data.settings).toEqual({ locale: 'en-US' });
    expect(result?.data.artifacts).toEqual({ artifact_1: { id: 'artifact_1' } });
    expect((result?.data.sessions?.[0] as unknown as Record<string, unknown>).topP).toBe(0.9);
  });

  it('falls back to legacy /api/sync/export contract when paged payload is unavailable', async () => {
    mockFetch
      // paged request returns non-paged shape -> fallback
      .mockResolvedValueOnce(jsonResponse({ sessions: [] }))
      // legacy export
      .mockResolvedValueOnce(
        jsonResponse({
          settings: [{ localId: 'global-settings', payload: JSON.stringify({ locale: 'en-US' }) }],
          sessions: [],
          messages: [],
          artifacts: [],
          folders: [],
          projects: [],
        })
      )
      // metadata
      .mockResolvedValueOnce(
        jsonResponse({
          version: '1.1',
          syncedAt: '2026-03-10T00:00:00.000Z',
          deviceId: 'device-remote',
          deviceName: 'Remote Device',
          checksum: 'xyz789',
        })
      );

    const provider = createProvider();
    const result = await provider.download();

    expect(result).not.toBeNull();
    expect(result?.data.settings).toEqual({ locale: 'en-US' });
  });

  it('keeps legacy checksum compatibility when payload lacks settings/artifacts', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ sessions: [] }))
      .mockResolvedValueOnce(
        jsonResponse({
          sessions: [],
          messages: [],
          folders: [],
          projects: [],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          version: '1.1',
          syncedAt: '2026-03-10T00:00:00.000Z',
          deviceId: 'device-remote',
          deviceName: 'Remote Device',
          checksum: 'legacy-checksum',
        })
      );

    const provider = createProvider();
    const result = await provider.download();

    expect(result).not.toBeNull();
    expect(result?.checksum).toBe('');
  });
});
