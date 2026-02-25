/**
 * Task Executors
 * Built-in executors for different task types
 */

import type { ScheduledTask, TaskExecution } from '@/types/scheduler';
import type { BackupTaskPayload } from '@/types/scheduler';
import type { SyncProviderType } from '@/types/sync';
import type { ProviderName } from '@/types/provider';
import { registerTaskExecutor } from '../task-scheduler';
import { loggers } from '@/lib/logger';
import { executePluginTask } from './plugin-executor';
import { executeScript } from '../script-executor';
import { nanoid } from 'nanoid';

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
    const payload = (task.payload || {}) as BackupTaskPayload;
    const backupType = payload.backupType;
    const destination = payload.destination;
    const options = payload.options;
    
    log.info(`Executing backup task: ${backupType || 'all'} to ${destination || 'local'}`);

    const results: Record<string, unknown> = {
      backupType: backupType || 'all',
      destination: destination || 'local',
      startedAt: new Date().toISOString(),
    };

    // Full data backup
    if (backupType === 'full' || backupType === 'all' || backupType === 'sessions' || backupType === 'settings') {
      const { createFullBackup, exportToJSON } = await import('@/lib/storage/data-export');
      const { isTauri } = await import('@/lib/utils');
      const { storageFeatureFlags } = await import('@/lib/storage/persistence/feature-flags');
      const desktop = isTauri();

      if (desktop && storageFeatureFlags.encryptedBackupV3Enabled) {
        const { isStrongholdAvailable } = await import('@/lib/native/stronghold-integration');
        if (!isStrongholdAvailable()) {
          log.warn('scheduler_backup_skipped_locked_stronghold', { taskId: task.id });
          return {
            success: false,
            output: {
              skipped: true,
              reason: 'stronghold_locked',
              taskId: task.id,
            },
            error: 'Backup skipped: Stronghold is locked',
          };
        }
      }
      
      const backupPackage = await createFullBackup({
        includeSessions: options?.includeSessions ?? (backupType !== 'settings'),
        includeSettings: options?.includeSettings ?? (backupType !== 'sessions'),
        includeArtifacts: options?.includeArtifacts ?? true,
        includeIndexedDB: options?.includeIndexedDB ?? true,
      });
      const backupJson = await exportToJSON({
        includeSessions: options?.includeSessions ?? (backupType !== 'settings'),
        includeSettings: options?.includeSettings ?? (backupType !== 'sessions'),
        includeArtifacts: options?.includeArtifacts ?? true,
        includeIndexedDB: options?.includeIndexedDB ?? true,
      });

      results.dataBackup = {
        sessions: backupPackage.payload.sessions.length,
        messages: backupPackage.payload.messages.length,
        projects: backupPackage.payload.projects.length,
        summaries: backupPackage.payload.summaries.length,
        hasSettings: !!backupPackage.payload.settings,
        exportedAt: backupPackage.manifest.exportedAt,
      };

      if (destination === 'local' || destination === 'all' || !destination) {
        if (desktop) {
          const { appDataDir, join } = await import('@tauri-apps/api/path');
          const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
          const appDataPath = await appDataDir();
          const backupDir = await join(appDataPath, 'backups');
          await mkdir(backupDir, { recursive: true });
          const fileName = `cognia-backup-v3-${Date.now()}.json`;
          const targetPath = await join(backupDir, fileName);
          await writeTextFile(targetPath, backupJson);
          results.localBackup = { saved: true, path: targetPath };
        } else if (typeof window !== 'undefined') {
          const existingBackupKeys = Object.keys(localStorage)
            .filter((key) => key.startsWith('cognia-scheduled-backup-v3-'))
            .sort();
          const maxBackups = 5;
          while (existingBackupKeys.length >= maxBackups) {
            const oldest = existingBackupKeys.shift();
            if (oldest) {
              localStorage.removeItem(oldest);
            }
          }

          const key = `cognia-scheduled-backup-v3-${Date.now()}`;
          try {
            localStorage.setItem(key, backupJson);
            results.localBackup = { saved: true, path: key };
          } catch (storageError) {
            const retryKeys = Object.keys(localStorage)
              .filter((storageKey) => storageKey.startsWith('cognia-scheduled-backup-v3-'))
              .sort();
            while (retryKeys.length > 0) {
              const oldest = retryKeys.shift();
              if (oldest) {
                localStorage.removeItem(oldest);
              }
              try {
                localStorage.setItem(key, backupJson);
                results.localBackup = { saved: true, path: key, reclaimedByEviction: true };
                break;
              } catch {
                // continue evicting
              }
            }

            if (!(results.localBackup as { saved?: boolean } | undefined)?.saved) {
              throw storageError;
            }
          }
        }
      }

      const shouldRemoteSync =
        destination === 'webdav' ||
        destination === 'github' ||
        destination === 'googledrive' ||
        destination === 'all';

      if (shouldRemoteSync) {
        const { getSyncManager } = await import('@/lib/sync');
        const { hasStoredCredentials } = await import('@/lib/sync/credential-storage');
        const { useSyncStore } = await import('@/stores/sync');
        const syncManager = getSyncManager();
        let targetProviders: SyncProviderType[] = [];
        const skippedProviders: SyncProviderType[] = [];

        if (destination === 'all') {
          const syncState = useSyncStore.getState();
          const providerCandidates: SyncProviderType[] = ['webdav', 'github', 'googledrive'];
          const activeByConfig: Record<SyncProviderType, boolean> = {
            webdav: syncState.webdavConfig.enabled,
            github: syncState.githubConfig.enabled,
            googledrive: syncState.googleDriveConfig.enabled,
          };

          for (const provider of providerCandidates) {
            if (!activeByConfig[provider]) {
              skippedProviders.push(provider);
              continue;
            }

            const hasCredential = await hasStoredCredentials(provider);
            if (!hasCredential) {
              skippedProviders.push(provider);
              continue;
            }

            targetProviders.push(provider);
          }

          if (targetProviders.length === 0) {
            return {
              success: false,
              output: {
                ...results,
                syncResult: {
                  providers: {},
                  successfulProviders: [],
                  failedProviders: [],
                  skippedProviders,
                },
              },
              error: 'No configured sync providers with available credentials for remote backup',
            };
          }
        } else {
          targetProviders = [destination as SyncProviderType];
        }

        const providerResults: Record<string, { success: boolean; error?: string }> = {};
        for (const provider of targetProviders) {
          const providerResult = await syncManager.runBackupUploadForProvider(provider);
          providerResults[provider] = providerResult;
        }

        const successfulProviders = Object.entries(providerResults)
          .filter(([, providerResult]) => providerResult.success)
          .map(([provider]) => provider);
        const failedProviders = Object.entries(providerResults)
          .filter(([, providerResult]) => !providerResult.success)
          .map(([provider, providerResult]) => ({ provider, error: providerResult.error || 'Unknown error' }));

        results.syncResult = {
          providers: providerResults,
          successfulProviders,
          failedProviders,
          skippedProviders,
        };

        if (failedProviders.length > 0) {
          return {
            success: false,
            output: results,
            error: `Remote backup failed for providers: ${failedProviders.map((item) => item.provider).join(', ')}`,
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
 * AI Generation task executor
 * Generates AI content on schedule (summaries, translations, reports, etc.)
 */
async function executeAIGenerationTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const {
      prompt,
      provider,
      model,
      sessionId,
      generationType,
      outputFormat,
    } = task.payload as {
      prompt?: string;
      provider?: string;
      model?: string;
      sessionId?: string;
      generationType?: 'summary' | 'translation' | 'report' | 'custom';
      outputFormat?: 'text' | 'markdown' | 'json';
    };

    if (!prompt) {
      return { success: false, error: 'No prompt specified in task payload' };
    }

    log.info(`Executing AI generation task: ${generationType || 'custom'}`);

    const { useSettingsStore } = await import('@/stores/settings');
    const settings = useSettingsStore.getState();
    const resolvedProvider = (provider || settings.defaultProvider) as ProviderName;
    const providerSettings = settings.providerSettings[resolvedProvider];
    const resolvedModel = model || providerSettings?.defaultModel || 'gpt-4o';

    const { generateText } = await import('ai');
    const { getProxyProviderModel } = await import('@/lib/ai/core/proxy-client');

    const modelInstance = getProxyProviderModel(
      resolvedProvider,
      resolvedModel,
      providerSettings?.apiKey || '',
      providerSettings?.baseURL,
      true
    );

    const systemPrompt = generationType === 'summary'
      ? 'You are a helpful assistant that creates concise summaries.'
      : generationType === 'translation'
        ? 'You are a professional translator. Translate the given text accurately.'
        : generationType === 'report'
          ? 'You are an analyst that creates detailed reports from data.'
          : undefined;

    const result = await generateText({
      model: modelInstance,
      prompt,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      temperature: 0.7,
    });

    const output: Record<string, unknown> = {
      generationType: generationType || 'custom',
      provider: resolvedProvider,
      model: resolvedModel,
      outputFormat: outputFormat || 'text',
      contentLength: result.text?.length || 0,
      completedAt: new Date().toISOString(),
    };

    if (sessionId) {
      output.sessionId = sessionId;
    }

    if (result.text) {
      output.content = result.text.substring(0, 2000);
    }

    return {
      success: true,
      output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`AI generation execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Chat task executor
 * Sends a pre-configured message to a chat session on schedule
 */
async function executeChatTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const {
      sessionId,
      message,
      provider,
      model,
      autoReply,
    } = task.payload as {
      sessionId?: string;
      message?: string;
      provider?: string;
      model?: string;
      autoReply?: boolean;
    };

    if (!message) {
      return { success: false, error: 'No message specified in task payload' };
    }

    log.info(`Executing chat task for session: ${sessionId || 'new'}`);

    const { useSessionStore } = await import('@/stores/chat');
    const sessionStore = useSessionStore.getState();

    let targetSessionId = sessionId;

    if (!targetSessionId) {
      const newSession = sessionStore.createSession({ title: `Scheduled: ${task.name}` });
      targetSessionId = newSession.id;
    }

    sessionStore.setActiveSession(targetSessionId);

    const { useChatStore } = await import('@/stores/chat');
    const chatStore = useChatStore.getState();

    chatStore.appendMessage({
      id: nanoid(),
      role: 'user',
      content: message,
      parts: [{ type: 'text', content: message }],
      createdAt: new Date(),
    });

    const output: Record<string, unknown> = {
      sessionId: targetSessionId,
      messageSent: true,
      messageLength: message.length,
      completedAt: new Date().toISOString(),
    };

    if (autoReply) {
      const { useSettingsStore } = await import('@/stores/settings');
      const settings = useSettingsStore.getState();
      const resolvedProvider = (provider || settings.defaultProvider) as ProviderName;
      const providerSettings = settings.providerSettings[resolvedProvider];
      const resolvedModel = model || providerSettings?.defaultModel || 'gpt-4o';

      const { generateText } = await import('ai');
      const { getProxyProviderModel } = await import('@/lib/ai/core/proxy-client');

      const modelInstance = getProxyProviderModel(
        resolvedProvider,
        resolvedModel,
        providerSettings?.apiKey || '',
        providerSettings?.baseURL,
        true
      );

      const result = await generateText({
        model: modelInstance,
        prompt: message,
        temperature: 0.7,
      });

      if (result.text) {
        chatStore.appendMessage({
          id: nanoid(),
          role: 'assistant',
          content: result.text,
          parts: [{ type: 'text', content: result.text }],
          createdAt: new Date(),
        });
        output.autoReply = true;
        output.replyLength = result.text.length;
      }
    }

    return { success: true, output };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Chat task execution failed:`, error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Test task executor
 * Runs health checks, connectivity tests, or custom validation scripts
 */
async function executeTestTask(
  task: ScheduledTask,
  _execution: TaskExecution
): Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }> {
  try {
    const {
      testType,
      url,
      expectedStatus,
      timeout,
      script,
      language,
    } = task.payload as {
      testType?: 'health-check' | 'api-ping' | 'script' | 'provider-check';
      url?: string;
      expectedStatus?: number;
      timeout?: number;
      script?: string;
      language?: string;
    };

    log.info(`Executing test task: ${testType || 'health-check'}`);

    const results: Record<string, unknown> = {
      testType: testType || 'health-check',
      startedAt: new Date().toISOString(),
    };

    switch (testType) {
      case 'api-ping': {
        if (!url) {
          return { success: false, error: 'No URL specified for API ping test' };
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout || 10000);
        const startTime = Date.now();
        try {
          const response = await fetch(url, { signal: controller.signal, method: 'HEAD' });
          clearTimeout(timer);
          const responseTime = Date.now() - startTime;
          const expected = expectedStatus || 200;
          const isHealthy = response.status === expected;
          results.url = url;
          results.statusCode = response.status;
          results.expectedStatus = expected;
          results.responseTimeMs = responseTime;
          results.healthy = isHealthy;
          return {
            success: isHealthy,
            output: results,
            error: isHealthy ? undefined : `Expected status ${expected}, got ${response.status}`,
          };
        } catch (fetchError) {
          clearTimeout(timer);
          results.url = url;
          results.healthy = false;
          results.error = fetchError instanceof Error ? fetchError.message : String(fetchError);
          return { success: false, output: results, error: results.error as string };
        }
      }

      case 'provider-check': {
        const { useSettingsStore } = await import('@/stores/settings');
        const settings = useSettingsStore.getState();
        const providers = Object.keys(settings.providerSettings);
        const providerResults: Record<string, boolean> = {};

        for (const providerName of providers) {
          const providerConfig = settings.providerSettings[providerName as ProviderName];
          providerResults[providerName] = !!(providerConfig?.apiKey || providerConfig?.baseURL);
        }

        results.providers = providerResults;
        results.configuredCount = Object.values(providerResults).filter(Boolean).length;
        results.totalCount = providers.length;
        return { success: true, output: results };
      }

      case 'script': {
        if (!script || !language) {
          return { success: false, error: 'Script and language are required for script test' };
        }
        const scriptResult = await executeScript({
          type: 'execute_script',
          language,
          code: script,
          timeout_secs: (timeout || 30000) / 1000,
        });
        results.scriptResult = {
          success: scriptResult.success,
          exit_code: scriptResult.exit_code,
          stdout: scriptResult.stdout,
          stderr: scriptResult.stderr,
        };
        return {
          success: scriptResult.success,
          output: results,
          error: scriptResult.error,
        };
      }

      case 'health-check':
      default: {
        const checks: Record<string, boolean> = {};

        checks.indexedDB = typeof indexedDB !== 'undefined';
        checks.localStorage = typeof localStorage !== 'undefined';

        try {
          const { schedulerDb } = await import('../scheduler-db');
          await schedulerDb.tasks.count();
          checks.schedulerDB = true;
        } catch {
          checks.schedulerDB = false;
        }

        const allPassed = Object.values(checks).every(Boolean);
        results.checks = checks;
        results.allPassed = allPassed;
        return {
          success: allPassed,
          output: results,
          error: allPassed ? undefined : 'Some health checks failed',
        };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Test task execution failed:`, error);
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
  registerTaskExecutor('ai-generation', executeAIGenerationTask);
  registerTaskExecutor('chat', executeChatTask);
  registerTaskExecutor('test', executeTestTask);
  
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
  executeAIGenerationTask,
  executeChatTask,
  executeTestTask,
};

export {
  cancelPluginTaskExecution,
  getActivePluginTaskCount,
  isPluginTaskExecutionActive,
} from './plugin-executor';
