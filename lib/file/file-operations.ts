/**
 * File Operations - Local file system operations for Tauri
 * Provides read, write, list, and other file operations
 */

import { loggers } from '@/lib/logger';

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
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
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
  if (!isTauri) return false;
  
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
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
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
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
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
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      path,
    };
  }

  try {
    const { readTextFile: tauriReadTextFile, writeTextFile: tauriWriteTextFile } = await import('@tauri-apps/plugin-fs');
    
    let existingContent = '';
    try {
      existingContent = await tauriReadTextFile(path);
    } catch {
      // File doesn't exist, will be created
    }
    
    const newContent = existingContent + content;
    await tauriWriteTextFile(path, newContent);
    
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
