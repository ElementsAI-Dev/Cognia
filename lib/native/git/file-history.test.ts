import { getFileHistory } from './file-history';

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

describe('getFileHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error when not in Tauri environment', async () => {
    mockIsTauri.mockReturnValue(false);
    const result = await getFileHistory('/repo', 'src/index.ts');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Tauri');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('calls invoke with correct arguments', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue({ success: true, data: [] });

    await getFileHistory('/repo', 'src/index.ts', 20);

    expect(mockInvoke).toHaveBeenCalledWith('git_file_history', {
      repoPath: '/repo',
      filePath: 'src/index.ts',
      maxCount: 20,
    });
  });

  it('returns successful result from invoke', async () => {
    mockIsTauri.mockReturnValue(true);
    const mockData = {
      success: true,
      data: [
        {
          commit: {
            hash: 'abc123',
            shortHash: 'abc123d',
            author: 'Alice',
            authorEmail: 'alice@test.com',
            date: '2025-01-15',
            message: 'feat: add feature',
          },
          additions: 10,
          deletions: 5,
          oldPath: null,
        },
      ],
    };
    mockInvoke.mockResolvedValue(mockData);

    const result = await getFileHistory('/repo', 'src/index.ts');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('handles invoke errors gracefully', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockRejectedValue(new Error('Command failed'));

    const result = await getFileHistory('/repo', 'src/index.ts');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Command failed');
  });

  it('passes undefined maxCount when not provided', async () => {
    mockIsTauri.mockReturnValue(true);
    mockInvoke.mockResolvedValue({ success: true, data: [] });

    await getFileHistory('/repo', 'src/index.ts');

    expect(mockInvoke).toHaveBeenCalledWith('git_file_history', {
      repoPath: '/repo',
      filePath: 'src/index.ts',
      maxCount: undefined,
    });
  });
});
