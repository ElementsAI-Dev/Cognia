/**
 * File Tool - File operations for AI agents
 */

import { z } from 'zod';
import {
  readTextFile,
  writeTextFile,
  writeBinaryFile,
  listDirectory,
  exists,
  deleteFile,
  createDirectory,
  copyFile,
  renameFile,
  getFileInfo,
  searchFiles,
  appendTextFile,
  isInTauri,
  deleteDirectory,
  moveFile,
  getFileHash,
  searchFileContents,
  type HashAlgorithm,
} from '@/lib/file/file-operations';

export const fileReadInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to read'),
  startLine: z
    .number()
    .min(1)
    .optional()
    .describe('Start reading from this line number (1-indexed). If omitted, reads from the beginning.'),
  endLine: z
    .number()
    .min(1)
    .optional()
    .describe('Stop reading at this line number (inclusive). If omitted, reads to the end.'),
});

export const fileWriteInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
  createDirectories: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to create parent directories if they do not exist'),
});

export const fileListInputSchema = z.object({
  path: z.string().describe('The absolute path to the directory to list'),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to list contents recursively (including subdirectories)'),
  maxDepth: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(3)
    .describe('Maximum depth for recursive listing (default: 3, max: 10)'),
  maxItems: z
    .number()
    .min(1)
    .max(5000)
    .optional()
    .default(500)
    .describe('Maximum total items to return (default: 500)'),
});

export const fileExistsInputSchema = z.object({
  path: z.string().describe('The absolute path to check'),
});

export const fileDeleteInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to delete'),
});

export const directoryCreateInputSchema = z.object({
  path: z.string().describe('The absolute path to the directory to create'),
  recursive: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to create parent directories'),
});

export const fileCopyInputSchema = z.object({
  source: z.string().describe('The absolute path to the source file'),
  destination: z.string().describe('The absolute path to the destination file'),
});

export const fileRenameInputSchema = z.object({
  oldPath: z.string().describe('The current absolute path of the file'),
  newPath: z.string().describe('The new absolute path for the file'),
});

export const fileInfoInputSchema = z.object({
  path: z.string().describe('The absolute path to the file or directory'),
});

export const fileSearchInputSchema = z.object({
  directory: z.string().describe('The absolute path to the directory to search'),
  pattern: z
    .string()
    .optional()
    .describe('Search pattern to match file names (case-insensitive)'),
  extensions: z
    .array(z.string())
    .optional()
    .describe('File extensions to filter by (e.g., ["txt", "md", "json"])'),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to search subdirectories'),
  maxResults: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .default(50)
    .describe('Maximum number of results to return'),
});

export const fileAppendInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to append to'),
  content: z.string().describe('The content to append to the file'),
});

export const fileBinaryWriteInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to write'),
  data: z.string().describe('Base64-encoded binary data to write'),
  createDirectories: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to create parent directories if they do not exist'),
});

export const contentSearchInputSchema = z.object({
  directory: z.string().describe('The absolute path to the directory to search in'),
  pattern: z.string().describe('The text or regex pattern to search for within file contents'),
  regex: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to treat the pattern as a regular expression'),
  caseSensitive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether the search is case-sensitive'),
  extensions: z
    .array(z.string())
    .optional()
    .describe('Only search files with these extensions (e.g., ["ts", "js", "py"])'),
  recursive: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to search subdirectories recursively'),
  maxResults: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .default(100)
    .describe('Maximum number of matches to return'),
});

export const directoryDeleteInputSchema = z.object({
  path: z.string().describe('The absolute path to the directory to delete'),
  recursive: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to delete all contents recursively. Required for non-empty directories.'),
});

export const fileMoveInputSchema = z.object({
  source: z.string().describe('The absolute path to the file or directory to move'),
  destination: z.string().describe('The absolute path to the new location'),
});

export const fileHashInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to hash'),
  algorithm: z
    .enum(['md5', 'sha1', 'sha256', 'sha512'])
    .optional()
    .default('sha256')
    .describe('Hash algorithm to use (default: sha256)'),
});

export type FileReadInput = z.infer<typeof fileReadInputSchema>;
export type FileWriteInput = z.infer<typeof fileWriteInputSchema>;
export type FileBinaryWriteInput = z.infer<typeof fileBinaryWriteInputSchema>;
export type FileListInput = z.infer<typeof fileListInputSchema>;
export type FileExistsInput = z.infer<typeof fileExistsInputSchema>;
export type FileDeleteInput = z.infer<typeof fileDeleteInputSchema>;
export type DirectoryCreateInput = z.infer<typeof directoryCreateInputSchema>;
export type FileCopyInput = z.infer<typeof fileCopyInputSchema>;
export type FileRenameInput = z.infer<typeof fileRenameInputSchema>;
export type FileInfoInput = z.infer<typeof fileInfoInputSchema>;
export type FileSearchInput = z.infer<typeof fileSearchInputSchema>;
export type FileAppendInput = z.infer<typeof fileAppendInputSchema>;
export type ContentSearchInput = z.infer<typeof contentSearchInputSchema>;
export type DirectoryDeleteInput = z.infer<typeof directoryDeleteInputSchema>;
export type FileMoveInput = z.infer<typeof fileMoveInputSchema>;
export type FileHashInput = z.infer<typeof fileHashInputSchema>;

export interface FileToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Execute file read operation
 */
export async function executeFileRead(
  input: FileReadInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await readTextFile(input.path);
  
  if (result.success) {
    let content = result.content ?? '';
    const allLines = content.split('\n');
    const totalLines = allLines.length;

    // Apply line range if specified
    if (input.startLine || input.endLine) {
      const start = Math.max(1, input.startLine ?? 1) - 1; // Convert to 0-indexed
      const end = Math.min(totalLines, input.endLine ?? totalLines);
      const selectedLines = allLines.slice(start, end);
      content = selectedLines.join('\n');
    }

    return {
      success: true,
      data: {
        content,
        path: result.path,
        size: result.size,
        mimeType: result.mimeType,
        totalLines,
        ...(input.startLine || input.endLine ? {
          startLine: input.startLine ?? 1,
          endLine: input.endLine ?? totalLines,
          linesReturned: content.split('\n').length,
        } : {}),
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file write operation
 */
export async function executeFileWrite(
  input: FileWriteInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await writeTextFile(input.path, input.content, {
    createDirectories: input.createDirectories,
  });
  
  if (result.success) {
    return {
      success: true,
      data: {
        path: result.path,
        bytesWritten: result.bytesWritten,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute directory list operation
 */
export async function executeFileList(
  input: FileListInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  if (input.recursive) {
    return executeFileListRecursive(input.path, input.maxDepth ?? 3, input.maxItems ?? 500);
  }

  const result = await listDirectory(input.path);
  
  if (result.success && result.contents) {
    return {
      success: true,
      data: {
        path: result.contents.path,
        files: result.contents.files.map((f) => ({
          name: f.name,
          size: f.size,
          extension: f.extension,
        })),
        directories: result.contents.directories.map((d) => ({
          name: d.name,
        })),
        totalFiles: result.contents.files.length,
        totalDirectories: result.contents.directories.length,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Recursive directory listing helper
 */
async function executeFileListRecursive(
  basePath: string,
  maxDepth: number,
  maxItems: number
): Promise<FileToolResult> {
  const allFiles: Array<{ path: string; name: string; size?: number; extension?: string }> = [];
  const allDirs: Array<{ path: string; name: string }> = [];
  let itemCount = 0;
  let truncated = false;

  async function walk(dirPath: string, depth: number): Promise<void> {
    if (depth > maxDepth || truncated) return;

    const result = await listDirectory(dirPath);
    if (!result.success || !result.contents) return;

    for (const f of result.contents.files) {
      if (itemCount >= maxItems) { truncated = true; return; }
      const filePath = dirPath.endsWith('/') || dirPath.endsWith('\\') 
        ? `${dirPath}${f.name}` 
        : `${dirPath}/${f.name}`;
      allFiles.push({ path: filePath, name: f.name, size: f.size, extension: f.extension });
      itemCount++;
    }

    for (const d of result.contents.directories) {
      if (itemCount >= maxItems) { truncated = true; return; }
      const subPath = dirPath.endsWith('/') || dirPath.endsWith('\\') 
        ? `${dirPath}${d.name}` 
        : `${dirPath}/${d.name}`;
      allDirs.push({ path: subPath, name: d.name });
      itemCount++;
      await walk(subPath, depth + 1);
    }
  }

  try {
    await walk(basePath, 1);
    return {
      success: true,
      data: {
        path: basePath,
        files: allFiles,
        directories: allDirs,
        totalFiles: allFiles.length,
        totalDirectories: allDirs.length,
        recursive: true,
        maxDepth,
        truncated,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Recursive listing failed',
    };
  }
}

/**
 * Execute file exists check
 */
export async function executeFileExists(
  input: FileExistsInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const fileExists = await exists(input.path);
  
  return {
    success: true,
    data: {
      exists: fileExists,
      path: input.path,
    },
  };
}

/**
 * Execute file delete operation
 */
export async function executeFileDelete(
  input: FileDeleteInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await deleteFile(input.path);
  
  if (result.success) {
    return {
      success: true,
      data: {
        deleted: true,
        path: input.path,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute directory create operation
 */
export async function executeDirectoryCreate(
  input: DirectoryCreateInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await createDirectory(input.path, input.recursive);
  
  if (result.success) {
    return {
      success: true,
      data: {
        created: true,
        path: input.path,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file copy operation
 */
export async function executeFileCopy(
  input: FileCopyInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await copyFile(input.source, input.destination);
  
  if (result.success) {
    return {
      success: true,
      data: {
        copied: true,
        source: input.source,
        destination: input.destination,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file rename/move operation
 */
export async function executeFileRename(
  input: FileRenameInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await renameFile(input.oldPath, input.newPath);
  
  if (result.success) {
    return {
      success: true,
      data: {
        renamed: true,
        oldPath: input.oldPath,
        newPath: input.newPath,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file info operation
 */
export async function executeFileInfo(
  input: FileInfoInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await getFileInfo(input.path);
  
  if (result.success && result.info) {
    return {
      success: true,
      data: {
        name: result.info.name,
        path: result.info.path,
        isDirectory: result.info.isDirectory,
        size: result.info.size,
        mimeType: result.info.mimeType,
        extension: result.info.extension,
        modifiedAt: result.info.modifiedAt?.toISOString(),
        createdAt: result.info.createdAt?.toISOString(),
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file search operation
 */
export async function executeFileSearch(
  input: FileSearchInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await searchFiles(input.directory, {
    pattern: input.pattern,
    extensions: input.extensions,
    recursive: input.recursive,
    maxResults: input.maxResults,
  });
  
  if (result.success && result.files) {
    return {
      success: true,
      data: {
        files: result.files.map((f) => ({
          name: f.name,
          path: f.path,
          size: f.size,
          extension: f.extension,
          modifiedAt: f.modifiedAt?.toISOString(),
        })),
        totalFound: result.files.length,
        directory: input.directory,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file append operation
 */
export async function executeFileAppend(
  input: FileAppendInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await appendTextFile(input.path, input.content);
  
  if (result.success) {
    return {
      success: true,
      data: {
        appended: true,
        path: result.path,
        bytesWritten: result.bytesWritten,
      },
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute binary file write operation
 */
export async function executeBinaryWrite(
  input: FileBinaryWriteInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  try {
    // Decode base64 data to Uint8Array
    const binaryString = atob(input.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const result = await writeBinaryFile(input.path, bytes, {
      createDirectories: input.createDirectories,
    });
    
    if (result.success) {
      return {
        success: true,
        data: {
          path: result.path,
          bytesWritten: result.bytesWritten,
        },
      };
    }
    
    return {
      success: false,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write binary file',
    };
  }
}

/**
 * File tool definitions for AI agents
 */
export const fileTools = {
  file_read: {
    name: 'file_read',
    description:
      'Read the contents of a text file from the local file system. Use this to read code files, configuration files, documents, etc.',
    parameters: fileReadInputSchema,
    execute: executeFileRead,
    requiresApproval: false,
    category: 'file' as const,
  },
  file_write: {
    name: 'file_write',
    description:
      'Write content to a file on the local file system. Use this to create or update files.',
    parameters: fileWriteInputSchema,
    execute: executeFileWrite,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_list: {
    name: 'file_list',
    description:
      'List the contents of a directory, showing files and subdirectories.',
    parameters: fileListInputSchema,
    execute: executeFileList,
    requiresApproval: false,
    category: 'file' as const,
  },
  file_exists: {
    name: 'file_exists',
    description: 'Check if a file or directory exists at the given path.',
    parameters: fileExistsInputSchema,
    execute: executeFileExists,
    requiresApproval: false,
    category: 'file' as const,
  },
  file_delete: {
    name: 'file_delete',
    description: 'Delete a file from the local file system.',
    parameters: fileDeleteInputSchema,
    execute: executeFileDelete,
    requiresApproval: true,
    category: 'file' as const,
  },
  directory_create: {
    name: 'directory_create',
    description: 'Create a new directory on the local file system.',
    parameters: directoryCreateInputSchema,
    execute: executeDirectoryCreate,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_copy: {
    name: 'file_copy',
    description: 'Copy a file from one location to another on the local file system.',
    parameters: fileCopyInputSchema,
    execute: executeFileCopy,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_rename: {
    name: 'file_rename',
    description: 'Rename or move a file to a new location on the local file system.',
    parameters: fileRenameInputSchema,
    execute: executeFileRename,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_info: {
    name: 'file_info',
    description: 'Get detailed information about a file or directory, including size, type, and modification time.',
    parameters: fileInfoInputSchema,
    execute: executeFileInfo,
    requiresApproval: false,
    category: 'file' as const,
  },
  file_search: {
    name: 'file_search',
    description: 'Search for files in a directory by name pattern or file extension. Can search recursively.',
    parameters: fileSearchInputSchema,
    execute: executeFileSearch,
    requiresApproval: false,
    category: 'file' as const,
  },
  file_append: {
    name: 'file_append',
    description: 'Append content to the end of an existing file. Creates the file if it does not exist.',
    parameters: fileAppendInputSchema,
    execute: executeFileAppend,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_binary_write: {
    name: 'file_binary_write',
    description: 'Write binary data to a file on the local file system. Use this to save images, audio, video, or other binary files. Data must be base64-encoded.',
    parameters: fileBinaryWriteInputSchema,
    execute: executeBinaryWrite,
    requiresApproval: true,
    category: 'file' as const,
  },
  content_search: {
    name: 'content_search',
    description: 'Search for text patterns within file contents (grep-like). Searches recursively through text files in a directory. Supports regex patterns, case-sensitive matching, and file extension filtering. Skips binary files, node_modules, .git, and other non-content directories.',
    parameters: contentSearchInputSchema,
    execute: executeContentSearch,
    requiresApproval: false,
    category: 'file' as const,
  },
  directory_delete: {
    name: 'directory_delete',
    description: 'Delete a directory from the local file system. Can delete recursively (including all contents). System-critical directories are protected and cannot be deleted.',
    parameters: directoryDeleteInputSchema,
    execute: executeDirectoryDelete,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_move: {
    name: 'file_move',
    description: 'Move a file or directory to a new location. Handles cross-partition moves automatically (copy + delete). Unlike file_rename, this is optimized for moves across different locations.',
    parameters: fileMoveInputSchema,
    execute: executeFileMove,
    requiresApproval: true,
    category: 'file' as const,
  },
  file_hash: {
    name: 'file_hash',
    description: 'Compute a hash/checksum of a file. Supports sha256 (default), sha1, sha512, and md5 algorithms. Use this to verify file integrity or detect changes.',
    parameters: fileHashInputSchema,
    execute: executeFileHash,
    requiresApproval: false,
    category: 'file' as const,
  },
};

// ==================== New Tool Executors ====================

/**
 * Execute content search operation (grep-like)
 */
export async function executeContentSearch(
  input: ContentSearchInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await searchFileContents(input.directory, input.pattern, {
    regex: input.regex,
    caseSensitive: input.caseSensitive,
    extensions: input.extensions,
    recursive: input.recursive,
    maxResults: input.maxResults,
  });

  if (result.success && result.matches) {
    return {
      success: true,
      data: {
        matches: result.matches.map((m) => ({
          file: m.file,
          line: m.line,
          column: m.column,
          content: m.content,
          matchedText: m.matchedText,
        })),
        totalMatches: result.matches.length,
        filesSearched: result.filesSearched,
        directory: input.directory,
        pattern: input.pattern,
      },
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute directory delete operation
 */
export async function executeDirectoryDelete(
  input: DirectoryDeleteInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await deleteDirectory(input.path, input.recursive);

  if (result.success) {
    return {
      success: true,
      data: {
        deleted: true,
        path: input.path,
        recursive: input.recursive,
      },
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file move operation
 */
export async function executeFileMove(
  input: FileMoveInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await moveFile(input.source, input.destination);

  if (result.success) {
    return {
      success: true,
      data: {
        moved: true,
        source: input.source,
        destination: input.destination,
      },
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Execute file hash operation
 */
export async function executeFileHash(
  input: FileHashInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  const result = await getFileHash(input.path, input.algorithm as HashAlgorithm);

  if (result.success) {
    return {
      success: true,
      data: {
        path: input.path,
        hash: result.hash,
        algorithm: result.algorithm,
      },
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

// ==================== File Diff ====================

export const fileDiffInputSchema = z.object({
  path1: z.string().describe('Absolute path to the first file'),
  path2: z.string().describe('Absolute path to the second file'),
  contextLines: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .default(3)
    .describe('Number of context lines around each change (default: 3)'),
});

export type FileDiffInput = z.infer<typeof fileDiffInputSchema>;

/**
 * Simple line-based diff using LCS (Longest Common Subsequence) approach
 */
function computeDiff(
  lines1: string[],
  lines2: string[],
  contextLines: number
): { hunks: DiffHunk[]; stats: { added: number; removed: number; unchanged: number } } {
  // Build LCS table
  const m = lines1.length;
  const n = lines2.length;

  // For very large files, fall back to a simpler comparison
  if (m * n > 10_000_000) {
    return simpleDiff(lines1, lines2, contextLines);
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find changes
  const changes: Array<{ type: 'same' | 'add' | 'remove'; line: string; lineNum1?: number; lineNum2?: number }> = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      changes.unshift({ type: 'same', line: lines1[i - 1], lineNum1: i, lineNum2: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      changes.unshift({ type: 'add', line: lines2[j - 1], lineNum2: j });
      j--;
    } else {
      changes.unshift({ type: 'remove', line: lines1[i - 1], lineNum1: i });
      i--;
    }
  }

  // Group into hunks with context
  return groupIntoHunks(changes, contextLines);
}

interface DiffHunk {
  startLine1: number;
  startLine2: number;
  lines: string[];
}

function groupIntoHunks(
  changes: Array<{ type: 'same' | 'add' | 'remove'; line: string; lineNum1?: number; lineNum2?: number }>,
  contextLines: number
): { hunks: DiffHunk[]; stats: { added: number; removed: number; unchanged: number } } {
  let added = 0, removed = 0, unchanged = 0;

  // Find change regions
  const changeIndices: number[] = [];
  for (let idx = 0; idx < changes.length; idx++) {
    if (changes[idx].type !== 'same') {
      changeIndices.push(idx);
    }
    if (changes[idx].type === 'add') added++;
    else if (changes[idx].type === 'remove') removed++;
    else unchanged++;
  }

  if (changeIndices.length === 0) {
    return { hunks: [], stats: { added, removed, unchanged } };
  }

  // Merge nearby changes into hunks
  const hunks: DiffHunk[] = [];
  let hunkStart = Math.max(0, changeIndices[0] - contextLines);

  for (let ci = 0; ci < changeIndices.length; ci++) {
    const nextCi = ci + 1 < changeIndices.length ? changeIndices[ci + 1] : -1;
    const currentEnd = changeIndices[ci] + contextLines;

    if (nextCi !== -1 && nextCi - contextLines <= currentEnd) {
      continue; // Merge with next change
    }

    const hunkEnd = Math.min(changes.length - 1, currentEnd);
    const hunkLines: string[] = [];
    let s1 = 0, s2 = 0;

    for (let idx = hunkStart; idx <= hunkEnd; idx++) {
      const c = changes[idx];
      if (idx === hunkStart) {
        s1 = c.lineNum1 ?? 1;
        s2 = c.lineNum2 ?? 1;
      }
      if (c.type === 'same') hunkLines.push(` ${c.line}`);
      else if (c.type === 'add') hunkLines.push(`+${c.line}`);
      else if (c.type === 'remove') hunkLines.push(`-${c.line}`);
    }

    hunks.push({ startLine1: s1, startLine2: s2, lines: hunkLines });

    // Set start for next hunk
    if (nextCi !== -1) {
      hunkStart = Math.max(hunkEnd + 1, nextCi - contextLines);
    }
  }

  return { hunks, stats: { added, removed, unchanged } };
}

/**
 * Simple diff fallback for very large files - compare line by line
 */
function simpleDiff(
  lines1: string[],
  lines2: string[],
  contextLines: number
): { hunks: DiffHunk[]; stats: { added: number; removed: number; unchanged: number } } {
  const changes: Array<{ type: 'same' | 'add' | 'remove'; line: string; lineNum1?: number; lineNum2?: number }> = [];
  const maxLen = Math.max(lines1.length, lines2.length);

  for (let idx = 0; idx < maxLen; idx++) {
    if (idx < lines1.length && idx < lines2.length) {
      if (lines1[idx] === lines2[idx]) {
        changes.push({ type: 'same', line: lines1[idx], lineNum1: idx + 1, lineNum2: idx + 1 });
      } else {
        changes.push({ type: 'remove', line: lines1[idx], lineNum1: idx + 1 });
        changes.push({ type: 'add', line: lines2[idx], lineNum2: idx + 1 });
      }
    } else if (idx < lines1.length) {
      changes.push({ type: 'remove', line: lines1[idx], lineNum1: idx + 1 });
    } else {
      changes.push({ type: 'add', line: lines2[idx], lineNum2: idx + 1 });
    }
  }

  return groupIntoHunks(changes, contextLines);
}

/**
 * Execute file diff operation
 */
export async function executeFileDiff(
  input: FileDiffInput
): Promise<FileToolResult> {
  if (!isInTauri()) {
    return {
      success: false,
      error: 'File operations are only available in the desktop app',
    };
  }

  try {
    const [result1, result2] = await Promise.all([
      readTextFile(input.path1),
      readTextFile(input.path2),
    ]);

    if (!result1.success || !result1.content) {
      return { success: false, error: `Failed to read file: ${input.path1}` };
    }
    if (!result2.success || !result2.content) {
      return { success: false, error: `Failed to read file: ${input.path2}` };
    }

    const lines1 = result1.content.split('\n');
    const lines2 = result2.content.split('\n');
    const { hunks, stats } = computeDiff(lines1, lines2, input.contextLines ?? 3);

    if (hunks.length === 0) {
      return {
        success: true,
        data: {
          identical: true,
          path1: input.path1,
          path2: input.path2,
          stats,
        },
      };
    }

    // Format output as unified diff
    const diffOutput = hunks.map(h => {
      const header = `@@ -${h.startLine1} +${h.startLine2} @@`;
      return [header, ...h.lines].join('\n');
    }).join('\n\n');

    return {
      success: true,
      data: {
        identical: false,
        path1: input.path1,
        path2: input.path2,
        stats,
        diff: diffOutput,
        hunkCount: hunks.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to diff files: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ==================== System Prompt ====================

/**
 * System prompt guidance for file tools
 */
export const fileToolSystemPrompt = `## File Tools Guide

You have access to file system tools for reading, writing, and managing files on the user's desktop.

### Available Operations
- **file_read**: Read text files. Supports \`startLine\`/\`endLine\` for partial reads of large files. Returns \`totalLines\` to help plan reads.
- **file_write**: Write text to files. Use \`createDirectories: true\` to auto-create parent directories.
- **file_list**: List directory contents. Use \`recursive: true\` with \`maxDepth\` for tree-style listings.
- **file_exists**: Check if a file or directory exists before operating on it.
- **file_delete**: Delete files (requires approval).
- **directory_create**: Create directories.
- **file_copy / file_rename / file_move**: Copy, rename, or move files.
- **file_info**: Get file metadata (size, timestamps, extension).
- **file_search**: Find files by name pattern in a directory.
- **content_search**: Search for text patterns within file contents (like grep).
- **file_append**: Append content to existing files.
- **file_hash**: Compute file checksums (md5, sha1, sha256, sha512).
- **file_diff**: Compare two files and show differences in unified diff format. Use \`contextLines\` to control surrounding context.

### Best Practices
1. Always use \`file_exists\` before reading to avoid errors.
2. For large files, use \`startLine\`/\`endLine\` to read relevant sections only.
3. Use \`file_list\` with \`recursive: true\` to explore project structure.
4. Use \`content_search\` to find specific code patterns across files.
5. Prefer \`file_append\` over read+modify+write for adding content to files.
6. Use \`file_diff\` to compare files before and after modifications.
7. All write/delete operations require user approval.`;

/**
 * Short snippet version of file tools prompt
 */
export const fileToolPromptSnippet = `File tools available: file_read (with line ranges), file_write, file_list (with recursive), file_exists, file_delete, file_copy, file_rename, file_move, file_info, file_search, content_search, file_append, file_hash, file_diff. Use file_exists before reads, startLine/endLine for large files, file_diff for comparing files.`;
