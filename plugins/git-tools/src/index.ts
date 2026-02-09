/**
 * Git Tools Plugin
 *
 * Git version control operations for AI agents.
 */

import { definePlugin, defineCommand, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

// ============================================================================
// Types
// ============================================================================

interface GitConfig {
  maxLogEntries: number;
  maxDiffSize: number;
}

interface GitStatusArgs {
  path?: string;
  short?: boolean;
}

interface GitDiffArgs {
  path?: string;
  file?: string;
  staged?: boolean;
  commit1?: string;
  commit2?: string;
}

interface GitLogArgs {
  path?: string;
  limit?: number;
  oneline?: boolean;
  author?: string;
  since?: string;
  until?: string;
}

interface GitBranchArgs {
  path?: string;
  action?: 'list' | 'create' | 'switch' | 'delete';
  name?: string;
}

interface GitCommitArgs {
  path?: string;
  message: string;
  all?: boolean;
  amend?: boolean;
}

interface GitStashArgs {
  path?: string;
  action?: 'push' | 'pop' | 'list' | 'apply' | 'drop';
  message?: string;
  index?: number;
}

interface GitBlameArgs {
  path?: string;
  file: string;
  startLine?: number;
  endLine?: number;
}

// ============================================================================
// Helpers
// ============================================================================

async function runGitCommand(
  context: PluginContext,
  args: string[],
  cwd?: string
): Promise<{ success: boolean; stdout: string; stderr: string }> {
  const command = `git ${args.join(' ')}`;
  try {
    const result = await context.shell.execute(command, { cwd, timeout: 30000 });
    return {
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    return {
      success: false,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseStatus(output: string): {
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
} {
  const staged: string[] = [];
  const modified: string[] = [];
  const untracked: string[] = [];
  const deleted: string[] = [];

  for (const line of output.split('\n')) {
    if (!line.trim()) continue;

    const index = line[0];
    const working = line[1];
    const file = line.substring(3).trim();

    if (index === 'A' || index === 'M' || index === 'R') {
      staged.push(file);
    }
    if (working === 'M') {
      modified.push(file);
    }
    if (index === '?' && working === '?') {
      untracked.push(file);
    }
    if (index === 'D' || working === 'D') {
      deleted.push(file);
    }
  }

  return { staged, modified, untracked, deleted };
}

function parseLogOneline(output: string): Array<{ hash: string; message: string }> {
  return output
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const [hash, ...messageParts] = line.split(' ');
      return { hash, message: messageParts.join(' ') };
    });
}

// ============================================================================
// Tool Implementations
// ============================================================================

function createGitStatusTool(context: PluginContext) {
  return {
    name: 'git_status',
    description: 'Get the current status of the git repository',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path (defaults to current directory)'),
        short: Schema.boolean('Use short format'),
      },
      []
    ),
    execute: async (args: GitStatusArgs, _toolContext: PluginToolContext) => {
      const gitArgs = ['status', '--porcelain'];
      if (!args.short) {
        gitArgs.push('-b');
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      if (!result.success) {
        return {
          success: false,
          error: result.stderr || 'Not a git repository',
        };
      }

      const parsed = parseStatus(result.stdout);
      const branchMatch = result.stdout.match(/^## (.+?)(?:\.\.\.|$)/m);
      const branch = branchMatch ? branchMatch[1] : 'unknown';

      return {
        success: true,
        branch,
        isClean: parsed.staged.length === 0 && parsed.modified.length === 0 && parsed.untracked.length === 0,
        staged: parsed.staged,
        modified: parsed.modified,
        untracked: parsed.untracked,
        deleted: parsed.deleted,
        summary: {
          stagedCount: parsed.staged.length,
          modifiedCount: parsed.modified.length,
          untrackedCount: parsed.untracked.length,
          deletedCount: parsed.deleted.length,
        },
      };
    },
  };
}

function createGitDiffTool(config: GitConfig, context: PluginContext) {
  return {
    name: 'git_diff',
    description: 'Show differences between commits, working tree, or staged changes',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        file: Schema.string('Specific file to diff'),
        staged: Schema.boolean('Show staged changes'),
        commit1: Schema.string('First commit for comparison'),
        commit2: Schema.string('Second commit for comparison'),
      },
      []
    ),
    execute: async (args: GitDiffArgs, _toolContext: PluginToolContext) => {
      const gitArgs = ['diff', '--stat'];

      if (args.staged) {
        gitArgs.push('--cached');
      }

      if (args.commit1) {
        gitArgs.push(args.commit1);
        if (args.commit2) {
          gitArgs.push(args.commit2);
        }
      }

      if (args.file) {
        gitArgs.push('--', args.file);
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      if (!result.success) {
        return {
          success: false,
          error: result.stderr,
        };
      }

      // Get full diff if stat is small enough
      let fullDiff = '';
      const statSize = result.stdout.length;

      if (statSize < config.maxDiffSize / 10) {
        const fullArgs = gitArgs.filter((a) => a !== '--stat');
        const fullResult = await runGitCommand(context, fullArgs, args.path);
        if (fullResult.success && fullResult.stdout.length < config.maxDiffSize) {
          fullDiff = fullResult.stdout;
        }
      }

      return {
        success: true,
        stat: result.stdout,
        diff: fullDiff || undefined,
        truncated: !fullDiff && statSize > 0,
      };
    },
  };
}

function createGitLogTool(config: GitConfig, context: PluginContext) {
  return {
    name: 'git_log',
    description: 'View commit history',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        limit: Schema.number('Number of commits to show'),
        oneline: Schema.boolean('One line per commit'),
        author: Schema.string('Filter by author'),
        since: Schema.string('Show commits after date'),
        until: Schema.string('Show commits before date'),
      },
      []
    ),
    execute: async (args: GitLogArgs, _toolContext: PluginToolContext) => {
      const limit = Math.min(args.limit || 20, config.maxLogEntries);
      const gitArgs = ['log', `--max-count=${limit}`];

      if (args.oneline !== false) {
        gitArgs.push('--oneline');
      } else {
        gitArgs.push('--format=%H|%an|%ae|%ai|%s');
      }

      if (args.author) {
        gitArgs.push(`--author=${args.author}`);
      }
      if (args.since) {
        gitArgs.push(`--since=${args.since}`);
      }
      if (args.until) {
        gitArgs.push(`--until=${args.until}`);
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      if (!result.success) {
        return {
          success: false,
          error: result.stderr,
        };
      }

      if (args.oneline !== false) {
        return {
          success: true,
          commits: parseLogOneline(result.stdout),
          count: parseLogOneline(result.stdout).length,
        };
      }

      const commits = result.stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [hash, author, email, date, subject] = line.split('|');
          return { hash, author, email, date, subject };
        });

      return {
        success: true,
        commits,
        count: commits.length,
      };
    },
  };
}

function createGitBranchTool(context: PluginContext) {
  return {
    name: 'git_branch',
    description: 'List, create, or switch branches',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        action: Schema.enum(['list', 'create', 'switch', 'delete'], 'Branch action'),
        name: Schema.string('Branch name (for create/switch/delete)'),
      },
      []
    ),
    execute: async (args: GitBranchArgs, _toolContext: PluginToolContext) => {
      const action = args.action || 'list';

      if (action === 'list') {
        const result = await runGitCommand(context, ['branch', '-a', '-v'], args.path);
        if (!result.success) {
          return { success: false, error: result.stderr };
        }

        const branches = result.stdout
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => {
            const isCurrent = line.startsWith('*');
            const cleaned = line.replace(/^\*?\s+/, '');
            const [name, ...rest] = cleaned.split(/\s+/);
            return {
              name,
              current: isCurrent,
              info: rest.join(' '),
            };
          });

        return {
          success: true,
          branches,
          current: branches.find((b) => b.current)?.name,
        };
      }

      if (!args.name) {
        return {
          success: false,
          error: `Branch name required for action: ${action}`,
        };
      }

      let gitArgs: string[];
      switch (action) {
        case 'create':
          gitArgs = ['checkout', '-b', args.name];
          break;
        case 'switch':
          gitArgs = ['checkout', args.name];
          break;
        case 'delete':
          gitArgs = ['branch', '-d', args.name];
          break;
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      return {
        success: result.success,
        action,
        branch: args.name,
        message: result.success ? result.stdout : result.stderr,
      };
    },
  };
}

function createGitCommitTool(context: PluginContext) {
  return {
    name: 'git_commit',
    description: 'Create a new commit with the specified message',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        message: Schema.string('Commit message'),
        all: Schema.boolean('Automatically stage modified files'),
        amend: Schema.boolean('Amend the last commit'),
      },
      ['message']
    ),
    execute: async (args: GitCommitArgs, _toolContext: PluginToolContext) => {
      const gitArgs = ['commit'];

      if (args.all) {
        gitArgs.push('-a');
      }
      if (args.amend) {
        gitArgs.push('--amend');
      }

      gitArgs.push('-m', `"${args.message.replace(/"/g, '\\"')}"`);

      const result = await runGitCommand(context, gitArgs, args.path);

      if (!result.success) {
        return {
          success: false,
          error: result.stderr || 'Nothing to commit or commit failed',
        };
      }

      // Parse commit hash from output
      const hashMatch = result.stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
      const hash = hashMatch ? hashMatch[1] : undefined;

      return {
        success: true,
        hash,
        message: args.message,
        amended: args.amend || false,
        output: result.stdout,
      };
    },
  };
}

function createGitStashTool(context: PluginContext) {
  return {
    name: 'git_stash',
    description: 'Stash or restore changes',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        action: Schema.enum(['push', 'pop', 'list', 'apply', 'drop'], 'Stash action'),
        message: Schema.string('Stash message (for push)'),
        index: Schema.number('Stash index (for apply/pop/drop)'),
      },
      []
    ),
    execute: async (args: GitStashArgs, _toolContext: PluginToolContext) => {
      const action = args.action || 'list';
      let gitArgs: string[];

      switch (action) {
        case 'list':
          gitArgs = ['stash', 'list'];
          break;
        case 'push':
          gitArgs = ['stash', 'push'];
          if (args.message) {
            gitArgs.push('-m', `"${args.message}"`);
          }
          break;
        case 'pop':
          gitArgs = ['stash', 'pop'];
          if (args.index !== undefined) {
            gitArgs.push(`stash@{${args.index}}`);
          }
          break;
        case 'apply':
          gitArgs = ['stash', 'apply'];
          if (args.index !== undefined) {
            gitArgs.push(`stash@{${args.index}}`);
          }
          break;
        case 'drop':
          gitArgs = ['stash', 'drop'];
          if (args.index !== undefined) {
            gitArgs.push(`stash@{${args.index}}`);
          }
          break;
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      if (action === 'list') {
        const stashes = result.stdout
          .split('\n')
          .filter((line) => line.trim())
          .map((line, index) => {
            const match = line.match(/stash@\{(\d+)\}: (.+)/);
            return {
              index,
              ref: match ? match[0] : line,
              message: match ? match[2] : line,
            };
          });

        return {
          success: true,
          stashes,
          count: stashes.length,
        };
      }

      return {
        success: result.success,
        action,
        message: result.success ? result.stdout : result.stderr,
      };
    },
  };
}

function createGitBlameTool(context: PluginContext) {
  return {
    name: 'git_blame',
    description: 'Show line-by-line authorship for a file',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        file: Schema.string('File to blame'),
        startLine: Schema.number('Start line'),
        endLine: Schema.number('End line'),
      },
      ['file']
    ),
    execute: async (args: GitBlameArgs, _toolContext: PluginToolContext) => {
      const gitArgs = ['blame', '--line-porcelain'];

      if (args.startLine && args.endLine) {
        gitArgs.push(`-L${args.startLine},${args.endLine}`);
      }

      gitArgs.push('--', args.file);

      const result = await runGitCommand(context, gitArgs, args.path);

      if (!result.success) {
        return {
          success: false,
          error: result.stderr,
        };
      }

      // Parse porcelain output
      const lines: Array<{
        hash: string;
        author: string;
        timestamp: string;
        line: number;
        content: string;
      }> = [];

      const chunks = result.stdout.split(/(?=^[a-f0-9]{40})/m);

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        const hashMatch = chunk.match(/^([a-f0-9]{40})/);
        const authorMatch = chunk.match(/^author (.+)$/m);
        const timeMatch = chunk.match(/^author-time (\d+)$/m);
        const lineMatch = chunk.match(/^([a-f0-9]{40}) \d+ (\d+)/);
        const contentMatch = chunk.match(/^\t(.*)$/m);

        if (hashMatch && authorMatch && lineMatch) {
          lines.push({
            hash: hashMatch[1].substring(0, 8),
            author: authorMatch[1],
            timestamp: timeMatch ? new Date(parseInt(timeMatch[1]) * 1000).toISOString() : '',
            line: parseInt(lineMatch[2]),
            content: contentMatch ? contentMatch[1] : '',
          });
        }
      }

      return {
        success: true,
        file: args.file,
        lines,
        lineCount: lines.length,
      };
    },
  };
}

// ============================================================================
// New Tools
// ============================================================================

function createGitAddTool(context: PluginContext) {
  return {
    name: 'git_add',
    description: 'Stage files for commit',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        files: Schema.array(Schema.string('Files to stage (use "." for all)')),
      },
      ['files']
    ),
    execute: async (
      args: { path?: string; files: string[] },
      _toolContext: PluginToolContext
    ) => {
      const gitArgs = ['add', ...args.files];
      const result = await runGitCommand(context, gitArgs, args.path);

      context.events.emit('git-tools:add', {
        files: args.files,
        success: result.success,
      });

      return {
        success: result.success,
        files: args.files,
        message: result.success ? 'Files staged successfully' : result.stderr,
      };
    },
  };
}

function createGitRemoteTool(context: PluginContext) {
  return {
    name: 'git_remote',
    description: 'Manage remote repositories',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        action: Schema.enum(['list', 'add', 'remove', 'get-url'], 'Remote action'),
        name: Schema.string('Remote name'),
        url: Schema.string('Remote URL (for add)'),
      },
      []
    ),
    execute: async (
      args: { path?: string; action?: string; name?: string; url?: string },
      _toolContext: PluginToolContext
    ) => {
      const action = args.action || 'list';

      if (action === 'list') {
        const result = await runGitCommand(context, ['remote', '-v'], args.path);
        if (!result.success) {
          return { success: false, error: result.stderr };
        }

        const remotes = result.stdout
          .split('\n')
          .filter((line) => line.trim())
          .reduce<Record<string, { fetch?: string; push?: string }>>((acc, line) => {
            const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
            if (match) {
              const [, remoteName, remoteUrl, type] = match;
              if (!acc[remoteName]) acc[remoteName] = {};
              acc[remoteName][type as 'fetch' | 'push'] = remoteUrl;
            }
            return acc;
          }, {});

        // Cache remote info
        await context.storage.set('remotes', { remotes, timestamp: Date.now() });

        return { success: true, remotes };
      }

      if (!args.name) {
        return { success: false, error: `Remote name required for action: ${action}` };
      }

      let gitArgs: string[];
      switch (action) {
        case 'add':
          if (!args.url) return { success: false, error: 'URL required for add' };
          gitArgs = ['remote', 'add', args.name, args.url];
          break;
        case 'remove':
          gitArgs = ['remote', 'remove', args.name];
          break;
        case 'get-url':
          gitArgs = ['remote', 'get-url', args.name];
          break;
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      return {
        success: result.success,
        action,
        name: args.name,
        message: result.success ? result.stdout.trim() : result.stderr,
      };
    },
  };
}

function createGitTagTool(context: PluginContext) {
  return {
    name: 'git_tag',
    description: 'List, create, or delete tags',
    parametersSchema: parameters(
      {
        path: Schema.string('Repository path'),
        action: Schema.enum(['list', 'create', 'delete'], 'Tag action'),
        name: Schema.string('Tag name (for create/delete)'),
        message: Schema.string('Tag message (for annotated tags)'),
        commit: Schema.string('Commit to tag (default: HEAD)'),
      },
      []
    ),
    execute: async (
      args: { path?: string; action?: string; name?: string; message?: string; commit?: string },
      _toolContext: PluginToolContext
    ) => {
      const action = args.action || 'list';

      if (action === 'list') {
        const result = await runGitCommand(context, ['tag', '-l', '--sort=-creatordate'], args.path);
        if (!result.success) {
          return { success: false, error: result.stderr };
        }

        const tags = result.stdout.split('\n').filter((t) => t.trim());
        return { success: true, tags, count: tags.length };
      }

      if (!args.name) {
        return { success: false, error: `Tag name required for action: ${action}` };
      }

      let gitArgs: string[];
      switch (action) {
        case 'create':
          gitArgs = ['tag'];
          if (args.message) {
            gitArgs.push('-a', args.name, '-m', `"${args.message}"`);
          } else {
            gitArgs.push(args.name);
          }
          if (args.commit) {
            gitArgs.push(args.commit);
          }
          break;
        case 'delete':
          gitArgs = ['tag', '-d', args.name];
          break;
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }

      const result = await runGitCommand(context, gitArgs, args.path);

      context.events.emit('git-tools:tag', {
        action,
        name: args.name,
        success: result.success,
      });

      return {
        success: result.success,
        action,
        tag: args.name,
        message: result.success ? result.stdout.trim() : result.stderr,
      };
    },
  };
}

// ============================================================================
// Commands
// ============================================================================

function createGitCommands(context: PluginContext) {
  return [
    defineCommand(
      'git-tools.status',
      'Git Status',
      async () => {
        const result = await runGitCommand(context, ['status', '--short', '-b']);
        context.ui.showNotification({
          title: 'Git Status',
          message: result.success ? result.stdout || 'Clean working directory' : `Error: ${result.stderr}`,
          type: result.success ? 'info' : 'error',
        });
      },
      { description: 'Show git repository status', icon: 'git-branch' }
    ),
    defineCommand(
      'git-tools.recent-commits',
      'Recent Commits',
      async () => {
        const result = await runGitCommand(context, ['log', '--oneline', '-10']);
        context.ui.showNotification({
          title: 'Recent Commits',
          message: result.success ? result.stdout || 'No commits yet' : `Error: ${result.stderr}`,
          type: result.success ? 'info' : 'error',
        });
      },
      { description: 'Show last 10 commits', icon: 'git-commit' }
    ),
    defineCommand(
      'git-tools.current-branch',
      'Current Branch',
      async () => {
        const result = await runGitCommand(context, ['branch', '--show-current']);
        context.ui.showNotification({
          title: 'Current Branch',
          message: result.success ? result.stdout.trim() || 'Detached HEAD' : `Error: ${result.stderr}`,
          type: 'info',
        });
      },
      { description: 'Show current branch name', icon: 'git-branch' }
    ),
  ];
}

// ============================================================================
// Plugin Definition
// ============================================================================

const eventCleanups: Array<() => void> = [];

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Git Tools plugin activated');

    const config: GitConfig = {
      maxLogEntries: (context.config.maxLogEntries as number) || 50,
      maxDiffSize: (context.config.maxDiffSize as number) || 102400,
    };

    const tools = [
      createGitStatusTool(context),
      createGitDiffTool(config, context),
      createGitLogTool(config, context),
      createGitBranchTool(context),
      createGitCommitTool(context),
      createGitStashTool(context),
      createGitBlameTool(context),
      createGitAddTool(context),
      createGitRemoteTool(context),
      createGitTagTool(context),
    ];

    const mutatingTools = ['git_commit', 'git_add'];

    for (const tool of tools) {
      context.agent.registerTool({
        name: tool.name,
        pluginId: context.pluginId,
        definition: {
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
          requiresApproval: mutatingTools.includes(tool.name),
        },
        execute: tool.execute,
      });
    }

    context.logger.info(`Registered ${tools.length} git tools`);

    // Register commands
    const commands = createGitCommands(context);
    context.logger.info(`Registered ${commands.length} commands`);

    // Event listeners
    const unsub1 = context.events.on('git-tools:refresh-status', async () => {
      context.logger.info('Refreshing git status');
      const result = await runGitCommand(context, ['status', '--porcelain', '-b']);
      if (result.success) {
        const parsed = parseStatus(result.stdout);
        await context.storage.set('lastStatus', { ...parsed, timestamp: Date.now() });
        context.events.emit('git-tools:status-updated', parsed);
      }
    });
    eventCleanups.push(unsub1);

    return {
      onEnable: async () => context.logger.info('Git Tools enabled'),
      onDisable: async () => context.logger.info('Git Tools disabled'),
      onConfigChange: (newConfig: Record<string, unknown>) => {
        config.maxLogEntries = (newConfig.maxLogEntries as number) || 50;
        config.maxDiffSize = (newConfig.maxDiffSize as number) || 102400;
        context.logger.info('Git Tools config updated');
      },
      onCommand: (commandId: string) => {
        const command = commands.find((c) => c.id === commandId);
        if (command) {
          command.execute();
          return true;
        }
        return false;
      },
    };
  },

  deactivate() {
    for (const cleanup of eventCleanups) {
      cleanup();
    }
    eventCleanups.length = 0;
  },
});
