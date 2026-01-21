/**
 * Tests for use-auto-sync.ts
 * React hook for automatic context synchronization
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoSync } from './use-auto-sync';
import * as autoSync from '@/lib/context/auto-sync';

// Mock dependencies
jest.mock('@/lib/context/auto-sync');
jest.mock('@/stores', () => ({
  useMcpStore: jest.fn((selector) => {
    const state = {
      servers: [
        {
          id: 'server1',
          name: 'Test Server',
          tools: [{ name: 'tool1', description: 'Test tool' }],
          status: 'connected',
        },
      ],
    };
    return selector(state);
  }),
  useSkillStore: jest.fn((selector) => {
    const state = {
      skills: {
        skill1: {
          id: 'skill1',
          metadata: { name: 'Test Skill', description: 'Test', version: '1.0' },
          content: 'test',
          isActive: true,
        },
      },
      activeSkillIds: ['skill1'],
    };
    return selector(state);
  }),
}));

const mockedAutoSync = autoSync as jest.Mocked<typeof autoSync>;

describe('useAutoSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockedAutoSync.runFullSync.mockResolvedValue({
      mcp: new Map(),
      skills: { synced: 0, errors: [] },
      durationMs: 100,
      syncedAt: new Date(),
    });
    mockedAutoSync.getLastSyncResult.mockReturnValue(null);
    mockedAutoSync.isAutoSyncRunning.mockReturnValue(false);
    mockedAutoSync.startAutoSync.mockImplementation(() => {});
    mockedAutoSync.stopAutoSync.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastResult).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  it('should sync on mount when enabled', async () => {
    mockedAutoSync.runFullSync.mockResolvedValue({
      mcp: new Map([['server1', { toolsSynced: 1, filesWritten: [], errors: [] }]]),
      skills: { synced: 1, errors: [] },
      durationMs: 50,
      syncedAt: new Date(),
    });

    const { result } = renderHook(() => useAutoSync({ syncOnMount: true, syncIntervalMs: 0 }));

    await waitFor(() => {
      expect(result.current.lastResult).not.toBeNull();
    });

    expect(mockedAutoSync.runFullSync).toHaveBeenCalled();
  });

  it('should not sync on mount when disabled', () => {
    renderHook(() => useAutoSync({ syncOnMount: false, syncIntervalMs: 0 }));

    expect(mockedAutoSync.runFullSync).not.toHaveBeenCalled();
  });

  it('should trigger manual sync', async () => {
    mockedAutoSync.runFullSync.mockResolvedValue({
      mcp: new Map(),
      skills: { synced: 2, errors: [] },
      durationMs: 100,
      syncedAt: new Date(),
    });

    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    await act(async () => {
      await result.current.sync();
    });

    expect(mockedAutoSync.runFullSync).toHaveBeenCalled();
    expect(result.current.lastResult?.skills.synced).toBe(2);
  });

  it('should handle sync error', async () => {
    mockedAutoSync.runFullSync.mockRejectedValue(new Error('Sync failed'));

    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    await act(async () => {
      await result.current.sync();
    });

    expect(result.current.error).toBe('Sync failed');
  });

  it('should start auto-sync with interval', async () => {
    const { result } = renderHook(() => useAutoSync({ syncOnMount: false, syncIntervalMs: 0 }));

    act(() => {
      result.current.start(5000);
    });

    expect(mockedAutoSync.startAutoSync).toHaveBeenCalledWith(
      expect.objectContaining({
        syncMcpTools: true,
        syncSkills: true,
        syncIntervalMs: 5000,
      }),
      expect.any(Function)
    );
  });

  it('should stop auto-sync', () => {
    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    act(() => {
      result.current.stop();
    });

    expect(mockedAutoSync.stopAutoSync).toHaveBeenCalled();
  });

  it('should respect syncMcpTools option', async () => {
    const { result } = renderHook(() =>
      useAutoSync({ syncOnMount: false, syncMcpTools: false, syncSkills: true })
    );

    await act(async () => {
      await result.current.sync();
    });

    expect(mockedAutoSync.runFullSync).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpServers: undefined,
        skills: expect.any(Array),
      })
    );
  });

  it('should respect syncSkills option', async () => {
    const { result } = renderHook(() =>
      useAutoSync({ syncOnMount: false, syncMcpTools: true, syncSkills: false })
    );

    await act(async () => {
      await result.current.sync();
    });

    expect(mockedAutoSync.runFullSync).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpServers: expect.any(Array),
        skills: undefined,
      })
    );
  });

  it('should not sync while already syncing', async () => {
    let resolveSync: () => void;
    mockedAutoSync.runFullSync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = () =>
            resolve({
              mcp: new Map(),
              skills: { synced: 0, errors: [] },
              durationMs: 100,
              syncedAt: new Date(),
            });
        })
    );

    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    // Start first sync
    act(() => {
      result.current.sync();
    });

    expect(result.current.isSyncing).toBe(true);

    // Try to start second sync
    await act(async () => {
      await result.current.sync();
    });

    // Should only have one call
    expect(mockedAutoSync.runFullSync).toHaveBeenCalledTimes(1);

    // Resolve the first sync
    await act(async () => {
      resolveSync!();
    });
  });

  it('should load cached result on mount', () => {
    const cachedResult = {
      mcp: new Map(),
      skills: { synced: 5, errors: [] },
      durationMs: 200,
      syncedAt: new Date(),
    };
    mockedAutoSync.getLastSyncResult.mockReturnValue(cachedResult);

    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    expect(result.current.lastResult).toEqual(cachedResult);
  });

  it('should check auto-sync running state on mount', () => {
    mockedAutoSync.isAutoSyncRunning.mockReturnValue(true);

    const { result } = renderHook(() => useAutoSync({ syncOnMount: false }));

    expect(result.current.isRunning).toBe(true);
  });
});
