/**
 * Agent Tools - Initialize and manage tools for agent execution
 * Uses the global tool registry as the authoritative source for tool definitions
 */

import { z } from 'zod';
import type { AgentTool } from './agent-executor';
import {
  getGlobalToolRegistry,
  type ToolDefinition,
  executeWebSearch,
  webSearchInputSchema,
  executeCalculator,
  calculatorInputSchema,
  executeRAGSearch,
  ragSearchInputSchema,
  type RAGSearchInput,
  executeWebScraper,
  executeBulkWebScraper,
  executeSearchAndScrape,
  webScraperInputSchema,
  bulkWebScraperInputSchema,
  searchAndScraperInputSchema,
  type WebScraperInput,
  type BulkWebScraperInput,
  type SearchAndScrapeInput,
} from '../tools';
import { createRAGRuntimeConfigFromVectorSettings, type RAGRuntimeConfig } from '../rag';
import type { RAGSearchConfig } from '../tools/rag-search';
import type { Skill } from '@/types/system/skill';
import type { EmbeddingProvider } from '@/lib/vector/embedding';
import { shellToolSystemPrompt as shellToolSystemPromptText } from '../tools/shell-tool';
import { fileToolSystemPrompt, fileToolPromptSnippet } from '../tools/file-tool';
import { documentToolSystemPrompt, documentToolPromptSnippet } from '../tools/document-tool';
import {
  createSkillTools,
  buildSkillSystemPrompt,
  buildMultiSkillSystemPrompt,
} from '@/lib/skills';
import type { McpServerState, ToolCallResult } from '@/types/mcp';
import { createMcpToolsFromStore } from '../tools/mcp-tools';
import { applyMiddlewareToTools } from '../tools/tool-middleware';
import { initializeEnvironmentTools, getEnvironmentToolsSystemPrompt, getEnvironmentToolsPromptSnippet } from '../tools/environment-tools';
import { getJupyterTools, getJupyterToolsSystemPrompt } from '../tools/jupyter-tools';
import { initializeProcessTools, getProcessToolsSystemPrompt, getProcessToolsPromptSnippet } from '../tools/process-tools';
import { createCanvasTools } from '../tools/canvas-tool';
import { artifactTools, memoryTools, getArtifactToolsPrompt } from '../tools';

export interface AgentToolsConfig {
  tavilyApiKey?: string;
  openaiApiKey?: string;
  /** Multi-provider search settings (preferred over tavilyApiKey) */
  searchProviders?: Record<string, { providerId: string; apiKey: string; enabled: boolean; priority: number }>;
  /** Default search provider to use */
  defaultSearchProvider?: string;
  enableWebSearch?: boolean;
  enableWebScraper?: boolean;
  enableCalculator?: boolean;
  enableRAGSearch?: boolean;
  enableFileTools?: boolean;
  enableDocumentTools?: boolean;
  enableCodeExecution?: boolean;
  enableDesigner?: boolean;
  enableSkills?: boolean;
  enableMcpTools?: boolean;
  enableEnvironmentTools?: boolean;
  enableJupyterTools?: boolean;
  enableProcessTools?: boolean;
  /** Enable shell command execution tools (shell_execute) */
  enableShellTools?: boolean;
  /** Enable video generation tools (video_generate, video_status) */
  enableVideoGeneration?: boolean;
  /** Enable video analysis tools (video_subtitles, video_analyze, subtitle_parse) */
  enableVideoAnalysis?: boolean;
  /** Enable academic tools (academic_search, academic_analysis, paper_comparison) */
  enableAcademicTools?: boolean;
  /** Enable image generation tools (image_generate, image_edit, image_variation) */
  enableImageTools?: boolean;
  /** Enable PPT generation tools (ppt_outline, ppt_slide_content, ppt_finalize, ppt_export) */
  enablePPTTools?: boolean;
  /** Enable learning/generative UI tools (flashcard, quiz, review session, etc.) */
  enableLearningTools?: boolean;
  /** Enable Canvas document tools (canvas_create, canvas_update, canvas_read, canvas_open) */
  enableCanvasTools?: boolean;
  /** Enable Artifact tools (artifact_create, artifact_update, artifact_read, artifact_search, etc.) */
  enableArtifactTools?: boolean;
  /** Enable Memory tools (memory_store, memory_recall, memory_search, memory_forget, etc.) */
  enableMemoryTools?: boolean;
  ragConfig?: RAGRuntimeConfig;
  customTools?: Record<string, AgentTool>;
  activeSkills?: Skill[];
  /** MCP servers for tool integration */
  mcpServers?: McpServerState[];
  /** MCP tool call function */
  mcpCallTool?: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
  /** Whether MCP tools require approval */
  mcpRequireApproval?: boolean;
}

/**
 * Convert a ToolDefinition from registry to AgentTool format
 */
function convertToAgentTool(
  toolDef: ToolDefinition,
  config: Record<string, unknown>
): AgentTool {
  const executeFn = toolDef.create(config);
  
  return {
    name: toolDef.name,
    description: toolDef.description,
    parameters: toolDef.parameters,
    execute: async (args) => executeFn(args),
    requiresApproval: toolDef.requiresApproval ?? false,
  };
}

/**
 * Create calculator tool for agent (from registry)
 */
export function createCalculatorTool(): AgentTool {
  return {
    name: 'calculator',
    description: 'Perform mathematical calculations, unit conversions, and evaluate expressions. Use this for any math operations.',
    parameters: calculatorInputSchema,
    execute: async (args) => {
      const input = args as z.infer<typeof calculatorInputSchema>;
      return executeCalculator(input);
    },
    requiresApproval: false,
  };
}

/**
 * Create web search tool for agent with multi-provider support
 */
export function createWebSearchTool(
  apiKeyOrConfig: string | {
    apiKey?: string;
    provider?: string;
    providerSettings?: Record<string, { providerId: string; apiKey: string; enabled: boolean; priority: number }>;
  }
): AgentTool {
  const config = typeof apiKeyOrConfig === 'string'
    ? { apiKey: apiKeyOrConfig }
    : apiKeyOrConfig;

  return {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, or any topic. Use this when you need up-to-date information.',
    parameters: webSearchInputSchema,
    execute: async (args) => {
      const input = args as z.infer<typeof webSearchInputSchema>;
      return executeWebSearch(input, {
        apiKey: config.apiKey,
        provider: config.provider as import('@/types/search').SearchProviderType | undefined,
        providerSettings: config.providerSettings as Record<import('@/types/search').SearchProviderType, import('@/types/search').SearchProviderSettings> | undefined,
      });
    },
    requiresApproval: false,
  };
}

/**
 * Create web scraper tool for agent
 */
export function createWebScraperTool(): AgentTool {
  return {
    name: 'web_scraper',
    description: 'Scrape and extract content from a web page. Supports both static HTML and JavaScript-rendered dynamic pages (using Playwright). Use this to get full text content from a specific URL.',
    parameters: webScraperInputSchema,
    execute: async (args) => {
      const input = args as WebScraperInput;
      return executeWebScraper(input);
    },
    requiresApproval: false,
  };
}

/**
 * Create bulk web scraper tool for agent
 */
export function createBulkWebScraperTool(): AgentTool {
  return {
    name: 'bulk_web_scraper',
    description: 'Scrape and extract content from multiple web pages in parallel. Limited to 10 URLs per request.',
    parameters: bulkWebScraperInputSchema,
    execute: async (args) => {
      const input = args as BulkWebScraperInput;
      return executeBulkWebScraper(input);
    },
    requiresApproval: false,
  };
}

/**
 * Create search and scrape tool for agent
 */
export function createSearchAndScrapeTool(config?: { apiKey?: string; provider?: string }): AgentTool {
  return {
    name: 'search_and_scrape',
    description: 'Search the web and scrape the full content of top results. Combines web search with content extraction.',
    parameters: searchAndScraperInputSchema,
    execute: async (args) => {
      const input = args as SearchAndScrapeInput;
      return executeSearchAndScrape(input, config);
    },
    requiresApproval: false,
  };
}

/**
 * Build RAG config from vector store settings
 */
export function buildRAGConfigFromSettings(
  vectorSettings: {
    provider?: 'chroma' | 'native' | 'pinecone' | 'qdrant' | 'milvus' | 'weaviate';
    mode: 'embedded' | 'server';
    serverUrl: string;
    embeddingProvider: EmbeddingProvider;
    embeddingModel: string;
    pineconeApiKey?: string;
    pineconeIndexName?: string;
    pineconeNamespace?: string;
    weaviateUrl?: string;
    weaviateApiKey?: string;
    qdrantUrl?: string;
    qdrantApiKey?: string;
    milvusAddress?: string;
    milvusToken?: string;
    defaultCollectionName?: string;
    ragTopK?: number;
    ragSimilarityThreshold?: number;
    ragMaxContextLength?: number;
    enableHybridSearch?: boolean;
    vectorWeight?: number;
    keywordWeight?: number;
    enableReranking?: boolean;
    enableQueryExpansion?: boolean;
    enableCitations?: boolean;
    citationStyle?: 'simple' | 'apa' | 'mla' | 'chicago' | 'harvard' | 'ieee';
  },
  apiKey: string
): RAGRuntimeConfig {
  return createRAGRuntimeConfigFromVectorSettings(vectorSettings, apiKey);
}

export interface RAGSearchToolOptions {
  /** RAG configuration for embeddings and vector store */
  ragConfig?: RAGRuntimeConfig;
  /** Available collection names for the agent to choose from */
  availableCollections?: string[];
  /** Default collection name to use if not specified */
  defaultCollectionName?: string;
}

/**
 * Create RAG search tool for agent (uses real implementation from registry)
 * Enhanced version that includes available collections in the description
 */
export function createRAGSearchTool(ragConfig?: RAGRuntimeConfig, options?: Omit<RAGSearchToolOptions, 'ragConfig'>): AgentTool {
  const { availableCollections = [], defaultCollectionName = 'default' } = options || {};
  
  // Build dynamic description with available collections
  let description = 'Search through uploaded documents and knowledge base for relevant information using semantic similarity.';
  if (availableCollections.length > 0) {
    description += ` Available collections: ${availableCollections.map(c => `"${c}"`).join(', ')}.`;
    if (defaultCollectionName && availableCollections.includes(defaultCollectionName)) {
      description += ` Default collection: "${defaultCollectionName}".`;
    }
  } else {
    description += ` Use collection name "${defaultCollectionName}" if not sure which collection to search.`;
  }
  
  return {
    name: 'rag_search',
    description,
    parameters: ragSearchInputSchema,
    execute: async (args) => {
      const input = args as RAGSearchInput;
      if (!ragConfig) {
        return {
          success: false,
          error: 'RAG search requires configuration. Please set up vector database first.',
          query: input.query,
        };
      }
      // Use default collection if not specified
      const searchInput = {
        ...input,
        collectionName: input.collectionName || defaultCollectionName,
      };
      const searchConfig: RAGSearchConfig = {
        runtimeConfig: ragConfig,
        defaultCollectionName,
      };
      return executeRAGSearch(searchInput, searchConfig);
    },
    requiresApproval: false,
  };
}

/**
 * Create a tool for listing available RAG collections
 * This helps agents discover what knowledge bases are available
 */
export function createListRAGCollectionsTool(
  getCollections: () => Array<{ name: string; description?: string; documentCount: number }>
): AgentTool {
  return {
    name: 'list_rag_collections',
    description: 'List all available knowledge base collections that can be searched with rag_search. Use this to discover what collections exist before searching.',
    parameters: z.object({}),
    execute: async () => {
      try {
        const collections = getCollections();
        if (collections.length === 0) {
          return {
            success: true,
            collections: [],
            message: 'No knowledge base collections found. Documents need to be uploaded first.',
          };
        }
        return {
          success: true,
          collections: collections.map(c => ({
            name: c.name,
            description: c.description || 'No description',
            documentCount: c.documentCount,
          })),
          message: `Found ${collections.length} collection(s) available for search.`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to list collections',
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Create designer tool for agent - opens the web designer with generated code
 */
export function createDesignerTool(): AgentTool {
  return {
    name: 'open_designer',
    description: 'Open the web designer with React/HTML code for visual editing and preview. Use this when you have generated UI code that the user wants to see or edit visually.',
    parameters: z.object({
      code: z.string().describe('React component code to open in the designer'),
      description: z.string().optional().describe('Brief description of what the code does'),
    }),
    execute: async (args) => {
      try {
        const { code, description } = args as { code: string; description?: string };
        
        // Store code in a format that can be picked up by the UI
        const designerKey = `designer-agent-${Date.now()}`;
        
        return {
          success: true,
          action: 'open_designer',
          designerKey,
          code,
          description: description || 'Generated UI component',
          message: 'Designer ready. The UI component has been prepared for visual editing.',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to prepare designer',
        };
      }
    },
    requiresApproval: false,
  };
}

/**
 * Create code execution tool for agent
 * Uses Tauri sandbox for desktop (supports multiple languages),
 * enhanced Function constructor with console capture + timeout for web.
 */
export function createCodeExecutionTool(): AgentTool {
  return {
    name: 'execute_code',
    description: `Execute code in a sandboxed environment. Use for calculations, data processing, or generating outputs.
In desktop mode: supports JavaScript, Python, and other languages via the sandbox runtime.
In web mode: supports JavaScript only with console output capture and timeout protection.`,
    parameters: z.object({
      code: z.string().describe('The code to execute'),
      language: z.enum(['javascript', 'typescript', 'python', 'ruby', 'go', 'rust', 'java', 'c', 'cpp'])
        .optional()
        .default('javascript')
        .describe('Programming language (desktop supports all; web supports javascript only)'),
      timeout: z.number().min(1000).max(60000).optional().default(10000)
        .describe('Execution timeout in milliseconds (default: 10000)'),
    }),
    execute: async (args) => {
      const code = args.code as string;
      const language = (args.language as string) || 'javascript';
      const timeout = (args.timeout as number) || 10000;

      // Try Tauri sandbox first (desktop environment, supports multiple languages)
      try {
        const { isTauri } = await import('@/lib/utils');
        if (isTauri()) {
          const { quickExecute } = await import('@/lib/native/sandbox');
          const result = await Promise.race([
            quickExecute(language, code),
            new Promise<never>((_, reject) => {
              const id = setTimeout(() => reject(new Error(`Execution timed out after ${timeout}ms`)), timeout);
              if (typeof id === 'object' && 'unref' in id) (id as NodeJS.Timeout).unref();
            }),
          ]);
          return {
            success: result.exit_code === 0,
            stdout: result.stdout || '',
            stderr: result.stderr || '',
            exitCode: result.exit_code,
            language,
            executionTime: result.execution_time_ms,
          };
        }
      } catch {
        // Not in Tauri or sandbox unavailable, fall through to web execution
      }

      // Web fallback: JavaScript only with console capture and timeout
      if (language !== 'javascript' && language !== 'typescript') {
        return {
          success: false,
          error: `Language '${language}' is only supported in the desktop app. Web mode supports JavaScript only.`,
        };
      }

      try {
        const logs: string[] = [];
        const errors: string[] = [];

        // Capture console output
        const mockConsole = {
          log: (...a: unknown[]) => logs.push(a.map(v => typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)).join(' ')),
          error: (...a: unknown[]) => errors.push(a.map(v => typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)).join(' ')),
          warn: (...a: unknown[]) => logs.push('[warn] ' + a.map(v => String(v)).join(' ')),
          info: (...a: unknown[]) => logs.push(a.map(v => String(v)).join(' ')),
        };

        // Execute with timeout protection
        const execPromise = new Promise<unknown>((resolve, reject) => {
          try {
            const fn = new Function('console', `"use strict";\n${code}`);
            const result = fn(mockConsole);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        });

        const result = await Promise.race([
          execPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Execution timed out after ${timeout}ms`)), timeout)
          ),
        ]);

        const stdout = logs.join('\n');
        const resultStr = result !== undefined
          ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
          : '';

        return {
          success: true,
          result: resultStr || undefined,
          stdout: stdout || undefined,
          stderr: errors.length > 0 ? errors.join('\n') : undefined,
          language: 'javascript',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Code execution failed',
        };
      }
    },
    requiresApproval: true,
  };
}

/**
 * Get tools from registry by names
 */
export function getToolsFromRegistry(
  toolNames: string[],
  config: Record<string, unknown>
): Record<string, AgentTool> {
  const registry = getGlobalToolRegistry();
  const tools: Record<string, AgentTool> = {};

  for (const name of toolNames) {
    const toolDef = registry.get(name);
    if (toolDef) {
      tools[name] = convertToAgentTool(toolDef, config);
    }
  }

  return tools;
}

/**
 * Get tools for a custom agent mode based on its configured tool list
 * This allows custom modes to have their own specific tool selection
 */
export function getToolsForCustomMode(
  modeTools: string[],
  config: Record<string, unknown>
): Record<string, AgentTool> {
  if (!modeTools || modeTools.length === 0) {
    return {};
  }
  return getToolsFromRegistry(modeTools, config);
}

/**
 * Filter initialized tools based on a custom mode's tool selection
 * Returns only tools that are in the mode's allowed tools list
 */
export function filterToolsForMode(
  allTools: Record<string, AgentTool>,
  modeTools: string[]
): Record<string, AgentTool> {
  if (!modeTools || modeTools.length === 0) {
    return allTools; // No filtering if no specific tools configured
  }
  
  const filtered: Record<string, AgentTool> = {};
  for (const toolName of modeTools) {
    if (allTools[toolName]) {
      filtered[toolName] = allTools[toolName];
    }
  }
  return filtered;
}

/**
 * Initialize all agent tools based on configuration
 * Uses registry as the authoritative source where available
 */
export function initializeAgentTools(config: AgentToolsConfig = {}): Record<string, AgentTool> {
  const tools: Record<string, AgentTool> = {};
  const registryConfig: Record<string, unknown> = {
    apiKey: config.tavilyApiKey,
    ragConfig: config.ragConfig,
  };

  // Calculator (always included unless explicitly disabled)
  if (config.enableCalculator !== false) {
    tools.calculator = createCalculatorTool();
  }

  // Web search (multi-provider with fallback to single API key)
  if (config.enableWebSearch !== false) {
    let searchToolCreated = false;
    if (config.searchProviders) {
      const hasEnabledProvider = Object.values(config.searchProviders).some(
        (p) => p.enabled && p.apiKey
      );
      if (hasEnabledProvider) {
        tools.web_search = createWebSearchTool({
          providerSettings: config.searchProviders,
          provider: config.defaultSearchProvider,
        });
        searchToolCreated = true;
      }
    }
    // Fallback to legacy tavily key when searchProviders has no enabled provider
    if (!searchToolCreated && config.tavilyApiKey) {
      tools.web_search = createWebSearchTool(config.tavilyApiKey);
    }
  }

  // Web scraper tools
  if (config.enableWebScraper !== false) {
    tools.web_scraper = createWebScraperTool();
    tools.bulk_web_scraper = createBulkWebScraperTool();
    // search_and_scrape works with any configured search provider, not just Tavily
    const hasSearchConfig = config.tavilyApiKey || (config.searchProviders && Object.values(config.searchProviders).some(p => p.enabled && p.apiKey));
    if (hasSearchConfig) {
      const searchConfig: { apiKey?: string; provider?: string } = {};
      if (config.tavilyApiKey) {
        searchConfig.apiKey = config.tavilyApiKey;
      }
      if (config.defaultSearchProvider) {
        searchConfig.provider = config.defaultSearchProvider;
      }
      tools.search_and_scrape = createSearchAndScrapeTool(searchConfig);
    }
  }

  // RAG search (uses real implementation)
  if (config.enableRAGSearch !== false) {
    tools.rag_search = createRAGSearchTool(config.ragConfig);
  }

  // Code execution (requires approval)
  if (config.enableCodeExecution !== false) {
    tools.execute_code = createCodeExecutionTool();
  }

  // Designer tool for UI generation
  if (config.enableDesigner !== false) {
    tools.open_designer = createDesignerTool();
  }

  // File tools from registry (all require approval for write/delete)
  if (config.enableFileTools) {
    const fileTools = getToolsFromRegistry(
      [
        'file_read',
        'file_write',
        'file_list',
        'file_exists',
        'file_delete',
        'directory_create',
        'file_copy',
        'file_rename',
        'file_info',
        'file_search',
        'file_append',
        'file_binary_write',
        'content_search',
        'directory_delete',
        'file_move',
        'file_hash',
        'file_diff',
      ],
      registryConfig
    );
    Object.assign(tools, fileTools);
  }

  // Document tools from registry
  if (config.enableDocumentTools) {
    const docTools = getToolsFromRegistry(
      ['document_summarize', 'document_chunk', 'document_analyze', 'document_extract_tables', 'document_read_file'],
      registryConfig
    );
    Object.assign(tools, docTools);
  }

  // Skills - convert active skills to tools
  if (config.enableSkills !== false && config.activeSkills && config.activeSkills.length > 0) {
    const skillTools = createSkillTools(config.activeSkills);
    Object.assign(tools, skillTools);
  }

  // MCP tools - convert MCP server tools to agent tools
  if (config.enableMcpTools !== false && config.mcpServers && config.mcpCallTool) {
    const mcpTools = createMcpToolsFromStore(
      config.mcpServers,
      config.mcpCallTool,
      { requireApproval: config.mcpRequireApproval }
    );
    Object.assign(tools, mcpTools);
  }

  // Environment tools - virtual environment management for Python
  if (config.enableEnvironmentTools) {
    const envTools = initializeEnvironmentTools({
      enableCreate: true,
      enableInstall: true,
      enableRun: true,
      enableList: true,
    });
    Object.assign(tools, envTools);
  }

  // Jupyter tools - Python code execution with kernel
  if (config.enableJupyterTools) {
    const jupyterTools = getJupyterTools();
    Object.assign(tools, jupyterTools);
  }

  // Process tools - local process management (desktop only)
  if (config.enableProcessTools) {
    const processTools = initializeProcessTools({
      enableList: true,
      enableSearch: true,
      enableGet: true,
      enableStart: true,
      enableTerminate: true,
    });
    Object.assign(tools, processTools);
  }

  // Shell tools - command execution (desktop only)
  if (config.enableShellTools) {
    const shellToolsDefs = getToolsFromRegistry(
      ['shell_execute'],
      registryConfig
    );
    Object.assign(tools, shellToolsDefs);
  }

  // Video generation tools from registry
  if (config.enableVideoGeneration) {
    const videoTools = getToolsFromRegistry(
      ['video_generate', 'video_status'],
      { ...registryConfig, apiKey: config.openaiApiKey || config.tavilyApiKey }
    );
    Object.assign(tools, videoTools);
  }

  // Video analysis tools from registry
  if (config.enableVideoAnalysis) {
    const videoAnalysisTools = getToolsFromRegistry(
      ['video_subtitles', 'video_analyze', 'subtitle_parse'],
      { ...registryConfig, apiKey: config.openaiApiKey }
    );
    Object.assign(tools, videoAnalysisTools);
  }

  // Academic tools from registry
  if (config.enableAcademicTools) {
    const academicTools = getToolsFromRegistry(
      ['academic_search', 'academic_analysis', 'paper_comparison'],
      registryConfig
    );
    Object.assign(tools, academicTools);
  }

  // Image generation tools from registry
  if (config.enableImageTools) {
    const imageTools = getToolsFromRegistry(
      ['image_generate', 'image_edit', 'image_variation'],
      { ...registryConfig, apiKey: config.openaiApiKey }
    );
    Object.assign(tools, imageTools);
  }

  // PPT generation tools from registry (includes image generation tools)
  if (config.enablePPTTools) {
    const pptTools = getToolsFromRegistry(
      [
        'ppt_outline', 'ppt_slide_content', 'ppt_finalize', 'ppt_export',
        'ppt_generate_image', 'ppt_batch_generate_images',
      ],
      registryConfig
    );
    Object.assign(tools, pptTools);
  }

  // Learning/Generative UI tools from registry
  if (config.enableLearningTools) {
    const learningTools = getToolsFromRegistry(
      [
        'display_flashcard',
        'display_flashcard_deck',
        'display_quiz',
        'display_quiz_question',
        'display_review_session',
        'display_progress_summary',
        'display_concept_explanation',
        'display_step_guide',
        'display_concept_map',
        'display_animation',
      ],
      registryConfig
    );
    Object.assign(tools, learningTools);
  }

  // Canvas document tools
  if (config.enableCanvasTools !== false) {
    const canvasTools = createCanvasTools();
    for (const tool of canvasTools) {
      tools[tool.name] = tool;
    }
  }

  // Artifact tools - create and manage rich artifacts (from lib/ai/tools)
  if (config.enableArtifactTools !== false) {
    for (const toolDef of artifactTools) {
      const executeFn = toolDef.create({});
      tools[toolDef.name] = {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.parameters,
        execute: async (args) => executeFn(args),
        requiresApproval: toolDef.requiresApproval ?? false,
      };
    }
  }

  // Memory tools - persistent memory for agents (from lib/ai/tools)
  if (config.enableMemoryTools !== false) {
    for (const toolDef of memoryTools) {
      const executeFn = toolDef.create({});
      tools[toolDef.name] = {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.parameters,
        execute: async (args) => executeFn(args),
        requiresApproval: toolDef.requiresApproval ?? false,
      };
    }
  }

  // Add custom tools
  if (config.customTools) {
    Object.assign(tools, config.customTools);
  }

  // Apply middleware (cache + retry + rate limiting) to all built-in tools
  applyMiddlewareToTools(tools);

  return tools;
}

/**
 * Get tool descriptions for display
 */
export function getToolDescriptions(tools: Record<string, AgentTool>): Array<{
  name: string;
  description: string;
  requiresApproval: boolean;
}> {
  return Object.values(tools).map((tool) => ({
    name: tool.name,
    description: tool.description,
    requiresApproval: tool.requiresApproval ?? false,
  }));
}

/**
 * Get system prompt enhancement from active skills
 * This should be prepended to the agent's system prompt
 */
export function getSkillsSystemPrompt(activeSkills: Skill[]): string {
  if (!activeSkills || activeSkills.length === 0) {
    return '';
  }
  
  if (activeSkills.length === 1) {
    return buildSkillSystemPrompt(activeSkills[0]);
  }
  
  return buildMultiSkillSystemPrompt(activeSkills);
}

/**
 * Initialize agent tools with skills from store
 * Convenience function that integrates with skill store
 */
export function initializeAgentToolsWithSkills(
  config: Omit<AgentToolsConfig, 'activeSkills'>,
  activeSkills: Skill[]
): {
  tools: Record<string, AgentTool>;
  skillsSystemPrompt: string;
} {
  const tools = initializeAgentTools({
    ...config,
    activeSkills,
    enableSkills: true,
  });
  
  const skillsSystemPrompt = getSkillsSystemPrompt(activeSkills);
  
  return { tools, skillsSystemPrompt };
}

/**
 * Build complete system prompt with environment tools guidance
 * Use this when environment tools are enabled to help AI understand usage
 */
export function buildEnvironmentToolsSystemPrompt(includeDetailed: boolean = false): string {
  return includeDetailed 
    ? getEnvironmentToolsSystemPrompt() 
    : getEnvironmentToolsPromptSnippet();
}

/**
 * Build complete system prompt with process tools guidance
 * Use this when process tools are enabled to help AI understand usage
 */
export function buildProcessToolsSystemPrompt(includeDetailed: boolean = false): string {
  return includeDetailed 
    ? getProcessToolsSystemPrompt() 
    : getProcessToolsPromptSnippet();
}

/**
 * Build combined system prompt for agent with all tool guidance
 */
export function buildAgentSystemPrompt(config: {
  basePrompt?: string;
  activeSkills?: Skill[];
  enableEnvironmentTools?: boolean;
  environmentToolsDetailed?: boolean;
  enableJupyterTools?: boolean;
  enableProcessTools?: boolean;
  processToolsDetailed?: boolean;
  enableShellTools?: boolean;
  enableFileTools?: boolean;
  fileToolsDetailed?: boolean;
  enableDocumentTools?: boolean;
  documentToolsDetailed?: boolean;
  enableArtifactTools?: boolean;
}): string {
  const parts: string[] = [];

  // Base prompt
  if (config.basePrompt) {
    parts.push(config.basePrompt);
  }

  // Skills prompt
  if (config.activeSkills && config.activeSkills.length > 0) {
    const skillsPrompt = getSkillsSystemPrompt(config.activeSkills);
    if (skillsPrompt) {
      parts.push(skillsPrompt);
    }
  }

  // Environment tools prompt
  if (config.enableEnvironmentTools) {
    parts.push(buildEnvironmentToolsSystemPrompt(config.environmentToolsDetailed));
  }

  // Jupyter tools prompt
  if (config.enableJupyterTools) {
    parts.push(getJupyterToolsSystemPrompt());
  }

  // Process tools prompt
  if (config.enableProcessTools) {
    parts.push(buildProcessToolsSystemPrompt(config.processToolsDetailed));
  }

  // Shell tools prompt
  if (config.enableShellTools) {
    parts.push(shellToolSystemPromptText);
  }

  // File tools prompt
  if (config.enableFileTools) {
    parts.push(config.fileToolsDetailed ? fileToolSystemPrompt : fileToolPromptSnippet);
  }

  // Document tools prompt
  if (config.enableDocumentTools) {
    parts.push(config.documentToolsDetailed ? documentToolSystemPrompt : documentToolPromptSnippet);
  }

  // Artifact tools prompt
  if (config.enableArtifactTools) {
    parts.push(getArtifactToolsPrompt());
  }

  return parts.join('\n\n');
}

export default initializeAgentTools;
