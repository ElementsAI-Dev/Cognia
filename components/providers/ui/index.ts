/**
 * UI Providers - Theme and visual management
 *
 * Handles theme switching with system preference support
 */

export { ThemeProvider, useTheme } from './theme-provider';
export { StandaloneThemeSyncProvider } from './standalone-theme-sync-provider';

// Re-export Theme type for consumers
export type { Theme } from './theme-provider';
