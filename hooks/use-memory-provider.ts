'use client';

/**
 * useMemoryProvider - Unified hook for memory provider management
 * 
 * Supports multiple backends:
 * - Local storage (default)
 * - Mem0 via MCP or direct API
 * 
 * Features:
 * - Automatic provider switching based on settings
 * - Two-phase memory pipeline integration
 * - Seamless sync between providers
 * - Reuses existing MCP store patterns
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoryStore, useMcpStore, useSettingsStore } from '@/stores';
import { Mem0Provider, createMem0Provider } from '@/lib/ai/memory';
import {
  extractMemoryCandidates,
  applyDecisions,
  runMemoryPipeline,
  type ConversationMessage,
  // New modules
  MemoryActivator,
  createMemoryActivator,
  HybridRetriever,
  createHybridRetriever,
  WorkingMemory,
  createWorkingMemory,
  type ActivatedMemory,
  type ScoredMemory,
  type MemoryActivationContext,
  type HybridSearchOptions,
} from '@/lib/ai/memory';
import type {
  Memory,
  CreateMemoryInput,
  UpdateMemoryInput,
  MemorySettings,
  MemoryPipelineConfig,
  ExtractedMemory,
  MemoryUpdateDecision,
} from '@/types';
import { DEFAULT_PIPELINE_CONFIG } from '@/types/memory-provider';
import type { EmbeddingConfig } from '@/lib/ai/embedding/embedding';

export interface UseMemoryProviderOptions {
  /** Session ID for scoped memories */
  sessionId?: string;
  /** Override provider type */
  forceProvider?: 'local' | 'mem0';
}

export interface PipelineResult {
  candidates: ExtractedMemory[];
  decisions: MemoryUpdateDecision[];
  applied: { added: number; updated: number; deleted: number; skipped: number };
}

export interface UseMemoryProviderReturn {
  // Provider info
  provider: 'local' | 'mem0';
  isReady: boolean;
  isLoading: boolean;
  error: string | null;

  // Core operations (unified interface)
  addMemory: (input: CreateMemoryInput) => Promise<Memory>;
  getMemory: (id: string) => Promise<Memory | null>;
  getMemories: () => Promise<Memory[]>;
  updateMemory: (id: string, updates: UpdateMemoryInput) => Promise<Memory | null>;
  deleteMemory: (id: string) => Promise<boolean>;
  searchMemories: (query: string, limit?: number) => Promise<Memory[]>;

  // Pipeline operations
  runPipeline: (messages: ConversationMessage[]) => Promise<PipelineResult>;
  extractCandidates: (messages: ConversationMessage[]) => ExtractedMemory[];

  // Enhanced retrieval (new)
  activateMemories: (context: MemoryActivationContext) => Promise<ActivatedMemory[]>;
  hybridSearch: (options: HybridSearchOptions) => Promise<ScoredMemory[]>;

  // Working memory (new)
  workingMemory: WorkingMemory | null;
  getWorkingMemoryPrompt: () => string;

  // Sync operations
  sync: () => Promise<void>;
  lastSyncTime: Date | null;

  // Settings
  settings: MemorySettings;
  updateSettings: (updates: Partial<MemorySettings>) => void;
}

export function useMemoryProvider(
  options: UseMemoryProviderOptions = {}
): UseMemoryProviderReturn {
  const { sessionId, forceProvider } = options;

  // Store access
  const memoryStore = useMemoryStore();
  const mcpStore = useMcpStore();
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Mem0 provider instance
  const mem0ProviderRef = useRef<Mem0Provider | null>(null);

  // New module instances
  const activatorRef = useRef<MemoryActivator | null>(null);
  const retrieverRef = useRef<HybridRetriever | null>(null);
  const workingMemoryRef = useRef<WorkingMemory | null>(null);

  // Determine active provider
  const activeProvider = useMemo(() => {
    return forceProvider || memoryStore.settings.provider || 'local';
  }, [forceProvider, memoryStore.settings.provider]);

  // Initialize new modules
  useEffect(() => {
    const embeddingConfig = providerSettings.openai?.enabled && providerSettings.openai?.apiKey
      ? { provider: 'openai' as const, apiKey: providerSettings.openai.apiKey }
      : undefined;

    // Create activator
    activatorRef.current = createMemoryActivator({
      enableSemantic: !!embeddingConfig,
      embeddingConfig,
    });

    // Create hybrid retriever
    retrieverRef.current = createHybridRetriever({
      enableVectorSearch: !!embeddingConfig,
      embeddingConfig,
    });

    // Create working memory for session
    if (sessionId) {
      workingMemoryRef.current = createWorkingMemory(sessionId);
    }
  }, [sessionId, providerSettings]);

  // Check if mem0 is properly configured
  const isMem0Ready = useMemo(() => {
    const { mem0ApiKey, mem0UserId } = memoryStore.settings;
    return activeProvider === 'mem0' && !!mem0ApiKey && !!mem0UserId;
  }, [activeProvider, memoryStore.settings]);

  // Initialize mem0 provider when needed
  useEffect(() => {
    if (activeProvider !== 'mem0' || !isMem0Ready) {
      mem0ProviderRef.current = null;
      return;
    }

    const { mem0ApiKey, mem0UserId, mem0EnableGraph, mem0UseMcp, mem0McpServerId } =
      memoryStore.settings;

    // Create mem0 provider
    const callTool = mem0UseMcp && mem0McpServerId
      ? (serverId: string, toolName: string, args: Record<string, unknown>) =>
          mcpStore.callTool(serverId, toolName, args)
      : undefined;

    mem0ProviderRef.current = createMem0Provider(
      {
        apiKey: mem0ApiKey!,
        userId: mem0UserId!,
        enableGraph: mem0EnableGraph,
        useMcp: mem0UseMcp,
        mcpServerId: mem0McpServerId,
      },
      callTool
    );
  }, [activeProvider, isMem0Ready, memoryStore.settings, mcpStore]);

  // Get embedding config for pipeline
  const getEmbeddingConfig = useCallback((): EmbeddingConfig | null => {
    const providers: Array<'openai' | 'google' | 'cohere' | 'mistral' | 'ollama'> = [
      'openai', 'google', 'cohere', 'mistral', 'ollama',
    ];

    for (const provider of providers) {
      const settings = providerSettings[provider];
      if (settings?.enabled && (settings.apiKey || provider === 'ollama')) {
        return {
          provider,
          apiKey: settings.apiKey || '',
          baseURL: settings.baseURL,
        };
      }
    }
    return null;
  }, [providerSettings]);

  // Pipeline config from settings
  const pipelineConfig = useMemo((): MemoryPipelineConfig => ({
    enablePipeline: memoryStore.settings.enablePipeline,
    recentMessageCount: memoryStore.settings.pipelineRecentMessages,
    enableSummary: memoryStore.settings.enableRollingSummary,
    maxCandidates: DEFAULT_PIPELINE_CONFIG.maxCandidates,
    similarityThreshold: memoryStore.settings.conflictThreshold,
    topKSimilar: DEFAULT_PIPELINE_CONFIG.topKSimilar,
  }), [memoryStore.settings]);

  // === Unified Operations ===

  const addMemory = useCallback(async (input: CreateMemoryInput): Promise<Memory> => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeProvider === 'mem0' && mem0ProviderRef.current) {
        return await mem0ProviderRef.current.addMemory(input, memoryStore.settings.mem0UserId);
      }

      // Local provider
      return memoryStore.createMemory({
        ...input,
        sessionId: input.sessionId || sessionId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add memory';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, memoryStore, sessionId]);

  const getMemory = useCallback(async (id: string): Promise<Memory | null> => {
    if (activeProvider === 'mem0' && mem0ProviderRef.current) {
      return mem0ProviderRef.current.getMemory(id);
    }
    return memoryStore.getMemory(id) || null;
  }, [activeProvider, memoryStore]);

  const getMemories = useCallback(async (): Promise<Memory[]> => {
    setIsLoading(true);
    try {
      if (activeProvider === 'mem0' && mem0ProviderRef.current) {
        return await mem0ProviderRef.current.getMemories({
          sessionId,
          userId: memoryStore.settings.mem0UserId,
        });
      }

      // Local provider - filter by session if specified
      const memories = memoryStore.memories;
      if (sessionId) {
        return memories.filter(
          m => !m.sessionId || m.sessionId === sessionId || m.scope === 'global'
        );
      }
      return memories;
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, memoryStore, sessionId]);

  const updateMemory = useCallback(async (
    id: string,
    updates: UpdateMemoryInput
  ): Promise<Memory | null> => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeProvider === 'mem0' && mem0ProviderRef.current) {
        return await mem0ProviderRef.current.updateMemory(id, updates);
      }

      memoryStore.updateMemory(id, updates);
      return memoryStore.getMemory(id) || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update memory';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, memoryStore]);

  const deleteMemory = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (activeProvider === 'mem0' && mem0ProviderRef.current) {
        return await mem0ProviderRef.current.deleteMemory(id);
      }

      memoryStore.deleteMemory(id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete memory';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, memoryStore]);

  const searchMemories = useCallback(async (
    query: string,
    limit: number = 10
  ): Promise<Memory[]> => {
    setIsLoading(true);
    try {
      if (activeProvider === 'mem0' && mem0ProviderRef.current) {
        const results = await mem0ProviderRef.current.searchMemories(query, { limit });
        return results.map(r => r.memory);
      }

      // Local search
      return memoryStore.searchMemories(query).slice(0, limit);
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider, memoryStore]);

  // === Pipeline Operations ===

  const extractCandidates = useCallback((
    messages: ConversationMessage[]
  ): ExtractedMemory[] => {
    if (!pipelineConfig.enablePipeline) return [];
    return extractMemoryCandidates({ messages, sessionId }, pipelineConfig);
  }, [pipelineConfig, sessionId]);

  const runPipeline = useCallback(async (
    messages: ConversationMessage[]
  ): Promise<PipelineResult> => {
    if (!pipelineConfig.enablePipeline) {
      return { candidates: [], decisions: [], applied: { added: 0, updated: 0, deleted: 0, skipped: 0 } };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get existing memories
      const existingMemories = await getMemories();
      const embeddingConfig = getEmbeddingConfig();

      // Run two-phase pipeline
      const { candidates, decisions } = await runMemoryPipeline(
        messages,
        existingMemories,
        pipelineConfig,
        {
          sessionId,
          embeddingConfig: embeddingConfig || undefined,
        }
      );

      // Apply decisions
      const applied = applyDecisions(
        decisions,
        (input) => {
          // Use local store for immediate creation
          return memoryStore.createMemory({
            ...input,
            sessionId: sessionId || input.sessionId,
          });
        },
        (id, updates) => memoryStore.updateMemory(id, updates),
        (id) => memoryStore.deleteMemory(id)
      );

      return { candidates, decisions, applied };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Pipeline failed';
      setError(message);
      return { candidates: [], decisions: [], applied: { added: 0, updated: 0, deleted: 0, skipped: 0 } };
    } finally {
      setIsLoading(false);
    }
  }, [pipelineConfig, getMemories, getEmbeddingConfig, memoryStore, sessionId]);

  // === Enhanced Retrieval Operations (New) ===

  const activateMemories = useCallback(async (
    context: MemoryActivationContext
  ): Promise<ActivatedMemory[]> => {
    if (!activatorRef.current) return [];

    try {
      const memories = await getMemories();
      return activatorRef.current.activate(memories, {
        ...context,
        sessionId: context.sessionId || sessionId,
      });
    } catch (err) {
      console.warn('Memory activation failed:', err);
      return [];
    }
  }, [getMemories, sessionId]);

  const hybridSearch = useCallback(async (
    options: HybridSearchOptions
  ): Promise<ScoredMemory[]> => {
    if (!retrieverRef.current) return [];

    try {
      const memories = await getMemories();
      return retrieverRef.current.search(memories, {
        ...options,
        filters: {
          ...options.filters,
          sessionId: options.filters?.sessionId || sessionId,
        },
      });
    } catch (err) {
      console.warn('Hybrid search failed:', err);
      return [];
    }
  }, [getMemories, sessionId]);

  const getWorkingMemoryPrompt = useCallback((): string => {
    if (!workingMemoryRef.current) return '';
    return workingMemoryRef.current.buildPromptSection();
  }, []);

  // === Sync Operations ===

  const sync = useCallback(async (): Promise<void> => {
    if (activeProvider !== 'mem0' || !mem0ProviderRef.current) return;

    setIsLoading(true);
    try {
      await mem0ProviderRef.current.sync();
      setLastSyncTime(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeProvider]);

  return {
    // Provider info
    provider: activeProvider,
    isReady: activeProvider === 'local' || isMem0Ready,
    isLoading,
    error,

    // Core operations
    addMemory,
    getMemory,
    getMemories,
    updateMemory,
    deleteMemory,
    searchMemories,

    // Pipeline operations
    runPipeline,
    extractCandidates,

    // Enhanced retrieval (new)
    activateMemories,
    hybridSearch,

    // Working memory (new)
    workingMemory: workingMemoryRef.current,
    getWorkingMemoryPrompt,

    // Sync
    sync,
    lastSyncTime,

    // Settings
    settings: memoryStore.settings,
    updateSettings: memoryStore.updateSettings,
  };
}

export default useMemoryProvider;
