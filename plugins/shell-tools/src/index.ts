/**
 * Shell Tools Plugin
 *
 * Secure shell command execution and process management for AI agents.
 * Includes command validation, output limiting, and security controls.
 */

import { definePlugin, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

// ============================================================================
// Types
// ============================================================================

interface ShellToolsConfig {
  defaultShell: string;
  timeout: number;
  maxOutputSize: number;
  blockedCommands: string[];
  allowedDirectories: string[];
  hiddenEnvVars: string[];
}

interface ShellExecArgs {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
}

interface ShellScriptArgs {
  path: string;
  args?: string[];
  cwd?: string;
  interpreter?: string;
}

interface EnvGetArgs {
  name: string;
}

interface WhichArgs {
  command: string;
}

interface ShellResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  truncated?: boolean;
}

// ============================================================================
// Security Utilities
// ============================================================================

const DANGEROUS_PATTERNS = [
  /rm\s+(-rf?|--recursive)\s+\//i,
  /rm\s+(-rf?|--recursive)\s+\*/i,
  /:(){ :|:& };:/,  // Fork bomb
  />\s*\/dev\/sd[a-z]/i,
  /dd\s+if=.*of=\/dev\//i,
  /mkfs/i,
  /format\s+[a-z]:/i,
  /del\s+\/[sfq]\s+\*/i,
  /shutdown/i,
  /reboot/i,
  /halt/i,
  /init\s+0/i,
  /chmod\s+(-R\s+)?777\s+\//i,
  /chown\s+(-R\s+)?.*\s+\//i,
];

function isCommandBlocked(command: string, blockedCommands: string[]): boolean {
  const normalizedCommand = command.toLowerCase().trim();

  // Check against blocked command list
  for (const blocked of blockedCommands) {
    if (normalizedCommand.includes(blocked.toLowerCase())) {
      return true;
    }
  }

  // Check against dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return true;
    }
  }

  return false;
}

function isDirectoryAllowed(cwd: string, allowedDirectories: string[]): boolean {
  if (allowedDirectories.length === 0) {
    return true; // No restrictions
  }

  const normalizedCwd = cwd.replace(/\\/g, '/').toLowerCase();
  return allowedDirectories.some((dir) => {
    const normalizedDir = dir.replace(/\\/g, '/').toLowerCase();
    return normalizedCwd.startsWith(normalizedDir);
  });
}

function truncateOutput(output: string, maxSize: number): { text: string; truncated: boolean } {
  if (output.length <= maxSize) {
    return { text: output, truncated: false };
  }

  const halfSize = Math.floor(maxSize / 2) - 50;
  const truncatedText =
    output.substring(0, halfSize) +
    '\n\n... [OUTPUT TRUNCATED - ' +
    (output.length - maxSize) +
    ' bytes omitted] ...\n\n' +
    output.substring(output.length - halfSize);

  return { text: truncatedText, truncated: true };
}

function maskSensitiveEnvVars(
  env: Record<string, string>,
  hiddenPatterns: string[]
): Record<string, string> {
  const masked: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    const shouldMask = hiddenPatterns.some(
      (pattern) =>
        key.toUpperCase().includes(pattern.toUpperCase()) ||
        key.toUpperCase().endsWith('_KEY') ||
        key.toUpperCase().endsWith('_SECRET') ||
        key.toUpperCase().endsWith('_TOKEN')
    );

    masked[key] = shouldMask ? '***HIDDEN***' : value;
  }

  return masked;
}

// ============================================================================
// Shell Detection
// ============================================================================

function detectShell(): string {
  if (typeof process !== 'undefined') {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/sh';
  }
  return '/bin/sh';
}

function _getShellArgs(shell: string): string[] {
  const shellName = shell.toLowerCase();
  if (shellName.includes('powershell') || shellName.includes('pwsh')) {
    return ['-NoProfile', '-Command'];
  }
  if (shellName.includes('cmd')) {
    return ['/c'];
  }
  return ['-c'];
}

// ============================================================================
// Tool Implementations
// ============================================================================

function createShellExecTool(config: ShellToolsConfig, context: PluginContext) {
  return {
    name: 'shell_exec',
    description:
      'Execute a shell command. Returns stdout, stderr, and exit code. Commands are validated for safety.',
    parametersSchema: parameters(
      {
        command: Schema.string('The shell command to execute'),
        cwd: Schema.string('Working directory for the command'),
        env: Schema.object('Additional environment variables'),
        timeout: Schema.number('Command timeout in milliseconds'),
      },
      ['command']
    ),
    execute: async (args: ShellExecArgs, _toolContext: PluginToolContext): Promise<ShellResult> => {
      const startTime = Date.now();

      // Security validation
      if (isCommandBlocked(args.command, config.blockedCommands)) {
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: 'Command blocked for security reasons',
          duration: 0,
        };
      }

      if (args.cwd && !isDirectoryAllowed(args.cwd, config.allowedDirectories)) {
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: 'Working directory not in allowed list',
          duration: 0,
        };
      }

      const _shell = config.defaultShell || detectShell();
      const timeout = args.timeout || config.timeout;

      context.logger.info(`Executing: ${args.command.substring(0, 100)}...`);

      try {
        // Use context.shell API if available
        const result = await context.shell.execute(args.command, {
          cwd: args.cwd,
          env: args.env,
          timeout,
        });

        const duration = Date.now() - startTime;
        const { text: stdout, truncated: stdoutTruncated } = truncateOutput(
          result.stdout,
          config.maxOutputSize
        );
        const { text: stderr, truncated: stderrTruncated } = truncateOutput(
          result.stderr,
          config.maxOutputSize
        );

        return {
          success: result.success,
          exitCode: result.code,
          stdout,
          stderr,
          duration,
          truncated: stdoutTruncated || stderrTruncated,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          duration,
        };
      }
    },
  };
}

function createShellScriptTool(config: ShellToolsConfig, context: PluginContext) {
  return {
    name: 'shell_script',
    description: 'Execute a script file with the appropriate interpreter',
    parametersSchema: parameters(
      {
        path: Schema.string('Path to the script file'),
        args: Schema.array(Schema.string('Script arguments')),
        cwd: Schema.string('Working directory'),
        interpreter: Schema.string('Interpreter to use (auto-detected from extension if empty)'),
      },
      ['path']
    ),
    execute: async (args: ShellScriptArgs, _toolContext: PluginToolContext) => {
      const startTime = Date.now();

      // Detect interpreter from file extension if not provided
      let interpreter = args.interpreter;
      if (!interpreter) {
        const ext = args.path.split('.').pop()?.toLowerCase();
        switch (ext) {
          case 'sh':
          case 'bash':
            interpreter = 'bash';
            break;
          case 'ps1':
            interpreter = 'powershell';
            break;
          case 'py':
            interpreter = 'python';
            break;
          case 'js':
            interpreter = 'node';
            break;
          case 'rb':
            interpreter = 'ruby';
            break;
          case 'pl':
            interpreter = 'perl';
            break;
          default:
            interpreter = detectShell();
        }
      }

      const command = `${interpreter} "${args.path}" ${(args.args || []).join(' ')}`;

      // Security check
      if (isCommandBlocked(command, config.blockedCommands)) {
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: 'Script execution blocked for security reasons',
          duration: 0,
        };
      }

      try {
        const result = await context.shell.execute(command, {
          cwd: args.cwd,
          timeout: config.timeout,
        });

        const duration = Date.now() - startTime;
        const { text: stdout, truncated } = truncateOutput(result.stdout, config.maxOutputSize);

        return {
          success: result.success,
          exitCode: result.code,
          stdout,
          stderr: result.stderr,
          duration,
          interpreter,
          truncated,
        };
      } catch (error) {
        return {
          success: false,
          exitCode: -1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        };
      }
    },
  };
}

function createEnvGetTool(config: ShellToolsConfig) {
  return {
    name: 'env_get',
    description: 'Get the value of an environment variable',
    parametersSchema: parameters(
      {
        name: Schema.string('Name of the environment variable'),
      },
      ['name']
    ),
    execute: async (args: EnvGetArgs, _toolContext: PluginToolContext) => {
      const name = args.name.toUpperCase();

      // Check if this is a sensitive variable
      const isSensitive = config.hiddenEnvVars.some(
        (pattern) =>
          name.includes(pattern.toUpperCase()) ||
          name.endsWith('_KEY') ||
          name.endsWith('_SECRET') ||
          name.endsWith('_TOKEN') ||
          name.endsWith('_PASSWORD')
      );

      if (isSensitive) {
        return {
          success: true,
          name: args.name,
          value: null,
          exists: typeof process !== 'undefined' && args.name in (process.env || {}),
          hidden: true,
          message: 'This environment variable is hidden for security reasons',
        };
      }

      const value = typeof process !== 'undefined' ? process.env[args.name] : undefined;

      return {
        success: true,
        name: args.name,
        value: value ?? null,
        exists: value !== undefined,
        hidden: false,
      };
    },
  };
}

function createEnvListTool(config: ShellToolsConfig) {
  return {
    name: 'env_list',
    description: 'List environment variables (sensitive values are masked)',
    parametersSchema: parameters(
      {
        filter: Schema.string('Filter pattern for variable names'),
        showHidden: Schema.boolean('Show names of hidden variables (values still masked)'),
      },
      []
    ),
    execute: async (
      args: { filter?: string; showHidden?: boolean },
      _toolContext: PluginToolContext
    ) => {
      if (typeof process === 'undefined' || !process.env) {
        return {
          success: false,
          error: 'Environment variables not available in this context',
        };
      }

      let env = { ...process.env } as Record<string, string>;

      // Apply filter
      if (args.filter) {
        const pattern = args.filter.toLowerCase();
        env = Object.fromEntries(
          Object.entries(env).filter(([key]) => key.toLowerCase().includes(pattern))
        );
      }

      // Mask sensitive variables
      const masked = maskSensitiveEnvVars(env, config.hiddenEnvVars);

      // Count hidden variables
      const hiddenCount = Object.values(masked).filter((v) => v === '***HIDDEN***').length;

      return {
        success: true,
        count: Object.keys(masked).length,
        hiddenCount,
        variables: masked,
      };
    },
  };
}

function createWhichTool(context: PluginContext) {
  return {
    name: 'which',
    description: 'Find the full path of an executable command',
    parametersSchema: parameters(
      {
        command: Schema.string('The command to locate'),
      },
      ['command']
    ),
    execute: async (args: WhichArgs, _toolContext: PluginToolContext) => {
      const isWindows = typeof process !== 'undefined' && process.platform === 'win32';
      const cmd = isWindows ? `where ${args.command}` : `which ${args.command}`;

      try {
        const result = await context.shell.execute(cmd, { timeout: 5000 });

        if (result.success && result.stdout.trim()) {
          const paths = result.stdout.trim().split('\n').filter(Boolean);
          return {
            success: true,
            command: args.command,
            found: true,
            path: paths[0],
            allPaths: paths,
          };
        }

        return {
          success: true,
          command: args.command,
          found: false,
          path: null,
          message: `Command '${args.command}' not found in PATH`,
        };
      } catch (error) {
        return {
          success: false,
          command: args.command,
          found: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Shell Tools plugin activated');

    const config: ShellToolsConfig = {
      defaultShell: (context.config.defaultShell as string) || '',
      timeout: (context.config.timeout as number) || 30000,
      maxOutputSize: (context.config.maxOutputSize as number) || 1048576,
      blockedCommands: (context.config.blockedCommands as string[]) || [],
      allowedDirectories: (context.config.allowedDirectories as string[]) || [],
      hiddenEnvVars: (context.config.hiddenEnvVars as string[]) || [],
    };

    // Register tools
    const tools = [
      createShellExecTool(config, context),
      createShellScriptTool(config, context),
      createEnvGetTool(config),
      createEnvListTool(config),
      createWhichTool(context),
    ];

    for (const tool of tools) {
      context.agent.registerTool({
        name: tool.name,
        pluginId: context.pluginId,
        definition: {
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
          requiresApproval: tool.name === 'shell_exec' || tool.name === 'shell_script',
        },
        execute: tool.execute,
      });
    }

    context.logger.info(`Registered ${tools.length} shell tools with security controls`);

    return {
      onEnable: async () => {
        context.logger.info('Shell Tools enabled - security controls active');
      },
      onDisable: async () => {
        context.logger.info('Shell Tools disabled');
      },
      onConfigChange: (newConfig: Record<string, unknown>) => {
        Object.assign(config, {
          defaultShell: (newConfig.defaultShell as string) || '',
          timeout: (newConfig.timeout as number) || 30000,
          maxOutputSize: (newConfig.maxOutputSize as number) || 1048576,
          blockedCommands: (newConfig.blockedCommands as string[]) || [],
          allowedDirectories: (newConfig.allowedDirectories as string[]) || [],
          hiddenEnvVars: (newConfig.hiddenEnvVars as string[]) || [],
        });
        context.logger.info('Shell Tools config updated');
      },
    };
  },
});
