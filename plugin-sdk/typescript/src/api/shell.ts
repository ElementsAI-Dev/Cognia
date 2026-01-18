/**
 * Shell API Types
 *
 * @description Type definitions for shell command execution in plugins.
 */

/**
 * Shell API for running shell commands
 *
 * @remarks
 * Allows plugins to execute shell commands with proper permission handling.
 *
 * @example
 * ```typescript
 * // Execute a command
 * const result = await context.shell.execute('echo "Hello"', {
 *   timeout: 5000,
 * });
 * console.log(result.stdout);
 *
 * // Spawn a process
 * const process = context.shell.spawn('node', ['server.js'], {
 *   cwd: '/path/to/project',
 * });
 *
 * // Open a file
 * await context.shell.open('/path/to/file.txt');
 *
 * // Show in folder
 * await context.shell.showInFolder('/path/to/file.txt');
 * ```
 */
export interface PluginShellAPI {
  execute: (command: string, options?: ShellOptions) => Promise<ShellResult>;
  spawn: (command: string, args?: string[], options?: SpawnOptions) => ChildProcess;
  open: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
}

/**
 * Shell options
 */
export interface ShellOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  encoding?: string;
}

/**
 * Shell result
 */
export interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * Spawn options
 */
export interface SpawnOptions extends ShellOptions {
  detached?: boolean;
  windowsHide?: boolean;
}

/**
 * Child process
 */
export interface ChildProcess {
  pid: number;
  stdin: WritableStream<string>;
  stdout: ReadableStream<string>;
  stderr: ReadableStream<string>;
  kill: (signal?: string) => void;
  onExit: (callback: (code: number) => void) => void;
}
