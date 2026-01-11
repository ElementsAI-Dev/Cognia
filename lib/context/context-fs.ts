/**
 * Context File System (ContextFS) - Core Implementation
 * 
 * Provides file-based abstractions for dynamic context discovery:
 * - Long tool outputs written to files instead of truncated
 * - Chat history preserved as files for summarization recovery
 * - MCP tool descriptions synced to files for on-demand loading
 * - Terminal sessions mirrored to files for grep/tail access
 * 
 * This enables the agent to pull context dynamically rather than
 * having everything injected statically into the prompt.
 */

import type {
  ContextCategory,
  ContextFile,
  ContextFileMetadata,
  WriteContextOptions,
  ReadContextOptions,
  SearchContextOptions,
  GrepOptions,
  GrepResult,
  GCOptions,
  GCResult,
  ContextStats,
  ToolOutputRef,
} from '@/types/system/context';

/**
 * Constants for context management
 */
export const CONTEXT_CONSTANTS = {
  /** Default context base directory */
  BASE_DIR: '.cognia/context',
  /** Maximum file size before chunking (100KB) */
  MAX_FILE_SIZE: 100 * 1024,
  /** Default tail preview lines */
  DEFAULT_TAIL_LINES: 50,
  /** Default TTL for tool outputs (24 hours) */
  DEFAULT_TOOL_OUTPUT_TTL: 24 * 60 * 60 * 1000,
  /** Default TTL for temp files (1 hour) */
  DEFAULT_TEMP_TTL: 60 * 60 * 1000,
  /** Approximate tokens per character */
  TOKENS_PER_CHAR: 0.25,
  /** Threshold for "long" output that should be written to file */
  LONG_OUTPUT_THRESHOLD: 4000, // ~1000 tokens
} as const;

/**
 * Category-specific subdirectories
 */
export const CATEGORY_DIRS: Record<ContextCategory, string> = {
  'tool-output': 'tool-io',
  'history': 'history',
  'mcp': 'mcp',
  'skills': 'skills',
  'terminal': 'terminal',
  'temp': 'temp',
};

/**
 * In-memory metadata index for fast lookups
 */
const metadataIndex = new Map<string, ContextFileMetadata>();

/**
 * In-memory file storage (for web environment without filesystem)
 * In desktop/Tauri, this would be replaced with actual filesystem calls
 */
const fileStorage = new Map<string, string>();

/**
 * Generate a unique file ID
 */
function generateFileId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Generate filename for a context file
 */
function generateFilename(options: WriteContextOptions): string {
  if (options.filename) {
    return options.filename;
  }
  const id = generateFileId();
  const sanitizedSource = options.source.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  return `${sanitizedSource}_${id}.txt`;
}

/**
 * Get the full path for a context file
 */
function getContextPath(category: ContextCategory, filename: string): string {
  return `${CONTEXT_CONSTANTS.BASE_DIR}/${CATEGORY_DIRS[category]}/${filename}`;
}

/**
 * Estimate token count for content
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length * CONTEXT_CONSTANTS.TOKENS_PER_CHAR);
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Write content to a context file
 */
export async function writeContextFile(
  content: string,
  options: WriteContextOptions
): Promise<ContextFile> {
  const filename = generateFilename(options);
  const path = getContextPath(options.category, filename);
  const id = generateFileId();
  
  // Handle append mode
  let finalContent = content;
  if (options.append && fileStorage.has(path)) {
    finalContent = fileStorage.get(path)! + '\n' + content;
  }
  
  // Store content
  fileStorage.set(path, finalContent);
  
  // Create metadata
  const metadata: ContextFileMetadata = {
    id,
    category: options.category,
    source: options.source,
    createdAt: new Date(),
    accessedAt: new Date(),
    sizeBytes: finalContent.length,
    estimatedTokens: estimateTokens(finalContent),
    ttlMs: options.ttlMs,
    tags: options.tags,
  };
  
  metadataIndex.set(path, metadata);
  
  return {
    metadata,
    path,
    content: finalContent,
  };
}

/**
 * Read content from a context file
 */
export async function readContextFile(
  path: string,
  options: ReadContextOptions = {}
): Promise<ContextFile | null> {
  const content = fileStorage.get(path);
  const metadata = metadataIndex.get(path);
  
  if (!content || !metadata) {
    return null;
  }
  
  // Update access time
  metadata.accessedAt = new Date();
  
  const lines = content.split('\n');
  let resultContent: string;
  
  if (options.fromEnd && options.lineCount) {
    // Tail mode: read last N lines
    const startIdx = Math.max(0, lines.length - options.lineCount);
    resultContent = lines.slice(startIdx).join('\n');
  } else if (options.startLine !== undefined || options.endLine !== undefined) {
    // Range mode: read specific line range (1-indexed)
    const start = (options.startLine ?? 1) - 1;
    const end = options.endLine ?? lines.length;
    resultContent = lines.slice(start, end).join('\n');
  } else {
    // Full read
    resultContent = content;
  }
  
  // Apply maxBytes limit
  if (options.maxBytes && resultContent.length > options.maxBytes) {
    resultContent = resultContent.slice(0, options.maxBytes);
  }
  
  return {
    metadata,
    path,
    content: resultContent,
  };
}

/**
 * Tail a context file (read last N lines)
 */
export async function tailContextFile(
  path: string,
  lineCount: number = CONTEXT_CONSTANTS.DEFAULT_TAIL_LINES
): Promise<ContextFile | null> {
  return readContextFile(path, { fromEnd: true, lineCount });
}

/**
 * Search for context files matching criteria
 */
export async function searchContextFiles(
  options: SearchContextOptions = {}
): Promise<ContextFileMetadata[]> {
  let results: ContextFileMetadata[] = [];
  
  for (const [_path, metadata] of metadataIndex) {
    // Category filter
    if (options.category && metadata.category !== options.category) {
      continue;
    }
    
    // Source filter
    if (options.source) {
      if (typeof options.source === 'string') {
        if (metadata.source !== options.source) continue;
      } else if (!options.source.test(metadata.source)) {
        continue;
      }
    }
    
    // Tags filter
    if (options.tags && options.tags.length > 0) {
      const hasTag = options.tags.some(tag => metadata.tags?.includes(tag));
      if (!hasTag) continue;
    }
    
    // Date filters
    if (options.createdAfter && metadata.createdAt < options.createdAfter) {
      continue;
    }
    if (options.createdBefore && metadata.createdAt > options.createdBefore) {
      continue;
    }
    
    results.push(metadata);
  }
  
  // Sort
  if (options.sortBy) {
    results.sort((a, b) => {
      const aVal = a[options.sortBy!];
      const bVal = b[options.sortBy!];
      if (aVal instanceof Date && bVal instanceof Date) {
        return options.sortOrder === 'desc' 
          ? bVal.getTime() - aVal.getTime()
          : aVal.getTime() - bVal.getTime();
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return options.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });
  }
  
  // Limit
  if (options.limit && results.length > options.limit) {
    results = results.slice(0, options.limit);
  }
  
  return results;
}

/**
 * Grep search across context files
 */
export async function grepContextFiles(
  pattern: string,
  options: GrepOptions = {}
): Promise<GrepResult[]> {
  const results: GrepResult[] = [];
  const regex = options.isRegex
    ? new RegExp(pattern, options.ignoreCase ? 'gi' : 'g')
    : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options.ignoreCase ? 'gi' : 'g');
  
  for (const [path, metadata] of metadataIndex) {
    // Apply filters
    if (options.category && metadata.category !== options.category) {
      continue;
    }
    if (options.source) {
      if (typeof options.source === 'string' && metadata.source !== options.source) {
        continue;
      }
      if (options.source instanceof RegExp && !options.source.test(metadata.source)) {
        continue;
      }
    }
    
    const content = fileStorage.get(path);
    if (!content) continue;
    
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = [...line.matchAll(regex)];
      
      if (matches.length > 0) {
        const highlights = matches.map(m => ({
          start: m.index!,
          end: m.index! + m[0].length,
        }));
        
        results.push({
          path,
          lineNumber: i + 1,
          content: line,
          highlights,
        });
        
        if (options.limit && results.length >= options.limit) {
          return results;
        }
      }
    }
  }
  
  return results;
}

/**
 * Delete a context file
 */
export async function deleteContextFile(path: string): Promise<boolean> {
  const existed = fileStorage.has(path);
  fileStorage.delete(path);
  metadataIndex.delete(path);
  return existed;
}

/**
 * Get context statistics
 */
export async function getContextStats(): Promise<ContextStats> {
  const filesByCategory: Record<ContextCategory, number> = {
    'tool-output': 0,
    'history': 0,
    'mcp': 0,
    'skills': 0,
    'terminal': 0,
    'temp': 0,
  };
  
  let totalSizeBytes = 0;
  let estimatedTotalTokens = 0;
  let oldestFile: Date | undefined;
  let lastAccessed: Date | undefined;
  
  for (const metadata of metadataIndex.values()) {
    filesByCategory[metadata.category]++;
    totalSizeBytes += metadata.sizeBytes;
    estimatedTotalTokens += metadata.estimatedTokens ?? 0;
    
    if (!oldestFile || metadata.createdAt < oldestFile) {
      oldestFile = metadata.createdAt;
    }
    if (!lastAccessed || metadata.accessedAt > lastAccessed) {
      lastAccessed = metadata.accessedAt;
    }
  }
  
  return {
    filesByCategory,
    totalSizeBytes,
    estimatedTotalTokens,
    oldestFile,
    lastAccessed,
  };
}

/**
 * Garbage collection - clean up old/expired files
 */
export async function gcContextFiles(options: GCOptions = {}): Promise<GCResult> {
  const now = Date.now();
  const filesToRemove: string[] = [];
  let bytesFreed = 0;
  const errors: Array<{ path: string; error: string }> = [];
  
  // Collect files to remove based on TTL and maxAge
  for (const [path, metadata] of metadataIndex) {
    // Category filter
    if (options.categories && !options.categories.includes(metadata.category)) {
      continue;
    }
    
    let shouldRemove = false;
    
    // Check TTL
    if (metadata.ttlMs) {
      const expiresAt = metadata.createdAt.getTime() + metadata.ttlMs;
      if (now > expiresAt) {
        shouldRemove = true;
      }
    }
    
    // Check maxAge
    if (options.maxAge) {
      const age = now - metadata.createdAt.getTime();
      if (age > options.maxAge) {
        shouldRemove = true;
      }
    }
    
    if (shouldRemove) {
      filesToRemove.push(path);
      bytesFreed += metadata.sizeBytes;
    }
  }
  
  // Handle maxTotalSize - remove oldest files first
  if (options.maxTotalSize) {
    const stats = await getContextStats();
    if (stats.totalSizeBytes > options.maxTotalSize) {
      const sortedFiles = [...metadataIndex.entries()]
        .filter(([path]) => !filesToRemove.includes(path))
        .filter(([, meta]) => !options.categories || options.categories.includes(meta.category))
        .sort((a, b) => a[1].accessedAt.getTime() - b[1].accessedAt.getTime());
      
      let currentSize = stats.totalSizeBytes - bytesFreed;
      for (const [path, metadata] of sortedFiles) {
        if (currentSize <= options.maxTotalSize) break;
        filesToRemove.push(path);
        bytesFreed += metadata.sizeBytes;
        currentSize -= metadata.sizeBytes;
      }
    }
  }
  
  // Perform deletion (unless dry run)
  if (!options.dryRun) {
    for (const path of filesToRemove) {
      try {
        await deleteContextFile(path);
      } catch (err) {
        errors.push({ path, error: String(err) });
      }
    }
  }
  
  return {
    filesRemoved: options.dryRun ? 0 : filesToRemove.length,
    bytesFreed: options.dryRun ? 0 : bytesFreed,
    filesToRemove: options.dryRun ? filesToRemove : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Create a tool output reference for minimal prompt injection
 */
export function createToolOutputRef(
  toolName: string,
  path: string,
  content: string,
  tailLines: number = 10
): ToolOutputRef {
  const lines = content.split('\n');
  const tailPreview = lines.slice(-tailLines).join('\n');
  
  return {
    id: generateFileId(),
    toolName,
    path,
    sizeSummary: `${formatSize(content.length)} (~${estimateTokens(content)} tokens)`,
    tailPreview: tailPreview.length < content.length ? tailPreview : undefined,
    timestamp: new Date(),
  };
}

/**
 * Check if content is "long" and should be written to file
 */
export function isLongOutput(content: string): boolean {
  return content.length > CONTEXT_CONSTANTS.LONG_OUTPUT_THRESHOLD;
}

/**
 * Clear all context files (for testing/reset)
 */
export async function clearAllContextFiles(): Promise<void> {
  fileStorage.clear();
  metadataIndex.clear();
}

/**
 * Get all files in a category
 */
export async function getFilesByCategory(
  category: ContextCategory
): Promise<ContextFileMetadata[]> {
  return searchContextFiles({ category });
}

/**
 * Get the path for a new context file (without writing)
 */
export function getNewContextPath(
  category: ContextCategory,
  source: string,
  filename?: string
): string {
  const fname = filename ?? generateFilename({ category, source });
  return getContextPath(category, fname);
}
