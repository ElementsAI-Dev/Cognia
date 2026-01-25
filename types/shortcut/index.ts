/**
 * Shortcut Types
 *
 * Centralized type definitions for shortcut management and conflict detection
 */

/**
 * Shortcut conflict information
 */
export interface ShortcutConflict {
  /** The conflicting shortcut key combination */
  shortcut: string;
  /** Owner of the existing shortcut */
  existingOwner: string;
  /** Action/description of the existing shortcut */
  existingAction: string;
  /** Owner trying to register the new shortcut */
  newOwner: string;
  /** Action/description of the new shortcut */
  newAction: string;
  /** Timestamp when conflict was detected */
  timestamp: number;
}

/**
 * Shortcut registration metadata
 */
export interface ShortcutMetadata {
  /** Shortcut key combination */
  shortcut: string;
  /** Owner of the shortcut (e.g., 'system', 'media', 'plugin:name') */
  owner: string;
  /** Action/description */
  action: string;
  /** When it was registered */
  registeredAt: number;
  /** Whether it's currently active */
  enabled: boolean;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionMode =
  | 'warn' // Show warning but allow registration
  | 'block' // Block registration on conflict
  | 'auto-resolve'; // Automatically unregister old and register new

/**
 * Conflict resolution action
 */
export type ConflictResolution =
  | 'keep-existing' // Keep the existing shortcut
  | 'use-new' // Use the new shortcut
  | 'cancel'; // Cancel the operation

/**
 * Shortcut registration options
 */
export interface ShortcutRegistrationOptions {
  /** Owner identifier */
  owner: string;
  /** Action description */
  action: string;
  /** Force override existing shortcut */
  forceOverride?: boolean;
  /** Skip conflict detection */
  skipConflictCheck?: boolean;
}

/**
 * Shortcut registration result
 */
export interface ShortcutRegistrationResult {
  /** Whether registration succeeded */
  success: boolean;
  /** Conflict details if any */
  conflict?: ShortcutConflict;
  /** Error message if failed */
  error?: string;
}

/**
 * Shortcut validation result
 */
export interface ShortcutValidationResult {
  /** Whether the shortcut is valid and available */
  valid: boolean;
  /** Conflict details if occupied */
  conflict?: ShortcutConflict;
  /** Validation error messages */
  errors?: string[];
  /** Warnings (e.g., system shortcut) */
  warnings?: string[];
}

/**
 * System shortcut information
 */
export interface SystemShortcut {
  /** Shortcut key combination */
  shortcut: string;
  /** Operating system */
  platform: 'windows' | 'macos' | 'linux';
  /** Description of system function */
  description: string;
  /** Whether it can be overridden */
  overridable: boolean;
}
