/**
 * Tests for terminal-sync.ts
 * Terminal session synchronization to context files
 */

import {
  syncTerminalCommands,
  appendTerminalCommand,
  getTerminalSessionFile,
  tailTerminalSession,
  searchTerminalSessions,
  listTerminalSessions,
  getTerminalActivitySummary,
  generateTerminalStaticPrompt,
  findTerminalErrors,
  syncSandboxExecution,
  type TerminalSession,
  type TerminalCommand,
  type SyncTerminalOptions,
} from './terminal-sync';
import * as contextFs from './context-fs';
import type { ContextFile } from '@/types/system/context';

// Mock context-fs module
jest.mock('./context-fs');

const mockedContextFs = contextFs as jest.Mocked<typeof contextFs>;

// Mock terminal command
const createMockCommand = (
  command: string,
  stdout: string = '',
  stderr: string = '',
  exitCode?: number,
  durationMs?: number
): TerminalCommand => ({
  command,
  stdout,
  stderr,
  exitCode,
  durationMs,
  timestamp: new Date(),
});

// Mock context file
const createMockContextFile = (content: string, path: string = ''): ContextFile => ({
  path,
  content,
  metadata: {
    id: 'test-id',
    category: 'terminal',
    source: 'test-session',
    sizeBytes: content.length,
    estimatedTokens: Math.ceil(content.length / 4),
    createdAt: new Date(),
    accessedAt: new Date(),
  },
});

// Mock terminal session
const createMockSession = (
  id: string,
  name: string = 'Test Session',
  shellType: string = 'bash',
  isActive: boolean = true
): TerminalSession => ({
  id,
  name,
  shellType,
  isActive,
  startedAt: new Date(),
});

describe('terminal-sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncTerminalCommands', () => {
    it('should sync commands to a context file', async () => {
      const mockFile = createMockContextFile('', '.cognia/context/terminal/session.txt');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const commands = [
        createMockCommand('ls -la', 'file1\nfile2'),
        createMockCommand('pwd', '/home/user'),
      ];

      const options: SyncTerminalOptions = {
        sessionId: 'test-session',
        sessionName: 'Test',
      };

      const result = await syncTerminalCommands(commands, options);

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          category: 'terminal',
          source: 'test-session',
          filename: 'test-session.txt',
        })
      );
      expect(result).toBe(mockFile);
    });

    it('should format commands with timestamps by default', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const commands = [createMockCommand('echo hello', 'hello')];

      await syncTerminalCommands(commands, { sessionId: 'session' });

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T/); // ISO timestamp
      expect(content).toContain('$ echo hello');
      expect(content).toContain('hello');
    });

    it('should format commands without timestamps when disabled', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const commands = [createMockCommand('echo hello', 'hello')];

      await syncTerminalCommands(commands, {
        sessionId: 'session',
        includeTimestamps: false,
      });

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).not.toMatch(/\[\d{4}-\d{2}-\d{2}T/);
      expect(content).toContain('$ echo hello');
    });

    it('should include stderr with marker', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const commands = [createMockCommand('bad-command', '', 'command not found')];

      await syncTerminalCommands(commands, { sessionId: 'session' });

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).toContain('[stderr] command not found');
    });

    it('should include exit code for non-zero exits', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const commands = [createMockCommand('exit 1', '', '', 1)];

      await syncTerminalCommands(commands, { sessionId: 'session' });

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).toContain('exit: 1');
    });

    it('should include duration when available', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const commands = [createMockCommand('slow-cmd', 'done', '', 0, 5000)];

      await syncTerminalCommands(commands, { sessionId: 'session' });

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).toContain('time: 5000ms');
    });

    it('should support append mode', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncTerminalCommands([createMockCommand('cmd')], {
        sessionId: 'session',
        append: true,
      });

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ append: true })
      );
    });

    it('should support custom tags', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncTerminalCommands([createMockCommand('cmd')], {
        sessionId: 'session',
        tags: ['build', 'ci'],
      });

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ tags: ['build', 'ci'] })
      );
    });
  });

  describe('appendTerminalCommand', () => {
    it('should append a single command', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      const command = createMockCommand('new-cmd', 'output');

      await appendTerminalCommand(command, { sessionId: 'session' });

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ append: true })
      );
    });
  });

  describe('getTerminalSessionFile', () => {
    it('should read terminal session file', async () => {
      const mockFile = createMockContextFile('$ ls\nfile1\nfile2');
      mockedContextFs.readContextFile.mockResolvedValue(mockFile);

      const result = await getTerminalSessionFile('my-session');

      expect(mockedContextFs.readContextFile).toHaveBeenCalledWith(
        '.cognia/context/terminal/my-session.txt'
      );
      expect(result).toBe(mockFile);
    });

    it('should return null for non-existent session', async () => {
      mockedContextFs.readContextFile.mockResolvedValue(null);

      const result = await getTerminalSessionFile('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('tailTerminalSession', () => {
    it('should tail terminal session file', async () => {
      const mockFile = createMockContextFile('last 100 lines...');
      mockedContextFs.tailContextFile.mockResolvedValue(mockFile);

      const result = await tailTerminalSession('session', 100);

      expect(mockedContextFs.tailContextFile).toHaveBeenCalledWith(
        '.cognia/context/terminal/session.txt',
        100
      );
      expect(result).toBe(mockFile);
    });

    it('should use default line count of 100', async () => {
      mockedContextFs.tailContextFile.mockResolvedValue(null);

      await tailTerminalSession('session');

      expect(mockedContextFs.tailContextFile).toHaveBeenCalledWith(
        expect.any(String),
        100
      );
    });
  });

  describe('searchTerminalSessions', () => {
    it('should search terminal sessions for pattern', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: '.cognia/context/terminal/session1.txt', lineNumber: 5, content: 'error: failed' },
        { path: '.cognia/context/terminal/session2.txt', lineNumber: 10, content: 'error: timeout' },
      ]);

      const result = await searchTerminalSessions('error');

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ category: 'terminal', ignoreCase: true })
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sessionId: 'session1',
        lineNumber: 5,
        content: 'error: failed',
      });
    });

    it('should filter by session ID', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await searchTerminalSessions('pattern', { sessionId: 'specific' });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'pattern',
        expect.objectContaining({ source: 'specific' })
      );
    });

    it('should respect limit option', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await searchTerminalSessions('pattern', { limit: 10 });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        'pattern',
        expect.objectContaining({ limit: 10 })
      );
    });
  });

  describe('listTerminalSessions', () => {
    it('should list all terminal sessions', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        {
          id: 'session1',
          category: 'terminal',
          source: 'session1',
          sizeBytes: 1000,
          estimatedTokens: 250,
          createdAt: new Date('2024-01-01'),
          accessedAt: new Date('2024-01-02'),
        },
        {
          id: 'session2',
          category: 'terminal',
          source: 'session2',
          sizeBytes: 2000,
          estimatedTokens: 500,
          createdAt: new Date('2024-01-03'),
          accessedAt: new Date('2024-01-04'),
        },
      ]);

      const result = await listTerminalSessions();

      expect(mockedContextFs.searchContextFiles).toHaveBeenCalledWith({
        category: 'terminal',
        sortBy: 'accessedAt',
        sortOrder: 'desc',
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sessionId: 'session1',
        path: '.cognia/context/terminal/session1.txt',
        sizeBytes: 1000,
      });
    });

    it('should return empty array when no sessions', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);

      const result = await listTerminalSessions();

      expect(result).toHaveLength(0);
    });
  });

  describe('getTerminalActivitySummary', () => {
    it('should generate activity summary', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        {
          id: 'session1',
          category: 'terminal',
          source: 'session1',
          sizeBytes: 100,
          estimatedTokens: 25,
          createdAt: new Date(),
          accessedAt: new Date(),
        },
      ]);
      mockedContextFs.tailContextFile.mockResolvedValue(
        createMockContextFile('$ ls\nfile1\nfile2')
      );

      const result = await getTerminalActivitySummary();

      expect(result).toContain('## Recent Terminal Sessions');
      expect(result).toContain('### session1');
      expect(result).toContain('$ ls');
    });

    it('should return message for no sessions', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([]);

      const result = await getTerminalActivitySummary();

      expect(result).toBe('No terminal sessions recorded.');
    });

    it('should respect maxSessions option', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 's1', category: 'terminal', source: 's1', sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 's2', category: 'terminal', source: 's2', sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
        { id: 's3', category: 'terminal', source: 's3', sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);
      mockedContextFs.tailContextFile.mockResolvedValue(createMockContextFile('content'));

      await getTerminalActivitySummary({ maxSessions: 2 });

      // Should only tail 2 sessions
      expect(mockedContextFs.tailContextFile).toHaveBeenCalledTimes(2);
    });

    it('should respect maxLinesPerSession option', async () => {
      mockedContextFs.searchContextFiles.mockResolvedValue([
        { id: 's1', category: 'terminal', source: 's1', sizeBytes: 100, estimatedTokens: 25, createdAt: new Date(), accessedAt: new Date() },
      ]);
      mockedContextFs.tailContextFile.mockResolvedValue(createMockContextFile('content'));

      await getTerminalActivitySummary({ maxLinesPerSession: 50 });

      expect(mockedContextFs.tailContextFile).toHaveBeenCalledWith(
        expect.any(String),
        50
      );
    });
  });

  describe('generateTerminalStaticPrompt', () => {
    it('should return empty string for no sessions', () => {
      const result = generateTerminalStaticPrompt([]);
      expect(result).toBe('');
    });

    it('should generate prompt with session listings', () => {
      const sessions: TerminalSession[] = [
        createMockSession('session1', 'Build', 'bash', true),
        createMockSession('session2', 'Test', 'powershell', false),
      ];

      const result = generateTerminalStaticPrompt(sessions);

      expect(result).toContain('## Terminal Sessions Available');
      expect(result).toContain('`session1`');
      expect(result).toContain('Build');
      expect(result).toContain('bash');
      expect(result).toContain('🟢 active');
      expect(result).toContain('`session2`');
      expect(result).toContain('⚪ ended');
      expect(result).toContain('tail_context_file');
      expect(result).toContain('grep_context');
    });
  });

  describe('findTerminalErrors', () => {
    it('should search for error patterns', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([
        { path: '.cognia/context/terminal/s1.txt', lineNumber: 1, content: 'Error: failed' },
        { path: '.cognia/context/terminal/s2.txt', lineNumber: 2, content: 'FAILED: test' },
      ]);

      const result = await findTerminalErrors();

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        expect.stringContaining('error'),
        expect.any(Object)
      );
      expect(result).toHaveLength(2);
    });

    it('should filter by session ID', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await findTerminalErrors({ sessionId: 'specific' });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ source: 'specific' })
      );
    });

    it('should respect limit option', async () => {
      mockedContextFs.grepContextFiles.mockResolvedValue([]);

      await findTerminalErrors({ limit: 5 });

      expect(mockedContextFs.grepContextFiles).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 5 })
      );
    });
  });

  describe('syncSandboxExecution', () => {
    it('should sync sandbox execution result', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncSandboxExecution(
        'exec-123',
        'python script.py',
        'Output: 42',
        '',
        0,
        1500,
        'sandbox'
      );

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.stringContaining('python script.py'),
        expect.objectContaining({
          source: 'sandbox',
          tags: expect.arrayContaining(['sandbox', 'execution']),
          append: true,
        })
      );
    });

    it('should use default sandbox session ID', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncSandboxExecution('exec-1', 'cmd', 'out', '', 0, 100);

      expect(mockedContextFs.writeContextFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ source: 'sandbox' })
      );
    });

    it('should include stderr in output', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncSandboxExecution('exec-1', 'cmd', '', 'error output', 1, 100);

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).toContain('[stderr] error output');
    });

    it('should include exit code and duration', async () => {
      const mockFile = createMockContextFile('');
      mockedContextFs.writeContextFile.mockResolvedValue(mockFile);

      await syncSandboxExecution('exec-1', 'cmd', '', '', 2, 5000);

      const writeCall = mockedContextFs.writeContextFile.mock.calls[0];
      const content = writeCall[0];

      expect(content).toContain('exit: 2');
      expect(content).toContain('time: 5000ms');
    });
  });
});
