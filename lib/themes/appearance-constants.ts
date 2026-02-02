/**
 * Appearance Constants
 * Centralized constants for appearance settings components
 */

import type { ContrastLevel } from './color-utils';
import type {
  BorderRadiusSize,
  SpacingSize,
  ShadowIntensity,
  MessageDensity,
  AvatarStyle,
  TimestampFormat,
  BackgroundImageFit,
  BackgroundImagePosition,
} from './presets';
import type { ColorThemePreset } from './presets';

// Theme type (light/dark/system)
export type Theme = 'light' | 'dark' | 'system';

/**
 * Theme mode options (light/dark/system)
 */
export interface ThemeModeOption {
  value: Theme;
  labelKey: string;
  icon: 'sun' | 'moon' | 'monitor';
}

export const THEME_MODE_OPTIONS: ThemeModeOption[] = [
  { value: 'light', labelKey: 'themeLight', icon: 'sun' },
  { value: 'dark', labelKey: 'themeDark', icon: 'moon' },
  { value: 'system', labelKey: 'themeSystem', icon: 'monitor' },
];

/**
 * Color theme preset options
 */
export interface ColorThemeOption {
  value: ColorThemePreset;
  color: string;
}

export const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
  { value: 'default', color: 'bg-blue-500' },
  { value: 'ocean', color: 'bg-teal-500' },
  { value: 'forest', color: 'bg-green-600' },
  { value: 'sunset', color: 'bg-orange-500' },
  { value: 'lavender', color: 'bg-purple-500' },
  { value: 'rose', color: 'bg-pink-500' },
  { value: 'slate', color: 'bg-slate-500' },
  { value: 'amber', color: 'bg-amber-500' },
];

/**
 * Background fit options
 */
export interface BackgroundFitOption {
  value: BackgroundImageFit;
  labelKey: string;
}

export const BACKGROUND_FIT_OPTIONS: BackgroundFitOption[] = [
  { value: 'cover', labelKey: 'fitCover' },
  { value: 'contain', labelKey: 'fitContain' },
  { value: 'fill', labelKey: 'fitStretch' },
  { value: 'tile', labelKey: 'fitTile' },
];

/**
 * Background position options
 */
export interface BackgroundPositionOption {
  value: BackgroundImagePosition;
  labelKey: string;
}

export const BACKGROUND_POSITION_OPTIONS: BackgroundPositionOption[] = [
  { value: 'center', labelKey: 'positionCenter' },
  { value: 'top', labelKey: 'positionTop' },
  { value: 'bottom', labelKey: 'positionBottom' },
  { value: 'left', labelKey: 'positionLeft' },
  { value: 'right', labelKey: 'positionRight' },
  { value: 'top-left', labelKey: 'positionTopLeft' },
  { value: 'top-right', labelKey: 'positionTopRight' },
  { value: 'bottom-left', labelKey: 'positionBottomLeft' },
  { value: 'bottom-right', labelKey: 'positionBottomRight' },
];

/**
 * Border radius options
 */
export interface BorderRadiusOption {
  value: BorderRadiusSize;
  labelKey: string;
}

export const BORDER_RADIUS_OPTIONS: BorderRadiusOption[] = [
  { value: 'none', labelKey: 'borderRadiusNone' },
  { value: 'sm', labelKey: 'borderRadiusSm' },
  { value: 'md', labelKey: 'borderRadiusMd' },
  { value: 'lg', labelKey: 'borderRadiusLg' },
  { value: 'xl', labelKey: 'borderRadiusXl' },
  { value: 'full', labelKey: 'borderRadiusFull' },
];

/**
 * Spacing options
 */
export interface SpacingOption {
  value: SpacingSize;
  labelKey: string;
}

export const SPACING_OPTIONS: SpacingOption[] = [
  { value: 'compact', labelKey: 'spacingCompact' },
  { value: 'comfortable', labelKey: 'spacingComfortable' },
  { value: 'spacious', labelKey: 'spacingSpacious' },
];

/**
 * Shadow intensity options
 */
export interface ShadowOption {
  value: ShadowIntensity;
  labelKey: string;
}

export const SHADOW_OPTIONS: ShadowOption[] = [
  { value: 'none', labelKey: 'shadowNone' },
  { value: 'subtle', labelKey: 'shadowSubtle' },
  { value: 'medium', labelKey: 'shadowMedium' },
  { value: 'strong', labelKey: 'shadowStrong' },
];

/**
 * Message density options
 */
export interface MessageDensityOption {
  value: MessageDensity;
  labelKey: string;
  descKey: string;
}

export const MESSAGE_DENSITY_OPTIONS: MessageDensityOption[] = [
  { value: 'compact', labelKey: 'densityCompact', descKey: 'densityCompactDesc' },
  { value: 'default', labelKey: 'densityDefault', descKey: 'densityDefaultDesc' },
  { value: 'relaxed', labelKey: 'densityRelaxed', descKey: 'densityRelaxedDesc' },
];

/**
 * Avatar style options
 */
export interface AvatarStyleOption {
  value: AvatarStyle;
  labelKey: string;
}

export const AVATAR_STYLE_OPTIONS: AvatarStyleOption[] = [
  { value: 'circle', labelKey: 'avatarCircle' },
  { value: 'rounded', labelKey: 'avatarRounded' },
  { value: 'square', labelKey: 'avatarSquare' },
  { value: 'hidden', labelKey: 'avatarHidden' },
];

/**
 * Timestamp format options
 */
export interface TimestampOption {
  value: TimestampFormat;
  labelKey: string;
}

export const TIMESTAMP_OPTIONS: TimestampOption[] = [
  { value: 'relative', labelKey: 'timestampRelative' },
  { value: 'absolute', labelKey: 'timestampAbsolute' },
  { value: 'both', labelKey: 'timestampBoth' },
  { value: 'hidden', labelKey: 'timestampHidden' },
];

/**
 * Theme editor color category
 */
export type ColorCategory = 'core' | 'extended';

/**
 * Theme editor colors interface (full 16-color theme)
 */
export interface ThemeEditorColors {
  // Core colors (required)
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  // Extended colors (optional, auto-generated if not provided)
  primaryForeground?: string;
  secondaryForeground?: string;
  accentForeground?: string;
  mutedForeground?: string;
  card?: string;
  cardForeground?: string;
  border?: string;
  ring?: string;
  destructive?: string;
  destructiveForeground?: string;
}

/**
 * Color label configuration
 */
export interface ColorLabelConfig {
  key: keyof ThemeEditorColors;
  labelKey: string;
  description: string;
  category: ColorCategory;
}

export const COLOR_LABELS: ColorLabelConfig[] = [
  // Core colors
  { key: 'primary', labelKey: 'primary', description: 'Buttons, links, highlights', category: 'core' },
  { key: 'secondary', labelKey: 'secondary', description: 'Secondary backgrounds', category: 'core' },
  { key: 'accent', labelKey: 'accent', description: 'Hover states, accents', category: 'core' },
  { key: 'background', labelKey: 'background', description: 'Main background', category: 'core' },
  { key: 'foreground', labelKey: 'foreground', description: 'Main text color', category: 'core' },
  { key: 'muted', labelKey: 'muted', description: 'Muted backgrounds', category: 'core' },
  // Extended colors
  { key: 'primaryForeground', labelKey: 'primaryForeground', description: 'Text on primary', category: 'extended' },
  { key: 'secondaryForeground', labelKey: 'secondaryForeground', description: 'Text on secondary', category: 'extended' },
  { key: 'accentForeground', labelKey: 'accentForeground', description: 'Text on accent', category: 'extended' },
  { key: 'mutedForeground', labelKey: 'mutedForeground', description: 'Muted text', category: 'extended' },
  { key: 'card', labelKey: 'card', description: 'Card background', category: 'extended' },
  { key: 'cardForeground', labelKey: 'cardForeground', description: 'Card text', category: 'extended' },
  { key: 'border', labelKey: 'border', description: 'Borders', category: 'extended' },
  { key: 'ring', labelKey: 'ring', description: 'Focus ring', category: 'extended' },
  { key: 'destructive', labelKey: 'destructive', description: 'Error/delete', category: 'extended' },
  { key: 'destructiveForeground', labelKey: 'destructiveForeground', description: 'Text on destructive', category: 'extended' },
];

/**
 * Default light theme colors
 */
export const DEFAULT_LIGHT_COLORS: ThemeEditorColors = {
  primary: '#3b82f6',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#1e293b',
  accent: '#f1f5f9',
  accentForeground: '#1e293b',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  card: '#ffffff',
  cardForeground: '#0f172a',
  border: '#e2e8f0',
  ring: '#3b82f6',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
};

/**
 * Default dark theme colors
 */
export const DEFAULT_DARK_COLORS: ThemeEditorColors = {
  primary: '#3b82f6',
  primaryForeground: '#ffffff',
  secondary: '#1e293b',
  secondaryForeground: '#f8fafc',
  accent: '#1e293b',
  accentForeground: '#f8fafc',
  background: '#0f172a',
  foreground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  card: '#1e293b',
  cardForeground: '#f8fafc',
  border: '#334155',
  ring: '#3b82f6',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
};

/**
 * Contrast level color mappings (Tailwind classes)
 */
export const CONTRAST_LEVEL_COLORS: Record<ContrastLevel, string> = {
  'fail': 'text-red-500',
  'AA-large': 'text-yellow-500',
  'AA': 'text-green-500',
  'AAA': 'text-green-600',
};

/**
 * Contrast level labels for accessibility
 */
export const CONTRAST_LEVEL_LABELS: Record<ContrastLevel, string> = {
  'fail': 'Fails WCAG',
  'AA-large': 'AA Large Text',
  'AA': 'AA Normal Text',
  'AAA': 'AAA (Best)',
};

/**
 * Background settings slider limits
 * Centralized constants to avoid magic numbers in components
 */
export const BACKGROUND_LIMITS = {
  blur: { min: 0, max: 20, step: 1 },
  opacity: { min: 10, max: 100, step: 5 },
  overlayOpacity: { min: 0, max: 80, step: 5 },
  brightness: { min: 50, max: 150, step: 5 },
  saturation: { min: 0, max: 200, step: 10 },
  contrast: { min: 50, max: 150, step: 5 },
  grayscale: { min: 0, max: 100, step: 5 },
  animationSpeed: { min: 1, max: 10, step: 1 },
  slideshowInterval: { min: 1, max: 300, step: 1 }, // seconds
  slideshowTransition: { min: 100, max: 3000, step: 100 }, // ms
  urlValidationTimeout: 10000, // ms - timeout for validating image URLs
  imageCompressionThreshold: 1024 * 1024, // 1MB - compress images above this size
  imageCompressionQuality: 0.85, // JPEG quality for compressed images
  maxImageWidth: 3840, // 4K max width
  maxImageHeight: 2160, // 4K max height
} as const;

export type BackgroundLimits = typeof BACKGROUND_LIMITS;
