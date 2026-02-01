/**
 * Splash Screen Theme Colors
 * Centralized color definitions for splash screen and related components
 */

export interface SplashThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

/**
 * Light theme colors for splash screen
 */
export const LIGHT_THEME_COLORS: SplashThemeColors = {
  primary: '#3b82f6', // Blue-500
  secondary: '#8b5cf6', // Violet-500
  accent: '#06b6d4', // Cyan-500
  background: '#ffffff',
  foreground: '#09090b',
};

/**
 * Dark theme colors for splash screen
 */
export const DARK_THEME_COLORS: SplashThemeColors = {
  primary: '#60a5fa', // Blue-400 (lighter for dark mode)
  secondary: '#a78bfa', // Violet-400
  accent: '#22d3ee', // Cyan-400
  background: '#09090b',
  foreground: '#fafafa',
};

/**
 * Get theme colors based on resolved theme
 */
export function getThemeColors(theme: 'dark' | 'light'): SplashThemeColors {
  return theme === 'dark' ? DARK_THEME_COLORS : LIGHT_THEME_COLORS;
}

/**
 * Splash screen loading stages
 */
export interface LoadingStage {
  id: string;
  progress: number;
  messageKey: string;
}

/**
 * Default loading stages for splash screen
 * Progress values align with typical app initialization phases
 */
export const DEFAULT_LOADING_STAGES: LoadingStage[] = [
  { id: 'init', progress: 0, messageKey: 'initializing' },
  { id: 'core', progress: 15, messageKey: 'loadingCore' },
  { id: 'providers', progress: 35, messageKey: 'initializingProviders' },
  { id: 'themes', progress: 55, messageKey: 'loadingThemes' },
  { id: 'workspace', progress: 75, messageKey: 'preparingWorkspace' },
  { id: 'almost', progress: 90, messageKey: 'almostReady' },
  { id: 'ready', progress: 100, messageKey: 'ready' },
];

/**
 * Animation configuration for splash screen
 */
export const SPLASH_ANIMATION_CONFIG = {
  /** Duration for progress bar transitions (ms) */
  progressDuration: 500,
  /** Duration for fade transitions (ms) */
  fadeDuration: 300,
  /** Delay before showing skip button (ms) */
  skipButtonDelay: 2000,
  /** Minimum progress before skip is allowed (%) */
  skipMinProgress: 50,
  /** Particle count for high-performance devices */
  particleCountHigh: 50,
  /** Particle count for low-performance devices */
  particleCountLow: 25,
  /** Hardware concurrency threshold for performance detection */
  performanceThreshold: 4,
};
