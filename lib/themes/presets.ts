/**
 * Theme Presets - predefined color schemes for the application
 * Uses OKLch color space for perceptually uniform colors
 */

export type ColorThemePreset = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'rose';

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
}

export interface ThemePreset {
  id: ColorThemePreset;
  name: string;
  description: string;
  light: ThemeColors;
  dark: ThemeColors;
}

export const THEME_PRESETS: Record<ColorThemePreset, ThemePreset> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'Classic blue theme',
    light: {
      primary: 'oklch(0.55 0.2 250)',
      primaryForeground: 'oklch(0.985 0.002 247)',
      secondary: 'oklch(0.97 0.001 286)',
      secondaryForeground: 'oklch(0.25 0.01 286)',
      accent: 'oklch(0.97 0.001 286)',
      accentForeground: 'oklch(0.25 0.01 286)',
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.145 0.017 286)',
      muted: 'oklch(0.97 0.001 286)',
      mutedForeground: 'oklch(0.55 0.01 286)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.145 0.017 286)',
      border: 'oklch(0.92 0.004 286)',
      ring: 'oklch(0.55 0.2 250)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.7 0.15 250)',
      primaryForeground: 'oklch(0.15 0.02 250)',
      secondary: 'oklch(0.27 0.01 286)',
      secondaryForeground: 'oklch(0.985 0.002 286)',
      accent: 'oklch(0.27 0.01 286)',
      accentForeground: 'oklch(0.985 0.002 286)',
      background: 'oklch(0.145 0.017 286)',
      foreground: 'oklch(0.985 0.002 247)',
      muted: 'oklch(0.27 0.01 286)',
      mutedForeground: 'oklch(0.7 0.01 286)',
      card: 'oklch(0.145 0.017 286)',
      cardForeground: 'oklch(0.985 0.002 247)',
      border: 'oklch(0.27 0.01 286)',
      ring: 'oklch(0.7 0.15 250)',
      destructive: 'oklch(0.65 0.2 27)',
      destructiveForeground: 'oklch(0.15 0.02 27)',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm teal and cyan tones',
    light: {
      primary: 'oklch(0.55 0.15 195)',
      primaryForeground: 'oklch(0.985 0.002 195)',
      secondary: 'oklch(0.96 0.02 195)',
      secondaryForeground: 'oklch(0.25 0.05 195)',
      accent: 'oklch(0.96 0.02 195)',
      accentForeground: 'oklch(0.25 0.05 195)',
      background: 'oklch(0.995 0.005 195)',
      foreground: 'oklch(0.2 0.03 195)',
      muted: 'oklch(0.96 0.02 195)',
      mutedForeground: 'oklch(0.5 0.03 195)',
      card: 'oklch(0.995 0.005 195)',
      cardForeground: 'oklch(0.2 0.03 195)',
      border: 'oklch(0.9 0.03 195)',
      ring: 'oklch(0.55 0.15 195)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.7 0.12 195)',
      primaryForeground: 'oklch(0.15 0.02 195)',
      secondary: 'oklch(0.25 0.03 195)',
      secondaryForeground: 'oklch(0.95 0.01 195)',
      accent: 'oklch(0.25 0.03 195)',
      accentForeground: 'oklch(0.95 0.01 195)',
      background: 'oklch(0.15 0.02 195)',
      foreground: 'oklch(0.95 0.01 195)',
      muted: 'oklch(0.25 0.03 195)',
      mutedForeground: 'oklch(0.7 0.02 195)',
      card: 'oklch(0.15 0.02 195)',
      cardForeground: 'oklch(0.95 0.01 195)',
      border: 'oklch(0.3 0.03 195)',
      ring: 'oklch(0.7 0.12 195)',
      destructive: 'oklch(0.65 0.2 27)',
      destructiveForeground: 'oklch(0.15 0.02 27)',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green palette',
    light: {
      primary: 'oklch(0.5 0.15 145)',
      primaryForeground: 'oklch(0.985 0.002 145)',
      secondary: 'oklch(0.96 0.02 145)',
      secondaryForeground: 'oklch(0.25 0.05 145)',
      accent: 'oklch(0.96 0.02 145)',
      accentForeground: 'oklch(0.25 0.05 145)',
      background: 'oklch(0.995 0.005 145)',
      foreground: 'oklch(0.2 0.03 145)',
      muted: 'oklch(0.96 0.02 145)',
      mutedForeground: 'oklch(0.5 0.03 145)',
      card: 'oklch(0.995 0.005 145)',
      cardForeground: 'oklch(0.2 0.03 145)',
      border: 'oklch(0.9 0.03 145)',
      ring: 'oklch(0.5 0.15 145)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.65 0.12 145)',
      primaryForeground: 'oklch(0.15 0.02 145)',
      secondary: 'oklch(0.25 0.03 145)',
      secondaryForeground: 'oklch(0.95 0.01 145)',
      accent: 'oklch(0.25 0.03 145)',
      accentForeground: 'oklch(0.95 0.01 145)',
      background: 'oklch(0.15 0.02 145)',
      foreground: 'oklch(0.95 0.01 145)',
      muted: 'oklch(0.25 0.03 145)',
      mutedForeground: 'oklch(0.7 0.02 145)',
      card: 'oklch(0.15 0.02 145)',
      cardForeground: 'oklch(0.95 0.01 145)',
      border: 'oklch(0.3 0.03 145)',
      ring: 'oklch(0.65 0.12 145)',
      destructive: 'oklch(0.65 0.2 27)',
      destructiveForeground: 'oklch(0.15 0.02 27)',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and red tones',
    light: {
      primary: 'oklch(0.6 0.18 35)',
      primaryForeground: 'oklch(0.985 0.002 35)',
      secondary: 'oklch(0.96 0.02 35)',
      secondaryForeground: 'oklch(0.3 0.05 35)',
      accent: 'oklch(0.96 0.02 35)',
      accentForeground: 'oklch(0.3 0.05 35)',
      background: 'oklch(0.995 0.005 35)',
      foreground: 'oklch(0.2 0.03 35)',
      muted: 'oklch(0.96 0.02 35)',
      mutedForeground: 'oklch(0.5 0.03 35)',
      card: 'oklch(0.995 0.005 35)',
      cardForeground: 'oklch(0.2 0.03 35)',
      border: 'oklch(0.9 0.03 35)',
      ring: 'oklch(0.6 0.18 35)',
      destructive: 'oklch(0.55 0.2 0)',
      destructiveForeground: 'oklch(0.985 0.002 0)',
    },
    dark: {
      primary: 'oklch(0.7 0.15 35)',
      primaryForeground: 'oklch(0.15 0.02 35)',
      secondary: 'oklch(0.25 0.03 35)',
      secondaryForeground: 'oklch(0.95 0.01 35)',
      accent: 'oklch(0.25 0.03 35)',
      accentForeground: 'oklch(0.95 0.01 35)',
      background: 'oklch(0.15 0.02 35)',
      foreground: 'oklch(0.95 0.01 35)',
      muted: 'oklch(0.25 0.03 35)',
      mutedForeground: 'oklch(0.7 0.02 35)',
      card: 'oklch(0.15 0.02 35)',
      cardForeground: 'oklch(0.95 0.01 35)',
      border: 'oklch(0.3 0.03 35)',
      ring: 'oklch(0.7 0.15 35)',
      destructive: 'oklch(0.65 0.2 0)',
      destructiveForeground: 'oklch(0.15 0.02 0)',
    },
  },
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    description: 'Soft purple hues',
    light: {
      primary: 'oklch(0.55 0.15 285)',
      primaryForeground: 'oklch(0.985 0.002 285)',
      secondary: 'oklch(0.96 0.02 285)',
      secondaryForeground: 'oklch(0.25 0.05 285)',
      accent: 'oklch(0.96 0.02 285)',
      accentForeground: 'oklch(0.25 0.05 285)',
      background: 'oklch(0.995 0.005 285)',
      foreground: 'oklch(0.2 0.03 285)',
      muted: 'oklch(0.96 0.02 285)',
      mutedForeground: 'oklch(0.5 0.03 285)',
      card: 'oklch(0.995 0.005 285)',
      cardForeground: 'oklch(0.2 0.03 285)',
      border: 'oklch(0.9 0.03 285)',
      ring: 'oklch(0.55 0.15 285)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.7 0.12 285)',
      primaryForeground: 'oklch(0.15 0.02 285)',
      secondary: 'oklch(0.25 0.03 285)',
      secondaryForeground: 'oklch(0.95 0.01 285)',
      accent: 'oklch(0.25 0.03 285)',
      accentForeground: 'oklch(0.95 0.01 285)',
      background: 'oklch(0.15 0.02 285)',
      foreground: 'oklch(0.95 0.01 285)',
      muted: 'oklch(0.25 0.03 285)',
      mutedForeground: 'oklch(0.7 0.02 285)',
      card: 'oklch(0.15 0.02 285)',
      cardForeground: 'oklch(0.95 0.01 285)',
      border: 'oklch(0.3 0.03 285)',
      ring: 'oklch(0.7 0.12 285)',
      destructive: 'oklch(0.65 0.2 27)',
      destructiveForeground: 'oklch(0.15 0.02 27)',
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    description: 'Elegant pink accents',
    light: {
      primary: 'oklch(0.6 0.18 350)',
      primaryForeground: 'oklch(0.985 0.002 350)',
      secondary: 'oklch(0.96 0.02 350)',
      secondaryForeground: 'oklch(0.25 0.05 350)',
      accent: 'oklch(0.96 0.02 350)',
      accentForeground: 'oklch(0.25 0.05 350)',
      background: 'oklch(0.995 0.005 350)',
      foreground: 'oklch(0.2 0.03 350)',
      muted: 'oklch(0.96 0.02 350)',
      mutedForeground: 'oklch(0.5 0.03 350)',
      card: 'oklch(0.995 0.005 350)',
      cardForeground: 'oklch(0.2 0.03 350)',
      border: 'oklch(0.9 0.03 350)',
      ring: 'oklch(0.6 0.18 350)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.7 0.15 350)',
      primaryForeground: 'oklch(0.15 0.02 350)',
      secondary: 'oklch(0.25 0.03 350)',
      secondaryForeground: 'oklch(0.95 0.01 350)',
      accent: 'oklch(0.25 0.03 350)',
      accentForeground: 'oklch(0.95 0.01 350)',
      background: 'oklch(0.15 0.02 350)',
      foreground: 'oklch(0.95 0.01 350)',
      muted: 'oklch(0.25 0.03 350)',
      mutedForeground: 'oklch(0.7 0.02 350)',
      card: 'oklch(0.15 0.02 350)',
      cardForeground: 'oklch(0.95 0.01 350)',
      border: 'oklch(0.3 0.03 350)',
      ring: 'oklch(0.7 0.15 350)',
      destructive: 'oklch(0.65 0.2 27)',
      destructiveForeground: 'oklch(0.15 0.02 27)',
    },
  },
};

/**
 * Get CSS variables string for a theme
 */
export function getThemeCSSVariables(colors: ThemeColors): string {
  return `
    --primary: ${colors.primary};
    --primary-foreground: ${colors.primaryForeground};
    --secondary: ${colors.secondary};
    --secondary-foreground: ${colors.secondaryForeground};
    --accent: ${colors.accent};
    --accent-foreground: ${colors.accentForeground};
    --background: ${colors.background};
    --foreground: ${colors.foreground};
    --muted: ${colors.muted};
    --muted-foreground: ${colors.mutedForeground};
    --card: ${colors.card};
    --card-foreground: ${colors.cardForeground};
    --border: ${colors.border};
    --ring: ${colors.ring};
    --destructive: ${colors.destructive};
    --destructive-foreground: ${colors.destructiveForeground};
  `;
}

/**
 * Apply theme CSS variables to document
 */
export function applyThemeColors(colors: ThemeColors): void {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variable names
    const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVarName, value);
  });
}

/**
 * Remove custom theme CSS variables
 */
export function removeCustomThemeColors(): void {
  const root = document.documentElement;
  const varNames = [
    '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground',
    '--accent', '--accent-foreground',
    '--background', '--foreground',
    '--muted', '--muted-foreground',
    '--card', '--card-foreground',
    '--border', '--ring',
    '--destructive', '--destructive-foreground',
  ];
  varNames.forEach(name => root.style.removeProperty(name));
}

/**
 * UI Customization options
 */
export type BorderRadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type SpacingSize = 'compact' | 'comfortable' | 'spacious';
export type ShadowIntensity = 'none' | 'subtle' | 'medium' | 'strong';

export interface UICustomization {
  borderRadius: BorderRadiusSize;
  spacing: SpacingSize;
  shadowIntensity: ShadowIntensity;
  enableAnimations: boolean;
  enableBlur: boolean;
  sidebarWidth: number; // in pixels
  chatMaxWidth: number; // in pixels, 0 for full width
}

export const DEFAULT_UI_CUSTOMIZATION: UICustomization = {
  borderRadius: 'md',
  spacing: 'comfortable',
  shadowIntensity: 'subtle',
  enableAnimations: true,
  enableBlur: true,
  sidebarWidth: 280,
  chatMaxWidth: 900,
};

export const BORDER_RADIUS_VALUES: Record<BorderRadiusSize, string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};

export const SPACING_VALUES: Record<SpacingSize, { base: string; gap: string }> = {
  compact: { base: '0.5rem', gap: '0.25rem' },
  comfortable: { base: '1rem', gap: '0.5rem' },
  spacious: { base: '1.5rem', gap: '0.75rem' },
};

export const SHADOW_VALUES: Record<ShadowIntensity, string> = {
  none: 'none',
  subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  strong: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};

/**
 * Apply UI customization to document
 */
export function applyUICustomization(customization: UICustomization): void {
  const root = document.documentElement;
  
  // Border radius
  root.style.setProperty('--radius', BORDER_RADIUS_VALUES[customization.borderRadius]);
  
  // Spacing
  const spacing = SPACING_VALUES[customization.spacing];
  root.style.setProperty('--spacing-base', spacing.base);
  root.style.setProperty('--spacing-gap', spacing.gap);
  
  // Shadow
  root.style.setProperty('--shadow-card', SHADOW_VALUES[customization.shadowIntensity]);
  
  // Sidebar width
  root.style.setProperty('--sidebar-width', `${customization.sidebarWidth}px`);
  
  // Chat max width
  root.style.setProperty('--chat-max-width', customization.chatMaxWidth > 0 ? `${customization.chatMaxWidth}px` : '100%');
  
  // Animations
  if (!customization.enableAnimations) {
    root.style.setProperty('--animation-duration', '0s');
  } else {
    root.style.removeProperty('--animation-duration');
  }
  
  // Blur effects
  if (!customization.enableBlur) {
    root.style.setProperty('--blur-amount', '0');
  } else {
    root.style.removeProperty('--blur-amount');
  }
}

/**
 * Remove UI customization
 */
export function removeUICustomization(): void {
  const root = document.documentElement;
  const varNames = [
    '--radius', '--spacing-base', '--spacing-gap',
    '--shadow-card', '--sidebar-width', '--chat-max-width',
    '--animation-duration', '--blur-amount',
  ];
  varNames.forEach(name => root.style.removeProperty(name));
}
