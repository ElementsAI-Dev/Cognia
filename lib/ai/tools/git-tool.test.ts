/**
 * Tests for structured Git tools.
 */

import {
  executeGitRepoInspect,
  executeGitChanges,
  executeGitBranch,
  executeGitHistory,
  executeGitRemote,
  executeGitTag,
  gitRepoInspectInputSchema,
  gitChangesInputSchema,
  gitBranchInputSchema,
  gitHistoryInputSchema,
  gitRemoteInputSchema,
  gitTagInputSchema,
  gitTools,
  gitToolPromptSnippet,
  gitToolSystemPrompt,
} from './git-tool';
import { gitService } from '@/lib/native/git';

jest.mock('@/lib/native/git', () => ({
  gitService: {
    isRepo: jest.fn(),
    getStatus: jest.fn(),
    getFullStatus: jest.fn(),
    stage: jest.fn(),
    stageAll: jest.fn(),
    unstage: jest.fn(),
    commit: jest.fn(),
    discardChanges: jest.fn(),
    stash: jest.fn(),
    getStashList: jest.fn(),
    getBranches: jest.fn(),
    createBranch: jest.fn(),
    deleteBranch: jest.fn(),
    checkout: jest.fn(),
    merge: jest.fn(),
    renameBranch: jest.fn(),
    mergeAbort: jest.fn(),
    getLog: jest.fn(),
    getDiff: jest.fn(),
    getDiffBetween: jest.fn(),
    getDiffFile: jest.fn(),
    showCommit: jest.fn(),
    searchCommits: jest.fn(),
    getRemotes: jest.fn(),
    addRemote: jest.fn(),
    removeRemote: jest.fn(),
    fetch: jest.fn(),
    pull: jest.fn(),
    push: jest.fn(),
    getTagList: jest.fn(),
    createTag: jest.fn(),
    deleteTag: jest.fn(),
    pushTag: jest.fn(),
  },
}));

const mockGitService = gitService as unknown as Record<string, jest.Mock>;

describe('git tool schemas', () => {
  it('validates repo inspect input', () => {
    const result = gitRepoInspectInputSchema.safeParse({
      action: 'status',
      repoPath: '/repo',
    });
    expect(result.success).toBe(true);
  });

  it('requires repoPath for mutating operations', () => {
    const result = gitChangesInputSchema.safeParse({
      action: 'stage',
      files: ['a.ts'],
    });
    expect(result.success).toBe(false);
  });

  it('requires explicit confirmation for destructive operations', () => {
    const branchDelete = gitBranchInputSchema.safeParse({
      action: 'delete',
      repoPath: '/repo',
      name: 'feature/test',
    });
    const remoteRemove = gitRemoteInputSchema.safeParse({
      action: 'remove',
      repoPath: '/repo',
      name: 'origin',
    });
    const tagDelete = gitTagInputSchema.safeParse({
      action: 'delete',
      repoPath: '/repo',
      name: 'v1.0.0',
    });

    expect(branchDelete.success).toBe(false);
    expect(remoteRemove.success).toBe(false);
    expect(tagDelete.success).toBe(false);
  });

  it('validates history search input', () => {
    const result = gitHistoryInputSchema.safeParse({
      action: 'search',
      repoPath: '/repo',
      mode: 'message',
      query: 'fix',
    });
    expect(result.success).toBe(true);
  });
});

describe('executeGitRepoInspect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns is_repo result', async () => {
    mockGitService.isRepo.mockResolvedValue(true);

    const result = await executeGitRepoInspect({
      action: 'is_repo',
      repoPath: '/repo',
    });

    expect(mockGitService.isRepo).toHaveBeenCalledWith('/repo');
    expect(result).toMatchObject({
      success: true,
      action: 'is_repo',
      data: { repoPath: '/repo', isRepo: true },
    });
  });

  it('maps backend error for status', async () => {
    mockGitService.getStatus.mockResolvedValue({
      success: false,
      error: 'Status failed',
    });

    const result = await executeGitRepoInspect({
      action: 'status',
      repoPath: '/repo',
    });

    expect(result).toEqual({
      success: false,
      action: 'status',
      message: 'Status failed',
      error: 'Status failed',
    });
  });
});

describe('executeGitChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stages files with normalized response', async () => {
    mockGitService.stage.mockResolvedValue({ success: true });

    const result = await executeGitChanges({
      action: 'stage',
      repoPath: '/repo',
      files: ['a.ts', 'b.ts'],
    });

    expect(mockGitService.stage).toHaveBeenCalledWith('/repo', ['a.ts', 'b.ts']);
    expect(result).toMatchObject({
      success: true,
      action: 'stage',
      message: 'Staged 2 file(s)',
    });
  });

  it('returns validation error on missing discard confirmation', async () => {
    const result = await executeGitChanges({
      action: 'discard',
      repoPath: '/repo',
      files: ['a.ts'],
    });

    expect(result.success).toBe(false);
    expect(result.action).toBe('git_changes');
    expect(result.error).toContain('Invalid literal value');
  });
});

describe('executeGitBranch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists branches', async () => {
    mockGitService.getBranches.mockResolvedValue({ success: true, data: [] });

    const result = await executeGitBranch({
      action: 'list',
      repoPath: '/repo',
      includeRemote: true,
    });

    expect(mockGitService.getBranches).toHaveBeenCalledWith('/repo', true);
    expect(result.success).toBe(true);
    expect(result.action).toBe('list');
  });
});

describe('executeGitHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads commit log', async () => {
    mockGitService.getLog.mockResolvedValue({ success: true, data: [] });

    const result = await executeGitHistory({
      action: 'log',
      repoPath: '/repo',
      maxCount: 20,
    });

    expect(mockGitService.getLog).toHaveBeenCalledWith({
      repoPath: '/repo',
      maxCount: 20,
      skip: undefined,
      since: undefined,
      until: undefined,
      author: undefined,
      grep: undefined,
      path: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('searches commits', async () => {
    mockGitService.searchCommits.mockResolvedValue({ success: true, data: [] });

    const result = await executeGitHistory({
      action: 'search',
      repoPath: '/repo',
      mode: 'author',
      query: 'alice',
      maxCount: 10,
    });

    expect(mockGitService.searchCommits).toHaveBeenCalledWith({
      repoPath: '/repo',
      mode: 'author',
      query: 'alice',
      maxCount: 10,
      branch: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe('executeGitRemote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pushes with options', async () => {
    mockGitService.push.mockResolvedValue({ success: true });

    const result = await executeGitRemote({
      action: 'push',
      repoPath: '/repo',
      remote: 'origin',
      branch: 'main',
      setUpstream: true,
    });

    expect(mockGitService.push).toHaveBeenCalledWith({
      repoPath: '/repo',
      remote: 'origin',
      branch: 'main',
      force: undefined,
      setUpstream: true,
      tags: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe('executeGitTag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles thrown errors gracefully', async () => {
    mockGitService.createTag.mockRejectedValue(new Error('Create tag failed'));

    const result = await executeGitTag({
      action: 'create',
      repoPath: '/repo',
      name: 'v1.0.0',
    });

    expect(result).toEqual({
      success: false,
      action: 'create',
      message: 'Create tag failed',
      error: 'Create tag failed',
    });
  });
});

describe('gitTools definitions', () => {
  it('marks mutating tools as approval-required', () => {
    expect(gitTools.git_changes.requiresApproval).toBe(true);
    expect(gitTools.git_branch.requiresApproval).toBe(true);
    expect(gitTools.git_remote.requiresApproval).toBe(true);
    expect(gitTools.git_tag.requiresApproval).toBe(true);
  });

  it('keeps read-only tools non-approval by default', () => {
    expect(gitTools.git_repo_inspect.requiresApproval).toBe(false);
    expect(gitTools.git_history.requiresApproval).toBe(false);
  });
});

describe('Git tool prompts', () => {
  it('includes shell fallback guidance in snippet', () => {
    expect(gitToolPromptSnippet).toContain('shell_execute');
    expect(gitToolPromptSnippet).toContain('structured Git tools');
  });

  it('provides a detailed system prompt', () => {
    expect(gitToolSystemPrompt).toContain('Structured Git Tools');
    expect(gitToolSystemPrompt).toContain('git_repo_inspect');
    expect(gitToolSystemPrompt).toContain('shell_execute');
  });
});
