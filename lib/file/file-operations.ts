/**
 * File Operations - Local file system operations for Tauri
 * Provides read, write, list, and other file operations
 */

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

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
  path: string;
  size?: number;
  mimeType?: string;
}

export interface FileWriteResult {
  success: boolean;
  error?: string;
  path: string;
  bytesWritten?: number;
}

export interface FileOperationOptions {
  encoding?: 'utf-8' | 'binary';
  createDirectories?: boolean;
  overwrite?: boolean;
}

/**
 * Read a text file from the local file system
 */
export async function readTextFile(
  path: string,
  _options?: FileOperationOptions
): Promise<FileReadResult> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      path,
    };
  }

  try {
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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read file',
      path,
    };
  }
}

/**
 * Read a binary file from the local file system
 */
export async function readBinaryFile(path: string): Promise<{
  success: boolean;
  data?: Uint8Array;
  error?: string;
  path: string;
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
      path,
    };
  }

  try {
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const data = await readFile(path);
    
    return {
      success: true,
      data,
      path,
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
      path,
    };
  }

  try {
    const { writeTextFile: tauriWriteTextFile, mkdir } = await import('@tauri-apps/plugin-fs');
    
    // Create parent directories if needed
    if (options?.createDirectories) {
      const parentDir = path.substring(0, path.lastIndexOf('/'));
      if (parentDir) {
        try {
          await mkdir(parentDir, { recursive: true });
        } catch {
          // Directory might already exist
        }
      }
    }
    
    await tauriWriteTextFile(path, content);
    
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
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    const { remove } = await import('@tauri-apps/plugin-fs');
    await remove(path);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file',
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
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    const { copyFile: tauriCopyFile } = await import('@tauri-apps/plugin-fs');
    await tauriCopyFile(source, destination);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to copy file',
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
}> {
  if (!isTauri) {
    return {
      success: false,
      error: 'File operations require Tauri desktop environment',
    };
  }

  try {
    const { rename } = await import('@tauri-apps/plugin-fs');
    await rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename file',
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
 * Check if running in Tauri environment
 */
export function isInTauri(): boolean {
  return isTauri;
}
