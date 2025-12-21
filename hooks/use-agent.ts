'use client';

/**
 * useAgent - Hook for multi-step AI agent execution
 * Provides easy access to agent functionality with tool calling
 */

import { useCallback, useState, useRef } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';
import {
  executeAgent,
  executeAgentLoop,
  createAgent,
  type AgentConfig,
  type AgentResult,
  type AgentTool,
  type ToolCall,
  type AgentLoopResult,
} from '@/lib/ai/agent';

export interface UseAgentOptions {
  systemPrompt?: string;
  maxSteps?: number;
  temperature?: number;
  tools?: Record<string, AgentTool>;
  enablePlanning?: boolean;
  onStepStart?: (step: number) => void;
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
}

export interface UseAgentReturn {
  // State
  isRunning: boolean;
  currentStep: number;
  error: string | null;
  result: AgentResult | AgentLoopResult | null;
  toolCalls: ToolCall[];

  // Execution
  run: (prompt: string) => Promise<AgentResult>;
  runWithPlanning: (task: string) => Promise<AgentLoopResult>;
  stop: () => void;

  // Tool management
  registerTool: (name: string, tool: AgentTool) => void;
  unregisterTool: (name: string) => void;
  getRegisteredTools: () => string[];

  // Utilities
  reset: () => void;
  getLastResponse: () => string;
}

export function useAgent(options: UseAgentOptions = {}): UseAgentReturn {
  const {
    systemPrompt = 'You are a helpful AI assistant.',
    maxSteps = 10,
    temperature = 0.7,
    tools: initialTools = {},
    enablePlanning = false,
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
  } = options;

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | AgentLoopResult | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [registeredTools, setRegisteredTools] = useState<Record<string, AgentTool>>(initialTools);

  const abortRef = useRef(false);

  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = providerSettings[defaultProvider]?.defaultModel || 'gpt-4o';

  // Get API key for current provider
  const getApiKey = useCallback((): string => {
    const settings = providerSettings[defaultProvider];
    return settings?.apiKey || '';
  }, [defaultProvider, providerSettings]);

  // Build agent config
  const buildConfig = useCallback((): Omit<AgentConfig, 'provider' | 'model' | 'apiKey'> => {
    return {
      systemPrompt,
      temperature,
      maxSteps,
      tools: registeredTools,
      onStepStart: (step) => {
        setCurrentStep(step);
        onStepStart?.(step);
      },
      onStepComplete: (step, response, calls) => {
        onStepComplete?.(step, response, calls);
      },
      onToolCall: (call) => {
        setToolCalls((prev) => [...prev, call]);
        onToolCall?.(call);
      },
      onToolResult: (call) => {
        setToolCalls((prev) =>
          prev.map((c) => (c.id === call.id ? call : c))
        );
        onToolResult?.(call);
      },
      onError: (err) => {
        setError(err.message);
      },
    };
  }, [
    systemPrompt,
    temperature,
    maxSteps,
    registeredTools,
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
  ]);

  // Run agent
  const run = useCallback(async (prompt: string): Promise<AgentResult> => {
    setIsRunning(true);
    setCurrentStep(0);
    setError(null);
    setResult(null);
    setToolCalls([]);
    abortRef.current = false;

    try {
      const config = buildConfig();
      const agentResult = await executeAgent(prompt, {
        ...config,
        provider: defaultProvider,
        model: defaultModel,
        apiKey: getApiKey(),
      });

      setResult(agentResult);
      if (!agentResult.success) {
        setError(agentResult.error || 'Agent execution failed');
      }
      return agentResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent execution failed';
      setError(message);
      return {
        success: false,
        finalResponse: '',
        steps: [],
        totalSteps: currentStep,
        duration: 0,
        error: message,
      };
    } finally {
      setIsRunning(false);
    }
  }, [buildConfig, defaultProvider, defaultModel, getApiKey, currentStep]);

  // Run with planning
  const runWithPlanning = useCallback(async (task: string): Promise<AgentLoopResult> => {
    setIsRunning(true);
    setCurrentStep(0);
    setError(null);
    setResult(null);
    setToolCalls([]);
    abortRef.current = false;

    try {
      const loopResult = await executeAgentLoop(task, {
        provider: defaultProvider,
        model: defaultModel,
        apiKey: getApiKey(),
        tools: registeredTools,
        maxStepsPerTask: Math.ceil(maxSteps / 3),
        maxTotalSteps: maxSteps,
        planningEnabled: enablePlanning,
        onTaskStart: (_agentTask) => {
          setCurrentStep((prev) => prev + 1);
        },
        onTaskComplete: () => {
          // Task completed
        },
        onProgress: (progress) => {
          setCurrentStep(progress.completed);
        },
      });

      setResult(loopResult);
      if (!loopResult.success) {
        setError(loopResult.error || 'Agent loop failed');
      }
      return loopResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent loop failed';
      setError(message);
      return {
        success: false,
        tasks: [],
        totalSteps: currentStep,
        duration: 0,
        error: message,
      };
    } finally {
      setIsRunning(false);
    }
  }, [
    defaultProvider,
    defaultModel,
    getApiKey,
    registeredTools,
    maxSteps,
    enablePlanning,
    currentStep,
  ]);

  // Stop execution
  const stop = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
  }, []);

  // Register tool
  const registerTool = useCallback((name: string, tool: AgentTool) => {
    setRegisteredTools((prev) => ({ ...prev, [name]: tool }));
  }, []);

  // Unregister tool
  const unregisterTool = useCallback((name: string) => {
    setRegisteredTools((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Get registered tools
  const getRegisteredTools = useCallback((): string[] => {
    return Object.keys(registeredTools);
  }, [registeredTools]);

  // Reset state
  const reset = useCallback(() => {
    setIsRunning(false);
    setCurrentStep(0);
    setError(null);
    setResult(null);
    setToolCalls([]);
    abortRef.current = false;
  }, []);

  // Get last response
  const getLastResponse = useCallback((): string => {
    if (!result) return '';
    if ('finalResponse' in result) {
      return result.finalResponse;
    }
    if ('finalSummary' in result) {
      return result.finalSummary || '';
    }
    return '';
  }, [result]);

  return {
    isRunning,
    currentStep,
    error,
    result,
    toolCalls,
    run,
    runWithPlanning,
    stop,
    registerTool,
    unregisterTool,
    getRegisteredTools,
    reset,
    getLastResponse,
  };
}

/**
 * Create a pre-configured agent instance
 */
export function useConfiguredAgent(tools: Record<string, AgentTool>) {
  const agent = createAgent({ tools });
  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = providerSettings[defaultProvider]?.defaultModel || 'gpt-4o';

  const getApiKey = useCallback((): string => {
    const settings = providerSettings[defaultProvider];
    return settings?.apiKey || '';
  }, [defaultProvider, providerSettings]);

  const run = useCallback(async (prompt: string) => {
    return agent.run(prompt, {
      provider: defaultProvider,
      model: defaultModel,
      apiKey: getApiKey(),
    });
  }, [agent, defaultProvider, defaultModel, getApiKey]);

  return { run, addTool: agent.addTool, removeTool: agent.removeTool };
}

export default useAgent;
