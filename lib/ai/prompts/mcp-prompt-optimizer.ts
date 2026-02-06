/**
 * MCP Prompt Optimizer - Optimize prompts using ace-tool MCP server
 *
 * Reuses the existing MCP infrastructure (useMcpStore) to call the
 * ace-tool's enhance_prompt tool for prompt optimization.
 */

import type { McpServerState, ToolCallResult } from '@/types/mcp';
import type {
  McpOptimizedPrompt,
  McpPrivacyConsent,
  PromptOptimizationHistoryEntry,
  PromptOptimizationMode,
  PromptOptimizationStyle,
} from '@/types/content/prompt';
import {
  MCP_PRIVACY_CONSENT_KEY,
  PROMPT_OPTIMIZATION_HISTORY_KEY,
  MAX_OPTIMIZATION_HISTORY,
} from '@/types/content/prompt';
import { loggers } from '@/lib/logger';
import { nanoid } from 'nanoid';

const log = loggers.ai;

/** ACE tool server identification patterns */
const ACE_TOOL_PATTERNS = ['ace-tool', 'ace_tool', 'acetool'];

/** The tool name exposed by ace-tool MCP server */
const ENHANCE_PROMPT_TOOL = 'enhance_prompt';

export interface McpOptimizePromptOptions {
  prompt: string;
  conversationHistory?: string;
  projectRootPath?: string;
}

export interface McpOptimizePromptResult {
  success: boolean;
  optimizedPrompt?: McpOptimizedPrompt;
  error?: string;
}

/**
 * Find the ace-tool MCP server from the list of configured servers.
 * Matches by server id, name, or command args containing 'ace-tool'.
 */
export function findAceToolServer(servers: McpServerState[]): McpServerState | undefined {
  return servers.find((server) => {
    // Check server id
    if (ACE_TOOL_PATTERNS.some((p) => server.id.toLowerCase().includes(p))) {
      return true;
    }
    // Check server name
    if (ACE_TOOL_PATTERNS.some((p) => server.name.toLowerCase().includes(p))) {
      return true;
    }
    // Check command args
    const args = server.config.args || [];
    if (args.some((arg) => ACE_TOOL_PATTERNS.some((p) => arg.toLowerCase().includes(p)))) {
      return true;
    }
    // Check command
    if (ACE_TOOL_PATTERNS.some((p) => server.config.command.toLowerCase().includes(p))) {
      return true;
    }
    return false;
  });
}

/**
 * Check if the ace-tool server has the enhance_prompt tool available
 */
export function hasEnhancePromptTool(server: McpServerState): boolean {
  if (!server.tools || server.tools.length === 0) return false;
  return server.tools.some((tool) => tool.name === ENHANCE_PROMPT_TOOL);
}

/**
 * Check if the ace-tool server is connected and ready
 */
export function isAceToolReady(server: McpServerState): boolean {
  return server.status.type === 'connected' && hasEnhancePromptTool(server);
}

/**
 * Extract the optimized text from MCP tool call result
 */
function extractResultText(result: ToolCallResult): string {
  if (result.isError) {
    const errorTexts = result.content
      .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
      .map((item) => item.text);
    throw new Error(errorTexts.join('\n') || 'MCP tool call returned an error');
  }

  const textItems = result.content
    .filter((item): item is { type: 'text'; text: string } => item.type === 'text')
    .map((item) => item.text);

  return textItems.join('\n').trim();
}

/**
 * Parse the enhance_prompt response.
 * The ace-tool may return plain text or JSON with enhanced prompt data.
 */
function parseEnhanceResult(
  responseText: string,
  originalPrompt: string,
  serverName: string
): McpOptimizedPrompt {
  // Try to parse as JSON first (some versions return structured data)
  try {
    const parsed = JSON.parse(responseText);
    if (parsed && typeof parsed === 'object') {
      // Handle { summary: "...", enhanced_prompt: "..." } format
      const optimized =
        parsed.enhanced_prompt ||
        parsed.optimized ||
        parsed.result ||
        parsed.summary ||
        parsed.content ||
        responseText;

      const improvements: string[] = [];
      if (parsed.improvements && Array.isArray(parsed.improvements)) {
        improvements.push(
          ...parsed.improvements.filter((i: unknown): i is string => typeof i === 'string')
        );
      }
      if (parsed.changes && Array.isArray(parsed.changes)) {
        improvements.push(
          ...parsed.changes.filter((i: unknown): i is string => typeof i === 'string')
        );
      }
      if (improvements.length === 0) {
        improvements.push('Enhanced via MCP ace-tool');
      }

      return {
        original: originalPrompt,
        optimized: typeof optimized === 'string' ? optimized : JSON.stringify(optimized),
        improvements,
        mode: 'mcp',
        serverName,
      };
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Plain text response - the enhanced prompt itself
  return {
    original: originalPrompt,
    optimized: responseText,
    improvements: ['Enhanced via MCP ace-tool'],
    mode: 'mcp',
    serverName,
  };
}

/**
 * Optimize a prompt using the ace-tool MCP server's enhance_prompt tool.
 *
 * @param options - Optimization options
 * @param callTool - The MCP callTool function from useMcpStore
 * @param servers - The list of MCP servers from useMcpStore
 */
export async function optimizePromptViaMcp(
  options: McpOptimizePromptOptions,
  callTool: (
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<ToolCallResult>,
  servers: McpServerState[]
): Promise<McpOptimizePromptResult> {
  const { prompt, conversationHistory, projectRootPath } = options;

  try {
    // Find the ace-tool server
    const aceServer = findAceToolServer(servers);
    if (!aceServer) {
      return {
        success: false,
        error: 'ace-tool MCP server not found. Please configure it in MCP settings.',
      };
    }

    // Check connection status
    if (aceServer.status.type !== 'connected') {
      return {
        success: false,
        error: `ace-tool server is ${aceServer.status.type}. Please connect it first.`,
      };
    }

    // Check tool availability
    if (!hasEnhancePromptTool(aceServer)) {
      return {
        success: false,
        error:
          'enhance_prompt tool not found on ace-tool server. Please check the server configuration.',
      };
    }

    // Build tool arguments
    const args: Record<string, unknown> = {
      prompt,
      conversation_history: conversationHistory || '',
    };

    if (projectRootPath) {
      args.project_root_path = projectRootPath;
    }

    log.info(`Calling enhance_prompt on server '${aceServer.id}'`);

    // Call the MCP tool
    const result = await callTool(aceServer.id, ENHANCE_PROMPT_TOOL, args);

    // Extract and parse result
    const responseText = extractResultText(result);
    const optimizedPrompt = parseEnhanceResult(responseText, prompt, aceServer.name);

    log.info('MCP prompt optimization completed successfully');

    return {
      success: true,
      optimizedPrompt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MCP prompt optimization failed';
    log.error('MCP prompt optimization failed', error as Error);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Load MCP privacy consent from localStorage
 */
export function loadMcpPrivacyConsent(): McpPrivacyConsent {
  try {
    const stored = localStorage.getItem(MCP_PRIVACY_CONSENT_KEY);
    if (stored) {
      return JSON.parse(stored) as McpPrivacyConsent;
    }
  } catch {
    // Ignore parse errors
  }
  return { accepted: false };
}

/**
 * Save MCP privacy consent to localStorage
 */
export function saveMcpPrivacyConsent(consent: McpPrivacyConsent): void {
  try {
    localStorage.setItem(MCP_PRIVACY_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Reset MCP privacy consent (for settings)
 */
export function resetMcpPrivacyConsent(): void {
  try {
    localStorage.removeItem(MCP_PRIVACY_CONSENT_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ─── Optimization History ────────────────────────────────────────────

/**
 * Load optimization history from localStorage
 */
export function loadOptimizationHistory(): PromptOptimizationHistoryEntry[] {
  try {
    const stored = localStorage.getItem(PROMPT_OPTIMIZATION_HISTORY_KEY);
    if (stored) {
      return JSON.parse(stored) as PromptOptimizationHistoryEntry[];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

/**
 * Save an optimization result to history
 */
export function saveToOptimizationHistory(entry: {
  original: string;
  optimized: string;
  mode: PromptOptimizationMode;
  style?: PromptOptimizationStyle;
  serverName?: string;
  improvements: string[];
}): PromptOptimizationHistoryEntry {
  const newEntry: PromptOptimizationHistoryEntry = {
    id: nanoid(),
    ...entry,
    timestamp: Date.now(),
  };

  try {
    const history = loadOptimizationHistory();
    // Prepend new entry, keep within limit
    const updated = [newEntry, ...history].slice(0, MAX_OPTIMIZATION_HISTORY);
    localStorage.setItem(PROMPT_OPTIMIZATION_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }

  return newEntry;
}

/**
 * Clear optimization history
 */
export function clearOptimizationHistory(): void {
  try {
    localStorage.removeItem(PROMPT_OPTIMIZATION_HISTORY_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ─── Conversation History Builder ────────────────────────────────────

export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Build a conversation history string from recent messages.
 * Takes the last N messages and formats them for the ace-tool enhance_prompt API.
 */
export function buildConversationHistory(
  messages: ChatMessage[],
  maxMessages = 10
): string {
  if (!messages || messages.length === 0) return '';

  const recent = messages.slice(-maxMessages);
  return recent
    .map((m) => `[${m.role}]: ${m.content.slice(0, 500)}`)
    .join('\n\n');
}

// ─── Mode Persistence ───────────────────────────────────────────────

const MODE_PREFERENCE_KEY = 'cognia-prompt-optimization-mode';

/**
 * Load the user's preferred optimization mode from localStorage
 */
export function loadOptimizationModePreference(): 'local' | 'mcp' {
  try {
    const stored = localStorage.getItem(MODE_PREFERENCE_KEY);
    if (stored === 'mcp' || stored === 'local') return stored;
  } catch {
    // Ignore storage errors
  }
  return 'local';
}

/**
 * Save the user's preferred optimization mode to localStorage
 */
export function saveOptimizationModePreference(mode: 'local' | 'mcp'): void {
  try {
    localStorage.setItem(MODE_PREFERENCE_KEY, mode);
  } catch {
    // Ignore storage errors
  }
}

// ─── Prompt Statistics ───────────────────────────────────────────────

export interface PromptStats {
  charCount: number;
  wordCount: number;
  lineCount: number;
  sentenceCount: number;
}

/**
 * Calculate statistics for a prompt string
 */
export function getPromptStats(text: string): PromptStats {
  if (!text) {
    return { charCount: 0, wordCount: 0, lineCount: 0, sentenceCount: 0 };
  }
  const charCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = text.split('\n').length;
  const sentenceCount = text.split(/[.!?。！？]+/).filter((s) => s.trim().length > 0).length;
  return { charCount, wordCount, lineCount, sentenceCount };
}
