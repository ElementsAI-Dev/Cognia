/**
 * Theme Presets - predefined color schemes for the application
 * Uses OKLch color space for perceptually uniform colors
 */

export type ColorThemePreset = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'rose' | 'slate' | 'amber';

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
  slate: {
    id: 'slate',
    name: 'Slate',
    description: 'Professional gray tones',
    light: {
      primary: 'oklch(0.45 0.02 250)',
      primaryForeground: 'oklch(0.985 0.002 250)',
      secondary: 'oklch(0.96 0.005 250)',
      secondaryForeground: 'oklch(0.25 0.01 250)',
      accent: 'oklch(0.96 0.005 250)',
      accentForeground: 'oklch(0.25 0.01 250)',
      background: 'oklch(0.995 0.002 250)',
      foreground: 'oklch(0.15 0.01 250)',
      muted: 'oklch(0.96 0.005 250)',
      mutedForeground: 'oklch(0.5 0.01 250)',
      card: 'oklch(0.995 0.002 250)',
      cardForeground: 'oklch(0.15 0.01 250)',
      border: 'oklch(0.9 0.005 250)',
      ring: 'oklch(0.45 0.02 250)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.65 0.02 250)',
      primaryForeground: 'oklch(0.15 0.01 250)',
      secondary: 'oklch(0.25 0.01 250)',
      secondaryForeground: 'oklch(0.95 0.005 250)',
      accent: 'oklch(0.25 0.01 250)',
      accentForeground: 'oklch(0.95 0.005 250)',
      background: 'oklch(0.13 0.01 250)',
      foreground: 'oklch(0.95 0.005 250)',
      muted: 'oklch(0.25 0.01 250)',
      mutedForeground: 'oklch(0.65 0.01 250)',
      card: 'oklch(0.13 0.01 250)',
      cardForeground: 'oklch(0.95 0.005 250)',
      border: 'oklch(0.3 0.01 250)',
      ring: 'oklch(0.65 0.02 250)',
      destructive: 'oklch(0.65 0.2 27)',
      destructiveForeground: 'oklch(0.15 0.01 27)',
    },
  },
  amber: {
    id: 'amber',
    name: 'Amber',
    description: 'Warm golden tones',
    light: {
      primary: 'oklch(0.7 0.16 75)',
      primaryForeground: 'oklch(0.15 0.03 75)',
      secondary: 'oklch(0.96 0.02 75)',
      secondaryForeground: 'oklch(0.25 0.05 75)',
      accent: 'oklch(0.96 0.02 75)',
      accentForeground: 'oklch(0.25 0.05 75)',
      background: 'oklch(0.995 0.005 75)',
      foreground: 'oklch(0.2 0.03 75)',
      muted: 'oklch(0.96 0.02 75)',
      mutedForeground: 'oklch(0.5 0.03 75)',
      card: 'oklch(0.995 0.005 75)',
      cardForeground: 'oklch(0.2 0.03 75)',
      border: 'oklch(0.9 0.03 75)',
      ring: 'oklch(0.7 0.16 75)',
      destructive: 'oklch(0.55 0.2 27)',
      destructiveForeground: 'oklch(0.985 0.002 27)',
    },
    dark: {
      primary: 'oklch(0.75 0.14 75)',
      primaryForeground: 'oklch(0.15 0.02 75)',
      secondary: 'oklch(0.25 0.03 75)',
      secondaryForeground: 'oklch(0.95 0.01 75)',
      accent: 'oklch(0.25 0.03 75)',
      accentForeground: 'oklch(0.95 0.01 75)',
      background: 'oklch(0.15 0.02 75)',
      foreground: 'oklch(0.95 0.01 75)',
      muted: 'oklch(0.25 0.03 75)',
      mutedForeground: 'oklch(0.7 0.02 75)',
      card: 'oklch(0.15 0.02 75)',
      cardForeground: 'oklch(0.95 0.01 75)',
      border: 'oklch(0.3 0.03 75)',
      ring: 'oklch(0.75 0.14 75)',
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
    '--popover', '--popover-foreground',
    '--border', '--ring',
    '--input',
    '--destructive', '--destructive-foreground',
    '--sidebar-primary', '--sidebar-primary-foreground',
    '--sidebar-accent', '--sidebar-accent-foreground',
    '--sidebar-ring',
  ];
  varNames.forEach(name => root.style.removeProperty(name));
}

/**
 * UI Customization options
 */
export type BorderRadiusSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type SpacingSize = 'compact' | 'comfortable' | 'spacious';
export type ShadowIntensity = 'none' | 'subtle' | 'medium' | 'strong';
export type MessageDensity = 'compact' | 'default' | 'relaxed';
export type AvatarStyle = 'circle' | 'rounded' | 'square' | 'hidden';
export type TimestampFormat = 'relative' | 'absolute' | 'both' | 'hidden';
export type UIFontFamily = 'system' | 'inter' | 'roboto' | 'open-sans' | 'lato' | 'poppins' | 'nunito';

export const UI_FONT_OPTIONS: { value: UIFontFamily; label: string; fontFamily: string }[] = [
  { value: 'system', label: 'System Default', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { value: 'inter', label: 'Inter', fontFamily: '"Inter", sans-serif' },
  { value: 'roboto', label: 'Roboto', fontFamily: '"Roboto", sans-serif' },
  { value: 'open-sans', label: 'Open Sans', fontFamily: '"Open Sans", sans-serif' },
  { value: 'lato', label: 'Lato', fontFamily: '"Lato", sans-serif' },
  { value: 'poppins', label: 'Poppins', fontFamily: '"Poppins", sans-serif' },
  { value: 'nunito', label: 'Nunito', fontFamily: '"Nunito", sans-serif' },
];

export interface UICustomization {
  borderRadius: BorderRadiusSize;
  spacing: SpacingSize;
  shadowIntensity: ShadowIntensity;
  enableAnimations: boolean;
  enableBlur: boolean;
  sidebarWidth: number; // in pixels
  chatMaxWidth: number; // in pixels, 0 for full width
  // Message options
  messageDensity: MessageDensity;
  avatarStyle: AvatarStyle;
  timestampFormat: TimestampFormat;
  showAvatars: boolean;
  showUserAvatar: boolean;
  showAssistantAvatar: boolean;
  messageAlignment: 'left' | 'alternate'; // left = all left, alternate = user right/ai left
  inputPosition: 'bottom' | 'floating'; // input box position style
  // Font options
  uiFontFamily: UIFontFamily;
}

export const DEFAULT_UI_CUSTOMIZATION: UICustomization = {
  borderRadius: 'md',
  spacing: 'comfortable',
  shadowIntensity: 'subtle',
  enableAnimations: true,
  enableBlur: true,
  sidebarWidth: 280,
  chatMaxWidth: 900,
  // Message defaults
  messageDensity: 'default',
  avatarStyle: 'circle',
  timestampFormat: 'relative',
  showAvatars: true,
  showUserAvatar: false,
  showAssistantAvatar: true,
  messageAlignment: 'alternate',
  inputPosition: 'bottom',
  // Font default
  uiFontFamily: 'system',
};

/**
 * Background image settings
 */
export type BackgroundImageFit = 'cover' | 'contain' | 'fill' | 'tile';
export type BackgroundImagePosition = 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type BackgroundImageSource = 'none' | 'url' | 'local' | 'preset';
export type BackgroundAttachment = 'fixed' | 'scroll' | 'local';
export type BackgroundAnimation = 'none' | 'kenburns' | 'parallax' | 'gradient-shift';

export interface BackgroundSettings {
  enabled: boolean;
  source: BackgroundImageSource;
  imageUrl: string; // URL, gradient string, or local file URL (Tauri). For web-local files, this is resolved at runtime.
  localAssetId: string | null; // Web-only: IndexedDB asset id for local background image
  presetId: string | null; // For built-in presets
  fit: BackgroundImageFit;
  position: BackgroundImagePosition;
  opacity: number; // 0-100
  blur: number; // 0-20 px
  overlayColor: string; // Hex color for overlay
  overlayOpacity: number; // 0-100
  brightness: number; // 50-150 (100 = normal)
  saturation: number; // 0-200 (100 = normal)
  // New: attachment mode
  attachment: BackgroundAttachment;
  // New: animation effect
  animation: BackgroundAnimation;
  animationSpeed: number; // 1-10 (slow to fast)
  // New: contrast adjustment
  contrast: number; // 50-150 (100 = normal)
  // New: grayscale filter
  grayscale: number; // 0-100
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  enabled: false,
  source: 'none',
  imageUrl: '',
  localAssetId: null,
  presetId: null,
  fit: 'cover',
  position: 'center',
  opacity: 100,
  blur: 0,
  overlayColor: '#000000',
  overlayOpacity: 0,
  brightness: 100,
  saturation: 100,
  attachment: 'fixed',
  animation: 'none',
  animationSpeed: 5,
  contrast: 100,
  grayscale: 0,
};

export const BACKGROUND_PRESETS: { id: string; name: string; url: string; thumbnail?: string; category: 'gradient' | 'mesh' | 'abstract' | 'nature' }[] = [
  // Gradient backgrounds
  { id: 'gradient-blue', name: 'Blue Gradient', url: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', category: 'gradient' },
  { id: 'gradient-green', name: 'Green Gradient', url: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', category: 'gradient' },
  { id: 'gradient-orange', name: 'Orange Sunset', url: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', category: 'gradient' },
  { id: 'gradient-purple', name: 'Purple Night', url: 'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)', category: 'gradient' },
  { id: 'gradient-dark', name: 'Dark Ocean', url: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', category: 'gradient' },
  { id: 'gradient-warm', name: 'Warm Flame', url: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)', category: 'gradient' },
  { id: 'gradient-midnight', name: 'Midnight', url: 'linear-gradient(135deg, #232526 0%, #414345 100%)', category: 'gradient' },
  { id: 'gradient-aurora', name: 'Aurora', url: 'linear-gradient(135deg, #00c6fb 0%, #005bea 50%, #00c6fb 100%)', category: 'gradient' },
  { id: 'gradient-coral', name: 'Coral Reef', url: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)', category: 'gradient' },
  { id: 'gradient-forest', name: 'Forest', url: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', category: 'gradient' },
  // Mesh backgrounds
  { id: 'mesh-blue', name: 'Mesh Blue', url: 'radial-gradient(at 40% 20%, hsla(210,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(235,100%,69%,0.3) 0px, transparent 50%)', category: 'mesh' },
  { id: 'mesh-purple', name: 'Mesh Purple', url: 'radial-gradient(at 40% 20%, hsla(280,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(320,100%,56%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(260,100%,69%,0.3) 0px, transparent 50%)', category: 'mesh' },
  { id: 'mesh-sunset', name: 'Mesh Sunset', url: 'radial-gradient(at 0% 100%, hsla(22,100%,50%,0.3) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(339,100%,50%,0.3) 0px, transparent 50%), radial-gradient(at 50% 0%, hsla(52,100%,69%,0.3) 0px, transparent 50%)', category: 'mesh' },
  { id: 'mesh-ocean', name: 'Mesh Ocean', url: 'radial-gradient(at 0% 0%, hsla(180,100%,50%,0.3) 0px, transparent 50%), radial-gradient(at 100% 50%, hsla(200,100%,50%,0.3) 0px, transparent 50%), radial-gradient(at 50% 100%, hsla(220,100%,69%,0.3) 0px, transparent 50%)', category: 'mesh' },
  // Abstract patterns
  { id: 'abstract-dots', name: 'Subtle Dots', url: 'radial-gradient(circle, rgba(0,0,0,0.05) 1px, transparent 1px)', category: 'abstract' },
  { id: 'abstract-grid', name: 'Grid Pattern', url: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)', category: 'abstract' },
  { id: 'abstract-noise', name: 'Noise Texture', url: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")', category: 'abstract' },
];

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
  
  // Font family
  const fontOption = UI_FONT_OPTIONS.find(f => f.value === customization.uiFontFamily);
  if (fontOption) {
    root.style.setProperty('--font-ui', fontOption.fontFamily);
  }
  
  // Message density
  const densityValues: Record<MessageDensity, string> = {
    compact: '0.5rem',
    default: '1rem',
    relaxed: '1.5rem',
  };
  root.style.setProperty('--message-spacing', densityValues[customization.messageDensity]);
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
    '--font-ui', '--message-spacing',
  ];
  varNames.forEach(name => root.style.removeProperty(name));
}

/**
 * Apply background settings to document
 */
export function applyBackgroundSettings(settings: BackgroundSettings): void {
  const root = document.documentElement;
  
  if (!settings.enabled || settings.source === 'none') {
    // Remove all background CSS variables
    removeBackgroundSettings();
    return;
  }
  
  // Determine the background value
  let backgroundValue = '';
  if (settings.source === 'preset' && settings.presetId) {
    const preset = BACKGROUND_PRESETS.find(p => p.id === settings.presetId);
    if (preset) {
      backgroundValue = preset.url;
    }
  } else if (settings.source === 'url' || settings.source === 'local') {
    if (settings.imageUrl) {
      // Check if it's already a gradient (preset stored as URL)
      if (settings.imageUrl.startsWith('linear-gradient') || settings.imageUrl.startsWith('radial-gradient')) {
        backgroundValue = settings.imageUrl;
      } else {
        backgroundValue = `url("${settings.imageUrl}")`;
      }
    }
  }
  
  if (!backgroundValue) {
    removeBackgroundSettings();
    return;
  }
  
  // Set CSS variables
  root.style.setProperty('--bg-image', backgroundValue);
  root.style.setProperty('--bg-image-opacity', `${settings.opacity / 100}`);
  root.style.setProperty('--bg-image-blur', `${settings.blur}px`);
  root.style.setProperty('--bg-overlay-color', settings.overlayColor);
  root.style.setProperty('--bg-overlay-opacity', `${settings.overlayOpacity / 100}`);
  root.style.setProperty('--bg-brightness', `${settings.brightness}%`);
  root.style.setProperty('--bg-saturation', `${settings.saturation}%`);
  
  // New: contrast and grayscale
  root.style.setProperty('--bg-contrast', `${settings.contrast ?? 100}%`);
  root.style.setProperty('--bg-grayscale', `${settings.grayscale ?? 0}%`);
  
  // Set background size based on fit
  const sizeMap: Record<BackgroundImageFit, string> = {
    cover: 'cover',
    contain: 'contain',
    fill: '100% 100%',
    tile: 'auto',
  };
  root.style.setProperty('--bg-image-size', sizeMap[settings.fit]);
  
  // Set background repeat
  root.style.setProperty('--bg-image-repeat', settings.fit === 'tile' ? 'repeat' : 'no-repeat');
  
  // Set background position
  const positionMap: Record<BackgroundImagePosition, string> = {
    center: 'center center',
    top: 'center top',
    bottom: 'center bottom',
    left: 'left center',
    right: 'right center',
    'top-left': 'left top',
    'top-right': 'right top',
    'bottom-left': 'left bottom',
    'bottom-right': 'right bottom',
  };
  root.style.setProperty('--bg-image-position', positionMap[settings.position]);
  
  // New: background attachment
  const attachmentMap: Record<BackgroundAttachment, string> = {
    fixed: 'fixed',
    scroll: 'scroll',
    local: 'local',
  };
  root.style.setProperty('--bg-image-attachment', attachmentMap[settings.attachment ?? 'fixed']);
  
  // New: animation settings
  const animation = settings.animation ?? 'none';
  const animationSpeed = settings.animationSpeed ?? 5;
  root.style.setProperty('--bg-animation', animation);
  root.style.setProperty('--bg-animation-duration', `${(11 - animationSpeed) * 5}s`); // 50s (slow) to 5s (fast)
  
  // Add animation class if needed
  root.classList.remove('bg-anim-kenburns', 'bg-anim-parallax', 'bg-anim-gradient-shift');
  if (animation !== 'none') {
    root.classList.add(`bg-anim-${animation}`);
  }
  
  // Add a class to indicate background is active
  root.classList.add('has-bg-image');
}

/**
 * Remove background settings
 */
export function removeBackgroundSettings(): void {
  const root = document.documentElement;
  const varNames = [
    '--bg-image', '--bg-image-opacity', '--bg-image-blur',
    '--bg-overlay-color', '--bg-overlay-opacity',
    '--bg-brightness', '--bg-saturation', '--bg-contrast', '--bg-grayscale',
    '--bg-image-size', '--bg-image-repeat', '--bg-image-position',
    '--bg-image-attachment', '--bg-animation', '--bg-animation-duration',
  ];
  // Remove animation classes
  root.classList.remove('bg-anim-kenburns', 'bg-anim-parallax', 'bg-anim-gradient-shift');
  varNames.forEach(name => root.style.removeProperty(name));
  root.classList.remove('has-bg-image');
}
