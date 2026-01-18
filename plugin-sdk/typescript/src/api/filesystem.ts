/**
 * File System API Types
 *
 * @description Type definitions for file system operations in plugins.
 */

/**
 * File System API for file operations
 *
 * @remarks
 * Provides methods for file system operations with automatic permission handling.
 * Paths are resolved relative to the plugin's data directory unless absolute.
 *
 * @example
 * ```typescript
 * // Read a file
 * const content = await context.fs.readText('/path/to/file.txt');
 *
 * // Write a file
 * await context.fs.writeText('/path/to/file.txt', 'Hello, world!');
 *
 * // Read JSON
 * const data = await context.fs.readJson<MyType>('/path/to/data.json');
 *
 * // List directory
 * const entries = await context.fs.readDir('/path/to/dir');
 *
 * // Watch for changes
 * const unwatch = context.fs.watch('/path/to/file.txt', (event) => {
 *   console.log('File changed:', event);
 * });
 *
 * // Get plugin directories
 * const dataDir = context.fs.getDataDir();
 * const cacheDir = context.fs.getCacheDir();
 * ```
 */
export interface PluginFileSystemAPI {
  readText: (path: string) => Promise<string>;
  readBinary: (path: string) => Promise<Uint8Array>;
  readJson: <T>(path: string) => Promise<T>;
  writeText: (path: string, content: string) => Promise<void>;
  writeBinary: (path: string, content: Uint8Array) => Promise<void>;
  writeJson: (path: string, data: unknown, pretty?: boolean) => Promise<void>;
  appendText: (path: string, content: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  mkdir: (path: string, recursive?: boolean) => Promise<void>;
  remove: (path: string, recursive?: boolean) => Promise<void>;
  copy: (src: string, dest: string) => Promise<void>;
  move: (src: string, dest: string) => Promise<void>;
  readDir: (path: string) => Promise<FileEntry[]>;
  stat: (path: string) => Promise<FileStat>;
  watch: (path: string, callback: (event: FileWatchEvent) => void) => () => void;
  getDataDir: () => string;
  getCacheDir: () => string;
  getTempDir: () => string;
}

/**
 * File entry
 */
export interface FileEntry {
  name: string;
  path: string;
  isFile: boolean;
  isDirectory: boolean;
  size?: number;
}

/**
 * File stat information
 */
export interface FileStat {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  created?: Date;
  modified?: Date;
  accessed?: Date;
  mode?: number;
}

/**
 * File watch event
 */
export interface FileWatchEvent {
  type: 'create' | 'modify' | 'delete' | 'rename';
  path: string;
  newPath?: string;
}

/**
 * Clipboard API
 *
 * @example
 * ```typescript
 * // Read text
 * const text = await context.clipboard.readText();
 *
 * // Write text
 * await context.clipboard.writeText('Hello!');
 *
 * // Read image
 * const image = await context.clipboard.readImage();
 *
 * // Write image
 * await context.clipboard.writeImage(imageData, 'png');
 *
 * // Check contents
 * const hasText = await context.clipboard.hasText();
 * const hasImage = await context.clipboard.hasImage();
 * ```
 */
export interface PluginClipboardAPI {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<void>;
  readImage: () => Promise<Uint8Array | null>;
  writeImage: (data: Uint8Array, format?: 'png' | 'jpeg') => Promise<void>;
  hasText: () => Promise<boolean>;
  hasImage: () => Promise<boolean>;
  clear: () => Promise<void>;
}
