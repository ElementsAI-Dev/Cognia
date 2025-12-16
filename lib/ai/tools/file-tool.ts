/**
 * File Tool - File operations for AI agents
 */

import { z } from 'zod';
import {
  readTextFile,
  writeTextFile,
  listDirectory,
  exists,
  deleteFile,
  createDirectory,
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

export type FileReadInput = z.infer<typeof fileReadInputSchema>;
export type FileWriteInput = z.infer<typeof fileWriteInputSchema>;
export type FileListInput = z.infer<typeof fileListInputSchema>;
export type FileExistsInput = z.infer<typeof fileExistsInputSchema>;
export type FileDeleteInput = z.infer<typeof fileDeleteInputSchema>;
export type DirectoryCreateInput = z.infer<typeof directoryCreateInputSchema>;

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
};
