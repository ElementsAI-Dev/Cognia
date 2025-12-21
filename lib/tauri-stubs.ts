/**
 * Tauri Plugin Stubs - Placeholder exports for browser/SSR builds
 * These are only used during Next.js build when Tauri APIs aren't available.
 * At runtime in Tauri, the actual modules are dynamically imported.
 */

// Stub error for when these are called outside Tauri
const notInTauriError = () => {
  throw new Error('Tauri APIs are not available in this environment');
};

// @tauri-apps/plugin-fs stubs
export const readTextFile = notInTauriError;
export const writeTextFile = notInTauriError;
export const readFile = notInTauriError;
export const writeFile = notInTauriError;
export const readDir = notInTauriError;
export const mkdir = notInTauriError;
export const remove = notInTauriError;
export const rename = notInTauriError;
export const copyFile = notInTauriError;
export const stat = notInTauriError;
export const exists = notInTauriError;
export const create = notInTauriError;
export const truncate = notInTauriError;

// @tauri-apps/plugin-dialog stubs
export const open = notInTauriError;
export const save = notInTauriError;
export const message = notInTauriError;
export const ask = notInTauriError;
export const confirm = notInTauriError;

// @tauri-apps/plugin-shell stubs
export const Command = class {
  constructor() {
    throw new Error('Tauri APIs are not available in this environment');
  }
};

// @tauri-apps/plugin-notification stubs
export const sendNotification = notInTauriError;
export const requestPermission = notInTauriError;
export const isPermissionGranted = notInTauriError;

// @tauri-apps/plugin-global-shortcut stubs
export const register = notInTauriError;
export const unregister = notInTauriError;
export const unregisterAll = notInTauriError;
export const isRegistered = notInTauriError;

// @tauri-apps/plugin-updater stubs
export const check = notInTauriError;
export const installUpdate = notInTauriError;

// @tauri-apps/plugin-process stubs
export const exit = notInTauriError;
export const relaunch = notInTauriError;

// @tauri-apps/plugin-os stubs
export const platform = notInTauriError;
export const version = notInTauriError;
export const osType = notInTauriError;
export const arch = notInTauriError;
export const locale = notInTauriError;
export const hostname = notInTauriError;

// @tauri-apps/plugin-clipboard-manager stubs
export const readText = notInTauriError;
export const writeText = notInTauriError;
export const readImage = notInTauriError;
export const writeImage = notInTauriError;
