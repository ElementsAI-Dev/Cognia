/**
 * Keyboard shortcuts type definitions
 * Extracted from components/settings/system/keyboard-shortcuts-settings.tsx
 */

/**
 * Shortcut category types
 */
export type ShortcutCategory = 'chat' | 'navigation' | 'editing' | 'system';

/**
 * Shortcut definition for configuration
 */
export interface ShortcutDefinition {
  id: string;
  labelKey: string;
  defaultLabel: string;
  defaultKey: string;
  category: ShortcutCategory;
}

/**
 * Provider test state for connection testing
 */
export interface ProviderTestState {
  testing: boolean;
  result: 'success' | 'error' | null;
}
