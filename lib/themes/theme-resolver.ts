import {
  THEME_PRESETS,
  applyThemeColors,
  type ThemeColors,
  type ColorThemePreset,
} from './presets';

type ResolvedThemeMode = 'light' | 'dark';
type ThemeSource = 'preset' | 'custom';

type ThemeColorToken = keyof ThemeColors;

interface ThemeResolverCustomThemeColors {
  primary?: string;
  primaryForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  mutedForeground?: string;
  card?: string;
  cardForeground?: string;
  border?: string;
  ring?: string;
  destructive?: string;
  destructiveForeground?: string;
}

export interface ThemeResolverCustomTheme {
  id: string;
  name?: string;
  isDark?: boolean;
  colors: ThemeResolverCustomThemeColors;
}

export interface ResolveActiveThemeColorsInput {
  colorTheme: ColorThemePreset;
  resolvedTheme: ResolvedThemeMode;
  activeCustomThemeId: string | null;
  customThemes: ThemeResolverCustomTheme[];
}

export interface ResolvedActiveThemeColors {
  themeSource: ThemeSource;
  colors: ThemeColors;
  derivedVariables: Record<string, string>;
  activeCustomTheme: ThemeResolverCustomTheme | null;
}

const REQUIRED_THEME_TOKENS: ThemeColorToken[] = [
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'accent',
  'accentForeground',
  'background',
  'foreground',
  'muted',
  'mutedForeground',
  'card',
  'cardForeground',
  'border',
  'ring',
  'destructive',
  'destructiveForeground',
];

function getPresetColors(
  preset: ColorThemePreset,
  resolvedTheme: ResolvedThemeMode
): ThemeColors {
  const fallbackPreset = THEME_PRESETS.default;
  const presetConfig = THEME_PRESETS[preset] ?? fallbackPreset;
  return resolvedTheme === 'dark' ? presetConfig.dark : presetConfig.light;
}

function resolveCustomThemeColors(
  customTheme: ThemeResolverCustomTheme,
  presetColors: ThemeColors
): ThemeColors {
  const custom = customTheme.colors;
  const resolved: Partial<ThemeColors> = {
    primary: custom.primary ?? presetColors.primary,
    primaryForeground:
      custom.primaryForeground ?? presetColors.primaryForeground,
    secondary: custom.secondary ?? presetColors.secondary,
    secondaryForeground:
      custom.secondaryForeground ?? presetColors.secondaryForeground,
    accent: custom.accent ?? presetColors.accent,
    accentForeground:
      custom.accentForeground ?? presetColors.accentForeground,
    background: custom.background ?? presetColors.background,
    foreground: custom.foreground ?? presetColors.foreground,
    muted: custom.muted ?? presetColors.muted,
    mutedForeground: custom.mutedForeground ?? presetColors.mutedForeground,
  };

  resolved.card = custom.card ?? resolved.background;
  resolved.cardForeground = custom.cardForeground ?? resolved.foreground;
  resolved.border = custom.border ?? presetColors.border;
  resolved.ring = custom.ring ?? resolved.primary;
  resolved.destructive = custom.destructive ?? presetColors.destructive;
  resolved.destructiveForeground =
    custom.destructiveForeground ?? presetColors.destructiveForeground;

  return REQUIRED_THEME_TOKENS.reduce((acc, token) => {
    acc[token] = resolved[token] ?? presetColors[token];
    return acc;
  }, {} as ThemeColors);
}

function buildDerivedThemeVariables(colors: ThemeColors): Record<string, string> {
  return {
    '--popover': colors.card,
    '--popover-foreground': colors.cardForeground,
    '--input': colors.border,
    '--sidebar-primary': colors.primary,
    '--sidebar-primary-foreground': colors.primaryForeground,
    '--sidebar-accent': colors.accent,
    '--sidebar-accent-foreground': colors.accentForeground,
    '--sidebar-ring': colors.ring,
  };
}

export function resolveActiveThemeColors(
  input: ResolveActiveThemeColorsInput
): ResolvedActiveThemeColors {
  const presetColors = getPresetColors(input.colorTheme, input.resolvedTheme);

  if (!input.activeCustomThemeId) {
    return {
      themeSource: 'preset',
      colors: presetColors,
      derivedVariables: buildDerivedThemeVariables(presetColors),
      activeCustomTheme: null,
    };
  }

  const customTheme =
    input.customThemes.find((theme) => theme.id === input.activeCustomThemeId) ??
    null;

  if (!customTheme) {
    return {
      themeSource: 'preset',
      colors: presetColors,
      derivedVariables: buildDerivedThemeVariables(presetColors),
      activeCustomTheme: null,
    };
  }

  const resolvedColors = resolveCustomThemeColors(customTheme, presetColors);
  return {
    themeSource: 'custom',
    colors: resolvedColors,
    derivedVariables: buildDerivedThemeVariables(resolvedColors),
    activeCustomTheme: customTheme,
  };
}

export function applyResolvedThemeToDocument(
  resolved: ResolvedActiveThemeColors,
  root: HTMLElement = document.documentElement
): void {
  applyThemeColors(resolved.colors);
  Object.entries(resolved.derivedVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

