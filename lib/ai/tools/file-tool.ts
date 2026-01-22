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
} from '@/lib/file/file-operations';

export const fileReadInputSchema = z.object({
  path: z.string().describe('The absolute path to the file to read'),
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
    return {
      success: true,
      data: {
        content: result.content,
        path: result.path,
        size: result.size,
        mimeType: result.mimeType,
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
};
