/**
 * Git Integration Service Tests
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

jest.mock('@/lib/native/utils', () => ({
  isTauri: jest.fn(() => true),
}));

jest.mock('@/lib/logger', () => ({
  loggers: {
    native: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  },
}));

import { invoke } from '@tauri-apps/api/core';
import { GitIntegrationService } from './git-integration-service';
import type { GitIntegrationConfig } from '@/types/workflow/template';

describe('GitIntegrationService', () => {
  const mockConfig: GitIntegrationConfig = {
    enabled: true,
    autoSync: false,
    syncInterval: 300000,
    defaultBranch: 'main',
  };

  const disabledConfig: GitIntegrationConfig = {
    ...mockConfig,
    enabled: false,
  };

  let service: GitIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GitIntegrationService(mockConfig);
  });

  describe('constructor', () => {
    it('should create service with config', () => {
      const svc = new GitIntegrationService(mockConfig);
      expect(svc).toBeDefined();
    });
  });

  describe('cloneRepository', () => {
    it('should clone repository successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: null });

      await service.cloneRepository('https://github.com/user/repo.git', '/path/to/dest');

      expect(invoke).toHaveBeenCalledWith('git_clone', {
        options: {
          url: 'https://github.com/user/repo.git',
          targetPath: '/path/to/dest',
          branch: 'main',
        },
      });
    });

    it('should clone with specified branch', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: null });

      await service.cloneRepository('https://github.com/user/repo.git', '/path', 'develop');

      expect(invoke).toHaveBeenCalledWith('git_clone', {
        options: {
          url: 'https://github.com/user/repo.git',
          targetPath: '/path',
          branch: 'develop',
        },
      });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.cloneRepository('url', '/path')
      ).rejects.toThrow('Git integration is disabled');
    });

    it('should track cloned repository', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: null });

      await service.cloneRepository('https://github.com/user/repo.git', '/path/to/repo');

      const repo = service.getRepository('/path/to/repo');
      expect(repo).toBeDefined();
      expect(repo?.branch).toBe('main');
    });
  });

  describe('pullChanges', () => {
    it('should pull changes successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: null });

      await service.cloneRepository('url', '/path');
      await service.pullChanges('/path');

      expect(invoke).toHaveBeenCalledWith('git_pull', { options: { repoPath: '/path' } });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(disabledService.pullChanges('/path')).rejects.toThrow(
        'Git integration is disabled'
      );
    });

    it('should update repository sync time', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: null });

      await service.cloneRepository('url', '/path');
      const beforePull = Date.now();
      
      await new Promise((r) => setTimeout(r, 10));
      await service.pullChanges('/path');

      const repo = service.getRepository('/path');
      expect(repo?.lastSyncAt.getTime()).toBeGreaterThanOrEqual(beforePull);
    });
  });

  describe('pushChanges', () => {
    it('should push changes successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true });

      await service.pushChanges('/path');

      expect(invoke).toHaveBeenCalledWith('git_push', { options: { repoPath: '/path' } });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(disabledService.pushChanges('/path')).rejects.toThrow(
        'Git integration is disabled'
      );
    });
  });

  describe('getRepositoryStatus', () => {
    it('should return status for repository', async () => {
      const mockStatus = {
        branch: 'main',
        hasChanges: false,
        staged: [],
        unstaged: [],
        untracked: [],
      };
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: mockStatus });

      const status = await service.getRepositoryStatus('/path');

      expect(status).toBeDefined();
      expect(status.branch).toBe('main');
      expect(invoke).toHaveBeenCalledWith('git_status', { repoPath: '/path' });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(disabledService.getRepositoryStatus('/path')).rejects.toThrow(
        'Git integration is disabled'
      );
    });
  });

  describe('stageFiles', () => {
    it('should stage files successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true });

      await service.stageFiles('/path', ['file1.txt', 'file2.txt']);

      expect(invoke).toHaveBeenCalledWith('git_stage', {
        repoPath: '/path',
        files: ['file1.txt', 'file2.txt'],
      });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.stageFiles('/path', ['file.txt'])
      ).rejects.toThrow('Git integration is disabled');
    });
  });

  describe('commitChanges', () => {
    it('should commit changes successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: { hash: 'abc123' } });

      const result = await service.commitChanges('/path', 'Test commit');

      expect(invoke).toHaveBeenCalledWith('git_commit', {
        options: {
          repoPath: '/path',
          message: 'Test commit',
        },
      });
      expect(result).toEqual(expect.objectContaining({ hash: 'abc123' }));
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.commitChanges('/path', 'message')
      ).rejects.toThrow('Git integration is disabled');
    });
  });

  describe('createBranch', () => {
    it('should create branch successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true });

      await service.createBranch('/path', 'feature-branch');

      expect(invoke).toHaveBeenCalledWith('git_checkout', {
        options: {
          repoPath: '/path',
          target: 'feature-branch',
          createBranch: true,
        },
      });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.createBranch('/path', 'branch')
      ).rejects.toThrow('Git integration is disabled');
    });
  });

  describe('switchBranch', () => {
    it('should switch branch successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true });

      await service.switchBranch('/path', 'develop');

      expect(invoke).toHaveBeenCalledWith('git_checkout', {
        options: {
          repoPath: '/path',
          target: 'develop',
          createBranch: false,
        },
      });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.switchBranch('/path', 'branch')
      ).rejects.toThrow('Git integration is disabled');
    });
  });

  describe('getBranches', () => {
    it('should return list of branches', async () => {
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: ['main', 'develop', 'feature'] });

      const branches = await service.getBranches('/path');

      expect(invoke).toHaveBeenCalledWith('git_branches', { repoPath: '/path', includeRemote: true });
      expect(branches).toEqual(['main', 'develop', 'feature']);
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(disabledService.getBranches('/path')).rejects.toThrow(
        'Git integration is disabled'
      );
    });
  });

  describe('getCommitHistory', () => {
    it('should return commit history', async () => {
      const mockHistory = [
        { hash: 'abc123', message: 'First commit', author: 'User', date: new Date() },
        { hash: 'def456', message: 'Second commit', author: 'User', date: new Date() },
      ];
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: mockHistory });

      const history = await service.getCommitHistory('/path', 10);

      expect(invoke).toHaveBeenCalledWith('git_log', { options: { repoPath: '/path', maxCount: 10 } });
      expect(history).toHaveLength(2);
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(disabledService.getCommitHistory('/path')).rejects.toThrow(
        'Git integration is disabled'
      );
    });
  });

  describe('checkForUpdates', () => {
    it('should check for remote updates', async () => {
      (invoke as jest.Mock)
        .mockResolvedValueOnce({ success: true }) // fetch
        .mockResolvedValueOnce({ success: true, data: { behind: 1 } }); // getRepoStatus

      const hasUpdates = await service.checkForUpdates('/path');

      expect(invoke).toHaveBeenCalledWith('git_fetch', { repoPath: '/path', remote: undefined });
      expect(hasUpdates).toBe(true);
    });

    it('should return false when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      const hasUpdates = await disabledService.checkForUpdates('/path');
      expect(hasUpdates).toBe(false);
    });
  });

  describe('getDiff', () => {
    it('should return diff for file', async () => {
      const mockDiffInfo = { path: 'file.txt', additions: 5, deletions: 2, content: 'diff --git a/file.txt...' };
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: mockDiffInfo });

      const diff = await service.getDiff('/path', 'file.txt');

      expect(invoke).toHaveBeenCalledWith('git_diff_file', expect.objectContaining({
        repoPath: '/path',
        filePath: 'file.txt',
      }));
      expect(diff).toBeDefined();
    });

    it('should return diff without file parameter', async () => {
      const mockDiffList = [{ path: 'a.txt', additions: 1, deletions: 0 }];
      (invoke as jest.Mock).mockResolvedValue({ success: true, data: mockDiffList });

      const diff = await service.getDiff('/path');

      expect(invoke).toHaveBeenCalledWith('git_diff', expect.objectContaining({
        repoPath: '/path',
      }));
      expect(diff).toEqual(mockDiffList);
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.getDiff('/path')
      ).rejects.toThrow('Git integration is disabled');
    });
  });
});
