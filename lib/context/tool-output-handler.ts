/**
 * Tool Output Handler - Persist long tool outputs to files
 * 
 * Instead of truncating long tool outputs (losing information),
 * this module writes them to context files and provides the agent
 * with file references and tail/read tools for dynamic access.
 */

import {
  writeContextFile,
  tailContextFile,
  readContextFile,
  createToolOutputRef,
  isLongOutput,
  CONTEXT_CONSTANTS,
  formatSize,
} from './context-fs';
import type { ToolOutputRef, ContextFile } from '@/types/context';

/**
 * Result of processing a tool output
 */
export interface ProcessedToolOutput {
  /** Whether output was written to file */
  writtenToFile: boolean;
  /** File path (if written) */
  filePath?: string;
  /** Output reference for prompt injection */
  ref?: ToolOutputRef;
  /** Inline content (if short enough or tail preview) */
  inlineContent: string;
  /** Original size */
  originalSize: number;
  /** Whether content was truncated for inline */
  wasTruncated: boolean;
}

/**
 * Options for processing tool output
 */
export interface ProcessToolOutputOptions {
  /** Tool name */
  toolName: string;
  /** Optional tool call ID */
  toolCallId?: string;
  /** Force write to file even if short */
  forceFile?: boolean;
  /** Custom TTL for the file */
  ttlMs?: number;
  /** Tags for categorization */
  tags?: string[];
  /** Maximum inline preview lines */
  maxPreviewLines?: number;
}

/**
 * Process tool output - write to file if long, return reference
 * 
 * This replaces simple truncation with file persistence, allowing
 * the agent to read more context on demand.
 */
export async function processToolOutput(
  output: unknown,
  options: ProcessToolOutputOptions
): Promise<ProcessedToolOutput> {
  const {
    toolName,
    toolCallId,
    forceFile = false,
    ttlMs = CONTEXT_CONSTANTS.DEFAULT_TOOL_OUTPUT_TTL,
    tags = [],
    maxPreviewLines = 20,
  } = options;
  
  // Serialize output to string
  const content = typeof output === 'string'
    ? output
    : JSON.stringify(output, null, 2);
  
  const originalSize = content.length;
  
  // Check if output is long enough to warrant file storage
  if (!forceFile && !isLongOutput(content)) {
    return {
      writtenToFile: false,
      inlineContent: content,
      originalSize,
      wasTruncated: false,
    };
  }
  
  // Write to context file
  const contextFile = await writeContextFile(content, {
    category: 'tool-output',
    source: toolName,
    filename: toolCallId ? `${toolName}_${toolCallId}.txt` : undefined,
    ttlMs,
    tags: [...tags, 'tool-output'],
  });
  
  // Create reference for prompt injection
  const ref = createToolOutputRef(
    toolName,
    contextFile.path,
    content,
    maxPreviewLines
  );
  
  // Generate inline preview (tail)
  const lines = content.split('\n');
  const previewLines = lines.slice(-maxPreviewLines);
  const hasMore = lines.length > maxPreviewLines;
  
  let inlineContent = previewLines.join('\n');
  if (hasMore) {
    inlineContent = `[... ${lines.length - maxPreviewLines} lines above, full output saved to: ${contextFile.path}]\n\n${inlineContent}`;
  }
  
  return {
    writtenToFile: true,
    filePath: contextFile.path,
    ref,
    inlineContent,
    originalSize,
    wasTruncated: hasMore,
  };
}

/**
 * Format a tool output reference for prompt injection
 * 
 * This minimal format tells the agent about the file without
 * injecting the full content.
 */
export function formatToolOutputRefForPrompt(ref: ToolOutputRef): string {
  const lines = [
    `📁 Tool output saved: ${ref.path}`,
    `   Size: ${ref.sizeSummary}`,
    `   Tool: ${ref.toolName}`,
    `   Time: ${ref.timestamp.toISOString()}`,
  ];
  
  if (ref.tailPreview) {
    lines.push('', '--- Last lines preview ---', ref.tailPreview, '--- End preview ---');
    lines.push('', 'Use read_context_file or tail_context_file to see more.');
  }
  
  return lines.join('\n');
}

/**
 * Format multiple tool output references
 */
export function formatToolOutputRefsForPrompt(refs: ToolOutputRef[]): string {
  if (refs.length === 0) return '';
  
  const header = `📂 ${refs.length} tool output(s) saved to files:`;
  const items = refs.map(ref => 
    `  - ${ref.path} (${ref.sizeSummary}) from ${ref.toolName}`
  );
  const footer = '\nUse read_context_file(path) or tail_context_file(path, lines) to access.';
  
  return [header, ...items, footer].join('\n');
}

/**
 * Read tool output with range
 */
export async function readToolOutput(
  path: string,
  startLine?: number,
  endLine?: number
): Promise<ContextFile | null> {
  return readContextFile(path, { startLine, endLine });
}

/**
 * Tail tool output
 */
export async function tailToolOutput(
  path: string,
  lineCount: number = 50
): Promise<ContextFile | null> {
  return tailContextFile(path, lineCount);
}

/**
 * Get summary of a tool output file
 */
export async function getToolOutputSummary(path: string): Promise<string | null> {
  const file = await readContextFile(path, { startLine: 1, endLine: 5 });
  if (!file) return null;
  
  const totalLines = (await readContextFile(path))?.content.split('\n').length ?? 0;
  
  return [
    `File: ${path}`,
    `Size: ${formatSize(file.metadata.sizeBytes)} (~${file.metadata.estimatedTokens} tokens)`,
    `Lines: ${totalLines}`,
    `Created: ${file.metadata.createdAt.toISOString()}`,
    '',
    '--- First 5 lines ---',
    file.content,
    '--- End preview ---',
  ].join('\n');
}
