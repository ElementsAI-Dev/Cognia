/**
 * System Shortcuts - Database of known system-level keyboard shortcuts
 * 
 * Provides detection and warnings for common OS-level shortcuts that may conflict
 */

import type { SystemShortcut } from '@/types/shortcut';

/**
 * Windows system shortcuts
 */
const WINDOWS_SYSTEM_SHORTCUTS: SystemShortcut[] = [
  { shortcut: 'Win+D', platform: 'windows', description: 'Show Desktop', overridable: false },
  { shortcut: 'Win+E', platform: 'windows', description: 'Open File Explorer', overridable: false },
  { shortcut: 'Win+L', platform: 'windows', description: 'Lock PC', overridable: false },
  { shortcut: 'Win+R', platform: 'windows', description: 'Open Run Dialog', overridable: false },
  { shortcut: 'Win+I', platform: 'windows', description: 'Open Settings', overridable: false },
  { shortcut: 'Win+X', platform: 'windows', description: 'Quick Link Menu', overridable: false },
  { shortcut: 'Win+Tab', platform: 'windows', description: 'Task View', overridable: false },
  { shortcut: 'Alt+Tab', platform: 'windows', description: 'Switch Windows', overridable: false },
  { shortcut: 'Alt+F4', platform: 'windows', description: 'Close Window', overridable: false },
  { shortcut: 'Ctrl+Alt+Delete', platform: 'windows', description: 'Security Options', overridable: false },
  { shortcut: 'Ctrl+Shift+Esc', platform: 'windows', description: 'Task Manager', overridable: false },
  { shortcut: 'Win+PrintScreen', platform: 'windows', description: 'Screenshot', overridable: true },
  { shortcut: 'Win+Shift+S', platform: 'windows', description: 'Snip & Sketch', overridable: true },
];

/**
 * macOS system shortcuts
 */
const MACOS_SYSTEM_SHORTCUTS: SystemShortcut[] = [
  { shortcut: 'Cmd+Space', platform: 'macos', description: 'Spotlight Search', overridable: true },
  { shortcut: 'Cmd+Tab', platform: 'macos', description: 'Switch Applications', overridable: false },
  { shortcut: 'Cmd+Q', platform: 'macos', description: 'Quit Application', overridable: false },
  { shortcut: 'Cmd+W', platform: 'macos', description: 'Close Window', overridable: false },
  { shortcut: 'Cmd+H', platform: 'macos', description: 'Hide Window', overridable: false },
  { shortcut: 'Cmd+M', platform: 'macos', description: 'Minimize Window', overridable: false },
  { shortcut: 'Cmd+Option+Esc', platform: 'macos', description: 'Force Quit', overridable: false },
  { shortcut: 'Cmd+Shift+3', platform: 'macos', description: 'Screenshot (Full)', overridable: true },
  { shortcut: 'Cmd+Shift+4', platform: 'macos', description: 'Screenshot (Selection)', overridable: true },
  { shortcut: 'Cmd+Shift+5', platform: 'macos', description: 'Screenshot Menu', overridable: true },
  { shortcut: 'Ctrl+Cmd+Space', platform: 'macos', description: 'Emoji Picker', overridable: true },
  { shortcut: 'Ctrl+Cmd+Q', platform: 'macos', description: 'Lock Screen', overridable: false },
];

/**
 * Linux system shortcuts (common across DEs)
 */
const LINUX_SYSTEM_SHORTCUTS: SystemShortcut[] = [
  { shortcut: 'Super+D', platform: 'linux', description: 'Show Desktop', overridable: true },
  { shortcut: 'Super+L', platform: 'linux', description: 'Lock Screen', overridable: true },
  { shortcut: 'Super+E', platform: 'linux', description: 'File Manager', overridable: true },
  { shortcut: 'Alt+Tab', platform: 'linux', description: 'Switch Windows', overridable: true },
  { shortcut: 'Alt+F4', platform: 'linux', description: 'Close Window', overridable: false },
  { shortcut: 'Ctrl+Alt+T', platform: 'linux', description: 'Open Terminal', overridable: true },
  { shortcut: 'PrintScreen', platform: 'linux', description: 'Screenshot', overridable: true },
  { shortcut: 'Alt+PrintScreen', platform: 'linux', description: 'Window Screenshot', overridable: true },
];

/**
 * Get system shortcuts for the current platform
 */
export function getSystemShortcuts(platform?: 'windows' | 'macos' | 'linux'): SystemShortcut[] {
  // Detect platform if not provided
  if (!platform) {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('win')) platform = 'windows';
      else if (userAgent.includes('mac')) platform = 'macos';
      else if (userAgent.includes('linux')) platform = 'linux';
    }
  }

  switch (platform) {
    case 'windows':
      return WINDOWS_SYSTEM_SHORTCUTS;
    case 'macos':
      return MACOS_SYSTEM_SHORTCUTS;
    case 'linux':
      return LINUX_SYSTEM_SHORTCUTS;
    default:
      return [];
  }
}

/**
 * Check if a shortcut conflicts with system shortcuts
 */
export function checkSystemShortcutConflict(
  shortcut: string,
  platform?: 'windows' | 'macos' | 'linux'
): SystemShortcut | null {
  const systemShortcuts = getSystemShortcuts(platform);
  
  // Normalize shortcut for comparison
  const normalized = normalizeForComparison(shortcut);
  
  return systemShortcuts.find(sys => 
    normalizeForComparison(sys.shortcut) === normalized
  ) || null;
}

/**
 * Normalize shortcut string for comparison
 */
function normalizeForComparison(shortcut: string): string {
  return shortcut
    .toLowerCase()
    .replace(/command|cmd/g, 'cmd')
    .replace(/control|ctrl/g, 'ctrl')
    .replace(/option/g, 'alt')
    .replace(/super|meta/g, 'win')
    .replace(/\s+/g, '')
    .split('+')
    .sort()
    .join('+');
}

/**
 * Get all system shortcuts that would be affected
 */
export function getConflictingSystemShortcuts(
  shortcuts: string[],
  platform?: 'windows' | 'macos' | 'linux'
): { shortcut: string; systemShortcut: SystemShortcut }[] {
  const conflicts: { shortcut: string; systemShortcut: SystemShortcut }[] = [];
  
  for (const shortcut of shortcuts) {
    const conflict = checkSystemShortcutConflict(shortcut, platform);
    if (conflict) {
      conflicts.push({ shortcut, systemShortcut: conflict });
    }
  }
  
  return conflicts;
}

/**
 * Check if a shortcut is safe to use (no critical system conflicts)
 */
export function isShortcutSafe(
  shortcut: string,
  platform?: 'windows' | 'macos' | 'linux'
): { safe: boolean; warning?: string } {
  const conflict = checkSystemShortcutConflict(shortcut, platform);
  
  if (!conflict) {
    return { safe: true };
  }
  
  if (!conflict.overridable) {
    return {
      safe: false,
      warning: `This shortcut conflicts with the system "${conflict.description}" function and cannot be overridden.`,
    };
  }
  
  return {
    safe: true,
    warning: `This shortcut may conflict with the system "${conflict.description}" function.`,
  };
}
