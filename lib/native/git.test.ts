/**
 * Git Service Tests
 *
 * Tests for Git native API functions.
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
}));

jest.mock('./utils', () => ({
  isTauri: jest.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './utils';
import {
  isGitAvailable,
  getPlatform,
  checkGitInstalled,
  installGit,
  openGitWebsite,
  getGitConfig,
  setGitConfig,
  initRepo,
  cloneRepo,
  getRepoStatus,
  isGitRepo,
  stageFiles,
  stageAll,
  unstageFiles,
  commit,
  getLog,
  getFileStatus,
  getDiff,
  getDiffBetween,
  push,
  pull,
  fetch,
  getRemotes,
  addRemote,
  removeRemote,
  getBranches,
  createBranch,
  deleteBranch,
  checkout,
  merge,
  stash,
  reset,
  discardChanges,
  onGitProgress,
  onGitInstallProgress,
  initProjectRepo,
  autoCommit,
  gitService,
} from './git';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockListen = listen as jest.MockedFunction<typeof listen>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('Git - Availability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGitAvailable', () => {
    it('should return true when in Tauri environment', () => {
      mockIsTauri.mockReturnValue(true);
      expect(isGitAvailable()).toBe(true);
    });

    it('should return false when not in Tauri environment', () => {
      mockIsTauri.mockReturnValue(false);
      expect(isGitAvailable()).toBe(false);
    });
  });

  describe('getPlatform', () => {
    it('should return unknown when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await getPlatform();
      expect(result).toBe('unknown');
    });

    it('should return platform from invoke', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue('windows');

      const result = await getPlatform();
      expect(mockInvoke).toHaveBeenCalledWith('git_get_platform');
      expect(result).toBe('windows');
    });

    it('should return unknown on error', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockRejectedValue(new Error('Test error'));

      const result = await getPlatform();
      expect(result).toBe('unknown');
    });
  });
});

describe('Git - Installation Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGitInstalled', () => {
    it('should return error status when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const result = await checkGitInstalled();
      expect(result.installed).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toContain('Tauri');
    });

    it('should return Git status from invoke', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockStatus = {
        installed: true,
        version: '2.43.0',
        path: 'C:\\Program Files\\Git\\cmd\\git.exe',
        status: 'ready',
        lastChecked: new Date().toISOString(),
      };
      mockInvoke.mockResolvedValue(mockStatus);

      const result = await checkGitInstalled();
      expect(mockInvoke).toHaveBeenCalledWith('git_check_installed');
      expect(result).toEqual(mockStatus);
    });

    it('should return error status on invoke error', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockRejectedValue(new Error('Network error'));

      const result = await checkGitInstalled();
      expect(result.installed).toBe(false);
      expect(result.status).toBe('error');
    });
  });

  describe('installGit', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(installGit()).rejects.toThrow('Tauri');
    });

    it('should call invoke with correct command', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue({ installed: true });

      await installGit();
      expect(mockInvoke).toHaveBeenCalledWith('git_install');
    });
  });

  describe('openGitWebsite', () => {
    const originalOpen = window.open;

    beforeEach(() => {
      window.open = jest.fn();
    });

    afterEach(() => {
      window.open = originalOpen;
    });

    it('should open browser when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      await openGitWebsite();
      expect(window.open).toHaveBeenCalledWith('https://git-scm.com/downloads', '_blank');
    });

    it('should call invoke when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);

      await openGitWebsite();
      expect(mockInvoke).toHaveBeenCalledWith('git_open_website');
    });
  });
});

describe('Git - Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGitConfig', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getGitConfig()).rejects.toThrow('Tauri');
    });

    it('should return config from invoke', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockConfig = { userName: 'Test User', userEmail: 'test@example.com' };
      mockInvoke.mockResolvedValue(mockConfig);

      const result = await getGitConfig();
      expect(mockInvoke).toHaveBeenCalledWith('git_get_config');
      expect(result).toEqual(mockConfig);
    });
  });

  describe('setGitConfig', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(setGitConfig({})).rejects.toThrow('Tauri');
    });

    it('should call invoke with config', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue(undefined);
      const config = { userName: 'New User' };

      await setGitConfig(config);
      expect(mockInvoke).toHaveBeenCalledWith('git_set_config', { config });
    });
  });
});

describe('Git - Repository Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('initRepo', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(initRepo({ path: '/test' })).rejects.toThrow('Tauri');
    });

    it('should call invoke with options', async () => {
      const options = { path: '/test/repo', initialBranch: 'main' };
      mockInvoke.mockResolvedValue({ success: true });

      await initRepo(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_init', { options });
    });
  });

  describe('cloneRepo', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(cloneRepo({ url: 'https://github.com/test/repo', targetPath: '/test' })).rejects.toThrow('Tauri');
    });

    it('should call invoke with options', async () => {
      mockIsTauri.mockReturnValue(true);
      const options = { url: 'https://github.com/test/repo', targetPath: '/test' };
      mockInvoke.mockResolvedValue({ success: true });

      await cloneRepo(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_clone', { options });
    });
  });

  describe('getRepoStatus', () => {
    it('should call invoke with repo path', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await getRepoStatus('/path/to/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_status', { repoPath: '/path/to/repo' });
    });
  });

  describe('isGitRepo', () => {
    it('should return false when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await isGitRepo('/path');
      expect(result).toBe(false);
    });

    it('should return result from invoke', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await isGitRepo('/path/to/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_is_repo', { path: '/path/to/repo' });
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Test error'));

      const result = await isGitRepo('/path');
      expect(result).toBe(false);
    });
  });
});

describe('Git - Commit Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('stageFiles', () => {
    it('should call invoke with repo path and files', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await stageFiles('/repo', ['file1.ts', 'file2.ts']);
      expect(mockInvoke).toHaveBeenCalledWith('git_stage', {
        repoPath: '/repo',
        files: ['file1.ts', 'file2.ts'],
      });
    });
  });

  describe('stageAll', () => {
    it('should call invoke with repo path', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await stageAll('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_stage_all', { repoPath: '/repo' });
    });
  });

  describe('unstageFiles', () => {
    it('should call invoke with repo path and files', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await unstageFiles('/repo', ['file1.ts']);
      expect(mockInvoke).toHaveBeenCalledWith('git_unstage', {
        repoPath: '/repo',
        files: ['file1.ts'],
      });
    });
  });

  describe('commit', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', message: 'Test commit' };
      mockInvoke.mockResolvedValue({ success: true });

      await commit(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_commit', { options });
    });
  });

  describe('getLog', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', limit: 10 };
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await getLog(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_log', { options });
    });
  });

  describe('getFileStatus', () => {
    it('should call invoke with repo path', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await getFileStatus('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_file_status', { repoPath: '/repo' });
    });
  });

  describe('getDiff', () => {
    it('should call invoke with repo path and staged flag', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await getDiff('/repo', true);
      expect(mockInvoke).toHaveBeenCalledWith('git_diff', { repoPath: '/repo', staged: true });
    });
  });

  describe('getDiffBetween', () => {
    it('should call invoke with refs', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await getDiffBetween('/repo', 'HEAD~1', 'HEAD');
      expect(mockInvoke).toHaveBeenCalledWith('git_diff_between', {
        repoPath: '/repo',
        fromRef: 'HEAD~1',
        toRef: 'HEAD',
      });
    });
  });
});

describe('Git - Remote Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('push', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', remote: 'origin', branch: 'main' };
      mockInvoke.mockResolvedValue({ success: true });

      await push(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_push', { options });
    });
  });

  describe('pull', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', remote: 'origin', branch: 'main' };
      mockInvoke.mockResolvedValue({ success: true });

      await pull(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_pull', { options });
    });
  });

  describe('fetch', () => {
    it('should call invoke with repo path and remote', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await fetch('/repo', 'origin');
      expect(mockInvoke).toHaveBeenCalledWith('git_fetch', { repoPath: '/repo', remote: 'origin' });
    });
  });

  describe('getRemotes', () => {
    it('should call invoke with repo path', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await getRemotes('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_remotes', { repoPath: '/repo' });
    });
  });

  describe('addRemote', () => {
    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await addRemote('/repo', 'upstream', 'https://github.com/upstream/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_add_remote', {
        repoPath: '/repo',
        name: 'upstream',
        url: 'https://github.com/upstream/repo',
      });
    });
  });

  describe('removeRemote', () => {
    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await removeRemote('/repo', 'upstream');
      expect(mockInvoke).toHaveBeenCalledWith('git_remove_remote', {
        repoPath: '/repo',
        name: 'upstream',
      });
    });
  });
});

describe('Git - Branch Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getBranches', () => {
    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await getBranches('/repo', true);
      expect(mockInvoke).toHaveBeenCalledWith('git_branches', {
        repoPath: '/repo',
        includeRemote: true,
      });
    });
  });

  describe('createBranch', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', name: 'feature/test' };
      mockInvoke.mockResolvedValue({ success: true });

      await createBranch(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_create_branch', { options });
    });
  });

  describe('deleteBranch', () => {
    it('should call invoke with options including delete flag', async () => {
      const options = { repoPath: '/repo', name: 'feature/test' };
      mockInvoke.mockResolvedValue({ success: true });

      await deleteBranch(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_delete_branch', {
        options: { ...options, delete: true },
      });
    });
  });

  describe('checkout', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', target: 'main' };
      mockInvoke.mockResolvedValue({ success: true });

      await checkout(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_checkout', { options });
    });
  });

  describe('merge', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', branch: 'feature/test' };
      mockInvoke.mockResolvedValue({ success: true });

      await merge(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_merge', { options });
    });
  });
});

describe('Git - Stash and Reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('stash', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', action: 'save' as const, message: 'WIP' };
      mockInvoke.mockResolvedValue({ success: true });

      await stash(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_stash', { options });
    });
  });

  describe('reset', () => {
    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', mode: 'mixed' as const };
      mockInvoke.mockResolvedValue({ success: true });

      await reset(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_reset', { options });
    });
  });

  describe('discardChanges', () => {
    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true });

      await discardChanges('/repo', ['file1.ts', 'file2.ts']);
      expect(mockInvoke).toHaveBeenCalledWith('git_discard_changes', {
        repoPath: '/repo',
        files: ['file1.ts', 'file2.ts'],
      });
    });
  });
});

describe('Git - Event Listeners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onGitProgress', () => {
    it('should return no-op when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);

      const unlisten = await onGitProgress(() => {});
      expect(typeof unlisten).toBe('function');
      expect(mockListen).not.toHaveBeenCalled();
    });

    it('should set up listener when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockUnlisten = jest.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      await onGitProgress(() => {});
      expect(mockListen).toHaveBeenCalledWith('git-operation-progress', expect.any(Function));
    });
  });

  describe('onGitInstallProgress', () => {
    it('should set up listener for install progress', async () => {
      mockIsTauri.mockReturnValue(true);
      mockListen.mockResolvedValue(jest.fn());

      await onGitInstallProgress(() => {});
      expect(mockListen).toHaveBeenCalledWith('git-install-progress', expect.any(Function));
    });
  });
});

describe('Git - High-Level Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('initProjectRepo', () => {
    it('should throw error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(initProjectRepo('/project')).rejects.toThrow('Tauri');
    });

    it('should initialize repo with options', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });

      await initProjectRepo('/project', { initialBranch: 'main' });
      expect(mockInvoke).toHaveBeenCalledWith('git_init', {
        options: { path: '/project', initialBranch: 'main' },
      });
    });
  });

  describe('autoCommit', () => {
    it('should stage all and commit', async () => {
      mockInvoke.mockResolvedValueOnce({ success: true }); // stageAll
      mockInvoke.mockResolvedValueOnce({ success: true, data: {} }); // commit

      await autoCommit('/repo', 'Auto save', 'Test context');

      expect(mockInvoke).toHaveBeenCalledWith('git_stage_all', { repoPath: '/repo' });
      expect(mockInvoke).toHaveBeenCalledWith('git_commit', {
        options: expect.objectContaining({
          repoPath: '/repo',
          message: expect.stringContaining('Auto save: Test context'),
        }),
      });
    });

    it('should return error if stage fails', async () => {
      mockInvoke.mockResolvedValue({ success: false, error: 'Stage failed' });

      const result = await autoCommit('/repo', 'Auto save');
      expect(result.success).toBe(false);
    });
  });
});

describe('Git - Service Object', () => {
  it('should expose all functions', () => {
    expect(gitService.isAvailable).toBe(isGitAvailable);
    expect(gitService.getPlatform).toBe(getPlatform);
    expect(gitService.checkInstalled).toBe(checkGitInstalled);
    expect(gitService.install).toBe(installGit);
    expect(gitService.openWebsite).toBe(openGitWebsite);
    expect(gitService.getConfig).toBe(getGitConfig);
    expect(gitService.setConfig).toBe(setGitConfig);
    expect(gitService.init).toBe(initRepo);
    expect(gitService.clone).toBe(cloneRepo);
    expect(gitService.getStatus).toBe(getRepoStatus);
    expect(gitService.isRepo).toBe(isGitRepo);
    expect(gitService.stage).toBe(stageFiles);
    expect(gitService.stageAll).toBe(stageAll);
    expect(gitService.unstage).toBe(unstageFiles);
    expect(gitService.commit).toBe(commit);
    expect(gitService.getLog).toBe(getLog);
    expect(gitService.push).toBe(push);
    expect(gitService.pull).toBe(pull);
    expect(gitService.fetch).toBe(fetch);
    expect(gitService.getBranches).toBe(getBranches);
    expect(gitService.createBranch).toBe(createBranch);
    expect(gitService.deleteBranch).toBe(deleteBranch);
    expect(gitService.checkout).toBe(checkout);
    expect(gitService.merge).toBe(merge);
    expect(gitService.stash).toBe(stash);
    expect(gitService.reset).toBe(reset);
    expect(gitService.discardChanges).toBe(discardChanges);
  });
});
