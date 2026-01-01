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
import type { RAGConfig } from '../rag';
import type { Skill } from '@/types/skill';
import {
  createSkillTools,
  buildSkillSystemPrompt,
  buildMultiSkillSystemPrompt,
} from '@/lib/skills';
import type { McpServerState, ToolCallResult } from '@/types/mcp';
import { createMcpToolsFromStore } from './mcp-tools';
import { initializeEnvironmentTools, getEnvironmentToolsSystemPrompt, getEnvironmentToolsPromptSnippet } from './environment-tools';
import { getJupyterTools, getJupyterToolsSystemPrompt } from './jupyter-tools';

export interface AgentToolsConfig {
  tavilyApiKey?: string;
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
  ragConfig?: RAGConfig;
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
 * Create web search tool for agent
 */
export function createWebSearchTool(apiKey: string): AgentTool {
  return {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, or any topic. Use this when you need up-to-date information.',
    parameters: webSearchInputSchema,
    execute: async (args) => {
      const input = args as z.infer<typeof webSearchInputSchema>;
      return executeWebSearch(input, { apiKey });
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
    mode: 'embedded' | 'server';
    serverUrl: string;
    embeddingProvider: string;
    embeddingModel: string;
  },
  apiKey: string
): RAGConfig {
  return {
    chromaConfig: {
      mode: vectorSettings.mode,
      serverUrl: vectorSettings.serverUrl,
      embeddingConfig: {
        provider: vectorSettings.embeddingProvider as 'openai' | 'google' | 'cohere' | 'mistral',
        model: vectorSettings.embeddingModel,
      },
      apiKey,
    },
    topK: 5,
    similarityThreshold: 0.5,
    maxContextLength: 4000,
  };
}

/**
 * Create RAG search tool for agent (uses real implementation from registry)
 * Enhanced version that can auto-configure from settings
 */
export function createRAGSearchTool(ragConfig?: RAGConfig): AgentTool {
  return {
    name: 'rag_search',
    description: 'Search through uploaded documents and knowledge base for relevant information using semantic similarity.',
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
      return executeRAGSearch(input, ragConfig);
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
 */
export function createCodeExecutionTool(): AgentTool {
  return {
    name: 'execute_code',
    description: 'Execute JavaScript code in a sandboxed environment. Use for calculations, data processing, or generating outputs.',
    parameters: z.object({
      code: z.string().describe('JavaScript code to execute'),
      language: z.enum(['javascript', 'typescript']).optional().describe('Programming language'),
    }),
    execute: async (args) => {
      try {
        // Safe evaluation using Function constructor
        const fn = new Function(`"use strict"; return (${args.code});`);
        const result = fn();
        return {
          success: true,
          result: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result),
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

  // Web search (requires API key)
  if (config.enableWebSearch !== false && config.tavilyApiKey) {
    tools.web_search = createWebSearchTool(config.tavilyApiKey);
  }

  // Web scraper tools
  if (config.enableWebScraper !== false) {
    tools.web_scraper = createWebScraperTool();
    tools.bulk_web_scraper = createBulkWebScraperTool();
    if (config.tavilyApiKey) {
      tools.search_and_scrape = createSearchAndScrapeTool({ apiKey: config.tavilyApiKey });
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
      ],
      registryConfig
    );
    Object.assign(tools, fileTools);
  }

  // Document tools from registry
  if (config.enableDocumentTools) {
    const docTools = getToolsFromRegistry(
      ['document_summarize', 'document_chunk', 'document_analyze'],
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

  // Add custom tools
  if (config.customTools) {
    Object.assign(tools, config.customTools);
  }

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
 * Build combined system prompt for agent with all tool guidance
 */
export function buildAgentSystemPrompt(config: {
  basePrompt?: string;
  activeSkills?: Skill[];
  enableEnvironmentTools?: boolean;
  environmentToolsDetailed?: boolean;
  enableJupyterTools?: boolean;
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

  return parts.join('\n\n');
}

export default initializeAgentTools;
