/**
 * Context-Aware Agent Executor
 * 
 * Wraps the standard agent executor with dynamic context discovery:
 * - Long tool outputs are written to files instead of truncated
 * - Context tools are automatically injected
 * - History references are created during summarization
 * - MCP tools are loaded on-demand
 */

import { executeAgent, type AgentConfig, type AgentResult, type AgentTool, type ToolCall } from './agent-executor';
import {
  processToolOutput,
  createContextTools,
  getContextToolsPrompt,
} from '@/lib/context';
import type { ToolOutputRef } from '@/types/context';

/**
 * Extended config for context-aware execution
 */
export interface ContextAwareAgentConfig extends AgentConfig {
  /** Enable context file persistence for long outputs */
  enableContextFiles?: boolean;
  /** Maximum inline output size before writing to file */
  maxInlineOutputSize?: number;
  /** Enable automatic context tools injection */
  injectContextTools?: boolean;
  /** Callback when tool output is written to file */
  onToolOutputPersisted?: (ref: ToolOutputRef, toolCall: ToolCall) => void;
}

/**
 * Extended result with context information
 */
export interface ContextAwareAgentResult extends AgentResult {
  /** Tool outputs that were persisted to files */
  persistedOutputs?: ToolOutputRef[];
  /** Total tokens saved by file persistence */
  tokensSaved?: number;
}

/**
 * Wrap a tool to persist long outputs to context files
 */
function wrapToolWithContextPersistence(
  name: string,
  tool: AgentTool,
  onPersisted?: (ref: ToolOutputRef, toolCall: ToolCall) => void
): AgentTool {
  return {
    ...tool,
    execute: async (args: Record<string, unknown>) => {
      // Execute the original tool
      const result = await tool.execute(args);
      
      // Process the output
      const processed = await processToolOutput(result, {
        toolName: name,
        toolCallId: `${name}-${Date.now()}`,
        tags: ['tool-result'],
      });
      
      // If written to file, notify and return formatted reference
      if (processed.writtenToFile && processed.ref) {
        const mockToolCall: ToolCall = {
          id: processed.ref.id,
          name,
          args,
          status: 'completed',
          result,
        };
        onPersisted?.(processed.ref, mockToolCall);
        
        // Return the inline content (which includes file reference)
        return processed.inlineContent;
      }
      
      // Return original result if not persisted
      return result;
    },
  };
}

/**
 * Execute agent with context-aware features
 */
export async function executeContextAwareAgent(
  prompt: string,
  config: ContextAwareAgentConfig
): Promise<ContextAwareAgentResult> {
  const {
    enableContextFiles = true,
    maxInlineOutputSize: _maxInlineOutputSize,
    injectContextTools = true,
    onToolOutputPersisted,
    tools = {},
    systemPrompt = '',
    ...restConfig
  } = config;
  
  const persistedOutputs: ToolOutputRef[] = [];
  let tokensSaved = 0;
  
  // Build enhanced tools
  let enhancedTools: Record<string, AgentTool> = { ...tools };
  
  // Wrap existing tools with context persistence
  if (enableContextFiles) {
    for (const [name, tool] of Object.entries(tools)) {
      enhancedTools[name] = wrapToolWithContextPersistence(
        name,
        tool,
        (ref, _toolCall) => {
          persistedOutputs.push(ref);
          // Estimate tokens saved (original size - inline size)
          const originalTokens = ref.sizeSummary.match(/~(\d+) tokens/)?.[1];
          if (originalTokens) {
            const inlineTokens = 200; // Approximate tokens for file reference
            tokensSaved += parseInt(originalTokens, 10) - inlineTokens;
          }
          onToolOutputPersisted?.(ref, _toolCall);
        }
      );
    }
  }
  
  // Inject context tools
  if (injectContextTools) {
    const contextTools = createContextTools();
    enhancedTools = { ...enhancedTools, ...contextTools };
  }
  
  // Enhance system prompt with context tools documentation
  let enhancedSystemPrompt = systemPrompt;
  if (injectContextTools) {
    const contextPrompt = getContextToolsPrompt();
    enhancedSystemPrompt = systemPrompt
      ? `${systemPrompt}\n\n${contextPrompt}`
      : contextPrompt;
  }
  
  // Execute with enhanced config
  const result = await executeAgent(prompt, {
    ...restConfig,
    tools: enhancedTools,
    systemPrompt: enhancedSystemPrompt,
  });
  
  return {
    ...result,
    persistedOutputs: persistedOutputs.length > 0 ? persistedOutputs : undefined,
    tokensSaved: tokensSaved > 0 ? tokensSaved : undefined,
  };
}

/**
 * Create a context-aware agent
 */
export function createContextAwareAgent(
  baseConfig: Omit<ContextAwareAgentConfig, 'provider' | 'model' | 'apiKey'>
) {
  return {
    run: async (
      prompt: string,
      providerConfig: { provider: string; model: string; apiKey: string; baseURL?: string }
    ) => {
      return executeContextAwareAgent(prompt, {
        ...baseConfig,
        ...providerConfig,
      } as ContextAwareAgentConfig);
    },
    
    addTool: (name: string, tool: AgentTool) => {
      baseConfig.tools = baseConfig.tools || {};
      baseConfig.tools[name] = tool;
    },
    
    enableContextFiles: (enabled: boolean) => {
      baseConfig.enableContextFiles = enabled;
    },
    
    enableContextTools: (enabled: boolean) => {
      baseConfig.injectContextTools = enabled;
    },
  };
}

/**
 * Get summary of context-aware execution
 */
export function getContextExecutionSummary(result: ContextAwareAgentResult): string {
  const lines = [
    `## Execution Summary`,
    `- Steps: ${result.totalSteps}`,
    `- Duration: ${result.duration}ms`,
    `- Success: ${result.success}`,
  ];
  
  if (result.persistedOutputs && result.persistedOutputs.length > 0) {
    lines.push(`- Outputs persisted to files: ${result.persistedOutputs.length}`);
    lines.push(`- Estimated tokens saved: ~${result.tokensSaved}`);
    lines.push('');
    lines.push('### Persisted Outputs:');
    for (const output of result.persistedOutputs) {
      lines.push(`- ${output.path} (${output.sizeSummary})`);
    }
  }
  
  return lines.join('\n');
}
