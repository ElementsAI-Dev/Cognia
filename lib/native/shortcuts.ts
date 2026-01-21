/**
 * Global Shortcuts - System-wide keyboard shortcuts for desktop
 */

import { isTauri } from './utils';
import type {
  ShortcutConflict,
  ShortcutMetadata,
  ShortcutRegistrationOptions,
  ShortcutRegistrationResult,
  ShortcutValidationResult,
} from '@/types/shortcut';

export type ShortcutHandler = () => void;

// Enhanced metadata storage
const registeredShortcuts = new Map<string, ShortcutHandler>();
const shortcutMetadata = new Map<string, ShortcutMetadata>();

/**
 * Register a global shortcut (legacy - use registerShortcutWithConflictCheck for conflict detection)
 */
export async function registerShortcut(
  shortcut: string,
  handler: ShortcutHandler
): Promise<boolean> {
  if (!isTauri()) {
    console.warn('Global shortcuts are only available in Tauri');
    return false;
  }

  const normalized = normalizeShortcut(shortcut);

  try {
    const { register: tauriRegister } = await import('@tauri-apps/plugin-global-shortcut');
    
    await tauriRegister(normalized, () => {
      handler();
    });
    
    registeredShortcuts.set(normalized, handler);
    
    // Store basic metadata if not exists
    if (!shortcutMetadata.has(normalized)) {
      shortcutMetadata.set(normalized, {
        shortcut: normalized,
        owner: 'unknown',
        action: 'Legacy registration',
        registeredAt: Date.now(),
        enabled: true,
      });
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to register shortcut ${normalized}:`, error);
    return false;
  }
}

/**
 * Unregister a global shortcut
 */
export async function unregisterShortcut(shortcut: string): Promise<boolean> {
  if (!isTauri()) return false;

  const normalized = normalizeShortcut(shortcut);

  try {
    const { unregister: tauriUnregister } = await import('@tauri-apps/plugin-global-shortcut');
    
    await tauriUnregister(normalized);
    registeredShortcuts.delete(normalized);
    shortcutMetadata.delete(normalized);
    return true;
  } catch (error) {
    console.error(`Failed to unregister shortcut ${normalized}:`, error);
    return false;
  }
}

/**
 * Unregister all global shortcuts
 */
export async function unregisterAllShortcuts(): Promise<boolean> {
  if (!isTauri()) return false;

  try {
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    
    await unregisterAll();
    registeredShortcuts.clear();
    shortcutMetadata.clear();
    return true;
  } catch (error) {
    console.error('Failed to unregister all shortcuts:', error);
    return false;
  }
}

/**
 * Check if a shortcut is registered
 */
export async function isShortcutRegistered(shortcut: string): Promise<boolean> {
  if (!isTauri()) return false;

  const normalized = normalizeShortcut(shortcut);

  try {
    const { isRegistered } = await import('@tauri-apps/plugin-global-shortcut');
    return await isRegistered(normalized);
  } catch {
    return false;
  }
}

/**
 * Get all registered shortcuts
 */
export function getRegisteredShortcuts(): string[] {
  return Array.from(registeredShortcuts.keys());
}

/**
 * Normalize shortcut string for consistent comparison
 * Handles case variations and modifier order
 */
export function normalizeShortcut(shortcut: string): string {
  if (!shortcut) return '';

  // Split by + and normalize each part
  const parts = shortcut.split('+').map(p => p.trim());
  
  // Define modifier order priority
  const modifierOrder = ['CommandOrControl', 'Command', 'Cmd', 'Control', 'Ctrl', 'Alt', 'Option', 'Shift', 'Super', 'Meta'];
  
  const modifiers: string[] = [];
  const keys: string[] = [];
  
  for (const part of parts) {
    const normalized = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    
    // Check if it's a modifier
    if (modifierOrder.some(m => m.toLowerCase() === part.toLowerCase())) {
      modifiers.push(normalized);
    } else {
      keys.push(normalized);
    }
  }
  
  // Sort modifiers by defined order
  modifiers.sort((a, b) => {
    const aIndex = modifierOrder.findIndex(m => m.toLowerCase() === a.toLowerCase());
    const bIndex = modifierOrder.findIndex(m => m.toLowerCase() === b.toLowerCase());
    return aIndex - bIndex;
  });
  
  return [...modifiers, ...keys].join('+');
}

/**
 * Get metadata for a registered shortcut
 */
export function getShortcutMetadata(shortcut: string): ShortcutMetadata | null {
  const normalized = normalizeShortcut(shortcut);
  return shortcutMetadata.get(normalized) || null;
}

/**
 * Get all shortcut metadata
 */
export function getAllShortcutMetadata(): ShortcutMetadata[] {
  return Array.from(shortcutMetadata.values());
}

/**
 * Get shortcut owner information
 */
export function getShortcutOwner(shortcut: string): { owner: string; action: string } | null {
  const metadata = getShortcutMetadata(shortcut);
  if (!metadata) return null;
  
  return {
    owner: metadata.owner,
    action: metadata.action,
  };
}

/**
 * Detect if a shortcut would conflict with existing registrations
 */
export async function detectShortcutConflict(
  shortcut: string,
  owner: string,
  action: string
): Promise<ShortcutConflict | null> {
  const normalized = normalizeShortcut(shortcut);
  const existing = shortcutMetadata.get(normalized);
  
  if (!existing) {
    return null;
  }
  
  // Same owner can re-register (update)
  if (existing.owner === owner) {
    return null;
  }
  
  return {
    shortcut: normalized,
    existingOwner: existing.owner,
    existingAction: existing.action,
    newOwner: owner,
    newAction: action,
    timestamp: Date.now(),
  };
}

/**
 * Validate a shortcut before registration
 */
export async function validateShortcut(
  shortcut: string,
  owner: string,
  action: string
): Promise<ShortcutValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Basic validation
  if (!shortcut || shortcut.trim() === '') {
    errors.push('Shortcut cannot be empty');
    return { valid: false, errors };
  }
  
  // Check for invalid characters
  if (!/^[a-zA-Z0-9+\-\[\]\s]+$/.test(shortcut)) {
    errors.push('Shortcut contains invalid characters');
  }
  
  // Check conflict
  const conflict = await detectShortcutConflict(shortcut, owner, action);
  
  if (conflict) {
    return {
      valid: false,
      conflict,
      errors: [`Shortcut is already registered by ${conflict.existingOwner}`],
    };
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Register a shortcut with conflict detection
 */
export async function registerShortcutWithConflictCheck(
  shortcut: string,
  handler: ShortcutHandler,
  options: ShortcutRegistrationOptions
): Promise<ShortcutRegistrationResult> {
  if (!isTauri()) {
    return {
      success: false,
      error: 'Global shortcuts are only available in Tauri',
    };
  }
  
  const normalized = normalizeShortcut(shortcut);
  
  // Skip conflict check if requested
  if (!options.skipConflictCheck) {
    const conflict = await detectShortcutConflict(normalized, options.owner, options.action);
    
    if (conflict && !options.forceOverride) {
      return {
        success: false,
        conflict,
      };
    }
    
    // If forcing override, unregister existing first
    if (conflict && options.forceOverride) {
      await unregisterShortcut(normalized);
    }
  }
  
  // Register with Tauri
  try {
    const { register: tauriRegister } = await import('@tauri-apps/plugin-global-shortcut');
    
    await tauriRegister(normalized, () => {
      handler();
    });
    
    // Store handler and metadata
    registeredShortcuts.set(normalized, handler);
    shortcutMetadata.set(normalized, {
      shortcut: normalized,
      owner: options.owner,
      action: options.action,
      registeredAt: Date.now(),
      enabled: true,
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to register shortcut ${normalized}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Common shortcut definitions for convenience
 */
export const Shortcuts = {
  // Window controls
  TOGGLE_FULLSCREEN: 'F11',
  TOGGLE_DEVTOOLS: 'CommandOrControl+Shift+I',
  RELOAD: 'CommandOrControl+R',
  QUIT: 'CommandOrControl+Q',
  
  // App shortcuts
  NEW_CHAT: 'CommandOrControl+N',
  OPEN_SETTINGS: 'CommandOrControl+,',
  SEARCH: 'CommandOrControl+K',
  TOGGLE_SIDEBAR: 'CommandOrControl+B',
  
  // Edit shortcuts
  UNDO: 'CommandOrControl+Z',
  REDO: 'CommandOrControl+Shift+Z',
  CUT: 'CommandOrControl+X',
  COPY: 'CommandOrControl+C',
  PASTE: 'CommandOrControl+V',
  SELECT_ALL: 'CommandOrControl+A',
  
  // Navigation
  FOCUS_INPUT: 'CommandOrControl+L',
  PREVIOUS_CHAT: 'CommandOrControl+[',
  NEXT_CHAT: 'CommandOrControl+]',
  
  // Screen Recording & Screenshot shortcuts
  SCREENSHOT_FULLSCREEN: 'Alt+Shift+S',
  SCREENSHOT_REGION: 'Alt+Shift+A',
  SCREENSHOT_WINDOW: 'Alt+Shift+W',
  RECORDING_START_STOP: 'Alt+Shift+R',
  RECORDING_PAUSE_RESUME: 'Alt+Shift+P',
} as const;

export type ShortcutName = keyof typeof Shortcuts;

/**
 * Media shortcuts configuration
 */
export interface MediaShortcutConfig {
  screenshotFullscreen: string;
  screenshotRegion: string;
  screenshotWindow: string;
  recordingStartStop: string;
  recordingPauseResume: string;
  enabled: boolean;
}

/**
 * Default media shortcuts configuration
 */
export const defaultMediaShortcuts: MediaShortcutConfig = {
  screenshotFullscreen: Shortcuts.SCREENSHOT_FULLSCREEN,
  screenshotRegion: Shortcuts.SCREENSHOT_REGION,
  screenshotWindow: Shortcuts.SCREENSHOT_WINDOW,
  recordingStartStop: Shortcuts.RECORDING_START_STOP,
  recordingPauseResume: Shortcuts.RECORDING_PAUSE_RESUME,
  enabled: true,
};

/**
 * Register media shortcuts (screenshot and recording)
 */
export async function registerMediaShortcuts(
  config: MediaShortcutConfig,
  handlers: {
    onScreenshotFullscreen?: () => void;
    onScreenshotRegion?: () => void;
    onScreenshotWindow?: () => void;
    onRecordingStartStop?: () => void;
    onRecordingPauseResume?: () => void;
  }
): Promise<boolean> {
  if (!isTauri() || !config.enabled) return false;

  let success = true;

  if (handlers.onScreenshotFullscreen) {
    const result = await registerShortcut(config.screenshotFullscreen, handlers.onScreenshotFullscreen);
    success = success && result;
  }

  if (handlers.onScreenshotRegion) {
    const result = await registerShortcut(config.screenshotRegion, handlers.onScreenshotRegion);
    success = success && result;
  }

  if (handlers.onScreenshotWindow) {
    const result = await registerShortcut(config.screenshotWindow, handlers.onScreenshotWindow);
    success = success && result;
  }

  if (handlers.onRecordingStartStop) {
    const result = await registerShortcut(config.recordingStartStop, handlers.onRecordingStartStop);
    success = success && result;
  }

  if (handlers.onRecordingPauseResume) {
    const result = await registerShortcut(config.recordingPauseResume, handlers.onRecordingPauseResume);
    success = success && result;
  }

  return success;
}

/**
 * Unregister media shortcuts
 */
export async function unregisterMediaShortcuts(config: MediaShortcutConfig): Promise<boolean> {
  if (!isTauri()) return false;

  let success = true;

  const shortcuts = [
    config.screenshotFullscreen,
    config.screenshotRegion,
    config.screenshotWindow,
    config.recordingStartStop,
    config.recordingPauseResume,
  ];

  for (const shortcut of shortcuts) {
    const result = await unregisterShortcut(shortcut);
    success = success && result;
  }

  return success;
}
