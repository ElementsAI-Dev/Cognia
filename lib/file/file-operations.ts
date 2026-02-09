/**
 * File Operations - Local file system operations for Tauri
 * Provides read, write, list, and other file operations
 */

import { loggers } from '@/lib/logger';
import {
  isOPFSAvailable,
  webReadTextFile,
  webWriteTextFile,
  webListDirectory,
  webExists,
  webDeleteFile,
  webCreateDirectory,
  webAppendTextFile,
} from './web-file-operations';

const log = loggers.native;

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// File size limits
const DEFAULT_MAX_READ_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_WRITE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * File operation error codes
 */
export enum FileErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  DISK_FULL = 'DISK_FULL',
  INVALID_PATH = 'INVALID_PATH',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  FILE_EXISTS = 'FILE_EXISTS',
  DIRECTORY_NOT_EMPTY = 'DIRECTORY_NOT_EMPTY',
  NOT_A_FILE = 'NOT_A_FILE',
  NOT_A_DIRECTORY = 'NOT_A_DIRECTORY',
  UNKNOWN = 'UNKNOWN',
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt?: Date;
  createdAt?: Date;
  extension?: string;
}

export interface DirectoryContents {
  path: string;
  files: FileInfo[];
  directories: FileInfo[];
}

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  errorCode?: FileErrorCode;
  path: string;
  size?: number;
  mimeType?: string;
}

export interface FileWriteResult {
  success: boolean;
  error?: string;
  errorCode?: FileErrorCode;
  path: string;
  bytesWritten?: number;
}

export interface FileOperationOptions {
  encoding?: 'utf-8' | 'binary';
  createDirectories?: boolean;
  overwrite?: boolean;
  maxSize?: number; // Maximum file size in bytes for read operations
}

/**
 * Read a text file from the local file system
 */
export async function readTextFile(
  path: string,
  options?: FileOperationOptions
): Promise<FileReadResult> {
  if (!isTauri) {
    // Web fallback: use OPFS
    if (isOPFSAvailable()) {
      return webReadTextFile(path);
    }
    return {
      success: false,
      error: 'File operations require Tauri desktop environment or a browser with OPFS support',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }

  // Validate path safety
  if (!isPathSafe(path)) {
    return {
      success: false,
      error: 'Invalid path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
      path,
    };
  }

  try {
    // Check file size before reading
    const maxSize = options?.maxSize ?? DEFAULT_MAX_READ_SIZE;
    const info = await getFileInfo(path);
    
    if (info.success && info.info) {
      if (info.info.size > maxSize) {
        return {
          success: false,
          error: `File too large: ${info.info.size} bytes exceeds maximum ${maxSize} bytes`,
          errorCode: FileErrorCode.FILE_TOO_LARGE,
          path,
          size: info.info.size,
        };
      }
    }

    const { readTextFile: tauriReadTextFile } = await import('@tauri-apps/plugin-fs');
    const content = await tauriReadTextFile(path);
    
    return {
      success: true,
      content,
      path,
      size: new Blob([content]).size,
      mimeType: getMimeType(path),
    };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
      path,
    };
  }
}

/**
 * Read a binary file from the local file system
 */
export async function readBinaryFile(
  path: string,
  options?: { maxSize?: number }
): Promise<{
  success: boolean;
  data?: Uint8Array;
  error?: string;
  errorCode?: FileErrorCode;
  path: string;
  size?: number;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }

  // Validate path safety
  if (!isPathSafe(path)) {
    return {
      success: false,
      error: 'Invalid path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
      path,
    };
  }

  try {
    // Check file size before reading
    const maxSize = options?.maxSize ?? DEFAULT_MAX_READ_SIZE;
    const info = await getFileInfo(path);
    
    if (info.success && info.info) {
      if (info.info.size > maxSize) {
        return {
          success: false,
          error: `File too large: ${info.info.size} bytes exceeds maximum ${maxSize} bytes`,
          errorCode: FileErrorCode.FILE_TOO_LARGE,
          path,
          size: info.info.size,
        };
      }
    }

    const { readFile } = await import('@tauri-apps/plugin-fs');
    const data = await readFile(path);
    
    return {
      success: true,
      data,
      path,
      size: data.byteLength,
    };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
      path,
    };
  }
}

/**
 * Write content to a text file
 */
export async function writeTextFile(
  path: string,
  content: string,
  options?: FileOperationOptions
): Promise<FileWriteResult> {
  if (!isTauri) {
    if (isOPFSAvailable()) {
      return webWriteTextFile(path, content, { createDirectories: options?.createDirectories });
    }
    return {
      success: false,
      error: 'File operations require Tauri desktop environment or a browser with OPFS support',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }

  // Validate path safety
  if (!isPathSafe(path)) {
    return {
      success: false,
      error: 'Invalid path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
      path,
    };
  }

  // Check content size
  const contentSize = new Blob([content]).size;
  const maxSize = options?.maxSize ?? DEFAULT_MAX_WRITE_SIZE;
  if (contentSize > maxSize) {
    return {
      success: false,
      error: `Content too large: ${contentSize} bytes exceeds maximum ${maxSize} bytes`,
      errorCode: FileErrorCode.FILE_TOO_LARGE,
      path,
    };
  }

  // Check overwrite protection
  if (options?.overwrite === false) {
    const fileExists = await exists(path);
    if (fileExists) {
      return {
        success: false,
        error: 'File already exists and overwrite is disabled',
        errorCode: FileErrorCode.FILE_EXISTS,
        path,
      };
    }
  }

  try {
    const { writeTextFile: tauriWriteTextFile, mkdir } = await import('@tauri-apps/plugin-fs');
    
    // Create parent directories if needed
    if (options?.createDirectories) {
      const sanitized = sanitizePath(path);
      const parentDir = sanitized.substring(0, sanitized.lastIndexOf('/'));
      if (parentDir) {
        try {
          await mkdir(parentDir, { recursive: true });
        } catch (mkdirError) {
          // Only ignore if directory already exists
          const { code } = parseFileError(mkdirError);
          if (code !== FileErrorCode.FILE_EXISTS) {
            throw mkdirError;
          }
        }
      }
    }
    
    await tauriWriteTextFile(path, content);
    
    return {
      success: true,
      path,
      bytesWritten: contentSize,
    };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
      path,
    };
  }
}

/**
 * Write binary data to a file
 */
export async function writeBinaryFile(
  path: string,
  data: Uint8Array | ArrayBuffer,
  options?: Omit<FileOperationOptions, 'maxSize'>
): Promise<FileWriteResult> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }

  // Validate path safety
  if (!isPathSafe(path)) {
    return {
      success: false,
      error: 'Invalid path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
      path,
    };
  }

  // Convert ArrayBuffer to Uint8Array if needed
  const uint8Data = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  // Check data size
  const dataSize = uint8Data.byteLength;
  const maxSize = DEFAULT_MAX_WRITE_SIZE;
  if (dataSize > maxSize) {
    return {
      success: false,
      error: `Data too large: ${dataSize} bytes exceeds maximum ${maxSize} bytes`,
      errorCode: FileErrorCode.FILE_TOO_LARGE,
      path,
    };
  }

  // Check overwrite protection
  if (options?.overwrite === false) {
    const fileExists = await exists(path);
    if (fileExists) {
      return {
        success: false,
        error: 'File already exists and overwrite is disabled',
        errorCode: FileErrorCode.FILE_EXISTS,
        path,
      };
    }
  }

  try {
    const { writeFile, mkdir } = await import('@tauri-apps/plugin-fs');
    
    // Create parent directories if needed
    if (options?.createDirectories) {
      const sanitized = sanitizePath(path);
      const parentDir = sanitized.substring(0, sanitized.lastIndexOf('/'));
      if (parentDir) {
        try {
          await mkdir(parentDir, { recursive: true });
        } catch (mkdirError) {
          const { code } = parseFileError(mkdirError);
          if (code !== FileErrorCode.FILE_EXISTS) {
            throw mkdirError;
          }
        }
      }
    }
    
    await writeFile(path, uint8Data);
    
    return {
      success: true,
      path,
      bytesWritten: dataSize,
    };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
      path,
    };
  }
}

/**
 * List contents of a directory
 */
export async function listDirectory(path: string): Promise<{
  success: boolean;
  contents?: DirectoryContents;
  error?: string;
}> {
  if (!isTauri) {
    if (isOPFSAvailable()) {
      return webListDirectory(path);
    }
    return {
      success: false,
      error: 'File operations require Tauri desktop environment or a browser with OPFS support',
    };
  }

  try {
    const { readDir, stat } = await import('@tauri-apps/plugin-fs');
    const entries = await readDir(path);
    
    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];
    
    for (const entry of entries) {
      const fullPath = `${path}/${entry.name}`;
      
      try {
        const fileStats = await stat(fullPath);
        const info: FileInfo = {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory,
          size: fileStats.size,
          modifiedAt: fileStats.mtime ? new Date(fileStats.mtime) : undefined,
          extension: entry.isDirectory ? undefined : getExtension(entry.name),
        };
        
        if (entry.isDirectory) {
          directories.push(info);
        } else {
          files.push(info);
        }
      } catch {
        // Skip files we can't stat
      }
    }
    
    return {
      success: true,
      contents: {
        path,
        files: files.sort((a, b) => a.name.localeCompare(b.name)),
        directories: directories.sort((a, b) => a.name.localeCompare(b.name)),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list directory',
    };
  }
}

/**
 * Check if a file or directory exists
 */
export async function exists(path: string): Promise<boolean> {
  if (!isTauri) {
    if (isOPFSAvailable()) return webExists(path);
    return false;
  }
  
  try {
    const { exists: tauriExists } = await import('@tauri-apps/plugin-fs');
    return await tauriExists(path);
  } catch {
    return false;
  }
}

/**
 * Delete a file
 */
export async function deleteFile(path: string): Promise<{
  success: boolean;
  error?: string;
  errorCode?: FileErrorCode;
}> {
  if (!isTauri) {
    if (isOPFSAvailable()) {
      return webDeleteFile(path);
    }
    return {
      success: false,
      error: 'File operations require Tauri desktop environment or a browser with OPFS support',
      errorCode: FileErrorCode.UNKNOWN,
    };
  }

  // Validate path safety
  if (!isPathSafe(path)) {
    return {
      success: false,
      error: 'Invalid path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }

  try {
    const { remove } = await import('@tauri-apps/plugin-fs');
    await remove(path);
    return { success: true };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
    };
  }
}

/**
 * Create a directory
 */
export async function createDirectory(
  path: string,
  recursive = true
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauri) {
    if (isOPFSAvailable()) {
      return webCreateDirectory(path, recursive);
    }
    return {
      success: false,
      error: 'File operations require Tauri desktop environment or a browser with OPFS support',
    };
  }

  try {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    await mkdir(path, { recursive });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create directory',
    };
  }
}

/**
 * Copy a file
 */
export async function copyFile(
  source: string,
  destination: string
): Promise<{
  success: boolean;
  error?: string;
  errorCode?: FileErrorCode;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      errorCode: FileErrorCode.UNKNOWN,
    };
  }

  // Validate paths safety
  if (!isPathSafe(source)) {
    return {
      success: false,
      error: 'Invalid source path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }
  if (!isPathSafe(destination)) {
    return {
      success: false,
      error: 'Invalid destination path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }

  try {
    const { copyFile: tauriCopyFile } = await import('@tauri-apps/plugin-fs');
    await tauriCopyFile(source, destination);
    return { success: true };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
    };
  }
}

/**
 * Rename/move a file
 */
export async function renameFile(
  oldPath: string,
  newPath: string
): Promise<{
  success: boolean;
  error?: string;
  errorCode?: FileErrorCode;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      errorCode: FileErrorCode.UNKNOWN,
    };
  }

  // Validate paths safety
  if (!isPathSafe(oldPath)) {
    return {
      success: false,
      error: 'Invalid old path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }
  if (!isPathSafe(newPath)) {
    return {
      success: false,
      error: 'Invalid new path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }

  try {
    const { rename } = await import('@tauri-apps/plugin-fs');
    await rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
    };
  }
}

/**
 * Open file dialog to select files
 */
export async function openFileDialog(options?: {
  multiple?: boolean;
  directory?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
  title?: string;
}): Promise<{
  success: boolean;
  paths?: string[];
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File dialogs require Tauri desktop environment',
    };
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const result = await open({
      multiple: options?.multiple ?? false,
      directory: options?.directory ?? false,
      filters: options?.filters,
      defaultPath: options?.defaultPath,
      title: options?.title,
    });
    
    if (result === null) {
      return { success: true, paths: [] };
    }
    
    const paths = Array.isArray(result) ? result : [result];
    return { success: true, paths };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open file dialog',
    };
  }
}

/**
 * Save file dialog
 */
export async function saveFileDialog(options?: {
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
  title?: string;
}): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File dialogs require Tauri desktop environment',
    };
  }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const result = await save({
      filters: options?.filters,
      defaultPath: options?.defaultPath,
      title: options?.title,
    });
    
    return {
      success: true,
      path: result ?? undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open save dialog',
    };
  }
}

// Helper functions

/**
 * Validate and sanitize file path to prevent path traversal attacks
 */
function sanitizePath(path: string): string {
  // Remove null bytes
  let sanitized = path.replace(/\0/g, '');
  
  // Normalize path separators to forward slashes
  sanitized = sanitized.replace(/\\/g, '/');
  
  // Remove any leading/trailing whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Check if a path is safe (no path traversal attempts)
 */
function isPathSafe(path: string): boolean {
  const sanitized = sanitizePath(path);
  
  // Check for path traversal patterns
  const dangerousPatterns = [
    /\.\.[\/\\]/,  // ../ or ..\\
    /[\/\\]\.\./,  // /.. or \...
    /^\.\./,        // starts with ..
    /\0/,           // null byte
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Parse Tauri error and map to FileErrorCode
 */
function parseFileError(error: unknown): { message: string; code: FileErrorCode } {
  if (!(error instanceof Error)) {
    return { message: 'Unknown error', code: FileErrorCode.UNKNOWN };
  }
  
  const message = error.message.toLowerCase();
  
  // Map common error messages to error codes
  if (message.includes('not found') || message.includes('no such file')) {
    return { message: error.message, code: FileErrorCode.NOT_FOUND };
  }
  if (message.includes('permission denied') || message.includes('access denied')) {
    return { message: error.message, code: FileErrorCode.PERMISSION_DENIED };
  }
  if (message.includes('disk full') || message.includes('no space left')) {
    return { message: error.message, code: FileErrorCode.DISK_FULL };
  }
  if (message.includes('is a directory') || message.includes('not a file')) {
    return { message: error.message, code: FileErrorCode.NOT_A_FILE };
  }
  if (message.includes('not a directory')) {
    return { message: error.message, code: FileErrorCode.NOT_A_DIRECTORY };
  }
  if (message.includes('directory not empty')) {
    return { message: error.message, code: FileErrorCode.DIRECTORY_NOT_EMPTY };
  }
  if (message.includes('already exists') || message.includes('file exists')) {
    return { message: error.message, code: FileErrorCode.FILE_EXISTS };
  }
  
  return { message: error.message, code: FileErrorCode.UNKNOWN };
}

function getExtension(filename: string): string | undefined {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return undefined;
  return filename.substring(lastDot + 1).toLowerCase();
}

function getMimeType(path: string): string {
  const ext = getExtension(path);
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript-jsx',
    jsx: 'text/javascript-jsx',
    html: 'text/html',
    css: 'text/css',
    xml: 'application/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    py: 'text/x-python',
    rs: 'text/x-rust',
    go: 'text/x-go',
    java: 'text/x-java',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    h: 'text/x-c',
    hpp: 'text/x-c++',
    sh: 'text/x-shellscript',
    sql: 'text/x-sql',
    csv: 'text/csv',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    zip: 'application/zip',
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Get detailed file information
 */
export async function getFileInfo(path: string): Promise<{
  success: boolean;
  info?: FileInfo & {
    mimeType: string;
  };
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    const { stat } = await import('@tauri-apps/plugin-fs');
    const fileStats = await stat(path);
    const filename = path.split('/').pop() || path.split('\\').pop() || path;
    const isDir = fileStats.isDirectory;
    
    return {
      success: true,
      info: {
        name: filename,
        path,
        isDirectory: isDir,
        size: fileStats.size,
        modifiedAt: fileStats.mtime ? new Date(fileStats.mtime) : undefined,
        createdAt: fileStats.birthtime ? new Date(fileStats.birthtime) : undefined,
        extension: isDir ? undefined : getExtension(filename),
        mimeType: isDir ? 'inode/directory' : getMimeType(path),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file info',
    };
  }
}

/**
 * Search for files in a directory
 */
export async function searchFiles(
  directory: string,
  options?: {
    pattern?: string;
    extensions?: string[];
    recursive?: boolean;
    maxResults?: number;
  }
): Promise<{
  success: boolean;
  files?: FileInfo[];
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    const { readDir, stat } = await import('@tauri-apps/plugin-fs');
    const results: FileInfo[] = [];
    const maxResults = options?.maxResults ?? 100;
    const pattern = options?.pattern?.toLowerCase();
    const extensions = options?.extensions?.map((e) => e.toLowerCase().replace(/^\./, ''));

    async function searchDir(dirPath: string, depth: number = 0): Promise<void> {
      if (results.length >= maxResults) return;
      if (!options?.recursive && depth > 0) return;

      try {
        const entries = await readDir(dirPath);
        
        for (const entry of entries) {
          if (results.length >= maxResults) break;
          
          const fullPath = `${dirPath}/${entry.name}`;
          
          if (entry.isDirectory) {
            if (options?.recursive) {
              await searchDir(fullPath, depth + 1);
            }
          } else {
            const ext = getExtension(entry.name);
            const nameMatches = !pattern || entry.name.toLowerCase().includes(pattern);
            const extMatches = !extensions || (ext && extensions.includes(ext));
            
            if (nameMatches && extMatches) {
              try {
                const fileStats = await stat(fullPath);
                results.push({
                  name: entry.name,
                  path: fullPath,
                  isDirectory: false,
                  size: fileStats.size,
                  modifiedAt: fileStats.mtime ? new Date(fileStats.mtime) : undefined,
                  extension: ext,
                });
              } catch {
                // Skip files we can't stat
              }
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }

    await searchDir(directory);
    
    return {
      success: true,
      files: results.sort((a, b) => a.name.localeCompare(b.name)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search files',
    };
  }
}

/**
 * Append content to a text file
 */
export async function appendTextFile(
  path: string,
  content: string
): Promise<FileWriteResult> {
  if (!isTauri) {
    if (isOPFSAvailable()) {
      return webAppendTextFile(path, content);
    }
    return {
      success: false,
      error: 'File operations require Tauri desktop environment or a browser with OPFS support',
      path,
    };
  }

  try {
    const { writeTextFile: tauriWriteTextFile, exists } = await import('@tauri-apps/plugin-fs');

    // Use Tauri's writeTextFile with append option for efficient append
    const fileExists = await exists(path).catch(() => false);
    if (fileExists) {
      // Open file and append using Tauri's open + write API
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fsModule = await import('@tauri-apps/plugin-fs') as any;
        const file = await fsModule.open(path, { write: true, append: true });
        const encoder = new TextEncoder();
        await file.write(encoder.encode(content));
        await file.close();
      } catch {
        // Fallback: read + write if open API is unavailable
        const { readTextFile: tauriReadTextFile } = await import('@tauri-apps/plugin-fs');
        const existingContent = await tauriReadTextFile(path);
        await tauriWriteTextFile(path, existingContent + content);
      }
    } else {
      // File doesn't exist, create with content
      await tauriWriteTextFile(path, content);
    }

    return {
      success: true,
      path,
      bytesWritten: new Blob([content]).size,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to append to file',
      path,
    };
  }
}

/**
 * Check if running in Tauri environment
 */
export function isInTauri(): boolean {
  return isTauri;
}

/**
 * Base directory enum for file operations
 * These map to standard system directories
 */
export enum BaseDirectory {
  Audio = 1,
  Cache = 2,
  Config = 3,
  Data = 4,
  LocalData = 5,
  Document = 6,
  Download = 7,
  Picture = 8,
  Public = 9,
  Video = 10,
  Resource = 11,
  Temp = 12,
  AppConfig = 13,
  AppData = 14,
  AppLocalData = 15,
  AppCache = 16,
  AppLog = 17,
  Desktop = 18,
  Executable = 19,
  Font = 20,
  Home = 21,
  Runtime = 22,
  Template = 23,
}

export interface WatchOptions {
  recursive?: boolean;
  delayMs?: number;
  baseDir?: BaseDirectory;
}

export interface WatchEvent {
  type: 'create' | 'modify' | 'remove' | 'rename' | 'any';
  paths: string[];
}

type WatchCallback = (event: WatchEvent) => void;

/**
 * Watch a file or directory for changes
 * Debounced version - only emits after a delay
 * @param path - The path to watch
 * @param callback - Callback function when changes occur
 * @param options - Watch options
 * @returns Unwatch function or null on error
 */
export async function watchPath(
  path: string,
  callback: WatchCallback,
  options?: WatchOptions
): Promise<(() => Promise<void>) | null> {
  if (!isTauri) {
    log.warn('File watching requires Tauri desktop environment');
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    const unwatch = await fs.watch(
      path,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        callback({
          type: event.type as WatchEvent['type'],
          paths: event.paths as string[],
        });
      },
      {
        recursive: options?.recursive ?? false,
        delayMs: options?.delayMs ?? 500,
        baseDir: options?.baseDir,
      }
    );
    return unwatch;
  } catch (error) {
    log.error('Failed to watch path', error as Error);
    return null;
  }
}

/**
 * Watch a file or directory for changes (immediate)
 * Notifies immediately without debouncing
 * @param path - The path to watch
 * @param callback - Callback function when changes occur
 * @param options - Watch options
 * @returns Unwatch function or null on error
 */
export async function watchPathImmediate(
  path: string,
  callback: WatchCallback,
  options?: WatchOptions
): Promise<(() => Promise<void>) | null> {
  if (!isTauri) {
    log.warn('File watching requires Tauri desktop environment');
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    const unwatch = await fs.watchImmediate(
      path,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        callback({
          type: event.type as WatchEvent['type'],
          paths: event.paths as string[],
        });
      },
      {
        recursive: options?.recursive ?? false,
        baseDir: options?.baseDir,
      }
    );
    return unwatch;
  } catch (error) {
    log.error('Failed to watch path', error as Error);
    return null;
  }
}

/**
 * Truncate a file to a specified length
 * @param path - The path to the file
 * @param length - The length to truncate to (defaults to 0)
 * @param baseDir - Optional base directory
 */
export async function truncateFile(
  path: string,
  length = 0,
  baseDir?: BaseDirectory
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    await fs.truncate(path, length, { baseDir });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to truncate file',
    };
  }
}

/**
 * Get file information without following symlinks (lstat)
 * Unlike stat, this returns info about the symlink itself
 * @param path - The path to the file or symlink
 */
export async function lstat(path: string): Promise<{
  success: boolean;
  info?: FileInfo & { isSymlink: boolean };
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    const fileStats = await fs.lstat(path);
    const filename = path.split('/').pop() || path.split('\\').pop() || path;
    const isDir = fileStats.isDirectory;
    const isSymlink = fileStats.isSymlink;

    return {
      success: true,
      info: {
        name: filename,
        path,
        isDirectory: isDir,
        isSymlink,
        size: fileStats.size,
        modifiedAt: fileStats.mtime ? new Date(fileStats.mtime) : undefined,
        createdAt: fileStats.birthtime ? new Date(fileStats.birthtime) : undefined,
        extension: isDir ? undefined : getExtension(filename),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file info',
    };
  }
}

/**
 * Read a text file from a base directory
 * @param path - Relative path from the base directory
 * @param baseDir - The base directory
 */
export async function readTextFileFromBaseDir(
  path: string,
  baseDir: BaseDirectory
): Promise<FileReadResult> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      path,
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    const content = await fs.readTextFile(path, { baseDir });

    return {
      success: true,
      content,
      path,
      size: new Blob([content]).size,
      mimeType: getMimeType(path),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      path,
    };
  }
}

/**
 * Write a text file to a base directory
 * @param path - Relative path from the base directory
 * @param content - Content to write
 * @param baseDir - The base directory
 */
export async function writeTextFileToBaseDir(
  path: string,
  content: string,
  baseDir: BaseDirectory
): Promise<FileWriteResult> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      path,
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    await fs.writeTextFile(path, content, { baseDir });

    return {
      success: true,
      path,
      bytesWritten: new Blob([content]).size,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write file',
      path,
    };
  }
}

/**
 * Check if a file exists in a base directory
 */
export async function existsInBaseDir(
  path: string,
  baseDir: BaseDirectory
): Promise<boolean> {
  if (!isTauri) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    return await fs.exists(path, { baseDir });
  } catch {
    return false;
  }
}

/**
 * Create a directory in a base directory
 */
export async function createDirectoryInBaseDir(
  path: string,
  baseDir: BaseDirectory,
  recursive = true
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    await fs.mkdir(path, { baseDir, recursive });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create directory',
    };
  }
}

/**
 * Delete a file in a base directory
 */
export async function deleteFileInBaseDir(
  path: string,
  baseDir: BaseDirectory
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fs = await import('@tauri-apps/plugin-fs') as any;
    await fs.remove(path, { baseDir });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}

/**
 * Delete a directory (optionally recursive)
 */
export async function deleteDirectory(
  path: string,
  recursive = false
): Promise<{
  success: boolean;
  error?: string;
  errorCode?: FileErrorCode;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      errorCode: FileErrorCode.UNKNOWN,
    };
  }

  if (!isPathSafe(path)) {
    return {
      success: false,
      error: 'Invalid path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }

  // Block deletion of system-critical directories
  const dangerousPaths = [
    '/', '/usr', '/bin', '/sbin', '/etc', '/var', '/tmp', '/home',
    'C:\\', 'C:\\Windows', 'C:\\Program Files', 'C:\\Users',
    'D:\\', 'E:\\',
  ];
  const normalizedPath = sanitizePath(path).replace(/\/+$/, '');
  if (dangerousPaths.some((d) => normalizedPath.toLowerCase() === d.toLowerCase().replace(/\\/g, '/'))) {
    return {
      success: false,
      error: 'Cannot delete system-critical directory',
      errorCode: FileErrorCode.PERMISSION_DENIED,
    };
  }

  try {
    const { remove } = await import('@tauri-apps/plugin-fs');
    await remove(path, { recursive });
    return { success: true };
  } catch (error) {
    const { message, code } = parseFileError(error);
    return {
      success: false,
      error: message,
      errorCode: code,
    };
  }
}

/**
 * Move a file or directory to a new location
 * Unlike rename, this handles cross-partition moves by copy+delete
 */
export async function moveFile(
  source: string,
  destination: string
): Promise<{
  success: boolean;
  error?: string;
  errorCode?: FileErrorCode;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      errorCode: FileErrorCode.UNKNOWN,
    };
  }

  if (!isPathSafe(source)) {
    return {
      success: false,
      error: 'Invalid source path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }
  if (!isPathSafe(destination)) {
    return {
      success: false,
      error: 'Invalid destination path: path traversal detected',
      errorCode: FileErrorCode.PATH_TRAVERSAL,
    };
  }

  try {
    // Try rename first (fast, same-partition)
    const { rename } = await import('@tauri-apps/plugin-fs');
    await rename(source, destination);
    return { success: true };
  } catch {
    // Rename failed (possibly cross-partition), try copy+delete
    try {
      const { copyFile: tauriCopyFile, remove } = await import('@tauri-apps/plugin-fs');
      await tauriCopyFile(source, destination);
      await remove(source);
      return { success: true };
    } catch (error) {
      const { message, code } = parseFileError(error);
      return {
        success: false,
        error: message,
        errorCode: code,
      };
    }
  }
}

export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha512';

/**
 * Pure-JS MD5 implementation (RFC 1321)
 * Web Crypto API does not support MD5, so we implement it directly.
 * Returns a standard 32-character hex string.
 */
function computeMD5(data: Uint8Array): string {
  // Helper functions
  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);
  const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n));

  const K = [
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391,
  ];
  const S = [
    7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21,
  ];

  // Pre-processing: padding
  const bitLen = data.length * 8;
  const padLen = ((56 - ((data.length + 1) % 64)) + 64) % 64;
  const padded = new Uint8Array(data.length + 1 + padLen + 8);
  padded.set(data);
  padded[data.length] = 0x80;
  // Append original length in bits as 64-bit LE
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  // Initialize hash values
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  // Process each 64-byte block
  for (let offset = 0; offset < padded.length; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = dv.getUint32(offset + j * 4, true);
    }

    let a = a0, b = b0, c = c0, d = d0;

    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = F(b, c, d); g = i; }
      else if (i < 32) { f = G(b, c, d); g = (5 * i + 1) % 16; }
      else if (i < 48) { f = H(b, c, d); g = (3 * i + 5) % 16; }
      else { f = I(b, c, d); g = (7 * i) % 16; }

      const temp = d;
      d = c;
      c = b;
      b = (b + rotl((a + f + K[i] + M[g]) >>> 0, S[i])) >>> 0;
      a = temp;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  // Output as 32-char hex string (little-endian)
  const toHex = (n: number) => {
    const bytes = new Uint8Array(4);
    bytes[0] = n & 0xff;
    bytes[1] = (n >>> 8) & 0xff;
    bytes[2] = (n >>> 16) & 0xff;
    bytes[3] = (n >>> 24) & 0xff;
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}

/**
 * Compute a file hash/checksum
 */
export async function getFileHash(
  path: string,
  algorithm: HashAlgorithm = 'sha256'
): Promise<{
  success: boolean;
  hash?: string;
  algorithm?: HashAlgorithm;
  error?: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const data = await readFile(path);

    // Use Web Crypto API for hashing
    const algorithmMap: Record<HashAlgorithm, string> = {
      md5: 'MD5',
      sha1: 'SHA-1',
      sha256: 'SHA-256',
      sha512: 'SHA-512',
    };

    // MD5 is not supported by Web Crypto API, use pure-JS MD5 implementation
    if (algorithm === 'md5') {
      const md5Hash = computeMD5(new Uint8Array(data.buffer as ArrayBuffer));
      return {
        success: true,
        hash: md5Hash,
        algorithm,
      };
    }

    const hashBuffer = await crypto.subtle.digest(algorithmMap[algorithm], data.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return {
      success: true,
      hash: hashHex,
      algorithm,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compute file hash',
    };
  }
}

export interface ContentSearchMatch {
  file: string;
  line: number;
  column: number;
  content: string;
  matchedText: string;
}

export interface ContentSearchResult {
  success: boolean;
  matches?: ContentSearchMatch[];
  filesSearched?: number;
  error?: string;
}

/**
 * Search for text patterns within file contents (grep-like)
 */
export async function searchFileContents(
  directory: string,
  pattern: string,
  options?: {
    regex?: boolean;
    caseSensitive?: boolean;
    extensions?: string[];
    recursive?: boolean;
    maxResults?: number;
    maxFileSize?: number;
    contextLines?: number;
  }
): Promise<ContentSearchResult> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  const maxResults = options?.maxResults ?? 100;
  const maxFileSize = options?.maxFileSize ?? 5 * 1024 * 1024; // 5MB
  const recursive = options?.recursive ?? true;
  const caseSensitive = options?.caseSensitive ?? false;
  const extensions = options?.extensions?.map((e) => e.toLowerCase().replace(/^\./, ''));
  const matches: ContentSearchMatch[] = [];
  let filesSearched = 0;

  // Build search pattern
  let searchRegex: RegExp;
  try {
    if (options?.regex) {
      searchRegex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    } else {
      // Escape special regex chars for literal search
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    }
  } catch {
    return {
      success: false,
      error: `Invalid search pattern: ${pattern}`,
    };
  }

  const { readDir, stat, readTextFile: tauriReadTextFile } = await import('@tauri-apps/plugin-fs');

  // Text file extensions that are safe to search
  const textExtensions = new Set([
    'txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml',
    'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env', 'sh', 'bash',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
    'php', 'sql', 'r', 'swift', 'kt', 'scala', 'lua', 'pl', 'pm',
    'csv', 'tsv', 'log', 'svg', 'vue', 'svelte', 'astro',
    'makefile', 'dockerfile', 'gitignore', 'editorconfig',
  ]);

  async function isTextFile(name: string): Promise<boolean> {
    const ext = getExtension(name);
    if (extensions) {
      return ext ? extensions.includes(ext) : false;
    }
    if (!ext) {
      // Check common extensionless text files
      const lowerName = name.toLowerCase();
      return ['makefile', 'dockerfile', 'readme', 'license', 'changelog', '.gitignore', '.env'].some(
        (n) => lowerName === n || lowerName.endsWith(n)
      );
    }
    return textExtensions.has(ext);
  }

  async function searchDir(dirPath: string, depth: number = 0): Promise<void> {
    if (matches.length >= maxResults) return;
    if (!recursive && depth > 0) return;

    try {
      const entries = await readDir(dirPath);

      for (const entry of entries) {
        if (matches.length >= maxResults) break;

        const fullPath = `${dirPath}/${entry.name}`;

        if (entry.isDirectory) {
          // Skip common non-content directories
          const skipDirs = ['node_modules', '.git', '.svn', '__pycache__', 'dist', 'build', '.next', 'target'];
          if (!skipDirs.includes(entry.name) && recursive) {
            await searchDir(fullPath, depth + 1);
          }
        } else if (await isTextFile(entry.name)) {
          try {
            const fileStats = await stat(fullPath);
            if (fileStats.size > maxFileSize) continue;

            filesSearched++;
            const content = await tauriReadTextFile(fullPath);
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= maxResults) break;

              searchRegex.lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = searchRegex.exec(lines[i])) !== null) {
                if (matches.length >= maxResults) break;
                matches.push({
                  file: fullPath,
                  line: i + 1,
                  column: match.index + 1,
                  content: lines[i].substring(0, 500), // Limit line length
                  matchedText: match[0],
                });
              }
            }
          } catch {
            // Skip files we can't read
          }
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  try {
    await searchDir(directory);
    return {
      success: true,
      matches,
      filesSearched,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search file contents',
    };
  }
}
