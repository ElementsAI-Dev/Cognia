/**
 * useSkillSync tests
 */

import { act, renderHook } from '@testing-library/react';

jest.mock('@/lib/native/skill', () => ({
  isNativeSkillAvailable: jest.fn(() => true),
}));

jest.mock('./use-native-skills', () => ({
  useNativeSkills: jest.fn(),
}));

jest.mock('@/stores/skills/skill-store', () => ({
  useSkillStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ skills: {} })),
  }),
}));

import * as nativeSkill from '@/lib/native/skill';
import { useNativeSkills } from './use-native-skills';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';
import type { DiscoverableSkill, InstalledSkill } from './use-native-skills';

const mockNativeSkillAvailable = jest.mocked(nativeSkill.isNativeSkillAvailable);
const mockUseNativeSkills = jest.mocked(useNativeSkills);
const mockUseSkillStore = jest.mocked(useSkillStore);

const _discoverableSkill: DiscoverableSkill = {
  key: 'owner/repo:skill-dir',
  name: 'Test Skill',
  description: 'A test skill from repository',
  directory: 'skill-dir',
  readmeUrl: 'https://github.com/owner/repo/tree/main/skill-dir',
  repoOwner: 'owner',
  repoName: 'repo',
  repoBranch: 'main',
};

const installedSkill: InstalledSkill = {
  id: 'owner/repo:skill-dir',
  name: 'Test Skill',
  description: 'A test skill from repository',
  directory: 'skill-dir',
  repoOwner: 'owner',
  repoName: 'repo',
  repoBranch: 'main',
  readmeUrl: 'https://github.com/owner/repo/tree/main/skill-dir',
  installedAt: Date.now(),
  enabled: true,
  category: 'development',
  tags: ['test'],
};

function createFrontendSkill(overrides: Record<string, unknown> = {}) {
  return {
    id: 'frontend-skill-1',
    metadata: { name: 'frontend-skill', description: 'A frontend skill' },
    content: 'Skill content',
    rawContent: '---\nname: frontend-skill\n---\n\nSkill content',
    resources: [],
    status: 'enabled',
    source: 'custom',
    category: 'custom',
    tags: [],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
    ...overrides,
  };
}

describe('useSkillSync', () => {
  const mockDiscover = jest.fn();
  const mockInstall = jest.fn();
  const mockUninstall = jest.fn();
  const mockReadContent = jest.fn();
  const mockWriteContent = jest.fn();
  const mockWriteResource = jest.fn();
  const mockRegisterLocal = jest.fn();
  const mockUpdateNative = jest.fn();
  const mockCreateSkill = jest.fn();
  const mockUpdateSkill = jest.fn();
  const mockDeleteSkill = jest.fn();
  const mockGetAllSkills = jest.fn();
  const mockSetSyncMetadata = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockNativeSkillAvailable.mockReturnValue(true);

    mockUseNativeSkills.mockReturnValue({
      repos: [{ owner: 'anthropics', name: 'skills', branch: 'main', enabled: true }],
      installed: [],
      discoverable: [],
      local: [],
      allSkills: [],
      isLoading: false,
      isDiscovering: false,
      error: null,
      refreshRepos: jest.fn(),
      addRepo: jest.fn(),
      removeRepo: jest.fn(),
      toggleRepo: jest.fn(),
      discover: mockDiscover,
      refreshAll: jest.fn(),
      scanLocal: jest.fn(),
      install: mockInstall,
      installLocal: jest.fn(),
      registerLocal: mockRegisterLocal,
      uninstall: mockUninstall,
      enable: jest.fn(),
      disable: jest.fn(),
      update: mockUpdateNative,
      readContent: mockReadContent,
      writeContent: mockWriteContent,
      listResources: jest.fn(),
      readResource: jest.fn(),
      writeResource: mockWriteResource,
      getSsotDir: jest.fn(),
      clearError: jest.fn(),
    });

    const storeState = {
      skills: {},
      activeSkillIds: [],
      isLoading: false,
      error: null,
      usageStats: {},
      bootstrapState: 'idle',
      lastBootstrapAt: null,
      lastBootstrapError: null,
      syncState: 'idle',
      lastSyncAt: null,
      lastSyncDirection: null,
      lastSyncOutcome: 'idle',
      lastSyncError: null,
      syncDiagnostics: {
        added: 0,
        updated: 0,
        skipped: 0,
        conflicted: 0,
      },
      createSkill: mockCreateSkill,
      updateSkill: mockUpdateSkill,
      deleteSkill: mockDeleteSkill,
      getSkill: jest.fn(),
      getAllSkills: mockGetAllSkills,
      enableSkill: jest.fn(),
      disableSkill: jest.fn(),
      setSkillStatus: jest.fn(),
      activateSkill: jest.fn(),
      deactivateSkill: jest.fn(),
      getActiveSkills: jest.fn(),
      clearActiveSkills: jest.fn(),
      addResource: jest.fn(),
      updateResource: jest.fn(),
      removeResource: jest.fn(),
      loadResourceContent: jest.fn(),
      searchSkills: jest.fn(),
      getSkillsByCategory: jest.fn(),
      getSkillsBySource: jest.fn(),
      getSkillsByTags: jest.fn(),
      validateSkill: jest.fn(),
      validateSkillName: jest.fn(),
      validateSkillDescription: jest.fn(),
      recordSkillUsage: jest.fn(),
      getSkillUsageStats: jest.fn(),
      importSkill: jest.fn(),
      exportSkill: jest.fn(),
      importBuiltinSkills: jest.fn(),
      deleteAllCustomSkills: jest.fn(),
      setError: jest.fn(),
      clearError: jest.fn(),
      setLoading: jest.fn(),
      setBootstrapState: jest.fn(),
      setSyncMetadata: mockSetSyncMetadata,
      reset: jest.fn(),
    };

    mockUseSkillStore.mockReturnValue(storeState as unknown as ReturnType<typeof useSkillStore>);
    (useSkillStore.getState as unknown as jest.Mock).mockReturnValue({ skills: {} });

    mockGetAllSkills.mockReturnValue([]);
    mockCreateSkill.mockReturnValue(createFrontendSkill());
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useSkillSync());

    expect(result.current.isSyncing).toBe(false);
    expect(result.current.lastSyncAt).toBeNull();
    expect(result.current.syncError).toBeNull();
    expect(result.current.discoverable).toEqual([]);
    expect(result.current.isDiscovering).toBe(false);
  });

  it('syncs from native by creating frontend skills for unknown native records', async () => {
    mockUseNativeSkills.mockReturnValue({
      ...mockUseNativeSkills(),
      installed: [installedSkill],
    });
    mockReadContent.mockResolvedValue('# Test Skill\n\nSkill content');

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncFromNative();
    });

    expect(mockReadContent).toHaveBeenCalledWith(installedSkill.directory);
    expect(mockCreateSkill).toHaveBeenCalled();
    expect(mockSetSyncMetadata).toHaveBeenCalled();
  });

  it('syncs from native by updating canonical native-id match first', async () => {
    const existing = createFrontendSkill({
      id: 'frontend-native',
      source: 'imported',
      nativeSkillId: installedSkill.id,
      metadata: { name: 'different-name', description: 'Old description' },
    });

    mockUseNativeSkills.mockReturnValue({
      ...mockUseNativeSkills(),
      installed: [installedSkill],
    });
    mockReadContent.mockResolvedValue('new content');
    (useSkillStore.getState as unknown as jest.Mock).mockReturnValue({
      skills: {
        [existing.id]: existing,
      },
    });

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncFromNative();
    });

    expect(mockUpdateSkill).toHaveBeenCalledWith(
      existing.id,
      expect.objectContaining({
        nativeSkillId: installedSkill.id,
        nativeDirectory: installedSkill.directory,
      })
    );
    expect(mockCreateSkill).not.toHaveBeenCalled();
  });

  it('treats legacy-name custom skill as conflict in syncFromNative', async () => {
    const conflicting = createFrontendSkill({
      id: 'conflict-skill',
      source: 'custom',
      metadata: { name: 'test-skill', description: 'local custom' },
      nativeSkillId: undefined,
    });

    mockUseNativeSkills.mockReturnValue({
      ...mockUseNativeSkills(),
      installed: [installedSkill],
    });
    (useSkillStore.getState as unknown as jest.Mock).mockReturnValue({
      skills: {
        [conflicting.id]: conflicting,
      },
    });

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncFromNative();
    });

    expect(mockUpdateSkill).not.toHaveBeenCalled();
    expect(mockCreateSkill).not.toHaveBeenCalled();
  });

  it('cleans up stale native-linked records when native entries are removed', async () => {
    const staleNativeMirror = createFrontendSkill({
      id: 'stale-native-mirror',
      source: 'imported',
      syncOrigin: 'native',
      nativeSkillId: 'native:missing',
      nativeDirectory: 'missing-directory',
      metadata: { name: 'missing-native', description: 'mirror' },
    });

    const staleLegacyLinked = createFrontendSkill({
      id: 'stale-legacy-linked',
      source: 'custom',
      syncOrigin: 'frontend',
      nativeSkillId: 'legacy-native-id',
      nativeDirectory: 'legacy-directory',
      metadata: { name: 'legacy-local', description: 'custom' },
    });

    mockUseNativeSkills.mockReturnValue({
      ...mockUseNativeSkills(),
      installed: [],
    });
    (useSkillStore.getState as unknown as jest.Mock).mockReturnValue({
      skills: {
        [staleNativeMirror.id]: staleNativeMirror,
        [staleLegacyLinked.id]: staleLegacyLinked,
      },
    });

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncFromNative();
    });

    expect(mockDeleteSkill).toHaveBeenCalledWith('stale-native-mirror');
    expect(mockUpdateSkill).toHaveBeenCalledWith(
      'stale-legacy-linked',
      expect.objectContaining({
        nativeSkillId: null,
        nativeDirectory: null,
        syncOrigin: 'frontend',
      })
    );
  });

  it('syncs custom skills to native storage and links canonical native ids', async () => {
    const customSkill = createFrontendSkill({
      id: 'custom-1',
      metadata: { name: 'custom-skill', description: 'desc' },
      source: 'custom',
      syncOrigin: 'frontend',
    });
    const installedLocal: InstalledSkill = {
      ...installedSkill,
      id: 'local:custom-skill',
      directory: 'custom-skill',
      repoOwner: null,
      repoName: null,
      repoBranch: null,
    };

    mockGetAllSkills.mockReturnValue([customSkill]);
    mockWriteContent.mockResolvedValue(undefined);
    mockRegisterLocal.mockResolvedValue(installedLocal);
    mockUpdateNative.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncToNative();
    });

    expect(mockWriteContent).toHaveBeenCalledWith('custom-skill', customSkill.rawContent);
    expect(mockRegisterLocal).toHaveBeenCalledWith('custom-skill');
    expect(mockUpdateSkill).toHaveBeenCalledWith(
      'custom-1',
      expect.objectContaining({
        nativeSkillId: 'local:custom-skill',
        nativeDirectory: 'custom-skill',
      })
    );
  });

  it('skips source-owned records in syncToNative (builtin and native-origin)', async () => {
    const builtin = createFrontendSkill({ id: 'builtin-1', source: 'builtin', syncOrigin: 'builtin' });
    const nativeOrigin = createFrontendSkill({ id: 'native-1', source: 'imported', syncOrigin: 'native' });

    mockGetAllSkills.mockReturnValue([builtin, nativeOrigin]);

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncToNative();
    });

    expect(mockWriteContent).not.toHaveBeenCalled();
    expect(mockRegisterLocal).not.toHaveBeenCalled();
  });

  it('reports i18n failure in syncToNative when write fails', async () => {
    const customSkill = createFrontendSkill({
      id: 'custom-1',
      metadata: { name: 'custom-skill', description: 'desc' },
      source: 'custom',
      syncOrigin: 'frontend',
    });

    mockGetAllSkills.mockReturnValue([customSkill]);
    mockWriteContent.mockRejectedValue(new Error('Write failed'));

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.syncToNative();
    });

    expect(mockSetSyncMetadata).toHaveBeenCalledWith(expect.objectContaining({
      lastSyncError: 'i18n:syncToNativeFailed',
    }));
  });

  it('refreshAll discovers and syncs from native', async () => {
    mockDiscover.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSkillSync());

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(mockDiscover).toHaveBeenCalled();
  });
});

describe('useSkillSyncAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when native skill is available', () => {
    mockNativeSkillAvailable.mockReturnValue(true);

    const { result } = renderHook(() => useSkillSyncAvailable());

    expect(result.current).toBe(true);
  });

  it('returns false when native skill is unavailable', () => {
    mockNativeSkillAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useSkillSyncAvailable());

    expect(result.current).toBe(false);
  });
});
