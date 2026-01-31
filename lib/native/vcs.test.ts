/**
 * Multi-VCS Service Tests
 */

import { vcsService, isVcsAvailable, detectVcs, getVcsInfo, getVcsBlame } from './vcs';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock utils
jest.mock('./utils', () => ({
  isTauri: jest.fn(() => false),
}));

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './utils';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('VCS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isVcsAvailable', () => {
    it('returns false when not in Tauri environment', () => {
      mockIsTauri.mockReturnValue(false);
      expect(isVcsAvailable()).toBe(false);
    });

    it('returns true when in Tauri environment', () => {
      mockIsTauri.mockReturnValue(true);
      expect(isVcsAvailable()).toBe(true);
    });
  });

  describe('detectVcs', () => {
    it('returns error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await detectVcs('/some/path');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tauri');
    });

    it('calls vcs_detect command when in Tauri', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue({ success: true, data: 'git', error: null });

      const result = await detectVcs('/some/path');

      expect(mockInvoke).toHaveBeenCalledWith('vcs_detect', { path: '/some/path' });
      expect(result.success).toBe(true);
      expect(result.data).toBe('git');
    });

    it('handles invoke errors', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockRejectedValue(new Error('Command failed'));

      const result = await detectVcs('/some/path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
    });
  });

  describe('getVcsInfo', () => {
    it('returns error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await getVcsInfo('/some/path');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tauri');
    });

    it('returns VCS info for a repository', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockInfo = {
        vcsType: 'git',
        revision: 'abc123',
        branch: 'main',
        remoteUrl: 'https://github.com/user/repo',
        repoRoot: '/path/to/repo',
      };
      mockInvoke.mockResolvedValue({ success: true, data: mockInfo, error: null });

      const result = await getVcsInfo('/path/to/repo');

      expect(mockInvoke).toHaveBeenCalledWith('vcs_get_info', { path: '/path/to/repo' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInfo);
    });
  });

  describe('getVcsBlame', () => {
    it('returns error when not in Tauri environment', async () => {
      mockIsTauri.mockReturnValue(false);
      const result = await getVcsBlame('/repo', 'file.ts');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tauri');
    });

    it('returns blame info for a file', async () => {
      mockIsTauri.mockReturnValue(true);
      const mockBlame = [
        { lineNumber: 1, revision: 'abc123', author: 'user', date: '2024-01-01', content: 'line 1' },
        { lineNumber: 2, revision: 'def456', author: 'user2', date: '2024-01-02', content: 'line 2' },
      ];
      mockInvoke.mockResolvedValue({ success: true, data: mockBlame, error: null });

      const result = await getVcsBlame('/repo', 'file.ts');

      expect(mockInvoke).toHaveBeenCalledWith('vcs_blame', {
        repoPath: '/repo',
        filePath: 'file.ts',
        lineNumber: null,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockBlame);
    });

    it('supports line number parameter', async () => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue({ success: true, data: [], error: null });

      await getVcsBlame('/repo', 'file.ts', 42);

      expect(mockInvoke).toHaveBeenCalledWith('vcs_blame', {
        repoPath: '/repo',
        filePath: 'file.ts',
        lineNumber: 42,
      });
    });
  });

  describe('vcsService object', () => {
    it('exposes all service methods', () => {
      expect(vcsService.isAvailable).toBeDefined();
      expect(vcsService.detect).toBeDefined();
      expect(vcsService.checkInstalled).toBeDefined();
      expect(vcsService.getInfo).toBeDefined();
      expect(vcsService.blame).toBeDefined();
      expect(vcsService.blameLine).toBeDefined();
    });
  });
});
