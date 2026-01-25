/**
 * Context types for Dynamic Context Discovery
 *
 * This module defines types for the context file system (ContextFS)
 * which provides file-based abstractions for:
 * - Long tool output persistence
 * - Chat history references
 * - MCP tool descriptions
 * - Agent skill definitions
 * - Terminal session outputs
 */

/**
 * Context file categories for organized storage
 */
export type ContextCategory =
  | 'tool-output' // Long tool/MCP/shell outputs
  | 'history' // Chat history for summarization recovery
  | 'mcp' // MCP tool descriptions and status
  | 'skills' // Agent skill definitions
  | 'terminal' // Terminal session outputs
  | 'temp'; // Temporary working files

/**
 * Metadata for a context file
 */
export interface ContextFileMetadata {
  /** Unique identifier for the file */
  id: string;
  /** File category */
  category: ContextCategory;
  /** Original source (tool name, session id, etc.) */
  source: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last accessed timestamp */
  accessedAt: Date;
  /** File size in bytes */
  sizeBytes: number;
  /** Token estimate (if calculated) */
  estimatedTokens?: number;
  /** TTL in milliseconds (for auto-cleanup) */
  ttlMs?: number;
  /** Whether file content is truncated */
  isTruncated?: boolean;
  /** Original full size if truncated */
  originalSizeBytes?: number;
  /** Custom tags for filtering */
  tags?: string[];
}

/**
 * A context file with content
 */
export interface ContextFile {
  metadata: ContextFileMetadata;
  /** Relative path within context directory */
  path: string;
  /** File content (may be partial if read with range) */
  content: string;
}

/**
 * Options for writing context files
 */
export interface WriteContextOptions {
  /** File category */
  category: ContextCategory;
  /** Source identifier (tool name, session id, etc.) */
  source: string;
  /** Optional custom filename (auto-generated if not provided) */
  filename?: string;
  /** TTL in milliseconds for auto-cleanup */
  ttlMs?: number;
  /** Custom tags */
  tags?: string[];
  /** Whether to append to existing file */
  append?: boolean;
}

/**
 * Options for reading context files
 */
export interface ReadContextOptions {
  /** Start line (1-indexed) */
  startLine?: number;
  /** End line (1-indexed, inclusive) */
  endLine?: number;
  /** Read from end (tail mode) */
  fromEnd?: boolean;
  /** Number of lines to read (used with fromEnd) */
  lineCount?: number;
  /** Maximum bytes to read */
  maxBytes?: number;
}

/**
 * Options for searching context files
 */
export interface SearchContextOptions {
  /** Category filter */
  category?: ContextCategory;
  /** Source filter (exact or pattern) */
  source?: string | RegExp;
  /** Tag filters (match any) */
  tags?: string[];
  /** Created after timestamp */
  createdAfter?: Date;
  /** Created before timestamp */
  createdBefore?: Date;
  /** Maximum results */
  limit?: number;
  /** Sort order */
  sortBy?: 'createdAt' | 'accessedAt' | 'sizeBytes';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of a grep search
 */
export interface GrepResult {
  /** File path */
  path: string;
  /** Line number (1-indexed) */
  lineNumber: number;
  /** Line content */
  content: string;
  /** Match highlights */
  highlights?: Array<{ start: number; end: number }>;
}

/**
 * Options for grep search
 */
export interface GrepOptions {
  /** Category filter */
  category?: ContextCategory;
  /** Source filter */
  source?: string | RegExp;
  /** Case insensitive search */
  ignoreCase?: boolean;
  /** Use regex pattern */
  isRegex?: boolean;
  /** Maximum results */
  limit?: number;
  /** Include context lines before match */
  beforeContext?: number;
  /** Include context lines after match */
  afterContext?: number;
}

/**
 * MCP tool description file content
 */
export interface McpToolDescriptionFile {
  /** Server ID */
  serverId: string;
  /** Server display name */
  serverName: string;
  /** Tool name */
  toolName: string;
  /** Full tool description */
  description: string;
  /** Parameter schema as JSON */
  parametersSchema: Record<string, unknown>;
  /** Whether approval is required */
  requiresApproval: boolean;
  /** Server status */
  serverStatus: 'connected' | 'disconnected' | 'error' | 'auth-required';
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Skill description file content
 */
export interface SkillDescriptionFile {
  /** Skill ID */
  skillId: string;
  /** Skill name */
  name: string;
  /** Short description */
  shortDescription: string;
  /** Full description/instructions */
  fullDescription: string;
  /** Tool definitions (names only for index) */
  toolNames: string[];
  /** Keywords for discovery */
  keywords: string[];
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * History reference for summarization
 */
export interface HistoryReference {
  /** Session ID */
  sessionId: string;
  /** History file path */
  historyPath: string;
  /** Summary file path (if summarized) */
  summaryPath?: string;
  /** Message range covered */
  messageRange: {
    startIndex: number;
    endIndex: number;
    startTimestamp: Date;
    endTimestamp: Date;
  };
  /** Token estimate */
  estimatedTokens: number;
}

/**
 * Context statistics for monitoring
 */
export interface ContextStats {
  /** Total files by category */
  filesByCategory: Record<ContextCategory, number>;
  /** Total size in bytes */
  totalSizeBytes: number;
  /** Estimated total tokens */
  estimatedTotalTokens: number;
  /** Oldest file timestamp */
  oldestFile?: Date;
  /** Most recently accessed file */
  lastAccessed?: Date;
}

/**
 * Garbage collection options
 */
export interface GCOptions {
  /** Remove files older than this (milliseconds) */
  maxAge?: number;
  /** Maximum total size in bytes */
  maxTotalSize?: number;
  /** Categories to clean (all if not specified) */
  categories?: ContextCategory[];
  /** Dry run (report what would be deleted) */
  dryRun?: boolean;
}

/**
 * Garbage collection result
 */
export interface GCResult {
  /** Number of files removed */
  filesRemoved: number;
  /** Bytes freed */
  bytesFreed: number;
  /** Files that would be removed (dry run) */
  filesToRemove?: string[];
  /** Errors encountered */
  errors?: Array<{ path: string; error: string }>;
}

/**
 * Tool output reference (minimal info for prompt injection)
 */
export interface ToolOutputRef {
  /** Reference ID */
  id: string;
  /** Tool name */
  toolName: string;
  /** Output file path */
  path: string;
  /** Size summary */
  sizeSummary: string;
  /** Tail preview (last N lines) */
  tailPreview?: string;
  /** Timestamp */
  timestamp: Date;
}
