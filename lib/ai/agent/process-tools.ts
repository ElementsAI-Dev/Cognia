/**
 * Agent Process Tools - Tools for local process management in agent workflows
 *
 * Provides agent-accessible tools for:
 * - Listing running processes
 * - Getting process details
 * - Starting new processes (with restrictions)
 * - Terminating processes
 *
 * Security: All operations require explicit user approval and have allowlist restrictions.
 * Only available in Tauri desktop environment.
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import {
  processService,
  isProcessManagementAvailable,
  type ProcessInfo,
} from '@/lib/native/process';

// ==================== Tool Input Schemas ====================

const listProcessesInputSchema = z.object({
  name: z.string().optional().describe('Filter by process name (partial match, case-insensitive)'),
  limit: z.number().optional().default(50).describe('Maximum number of results (default: 50)'),
  sortBy: z.enum(['pid', 'name', 'cpu', 'memory', 'startTime']).optional().describe('Sort by field'),
  sortDesc: z.boolean().optional().default(true).describe('Sort descending'),
});

const getProcessInputSchema = z.object({
  pid: z.number().describe('Process ID to get details for'),
});

const searchProcessesInputSchema = z.object({
  name: z.string().describe('Process name to search for (partial match)'),
  limit: z.number().optional().default(20).describe('Maximum number of results'),
});

const topMemoryProcessesInputSchema = z.object({
  limit: z.number().optional().default(10).describe('Number of top processes to return'),
});

const startProcessInputSchema = z.object({
  program: z.string().describe('Program path or name to execute'),
  args: z.array(z.string()).optional().default([]).describe('Command line arguments'),
  cwd: z.string().optional().describe('Working directory for the process'),
  env: z.record(z.string()).optional().describe('Environment variables to set'),
  detached: z.boolean().optional().default(true).describe('Run in background (detached)'),
  captureOutput: z.boolean().optional().default(false).describe('Capture stdout/stderr (for non-detached only)'),
  timeoutSecs: z.number().optional().default(30).describe('Timeout in seconds'),
});

const terminateProcessInputSchema = z.object({
  pid: z.number().describe('Process ID to terminate'),
  force: z.boolean().optional().default(false).describe('Force kill (SIGKILL on Unix, TerminateProcess on Windows)'),
  timeoutSecs: z.number().optional().default(10).describe('Timeout for graceful termination'),
});

const checkProgramInputSchema = z.object({
  program: z.string().describe('Program name to check if allowed'),
});

// ==================== Result Types ====================

interface ProcessToolResult {
  success: boolean;
  action: string;
  message: string;
  data?: unknown;
  error?: string;
}

// ==================== Tool Implementations ====================

/**
 * List running processes tool
 */
export function createListProcessesTool(): AgentTool {
  return {
    name: 'list_processes',
    description: `List running processes on the system. Returns process information including PID, name, memory usage, and status.
Use this to discover what processes are running or find a specific process.
Available only in desktop environment.`,
    parameters: listProcessesInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'list_processes',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof listProcessesInputSchema>;
        const isEnabled = await processService.isEnabled();
        
        if (!isEnabled) {
          return {
            success: false,
            action: 'list_processes',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }
        
        const processes = await processService.list({
          name: input.name,
          limit: input.limit,
          sortBy: input.sortBy,
          sortDesc: input.sortDesc,
        });

        return {
          success: true,
          action: 'list_processes',
          message: `Found ${processes.length} processes`,
          data: {
            count: processes.length,
            processes: processes.map(formatProcessInfo),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'list_processes',
          message: 'Failed to list processes',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false, // Listing is read-only
  };
}

/**
 * Get process details tool
 */
export function createGetProcessTool(): AgentTool {
  return {
    name: 'get_process',
    description: `Get detailed information about a specific process by its PID.
Returns process name, memory usage, status, command line, and other details.
Available only in desktop environment.`,
    parameters: getProcessInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'get_process',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof getProcessInputSchema>;
        const isEnabled = await processService.isEnabled();
        
        if (!isEnabled) {
          return {
            success: false,
            action: 'get_process',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }
        
        const process = await processService.get(input.pid);

        if (!process) {
          return {
            success: false,
            action: 'get_process',
            message: `Process with PID ${input.pid} not found`,
            error: 'Process not found',
          };
        }

        return {
          success: true,
          action: 'get_process',
          message: `Found process: ${process.name} (PID: ${process.pid})`,
          data: formatProcessInfo(process),
        };
      } catch (error) {
        return {
          success: false,
          action: 'get_process',
          message: 'Failed to get process details',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false, // Getting info is read-only
  };
}

/**
 * Search processes tool
 */
export function createSearchProcessesTool(): AgentTool {
  return {
    name: 'search_processes',
    description: `Search for processes by name (partial match, case-insensitive).
Use this to find specific processes like "chrome", "python", "node", etc.
Available only in desktop environment.`,
    parameters: searchProcessesInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'search_processes',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof searchProcessesInputSchema>;
        const isEnabled = await processService.isEnabled();
        
        if (!isEnabled) {
          return {
            success: false,
            action: 'search_processes',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }
        
        const processes = await processService.search(input.name, input.limit);

        return {
          success: true,
          action: 'search_processes',
          message: `Found ${processes.length} processes matching "${input.name}"`,
          data: {
            query: input.name,
            count: processes.length,
            processes: processes.map(formatProcessInfo),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'search_processes',
          message: 'Failed to search processes',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false, // Searching is read-only
  };
}

/**
 * Get top memory processes tool
 */
export function createTopMemoryProcessesTool(): AgentTool {
  return {
    name: 'top_memory_processes',
    description: `Get processes sorted by memory usage (highest first).
Use this to identify which processes are using the most memory.
Available only in desktop environment.`,
    parameters: topMemoryProcessesInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'top_memory_processes',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof topMemoryProcessesInputSchema>;
        const isEnabled = await processService.isEnabled();
        
        if (!isEnabled) {
          return {
            success: false,
            action: 'top_memory_processes',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }
        
        const processes = await processService.topMemory(input.limit);

        return {
          success: true,
          action: 'top_memory_processes',
          message: `Top ${processes.length} processes by memory usage`,
          data: {
            count: processes.length,
            processes: processes.map(formatProcessInfo),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'top_memory_processes',
          message: 'Failed to get top memory processes',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false, // Read-only operation
  };
}

/**
 * Start a new process tool
 */
export function createStartProcessTool(): AgentTool {
  return {
    name: 'start_process',
    description: `Start a new process/program on the system.
SECURITY: Only allowed programs can be started. Dangerous commands are blocked.
Use this to launch applications or run commands.
Available only in desktop environment. Requires user approval.`,
    parameters: startProcessInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'start_process',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof startProcessInputSchema>;
        const isEnabled = await processService.isEnabled();
        
        if (!isEnabled) {
          return {
            success: false,
            action: 'start_process',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }

        // Check if program is allowed
        const isAllowed = await processService.isProgramAllowed(input.program);
        if (!isAllowed) {
          return {
            success: false,
            action: 'start_process',
            message: `Program "${input.program}" is not allowed. Add it to the allowlist in settings.`,
            error: 'Program not allowed',
          };
        }
        
        const result = await processService.start({
          program: input.program,
          args: input.args,
          cwd: input.cwd,
          env: input.env,
          detached: input.detached,
          captureOutput: input.captureOutput,
          timeoutSecs: input.timeoutSecs,
        });

        if (result.success) {
          return {
            success: true,
            action: 'start_process',
            message: result.pid
              ? `Started process "${input.program}" with PID ${result.pid}`
              : `Executed "${input.program}" successfully`,
            data: {
              pid: result.pid,
              stdout: result.stdout,
              stderr: result.stderr,
              exitCode: result.exitCode,
              durationMs: result.durationMs,
            },
          };
        } else {
          return {
            success: false,
            action: 'start_process',
            message: `Failed to start "${input.program}"`,
            error: result.error || 'Unknown error',
          };
        }
      } catch (error) {
        return {
          success: false,
          action: 'start_process',
          message: 'Failed to start process',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true, // Starting processes requires approval
  };
}

/**
 * Terminate a process tool
 */
export function createTerminateProcessTool(): AgentTool {
  return {
    name: 'terminate_process',
    description: `Terminate a running process by its PID.
SECURITY: By default, only processes started by this app can be terminated.
Use force=true for immediate termination (SIGKILL/TerminateProcess).
Available only in desktop environment. Requires user approval.`,
    parameters: terminateProcessInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'terminate_process',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof terminateProcessInputSchema>;
        const isEnabled = await processService.isEnabled();
        
        if (!isEnabled) {
          return {
            success: false,
            action: 'terminate_process',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }
        
        const result = await processService.terminate({
          pid: input.pid,
          force: input.force,
          timeoutSecs: input.timeoutSecs,
        });

        if (result.success) {
          return {
            success: true,
            action: 'terminate_process',
            message: `Successfully terminated process ${input.pid}`,
            data: {
              pid: input.pid,
              exitCode: result.exitCode,
            },
          };
        } else {
          return {
            success: false,
            action: 'terminate_process',
            message: `Failed to terminate process ${input.pid}`,
            error: result.error || 'Unknown error',
          };
        }
      } catch (error) {
        return {
          success: false,
          action: 'terminate_process',
          message: 'Failed to terminate process',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true, // Terminating processes requires approval
  };
}

/**
 * Check if program is allowed tool
 */
export function createCheckProgramTool(): AgentTool {
  return {
    name: 'check_program_allowed',
    description: `Check if a program is allowed to be started.
Use this before attempting to start a process to verify it's permitted.`,
    parameters: checkProgramInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'check_program_allowed',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof checkProgramInputSchema>;
        const isAllowed = await processService.isProgramAllowed(input.program);

        return {
          success: true,
          action: 'check_program_allowed',
          message: isAllowed
            ? `Program "${input.program}" is allowed`
            : `Program "${input.program}" is NOT allowed`,
          data: {
            program: input.program,
            allowed: isAllowed,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'check_program_allowed',
          message: 'Failed to check program permission',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

// ==================== Utility Functions ====================

/**
 * Format process info for display
 */
function formatProcessInfo(process: ProcessInfo): Record<string, unknown> {
  return {
    pid: process.pid,
    name: process.name,
    status: process.status,
    memoryMB: process.memoryBytes ? Math.round(process.memoryBytes / 1024 / 1024) : undefined,
    cpuPercent: process.cpuPercent,
    parentPid: process.parentPid,
    exePath: process.exePath,
    user: process.user,
    cwd: process.cwd,
    cmdLine: process.cmdLine?.join(' '),
  };
}

// ==================== Tool Initialization ====================

export interface ProcessToolsConfig {
  /** Enable listing processes */
  enableList?: boolean;
  /** Enable searching processes */
  enableSearch?: boolean;
  /** Enable getting process details */
  enableGet?: boolean;
  /** Enable starting processes */
  enableStart?: boolean;
  /** Enable terminating processes */
  enableTerminate?: boolean;
}

/**
 * Initialize all process management tools
 */
export function initializeProcessTools(config: ProcessToolsConfig = {}): Record<string, AgentTool> {
  const {
    enableList = true,
    enableSearch = true,
    enableGet = true,
    enableStart = true,
    enableTerminate = true,
  } = config;

  const tools: Record<string, AgentTool> = {};

  if (enableList) {
    tools.list_processes = createListProcessesTool();
    tools.top_memory_processes = createTopMemoryProcessesTool();
  }

  if (enableSearch) {
    tools.search_processes = createSearchProcessesTool();
  }

  if (enableGet) {
    tools.get_process = createGetProcessTool();
  }

  if (enableStart) {
    tools.start_process = createStartProcessTool();
    tools.check_program_allowed = createCheckProgramTool();
  }

  if (enableTerminate) {
    tools.terminate_process = createTerminateProcessTool();
  }

  return tools;
}

/**
 * Get system prompt snippet for process tools
 */
export function getProcessToolsPromptSnippet(): string {
  return `
## Process Management Tools

You have access to tools for managing local processes on the user's computer.

### Available Operations:
- **list_processes**: List running processes with optional filtering and sorting
- **search_processes**: Search for processes by name
- **get_process**: Get detailed info about a specific process by PID
- **top_memory_processes**: Get processes using the most memory
- **start_process**: Start a new program (requires approval, restricted to allowlist)
- **terminate_process**: Stop a running process (requires approval, restricted by default)
- **check_program_allowed**: Check if a program is allowed to be started

### Security Notes:
- Process management must be enabled in settings before use
- Starting processes is restricted to an allowlist
- Terminating processes is restricted to those started by this app by default
- Dangerous commands (rm, del, format, shutdown, etc.) are blocked
- All write operations require user approval
`;
}

/**
 * Get detailed system prompt for process tools
 */
export function getProcessToolsSystemPrompt(): string {
  return `
## Process Management Tools - Detailed Guide

You have access to comprehensive tools for managing local processes on the user's system.
These tools are ONLY available in the Tauri desktop environment.

### Tool Reference:

1. **list_processes** - List running processes
   - Optional filters: name, limit, sortBy, sortDesc
   - Returns: PID, name, memory, status, parent PID

2. **search_processes** - Search by name
   - Required: name (partial match, case-insensitive)
   - Optional: limit

3. **get_process** - Get process details
   - Required: pid
   - Returns: Full process info including command line, paths

4. **top_memory_processes** - Memory usage ranking
   - Optional: limit (default: 10)

5. **start_process** - Launch a program
   - Required: program (path or name)
   - Optional: args, cwd, env, detached, captureOutput, timeoutSecs
   - REQUIRES APPROVAL

6. **terminate_process** - Stop a process
   - Required: pid
   - Optional: force, timeoutSecs
   - REQUIRES APPROVAL

7. **check_program_allowed** - Verify program permissions
   - Required: program

### Best Practices:
- Always check if process management is enabled first
- Use search_processes before attempting to terminate unknown processes
- Check if a program is allowed before trying to start it
- Use force=false first for graceful termination
- Provide clear explanations to users before requesting approval
`;
}
