/**
 * Terminal Sync - Mirror terminal session outputs to files
 * 
 * Instead of copying/pasting terminal output or including it all in context,
 * this module syncs terminal sessions to files that the agent can grep/tail.
 * 
 * This mirrors what CLI-based coding agents see, with prior shell output
 * in context, but discovered dynamically rather than injected statically.
 */

import {
  writeContextFile,
  readContextFile,
  tailContextFile,
  grepContextFiles,
  searchContextFiles,
} from './context-fs';
import type { ContextFile } from '@/types/system/context';

/**
 * Terminal session info
 */
export interface TerminalSession {
  /** Session ID */
  id: string;
  /** Session name/title */
  name: string;
  /** Shell type (bash, powershell, etc.) */
  shellType: string;
  /** Working directory */
  cwd?: string;
  /** Start time */
  startedAt: Date;
  /** Whether session is still active */
  isActive: boolean;
}

/**
 * Terminal command entry
 */
export interface TerminalCommand {
  /** Command text */
  command: string;
  /** Exit code (if completed) */
  exitCode?: number;
  /** Stdout content */
  stdout: string;
  /** Stderr content */
  stderr: string;
  /** Execution time in ms */
  durationMs?: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Options for syncing terminal output
 */
export interface SyncTerminalOptions {
  /** Session ID */
  sessionId: string;
  /** Session name */
  sessionName?: string;
  /** Append to existing file */
  append?: boolean;
  /** Include timestamps */
  includeTimestamps?: boolean;
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Format terminal output for storage
 */
function formatTerminalOutput(
  commands: TerminalCommand[],
  options: { includeTimestamps?: boolean } = {}
): string {
  const lines: string[] = [];
  
  for (const cmd of commands) {
    // Command header
    if (options.includeTimestamps) {
      lines.push(`[${cmd.timestamp.toISOString()}] $ ${cmd.command}`);
    } else {
      lines.push(`$ ${cmd.command}`);
    }
    
    // Stdout
    if (cmd.stdout) {
      lines.push(cmd.stdout);
    }
    
    // Stderr (marked)
    if (cmd.stderr) {
      lines.push(`[stderr] ${cmd.stderr}`);
    }
    
    // Exit code and duration
    if (cmd.exitCode !== undefined) {
      const meta: string[] = [];
      if (cmd.exitCode !== 0) {
        meta.push(`exit: ${cmd.exitCode}`);
      }
      if (cmd.durationMs !== undefined) {
        meta.push(`time: ${cmd.durationMs}ms`);
      }
      if (meta.length > 0) {
        lines.push(`[${meta.join(', ')}]`);
      }
    }
    
    lines.push(''); // Blank line between commands
  }
  
  return lines.join('\n');
}

/**
 * Sync terminal commands to a context file
 */
export async function syncTerminalCommands(
  commands: TerminalCommand[],
  options: SyncTerminalOptions
): Promise<ContextFile> {
  const content = formatTerminalOutput(commands, {
    includeTimestamps: options.includeTimestamps ?? true,
  });
  
  return writeContextFile(content, {
    category: 'terminal',
    source: options.sessionId,
    filename: `${options.sessionId}.txt`,
    tags: options.tags ?? ['terminal'],
    append: options.append,
  });
}

/**
 * Append a single command to a terminal session file
 */
export async function appendTerminalCommand(
  command: TerminalCommand,
  options: SyncTerminalOptions
): Promise<ContextFile> {
  return syncTerminalCommands([command], {
    ...options,
    append: true,
  });
}

/**
 * Get terminal session file
 */
export async function getTerminalSessionFile(
  sessionId: string
): Promise<ContextFile | null> {
  const path = `.cognia/context/terminal/${sessionId}.txt`;
  return readContextFile(path);
}

/**
 * Tail terminal session (get last N lines)
 */
export async function tailTerminalSession(
  sessionId: string,
  lineCount: number = 100
): Promise<ContextFile | null> {
  const path = `.cognia/context/terminal/${sessionId}.txt`;
  return tailContextFile(path, lineCount);
}

/**
 * Search terminal sessions for a pattern
 */
export async function searchTerminalSessions(
  pattern: string,
  options: { sessionId?: string; limit?: number } = {}
): Promise<Array<{ sessionId: string; lineNumber: number; content: string }>> {
  const results = await grepContextFiles(pattern, {
    category: 'terminal',
    source: options.sessionId,
    ignoreCase: true,
    limit: options.limit ?? 50,
  });
  
  return results.map(r => ({
    sessionId: r.path.split('/').pop()?.replace('.txt', '') ?? '',
    lineNumber: r.lineNumber,
    content: r.content,
  }));
}

/**
 * List all terminal session files
 */
export async function listTerminalSessions(): Promise<Array<{
  sessionId: string;
  path: string;
  sizeBytes: number;
  estimatedTokens?: number;
  createdAt: Date;
  accessedAt: Date;
}>> {
  const files = await searchContextFiles({
    category: 'terminal',
    sortBy: 'accessedAt',
    sortOrder: 'desc',
  });
  
  return files.map(f => ({
    sessionId: f.source,
    path: `.cognia/context/terminal/${f.source}.txt`,
    sizeBytes: f.sizeBytes,
    estimatedTokens: f.estimatedTokens,
    createdAt: f.createdAt,
    accessedAt: f.accessedAt,
  }));
}

/**
 * Get summary of recent terminal activity
 */
export async function getTerminalActivitySummary(options: {
  maxSessions?: number;
  maxLinesPerSession?: number;
} = {}): Promise<string> {
  const { maxSessions = 3, maxLinesPerSession = 20 } = options;
  
  const sessions = await listTerminalSessions();
  const recentSessions = sessions.slice(0, maxSessions);
  
  if (recentSessions.length === 0) {
    return 'No terminal sessions recorded.';
  }
  
  const lines = ['## Recent Terminal Sessions', ''];
  
  for (const session of recentSessions) {
    lines.push(`### ${session.sessionId}`);
    lines.push(`Last accessed: ${session.accessedAt.toISOString()}`);
    lines.push('');
    
    const tail = await tailTerminalSession(session.sessionId, maxLinesPerSession);
    if (tail) {
      lines.push('```');
      lines.push(tail.content);
      lines.push('```');
    }
    lines.push('');
  }
  
  lines.push('Use `tail_context_file` or `grep_context` for more details.');
  
  return lines.join('\n');
}

/**
 * Generate minimal static prompt about terminal files
 */
export function generateTerminalStaticPrompt(sessions: TerminalSession[]): string {
  if (sessions.length === 0) {
    return '';
  }
  
  const lines = [
    '## Terminal Sessions Available',
    '',
    'Terminal output is saved to files for efficient access:',
    '',
  ];
  
  for (const session of sessions) {
    const status = session.isActive ? '🟢 active' : '⚪ ended';
    lines.push(`- \`${session.id}\`: ${session.name} (${session.shellType}) ${status}`);
  }
  
  lines.push('');
  lines.push('Use `tail_context_file(".cognia/context/terminal/<session_id>.txt", 50)` to see recent output.');
  lines.push('Use `grep_context("error", category: "terminal")` to find errors in terminal logs.');
  
  return lines.join('\n');
}

/**
 * Find errors in terminal sessions
 */
export async function findTerminalErrors(options: {
  sessionId?: string;
  limit?: number;
} = {}): Promise<Array<{ sessionId: string; lineNumber: number; content: string }>> {
  // Search for common error patterns
  const errorPatterns = [
    'error',
    'Error',
    'ERROR',
    'failed',
    'Failed',
    'FAILED',
    'exception',
    'Exception',
    'not found',
    'denied',
    'stderr',
    'exit: [1-9]',
  ];
  
  const pattern = errorPatterns.join('|');
  
  return searchTerminalSessions(pattern, {
    sessionId: options.sessionId,
    limit: options.limit ?? 20,
  });
}

/**
 * Create terminal session from sandbox execution result
 * Bridges the existing sandbox DB with the context file system
 */
export async function syncSandboxExecution(
  executionId: string,
  command: string,
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number,
  sessionId: string = 'sandbox'
): Promise<ContextFile> {
  const cmd: TerminalCommand = {
    command,
    stdout,
    stderr,
    exitCode,
    durationMs,
    timestamp: new Date(),
  };
  
  return appendTerminalCommand(cmd, {
    sessionId,
    sessionName: 'Sandbox',
    tags: ['sandbox', 'execution'],
  });
}
