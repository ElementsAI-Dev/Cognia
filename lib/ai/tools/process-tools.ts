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
import type { AgentTool } from '../agent/agent-executor';
import {
  processService,
  isProcessManagementAvailable,
  type ProcessInfo,
  type ProcessOperation,
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

const processStatusInputSchema = z.object({});

const setProcessEnabledInputSchema = z.object({
  enabled: z.boolean().describe('Whether process management should be enabled'),
});

const trackedProcessesInputSchema = z.object({
  includeDetails: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include process details for tracked PIDs if process management is enabled'),
  limit: z
    .number()
    .optional()
    .default(200)
    .describe('Maximum process rows to fetch when includeDetails=true'),
});

const startProcessesParallelInputSchema = z.object({
  requests: z
    .array(startProcessInputSchema)
    .min(1)
    .max(100)
    .describe('Process start request list to execute in parallel'),
  maxConcurrency: z
    .number()
    .int()
    .min(1)
    .max(16)
    .optional()
    .default(4)
    .describe('Maximum number of concurrent start operations'),
});

const terminateProcessesParallelInputSchema = z.object({
  requests: z
    .array(terminateProcessInputSchema)
    .min(1)
    .max(200)
    .describe('Process terminate request list to execute in parallel'),
  maxConcurrency: z
    .number()
    .int()
    .min(1)
    .max(16)
    .optional()
    .default(4)
    .describe('Maximum number of concurrent terminate operations'),
});

const getProcessOperationInputSchema = z.object({
  operationId: z.string().describe('Async process operation ID to query'),
});

const listProcessOperationsInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(20).describe('Maximum operations to return'),
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

/**
 * Start multiple processes in parallel tool
 */
export function createStartProcessesParallelTool(): AgentTool {
  return {
    name: 'start_processes_parallel',
    description: `Start multiple processes in parallel with bounded concurrency.
Use this when you need to launch several programs efficiently.
Available only in desktop environment. Requires user approval.`,
    parameters: startProcessesParallelInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'start_processes_parallel',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof startProcessesParallelInputSchema>;
        const isEnabled = await processService.isEnabled();

        if (!isEnabled) {
          return {
            success: false,
            action: 'start_processes_parallel',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }

        const result = await processService.startBatch({
          requests: input.requests,
          maxConcurrency: input.maxConcurrency,
        });

        return {
          success: result.failureCount === 0,
          action: 'start_processes_parallel',
          message: `Batch start completed: ${result.successCount}/${result.total} succeeded`,
          data: {
            total: result.total,
            successCount: result.successCount,
            failureCount: result.failureCount,
            results: result.results.map((item) => ({
              index: item.index,
              program: item.program,
              success: item.result.success,
              pid: item.result.pid,
              error: item.result.error,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'start_processes_parallel',
          message: 'Failed to execute parallel process start',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Terminate multiple processes in parallel tool
 */
export function createTerminateProcessesParallelTool(): AgentTool {
  return {
    name: 'terminate_processes_parallel',
    description: `Terminate multiple processes in parallel with bounded concurrency.
Use this when cleaning up multiple PIDs efficiently.
Available only in desktop environment. Requires user approval.`,
    parameters: terminateProcessesParallelInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'terminate_processes_parallel',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof terminateProcessesParallelInputSchema>;
        const isEnabled = await processService.isEnabled();

        if (!isEnabled) {
          return {
            success: false,
            action: 'terminate_processes_parallel',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }

        const result = await processService.terminateBatch({
          requests: input.requests,
          maxConcurrency: input.maxConcurrency,
        });

        return {
          success: result.failureCount === 0,
          action: 'terminate_processes_parallel',
          message: `Batch terminate completed: ${result.successCount}/${result.total} succeeded`,
          data: {
            total: result.total,
            successCount: result.successCount,
            failureCount: result.failureCount,
            results: result.results.map((item) => ({
              index: item.index,
              pid: item.pid,
              success: item.result.success,
              exitCode: item.result.exitCode,
              error: item.result.error,
            })),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'terminate_processes_parallel',
          message: 'Failed to execute parallel process termination',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Submit async start batch operation tool
 */
export function createStartProcessesAsyncTool(): AgentTool {
  return {
    name: 'start_processes_async',
    description: `Submit a process start batch as an asynchronous operation.
Returns an operation ID immediately; use get_process_operation to poll result.
Available only in desktop environment. Requires user approval.`,
    parameters: startProcessesParallelInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'start_processes_async',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof startProcessesParallelInputSchema>;
        const isEnabled = await processService.isEnabled();

        if (!isEnabled) {
          return {
            success: false,
            action: 'start_processes_async',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }

        const operation = await processService.startBatchAsync({
          requests: input.requests,
          maxConcurrency: input.maxConcurrency,
        });

        return {
          success: true,
          action: 'start_processes_async',
          message: `Async start operation submitted: ${operation.operationId}`,
          data: formatProcessOperation(operation),
        };
      } catch (error) {
        return {
          success: false,
          action: 'start_processes_async',
          message: 'Failed to submit async process start operation',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Submit async terminate batch operation tool
 */
export function createTerminateProcessesAsyncTool(): AgentTool {
  return {
    name: 'terminate_processes_async',
    description: `Submit a process terminate batch as an asynchronous operation.
Returns an operation ID immediately; use get_process_operation to poll result.
Available only in desktop environment. Requires user approval.`,
    parameters: terminateProcessesParallelInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'terminate_processes_async',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof terminateProcessesParallelInputSchema>;
        const isEnabled = await processService.isEnabled();

        if (!isEnabled) {
          return {
            success: false,
            action: 'terminate_processes_async',
            message: 'Process management is disabled. Enable it in settings first.',
            error: 'Process management disabled',
          };
        }

        const operation = await processService.terminateBatchAsync({
          requests: input.requests,
          maxConcurrency: input.maxConcurrency,
        });

        return {
          success: true,
          action: 'terminate_processes_async',
          message: `Async terminate operation submitted: ${operation.operationId}`,
          data: formatProcessOperation(operation),
        };
      } catch (error) {
        return {
          success: false,
          action: 'terminate_processes_async',
          message: 'Failed to submit async process terminate operation',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Process manager status tool
 */
export function createProcessStatusTool(): AgentTool {
  return {
    name: 'get_process_manager_status',
    description: `Get process manager status and configuration.
Returns whether process management is enabled, tracked process count, and current policy config.`,
    parameters: processStatusInputSchema,
    execute: async (): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'get_process_manager_status',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const [enabled, trackedPids, config] = await Promise.all([
          processService.isEnabled(),
          processService.getTracked(),
          processService.getConfig(),
        ]);

        return {
          success: true,
          action: 'get_process_manager_status',
          message: `Process management is ${enabled ? 'enabled' : 'disabled'}`,
          data: {
            enabled,
            trackedCount: trackedPids.length,
            trackedPids,
            config,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'get_process_manager_status',
          message: 'Failed to get process manager status',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Enable or disable process manager tool
 */
export function createSetProcessEnabledTool(): AgentTool {
  return {
    name: 'set_process_manager_enabled',
    description: `Enable or disable process management globally.
Use this when process tools are blocked because the manager is disabled.
Requires user approval because it changes system tool permissions.`,
    parameters: setProcessEnabledInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'set_process_manager_enabled',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof setProcessEnabledInputSchema>;
        await processService.setEnabled(input.enabled);
        const config = await processService.getConfig();

        return {
          success: true,
          action: 'set_process_manager_enabled',
          message: `Process management ${input.enabled ? 'enabled' : 'disabled'}`,
          data: {
            enabled: input.enabled,
            config,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'set_process_manager_enabled',
          message: 'Failed to update process manager status',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Get tracked process list tool
 */
export function createGetTrackedProcessesTool(): AgentTool {
  return {
    name: 'get_tracked_processes',
    description: `Get process IDs tracked by the process manager (typically started by this app).
Optionally include process details for tracked IDs when process management is enabled.`,
    parameters: trackedProcessesInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'get_tracked_processes',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof trackedProcessesInputSchema>;
        const [trackedPids, isEnabled] = await Promise.all([
          processService.getTracked(),
          processService.isEnabled(),
        ]);

        if (!input.includeDetails || trackedPids.length === 0 || !isEnabled) {
          return {
            success: true,
            action: 'get_tracked_processes',
            message: `Found ${trackedPids.length} tracked processes`,
            data: {
              trackedCount: trackedPids.length,
              trackedPids,
              includeDetails: false,
              detailsAvailable: isEnabled,
            },
          };
        }

        const processes = await processService.list({
          limit: Math.max(input.limit, trackedPids.length),
        });
        const trackedSet = new Set(trackedPids);
        const trackedProcesses = processes
          .filter((process) => trackedSet.has(process.pid))
          .map(formatProcessInfo);

        return {
          success: true,
          action: 'get_tracked_processes',
          message: `Found ${trackedProcesses.length} tracked processes with details`,
          data: {
            trackedCount: trackedPids.length,
            trackedPids,
            includeDetails: true,
            processes: trackedProcesses,
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'get_tracked_processes',
          message: 'Failed to get tracked processes',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Get process async operation tool
 */
export function createGetProcessOperationTool(): AgentTool {
  return {
    name: 'get_process_operation',
    description: `Get async batch process operation status/result by operation ID.
Use this to poll submitted async start/terminate operations.`,
    parameters: getProcessOperationInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'get_process_operation',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof getProcessOperationInputSchema>;
        const operation = await processService.getOperation(input.operationId);

        if (!operation) {
          return {
            success: false,
            action: 'get_process_operation',
            message: `Operation ${input.operationId} not found`,
            error: 'Operation not found',
          };
        }

        return {
          success: true,
          action: 'get_process_operation',
          message: `Operation ${operation.operationId} is ${operation.status}`,
          data: formatProcessOperation(operation),
        };
      } catch (error) {
        return {
          success: false,
          action: 'get_process_operation',
          message: 'Failed to get process operation',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * List process async operations tool
 */
export function createListProcessOperationsTool(): AgentTool {
  return {
    name: 'list_process_operations',
    description: `List recent async process operations (most recent first).
Use this to inspect pending/running/completed batch operations.`,
    parameters: listProcessOperationsInputSchema,
    execute: async (args): Promise<ProcessToolResult> => {
      if (!isProcessManagementAvailable()) {
        return {
          success: false,
          action: 'list_process_operations',
          message: 'Process management requires Tauri desktop environment',
          error: 'Not available in browser',
        };
      }

      try {
        const input = args as z.infer<typeof listProcessOperationsInputSchema>;
        const operations = await processService.listOperations(input.limit);

        return {
          success: true,
          action: 'list_process_operations',
          message: `Found ${operations.length} operations`,
          data: {
            count: operations.length,
            operations: operations.map(formatProcessOperation),
          },
        };
      } catch (error) {
        return {
          success: false,
          action: 'list_process_operations',
          message: 'Failed to list process operations',
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

function formatProcessOperation(operation: ProcessOperation): Record<string, unknown> {
  return {
    operationId: operation.operationId,
    operationType: operation.operationType,
    status: operation.status,
    createdAt: operation.createdAt,
    startedAt: operation.startedAt,
    completedAt: operation.completedAt,
    error: operation.error,
    result:
      operation.result?.kind === 'startBatch'
        ? {
            kind: 'startBatch',
            total: operation.result.payload.total,
            successCount: operation.result.payload.successCount,
            failureCount: operation.result.payload.failureCount,
          }
        : operation.result?.kind === 'terminateBatch'
          ? {
              kind: 'terminateBatch',
              total: operation.result.payload.total,
              successCount: operation.result.payload.successCount,
              failureCount: operation.result.payload.failureCount,
            }
          : undefined,
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
  /** Enable process manager status/config tools */
  enableStatus?: boolean;
  /** Enable tracked process query tool */
  enableTracking?: boolean;
  /** Enable parallel batch process tools */
  enableBatch?: boolean;
  /** Enable async operation submission/query tools */
  enableAsyncOperations?: boolean;
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
    enableStatus = true,
    enableTracking = true,
    enableBatch = true,
    enableAsyncOperations = true,
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
    if (enableBatch) {
      tools.start_processes_parallel = createStartProcessesParallelTool();
    }
    if (enableAsyncOperations) {
      tools.start_processes_async = createStartProcessesAsyncTool();
    }
  }

  if (enableTerminate) {
    tools.terminate_process = createTerminateProcessTool();
    if (enableBatch) {
      tools.terminate_processes_parallel = createTerminateProcessesParallelTool();
    }
    if (enableAsyncOperations) {
      tools.terminate_processes_async = createTerminateProcessesAsyncTool();
    }
  }

  if (enableStatus) {
    tools.get_process_manager_status = createProcessStatusTool();
    tools.set_process_manager_enabled = createSetProcessEnabledTool();
  }

  if (enableTracking) {
    tools.get_tracked_processes = createGetTrackedProcessesTool();
  }

  if (enableAsyncOperations) {
    tools.get_process_operation = createGetProcessOperationTool();
    tools.list_process_operations = createListProcessOperationsTool();
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
- **start_processes_parallel**: Start multiple programs in parallel (requires approval)
- **terminate_processes_parallel**: Terminate multiple processes in parallel (requires approval)
- **start_processes_async**: Submit async start batch and return operation ID (requires approval)
- **terminate_processes_async**: Submit async terminate batch and return operation ID (requires approval)
- **get_process_operation**: Query one async operation by operation ID
- **list_process_operations**: List recent async operations
- **check_program_allowed**: Check if a program is allowed to be started
- **get_process_manager_status**: Get process manager status/config and tracked count
- **set_process_manager_enabled**: Enable/disable process management (requires approval)
- **get_tracked_processes**: List tracked process IDs (optionally with details)

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

7. **start_processes_parallel** - Start multiple programs in parallel
   - Required: requests[]
   - Optional: maxConcurrency
   - REQUIRES APPROVAL

8. **terminate_processes_parallel** - Terminate multiple processes in parallel
   - Required: requests[]
   - Optional: maxConcurrency
   - REQUIRES APPROVAL

9. **start_processes_async** - Submit async start batch
   - Required: requests[]
   - Optional: maxConcurrency
   - Returns: operationId/status immediately
   - REQUIRES APPROVAL

10. **terminate_processes_async** - Submit async terminate batch
   - Required: requests[]
   - Optional: maxConcurrency
   - Returns: operationId/status immediately
   - REQUIRES APPROVAL

11. **get_process_operation** - Query async operation by ID
   - Required: operationId

12. **list_process_operations** - List recent async operations
   - Optional: limit

13. **check_program_allowed** - Verify program permissions
   - Required: program

14. **get_process_manager_status** - Read process manager status
   - No required parameters
   - Returns: enabled flag, tracked process list/count, runtime config

15. **set_process_manager_enabled** - Enable/disable process manager
   - Required: enabled (boolean)
   - REQUIRES APPROVAL

16. **get_tracked_processes** - Read tracked process IDs
   - Optional: includeDetails, limit
   - Returns: tracked PIDs and optional process details

### Best Practices:
- Always check if process management is enabled first
- Use search_processes before attempting to terminate unknown processes
- Check if a program is allowed before trying to start it
- Use *_processes_async for long-running multi-process tasks and poll with get_process_operation
- Use force=false first for graceful termination
- Provide clear explanations to users before requesting approval
`;
}
