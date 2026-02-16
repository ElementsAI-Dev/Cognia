/**
 * Shell API Tests
 *
 * @description Tests for shell API type definitions.
 */

import type {
  PluginShellAPI,
  ShellOptions,
  ShellResult,
  SpawnOptions,
  ChildProcess,
} from './shell';

const createWritableStreamMock = (): WritableStream<string> =>
  ({ getWriter: jest.fn() } as unknown as WritableStream<string>);

const createReadableStreamMock = (): ReadableStream<string> =>
  ({ getReader: jest.fn() } as unknown as ReadableStream<string>);

describe('Shell API Types', () => {
  describe('ShellOptions', () => {
    it('should create valid shell options', () => {
      const options: ShellOptions = {
        cwd: '/home/user/project',
        env: {
          NODE_ENV: 'production',
          DEBUG: 'true',
        },
        timeout: 30000,
        encoding: 'utf-8',
      };

      expect(options.cwd).toBe('/home/user/project');
      expect(options.env?.NODE_ENV).toBe('production');
      expect(options.timeout).toBe(30000);
      expect(options.encoding).toBe('utf-8');
    });

    it('should create minimal shell options', () => {
      const options: ShellOptions = {};

      expect(options.cwd).toBeUndefined();
      expect(options.env).toBeUndefined();
      expect(options.timeout).toBeUndefined();
    });
  });

  describe('ShellResult', () => {
    it('should create a successful result', () => {
      const result: ShellResult = {
        code: 0,
        stdout: 'Command output',
        stderr: '',
        success: true,
      };

      expect(result.code).toBe(0);
      expect(result.stdout).toBe('Command output');
      expect(result.stderr).toBe('');
      expect(result.success).toBe(true);
    });

    it('should create a failed result', () => {
      const result: ShellResult = {
        code: 1,
        stdout: '',
        stderr: 'Error: Command failed',
        success: false,
      };

      expect(result.code).toBe(1);
      expect(result.stderr).toBe('Error: Command failed');
      expect(result.success).toBe(false);
    });

    it('should handle various exit codes', () => {
      const results: ShellResult[] = [
        { code: 0, stdout: '', stderr: '', success: true },
        { code: 1, stdout: '', stderr: '', success: false },
        { code: 127, stdout: '', stderr: 'command not found', success: false },
        { code: 130, stdout: '', stderr: 'Interrupted', success: false },
        { code: 255, stdout: '', stderr: 'Unknown error', success: false },
      ];

      expect(results[0].code).toBe(0);
      expect(results[2].code).toBe(127);
      expect(results[4].code).toBe(255);
    });
  });

  describe('SpawnOptions', () => {
    it('should create valid spawn options', () => {
      const options: SpawnOptions = {
        cwd: '/project',
        env: { PATH: '/usr/bin' },
        timeout: 60000,
        detached: true,
        windowsHide: true,
      };

      expect(options.detached).toBe(true);
      expect(options.windowsHide).toBe(true);
    });

    it('should extend ShellOptions', () => {
      const options: SpawnOptions = {
        cwd: '/project',
        encoding: 'utf-8',
        detached: false,
      };

      expect(options.cwd).toBe('/project');
      expect(options.encoding).toBe('utf-8');
    });
  });

  describe('ChildProcess', () => {
    it('should create a valid child process interface', () => {
      const killFn = jest.fn();
      const onExitFn = jest.fn();

      const process: ChildProcess = {
        pid: 12345,
        stdin: createWritableStreamMock(),
        stdout: createReadableStreamMock(),
        stderr: createReadableStreamMock(),
        kill: killFn,
        onExit: onExitFn,
      };

      expect(process.pid).toBe(12345);
      expect(process.stdin).toBeDefined();
      expect(process.stdout).toBeDefined();
      expect(process.stderr).toBeDefined();
      expect(process.kill).toBeDefined();
      expect(process.onExit).toBeDefined();
    });

    it('should call kill with signal', () => {
      const killFn = jest.fn();

      const process: ChildProcess = {
        pid: 1000,
        stdin: createWritableStreamMock(),
        stdout: createReadableStreamMock(),
        stderr: createReadableStreamMock(),
        kill: killFn,
        onExit: jest.fn(),
      };

      process.kill();
      expect(killFn).toHaveBeenCalled();

      process.kill('SIGTERM');
      expect(killFn).toHaveBeenCalledWith('SIGTERM');

      process.kill('SIGKILL');
      expect(killFn).toHaveBeenCalledWith('SIGKILL');
    });

    it('should register exit callback', () => {
      const onExitFn = jest.fn();
      const exitCallback = jest.fn();

      const process: ChildProcess = {
        pid: 1000,
        stdin: createWritableStreamMock(),
        stdout: createReadableStreamMock(),
        stderr: createReadableStreamMock(),
        kill: jest.fn(),
        onExit: onExitFn,
      };

      process.onExit(exitCallback);
      expect(onExitFn).toHaveBeenCalledWith(exitCallback);
    });
  });

  describe('PluginShellAPI', () => {
    it('should define all required API methods', () => {
      const mockAPI: PluginShellAPI = {
        execute: jest.fn(),
        spawn: jest.fn(),
        open: jest.fn(),
        showInFolder: jest.fn(),
      };

      expect(mockAPI.execute).toBeDefined();
      expect(mockAPI.spawn).toBeDefined();
      expect(mockAPI.open).toBeDefined();
      expect(mockAPI.showInFolder).toBeDefined();
    });

    it('should call execute correctly', async () => {
      const mockAPI: PluginShellAPI = {
        execute: jest.fn().mockResolvedValue({
          code: 0,
          stdout: 'Hello World',
          stderr: '',
          success: true,
        }),
        spawn: jest.fn(),
        open: jest.fn(),
        showInFolder: jest.fn(),
      };

      const result = await mockAPI.execute('echo "Hello World"', {
        timeout: 5000,
      });

      expect(mockAPI.execute).toHaveBeenCalledWith('echo "Hello World"', { timeout: 5000 });
      expect(result.stdout).toBe('Hello World');
      expect(result.success).toBe(true);
    });

    it('should call spawn correctly', () => {
      const mockProcess: ChildProcess = {
        pid: 12345,
        stdin: createWritableStreamMock(),
        stdout: createReadableStreamMock(),
        stderr: createReadableStreamMock(),
        kill: jest.fn(),
        onExit: jest.fn(),
      };

      const mockAPI: PluginShellAPI = {
        execute: jest.fn(),
        spawn: jest.fn().mockReturnValue(mockProcess),
        open: jest.fn(),
        showInFolder: jest.fn(),
      };

      const process = mockAPI.spawn('node', ['server.js'], {
        cwd: '/project',
        detached: true,
      });

      expect(mockAPI.spawn).toHaveBeenCalledWith('node', ['server.js'], {
        cwd: '/project',
        detached: true,
      });
      expect(process.pid).toBe(12345);
    });

    it('should call open correctly', async () => {
      const mockAPI: PluginShellAPI = {
        execute: jest.fn(),
        spawn: jest.fn(),
        open: jest.fn().mockResolvedValue(undefined),
        showInFolder: jest.fn(),
      };

      await mockAPI.open('/path/to/file.txt');
      expect(mockAPI.open).toHaveBeenCalledWith('/path/to/file.txt');

      await mockAPI.open('https://example.com');
      expect(mockAPI.open).toHaveBeenCalledWith('https://example.com');
    });

    it('should call showInFolder correctly', async () => {
      const mockAPI: PluginShellAPI = {
        execute: jest.fn(),
        spawn: jest.fn(),
        open: jest.fn(),
        showInFolder: jest.fn().mockResolvedValue(undefined),
      };

      await mockAPI.showInFolder('/path/to/file.txt');
      expect(mockAPI.showInFolder).toHaveBeenCalledWith('/path/to/file.txt');
    });
  });
});
