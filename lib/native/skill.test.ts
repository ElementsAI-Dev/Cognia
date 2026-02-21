/**
 * Native Skill Module Tests
 */

// Mock @tauri-apps/api/core
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  listSkillRepos,
  addSkillRepo,
  removeSkillRepo,
  toggleSkillRepo,
  discoverSkills,
  getAllSkills,
  scanLocalSkills,
  installSkill,
  installLocalSkill,
  registerLocalSkill,
  uninstallSkill,
  getInstalledSkills,
  getSkill,
  enableSkill,
  disableSkill,
  updateSkill,
  readSkillContent,
  writeSkillContent,
  listSkillResources,
  readSkillResource,
  writeSkillResource,
  getSkillSsotDir,
  isNativeSkillAvailable,
  safeSkillInvoke,
  type SkillRepo,
  type DiscoverableSkill,
  type InstalledSkill,
  type NativeSkill,
  type LocalSkill,
} from './skill';

const mockInvoke = jest.mocked(invoke);

describe('Native Skill Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Repository Commands', () => {
    it('should list skill repositories', async () => {
      const mockRepos: SkillRepo[] = [
        { owner: 'anthropics', name: 'skills', branch: 'main', enabled: true },
        { owner: 'ComposioHQ', name: 'awesome-claude-skills', branch: 'master', enabled: true },
      ];
      mockInvoke.mockResolvedValue(mockRepos);

      const repos = await listSkillRepos();

      expect(mockInvoke).toHaveBeenCalledWith('skill_list_repos');
      expect(repos).toEqual(mockRepos);
      expect(repos).toHaveLength(2);
    });

    it('should add a skill repository', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await addSkillRepo({
        owner: 'test-owner',
        name: 'test-repo',
        branch: 'develop',
      });

      expect(mockInvoke).toHaveBeenCalledWith('skill_add_repo', {
        repoUrl: undefined,
        owner: 'test-owner',
        name: 'test-repo',
        branch: 'develop',
        sourcePath: undefined,
      });
    });

    it('should add a skill repository with default branch', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await addSkillRepo({ owner: 'test-owner', name: 'test-repo' });

      expect(mockInvoke).toHaveBeenCalledWith('skill_add_repo', {
        repoUrl: undefined,
        owner: 'test-owner',
        name: 'test-repo',
        branch: undefined,
        sourcePath: undefined,
      });
    });

    it('should add a skill repository using github source URL', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await addSkillRepo({
        repoUrl: 'https://github.com/openclaw/skills/tree/main/skills',
        sourcePath: 'skills',
      });

      expect(mockInvoke).toHaveBeenCalledWith('skill_add_repo', {
        repoUrl: 'https://github.com/openclaw/skills/tree/main/skills',
        owner: undefined,
        name: undefined,
        branch: undefined,
        sourcePath: 'skills',
      });
    });

    it('should remove a skill repository', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await removeSkillRepo('test-owner', 'test-repo');

      expect(mockInvoke).toHaveBeenCalledWith('skill_remove_repo', {
        owner: 'test-owner',
        name: 'test-repo',
      });
    });

    it('should toggle repository enabled state', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await toggleSkillRepo('anthropics', 'skills', false);

      expect(mockInvoke).toHaveBeenCalledWith('skill_toggle_repo', {
        owner: 'anthropics',
        name: 'skills',
        enabled: false,
      });
    });
  });

  describe('Discovery Commands', () => {
    it('should discover skills from repositories', async () => {
      const mockSkills: DiscoverableSkill[] = [
        {
          key: 'anthropics/skills:example',
          name: 'example-skill',
          description: 'An example skill',
          directory: 'example',
          readmeUrl: 'https://github.com/anthropics/skills/tree/main/example',
          repoOwner: 'anthropics',
          repoName: 'skills',
          repoBranch: 'main',
        },
      ];
      mockInvoke.mockResolvedValue(mockSkills);

      const skills = await discoverSkills();

      expect(mockInvoke).toHaveBeenCalledWith('skill_discover');
      expect(skills).toEqual(mockSkills);
    });

    it('should get all skills (merged view)', async () => {
      const mockSkills: NativeSkill[] = [
        {
          key: 'local:test',
          name: 'test-skill',
          description: 'A test skill',
          directory: 'test',
          readmeUrl: null,
          installed: true,
          enabled: true,
          repoOwner: null,
          repoName: null,
          repoBranch: null,
          category: 'development',
          tags: ['test'],
        },
      ];
      mockInvoke.mockResolvedValue(mockSkills);

      const skills = await getAllSkills();

      expect(mockInvoke).toHaveBeenCalledWith('skill_get_all');
      expect(skills).toEqual(mockSkills);
    });

    it('should scan for local skills', async () => {
      const mockLocalSkills: LocalSkill[] = [
        {
          directory: 'unregistered',
          name: 'Unregistered Skill',
          description: 'A skill not yet registered',
          path: '/path/to/skill',
          hasSkillMd: true,
        },
      ];
      mockInvoke.mockResolvedValue(mockLocalSkills);

      const skills = await scanLocalSkills();

      expect(mockInvoke).toHaveBeenCalledWith('skill_scan_local');
      expect(skills).toEqual(mockLocalSkills);
    });
  });

  describe('Installation Commands', () => {
    const mockDiscoverableSkill: DiscoverableSkill = {
      key: 'owner/repo:skill-dir',
      name: 'Test Skill',
      description: 'A test skill',
      directory: 'skill-dir',
      readmeUrl: 'https://example.com',
      repoOwner: 'owner',
      repoName: 'repo',
      repoBranch: 'main',
    };

    const mockInstalledSkill: InstalledSkill = {
      id: 'owner/repo:skill-dir',
      name: 'Test Skill',
      description: 'A test skill',
      directory: 'skill-dir',
      repoOwner: 'owner',
      repoName: 'repo',
      repoBranch: 'main',
      readmeUrl: 'https://example.com',
      installedAt: Date.now(),
      enabled: true,
      category: null,
      tags: [],
    };

    it('should install a skill from repository', async () => {
      mockInvoke.mockResolvedValue(mockInstalledSkill);

      const result = await installSkill(mockDiscoverableSkill);

      expect(mockInvoke).toHaveBeenCalledWith('skill_install', {
        owner: mockDiscoverableSkill.repoOwner,
        repo: mockDiscoverableSkill.repoName,
        branch: mockDiscoverableSkill.repoBranch,
        directory: mockDiscoverableSkill.directory,
        name: mockDiscoverableSkill.name,
        description: mockDiscoverableSkill.description,
        readmeUrl: mockDiscoverableSkill.readmeUrl,
      });
      expect(result).toEqual(mockInstalledSkill);
    });

    it('should install a local skill', async () => {
      const localInstalled: InstalledSkill = {
        ...mockInstalledSkill,
        id: 'local:my-skill',
        repoOwner: null,
        repoName: null,
        repoBranch: null,
      };
      mockInvoke.mockResolvedValue(localInstalled);

      const result = await installLocalSkill('/path/to/skill', 'my-skill');

      expect(mockInvoke).toHaveBeenCalledWith('skill_install_local', {
        sourcePath: '/path/to/skill',
        name: 'my-skill',
      });
      expect(result).toEqual(localInstalled);
    });

    it('should install a local skill without custom name', async () => {
      mockInvoke.mockResolvedValue(mockInstalledSkill);

      await installLocalSkill('/path/to/skill');

      expect(mockInvoke).toHaveBeenCalledWith('skill_install_local', {
        sourcePath: '/path/to/skill',
        name: undefined,
      });
    });

    it('should register a local skill', async () => {
      mockInvoke.mockResolvedValue(mockInstalledSkill);

      const result = await registerLocalSkill('skill-dir');

      expect(mockInvoke).toHaveBeenCalledWith('skill_register_local', {
        directory: 'skill-dir',
      });
      expect(result).toEqual(mockInstalledSkill);
    });

    it('should uninstall a skill', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await uninstallSkill('skill-id');

      expect(mockInvoke).toHaveBeenCalledWith('skill_uninstall', {
        id: 'skill-id',
      });
    });
  });

  describe('State Management Commands', () => {
    const mockInstalledSkill: InstalledSkill = {
      id: 'local:test',
      name: 'Test',
      description: 'Test skill',
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

    it('should get all installed skills', async () => {
      mockInvoke.mockResolvedValue([mockInstalledSkill]);

      const skills = await getInstalledSkills();

      expect(mockInvoke).toHaveBeenCalledWith('skill_get_installed');
      expect(skills).toHaveLength(1);
    });

    it('should get a specific skill', async () => {
      mockInvoke.mockResolvedValue(mockInstalledSkill);

      const skill = await getSkill('local:test');

      expect(mockInvoke).toHaveBeenCalledWith('skill_get', { id: 'local:test' });
      expect(skill).toEqual(mockInstalledSkill);
    });

    it('should return null for non-existent skill', async () => {
      mockInvoke.mockResolvedValue(null);

      const skill = await getSkill('non-existent');

      expect(skill).toBeNull();
    });

    it('should enable a skill', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await enableSkill('local:test');

      expect(mockInvoke).toHaveBeenCalledWith('skill_enable', { id: 'local:test' });
    });

    it('should disable a skill', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await disableSkill('local:test');

      expect(mockInvoke).toHaveBeenCalledWith('skill_disable', { id: 'local:test' });
    });

    it('should update skill metadata', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await updateSkill('local:test', 'development', ['tag1', 'tag2']);

      expect(mockInvoke).toHaveBeenCalledWith('skill_update', {
        id: 'local:test',
        category: 'development',
        tags: ['tag1', 'tag2'],
      });
    });

    it('should update skill with partial metadata', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await updateSkill('local:test', 'productivity');

      expect(mockInvoke).toHaveBeenCalledWith('skill_update', {
        id: 'local:test',
        category: 'productivity',
        tags: undefined,
      });
    });
  });

  describe('Content Commands', () => {
    it('should read skill content', async () => {
      const mockContent = '---\nname: test\n---\n\nSkill content';
      mockInvoke.mockResolvedValue(mockContent);

      const content = await readSkillContent('test-skill');

      expect(mockInvoke).toHaveBeenCalledWith('skill_read_content', {
        directory: 'test-skill',
      });
      expect(content).toBe(mockContent);
    });

    it('should write skill content', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await writeSkillContent('test-skill', 'content');

      expect(mockInvoke).toHaveBeenCalledWith('skill_write_content', {
        directory: 'test-skill',
        content: 'content',
      });
    });


    it('should list skill resources', async () => {
      const mockResources = ['SKILL.md', 'helper.js', 'config.json'];
      mockInvoke.mockResolvedValue(mockResources);

      const resources = await listSkillResources('test-skill');

      expect(mockInvoke).toHaveBeenCalledWith('skill_list_resources', {
        directory: 'test-skill',
      });
      expect(resources).toEqual(mockResources);
    });

    it('should read a skill resource', async () => {
      const mockResourceContent = '{"key": "value"}';
      mockInvoke.mockResolvedValue(mockResourceContent);

      const resource = await readSkillResource('test-skill', 'config.json');

      expect(mockInvoke).toHaveBeenCalledWith('skill_read_resource', {
        directory: 'test-skill',
        resourcePath: 'config.json',
      });
      expect(resource).toBe(mockResourceContent);
    });

    it('should write a skill resource', async () => {
      mockInvoke.mockResolvedValue(undefined);

      await writeSkillResource('skill-dir', 'scripts/test.js', 'console.log(1)');

      expect(mockInvoke).toHaveBeenCalledWith('skill_write_resource', {
        directory: 'skill-dir',
        resourcePath: 'scripts/test.js',
        content: 'console.log(1)',
      });
    });


    it('should get SSOT directory path', async () => {
      const mockPath = '/Users/test/.cognia/skills';
      mockInvoke.mockResolvedValue(mockPath);

      const path = await getSkillSsotDir();

      expect(mockInvoke).toHaveBeenCalledWith('skill_get_ssot_dir');
      expect(path).toBe(mockPath);
    });
  });

  describe('Utility Functions', () => {
    describe('isNativeSkillAvailable', () => {
      it('should return false when not in Tauri environment', () => {
        // Default test environment doesn't have __TAURI_INTERNALS__
        const result = isNativeSkillAvailable();
        expect(result).toBe(false);
      });

      it('should return true when __TAURI_INTERNALS__ is present', () => {
        // In jsdom, we need to set on window directly
        const win = window as unknown as Record<string, unknown>;
        const originalTauri = win.__TAURI_INTERNALS__;
        win.__TAURI_INTERNALS__ = {};

        const result = isNativeSkillAvailable();
        expect(result).toBe(true);

        if (originalTauri === undefined) {
          delete win.__TAURI_INTERNALS__;
        } else {
          win.__TAURI_INTERNALS__ = originalTauri;
        }
      });
    });

    describe('safeSkillInvoke', () => {
      it('should return fallback when not in Tauri environment', async () => {
        const fallback = { test: 'fallback' };
        const operation = jest.fn().mockResolvedValue({ test: 'result' });

        const result = await safeSkillInvoke(operation, fallback);

        expect(operation).not.toHaveBeenCalled();
        expect(result).toEqual(fallback);
      });

      it('should return fallback on error in Tauri environment', async () => {
        const win = window as unknown as Record<string, unknown>;
        const originalTauri = win.__TAURI_INTERNALS__;
        win.__TAURI_INTERNALS__ = {};

        const fallback: string[] = [];
        const operation = jest.fn().mockRejectedValue(new Error('Test error'));

        const result = await safeSkillInvoke(operation, fallback);

        expect(operation).toHaveBeenCalled();
        expect(result).toEqual(fallback);

        if (originalTauri === undefined) {
          delete win.__TAURI_INTERNALS__;
        } else {
          win.__TAURI_INTERNALS__ = originalTauri;
        }
      });

      it('should return result on success in Tauri environment', async () => {
        const win = window as unknown as Record<string, unknown>;
        const originalTauri = win.__TAURI_INTERNALS__;
        win.__TAURI_INTERNALS__ = {};

        const expected = { test: 'result' };
        const operation = jest.fn().mockResolvedValue(expected);

        const result = await safeSkillInvoke(operation, { test: 'fallback' });

        expect(operation).toHaveBeenCalled();
        expect(result).toEqual(expected);

        if (originalTauri === undefined) {
          delete win.__TAURI_INTERNALS__;
        } else {
          win.__TAURI_INTERNALS__ = originalTauri;
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from invoke', async () => {
      mockInvoke.mockRejectedValue(new Error('Network error'));

      await expect(listSkillRepos()).rejects.toThrow('Network error');
    });

    it('should handle installation errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Skill already installed'));

      await expect(
        installSkill({
          key: 'test',
          name: 'test',
          description: 'test',
          directory: 'test',
          readmeUrl: null,
          repoOwner: 'owner',
          repoName: 'repo',
          repoBranch: 'main',
        })
      ).rejects.toThrow('Skill already installed');
    });

    it('should handle uninstall errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Skill not found'));

      await expect(uninstallSkill('non-existent')).rejects.toThrow('Skill not found');
    });
  });

  describe('Type Exports', () => {
    it('should export all required types', () => {
      // Type check - these would fail at compile time if types aren't exported
      const repo: SkillRepo = {
        owner: 'test',
        name: 'test',
        branch: 'main',
        sourcePath: null,
        enabled: true,
      };

      const discoverable: DiscoverableSkill = {
        key: 'test',
        name: 'test',
        description: 'test',
        directory: 'test',
        readmeUrl: null,
        repoOwner: 'owner',
        repoName: 'repo',
        repoBranch: 'main',
      };

      const installed: InstalledSkill = {
        id: 'test',
        name: 'test',
        description: 'test',
        directory: 'test',
        repoOwner: null,
        repoName: null,
        repoBranch: null,
        readmeUrl: null,
        installedAt: 0,
        enabled: true,
        category: null,
        tags: [],
      };

      const native: NativeSkill = {
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
      };

      const local: LocalSkill = {
        directory: 'test',
        name: 'test',
        description: null,
        path: '/test',
        hasSkillMd: true,
      };

      // If we get here, types are correctly exported
      expect(repo).toBeDefined();
      expect(discoverable).toBeDefined();
      expect(installed).toBeDefined();
      expect(native).toBeDefined();
      expect(local).toBeDefined();
    });
  });
});
