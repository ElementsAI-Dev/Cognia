/**
 * Shell Tool - Execute shell commands for AI agents
 * 
 * Provides controlled shell command execution in Tauri desktop environment.
 * Includes security controls: command allowlist, dangerous command blocklist,
 * and mandatory user approval.
 */

import { z } from 'zod';
import { isInTauri } from '@/lib/file/file-operations';

// ==================== Schemas ====================

export const shellExecuteInputSchema = z.object({
  command: z.string().describe('The command to execute (e.g., "ls", "git", "npm")'),
  args: z
    .array(z.string())
    .optional()
    .default([])
    .describe('Arguments to pass to the command'),
  cwd: z
    .string()
    .optional()
    .describe('Working directory for the command. Defaults to user home directory.'),
  timeout: z
    .number()
    .min(1000)
    .max(300000)
    .optional()
    .default(30000)
    .describe('Command timeout in milliseconds (default: 30000, max: 300000)'),
  encoding: z
    .enum(['utf-8', 'gbk', 'ascii'])
    .optional()
    .default('utf-8')
    .describe('Output encoding (default: utf-8)'),
});

export type ShellExecuteInput = z.infer<typeof shellExecuteInputSchema>;

export interface ShellToolResult {
  success: boolean;
  data?: {
    stdout: string;
    stderr: string;
    exitCode: number;
    command: string;
    args: string[];
    cwd?: string;
    duration: number;
  };
  error?: string;
}

// ==================== Security ====================

/**
 * Commands that are always allowed (read-only, safe operations)
 */
const ALLOWED_COMMANDS = new Set([
  // File system (read-only)
  'ls', 'dir', 'find', 'tree', 'cat', 'head', 'tail', 'wc', 'file',
  'stat', 'du', 'df', 'which', 'where', 'whereis', 'type',
  // Text processing
  'grep', 'rg', 'ag', 'awk', 'sed', 'sort', 'uniq', 'cut', 'tr',
  'diff', 'comm', 'strings', 'hexdump', 'xxd',
  // Version control
  'git', 'svn', 'gh',
  // Package managers & runners
  'npm', 'npx', 'pnpm', 'pnpx', 'yarn', 'bun', 'bunx',
  'pip', 'pip3', 'pipx', 'uv', 'cargo', 'go',
  'composer', 'gem', 'dotnet', 'mvn', 'gradle',
  'deno', 'proto',
  // Development tools
  'node', 'python', 'python3', 'ruby', 'java', 'javac',
  'rustc', 'gcc', 'g++', 'clang', 'make', 'cmake',
  'tsc', 'eslint', 'prettier', 'jest', 'vitest', 'playwright',
  'swift', 'swiftc', 'kotlin', 'kotlinc',
  // Mobile & cross-platform
  'flutter', 'dart', 'expo', 'react-native',
  // Linters & formatters
  'ruff', 'black', 'mypy', 'flake8', 'pylint', 'isort',
  'clippy', 'rustfmt', 'gofmt', 'golint', 'golangci-lint',
  'biome', 'oxlint', 'dprint',
  // System info
  'uname', 'hostname', 'whoami', 'id', 'env', 'printenv',
  'date', 'uptime', 'free', 'top', 'htop', 'ps',
  // Network (read-only)
  'ping', 'curl', 'wget', 'dig', 'nslookup', 'traceroute',
  'netstat', 'ss', 'ifconfig', 'ip',
  // Archive
  'tar', 'zip', 'unzip', 'gzip', 'gunzip', '7z',
  // Windows specific
  'cmd', 'powershell', 'pwsh', 'Get-ChildItem', 'Get-Content',
  'Get-Process', 'Get-Service', 'systeminfo', 'tasklist',
  'ipconfig', 'nslookup.exe',
  // Docker & containers
  'docker', 'docker-compose', 'podman',
  // DevOps & cloud
  'terraform', 'kubectl', 'helm', 'ansible', 'vagrant',
  'aws', 'az', 'gcloud', 'heroku', 'vercel', 'netlify',
  // Media tools
  'ffmpeg', 'ffprobe', 'magick', 'convert', 'identify',
  // Database clients (read-only queries)
  'psql', 'mysql', 'sqlite3', 'mongosh', 'redis-cli',
]);

/**
 * Commands that are explicitly blocked (dangerous operations)
 */
const BLOCKED_COMMANDS = new Set([
  'rm', 'rmdir', 'del', 'erase',  // Deletion (use file tools instead)
  'format', 'fdisk', 'mkfs',       // Disk operations
  'shutdown', 'reboot', 'halt',    // System control
  'passwd', 'useradd', 'userdel',  // User management
  'chmod', 'chown', 'chgrp',      // Permission changes
  'dd',                            // Raw disk write
  'mkswap', 'swapon', 'swapoff',  // Swap management
  'mount', 'umount',              // Mount operations
  'iptables', 'firewall-cmd',     // Firewall
  'systemctl', 'service',         // Service management
  'crontab',                      // Cron management
  'reg', 'regedit',              // Windows registry
]);

/**
 * Dangerous argument patterns to block
 */
const DANGEROUS_PATTERNS = [
  /;\s*(rm|del|format|shutdown|reboot)/i,  // Command chaining with dangerous commands
  /\|\s*(rm|del|format)/i,                  // Pipe to dangerous commands
  />\s*\/dev\//i,                           // Redirect to device files
  /&&\s*(rm|del|format|shutdown)/i,         // AND chain with dangerous commands
  /`.*`/,                                    // Backtick command substitution
  /\$\(.*\)/,                               // Command substitution
];

/**
 * Check if a command is safe to execute
 */
function validateCommand(command: string, args: string[]): { safe: boolean; reason?: string } {
  const cmd = command.toLowerCase().replace(/\.exe$/, '');

  // Check blocked commands
  if (BLOCKED_COMMANDS.has(cmd)) {
    return {
      safe: false,
      reason: `Command '${command}' is blocked for security reasons. Use the appropriate file/system tools instead.`,
    };
  }

  // Check if command is in allowlist
  if (!ALLOWED_COMMANDS.has(cmd)) {
    return {
      safe: false,
      reason: `Command '${command}' is not in the allowed command list. Allowed commands include: git, npm, node, python, grep, ls, cat, curl, docker, and more.`,
    };
  }

  // Check args for dangerous patterns
  const fullArgs = args.join(' ');
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(fullArgs)) {
      return {
        safe: false,
        reason: `Dangerous argument pattern detected in command arguments. Shell injection or chaining with destructive commands is not allowed.`,
      };
    }
  }

  return { safe: true };
}

// ==================== Executor ====================

/**
 * Execute a shell command
 */
export async function executeShellCommand(
  input: ShellExecuteInput
): Promise<ShellToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'Shell execution is only available in the desktop app',
    };
  }

  // Validate command safety
  const validation = validateCommand(input.command, input.args ?? []);
  if (!validation.safe) {
    return {
      success: false,
      error: validation.reason,
    };
  }

  const startTime = Date.now();

  try {
    const { Command } = await import('@tauri-apps/plugin-shell');

    const cmd = Command.create(input.command, input.args ?? [], {
      cwd: input.cwd,
      encoding: input.encoding,
    });

    // Execute with timeout
    const result = await Promise.race([
      cmd.execute(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Command timed out after ${input.timeout}ms`)), input.timeout)
      ),
    ]);

    const duration = Date.now() - startTime;

    // Truncate output to prevent token overflow
    const maxOutputLength = 50000;
    let stdout = typeof result.stdout === 'string' ? result.stdout : '';
    let stderr = typeof result.stderr === 'string' ? result.stderr : '';

    if (stdout.length > maxOutputLength) {
      stdout = stdout.substring(0, maxOutputLength) + `\n... [truncated, ${stdout.length - maxOutputLength} more characters]`;
    }
    if (stderr.length > maxOutputLength) {
      stderr = stderr.substring(0, maxOutputLength) + `\n... [truncated, ${stderr.length - maxOutputLength} more characters]`;
    }

    return {
      success: result.code === 0,
      data: {
        stdout,
        stderr,
        exitCode: result.code ?? -1,
        command: input.command,
        args: input.args ?? [],
        cwd: input.cwd,
        duration,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute command',
      data: {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: -1,
        command: input.command,
        args: input.args ?? [],
        cwd: input.cwd,
        duration,
      },
    };
  }
}

// ==================== Tool Definition ====================

export const shellTools = {
  shell_execute: {
    name: 'shell_execute',
    description: `Execute a shell command on the local system. Commands are validated against an allowlist for safety.

Allowed command categories:
- File browsing: ls, dir, find, cat, head, tail, tree
- Version control: git, svn, gh
- Package managers & runners: npm, npx, pnpm, pnpx, yarn, bun, bunx, pip, cargo, go, deno
- Development: node, python, tsc, eslint, jest, vitest, playwright
- Mobile & cross-platform: flutter, dart, expo, react-native
- Linters & formatters: ruff, black, mypy, pylint, clippy, biome, oxlint
- Text processing: grep, rg, awk, sed, sort, diff
- Network: curl, wget, ping, dig
- System info: uname, whoami, ps, env
- Containers: docker, docker-compose, podman
- DevOps & cloud: terraform, kubectl, helm, aws, az, gcloud, vercel
- Media: ffmpeg, ffprobe, magick
- Database clients: psql, mysql, sqlite3, mongosh, redis-cli

Blocked: rm, del, format, shutdown, chmod, chown, registry editing.
Use file tools for file creation/deletion instead.`,
    parameters: shellExecuteInputSchema,
    execute: executeShellCommand,
    requiresApproval: true,
    category: 'system' as const,
  },
};

// ==================== System Prompt ====================

export const shellToolSystemPrompt = `
## Shell Command Execution Tool

You have access to a shell command execution tool that allows running commands on the user's local system.

### Guidelines:
1. **Always prefer built-in file tools** for file operations (read, write, delete, move, copy).
2. **Use shell_execute** for:
   - Running development commands (npm, git, python, etc.)
   - Querying system information
   - Running tests and linters
   - Searching with grep/ripgrep
   - Network diagnostics
3. **Commands require user approval** before execution.
4. **Output is truncated** at 50,000 characters to prevent token overflow.
5. **Timeout is 30 seconds** by default (configurable up to 5 minutes).

### Security:
- Only allowlisted commands can be executed
- Destructive commands (rm, del, format) are blocked
- Shell injection patterns are detected and blocked
- Command chaining with dangerous commands is blocked
`;
