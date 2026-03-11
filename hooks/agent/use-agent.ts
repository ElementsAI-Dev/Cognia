'use client';

/**
 * useAgent - Hook for multi-step AI agent execution
 * Provides easy access to agent functionality with tool calling
 */

import { useCallback, useState, useRef, useMemo } from 'react';
import { useSettingsStore, useSkillStore, useMcpStore, useVectorStore } from '@/stores';
import { useAgentObservabilityConfig } from '@/hooks/ai/use-agent-observability';
import { useContext as useSystemContext } from '@/hooks/context';
import { useSessionStore } from '@/stores/chat';
import type { ProviderName } from '@/types/provider';
import type { Skill } from '@/types/system/skill';
import {
  isEmbeddingProviderConfigured,
  resolveEmbeddingApiKey,
} from '@/lib/vector/embedding';
import {
  executeAgent,
  executeAgentLoop,
  createAgentLoopCancellationToken,
  executeContextAwareAgent,
  createAgent,
  createMcpToolsFromStore,
  createRAGSearchTool,
  createListRAGCollectionsTool,
  buildRAGConfigFromSettings,
  getMcpToolsWithSelection,
  type AgentConfig,
  type AgentResult,
  type AgentTool,
  type ToolCall,
  type AgentLoopResult,
  type ContextAwareAgentConfig,
  type ContextAwareAgentResult,
} from '@/lib/ai/agent';
import { loggers } from '@/lib/logger';
import {
  composeContextPrompt,
  type ContextPromptSection,
} from '@/lib/context/prompt-composer';

const log = loggers.agent;
import type { McpToolSelectionConfig, ToolUsageRecord } from '@/types/mcp';
import { DEFAULT_TOOL_SELECTION_CONFIG } from '@/types/mcp';
import { 
  buildMultiSkillSystemPrompt, 
  createSkillTools,
  getAutoLoadSkillsForTools,
} from '@/lib/skills/executor';
import { useBackgroundAgentStore } from '@/stores/agent';
import { getBackgroundAgentManager } from '@/lib/ai/agent/background-agent-manager';
import type { BackgroundAgent } from '@/types/agent/background-agent';

const SYSTEM_CONTEXT_MAX_AGE_MS = 2 * 60 * 1000;

const PROMPT_SECTION_BUDGETS: Record<string, number> = {
  'system-context': 3000,
  skills: 12000,
  'base-system-prompt': 24000,
};

export interface UseAgentOptions {
  systemPrompt?: string;
  maxSteps?: number;
  temperature?: number;
  tools?: Record<string, AgentTool>;
  enablePlanning?: boolean;
  enableSkills?: boolean;
  enableMcpTools?: boolean;
  enableRAG?: boolean;
  mcpRequireApproval?: boolean;
  /** Configuration for intelligent MCP tool selection */
  mcpToolSelectionConfig?: Partial<McpToolSelectionConfig>;
  /** Tool usage history for relevance boosting */
  mcpToolUsageHistory?: Map<string, ToolUsageRecord>;
  /** Current query for tool relevance scoring (updated dynamically) */
  currentQuery?: string;
  /** Enable context-aware execution (file persistence for long outputs) */
  enableContextFiles?: boolean;
  /** Inject context tools (read_context_file, tail_context_file, etc.) */
  injectContextTools?: boolean;
  /** Maximum inline output size before persisting to file */
  maxInlineOutputSize?: number;
  /** Enable system context injection (window, app, file, browser, editor) */
  enableSystemContext?: boolean;
  onStepStart?: (step: number) => void;
  onStepComplete?: (step: number, response: string, toolCalls: ToolCall[]) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolResult?: (toolCall: ToolCall) => void;
  /** Called when tool selection is applied */
  onToolSelection?: (selectedCount: number, totalCount: number, reason: string) => void;
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
  runInBackground: (name: string, task: string) => BackgroundAgent;
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
    enableSkills = true,
    enableMcpTools = true,
    enableRAG = true,
    mcpRequireApproval = false,
    mcpToolSelectionConfig,
    mcpToolUsageHistory,
    currentQuery = '',
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
    onToolSelection,
  } = options;

  // Get provider settings first (needed for RAG config)
  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = defaultProviderRaw as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = providerSettings[defaultProvider]?.defaultModel || 'gpt-4o';
  const observabilityConfig = useAgentObservabilityConfig();
  const activeSession = useSessionStore((state) => state.getActiveSession());

  // Get active skills from store
  const activeSkillIds = useSkillStore((state) => state.activeSkillIds);
  const skills = useSkillStore((state) => state.skills);
  const activeSkills = useMemo(
    () => activeSkillIds.map((id) => skills[id]).filter((s): s is Skill => s !== undefined),
    [activeSkillIds, skills]
  );

  // Get MCP servers and tools from store
  const mcpServers = useMcpStore((state) => state.servers);
  const mcpCallTool = useMcpStore((state) => state.callTool);

  // Get vector store settings and collections for RAG
  const vectorSettings = useVectorStore((state) => state.settings);
  const vectorCollections = useVectorStore((state) => state.collections);
  const getCollectionNames = useVectorStore((state) => state.getCollectionNames);

  // Get system context (window, app, file, browser, editor)
  const { context: systemContext } = useSystemContext();

  // Build system context section for prompt composition
  const systemContextSection = useMemo<ContextPromptSection | null>(() => {
    const enableSysContext = options.enableSystemContext ?? true;
    if (!enableSysContext || !systemContext) return null;

    const parts: string[] = [];

    if (systemContext.app) {
      parts.push(`Current App: ${systemContext.app.app_name} (${systemContext.app.app_type})`);
    }
    if (systemContext.window?.title) {
      parts.push(`Window: ${systemContext.window.title}`);
    }

    if (systemContext.file) {
      if (systemContext.file.path) {
        parts.push(`File: ${systemContext.file.path}`);
      }
      if (systemContext.file.language) {
        parts.push(`Language: ${systemContext.file.language}`);
      }
    }

    if (systemContext.browser) {
      if (systemContext.browser.url) {
        parts.push(`Browser URL: ${systemContext.browser.url}`);
      } else if (systemContext.browser.page_title) {
        parts.push(`Browser Page: ${systemContext.browser.page_title}`);
      }
    }

    if (systemContext.editor) {
      parts.push(`Editor: ${systemContext.editor.editor_name}`);
      if (systemContext.editor.line_number) {
        parts.push(
          `Cursor Position: Line ${systemContext.editor.line_number}, Column ${systemContext.editor.column_number || 1}`
        );
      }
    }

    if (parts.length === 0) return null;

    return {
      source: 'system-context',
      content: `## Current User Context\n${parts.join('\n')}\n`,
      priority: 10,
      createdAt: systemContext.timestamp,
      ephemeral: true,
      maxAgeMs: SYSTEM_CONTEXT_MAX_AGE_MS,
    };
  }, [systemContext, options.enableSystemContext]);

  // Get agent optimization settings for Skills-MCP auto-loading
  const agentOptSettings = useSettingsStore((state) => state.agentOptimizationSettings);

  // Build skills system prompt using the optimized utility function
  const skillsSystemPrompt = useMemo(() => {
    if (!enableSkills || activeSkills.length === 0) return '';
    return buildMultiSkillSystemPrompt(activeSkills, {
      maxContentLength: 8000,
      includeResources: true,
    });
  }, [enableSkills, activeSkills]);

  // Create skill tools for agent to use
  const skillTools = useMemo(() => {
    if (!enableSkills || activeSkills.length === 0) return {};
    return createSkillTools(activeSkills);
  }, [enableSkills, activeSkills]);

  // Create MCP tools for agent to use with intelligent selection
  const mcpTools = useMemo(() => {
    if (!enableMcpTools || mcpServers.length === 0) return {};

    // First, create all MCP tools
    const allMcpTools = createMcpToolsFromStore(mcpServers, mcpCallTool, {
      requireApproval: mcpRequireApproval,
    });

    // Merge with default config
    const selectionConfig: McpToolSelectionConfig = {
      ...DEFAULT_TOOL_SELECTION_CONFIG,
      ...mcpToolSelectionConfig,
    };

    // If selection is enabled and we have a query, apply intelligent selection
    const totalToolCount = Object.keys(allMcpTools).length;
    if (selectionConfig.strategy !== 'manual' && totalToolCount > selectionConfig.maxTools) {
      const { tools: selectedTools, selection } = getMcpToolsWithSelection(
        allMcpTools,
        { query: currentQuery },
        selectionConfig,
        mcpToolUsageHistory
      );

      // Notify about selection
      if (onToolSelection && selection.wasLimited) {
        onToolSelection(
          selection.selectedToolNames.length,
          selection.totalAvailable,
          selection.selectionReason
        );
      }

      return selectedTools;
    }

    return allMcpTools;
  }, [
    enableMcpTools,
    mcpServers,
    mcpCallTool,
    mcpRequireApproval,
    mcpToolSelectionConfig,
    mcpToolUsageHistory,
    currentQuery,
    onToolSelection,
  ]);

  // Build RAG config from vector store settings
  const ragConfig = useMemo(() => {
    if (!enableRAG) return undefined;
    if (
      !isEmbeddingProviderConfigured(
        vectorSettings.embeddingProvider,
        providerSettings as Record<string, { apiKey?: string }>
      )
    ) {
      return undefined;
    }
    const embeddingApiKey = resolveEmbeddingApiKey(
      vectorSettings.embeddingProvider,
      providerSettings as Record<string, { apiKey?: string }>
    );
    return buildRAGConfigFromSettings(vectorSettings, embeddingApiKey);
  }, [enableRAG, vectorSettings, providerSettings]);

  // Compose deterministic system prompt with context sections.
  const effectiveSystemPrompt = useMemo(() => {
    const sections: ContextPromptSection[] = [];

    if (systemContextSection) {
      sections.push(systemContextSection);
    }

    if (skillsSystemPrompt) {
      sections.push({
        source: 'skills',
        content: skillsSystemPrompt,
        priority: 20,
      });
    }

    if (systemPrompt) {
      sections.push({
        source: 'base-system-prompt',
        content: systemPrompt,
        priority: 50,
        dedupeKey: 'base-system-prompt',
        redact: false,
      });
    }

    return composeContextPrompt(sections, {
      separator: '\n\n---\n\n',
      sectionBudgets: PROMPT_SECTION_BUDGETS,
    });
  }, [systemPrompt, skillsSystemPrompt, systemContextSection]);

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentResult | AgentLoopResult | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [registeredTools, setRegisteredTools] = useState<Record<string, AgentTool>>(initialTools);

  const abortRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const planningCancellationRef = useRef<ReturnType<typeof createAgentLoopCancellationToken> | null>(null);

  // Get API key for current provider
  const getApiKey = useCallback((): string => {
    const settings = providerSettings[defaultProvider];
    return settings?.apiKey || '';
  }, [defaultProvider, providerSettings]);

  // Create RAG search tool if config is available
  const ragTools = useMemo((): Record<string, AgentTool> => {
    if (!ragConfig) return {};

    const collectionNames = getCollectionNames();
    const tools: Record<string, AgentTool> = {
      rag_search: createRAGSearchTool(ragConfig, {
        availableCollections: collectionNames,
        defaultCollectionName: vectorSettings.defaultCollectionName,
      }),
    };

    // Add collection listing tool for discovery
    if (vectorCollections.length > 0) {
      tools.list_rag_collections = createListRAGCollectionsTool(() =>
        vectorCollections.map((c) => ({
          name: c.name,
          description: c.description,
          documentCount: c.documentCount,
        }))
      );
    }

    return tools;
  }, [ragConfig, getCollectionNames, vectorSettings.defaultCollectionName, vectorCollections]);

  // Auto-load skills based on active MCP tools (Claude Best Practice)
  const mcpAutoLoadedSkillsPrompt = useMemo(() => {
    if (!agentOptSettings?.enableSkillMcpAutoLoad || !enableMcpTools) return '';
    
    // Get active MCP tool names
    const mcpToolNames = Object.keys(mcpTools);
    if (mcpToolNames.length === 0) return '';
    
    // Find skills that should be auto-loaded for these tools
    const allSkills = Object.values(skills);
    const autoLoadedSkills = getAutoLoadSkillsForTools(allSkills, mcpToolNames);
    
    if (autoLoadedSkills.length === 0) return '';
    
    // Build prompt for auto-loaded skills (avoiding duplicates with already active)
    const newSkills = autoLoadedSkills.filter(s => !activeSkillIds.includes(s.id));
    if (newSkills.length === 0) return '';
    
    return buildMultiSkillSystemPrompt(newSkills, {
      maxContentLength: 4000, // Smaller budget for auto-loaded
      includeResources: false,
    });
  }, [agentOptSettings?.enableSkillMcpAutoLoad, enableMcpTools, mcpTools, skills, activeSkillIds]);

  // Merge skill tools, MCP tools, RAG tools, and registered tools
  const allTools = useMemo(
    () => ({
      ...skillTools,
      ...mcpTools,
      ...ragTools,
      ...registeredTools,
    }),
    [skillTools, mcpTools, ragTools, registeredTools]
  );

  // Build agent config with enhanced system prompt including MCP auto-loaded skills
  const buildConfig = useCallback((): Omit<AgentConfig, 'provider' | 'model' | 'apiKey'> & {
    systemPrompt?: string;
  } => {
    // Combine base composed prompt with optional auto-loaded MCP skills.
    const promptSections: ContextPromptSection[] = [];
    if (effectiveSystemPrompt) {
      promptSections.push({
        source: 'base-system-prompt',
        content: effectiveSystemPrompt,
        priority: 50,
        dedupeKey: 'use-agent-effective-system-prompt',
        redact: false,
      });
    }

    if (mcpAutoLoadedSkillsPrompt) {
      promptSections.push({
        source: 'skills',
        content: `## Auto-Loaded Skills for MCP Tools\n${mcpAutoLoadedSkillsPrompt}`,
        priority: 25,
      });
    }

    const enhancedPrompt = composeContextPrompt(promptSections, {
      separator: '\n\n---\n\n',
      sectionBudgets: PROMPT_SECTION_BUDGETS,
    });
    
    return {
      systemPrompt: enhancedPrompt,
      temperature,
      maxSteps,
      tools: allTools,
      sessionId: `agent-${Date.now()}`, // Generate session ID for observability
      enableObservability: observabilityConfig.enableObservability,
      enableLangfuse: observabilityConfig.enableLangfuse,
      enableOpenTelemetry: observabilityConfig.enableOpenTelemetry,
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
        setToolCalls((prev) => prev.map((c) => (c.id === call.id ? call : c)));
        onToolResult?.(call);
      },
    };
  }, [
    effectiveSystemPrompt,
    mcpAutoLoadedSkillsPrompt,
    temperature,
    maxSteps,
    allTools,
    observabilityConfig,
    onStepStart,
    onStepComplete,
    onToolCall,
    onToolResult,
  ]);

  // Run agent
  const run = useCallback(
    async (prompt: string): Promise<AgentResult> => {
      setIsRunning(true);
      setCurrentStep(0);
      setError(null);
      setResult(null);
      setToolCalls([]);
      abortRef.current = false;
      planningCancellationRef.current = createAgentLoopCancellationToken();
      abortControllerRef.current = new AbortController();

      try {
        const config = buildConfig();

        // Use context-aware executor if enabled
        const enableContextAware = options.enableContextFiles ?? true;
        const enableCtxTools = options.injectContextTools ?? true;

        let agentResult: AgentResult;

        if (enableContextAware || enableCtxTools) {
          const ctxResult = await executeContextAwareAgent(prompt, {
            ...config,
            provider: defaultProvider,
            model: defaultModel,
            apiKey: getApiKey(),
            enableContextFiles: enableContextAware,
            injectContextTools: enableCtxTools,
            maxInlineOutputSize: options.maxInlineOutputSize ?? 4000,
            abortSignal: abortControllerRef.current.signal,
            onToolOutputPersisted: (ref) => {
              log.debug('Tool output persisted', { path: ref.path, sizeSummary: ref.sizeSummary });
            },
          } as ContextAwareAgentConfig);

          agentResult = ctxResult as AgentResult;

          // Log context stats if available
          const ctxTypedResult = ctxResult as ContextAwareAgentResult;
          if (ctxTypedResult.persistedOutputs && ctxTypedResult.persistedOutputs.length > 0) {
            log.info('Context outputs persisted', {
              count: ctxTypedResult.persistedOutputs.length,
              tokensSaved: ctxTypedResult.tokensSaved || 0,
            });
          }
        } else {
          agentResult = await executeAgent(prompt, {
            ...config,
            provider: defaultProvider,
            model: defaultModel,
            apiKey: getApiKey(),
            abortSignal: abortControllerRef.current.signal,
          });
        }

        setResult(agentResult);
        if (!agentResult.success) {
          setError(agentResult.error || 'Agent execution failed');
        }
        return agentResult;
      } catch (err: unknown) {
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
        abortControllerRef.current = null;
        setIsRunning(false);
      }
    },
    [
      buildConfig,
      defaultProvider,
      defaultModel,
      getApiKey,
      currentStep,
      options.enableContextFiles,
      options.injectContextTools,
      options.maxInlineOutputSize,
    ]
  );

  // Run with planning
  const runWithPlanning = useCallback(
    async (task: string): Promise<AgentLoopResult> => {
      setIsRunning(true);
      setCurrentStep(0);
      setError(null);
      setResult(null);
      setToolCalls([]);
      abortRef.current = false;
      planningCancellationRef.current = createAgentLoopCancellationToken();

      try {
        const loopResult = await executeAgentLoop(task, {
          provider: defaultProvider,
          model: defaultModel,
          apiKey: getApiKey(),
          tools: allTools,
          maxStepsPerTask: Math.ceil(maxSteps / 3),
          maxTotalSteps: maxSteps,
          planningEnabled: enablePlanning,
          cancellationToken: planningCancellationRef.current ?? undefined,
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
        planningCancellationRef.current = null;
        setIsRunning(false);
      }
    },
    [
      defaultProvider,
      defaultModel,
      getApiKey,
      allTools,
      maxSteps,
      enablePlanning,
      currentStep,
    ]
  );

  // Background agent store
  const openBackgroundPanel = useBackgroundAgentStore((state) => state.openPanel);

  // Run in background
  const runInBackground = useCallback(
    (name: string, task: string): BackgroundAgent => {
      const manager = getBackgroundAgentManager();
      const resolvedSessionId = activeSession?.id || 'background-global-session';

      const agent = manager.createAgent({
        sessionId: resolvedSessionId,
        name,
        task,
        config: {
          provider: defaultProvider,
          model: defaultModel,
          maxSteps: maxSteps,
          timeout: 300000, // 5 minutes default
          notifyOnComplete: true,
          notifyOnError: true,
          autoRetry: true,
          maxRetries: 2,
          persistState: true,
          runInBackground: true,
        },
        priority: 5,
      });

      const queued = manager.queueAgent(agent.id);
      if (!queued) {
        void manager.startAgent(agent.id);
      }

      // Open the background panel to show the new agent
      openBackgroundPanel();

      return agent;
    },
    [activeSession?.id, openBackgroundPanel, defaultProvider, defaultModel, maxSteps]
  );

  // Stop execution
  const stop = useCallback(() => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    planningCancellationRef.current?.cancel();
    planningCancellationRef.current = null;
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
    abortControllerRef.current = null;
    planningCancellationRef.current = null;
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
    runInBackground,
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

  const run = useCallback(
    async (prompt: string) => {
      return agent.run(prompt, {
        provider: defaultProvider,
        model: defaultModel,
        apiKey: getApiKey(),
      });
    },
    [agent, defaultProvider, defaultModel, getApiKey]
  );

  return { run, addTool: agent.addTool, removeTool: agent.removeTool };
}

export default useAgent;
