/**
 * History Handler - Chat history persistence for summarization recovery
 * 
 * When summarizing chat history to free context window space,
 * this module preserves the full history as files that the agent
 * can reference to recover details lost in compression.
 */

import {
  writeContextFile,
  readContextFile,
  grepContextFiles,
  searchContextFiles,
  estimateTokens,
  CONTEXT_CONSTANTS,
} from './context-fs';
import type { HistoryReference, ContextFile } from '@/types/context';

/**
 * Message format for history serialization
 */
export interface HistoryMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Options for writing history
 */
export interface WriteHistoryOptions {
  /** Session ID */
  sessionId: string;
  /** Messages to write */
  messages: HistoryMessage[];
  /** Whether this is a chunk (part of a larger history) */
  isChunk?: boolean;
  /** Chunk index if chunked */
  chunkIndex?: number;
  /** Custom tags */
  tags?: string[];
}

/**
 * Options for creating a summary with history reference
 */
export interface CreateSummaryOptions {
  /** Session ID */
  sessionId: string;
  /** Full messages being summarized */
  messages: HistoryMessage[];
  /** The generated summary text */
  summaryText: string;
  /** Message index range */
  messageRange: {
    startIndex: number;
    endIndex: number;
  };
}

/**
 * Serialize messages to text format for storage
 */
function serializeMessages(messages: HistoryMessage[]): string {
  return messages.map((msg, idx) => {
    const header = `[${idx + 1}] ${msg.role.toUpperCase()} @ ${msg.timestamp.toISOString()}`;
    const content = msg.content;
    
    let toolInfo = '';
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      toolInfo = '\n--- Tool Calls ---\n' + msg.toolCalls.map(tc => 
        `Tool: ${tc.name}\nArgs: ${JSON.stringify(tc.args, null, 2)}${tc.result ? `\nResult: ${JSON.stringify(tc.result, null, 2)}` : ''}`
      ).join('\n---\n');
    }
    
    return `${header}\n${content}${toolInfo}\n${'─'.repeat(60)}`;
  }).join('\n\n');
}

/**
 * Write chat history to a context file
 */
export async function writeHistoryFile(
  options: WriteHistoryOptions
): Promise<ContextFile> {
  const { sessionId, messages, isChunk, chunkIndex, tags = [] } = options;
  
  const content = serializeMessages(messages);
  const filename = isChunk && chunkIndex !== undefined
    ? `session_${sessionId}_chunk_${chunkIndex}.txt`
    : `session_${sessionId}.txt`;
  
  return writeContextFile(content, {
    category: 'history',
    source: sessionId,
    filename,
    tags: [...tags, 'history', isChunk ? 'chunk' : 'full'],
  });
}

/**
 * Create a summary file with reference to full history
 */
export async function createSummaryWithHistoryRef(
  options: CreateSummaryOptions
): Promise<{ summary: ContextFile; history: ContextFile; reference: HistoryReference }> {
  const { sessionId, messages, summaryText, messageRange } = options;
  
  // Write full history first
  const historyFile = await writeHistoryFile({
    sessionId,
    messages,
    tags: ['pre-summary'],
  });
  
  // Create summary with reference
  const summaryContent = [
    '# Conversation Summary',
    '',
    summaryText,
    '',
    '---',
    '',
    '## History Reference',
    `Full history available at: ${historyFile.path}`,
    `Messages: ${messageRange.startIndex + 1} to ${messageRange.endIndex + 1}`,
    `Time range: ${messages[0]?.timestamp.toISOString()} to ${messages[messages.length - 1]?.timestamp.toISOString()}`,
    '',
    'Use `read_context_file` or `grep_context` to access full details if needed.',
  ].join('\n');
  
  const summaryFile = await writeContextFile(summaryContent, {
    category: 'history',
    source: sessionId,
    filename: `session_${sessionId}_summary.txt`,
    tags: ['summary'],
  });
  
  const reference: HistoryReference = {
    sessionId,
    historyPath: historyFile.path,
    summaryPath: summaryFile.path,
    messageRange: {
      startIndex: messageRange.startIndex,
      endIndex: messageRange.endIndex,
      startTimestamp: messages[0]?.timestamp ?? new Date(),
      endTimestamp: messages[messages.length - 1]?.timestamp ?? new Date(),
    },
    estimatedTokens: estimateTokens(historyFile.content),
  };
  
  return { summary: summaryFile, history: historyFile, reference };
}

/**
 * Search through history files
 */
export async function searchHistory(
  sessionId: string,
  pattern: string,
  options: { isRegex?: boolean; limit?: number } = {}
): Promise<Array<{ lineNumber: number; content: string; path: string }>> {
  const results = await grepContextFiles(pattern, {
    category: 'history',
    source: sessionId,
    isRegex: options.isRegex ?? false,
    ignoreCase: true,
    limit: options.limit ?? 50,
  });
  
  return results.map(r => ({
    lineNumber: r.lineNumber,
    content: r.content,
    path: r.path,
  }));
}

/**
 * Get all history files for a session
 */
export async function getSessionHistoryFiles(
  sessionId: string
): Promise<Array<{ path: string; type: 'full' | 'chunk' | 'summary'; createdAt: Date }>> {
  const files = await searchContextFiles({
    category: 'history',
    source: sessionId,
    sortBy: 'createdAt',
    sortOrder: 'asc',
  });
  
  return files.map(f => ({
    path: `${CONTEXT_CONSTANTS.BASE_DIR}/history/${f.source}_${f.id}.txt`,
    type: f.tags?.includes('summary') 
      ? 'summary' as const
      : f.tags?.includes('chunk') 
        ? 'chunk' as const
        : 'full' as const,
    createdAt: f.createdAt,
  }));
}

/**
 * Read history file content
 */
export async function readHistoryFile(
  path: string,
  options: { startLine?: number; endLine?: number } = {}
): Promise<string | null> {
  const file = await readContextFile(path, options);
  return file?.content ?? null;
}

/**
 * Format history reference for injection into summary message
 */
export function formatHistoryRefForPrompt(ref: HistoryReference): string {
  return [
    '',
    '---',
    '📚 **Full conversation history preserved**',
    `Path: \`${ref.historyPath}\``,
    `Messages ${ref.messageRange.startIndex + 1}-${ref.messageRange.endIndex + 1} (${ref.estimatedTokens} tokens)`,
    '',
    'If you need details not in this summary, use:',
    `- \`grep_context("keyword", category: "history")\` to search`,
    `- \`read_context_file("${ref.historyPath}")\` to read sections`,
  ].join('\n');
}

/**
 * Estimate if summarization should occur based on token count
 */
export function shouldSummarize(
  messages: HistoryMessage[],
  thresholdTokens: number = 50000
): boolean {
  const totalContent = messages.map(m => m.content).join('\n');
  const tokens = estimateTokens(totalContent);
  return tokens > thresholdTokens;
}

/**
 * Split history into chunks for large histories
 */
export function chunkHistory(
  messages: HistoryMessage[],
  maxTokensPerChunk: number = 20000
): HistoryMessage[][] {
  const chunks: HistoryMessage[][] = [];
  let currentChunk: HistoryMessage[] = [];
  let currentTokens = 0;
  
  for (const msg of messages) {
    const msgTokens = estimateTokens(msg.content);
    
    if (currentTokens + msgTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }
    
    currentChunk.push(msg);
    currentTokens += msgTokens;
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}
