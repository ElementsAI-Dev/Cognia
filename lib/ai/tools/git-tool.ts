/**
 * Git Tools - Structured Git operations for AI agents.
 *
 * These tools provide schema-validated, structured access to Git workflows
 * and avoid shell-command composition for common Git tasks.
 */

import { z } from 'zod';
import { gitService } from '@/lib/native/git';

type GitSearchMode = 'message' | 'author' | 'hash' | 'file' | 'content';

export interface GitToolResult<T = unknown> {
  success: boolean;
  action: string;
  message: string;
  data?: T;
  error?: string;
}

const repoPathSchema = z
  .string()
  .trim()
  .min(1, 'repoPath is required')
  .describe('Absolute repository path');

const nonEmptyString = z.string().trim().min(1);

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join('; ');
}

function validationError(action: string, error: z.ZodError): GitToolResult {
  const message = formatValidationError(error);
  return {
    success: false,
    action,
    message,
    error: message,
  };
}

function unknownError(action: string, error: unknown): GitToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    action,
    message,
    error: message,
  };
}

function mapGitResult<T>(
  action: string,
  result: { success: boolean; data?: T; error?: string },
  successMessage: string
): GitToolResult<T> {
  if (result.success) {
    return {
      success: true,
      action,
      message: successMessage,
      data: result.data,
    };
  }

  const error = result.error || `Git ${action} failed`;
  return {
    success: false,
    action,
    message: error,
    error,
  };
}

export const gitRepoInspectInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('is_repo'),
    repoPath: repoPathSchema,
  }),
  z.object({
    action: z.literal('status'),
    repoPath: repoPathSchema,
  }),
  z.object({
    action: z.literal('full_status'),
    repoPath: repoPathSchema,
    maxCommits: z.number().int().min(1).max(500).optional().default(50),
  }),
]);

export const gitChangesInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('stage'),
    repoPath: repoPathSchema,
    files: z.array(nonEmptyString).min(1, 'files are required for stage'),
  }),
  z.object({
    action: z.literal('stage_all'),
    repoPath: repoPathSchema,
  }),
  z.object({
    action: z.literal('unstage'),
    repoPath: repoPathSchema,
    files: z.array(nonEmptyString).min(1, 'files are required for unstage'),
  }),
  z.object({
    action: z.literal('commit'),
    repoPath: repoPathSchema,
    message: nonEmptyString.describe('Commit message'),
    description: z.string().optional(),
    amend: z.boolean().optional(),
    allowEmpty: z.boolean().optional(),
    files: z.array(nonEmptyString).optional(),
  }),
  z.object({
    action: z.literal('discard'),
    repoPath: repoPathSchema,
    files: z.array(nonEmptyString).min(1, 'files are required for discard'),
    confirm: z.literal(true).describe('Must be true to confirm discard'),
  }),
  z.object({
    action: z.literal('stash'),
    repoPath: repoPathSchema,
    stashAction: z
      .enum(['save', 'pop', 'apply', 'drop', 'list', 'clear'])
      .optional()
      .default('save'),
    message: z.string().optional(),
    includeUntracked: z.boolean().optional(),
    stashIndex: z.number().int().min(0).optional(),
  }),
]);

export const gitBranchInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    repoPath: repoPathSchema,
    includeRemote: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal('create'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    startPoint: z.string().optional(),
  }),
  z.object({
    action: z.literal('delete'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    force: z.boolean().optional(),
    confirm: z.literal(true).describe('Must be true to confirm branch deletion'),
  }),
  z.object({
    action: z.literal('checkout'),
    repoPath: repoPathSchema,
    target: nonEmptyString,
    createBranch: z.boolean().optional(),
    force: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('merge'),
    repoPath: repoPathSchema,
    branch: nonEmptyString,
    noCommit: z.boolean().optional(),
    noFf: z.boolean().optional(),
    squash: z.boolean().optional(),
    message: z.string().optional(),
  }),
  z.object({
    action: z.literal('rename'),
    repoPath: repoPathSchema,
    oldName: nonEmptyString,
    newName: nonEmptyString,
    force: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('merge_abort'),
    repoPath: repoPathSchema,
  }),
]);

export const gitHistoryInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('log'),
    repoPath: repoPathSchema,
    maxCount: z.number().int().min(1).max(500).optional().default(50),
    skip: z.number().int().min(0).optional(),
    since: z.string().optional(),
    until: z.string().optional(),
    author: z.string().optional(),
    grep: z.string().optional(),
    path: z.string().optional(),
  }),
  z.object({
    action: z.literal('diff'),
    repoPath: repoPathSchema,
    staged: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('diff_between'),
    repoPath: repoPathSchema,
    fromRef: nonEmptyString,
    toRef: nonEmptyString,
  }),
  z.object({
    action: z.literal('diff_file'),
    repoPath: repoPathSchema,
    filePath: nonEmptyString,
    staged: z.boolean().optional(),
    maxLines: z.number().int().min(1).max(20000).optional(),
  }),
  z.object({
    action: z.literal('show_commit'),
    repoPath: repoPathSchema,
    commitHash: nonEmptyString,
    maxLines: z.number().int().min(1).max(20000).optional(),
  }),
  z.object({
    action: z.literal('search'),
    repoPath: repoPathSchema,
    mode: z
      .enum(['message', 'author', 'hash', 'file', 'content'])
      .optional()
      .default('message'),
    query: nonEmptyString,
    maxCount: z.number().int().min(1).max(500).optional(),
    branch: z.string().optional(),
  }),
]);

export const gitRemoteInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    repoPath: repoPathSchema,
  }),
  z.object({
    action: z.literal('add'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    url: nonEmptyString,
  }),
  z.object({
    action: z.literal('remove'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    confirm: z.literal(true).describe('Must be true to confirm remote removal'),
  }),
  z.object({
    action: z.literal('fetch'),
    repoPath: repoPathSchema,
    remote: z.string().optional(),
  }),
  z.object({
    action: z.literal('pull'),
    repoPath: repoPathSchema,
    remote: z.string().optional(),
    branch: z.string().optional(),
    rebase: z.boolean().optional(),
    noCommit: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('push'),
    repoPath: repoPathSchema,
    remote: z.string().optional(),
    branch: z.string().optional(),
    force: z.boolean().optional(),
    setUpstream: z.boolean().optional(),
    tags: z.boolean().optional(),
  }),
]);

export const gitTagInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    repoPath: repoPathSchema,
  }),
  z.object({
    action: z.literal('create'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    message: z.string().optional(),
    target: z.string().optional(),
    force: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('delete'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    confirm: z.literal(true).describe('Must be true to confirm tag deletion'),
  }),
  z.object({
    action: z.literal('push'),
    repoPath: repoPathSchema,
    name: nonEmptyString,
    remote: z.string().optional(),
  }),
]);

export type GitRepoInspectInput = z.infer<typeof gitRepoInspectInputSchema>;
export type GitChangesInput = z.infer<typeof gitChangesInputSchema>;
export type GitBranchInput = z.infer<typeof gitBranchInputSchema>;
export type GitHistoryInput = z.infer<typeof gitHistoryInputSchema>;
export type GitRemoteInput = z.infer<typeof gitRemoteInputSchema>;
export type GitTagInput = z.infer<typeof gitTagInputSchema>;

export async function executeGitRepoInspect(input: unknown): Promise<GitToolResult> {
  const parsed = gitRepoInspectInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError('git_repo_inspect', parsed.error);
  }

  const data = parsed.data;
  try {
    switch (data.action) {
      case 'is_repo': {
        const isRepo = await gitService.isRepo(data.repoPath);
        return {
          success: true,
          action: data.action,
          message: isRepo ? 'Path is a Git repository' : 'Path is not a Git repository',
          data: { repoPath: data.repoPath, isRepo },
        };
      }
      case 'status': {
        const result = await gitService.getStatus(data.repoPath);
        return mapGitResult(data.action, result, 'Loaded repository status');
      }
      case 'full_status': {
        const result = await gitService.getFullStatus(data.repoPath, data.maxCommits);
        return mapGitResult(data.action, result, 'Loaded full repository status');
      }
    }
  } catch (error) {
    return unknownError(data.action, error);
  }
}

export async function executeGitChanges(input: unknown): Promise<GitToolResult> {
  const parsed = gitChangesInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError('git_changes', parsed.error);
  }

  const data = parsed.data;
  try {
    switch (data.action) {
      case 'stage': {
        const result = await gitService.stage(data.repoPath, data.files);
        return mapGitResult(data.action, result, `Staged ${data.files.length} file(s)`);
      }
      case 'stage_all': {
        const result = await gitService.stageAll(data.repoPath);
        return mapGitResult(data.action, result, 'Staged all changes');
      }
      case 'unstage': {
        const result = await gitService.unstage(data.repoPath, data.files);
        return mapGitResult(data.action, result, `Unstaged ${data.files.length} file(s)`);
      }
      case 'commit': {
        const result = await gitService.commit({
          repoPath: data.repoPath,
          message: data.message,
          description: data.description,
          amend: data.amend,
          allowEmpty: data.allowEmpty,
          files: data.files,
        });
        return mapGitResult(data.action, result, 'Created commit');
      }
      case 'discard': {
        const result = await gitService.discardChanges(data.repoPath, data.files);
        return mapGitResult(data.action, result, `Discarded changes in ${data.files.length} file(s)`);
      }
      case 'stash': {
        if (data.stashAction === 'list') {
          const result = await gitService.getStashList(data.repoPath);
          return mapGitResult('stash_list', result, 'Loaded stash list');
        }

        const result = await gitService.stash({
          repoPath: data.repoPath,
          action: data.stashAction,
          message: data.message,
          includeUntracked: data.includeUntracked,
          stashIndex: data.stashIndex,
        });
        return mapGitResult(`stash_${data.stashAction}`, result, `Stash action "${data.stashAction}" completed`);
      }
    }
  } catch (error) {
    return unknownError(data.action, error);
  }
}

export async function executeGitBranch(input: unknown): Promise<GitToolResult> {
  const parsed = gitBranchInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError('git_branch', parsed.error);
  }

  const data = parsed.data;
  try {
    switch (data.action) {
      case 'list': {
        const result = await gitService.getBranches(data.repoPath, data.includeRemote);
        return mapGitResult(data.action, result, 'Loaded branch list');
      }
      case 'create': {
        const result = await gitService.createBranch({
          repoPath: data.repoPath,
          name: data.name,
          startPoint: data.startPoint,
        });
        return mapGitResult(data.action, result, `Created branch "${data.name}"`);
      }
      case 'delete': {
        const result = await gitService.deleteBranch({
          repoPath: data.repoPath,
          name: data.name,
          force: data.force,
        });
        return mapGitResult(data.action, result, `Deleted branch "${data.name}"`);
      }
      case 'checkout': {
        const result = await gitService.checkout({
          repoPath: data.repoPath,
          target: data.target,
          createBranch: data.createBranch,
          force: data.force,
        });
        return mapGitResult(data.action, result, `Checked out "${data.target}"`);
      }
      case 'merge': {
        const result = await gitService.merge({
          repoPath: data.repoPath,
          branch: data.branch,
          noCommit: data.noCommit,
          noFf: data.noFf,
          squash: data.squash,
          message: data.message,
        });
        return mapGitResult(data.action, result, `Merged branch "${data.branch}"`);
      }
      case 'rename': {
        const result = await gitService.renameBranch(
          data.repoPath,
          data.oldName,
          data.newName,
          data.force
        );
        return mapGitResult(data.action, result, `Renamed branch "${data.oldName}" to "${data.newName}"`);
      }
      case 'merge_abort': {
        const result = await gitService.mergeAbort(data.repoPath);
        return mapGitResult(data.action, result, 'Aborted merge');
      }
    }
  } catch (error) {
    return unknownError(data.action, error);
  }
}

export async function executeGitHistory(input: unknown): Promise<GitToolResult> {
  const parsed = gitHistoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError('git_history', parsed.error);
  }

  const data = parsed.data;
  try {
    switch (data.action) {
      case 'log': {
        const result = await gitService.getLog({
          repoPath: data.repoPath,
          maxCount: data.maxCount,
          skip: data.skip,
          since: data.since,
          until: data.until,
          author: data.author,
          grep: data.grep,
          path: data.path,
        });
        return mapGitResult(data.action, result, 'Loaded commit history');
      }
      case 'diff': {
        const result = await gitService.getDiff(data.repoPath, data.staged);
        return mapGitResult(data.action, result, 'Loaded diff');
      }
      case 'diff_between': {
        const result = await gitService.getDiffBetween(data.repoPath, data.fromRef, data.toRef);
        return mapGitResult(data.action, result, 'Loaded diff between refs');
      }
      case 'diff_file': {
        const result = await gitService.getDiffFile(
          data.repoPath,
          data.filePath,
          data.staged,
          data.maxLines
        );
        return mapGitResult(data.action, result, `Loaded diff for file "${data.filePath}"`);
      }
      case 'show_commit': {
        const result = await gitService.showCommit(data.repoPath, data.commitHash, data.maxLines);
        return mapGitResult(data.action, result, `Loaded commit "${data.commitHash}"`);
      }
      case 'search': {
        const searchMode: GitSearchMode = data.mode;
        const result = await gitService.searchCommits({
          repoPath: data.repoPath,
          mode: searchMode,
          query: data.query,
          maxCount: data.maxCount,
          branch: data.branch,
        });
        return mapGitResult(data.action, result, 'Loaded search results');
      }
    }
  } catch (error) {
    return unknownError(data.action, error);
  }
}

export async function executeGitRemote(input: unknown): Promise<GitToolResult> {
  const parsed = gitRemoteInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError('git_remote', parsed.error);
  }

  const data = parsed.data;
  try {
    switch (data.action) {
      case 'list': {
        const result = await gitService.getRemotes(data.repoPath);
        return mapGitResult(data.action, result, 'Loaded remotes');
      }
      case 'add': {
        const result = await gitService.addRemote(data.repoPath, data.name, data.url);
        return mapGitResult(data.action, result, `Added remote "${data.name}"`);
      }
      case 'remove': {
        const result = await gitService.removeRemote(data.repoPath, data.name);
        return mapGitResult(data.action, result, `Removed remote "${data.name}"`);
      }
      case 'fetch': {
        const result = await gitService.fetch(data.repoPath, data.remote);
        return mapGitResult(data.action, result, 'Fetched remote updates');
      }
      case 'pull': {
        const result = await gitService.pull({
          repoPath: data.repoPath,
          remote: data.remote,
          branch: data.branch,
          rebase: data.rebase,
          noCommit: data.noCommit,
        });
        return mapGitResult(data.action, result, 'Pulled remote updates');
      }
      case 'push': {
        const result = await gitService.push({
          repoPath: data.repoPath,
          remote: data.remote,
          branch: data.branch,
          force: data.force,
          setUpstream: data.setUpstream,
          tags: data.tags,
        });
        return mapGitResult(data.action, result, 'Pushed commits to remote');
      }
    }
  } catch (error) {
    return unknownError(data.action, error);
  }
}

export async function executeGitTag(input: unknown): Promise<GitToolResult> {
  const parsed = gitTagInputSchema.safeParse(input);
  if (!parsed.success) {
    return validationError('git_tag', parsed.error);
  }

  const data = parsed.data;
  try {
    switch (data.action) {
      case 'list': {
        const result = await gitService.getTagList(data.repoPath);
        return mapGitResult(data.action, result, 'Loaded tags');
      }
      case 'create': {
        const result = await gitService.createTag({
          repoPath: data.repoPath,
          name: data.name,
          message: data.message,
          target: data.target,
          force: data.force,
        });
        return mapGitResult(data.action, result, `Created tag "${data.name}"`);
      }
      case 'delete': {
        const result = await gitService.deleteTag(data.repoPath, data.name);
        return mapGitResult(data.action, result, `Deleted tag "${data.name}"`);
      }
      case 'push': {
        const result = await gitService.pushTag(data.repoPath, data.name, data.remote);
        return mapGitResult(data.action, result, `Pushed tag "${data.name}"`);
      }
    }
  } catch (error) {
    return unknownError(data.action, error);
  }
}

export const gitTools = {
  git_repo_inspect: {
    name: 'git_repo_inspect',
    description:
      'Inspect repository state. Supports actions: is_repo, status, full_status.',
    parameters: gitRepoInspectInputSchema,
    execute: executeGitRepoInspect,
    requiresApproval: false,
    category: 'system' as const,
  },
  git_changes: {
    name: 'git_changes',
    description:
      'Manage working tree changes. Supports actions: stage, stage_all, unstage, commit, discard, stash.',
    parameters: gitChangesInputSchema,
    execute: executeGitChanges,
    requiresApproval: true,
    category: 'system' as const,
  },
  git_branch: {
    name: 'git_branch',
    description:
      'Manage branches. Supports actions: list, create, delete, checkout, merge, rename, merge_abort.',
    parameters: gitBranchInputSchema,
    execute: executeGitBranch,
    requiresApproval: true,
    category: 'system' as const,
  },
  git_history: {
    name: 'git_history',
    description:
      'Query history and diffs. Supports actions: log, diff, diff_between, diff_file, show_commit, search.',
    parameters: gitHistoryInputSchema,
    execute: executeGitHistory,
    requiresApproval: false,
    category: 'system' as const,
  },
  git_remote: {
    name: 'git_remote',
    description:
      'Manage remote sync and remotes. Supports actions: list, add, remove, fetch, pull, push.',
    parameters: gitRemoteInputSchema,
    execute: executeGitRemote,
    requiresApproval: true,
    category: 'system' as const,
  },
  git_tag: {
    name: 'git_tag',
    description:
      'Manage tags. Supports actions: list, create, delete, push.',
    parameters: gitTagInputSchema,
    execute: executeGitTag,
    requiresApproval: true,
    category: 'system' as const,
  },
};

export const gitToolPromptSnippet = `Use structured Git tools first for Git workflows: git_repo_inspect, git_changes, git_branch, git_history, git_remote, and git_tag. Use shell_execute only when no equivalent structured Git action exists.`;

export const gitToolSystemPrompt = `
## Structured Git Tools

Use structured Git tools for repository tasks:
- \`git_repo_inspect\`: check repository status and full status
- \`git_changes\`: stage/unstage/commit/discard/stash actions
- \`git_branch\`: branch list/create/delete/checkout/merge/rename
- \`git_history\`: commit log, diff queries, commit detail, and history search
- \`git_remote\`: remote list/add/remove/fetch/pull/push
- \`git_tag\`: tag list/create/delete/push

Guidelines:
1. Prefer these structured Git tools over \`shell_execute\` for normal Git operations.
2. Use \`shell_execute\` only if a required Git action is not provided by structured tools.
3. For destructive actions, pass explicit confirmation flags and force options only when intended.
`;
