'use client';

/**
 * useUnifiedTools - Hook for unified tool management
 *
 * Provides a centralized interface for managing all agent tools:
 * - Built-in tools
 * - Skill-based tools
 * - MCP server tools
 * - Custom tools
 *
 * Features:
 * - Automatic synchronization with stores
 * - Dynamic tool updates
 * - Tool filtering and search
 * - Tool enable/disable management
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSettingsStore, useSkillStore, useMcpStore, useVectorStore } from '@/stores';
import type { Skill } from '@/types/system/skill';
import {
  UnifiedToolRegistry,
  getUnifiedToolRegistry,
  registerBuiltinTools,
  registerSkillTools,
  registerMcpTools,
  registerCustomTools,
  type RegisteredTool,
  type ToolFilterOptions,
  type ToolSource,
  type UnifiedToolCategory as ToolCategory,
} from '@/lib/ai/tools';
import {
  initializeAgentTools,
  createMcpToolsFromStore,
  createMcpToolsFromBackend,
  createRAGSearchTool,
  buildRAGConfigFromSettings,
  type AgentTool,
} from '@/lib/ai/agent';
import { createSkillTools } from '@/lib/skills/executor';

export interface UseUnifiedToolsOptions {
  /** Enable built-in tools */
  enableBuiltinTools?: boolean;
  /** Enable skill-based tools */
  enableSkillTools?: boolean;
  /** Enable MCP server tools */
  enableMcpTools?: boolean;
  /** Enable RAG search tool */
  enableRAG?: boolean;
  /** Enable web scraper tools */
  enableWebScraper?: boolean;
  /** Enable process management tools (desktop only) */
  enableProcessTools?: boolean;
  /** Enable environment tools (Python venv management) */
  enableEnvironmentTools?: boolean;
  /** Custom tools to include */
  customTools?: Record<string, AgentTool>;
  /** Auto-sync with stores */
  autoSync?: boolean;
}

export interface UseUnifiedToolsReturn {
  // Registry
  registry: UnifiedToolRegistry;

  // Tools
  tools: Record<string, AgentTool>;
  registeredTools: RegisteredTool[];

  // Filtering
  filter: (options: ToolFilterOptions) => RegisteredTool[];
  getToolsBySource: (source: ToolSource) => RegisteredTool[];
  getToolsByCategory: (category: ToolCategory) => RegisteredTool[];
  searchTools: (query: string) => RegisteredTool[];

  // Management
  enableTool: (name: string) => void;
  disableTool: (name: string) => void;
  toggleTool: (name: string) => void;

  // Sync
  syncAll: () => void;
  syncBuiltinTools: () => void;
  syncSkillTools: () => void;
  syncMcpTools: () => void;

  // Stats
  stats: {
    total: number;
    enabled: number;
    disabled: number;
    bySource: Record<ToolSource, number>;
  };

  // Loading state
  isLoading: boolean;
}

export function useUnifiedTools(options: UseUnifiedToolsOptions = {}): UseUnifiedToolsReturn {
  const {
    enableBuiltinTools = true,
    enableSkillTools = true,
    enableMcpTools = true,
    enableRAG = true,
    enableWebScraper = true,
    enableProcessTools = false, // Desktop only, disabled by default for security
    enableEnvironmentTools = false, // Desktop only, disabled by default
    customTools = {},
    autoSync = true,
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [registeredTools, setRegisteredTools] = useState<RegisteredTool[]>([]);

  // Get the global registry
  const registry = useMemo(() => getUnifiedToolRegistry(), []);

  // Store subscriptions
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const activeSkillIds = useSkillStore((state) => state.activeSkillIds);
  const skills = useSkillStore((state) => state.skills);
  const mcpServers = useMcpStore((state) => state.servers);
  const mcpCallTool = useMcpStore((state) => state.callTool);
  const mcpGetAllTools = useMcpStore((state) => state.getAllTools);
  const vectorSettings = useVectorStore((state) => state.settings);

  // Get active skills
  const activeSkills = useMemo(() => {
    const ids = Array.isArray(activeSkillIds) ? activeSkillIds : [];
    return ids.map((id) => skills[id]).filter((s): s is Skill => s !== undefined);
  }, [activeSkillIds, skills]);

  // Sync built-in tools
  const syncBuiltinTools = useCallback(() => {
    if (!enableBuiltinTools) return;

    const tavilyApiKey = providerSettings.tavily?.apiKey;
    const builtinTools = initializeAgentTools({
      tavilyApiKey,
      enableWebSearch: !!tavilyApiKey,
      enableWebScraper,
      enableCalculator: true,
      enableRAGSearch: false, // We handle RAG separately
      enableProcessTools,
      enableEnvironmentTools,
    });

    // Clear existing builtin tools
    registry.unregisterBySource('builtin');

    // Register new builtin tools
    registerBuiltinTools(registry, builtinTools);
  }, [enableBuiltinTools, enableWebScraper, enableProcessTools, enableEnvironmentTools, providerSettings.tavily?.apiKey, registry]);

  // Sync skill tools
  const syncSkillTools = useCallback(() => {
    if (!enableSkillTools) return;

    // Clear existing skill tools
    registry.unregisterBySource('skill');

    if (activeSkills.length > 0) {
      const skillTools = createSkillTools(activeSkills);
      registerSkillTools(registry, activeSkills, skillTools);
    }
  }, [enableSkillTools, activeSkills, registry]);

  // Sync MCP tools - uses Rust backend getAllTools API for efficiency
  const syncMcpTools = useCallback(async () => {
    if (!enableMcpTools) return;

    // Clear existing MCP tools
    registry.unregisterBySource('mcp');

    const connectedServers = mcpServers.filter((s) => s.status.type === 'connected');
    if (connectedServers.length > 0) {
      try {
        // Use the Rust backend API for efficient tool fetching
        const mcpTools = await createMcpToolsFromBackend(
          mcpGetAllTools,
          mcpCallTool,
          connectedServers
        );
        registerMcpTools(registry, connectedServers, mcpTools);
      } catch {
        // Fallback to store-based approach if backend call fails
        const mcpTools = createMcpToolsFromStore(connectedServers, mcpCallTool);
        registerMcpTools(registry, connectedServers, mcpTools);
      }
    }
  }, [enableMcpTools, mcpServers, mcpCallTool, mcpGetAllTools, registry]);

  // Sync RAG tool
  const syncRAGTool = useCallback(() => {
    if (!enableRAG) return;

    // Remove existing RAG tool
    registry.unregister('rag_search');

    // Get API key for embedding provider
    const embeddingApiKey =
      providerSettings[vectorSettings.embeddingProvider as keyof typeof providerSettings]?.apiKey;
    if (embeddingApiKey) {
      const ragConfig = buildRAGConfigFromSettings(vectorSettings, embeddingApiKey);
      const ragTool = createRAGSearchTool(ragConfig);
      registry.register(ragTool, {
        source: 'builtin',
        category: 'search',
      });
    }
  }, [enableRAG, vectorSettings, providerSettings, registry]);

  // Sync custom tools
  const syncCustomTools = useCallback(() => {
    // Clear existing custom tools
    registry.unregisterBySource('custom');

    if (Object.keys(customTools).length > 0) {
      registerCustomTools(registry, customTools);
    }
  }, [customTools, registry]);

  // Sync all tools
  const syncAll = useCallback(() => {
    setIsLoading(true);
    syncBuiltinTools();
    syncSkillTools();
    syncMcpTools();
    syncRAGTool();
    syncCustomTools();
    setIsLoading(false);
  }, [syncBuiltinTools, syncSkillTools, syncMcpTools, syncRAGTool, syncCustomTools]);

  // Subscribe to registry changes
  useEffect(() => {
    const unsubscribe = registry.subscribe((tools) => {
      setRegisteredTools(tools);
    });

    return unsubscribe;
  }, [registry]);

  // Initial sync on mount
  useEffect(() => {
    if (autoSync) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        syncAll();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoSync, syncAll]);

  // Auto-sync when dependencies change
  useEffect(() => {
    if (autoSync) {
      syncBuiltinTools();
    }
  }, [autoSync, syncBuiltinTools]);

  useEffect(() => {
    if (autoSync) {
      syncSkillTools();
    }
  }, [autoSync, syncSkillTools]);

  useEffect(() => {
    if (autoSync) {
      syncMcpTools();
    }
  }, [autoSync, syncMcpTools]);

  useEffect(() => {
    if (autoSync) {
      syncRAGTool();
    }
  }, [autoSync, syncRAGTool]);

  useEffect(() => {
    if (autoSync) {
      syncCustomTools();
    }
  }, [autoSync, syncCustomTools]);

  // Get tools as record
  // Note: registeredTools is intentionally included to trigger re-computation when tools change
  const tools = useMemo(() => {
    return registry.getToolsRecord({ isEnabled: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, registeredTools]);

  // Filter functions
  const filter = useCallback(
    (filterOptions: ToolFilterOptions) => {
      return registry.filter(filterOptions);
    },
    [registry]
  );

  const getToolsBySource = useCallback(
    (source: ToolSource) => {
      return registry.filter({ sources: [source] });
    },
    [registry]
  );

  const getToolsByCategory = useCallback(
    (category: ToolCategory) => {
      return registry.filter({ categories: [category] });
    },
    [registry]
  );

  const searchTools = useCallback(
    (query: string) => {
      return registry.filter({ searchQuery: query });
    },
    [registry]
  );

  // Management functions
  const enableTool = useCallback(
    (name: string) => {
      registry.setEnabled(name, true);
    },
    [registry]
  );

  const disableTool = useCallback(
    (name: string) => {
      registry.setEnabled(name, false);
    },
    [registry]
  );

  const toggleTool = useCallback(
    (name: string) => {
      const tool = registry.get(name);
      if (tool) {
        registry.setEnabled(name, !tool.metadata.isEnabled);
      }
    },
    [registry]
  );

  // Stats
  // Note: registeredTools is intentionally included to trigger re-computation when tools change
  const stats = useMemo(() => {
    const registryStats = registry.getStats();
    return {
      total: registryStats.total,
      enabled: registryStats.enabled,
      disabled: registryStats.disabled,
      bySource: registryStats.bySource,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, registeredTools]);

  return {
    registry,
    tools,
    registeredTools,
    filter,
    getToolsBySource,
    getToolsByCategory,
    searchTools,
    enableTool,
    disableTool,
    toggleTool,
    syncAll,
    syncBuiltinTools,
    syncSkillTools,
    syncMcpTools,
    stats,
    isLoading,
  };
}

export default useUnifiedTools;
