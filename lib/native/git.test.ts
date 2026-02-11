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

jest.mock('@/lib/logger', () => ({
  loggers: {
    native: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  },
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
  getDiffFile,
  getStashList,
  getFullStatus,
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
  renameBranch,
  mergeAbort,
  stash,
  reset,
  discardChanges,
  onGitProgress,
  onGitInstallProgress,
  initProjectRepo,
  autoCommit,
  exportChatToGit,
  exportDesignerToGit,
  restoreChatFromGit,
  restoreDesignerFromGit,
  revertCommit,
  revertAbort,
  cherryPick,
  cherryPickAbort,
  showCommit,
  getBlame,
  getBlameLine,
  recordOperation,
  getOperationHistory,
  undoLastOperation,
  clearOperationHistory,
  getReflog,
  recoverToReflog,
  listCredentials,
  setCredential,
  removeCredential,
  detectSshKeys,
  testCredential,
  getTagList,
  createTag,
  deleteTag,
  pushTag,
  git2IsAvailable,
  git2IsRepo,
  git2GetStatus,
  git2GetFileStatus,
  git2GetBranches,
  git2StageFiles,
  git2StageAll,
  git2CreateCommit,
  git2InitRepo,
  git2FetchRemote,
  getLogGraph,
  getRepoStats,
  checkpointCreate,
  checkpointList,
  checkpointRestore,
  checkpointDelete,
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

describe('Git - Graph API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getLogGraph', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await getLogGraph('/repo');
      expect(result.success).toBe(false);
    });

    it('should invoke git_log_graph with repoPath', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await getLogGraph('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_log_graph', { repoPath: '/repo', maxCount: undefined });
    });

    it('should pass maxCount parameter', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await getLogGraph('/repo', 50);
      expect(mockInvoke).toHaveBeenCalledWith('git_log_graph', { repoPath: '/repo', maxCount: 50 });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Graph failed'));
      const result = await getLogGraph('/repo');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Graph failed');
    });
  });
});

describe('Git - Stats API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getRepoStats', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await getRepoStats('/repo');
      expect(result.success).toBe(false);
    });

    it('should invoke git_repo_stats', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await getRepoStats('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_repo_stats', { repoPath: '/repo' });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Stats failed'));
      const result = await getRepoStats('/repo');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Stats failed');
    });
  });
});

describe('Git - Checkpoint API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('checkpointCreate', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await checkpointCreate('/repo');
      expect(result.success).toBe(false);
    });

    it('should invoke git_checkpoint_create', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await checkpointCreate('/repo', 'Test checkpoint');
      expect(mockInvoke).toHaveBeenCalledWith('git_checkpoint_create', {
        repoPath: '/repo',
        message: 'Test checkpoint',
      });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Create failed'));
      const result = await checkpointCreate('/repo');
      expect(result.success).toBe(false);
    });
  });

  describe('checkpointList', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await checkpointList('/repo');
      expect(result.success).toBe(false);
    });

    it('should invoke git_checkpoint_list', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await checkpointList('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_checkpoint_list', { repoPath: '/repo' });
    });
  });

  describe('checkpointRestore', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await checkpointRestore('/repo', 'cp-id');
      expect(result.success).toBe(false);
    });

    it('should invoke git_checkpoint_restore', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await checkpointRestore('/repo', 'cp-id');
      expect(mockInvoke).toHaveBeenCalledWith('git_checkpoint_restore', {
        repoPath: '/repo',
        checkpointId: 'cp-id',
      });
    });
  });

  describe('checkpointDelete', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await checkpointDelete('/repo', 'cp-id');
      expect(result.success).toBe(false);
    });

    it('should invoke git_checkpoint_delete', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await checkpointDelete('/repo', 'cp-id');
      expect(mockInvoke).toHaveBeenCalledWith('git_checkpoint_delete', {
        repoPath: '/repo',
        checkpointId: 'cp-id',
      });
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

  it('should expose graph, stats, and checkpoint functions', () => {
    expect(gitService.getLogGraph).toBe(getLogGraph);
    expect(gitService.getRepoStats).toBe(getRepoStats);
    expect(gitService.checkpointCreate).toBe(checkpointCreate);
    expect(gitService.checkpointList).toBe(checkpointList);
    expect(gitService.checkpointRestore).toBe(checkpointRestore);
    expect(gitService.checkpointDelete).toBe(checkpointDelete);
  });

  it('should expose advanced operation functions', () => {
    expect(gitService.revert).toBe(revertCommit);
    expect(gitService.revertAbort).toBe(revertAbort);
    expect(gitService.cherryPick).toBe(cherryPick);
    expect(gitService.cherryPickAbort).toBe(cherryPickAbort);
    expect(gitService.showCommit).toBe(showCommit);
    expect(gitService.blame).toBe(getBlame);
    expect(gitService.blameLine).toBe(getBlameLine);
    expect(gitService.renameBranch).toBe(renameBranch);
    expect(gitService.mergeAbort).toBe(mergeAbort);
  });

  it('should expose history & credential functions', () => {
    expect(gitService.recordOperation).toBe(recordOperation);
    expect(gitService.getHistory).toBe(getOperationHistory);
    expect(gitService.undoLast).toBe(undoLastOperation);
    expect(gitService.clearHistory).toBe(clearOperationHistory);
    expect(gitService.getReflog).toBe(getReflog);
    expect(gitService.recoverToReflog).toBe(recoverToReflog);
    expect(gitService.listCredentials).toBe(listCredentials);
    expect(gitService.setCredential).toBe(setCredential);
    expect(gitService.removeCredential).toBe(removeCredential);
    expect(gitService.detectSshKeys).toBe(detectSshKeys);
    expect(gitService.testCredential).toBe(testCredential);
  });

  it('should expose tag functions', () => {
    expect(gitService.getTagList).toBe(getTagList);
    expect(gitService.createTag).toBe(createTag);
    expect(gitService.deleteTag).toBe(deleteTag);
    expect(gitService.pushTag).toBe(pushTag);
  });

  it('should expose git2 sub-object', () => {
    expect(gitService.git2.isAvailable).toBe(git2IsAvailable);
    expect(gitService.git2.isRepo).toBe(git2IsRepo);
    expect(gitService.git2.getStatus).toBe(git2GetStatus);
    expect(gitService.git2.getFileStatus).toBe(git2GetFileStatus);
    expect(gitService.git2.getBranches).toBe(git2GetBranches);
    expect(gitService.git2.stageFiles).toBe(git2StageFiles);
    expect(gitService.git2.stageAll).toBe(git2StageAll);
    expect(gitService.git2.createCommit).toBe(git2CreateCommit);
    expect(gitService.git2.initRepo).toBe(git2InitRepo);
    expect(gitService.git2.fetchRemote).toBe(git2FetchRemote);
  });

  it('should expose project integration functions', () => {
    expect(gitService.initProjectRepo).toBe(initProjectRepo);
    expect(gitService.autoCommit).toBe(autoCommit);
    expect(gitService.exportChatToGit).toBe(exportChatToGit);
    expect(gitService.exportDesignerToGit).toBe(exportDesignerToGit);
    expect(gitService.restoreChatFromGit).toBe(restoreChatFromGit);
    expect(gitService.restoreDesignerFromGit).toBe(restoreDesignerFromGit);
  });
});

describe('Git - Diff File', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getDiffFile', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getDiffFile('/repo', 'file.ts')).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await getDiffFile('/repo', 'file.ts', true, 1000);
      expect(mockInvoke).toHaveBeenCalledWith('git_diff_file', {
        repoPath: '/repo',
        filePath: 'file.ts',
        staged: true,
        maxLines: 1000,
      });
    });

    it('should default maxLines to 5000', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await getDiffFile('/repo', 'file.ts');
      expect(mockInvoke).toHaveBeenCalledWith('git_diff_file', expect.objectContaining({
        maxLines: 5000,
      }));
    });
  });
});

describe('Git - Stash List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getStashList', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getStashList('/repo')).rejects.toThrow('Tauri');
    });

    it('should call invoke with repo path', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await getStashList('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_stash_list', { repoPath: '/repo' });
    });
  });
});

describe('Git - Full Status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getFullStatus', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getFullStatus('/repo')).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await getFullStatus('/repo', 50);
      expect(mockInvoke).toHaveBeenCalledWith('git_full_status', { repoPath: '/repo', maxCommits: 50 });
    });
  });
});

describe('Git - Branch Rename & Merge Abort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('renameBranch', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await renameBranch('/repo', 'old', 'new');
      expect(result.success).toBe(false);
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await renameBranch('/repo', 'old-name', 'new-name', true);
      expect(mockInvoke).toHaveBeenCalledWith('git_rename_branch', {
        repoPath: '/repo',
        oldName: 'old-name',
        newName: 'new-name',
        force: true,
      });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Rename failed'));
      const result = await renameBranch('/repo', 'old', 'new');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rename failed');
    });
  });

  describe('mergeAbort', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await mergeAbort('/repo');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await mergeAbort('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_merge_abort', { repoPath: '/repo' });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Abort failed'));
      const result = await mergeAbort('/repo');
      expect(result.success).toBe(false);
    });
  });
});

describe('Git - Revert Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('revertCommit', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await revertCommit({ repoPath: '/repo', commitHash: 'abc123' });
      expect(result.success).toBe(false);
    });

    it('should call invoke with options', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      const options = { repoPath: '/repo', commitHash: 'abc123', noCommit: true };
      await revertCommit(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_revert', { options });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Revert failed'));
      const result = await revertCommit({ repoPath: '/repo', commitHash: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('revertAbort', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await revertAbort('/repo');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await revertAbort('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_revert_abort', { repoPath: '/repo' });
    });
  });
});

describe('Git - Cherry-pick Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('cherryPick', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await cherryPick({ repoPath: '/repo', commitHash: 'abc123' });
      expect(result.success).toBe(false);
    });

    it('should call invoke with options', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      const options = { repoPath: '/repo', commitHash: 'abc123' };
      await cherryPick(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_cherry_pick', { options });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Cherry-pick failed'));
      const result = await cherryPick({ repoPath: '/repo', commitHash: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('cherryPickAbort', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await cherryPickAbort('/repo');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await cherryPickAbort('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_cherry_pick_abort', { repoPath: '/repo' });
    });
  });
});

describe('Git - Show Commit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('showCommit', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await showCommit('/repo', 'abc123');
      expect(result.success).toBe(false);
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await showCommit('/repo', 'abc123', 500);
      expect(mockInvoke).toHaveBeenCalledWith('git_show_commit', {
        repoPath: '/repo',
        commitHash: 'abc123',
        maxLines: 500,
      });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Show failed'));
      const result = await showCommit('/repo', 'abc');
      expect(result.success).toBe(false);
    });
  });
});

describe('Git - Blame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getBlame', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getBlame('/repo', 'file.ts')).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await getBlame('/repo', 'file.ts', { startLine: 10, endLine: 20 });
      expect(mockInvoke).toHaveBeenCalledWith('git_blame', {
        repoPath: '/repo',
        filePath: 'file.ts',
        startLine: 10,
        endLine: 20,
      });
    });
  });

  describe('getBlameLine', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getBlameLine('/repo', 'file.ts', 5)).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await getBlameLine('/repo', 'file.ts', 42);
      expect(mockInvoke).toHaveBeenCalledWith('git_blame_line', {
        repoPath: '/repo',
        filePath: 'file.ts',
        lineNumber: 42,
      });
    });
  });
});

describe('Git - Export/Restore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('exportChatToGit', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(exportChatToGit('/repo', 'sess-1', {})).rejects.toThrow('Tauri');
    });

    it('should call invoke with serialized data', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      const chatData = { messages: ['hello'] };
      await exportChatToGit('/repo', 'sess-1', chatData, 'Export chat');
      expect(mockInvoke).toHaveBeenCalledWith('git_export_chat', {
        repoPath: '/repo',
        sessionId: 'sess-1',
        chatData: JSON.stringify(chatData),
        commitMessage: 'Export chat',
      });
    });
  });

  describe('exportDesignerToGit', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(exportDesignerToGit('/repo', 'proj-1', {})).rejects.toThrow('Tauri');
    });

    it('should call invoke with serialized data', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await exportDesignerToGit('/repo', 'proj-1', { design: true });
      expect(mockInvoke).toHaveBeenCalledWith('git_export_designer', expect.objectContaining({
        repoPath: '/repo',
        projectId: 'proj-1',
      }));
    });
  });

  describe('restoreChatFromGit', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(restoreChatFromGit('/repo', 'sess-1', 'abc123')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await restoreChatFromGit('/repo', 'sess-1', 'abc123');
      expect(mockInvoke).toHaveBeenCalledWith('git_restore_chat', {
        repoPath: '/repo',
        sessionId: 'sess-1',
        commitHash: 'abc123',
      });
    });
  });

  describe('restoreDesignerFromGit', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(restoreDesignerFromGit('/repo', 'proj-1', 'abc123')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await restoreDesignerFromGit('/repo', 'proj-1', 'abc123');
      expect(mockInvoke).toHaveBeenCalledWith('git_restore_designer', {
        repoPath: '/repo',
        projectId: 'proj-1',
        commitHash: 'abc123',
      });
    });
  });
});

describe('Git - History & Undo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('recordOperation', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(recordOperation('commit', '/repo', 'test')).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ id: 'op-1' });
      await recordOperation('commit', '/repo', 'Made a commit', {
        beforeRef: 'abc',
        afterRef: 'def',
        affectedFiles: ['file.ts'],
      });
      expect(mockInvoke).toHaveBeenCalledWith('git_record_operation', {
        operationType: 'commit',
        repoPath: '/repo',
        description: 'Made a commit',
        beforeRef: 'abc',
        afterRef: 'def',
        affectedFiles: ['file.ts'],
      });
    });
  });

  describe('getOperationHistory', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getOperationHistory('/repo')).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue([]);
      await getOperationHistory('/repo', 20);
      expect(mockInvoke).toHaveBeenCalledWith('git_get_history', { repoPath: '/repo', limit: 20 });
    });
  });

  describe('undoLastOperation', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(undoLastOperation('/repo')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await undoLastOperation('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_undo_last', { repoPath: '/repo' });
    });
  });

  describe('clearOperationHistory', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(clearOperationHistory('/repo')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(undefined);
      await clearOperationHistory('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_clear_history', { repoPath: '/repo' });
    });
  });

  describe('getReflog', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(getReflog('/repo')).rejects.toThrow('Tauri');
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await getReflog('/repo', 50);
      expect(mockInvoke).toHaveBeenCalledWith('git_reflog', { repoPath: '/repo', maxCount: 50 });
    });
  });

  describe('recoverToReflog', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(recoverToReflog('/repo', 'HEAD@{1}')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await recoverToReflog('/repo', 'HEAD@{1}');
      expect(mockInvoke).toHaveBeenCalledWith('git_recover_to_reflog', {
        repoPath: '/repo',
        selector: 'HEAD@{1}',
      });
    });
  });
});

describe('Git - Credentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('listCredentials', () => {
    it('should return empty array when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await listCredentials();
      expect(result).toEqual([]);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue([{ id: 'cred-1', host: 'github.com' }]);
      const result = await listCredentials();
      expect(mockInvoke).toHaveBeenCalledWith('git_list_credentials');
      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Failed'));
      const result = await listCredentials();
      expect(result).toEqual([]);
    });
  });

  describe('setCredential', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(setCredential({ credentialType: 'https', host: 'github.com' })).rejects.toThrow('Tauri');
    });

    it('should call invoke with input', async () => {
      const input = { credentialType: 'https' as const, host: 'github.com', username: 'user' };
      mockInvoke.mockResolvedValue({ id: 'cred-1' });
      await setCredential(input);
      expect(mockInvoke).toHaveBeenCalledWith('git_set_credential', { input });
    });
  });

  describe('removeCredential', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(removeCredential('github.com')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(true);
      await removeCredential('github.com');
      expect(mockInvoke).toHaveBeenCalledWith('git_remove_credential', { host: 'github.com' });
    });
  });

  describe('detectSshKeys', () => {
    it('should return empty array when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await detectSshKeys();
      expect(result).toEqual([]);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue([{ path: '~/.ssh/id_rsa', name: 'id_rsa' }]);
      const result = await detectSshKeys();
      expect(mockInvoke).toHaveBeenCalledWith('git_detect_ssh_keys');
      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      mockInvoke.mockRejectedValue(new Error('SSH error'));
      const result = await detectSshKeys();
      expect(result).toEqual([]);
    });
  });

  describe('testCredential', () => {
    it('should throw when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(testCredential('github.com')).rejects.toThrow('Tauri');
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await testCredential('github.com');
      expect(mockInvoke).toHaveBeenCalledWith('git_test_credential', { host: 'github.com' });
      expect(result).toBe(true);
    });
  });
});

describe('Git - Tags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('getTagList', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await getTagList('/repo');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await getTagList('/repo');
      expect(mockInvoke).toHaveBeenCalledWith('git_tag_list', { repoPath: '/repo' });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Tag list failed'));
      const result = await getTagList('/repo');
      expect(result.success).toBe(false);
    });
  });

  describe('createTag', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await createTag({ repoPath: '/repo', name: 'v1.0' });
      expect(result.success).toBe(false);
    });

    it('should call invoke with options', async () => {
      const options = { repoPath: '/repo', name: 'v1.0', message: 'Release 1.0' };
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await createTag(options);
      expect(mockInvoke).toHaveBeenCalledWith('git_tag_create', { options });
    });

    it('should handle errors gracefully', async () => {
      mockInvoke.mockRejectedValue(new Error('Create tag failed'));
      const result = await createTag({ repoPath: '/repo', name: 'v1.0' });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteTag', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await deleteTag('/repo', 'v1.0');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await deleteTag('/repo', 'v1.0');
      expect(mockInvoke).toHaveBeenCalledWith('git_tag_delete', { repoPath: '/repo', name: 'v1.0' });
    });
  });

  describe('pushTag', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await pushTag('/repo', 'v1.0');
      expect(result.success).toBe(false);
    });

    it('should call invoke with parameters', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await pushTag('/repo', 'v1.0', 'origin');
      expect(mockInvoke).toHaveBeenCalledWith('git_tag_push', {
        repoPath: '/repo',
        name: 'v1.0',
        remote: 'origin',
      });
    });
  });
});

describe('Git - Git2 Native Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
  });

  describe('git2IsAvailable', () => {
    it('should return false when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2IsAvailable();
      expect(result).toBe(false);
    });

    it('should return result from invoke', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await git2IsAvailable();
      expect(mockInvoke).toHaveBeenCalledWith('git2_is_available');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockInvoke.mockRejectedValue(new Error('Not available'));
      const result = await git2IsAvailable();
      expect(result).toBe(false);
    });
  });

  describe('git2IsRepo', () => {
    it('should return false when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2IsRepo('/path');
      expect(result).toBe(false);
    });

    it('should return result from invoke', async () => {
      mockInvoke.mockResolvedValue(true);
      const result = await git2IsRepo('/path');
      expect(mockInvoke).toHaveBeenCalledWith('git2_is_repo', { path: '/path' });
      expect(result).toBe(true);
    });
  });

  describe('git2GetStatus', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2GetStatus('/path');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await git2GetStatus('/path');
      expect(mockInvoke).toHaveBeenCalledWith('git2_get_status', { path: '/path' });
    });
  });

  describe('git2GetFileStatus', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2GetFileStatus('/path');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await git2GetFileStatus('/path');
      expect(mockInvoke).toHaveBeenCalledWith('git2_get_file_status', { path: '/path' });
    });
  });

  describe('git2GetBranches', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2GetBranches('/path');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: [] });
      await git2GetBranches('/path');
      expect(mockInvoke).toHaveBeenCalledWith('git2_get_branches', { path: '/path' });
    });
  });

  describe('git2StageFiles', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2StageFiles('/path', ['file.ts']);
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await git2StageFiles('/path', ['file1.ts', 'file2.ts']);
      expect(mockInvoke).toHaveBeenCalledWith('git2_stage_files', {
        path: '/path',
        files: ['file1.ts', 'file2.ts'],
      });
    });
  });

  describe('git2StageAll', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2StageAll('/path');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await git2StageAll('/path');
      expect(mockInvoke).toHaveBeenCalledWith('git2_stage_all', { path: '/path' });
    });
  });

  describe('git2CreateCommit', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2CreateCommit('/path', 'msg');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true, data: {} });
      await git2CreateCommit('/path', 'test commit');
      expect(mockInvoke).toHaveBeenCalledWith('git2_create_commit', {
        path: '/path',
        message: 'test commit',
      });
    });
  });

  describe('git2InitRepo', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2InitRepo('/path');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await git2InitRepo('/path');
      expect(mockInvoke).toHaveBeenCalledWith('git2_init_repo', { path: '/path' });
    });
  });

  describe('git2FetchRemote', () => {
    it('should return error when not in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await git2FetchRemote('/path');
      expect(result.success).toBe(false);
    });

    it('should call invoke', async () => {
      mockInvoke.mockResolvedValue({ success: true });
      await git2FetchRemote('/path', 'origin');
      expect(mockInvoke).toHaveBeenCalledWith('git2_fetch_remote', {
        path: '/path',
        remote: 'origin',
      });
    });
  });
});
