/**
 * Multi-VCS Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useVcs } from './use-vcs';

// Mock the VCS service
jest.mock('@/lib/native/vcs', () => ({
  vcsService: {
    isAvailable: jest.fn(() => true),
    detect: jest.fn(),
    checkInstalled: jest.fn(),
    getInfo: jest.fn(),
    blame: jest.fn(),
    blameLine: jest.fn(),
  },
}));

import { vcsService } from '@/lib/native/vcs';

const mockVcsService = vcsService as jest.Mocked<typeof vcsService>;

describe('useVcs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVcsService.isAvailable.mockReturnValue(true);
  });

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useVcs());

      expect(result.current.isAvailable).toBe(true);
      expect(result.current.detectedVcs).toBeNull();
      expect(result.current.vcsInfo).toBeNull();
      expect(result.current.installedVcs).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns isAvailable false when service not available', () => {
      mockVcsService.isAvailable.mockReturnValue(false);
      const { result } = renderHook(() => useVcs());

      expect(result.current.isAvailable).toBe(false);
    });
  });

  describe('detect', () => {
    it('detects VCS type successfully', async () => {
      mockVcsService.detect.mockResolvedValue({
        success: true,
        data: 'git',
        error: null,
      });

      const { result } = renderHook(() => useVcs());

      let vcsType: string | null = null;
      await act(async () => {
        vcsType = await result.current.detect('/some/path');
      });

      expect(vcsType).toBe('git');
      expect(result.current.detectedVcs).toBe('git');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles detection error', async () => {
      mockVcsService.detect.mockResolvedValue({
        success: false,
        data: null,
        error: 'Not a repository',
      });

      const { result } = renderHook(() => useVcs());

      await act(async () => {
        await result.current.detect('/some/path');
      });

      expect(result.current.detectedVcs).toBeNull();
      expect(result.current.error).toBe('Not a repository');
    });

    it('returns null when service not available', async () => {
      mockVcsService.isAvailable.mockReturnValue(false);
      const { result } = renderHook(() => useVcs());

      let vcsType: string | null = null;
      await act(async () => {
        vcsType = await result.current.detect('/some/path');
      });

      expect(vcsType).toBeNull();
      expect(result.current.error).toContain('not available');
    });
  });

  describe('getInfo', () => {
    it('gets VCS info successfully', async () => {
      const mockInfo = {
        vcsType: 'jj' as const,
        revision: 'abc123',
        branch: 'main',
        remoteUrl: 'https://github.com/user/repo',
        repoRoot: '/path/to/repo',
      };
      mockVcsService.getInfo.mockResolvedValue({
        success: true,
        data: mockInfo,
        error: null,
      });

      const { result } = renderHook(() => useVcs());

      await act(async () => {
        await result.current.getInfo('/path/to/repo');
      });

      expect(result.current.vcsInfo).toEqual(mockInfo);
      expect(result.current.detectedVcs).toBe('jj');
    });
  });

  describe('checkInstalled', () => {
    it('returns installed VCS tools', async () => {
      const mockInstalled = [
        { vcsType: 'git' as const, installed: true, version: '2.40.0' },
        { vcsType: 'jj' as const, installed: true, version: '0.15.0' },
        { vcsType: 'hg' as const, installed: false, version: null },
        { vcsType: 'svn' as const, installed: false, version: null },
      ];
      mockVcsService.checkInstalled.mockResolvedValue(mockInstalled);

      const { result } = renderHook(() => useVcs());

      await act(async () => {
        await result.current.checkInstalled();
      });

      expect(result.current.installedVcs).toEqual(mockInstalled);
    });
  });

  describe('blame', () => {
    it('gets blame info for file', async () => {
      const mockBlame = [
        { lineNumber: 1, revision: 'abc', author: 'user', date: '2024-01-01', content: 'line 1' },
      ];
      mockVcsService.blame.mockResolvedValue({
        success: true,
        data: mockBlame,
        error: null,
      });

      const { result } = renderHook(() => useVcs());

      let blameResult: typeof mockBlame = [];
      await act(async () => {
        blameResult = await result.current.blame('/repo', 'file.ts');
      });

      expect(blameResult).toEqual(mockBlame);
    });
  });

  describe('blameLine', () => {
    it('gets blame for specific line', async () => {
      const mockLine = {
        lineNumber: 42,
        revision: 'abc',
        author: 'user',
        date: '2024-01-01',
        content: 'specific line',
      };
      mockVcsService.blameLine.mockResolvedValue(mockLine);

      const { result } = renderHook(() => useVcs());

      let lineResult: typeof mockLine | null = null;
      await act(async () => {
        lineResult = await result.current.blameLine('/repo', 'file.ts', 42);
      });

      expect(lineResult).toEqual(mockLine);
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      mockVcsService.detect.mockResolvedValue({
        success: false,
        data: null,
        error: 'Some error',
      });

      const { result } = renderHook(() => useVcs());

      await act(async () => {
        await result.current.detect('/path');
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
