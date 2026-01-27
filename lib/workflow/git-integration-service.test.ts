/**
 * Git Integration Service Tests
 */

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
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
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.cloneRepository('https://github.com/user/repo.git', '/path/to/dest');

      expect(invoke).toHaveBeenCalledWith('git_clone', {
        url: 'https://github.com/user/repo.git',
        path: '/path/to/dest',
        branch: 'main',
      });
    });

    it('should clone with specified branch', async () => {
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.cloneRepository('https://github.com/user/repo.git', '/path', 'develop');

      expect(invoke).toHaveBeenCalledWith('git_clone', {
        url: 'https://github.com/user/repo.git',
        path: '/path',
        branch: 'develop',
      });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.cloneRepository('url', '/path')
      ).rejects.toThrow('Git integration is disabled');
    });

    it('should track cloned repository', async () => {
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.cloneRepository('https://github.com/user/repo.git', '/path/to/repo');

      const repo = service.getRepository('/path/to/repo');
      expect(repo).toBeDefined();
      expect(repo?.branch).toBe('main');
    });
  });

  describe('pullChanges', () => {
    it('should pull changes successfully', async () => {
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.cloneRepository('url', '/path');
      await service.pullChanges('/path');

      expect(invoke).toHaveBeenCalledWith('git_pull', { path: '/path' });
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(disabledService.pullChanges('/path')).rejects.toThrow(
        'Git integration is disabled'
      );
    });

    it('should update repository sync time', async () => {
      (invoke as jest.Mock).mockResolvedValue(undefined);

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
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.pushChanges('/path');

      expect(invoke).toHaveBeenCalledWith('git_push', { path: '/path' });
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
      (invoke as jest.Mock).mockResolvedValue(mockStatus);

      const status = await service.getRepositoryStatus('/path');

      expect(status).toBeDefined();
      expect(status.branch).toBe('main');
      expect(invoke).toHaveBeenCalledWith('git_status', { path: '/path' });
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
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.stageFiles('/path', ['file1.txt', 'file2.txt']);

      expect(invoke).toHaveBeenCalledWith('git_stage', {
        path: '/path',
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
      (invoke as jest.Mock).mockResolvedValue('abc123');

      const result = await service.commitChanges('/path', 'Test commit');

      expect(invoke).toHaveBeenCalledWith('git_commit', {
        path: '/path',
        message: 'Test commit',
      });
      expect(result).toBe('abc123');
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
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.createBranch('/path', 'feature-branch');

      expect(invoke).toHaveBeenCalledWith('git_checkout', {
        path: '/path',
        branch: 'feature-branch',
        create: true,
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
      (invoke as jest.Mock).mockResolvedValue(undefined);

      await service.switchBranch('/path', 'develop');

      expect(invoke).toHaveBeenCalledWith('git_checkout', {
        path: '/path',
        branch: 'develop',
        create: false,
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
      (invoke as jest.Mock).mockResolvedValue(['main', 'develop', 'feature']);

      const branches = await service.getBranches('/path');

      expect(invoke).toHaveBeenCalledWith('git_branches', { path: '/path' });
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
      (invoke as jest.Mock).mockResolvedValue(mockHistory);

      const history = await service.getCommitHistory('/path', 10);

      expect(invoke).toHaveBeenCalledWith('git_log', { path: '/path', limit: 10 });
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
      (invoke as jest.Mock).mockResolvedValue({ hasUpdates: true });

      const hasUpdates = await service.checkForUpdates('/path');

      expect(invoke).toHaveBeenCalledWith('git_fetch', { path: '/path' });
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
      (invoke as jest.Mock).mockResolvedValue('diff --git a/file.txt...');

      const diff = await service.getDiff('/path', 'file.txt');

      expect(invoke).toHaveBeenCalledWith('git_diff', {
        path: '/path',
        file: 'file.txt',
      });
      expect(diff).toContain('diff');
    });

    it('should return diff without file parameter', async () => {
      (invoke as jest.Mock).mockResolvedValue('diff output');

      const diff = await service.getDiff('/path');

      expect(invoke).toHaveBeenCalledWith('git_diff', {
        path: '/path',
        file: undefined,
      });
      expect(diff).toBe('diff output');
    });

    it('should throw error when git is disabled', async () => {
      const disabledService = new GitIntegrationService(disabledConfig);

      await expect(
        disabledService.getDiff('/path')
      ).rejects.toThrow('Git integration is disabled');
    });
  });
});
