/**
 * Type declarations for Tauri plugins
 * These are placeholder types for when the plugins are not installed
 */

declare module '@tauri-apps/plugin-fs' {
  export function readTextFile(path: string): Promise<string>;
  export function readFile(path: string): Promise<Uint8Array>;
  export function writeTextFile(path: string, content: string): Promise<void>;
  export function writeFile(path: string, content: Uint8Array): Promise<void>;
  export function readDir(
    path: string
  ): Promise<Array<{ name: string; isDirectory: boolean; isFile: boolean }>>;
  export function exists(path: string): Promise<boolean>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function copyFile(source: string, destination: string): Promise<void>;
  export function stat(path: string): Promise<{
    isDirectory: boolean;
    isFile: boolean;
    size: number;
    mtime?: Date;
    birthtime?: Date;
  }>;
}

declare module '@tauri-apps/plugin-dialog' {
  export interface OpenDialogOptions {
    multiple?: boolean;
    directory?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
    defaultPath?: string;
    title?: string;
  }

  export interface SaveDialogOptions {
    filters?: Array<{ name: string; extensions: string[] }>;
    defaultPath?: string;
    title?: string;
  }

  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function save(options?: SaveDialogOptions): Promise<string | null>;
}
