'use client';

/**
 * useWorkflow - Hook for executing workflows
 * Provides easy access to workflow functionality with progress tracking
 */

import { useCallback, useState, useRef } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';
import type {
  WorkflowExecution,
  WorkflowDefinition,
  WorkflowLog,
  WorkflowType,
  PPTPresentation,
  PPTGenerationOptions,
} from '@/types/workflow';
import {
  executeWorkflow,
  createWorkflowExecution,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  getGlobalWorkflowRegistry,
  type WorkflowExecutorResult,
} from '@/lib/ai/workflows';
import { registerPPTWorkflow } from '@/lib/ai/workflows/ppt-workflow';

export interface UseWorkflowOptions {
  onStart?: (execution: WorkflowExecution) => void;
  onStepStart?: (execution: WorkflowExecution, stepId: string) => void;
  onStepComplete?: (execution: WorkflowExecution, stepId: string, output: unknown) => void;
  onStepError?: (execution: WorkflowExecution, stepId: string, error: string) => void;
  onProgress?: (execution: WorkflowExecution, progress: number) => void;
  onComplete?: (execution: WorkflowExecution) => void;
  onError?: (execution: WorkflowExecution, error: string) => void;
  onLog?: (log: WorkflowLog) => void;
}

export interface UseWorkflowReturn {
  // State
  isRunning: boolean;
  isPaused: boolean;
  progress: number;
  currentStepId: string | null;
  execution: WorkflowExecution | null;
  result: WorkflowExecutorResult | null;
  error: string | null;
  logs: WorkflowLog[];

  // Execution
  run: (
    workflowId: string,
    input: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<WorkflowExecutorResult>;
  runPPT: (options: PPTGenerationOptions) => Promise<WorkflowExecutorResult>;
  pause: () => void;
  resume: () => void;
  cancel: () => void;

  // Workflow management
  getWorkflow: (workflowId: string) => WorkflowDefinition | undefined;
  getWorkflows: () => WorkflowDefinition[];
  getWorkflowsByType: (type: WorkflowType) => WorkflowDefinition[];

  // Utilities
  reset: () => void;
  getLastOutput: () => Record<string, unknown> | undefined;
  getPPTPresentation: () => PPTPresentation | undefined;
}

// Ensure PPT workflow is registered
let workflowsInitialized = false;
function initializeWorkflows(): void {
  if (!workflowsInitialized) {
    registerPPTWorkflow();
    workflowsInitialized = true;
  }
}

export function useWorkflow(options: UseWorkflowOptions = {}): UseWorkflowReturn {
  const {
    onStart,
    onStepStart,
    onStepComplete,
    onStepError,
    onProgress,
    onComplete,
    onError,
    onLog,
  } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [result, setResult] = useState<WorkflowExecutorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);

  const executionRef = useRef<WorkflowExecution | null>(null);

  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = providerSettings[defaultProvider]?.defaultModel || 'gpt-4o';

  // Get API key for current provider
  const getApiKey = useCallback((): string => {
    const settings = providerSettings[defaultProvider];
    return settings?.apiKey || '';
  }, [defaultProvider, providerSettings]);

  // Initialize workflows
  initializeWorkflows();

  // Get workflow from registry
  const getWorkflow = useCallback((workflowId: string): WorkflowDefinition | undefined => {
    const registry = getGlobalWorkflowRegistry();
    return registry.get(workflowId);
  }, []);

  // Get all workflows
  const getWorkflows = useCallback((): WorkflowDefinition[] => {
    const registry = getGlobalWorkflowRegistry();
    return registry.getAll();
  }, []);

  // Get workflows by type
  const getWorkflowsByType = useCallback((type: WorkflowType): WorkflowDefinition[] => {
    const registry = getGlobalWorkflowRegistry();
    return registry.getByType(type);
  }, []);

  // Run a workflow
  const run = useCallback(
    async (
      workflowId: string,
      input: Record<string, unknown>,
      config?: Record<string, unknown>
    ): Promise<WorkflowExecutorResult> => {
      setIsRunning(true);
      setIsPaused(false);
      setProgress(0);
      setCurrentStepId(null);
      setError(null);
      setResult(null);
      setLogs([]);

      const sessionId = `workflow-${Date.now()}`;

      try {
        const workflowResult = await executeWorkflow(
          workflowId,
          sessionId,
          input,
          {
            provider: defaultProvider,
            model: defaultModel,
            apiKey: getApiKey(),
            baseURL: providerSettings[defaultProvider]?.baseURL,
            temperature: 0.7,
            ...config,
          },
          {
            onStart: (exec) => {
              setExecution(exec);
              executionRef.current = exec;
              onStart?.(exec);
            },
            onStepStart: (exec, stepId) => {
              setExecution({ ...exec });
              setCurrentStepId(stepId);
              onStepStart?.(exec, stepId);
            },
            onStepComplete: (exec, stepId, output) => {
              setExecution({ ...exec });
              onStepComplete?.(exec, stepId, output);
            },
            onStepError: (exec, stepId, err) => {
              setExecution({ ...exec });
              onStepError?.(exec, stepId, err);
            },
            onProgress: (exec, prog) => {
              setExecution({ ...exec });
              setProgress(prog);
              onProgress?.(exec, prog);
            },
            onComplete: (exec) => {
              setExecution({ ...exec });
              onComplete?.(exec);
            },
            onError: (exec, err) => {
              setExecution({ ...exec });
              setError(err);
              onError?.(exec, err);
            },
            onLog: (log) => {
              setLogs((prev) => [...prev, log]);
              onLog?.(log);
            },
          }
        );

        setResult(workflowResult);
        if (!workflowResult.success) {
          setError(workflowResult.error || 'Workflow execution failed');
        }
        return workflowResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Workflow execution failed';
        setError(message);
        return {
          execution: executionRef.current || createWorkflowExecution(
            { id: workflowId, name: workflowId, type: 'custom', steps: [], inputs: {}, outputs: {}, version: '1.0', icon: '', category: '', tags: [], description: '' },
            sessionId,
            input
          ),
          success: false,
          error: message,
        };
      } finally {
        setIsRunning(false);
        setCurrentStepId(null);
      }
    },
    [
      defaultProvider,
      defaultModel,
      providerSettings,
      getApiKey,
      onStart,
      onStepStart,
      onStepComplete,
      onStepError,
      onProgress,
      onComplete,
      onError,
      onLog,
    ]
  );

  // Run PPT generation workflow
  const runPPT = useCallback(
    async (pptOptions: PPTGenerationOptions): Promise<WorkflowExecutorResult> => {
      return run('ppt-generation', {
        topic: pptOptions.topic,
        description: pptOptions.description,
        slideCount: pptOptions.slideCount || 10,
        style: pptOptions.style || 'professional',
        targetAudience: pptOptions.targetAudience,
        language: pptOptions.language || 'en',
      });
    },
    [run]
  );

  // Pause execution
  const pause = useCallback(() => {
    if (executionRef.current && isRunning) {
      pauseWorkflow(executionRef.current);
      setIsPaused(true);
      setExecution({ ...executionRef.current });
    }
  }, [isRunning]);

  // Resume execution
  const resume = useCallback(() => {
    if (executionRef.current && isPaused) {
      resumeWorkflow(executionRef.current);
      setIsPaused(false);
      setExecution({ ...executionRef.current });
    }
  }, [isPaused]);

  // Cancel execution
  const cancel = useCallback(() => {
    if (executionRef.current && (isRunning || isPaused)) {
      cancelWorkflow(executionRef.current);
      setIsRunning(false);
      setIsPaused(false);
      setExecution({ ...executionRef.current });
    }
  }, [isRunning, isPaused]);

  // Reset state
  const reset = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentStepId(null);
    setExecution(null);
    setResult(null);
    setError(null);
    setLogs([]);
    executionRef.current = null;
  }, []);

  // Get last output
  const getLastOutput = useCallback((): Record<string, unknown> | undefined => {
    return result?.output || execution?.output;
  }, [result, execution]);

  // Get PPT presentation from result
  const getPPTPresentation = useCallback((): PPTPresentation | undefined => {
    const output = getLastOutput();
    if (output?.presentation) {
      return output.presentation as PPTPresentation;
    }
    return undefined;
  }, [getLastOutput]);

  return {
    isRunning,
    isPaused,
    progress,
    currentStepId,
    execution,
    result,
    error,
    logs,
    run,
    runPPT,
    pause,
    resume,
    cancel,
    getWorkflow,
    getWorkflows,
    getWorkflowsByType,
    reset,
    getLastOutput,
    getPPTPresentation,
  };
}

export default useWorkflow;
