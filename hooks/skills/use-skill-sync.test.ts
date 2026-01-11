/**
 * Use Skill Sync Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the native skill module
jest.mock('@/lib/native/skill', () => ({
  isNativeSkillAvailable: jest.fn(() => true),
}));

// Mock the use-native-skills hook
jest.mock('./use-native-skills', () => ({
  useNativeSkills: jest.fn(),
}));

// Mock the skill store
jest.mock('@/stores/skills/skill-store', () => ({
  useSkillStore: jest.fn(),
}));

import * as nativeSkill from '@/lib/native/skill';
import { useNativeSkills } from './use-native-skills';
import { useSkillStore } from '@/stores/skills/skill-store';
import { useSkillSync, useSkillSyncAvailable } from './use-skill-sync';
import type { DiscoverableSkill, InstalledSkill } from './use-native-skills';

const mockNativeSkillAvailable = jest.mocked(nativeSkill.isNativeSkillAvailable);
const mockUseNativeSkills = jest.mocked(useNativeSkills);
const mockUseSkillStore = jest.mocked(useSkillStore);

describe('useSkillSync', () => {
  const mockDiscoverableSkill: DiscoverableSkill = {
    key: 'owner/repo:skill-dir',
    name: 'Test Skill',
    description: 'A test skill from repository',
    directory: 'skill-dir',
    readmeUrl: 'https://github.com/owner/repo/tree/main/skill-dir',
    repoOwner: 'owner',
    repoName: 'repo',
    repoBranch: 'main',
  };

  const mockInstalledSkill: InstalledSkill = {
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

  const mockFrontendSkill = {
    id: 'frontend-skill-1',
    metadata: { name: 'Frontend Skill', description: 'A frontend skill' },
    content: 'Skill content',
    rawContent: '---\nname: Frontend Skill\n---\n\nSkill content',
    resources: [],
    status: 'enabled' as const,
    source: 'custom' as const,
    category: 'custom' as const,
    tags: [],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    usageCount: 0,
  };

  // Mock implementations
  const mockDiscover = jest.fn();
  const mockInstall = jest.fn();
  const mockUninstall = jest.fn();
  const mockReadContent = jest.fn();
  const mockCreateSkill = jest.fn();
  const mockDeleteSkill = jest.fn();
  const mockGetAllSkills = jest.fn();

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
      registerLocal: jest.fn(),
      uninstall: mockUninstall,
      enable: jest.fn(),
      disable: jest.fn(),
      update: jest.fn(),
      readContent: mockReadContent,
      listResources: jest.fn(),
      readResource: jest.fn(),
      getSsotDir: jest.fn(),
      clearError: jest.fn(),
    });

    mockUseSkillStore.mockReturnValue({
      skills: {},
      activeSkillIds: [],
      isLoading: false,
      error: null,
      usageStats: {},
      createSkill: mockCreateSkill,
      updateSkill: jest.fn(),
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
      reset: jest.fn(),
    });

    mockGetAllSkills.mockReturnValue([]);
    mockCreateSkill.mockReturnValue(mockFrontendSkill);
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSkillSync());

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncAt).toBeNull();
      expect(result.current.syncError).toBeNull();
      expect(result.current.discoverable).toEqual([]);
      expect(result.current.isDiscovering).toBe(false);
    });

    it('should update discoverable when native changes', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        discoverable: [mockDiscoverableSkill],
        isDiscovering: true,
      });

      const { result } = renderHook(() => useSkillSync());

      await waitFor(() => {
        expect(result.current.discoverable).toEqual([mockDiscoverableSkill]);
        expect(result.current.isDiscovering).toBe(true);
      });
    });

    it('should update syncError when native error occurs', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        error: 'Native error occurred',
      });

      const { result } = renderHook(() => useSkillSync());

      await waitFor(() => {
        expect(result.current.syncError).toBe('Native error occurred');
      });
    });
  });

  describe('syncFromNative', () => {
    it('should not sync when native is unavailable', async () => {
      mockNativeSkillAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncFromNative();
      });

      expect(mockCreateSkill).not.toHaveBeenCalled();
    });

    it('should create frontend skills for native skills not in frontend', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });
      mockReadContent.mockResolvedValue('# Test Skill\n\nSkill content');

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncFromNative();
      });

      expect(mockReadContent).toHaveBeenCalledWith(mockInstalledSkill.directory);
      expect(mockCreateSkill).toHaveBeenCalled();
      expect(result.current.lastSyncAt).not.toBeNull();
    });

    it('should not create duplicate skills', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });
      mockUseSkillStore.mockReturnValue({
        ...mockUseSkillStore(),
        skills: {
          'existing-id': {
            ...mockFrontendSkill,
            metadata: { name: 'Test Skill', description: 'Already exists' },
          },
        },
      });

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncFromNative();
      });

      expect(mockCreateSkill).not.toHaveBeenCalled();
    });

    it('should handle read content errors gracefully', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });
      mockReadContent.mockRejectedValue(new Error('Read failed'));

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncFromNative();
      });

      // Should still create skill with fallback content
      expect(mockCreateSkill).toHaveBeenCalled();
    });

    it('should handle errors gracefully without crashing', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });
      // Even with read errors, sync should complete without throwing
      mockReadContent.mockRejectedValue(new Error('Read error'));

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncFromNative();
      });

      // Sync should complete (either with lastSyncAt set or error set)
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('installFromRepo', () => {
    it('should return null when native is unavailable', async () => {
      mockNativeSkillAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useSkillSync());

      let installed;
      await act(async () => {
        installed = await result.current.installFromRepo(mockDiscoverableSkill);
      });

      expect(installed).toBeNull();
      expect(result.current.syncError).toBe('Native skill service not available');
    });

    it('should install skill and create frontend entry', async () => {
      mockInstall.mockResolvedValue(mockInstalledSkill);
      mockReadContent.mockResolvedValue('# Test\n\nContent');

      const { result } = renderHook(() => useSkillSync());

      let installed;
      await act(async () => {
        installed = await result.current.installFromRepo(mockDiscoverableSkill);
      });

      expect(mockInstall).toHaveBeenCalledWith(mockDiscoverableSkill);
      expect(mockCreateSkill).toHaveBeenCalled();
      expect(installed).toEqual(mockFrontendSkill);
      expect(result.current.lastSyncAt).not.toBeNull();
    });

    it('should handle installation errors', async () => {
      mockInstall.mockRejectedValue(new Error('Installation failed'));

      const { result } = renderHook(() => useSkillSync());

      let installed;
      await act(async () => {
        installed = await result.current.installFromRepo(mockDiscoverableSkill);
      });

      expect(installed).toBeNull();
      expect(result.current.syncError).toContain('Installation failed');
    });

    it('should set isSyncing during installation', async () => {
      let resolveInstall: (value: InstalledSkill) => void;
      mockInstall.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInstall = resolve;
          })
      );

      const { result } = renderHook(() => useSkillSync());

      act(() => {
        result.current.installFromRepo(mockDiscoverableSkill);
      });

      expect(result.current.isSyncing).toBe(true);

      await act(async () => {
        resolveInstall!(mockInstalledSkill);
      });

      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('uninstallNativeSkill', () => {
    it('should not uninstall when native is unavailable', async () => {
      mockNativeSkillAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.uninstallNativeSkill('skill-id');
      });

      expect(mockUninstall).not.toHaveBeenCalled();
    });

    it('should uninstall native skill and delete frontend entry', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });
      mockUseSkillStore.mockReturnValue({
        ...mockUseSkillStore(),
        skills: {
          'frontend-skill-1': {
            ...mockFrontendSkill,
            metadata: { name: 'Test Skill', description: 'Test' },
          },
        },
      });
      mockUninstall.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.uninstallNativeSkill(mockInstalledSkill.id);
      });

      expect(mockDeleteSkill).toHaveBeenCalledWith('frontend-skill-1');
      expect(mockUninstall).toHaveBeenCalledWith(mockInstalledSkill.id);
      expect(result.current.lastSyncAt).not.toBeNull();
    });

    it('should handle uninstall errors', async () => {
      mockUseNativeSkills.mockReturnValue({
        ...mockUseNativeSkills(),
        installed: [mockInstalledSkill],
      });
      mockUninstall.mockRejectedValue(new Error('Uninstall failed'));

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.uninstallNativeSkill(mockInstalledSkill.id);
      });

      expect(result.current.syncError).toContain('Uninstall failed');
    });
  });

  describe('discoverFromRepos', () => {
    it('should not discover when native is unavailable', async () => {
      mockNativeSkillAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.discoverFromRepos();
      });

      expect(mockDiscover).not.toHaveBeenCalled();
    });

    it('should call native discover', async () => {
      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.discoverFromRepos();
      });

      expect(mockDiscover).toHaveBeenCalled();
    });
  });

  describe('refreshAll', () => {
    it('should discover and sync', async () => {
      mockDiscover.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockDiscover).toHaveBeenCalled();
    });
  });

  describe('syncToNative', () => {
    it('should not sync when native is unavailable', async () => {
      mockNativeSkillAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncToNative();
      });

      expect(mockGetAllSkills).not.toHaveBeenCalled();
    });

    it('should iterate through custom skills', async () => {
      mockGetAllSkills.mockReturnValue([mockFrontendSkill]);

      const { result } = renderHook(() => useSkillSync());

      await act(async () => {
        await result.current.syncToNative();
      });

      expect(mockGetAllSkills).toHaveBeenCalled();
      expect(result.current.lastSyncAt).not.toBeNull();
    });
  });
});

describe('useSkillSyncAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when native skill is available', () => {
    mockNativeSkillAvailable.mockReturnValue(true);

    const { result } = renderHook(() => useSkillSyncAvailable());

    expect(result.current).toBe(true);
  });

  it('should return false when native skill is unavailable', () => {
    mockNativeSkillAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useSkillSyncAvailable());

    expect(result.current).toBe(false);
  });
});
