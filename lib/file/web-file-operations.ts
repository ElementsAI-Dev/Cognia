/**
 * Web File Operations - Browser-based file system fallbacks
 * 
 * Provides file operations for web (non-Tauri) environments using:
 * 1. Origin Private File System (OPFS) - available in all modern browsers
 * 2. File System Access API (FSAA) - Chrome/Edge only, for user-selected files
 * 
 * These are intentionally limited compared to Tauri operations:
 * - OPFS provides a sandboxed virtual file system
 * - No access to the real local file system
 * - Used primarily for workspace/project file management within the app
 */

import type {
  FileReadResult,
  FileWriteResult,
  FileInfo,
  DirectoryContents,
} from './file-operations';
import { FileErrorCode } from './file-operations';

// ==================== OPFS Helpers ====================

/**
 * Check if OPFS is available
 */
export function isOPFSAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * Check if File System Access API is available
 */
export function isFSAAAvailable(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

/**
 * Get the OPFS root directory handle
 */
async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory();
}

/**
 * Navigate to a directory handle from a path
 * Creates directories along the way if create=true
 */
async function navigateToPath(
  path: string,
  options?: { create?: boolean }
): Promise<{ parent: FileSystemDirectoryHandle; name: string }> {
  const root = await getOPFSRoot();
  const parts = normalizePath(path).split('/').filter(Boolean);

  if (parts.length === 0) {
    throw new Error('Invalid path');
  }

  const name = parts.pop()!;
  let current = root;

  for (const part of parts) {
    try {
      current = await current.getDirectoryHandle(part, { create: options?.create ?? false });
    } catch {
      throw new Error(`Directory not found: ${part}`);
    }
  }

  return { parent: current, name };
}

/**
 * Normalize a path for OPFS (remove leading slashes, normalize separators)
 */
function normalizePath(path: string): string {
  return path
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/');
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'application/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    jsx: 'text/javascript',
    html: 'text/html',
    css: 'text/css',
    xml: 'application/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    py: 'text/x-python',
    rs: 'text/x-rust',
    go: 'text/x-go',
    java: 'text/x-java',
    csv: 'text/csv',
    svg: 'image/svg+xml',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

// ==================== Web File Operations ====================

/**
 * Read a text file from OPFS
 */
export async function webReadTextFile(path: string): Promise<FileReadResult> {
  if (!isOPFSAvailable()) {
    return {
      success: false,
      error: 'File operations are not available in this browser. Origin Private File System (OPFS) is required.',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }

  try {
    const { parent, name } = await navigateToPath(path);
    const fileHandle = await parent.getFileHandle(name);
    const file = await fileHandle.getFile();
    const content = await file.text();

    return {
      success: true,
      content,
      path,
      size: file.size,
      mimeType: getMimeType(name),
    };
  } catch (error) {
    const isNotFound = error instanceof DOMException && error.name === 'NotFoundError';
    return {
      success: false,
      error: isNotFound ? `File not found: ${path}` : (error instanceof Error ? error.message : 'Failed to read file'),
      errorCode: isNotFound ? FileErrorCode.NOT_FOUND : FileErrorCode.UNKNOWN,
      path,
    };
  }
}

/**
 * Write a text file to OPFS
 */
export async function webWriteTextFile(
  path: string,
  content: string,
  options?: { createDirectories?: boolean }
): Promise<FileWriteResult> {
  if (!isOPFSAvailable()) {
    return {
      success: false,
      error: 'File operations are not available in this browser.',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }

  try {
    const { parent, name } = await navigateToPath(path, { create: options?.createDirectories ?? true });
    const fileHandle = await parent.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    const bytesWritten = new Blob([content]).size;

    return {
      success: true,
      path,
      bytesWritten,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write file',
      errorCode: FileErrorCode.UNKNOWN,
      path,
    };
  }
}

/**
 * List contents of a directory in OPFS
 */
export async function webListDirectory(path: string): Promise<{
  success: boolean;
  contents?: DirectoryContents;
  error?: string;
}> {
  if (!isOPFSAvailable()) {
    return {
      success: false,
      error: 'File operations are not available in this browser.',
    };
  }

  try {
    const root = await getOPFSRoot();
    let dirHandle: FileSystemDirectoryHandle;

    const normalizedPath = normalizePath(path);
    if (!normalizedPath || normalizedPath === '.') {
      dirHandle = root;
    } else {
      const parts = normalizedPath.split('/').filter(Boolean);
      dirHandle = root;
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part);
      }
    }

    const files: FileInfo[] = [];
    const directories: FileInfo[] = [];

    for await (const [name, handle] of (dirHandle as unknown as AsyncIterable<[string, FileSystemHandle]>)) {
      if (handle.kind === 'file') {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        files.push({
          name,
          path: `${path}/${name}`,
          isDirectory: false,
          size: file.size,
          modifiedAt: new Date(file.lastModified),
          extension: name.split('.').pop(),
        });
      } else {
        directories.push({
          name,
          path: `${path}/${name}`,
          isDirectory: true,
          size: 0,
        });
      }
    }

    return {
      success: true,
      contents: {
        path,
        files,
        directories,
      },
    };
  } catch (error) {
    const isNotFound = error instanceof DOMException && error.name === 'NotFoundError';
    return {
      success: false,
      error: isNotFound ? `Directory not found: ${path}` : (error instanceof Error ? error.message : 'Failed to list directory'),
    };
  }
}

/**
 * Check if a file or directory exists in OPFS
 */
export async function webExists(path: string): Promise<boolean> {
  if (!isOPFSAvailable()) return false;

  try {
    const { parent, name } = await navigateToPath(path);
    try {
      await parent.getFileHandle(name);
      return true;
    } catch {
      try {
        await parent.getDirectoryHandle(name);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Delete a file from OPFS
 */
export async function webDeleteFile(path: string): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isOPFSAvailable()) {
    return {
      success: false,
      error: 'File operations are not available in this browser.',
    };
  }

  try {
    const { parent, name } = await navigateToPath(path);
    await parent.removeEntry(name);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
    };
  }
}

/**
 * Create a directory in OPFS
 */
export async function webCreateDirectory(
  path: string,
  recursive = true
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isOPFSAvailable()) {
    return {
      success: false,
      error: 'File operations are not available in this browser.',
    };
  }

  try {
    const root = await getOPFSRoot();
    const parts = normalizePath(path).split('/').filter(Boolean);

    if (recursive) {
      let current = root;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: true });
      }
    } else {
      const name = parts.pop()!;
      let current = root;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part);
      }
      await current.getDirectoryHandle(name, { create: true });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create directory',
    };
  }
}

/**
 * Append content to a file in OPFS
 */
export async function webAppendTextFile(
  path: string,
  content: string
): Promise<FileWriteResult> {
  if (!isOPFSAvailable()) {
    return {
      success: false,
      error: 'File operations are not available in this browser.',
      path,
    };
  }

  try {
    // Read existing content
    const existing = await webReadTextFile(path);
    const newContent = (existing.success ? existing.content || '' : '') + content;

    // Write combined content
    return await webWriteTextFile(path, newContent, { createDirectories: true });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to append to file',
      path,
    };
  }
}

// ==================== File System Access API (User Files) ====================

/**
 * Open a file picker and read a file using File System Access API
 * This allows reading actual user files (requires user interaction)
 */
export async function webPickAndReadFile(options?: {
  types?: { description: string; accept: Record<string, string[]> }[];
}): Promise<FileReadResult & { handle?: FileSystemFileHandle }> {
  if (!isFSAAAvailable()) {
    return {
      success: false,
      error: 'File picker is not available in this browser. Chrome or Edge is required.',
      path: '',
    };
  }

  try {
    const [handle] = await (window as unknown as { showOpenFilePicker: (opts?: unknown) => Promise<FileSystemFileHandle[]> })
      .showOpenFilePicker({
        types: options?.types,
        multiple: false,
      });

    const file = await handle.getFile();
    const content = await file.text();

    return {
      success: true,
      content,
      path: file.name,
      size: file.size,
      mimeType: file.type || getMimeType(file.name),
      handle,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        error: 'File picker was cancelled',
        path: '',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open file',
      path: '',
    };
  }
}

/**
 * Save content to a file using File System Access API
 * This allows saving to actual user files (requires user interaction)
 */
export async function webPickAndSaveFile(
  content: string,
  options?: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }
): Promise<FileWriteResult & { handle?: FileSystemFileHandle }> {
  if (!isFSAAAvailable()) {
    return {
      success: false,
      error: 'File save is not available in this browser. Chrome or Edge is required.',
      path: '',
    };
  }

  try {
    const handle = await (window as unknown as { showSaveFilePicker: (opts?: unknown) => Promise<FileSystemFileHandle> })
      .showSaveFilePicker({
        suggestedName: options?.suggestedName,
        types: options?.types,
      });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();

    return {
      success: true,
      path: handle.name,
      bytesWritten: new Blob([content]).size,
      handle,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Save dialog was cancelled',
        path: '',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save file',
      path: '',
    };
  }
}

// ==================== Additional Web File Operations ====================

/**
 * Copy a file within OPFS
 */
export async function webCopyFile(
  source: string,
  destination: string
): Promise<FileWriteResult> {
  if (!isOPFSAvailable()) {
    return { success: false, error: 'OPFS not available', path: destination };
  }

  try {
    const { parent: srcParent, name: srcName } = await navigateToPath(source);
    const srcHandle = await srcParent.getFileHandle(srcName);
    const srcFile = await srcHandle.getFile();
    const content = await srcFile.arrayBuffer();

    const { parent: destParent, name: destName } = await navigateToPath(destination, { create: true });
    const destHandle = await destParent.getFileHandle(destName, { create: true });
    const writable = await destHandle.createWritable();
    await writable.write(content);
    await writable.close();

    return {
      success: true,
      path: destination,
      bytesWritten: content.byteLength,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy file',
      path: destination,
    };
  }
}

/**
 * Rename/move a file within OPFS
 */
export async function webRenameFile(
  oldPath: string,
  newPath: string
): Promise<{ success: boolean; error?: string }> {
  if (!isOPFSAvailable()) {
    return { success: false, error: 'OPFS not available' };
  }

  try {
    // Copy to new location then delete old
    const copyResult = await webCopyFile(oldPath, newPath);
    if (!copyResult.success) {
      return { success: false, error: copyResult.error };
    }

    const { parent: srcParent, name: srcName } = await navigateToPath(oldPath);
    await srcParent.removeEntry(srcName);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename file',
    };
  }
}

/**
 * Get file info from OPFS
 */
export async function webGetFileInfo(
  path: string
): Promise<{
  success: boolean;
  info?: FileInfo;
  error?: string;
}> {
  if (!isOPFSAvailable()) {
    return { success: false, error: 'OPFS not available' };
  }

  try {
    const { parent, name } = await navigateToPath(path);

    // Try as file first
    try {
      const fileHandle = await parent.getFileHandle(name);
      const file = await fileHandle.getFile();
      const ext = name.includes('.') ? name.split('.').pop() || '' : '';

      return {
        success: true,
        info: {
          name,
          path,
          isDirectory: false,
          size: file.size,
          extension: ext,
          modifiedAt: new Date(file.lastModified),
        },
      };
    } catch {
      // Try as directory
      try {
        await parent.getDirectoryHandle(name);
        return {
          success: true,
          info: {
            name,
            path,
            isDirectory: true,
            size: 0,
            extension: '',
          },
        };
      } catch {
        return { success: false, error: `Not found: ${path}` };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get file info',
    };
  }
}

/**
 * Write binary data to OPFS
 */
export async function webWriteBinaryFile(
  path: string,
  data: Uint8Array,
  options?: { createDirectories?: boolean }
): Promise<FileWriteResult> {
  if (!isOPFSAvailable()) {
    return { success: false, error: 'OPFS not available', path };
  }

  try {
    const { parent, name } = await navigateToPath(path, { create: options?.createDirectories });
    const fileHandle = await parent.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data.buffer as ArrayBuffer);
    await writable.close();

    return {
      success: true,
      path,
      bytesWritten: data.byteLength,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write binary file',
      path,
    };
  }
}

/**
 * Search for files in OPFS by name pattern
 */
export async function webSearchFiles(
  directory: string,
  options?: {
    pattern?: string;
    extensions?: string[];
    recursive?: boolean;
    maxResults?: number;
  }
): Promise<{
  success: boolean;
  files?: Array<{ name: string; path: string; size: number; extension: string }>;
  error?: string;
}> {
  if (!isOPFSAvailable()) {
    return { success: false, error: 'OPFS not available' };
  }

  const { pattern, extensions, recursive = false, maxResults = 50 } = options || {};
  const results: Array<{ name: string; path: string; size: number; extension: string }> = [];

  async function searchDir(dirPath: string, depth: number): Promise<void> {
    if (results.length >= maxResults) return;

    try {
      const root = await getOPFSRoot();
      const parts = normalizePath(dirPath).split('/').filter(Boolean);
      let current = root;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const [name, handle] of (current as any).entries()) {
        if (results.length >= maxResults) break;

        if (handle.kind === 'file') {
          const ext = name.includes('.') ? name.split('.').pop() || '' : '';

          // Filter by pattern
          if (pattern && !name.toLowerCase().includes(pattern.toLowerCase())) continue;
          // Filter by extension
          if (extensions && extensions.length > 0 && !extensions.includes(ext)) continue;

          const file = await (handle as FileSystemFileHandle).getFile();
          const filePath = dirPath ? `${dirPath}/${name}` : name;
          results.push({ name, path: filePath, size: file.size, extension: ext });
        } else if (handle.kind === 'directory' && recursive && depth < 5) {
          const subPath = dirPath ? `${dirPath}/${name}` : name;
          await searchDir(subPath, depth + 1);
        }
      }
    } catch {
      // Directory doesn't exist or access error, skip
    }
  }

  try {
    await searchDir(directory, 0);
    return { success: true, files: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}
