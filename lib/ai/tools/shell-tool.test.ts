/**
 * Tests for Shell Tool
 */

import {
  executeShellCommand,
  shellExecuteInputSchema,
  shellTools,
  shellToolSystemPrompt,
  type ShellExecuteInput,
} from './shell-tool';

// Mock file-operations for isInTauri
jest.mock('@/lib/file/file-operations', () => ({
  isInTauri: jest.fn(),
}));

// Mock @tauri-apps/plugin-shell
jest.mock('@tauri-apps/plugin-shell', () => ({
  Command: {
    create: jest.fn(),
  },
}));

import { isInTauri } from '@/lib/file/file-operations';
import { Command } from '@tauri-apps/plugin-shell';

const mockIsInTauri = isInTauri as jest.Mock;
const mockCommandCreate = Command.create as jest.Mock;

describe('shellExecuteInputSchema', () => {
  it('validates valid input', () => {
    const input = {
      command: 'ls',
      args: ['-la'],
      cwd: '/home/user',
      timeout: 30000,
    };
    const result = shellExecuteInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('requires command', () => {
    const input = { args: ['-la'] };
    const result = shellExecuteInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('provides defaults for optional fields', () => {
    const input = { command: 'git' };
    const result = shellExecuteInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.args).toEqual([]);
      expect(result.data.timeout).toBe(30000);
      expect(result.data.encoding).toBe('utf-8');
    }
  });

  it('rejects timeout below minimum', () => {
    const input = { command: 'ls', timeout: 500 };
    const result = shellExecuteInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects timeout above maximum', () => {
    const input = { command: 'ls', timeout: 500000 };
    const result = shellExecuteInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('executeShellCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns error outside Tauri', async () => {
    mockIsInTauri.mockReturnValue(false);

    const input: ShellExecuteInput = {
      command: 'ls',
      args: [],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Shell execution is only available in the desktop app');
  });

  it('blocks dangerous commands', async () => {
    mockIsInTauri.mockReturnValue(true);

    const dangerousCommands = ['rm', 'format', 'shutdown', 'reboot', 'dd', 'passwd'];

    for (const cmd of dangerousCommands) {
      const input: ShellExecuteInput = {
        command: cmd,
        args: [],
        timeout: 30000,
        encoding: 'utf-8',
      };
      const result = await executeShellCommand(input);
      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    }
  });

  it('blocks unknown commands', async () => {
    mockIsInTauri.mockReturnValue(true);

    const input: ShellExecuteInput = {
      command: 'unknown_command_xyz',
      args: [],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not in the allowed command list');
  });

  it('allows safe commands', async () => {
    mockIsInTauri.mockReturnValue(true);

    mockCommandCreate.mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        code: 0,
      }),
    });

    const input: ShellExecuteInput = {
      command: 'ls',
      args: ['-la'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(true);
    expect(result.data?.stdout).toBe('file1.txt\nfile2.txt');
    expect(result.data?.exitCode).toBe(0);
  });

  it('handles command failure (non-zero exit code)', async () => {
    mockIsInTauri.mockReturnValue(true);

    mockCommandCreate.mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        stdout: '',
        stderr: 'command not found',
        code: 127,
      }),
    });

    const input: ShellExecuteInput = {
      command: 'git',
      args: ['invalid-subcommand'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(false);
    expect(result.data?.exitCode).toBe(127);
  });

  it('handles command exceptions', async () => {
    mockIsInTauri.mockReturnValue(true);

    mockCommandCreate.mockReturnValue({
      execute: jest.fn().mockRejectedValue(new Error('Command timed out')),
    });

    const input: ShellExecuteInput = {
      command: 'curl',
      args: ['https://example.com'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('truncates long output', async () => {
    mockIsInTauri.mockReturnValue(true);

    const longOutput = 'x'.repeat(60000);
    mockCommandCreate.mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        stdout: longOutput,
        stderr: '',
        code: 0,
      }),
    });

    const input: ShellExecuteInput = {
      command: 'cat',
      args: ['largefile.txt'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(true);
    expect(result.data!.stdout.length).toBeLessThan(longOutput.length);
    expect(result.data!.stdout).toContain('truncated');
  });

  it('detects dangerous argument patterns', async () => {
    mockIsInTauri.mockReturnValue(true);

    const input: ShellExecuteInput = {
      command: 'git',
      args: ['log', '; rm -rf /'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Dangerous argument pattern');
  });

  it('includes duration in result', async () => {
    mockIsInTauri.mockReturnValue(true);

    mockCommandCreate.mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        stdout: 'ok',
        stderr: '',
        code: 0,
      }),
    });

    const input: ShellExecuteInput = {
      command: 'cat',
      args: ['hello.txt'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);

    expect(result.data?.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('shellTools', () => {
  it('defines shell_execute tool', () => {
    expect(shellTools.shell_execute).toBeDefined();
    expect(shellTools.shell_execute.name).toBe('shell_execute');
    expect(shellTools.shell_execute.requiresApproval).toBe(true);
    expect(shellTools.shell_execute.category).toBe('system');
  });

  it('has execute function', () => {
    expect(typeof shellTools.shell_execute.execute).toBe('function');
  });
});

describe('shellToolSystemPrompt', () => {
  it('is a non-empty string', () => {
    expect(typeof shellToolSystemPrompt).toBe('string');
    expect(shellToolSystemPrompt.length).toBeGreaterThan(0);
  });

  it('mentions shell command execution', () => {
    expect(shellToolSystemPrompt).toContain('shell');
  });
});

describe('expanded ALLOWED_COMMANDS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInTauri.mockReturnValue(true);
    mockCommandCreate.mockReturnValue({
      execute: jest.fn().mockResolvedValue({
        stdout: 'ok',
        stderr: '',
        code: 0,
      }),
    });
  });

  it.each([
    'npx', 'pnpm', 'yarn', 'bun',
    'deno', 'cargo', 'go', 'rustc',
    'docker', 'kubectl', 'terraform',
    'eslint', 'prettier', 'tsc',
    'ffmpeg', 'magick',
    'cmake', 'make',
  ])('allows newly added command: %s', async (cmd) => {
    const input: ShellExecuteInput = {
      command: cmd,
      args: ['--version'],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);
    expect(result.success).toBe(true);
  });

  it.each([
    'rm', 'format', 'shutdown', 'reboot', 'dd', 'passwd', 'mkfs', 'fdisk',
  ])('still blocks dangerous command: %s', async (cmd) => {
    const input: ShellExecuteInput = {
      command: cmd,
      args: [],
      timeout: 30000,
      encoding: 'utf-8',
    };
    const result = await executeShellCommand(input);
    expect(result.success).toBe(false);
    expect(result.error).toContain('blocked');
  });
});
