import { searchCommits } from './search';
import type { GitSearchMode } from './search';

// Mock Tauri invoke
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}));

// Mock isTauri
jest.mock('../utils', () => ({
  isTauri: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  loggers: { native: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } },
}));

import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../utils';

const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;
const mockIsTauri = isTauri as jest.MockedFunction<typeof isTauri>;

describe('searchCommits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await searchCommits({
      repoPath: '/repo',
      mode: 'message',
      query: 'fix',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tauri');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('calls invoke with correct arguments for message search', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue({ success: true, data: [] });

    await searchCommits({
      repoPath: '/repo',
      mode: 'message',
      query: 'fix bug',
      maxCount: 25,
      branch: 'main',
    });

    expect(mockInvoke).toHaveBeenCalledWith('git_search_commits', {
      repoPath: '/repo',
      mode: 'message',
      query: 'fix bug',
      maxCount: 25,
      branch: 'main',
    });
  });

  it.each<GitSearchMode>(['message', 'author', 'hash', 'file', 'content'])(
    'supports search mode: %s',
    async (mode) => {
      mockIsTauri.mockReturnValue(true);
      mockInvoke.mockResolvedValue({ success: true, data: [] });

      await searchCommits({ repoPath: '/repo', mode, query: 'test' });

      expect(mockInvoke).toHaveBeenCalledWith(
        'git_search_commits',
        expect.objectContaining({ mode })
      );
    }
  );

  it('returns successful result from invoke', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockData = {
      success: true,
      data: [
        {
          hash: 'abc123',
          shortHash: 'abc123d',
          author: 'Alice',
          authorEmail: 'alice@test.com',
          date: '2025-01-15',
          message: 'fix: resolve bug',
        },
      ],
    };
    mockInvoke.mockResolvedValue(mockData);

    const result = await searchCommits({
      repoPath: '/repo',
      mode: 'message',
      query: 'fix',
    });
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('handles invoke errors gracefully', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Search failed'));

    const result = await searchCommits({
      repoPath: '/repo',
      mode: 'message',
      query: 'fix',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Search failed');
  });

  it('omits optional parameters when not provided', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue({ success: true, data: [] });

    await searchCommits({ repoPath: '/repo', mode: 'author', query: 'Alice' });

    expect(mockInvoke).toHaveBeenCalledWith('git_search_commits', {
      repoPath: '/repo',
      mode: 'author',
      query: 'Alice',
      maxCount: undefined,
      branch: undefined,
    });
  });
});
