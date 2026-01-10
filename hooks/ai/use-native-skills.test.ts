/**
 * Use Native Skills Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the native skill module
jest.mock('@/lib/native/skill', () => ({
  isNativeSkillAvailable: jest.fn(() => true),
  listSkillRepos: jest.fn(),
  addSkillRepo: jest.fn(),
  removeSkillRepo: jest.fn(),
  toggleSkillRepo: jest.fn(),
  discoverSkills: jest.fn(),
  getAllSkills: jest.fn(),
  scanLocalSkills: jest.fn(),
  installSkill: jest.fn(),
  installLocalSkill: jest.fn(),
  registerLocalSkill: jest.fn(),
  uninstallSkill: jest.fn(),
  getInstalledSkills: jest.fn(),
  getSkill: jest.fn(),
  enableSkill: jest.fn(),
  disableSkill: jest.fn(),
  updateSkill: jest.fn(),
  readSkillContent: jest.fn(),
  listSkillResources: jest.fn(),
  readSkillResource: jest.fn(),
  getSkillSsotDir: jest.fn(),
}));

import * as nativeSkill from '@/lib/native/skill';
import { useNativeSkills, useNativeSkillAvailable } from './use-native-skills';
import type {
  SkillRepo,
  DiscoverableSkill,
  InstalledSkill,
} from './use-native-skills';

const mockNativeSkill = jest.mocked(nativeSkill);

describe('useNativeSkills', () => {
  const mockRepos: SkillRepo[] = [
    { owner: 'anthropics', name: 'skills', branch: 'main', enabled: true },
    { owner: 'ComposioHQ', name: 'awesome-claude-skills', branch: 'master', enabled: true },
  ];

  const mockInstalledSkill: InstalledSkill = {
    id: 'local:test',
    name: 'Test Skill',
    description: 'A test skill',
    directory: 'test',
    repoOwner: null,
    repoName: null,
    repoBranch: null,
    readmeUrl: null,
    installedAt: Date.now(),
    enabled: true,
    category: null,
    tags: [],
  };

  const mockDiscoverableSkill: DiscoverableSkill = {
    key: 'owner/repo:skill',
    name: 'Discoverable Skill',
    description: 'A skill from repo',
    directory: 'skill',
    readmeUrl: 'https://example.com',
    repoOwner: 'owner',
    repoName: 'repo',
    repoBranch: 'main',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNativeSkill.isNativeSkillAvailable.mockReturnValue(true);
    mockNativeSkill.listSkillRepos.mockResolvedValue(mockRepos);
    mockNativeSkill.getInstalledSkills.mockResolvedValue([mockInstalledSkill]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useNativeSkills());

      expect(result.current.repos).toEqual([]);
      expect(result.current.discoverable).toEqual([]);
      expect(result.current.installed).toEqual([]);
      expect(result.current.local).toEqual([]);
      expect(result.current.allSkills).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isDiscovering).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch repos and installed skills on mount', async () => {
      const { result } = renderHook(() => useNativeSkills());

      await waitFor(() => {
        expect(result.current.repos).toEqual(mockRepos);
        expect(result.current.installed).toEqual([mockInstalledSkill]);
      });

      expect(mockNativeSkill.listSkillRepos).toHaveBeenCalled();
      expect(mockNativeSkill.getInstalledSkills).toHaveBeenCalled();
    });

    it('should not fetch when native skill is unavailable', async () => {
      mockNativeSkill.isNativeSkillAvailable.mockReturnValue(false);

      renderHook(() => useNativeSkills());

      // Give time for potential async calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockNativeSkill.listSkillRepos).not.toHaveBeenCalled();
      expect(mockNativeSkill.getInstalledSkills).not.toHaveBeenCalled();
    });
  });

  describe('Repository Management', () => {
    it('should refresh repos', async () => {
      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.refreshRepos();
      });

      expect(mockNativeSkill.listSkillRepos).toHaveBeenCalled();
      expect(result.current.repos).toEqual(mockRepos);
    });

    it('should add a repo', async () => {
      mockNativeSkill.addSkillRepo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.addRepo('new-owner', 'new-repo', 'develop');
      });

      expect(mockNativeSkill.addSkillRepo).toHaveBeenCalledWith(
        'new-owner',
        'new-repo',
        'develop'
      );
    });

    it('should remove a repo', async () => {
      mockNativeSkill.removeSkillRepo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.removeRepo('anthropics', 'skills');
      });

      expect(mockNativeSkill.removeSkillRepo).toHaveBeenCalledWith(
        'anthropics',
        'skills'
      );
    });

    it('should toggle a repo', async () => {
      mockNativeSkill.toggleSkillRepo.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.toggleRepo('anthropics', 'skills', false);
      });

      expect(mockNativeSkill.toggleSkillRepo).toHaveBeenCalledWith(
        'anthropics',
        'skills',
        false
      );
    });
  });

  describe('Discovery', () => {
    it('should discover skills', async () => {
      mockNativeSkill.discoverSkills.mockResolvedValue([mockDiscoverableSkill]);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.discover();
      });

      expect(result.current.discoverable).toEqual([mockDiscoverableSkill]);
      expect(result.current.isDiscovering).toBe(false);
    });

    it('should set isDiscovering during discovery', async () => {
      let resolveDiscover: (value: DiscoverableSkill[]) => void;
      mockNativeSkill.discoverSkills.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveDiscover = resolve;
          })
      );

      const { result } = renderHook(() => useNativeSkills());

      act(() => {
        result.current.discover();
      });

      expect(result.current.isDiscovering).toBe(true);

      await act(async () => {
        resolveDiscover!([]);
      });

      expect(result.current.isDiscovering).toBe(false);
    });

    it('should refresh all skills', async () => {
      mockNativeSkill.getAllSkills.mockResolvedValue([
        {
          key: 'test',
          name: 'test',
          description: 'test',
          directory: 'test',
          readmeUrl: null,
          installed: true,
          enabled: true,
          repoOwner: null,
          repoName: null,
          repoBranch: null,
          category: null,
          tags: null,
        },
      ]);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockNativeSkill.getAllSkills).toHaveBeenCalled();
      expect(result.current.allSkills).toHaveLength(1);
    });

    it('should scan local skills', async () => {
      mockNativeSkill.scanLocalSkills.mockResolvedValue([
        {
          directory: 'local',
          name: 'Local Skill',
          description: null,
          path: '/path',
          hasSkillMd: true,
        },
      ]);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.scanLocal();
      });

      expect(mockNativeSkill.scanLocalSkills).toHaveBeenCalled();
      expect(result.current.local).toHaveLength(1);
    });
  });

  describe('Installation', () => {
    it('should install a skill', async () => {
      mockNativeSkill.installSkill.mockResolvedValue(mockInstalledSkill);

      const { result } = renderHook(() => useNativeSkills());

      let installed: InstalledSkill | undefined;
      await act(async () => {
        installed = await result.current.install(mockDiscoverableSkill);
      });

      expect(mockNativeSkill.installSkill).toHaveBeenCalledWith(mockDiscoverableSkill);
      expect(installed).toEqual(mockInstalledSkill);
    });

    it('should install a local skill', async () => {
      mockNativeSkill.installLocalSkill.mockResolvedValue(mockInstalledSkill);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.installLocal('/path/to/skill', 'custom-name');
      });

      expect(mockNativeSkill.installLocalSkill).toHaveBeenCalledWith(
        '/path/to/skill',
        'custom-name'
      );
    });

    it('should register a local skill', async () => {
      mockNativeSkill.registerLocalSkill.mockResolvedValue(mockInstalledSkill);
      mockNativeSkill.scanLocalSkills.mockResolvedValue([]);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.registerLocal('skill-dir');
      });

      expect(mockNativeSkill.registerLocalSkill).toHaveBeenCalledWith('skill-dir');
    });

    it('should uninstall a skill', async () => {
      mockNativeSkill.uninstallSkill.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.uninstall('local:test');
      });

      expect(mockNativeSkill.uninstallSkill).toHaveBeenCalledWith('local:test');
    });

    it('should set isLoading during installation', async () => {
      let resolveInstall: (value: InstalledSkill) => void;
      mockNativeSkill.installSkill.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveInstall = resolve;
          })
      );

      const { result } = renderHook(() => useNativeSkills());

      act(() => {
        result.current.install(mockDiscoverableSkill);
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveInstall!(mockInstalledSkill);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should enable a skill', async () => {
      mockNativeSkill.enableSkill.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.enable('local:test');
      });

      expect(mockNativeSkill.enableSkill).toHaveBeenCalledWith('local:test');
    });

    it('should disable a skill', async () => {
      mockNativeSkill.disableSkill.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.disable('local:test');
      });

      expect(mockNativeSkill.disableSkill).toHaveBeenCalledWith('local:test');
    });

    it('should update skill metadata', async () => {
      mockNativeSkill.updateSkill.mockResolvedValue(undefined);

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.update('local:test', 'development', ['tag1']);
      });

      expect(mockNativeSkill.updateSkill).toHaveBeenCalledWith(
        'local:test',
        'development',
        ['tag1']
      );
    });
  });

  describe('Content', () => {
    it('should read skill content', async () => {
      mockNativeSkill.readSkillContent.mockResolvedValue('---\nname: test\n---');

      const { result } = renderHook(() => useNativeSkills());

      let content: string | undefined;
      await act(async () => {
        content = await result.current.readContent('test');
      });

      expect(mockNativeSkill.readSkillContent).toHaveBeenCalledWith('test');
      expect(content).toBe('---\nname: test\n---');
    });

    it('should list skill resources', async () => {
      mockNativeSkill.listSkillResources.mockResolvedValue(['SKILL.md', 'helper.js']);

      const { result } = renderHook(() => useNativeSkills());

      let resources: string[] | undefined;
      await act(async () => {
        resources = await result.current.listResources('test');
      });

      expect(mockNativeSkill.listSkillResources).toHaveBeenCalledWith('test');
      expect(resources).toEqual(['SKILL.md', 'helper.js']);
    });

    it('should read skill resource', async () => {
      mockNativeSkill.readSkillResource.mockResolvedValue('content');

      const { result } = renderHook(() => useNativeSkills());

      let content: string | undefined;
      await act(async () => {
        content = await result.current.readResource('test', 'file.txt');
      });

      expect(mockNativeSkill.readSkillResource).toHaveBeenCalledWith('test', 'file.txt');
      expect(content).toBe('content');
    });

    it('should get SSOT directory', async () => {
      mockNativeSkill.getSkillSsotDir.mockResolvedValue('/path/to/ssot');

      const { result } = renderHook(() => useNativeSkills());

      let path: string | undefined;
      await act(async () => {
        path = await result.current.getSsotDir();
      });

      expect(mockNativeSkill.getSkillSsotDir).toHaveBeenCalled();
      expect(path).toBe('/path/to/ssot');
    });
  });

  describe('Error Handling', () => {
    it('should set error on initialization failure', async () => {
      mockNativeSkill.listSkillRepos.mockRejectedValue(new Error('Init error'));

      const { result } = renderHook(() => useNativeSkills());

      await waitFor(() => {
        expect(result.current.error).toBe('Error: Init error');
      });
    });

    it('should set error on add repo failure', async () => {
      mockNativeSkill.addSkillRepo.mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        try {
          await result.current.addRepo('test', 'repo');
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Error: Add failed');
    });

    it('should set error on install failure', async () => {
      mockNativeSkill.installSkill.mockRejectedValue(
        new Error('Already installed')
      );

      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        try {
          await result.current.install(mockDiscoverableSkill);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Error: Already installed');
    });

    it('should clear error', async () => {
      mockNativeSkill.listSkillRepos.mockRejectedValue(new Error('Error'));

      const { result } = renderHook(() => useNativeSkills());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should throw when native unavailable for content operations', async () => {
      mockNativeSkill.isNativeSkillAvailable.mockReturnValue(false);

      const { result } = renderHook(() => useNativeSkills());

      await expect(result.current.readContent('test')).rejects.toThrow(
        'Native skill service not available'
      );
    });
  });

  describe('No-op when unavailable', () => {
    beforeEach(() => {
      mockNativeSkill.isNativeSkillAvailable.mockReturnValue(false);
    });

    it('should not call refreshRepos when unavailable', async () => {
      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.refreshRepos();
      });

      expect(mockNativeSkill.listSkillRepos).not.toHaveBeenCalled();
    });

    it('should not call addRepo when unavailable', async () => {
      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.addRepo('test', 'repo');
      });

      expect(mockNativeSkill.addSkillRepo).not.toHaveBeenCalled();
    });

    it('should not call discover when unavailable', async () => {
      const { result } = renderHook(() => useNativeSkills());

      await act(async () => {
        await result.current.discover();
      });

      expect(mockNativeSkill.discoverSkills).not.toHaveBeenCalled();
    });
  });
});

describe('useNativeSkillAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when native skill is available', () => {
    mockNativeSkill.isNativeSkillAvailable.mockReturnValue(true);

    const { result } = renderHook(() => useNativeSkillAvailable());

    expect(result.current).toBe(true);
  });

  it('should return false when native skill is unavailable', () => {
    mockNativeSkill.isNativeSkillAvailable.mockReturnValue(false);

    const { result } = renderHook(() => useNativeSkillAvailable());

    expect(result.current).toBe(false);
  });
});
