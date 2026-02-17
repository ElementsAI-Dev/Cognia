/**
 * Task Executors
 * Built-in executors for different task types
 */

import type { ScheduledTask, TaskExecution } from '@/types/scheduler';
import type { ProviderName } from '@/types/provider';
import { registerTaskExecutor } from '../task-scheduler';
import { loggers } from '@/lib/logger';
import { executePluginTask } from './plugin-executor';
import { executeScript } from '../script-executor';

// Logger
const log = loggers.app;

/**
 * Workflow task executor
 */
async function executeWorkflowTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const payload = (task.payload || {}) as {
      workflowId?: string;
      workflowDefinition?: import('@/types/workflow').WorkflowDefinition;
      definition?: import('@/types/workflow').WorkflowDefinition;
      input?: Record<string, unknown>;
      triggerId?: string;
      isReplay?: boolean;
      options?: {
        triggerId?: string;
        isReplay?: boolean;
      };
    };

    const workflowId = payload.workflowId;
    const workflowDefinition = payload.workflowDefinition || payload.definition;
    const input = payload.input || {};
    const triggerId = payload.options?.triggerId || payload.triggerId;
    const isReplay = payload.options?.isReplay ?? payload.isReplay;

    if (!workflowId && !workflowDefinition) {
      return { success: false, error: 'No workflow ID or workflow definition specified in task payload' };
    }

    log.info(`Executing workflow: ${workflowId || workflowDefinition?.id}`);

    // Use workflow orchestrator as the single execution entrypoint.
    const { workflowOrchestrator } = await import('@/lib/workflow-editor/orchestrator');
    const { workflowRepository } = await import('@/lib/db/repositories');
    const { definitionToVisual } = await import('@/lib/workflow-editor/converter');
    let resolvedWorkflow: import('@/types/workflow/workflow-editor').VisualWorkflow | undefined;

    if (workflowId) {
      const persisted = await workflowRepository.getById(workflowId);
      if (persisted) {
        resolvedWorkflow = persisted;
      }
    }

    if (!resolvedWorkflow && workflowDefinition) {
      resolvedWorkflow = definitionToVisual(workflowDefinition);
    }

    if (!resolvedWorkflow) {
      return {
        success: false,
        error: workflowId
          ? `Workflow not found: ${workflowId}`
          : 'Unable to resolve workflow for scheduled task',
      };
    }

    const result = await workflowOrchestrator.run({
      workflow: resolvedWorkflow,
      input,
      triggerId: triggerId || `scheduler:${task.id}`,
      isReplay,
    });

    try {
      await workflowOrchestrator.persistExecution({ result });
    } catch (persistError) {
      log.warn('Failed to persist scheduled workflow execution', {
        taskId: task.id,
        error: persistError,
      });
    }

    const nodeStates = Object.values(result.nodeStates || {});
    const completedSteps = nodeStates.filter((step) => step.status === 'completed').length;
    const failedSteps = nodeStates.filter((step) => step.status === 'failed').length;
    const success = result.status === 'completed';

    return {
      success,
      output: {
        workflowId: result.workflowId,
        executionId: result.executionId,
        runtime: result.runtime,
        status: result.status,
        completedSteps,
        failedSteps,
        totalSteps: nodeStates.length,
        triggerId: result.triggerId || triggerId,
        output: result.output,
      },
      error: success ? undefined : result.error || `Workflow ended with status: ${result.status}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Workflow execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Agent task executor
 */
async function executeAgentTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const { agentTask, config } = task.payload as { 
      agentTask?: string; 
      config?: Record<string, unknown>;
    };
    
    if (!agentTask) {
      return { success: false, error: 'No agent task specified in payload' };
    }

    log.info(`Executing agent task: ${agentTask.substring(0, 50)}...`);

    // Dynamically import to avoid circular dependencies
    const { executeAgentLoop } = await import('@/lib/ai/agent/agent-loop');
    const { useSettingsStore } = await import('@/stores/settings');
    
    const settings = useSettingsStore.getState();
    
    const providerSettings = settings.providerSettings[settings.defaultProvider];
    const result = await executeAgentLoop(agentTask, {
      provider: ((config?.provider as string) || settings.defaultProvider) as ProviderName,
      model: (config?.model as string) || providerSettings?.defaultModel || 'gpt-4o',
      apiKey: '', // Will be fetched from settings
      maxStepsPerTask: (config?.maxSteps as number) || 10,
      planningEnabled: (config?.planningEnabled as boolean) ?? true,
    });

    return {
      success: result.success,
      output: {
        taskCount: result.tasks.length,
        totalSteps: result.totalSteps,
        duration: result.duration,
        finalSummary: result.finalSummary?.substring(0, 500),
      },
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Agent execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Sync task executor
 */
async function executeSyncTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const { direction } = task.payload as { direction?: 'upload' | 'download' | 'bidirectional' };
    
    log.info(`Executing sync task with direction: ${direction || 'bidirectional'}`);

    // Use existing sync scheduler
    const { getSyncScheduler } = await import('@/lib/sync/sync-scheduler');
    
    const scheduler = getSyncScheduler();
    const success = await scheduler.runSync(direction || 'bidirectional');

    return {
      success,
      output: {
        direction: direction || 'bidirectional',
        completedAt: new Date().toISOString(),
      },
      error: success ? undefined : 'Sync operation failed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Sync execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Backup task executor
 * Supports multiple backup types: local, sync (WebDAV/GitHub), plugins
 */
async function executeBackupTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const { 
      backupType, 
      destination,
      options 
    } = task.payload as { 
      backupType?: 'full' | 'sessions' | 'settings' | 'plugins' | 'all';
      destination?: 'local' | 'webdav' | 'github' | 'all';
      options?: {
        includeSessions?: boolean;
        includeSettings?: boolean;
        includeArtifacts?: boolean;
        includeIndexedDB?: boolean;
      };
    };
    
    log.info(`Executing backup task: ${backupType || 'all'} to ${destination || 'local'}`);

    const results: Record<string, unknown> = {
      backupType: backupType || 'all',
      destination: destination || 'local',
      startedAt: new Date().toISOString(),
    };

    // Full data backup
    if (backupType === 'full' || backupType === 'all' || backupType === 'sessions' || backupType === 'settings') {
      const { createFullBackup } = await import('@/lib/storage/data-export');
      
      const exportData = await createFullBackup({
        includeSessions: options?.includeSessions ?? (backupType !== 'settings'),
        includeSettings: options?.includeSettings ?? (backupType !== 'sessions'),
        includeArtifacts: options?.includeArtifacts ?? true,
        includeIndexedDB: options?.includeIndexedDB ?? true,
      });

      results.dataBackup = {
        sessions: exportData.sessions?.length || 0,
        hasSettings: !!exportData.settings,
        exportedAt: exportData.exportedAt,
      };

      // Sync to remote if destination specified
      if (destination === 'webdav' || destination === 'github' || destination === 'all') {
        const { useSyncStore } = await import('@/stores/sync');
        const syncState = useSyncStore.getState();
        
        if (syncState.activeProvider) {
          const { getSyncScheduler } = await import('@/lib/sync/sync-scheduler');
          const scheduler = getSyncScheduler();
          const syncSuccess = await scheduler.runSync('upload');
          results.syncResult = { 
            success: syncSuccess, 
            provider: syncState.activeProvider,
          };
        } else {
          results.syncResult = { 
            success: false, 
            error: 'No sync provider configured',
          };
        }
      }
    }

    // Plugin backup
    if (backupType === 'plugins' || backupType === 'all') {
      try {
        const { PluginBackupManager } = await import('@/lib/plugin');
        const backupManager = new PluginBackupManager();
        await backupManager.initialize();
        results.plugins = { backed: true };
      } catch (pluginError) {
        log.warn('Plugin backup skipped:', { error: pluginError });
        results.plugins = { 
          backed: false, 
          error: pluginError instanceof Error ? pluginError.message : 'Plugin backup failed',
        };
      }
    }

    results.completedAt = new Date().toISOString();

    return {
      success: true,
      output: results,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Backup execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Script task executor
 * Executes scripts via the sandbox service
 */
async function executeScriptTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const { language, code, timeout_secs, memory_mb, use_sandbox } = task.payload as {
      language?: string;
      code?: string;
      timeout_secs?: number;
      memory_mb?: number;
      use_sandbox?: boolean;
    };

    if (!language || !code) {
      return { success: false, error: 'Script language and code are required in task payload' };
    }

    log.info(`Executing script task: ${language}`);

    const result = await executeScript({
      type: 'execute_script',
      language,
      code,
      timeout_secs,
      memory_mb,
      use_sandbox,
    });

    return {
      success: result.success,
      output: {
        exit_code: result.exit_code,
        stdout: result.stdout,
        stderr: result.stderr,
        duration_ms: result.duration_ms,
      },
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Script execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Custom task executor (calls a custom function)
 */
async function executeCustomTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const { handler, args } = task.payload as { 
      handler?: string;
      args?: Record<string, unknown>;
    };
    
    if (!handler) {
      return { success: false, error: 'No handler specified for custom task' };
    }

    log.info(`Executing custom task with handler: ${handler}`);

    // Custom tasks should register their handlers via registerCustomTaskHandler
    const customHandler = customTaskHandlers.get(handler);
    if (!customHandler) {
      return { success: false, error: `Custom handler not found: ${handler}` };
    }

    const result = await customHandler(args || {});
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Custom task execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

// Custom task handler registry
type CustomTaskHandler = (
  args: Record<string, unknown>
) => Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;

const customTaskHandlers: Map<string, CustomTaskHandler> = new Map();

/**
 * Register a custom task handler
 */
export function registerCustomTaskHandler(name: string, handler: CustomTaskHandler): void {
  customTaskHandlers.set(name, handler);
  log.info(`Registered custom task handler: ${name}`);
}

/**
 * Unregister a custom task handler
 */
export function unregisterCustomTaskHandler(name: string): void {
  customTaskHandlers.delete(name);
  log.info(`Unregistered custom task handler: ${name}`);
}

/**
 * Register all built-in executors
 */
export function registerBuiltinExecutors(): void {
  registerTaskExecutor('workflow', executeWorkflowTask);
  registerTaskExecutor('agent', executeAgentTask);
  registerTaskExecutor('sync', executeSyncTask);
  registerTaskExecutor('backup', executeBackupTask);
  registerTaskExecutor('custom', executeCustomTask);
  registerTaskExecutor('plugin', executePluginTask);
  registerTaskExecutor('script', executeScriptTask);
  
  log.info('Registered all built-in task executors');
}

export {
  executeWorkflowTask,
  executeAgentTask,
  executeSyncTask,
  executeBackupTask,
  executeCustomTask,
  executePluginTask,
  executeScriptTask,
};

export {
  cancelPluginTaskExecution,
  getActivePluginTaskCount,
  isPluginTaskExecutionActive,
} from './plugin-executor';
