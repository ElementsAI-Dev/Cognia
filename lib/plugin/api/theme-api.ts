/**
 * Plugin Theme API Implementation
 * 
 * Provides theme customization capabilities to plugins.
 */

import { useSettingsStore } from '@/stores';
import { THEME_PRESETS } from '@/lib/themes';
import type {
  PluginThemeAPI,
  ThemeMode,
  ColorThemePreset,
  ThemeColors,
  CustomTheme,
  ThemeState,
} from '@/types/plugin/plugin-extended';

/**
 * Get resolved theme mode (handles 'system' -> 'light' | 'dark')
 */
function getResolvedMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return mode;
}

/**
 * Get theme colors for current state
 */
function getCurrentColors(preset: ColorThemePreset, isDark: boolean): ThemeColors {
  const presetConfig = THEME_PRESETS[preset];
  const colors = isDark ? presetConfig?.dark : presetConfig?.light;
  
  return {
    primary: colors?.primary || 'oklch(0.6 0.2 250)',
    primaryForeground: colors?.primaryForeground || 'oklch(0.98 0.01 0)',
    secondary: colors?.secondary || 'oklch(0.9 0.02 250)',
    secondaryForeground: colors?.secondaryForeground || 'oklch(0.2 0.02 250)',
    accent: colors?.accent || 'oklch(0.6 0.2 250)',
    accentForeground: colors?.accentForeground || 'oklch(0.98 0.01 0)',
    background: colors?.background || (isDark ? 'oklch(0.15 0.02 250)' : 'oklch(0.99 0.01 0)'),
    foreground: colors?.foreground || (isDark ? 'oklch(0.95 0.01 0)' : 'oklch(0.15 0.02 250)'),
    muted: colors?.muted || (isDark ? 'oklch(0.25 0.02 250)' : 'oklch(0.95 0.01 0)'),
    mutedForeground: colors?.mutedForeground || 'oklch(0.6 0.02 250)',
    card: colors?.card || (isDark ? 'oklch(0.18 0.02 250)' : 'oklch(0.99 0.01 0)'),
    cardForeground: colors?.cardForeground || (isDark ? 'oklch(0.95 0.01 0)' : 'oklch(0.15 0.02 250)'),
    border: colors?.border || 'oklch(0.8 0.01 250)',
    ring: colors?.ring || 'oklch(0.6 0.2 250)',
    destructive: colors?.destructive || 'oklch(0.55 0.25 25)',
    destructiveForeground: colors?.destructiveForeground || 'oklch(0.98 0.01 0)',
  };
}

/**
 * Create the Theme API for a plugin
 */
export function createThemeAPI(pluginId: string): PluginThemeAPI {
  return {
    getTheme: (): ThemeState => {
      const store = useSettingsStore.getState();
      const mode = store.theme;
      const resolvedMode = getResolvedMode(mode);
      const colorPreset = store.colorTheme;
      const customThemeId = store.activeCustomThemeId;

      return {
        mode,
        resolvedMode,
        colorPreset,
        customThemeId,
        colors: getCurrentColors(colorPreset, resolvedMode === 'dark'),
      };
    },

    getMode: () => {
      return useSettingsStore.getState().theme;
    },

    getResolvedMode: () => {
      const mode = useSettingsStore.getState().theme;
      return getResolvedMode(mode);
    },

    setMode: (mode: ThemeMode) => {
      useSettingsStore.getState().setTheme(mode);
      console.log(`[Plugin:${pluginId}] Set theme mode: ${mode}`);
    },

    getColorPreset: () => {
      return useSettingsStore.getState().colorTheme;
    },

    setColorPreset: (preset: ColorThemePreset) => {
      useSettingsStore.getState().setColorTheme(preset);
      console.log(`[Plugin:${pluginId}] Set color preset: ${preset}`);
    },

    getAvailablePresets: (): ColorThemePreset[] => {
      return ['default', 'ocean', 'forest', 'sunset', 'lavender', 'rose', 'slate', 'amber'];
    },

    getColors: (): ThemeColors => {
      const store = useSettingsStore.getState();
      const resolvedMode = getResolvedMode(store.theme);
      return getCurrentColors(store.colorTheme, resolvedMode === 'dark');
    },

    registerCustomTheme: (theme: Omit<CustomTheme, 'id'>): string => {
      const store = useSettingsStore.getState();
      // Ensure required color fields are present
      const themeWithDefaults = {
        name: theme.name,
        isDark: theme.isDark,
        colors: {
          primary: theme.colors.primary || '#3b82f6',
          secondary: theme.colors.secondary || '#64748b',
          accent: theme.colors.accent || '#3b82f6',
          background: theme.colors.background || '#ffffff',
          foreground: theme.colors.foreground || '#0f172a',
          muted: theme.colors.muted || '#f1f5f9',
        },
      };
      const id = store.createCustomTheme(themeWithDefaults);
      console.log(`[Plugin:${pluginId}] Registered custom theme: ${theme.name} (${id})`);
      return id;
    },

    updateCustomTheme: (id: string, updates: Partial<CustomTheme>) => {
      const store = useSettingsStore.getState();
      // Convert to store format
      const storeUpdates: Record<string, unknown> = {};
      if (updates.name) storeUpdates.name = updates.name;
      if (updates.isDark !== undefined) storeUpdates.isDark = updates.isDark;
      if (updates.colors) {
        storeUpdates.colors = {
          primary: updates.colors.primary || '#3b82f6',
          secondary: updates.colors.secondary || '#64748b',
          accent: updates.colors.accent || '#3b82f6',
          background: updates.colors.background || '#ffffff',
          foreground: updates.colors.foreground || '#0f172a',
          muted: updates.colors.muted || '#f1f5f9',
        };
      }
      store.updateCustomTheme(id, storeUpdates);
      console.log(`[Plugin:${pluginId}] Updated custom theme: ${id}`);
    },

    deleteCustomTheme: (id: string) => {
      const store = useSettingsStore.getState();
      store.deleteCustomTheme(id);
      console.log(`[Plugin:${pluginId}] Deleted custom theme: ${id}`);
    },

    getCustomThemes: (): CustomTheme[] => {
      return useSettingsStore.getState().customThemes;
    },

    activateCustomTheme: (id: string) => {
      const store = useSettingsStore.getState();
      store.setActiveCustomTheme(id);
      console.log(`[Plugin:${pluginId}] Activated custom theme: ${id}`);
    },

    onThemeChange: (handler: (theme: ThemeState) => void) => {
      let lastState = JSON.stringify({
        mode: useSettingsStore.getState().theme,
        colorTheme: useSettingsStore.getState().colorTheme,
        customThemeId: useSettingsStore.getState().activeCustomThemeId,
      });

      const unsubscribe = useSettingsStore.subscribe((state) => {
        const currentState = JSON.stringify({
          mode: state.theme,
          colorTheme: state.colorTheme,
          customThemeId: state.activeCustomThemeId,
        });

        if (currentState !== lastState) {
          lastState = currentState;
          const resolvedMode = getResolvedMode(state.theme);
          handler({
            mode: state.theme,
            resolvedMode,
            colorPreset: state.colorTheme,
            customThemeId: state.activeCustomThemeId,
            colors: getCurrentColors(state.colorTheme, resolvedMode === 'dark'),
          });
        }
      });

      return unsubscribe;
    },

    applyScopedColors: (element: HTMLElement, colors: Partial<ThemeColors>) => {
      const originalStyles: Record<string, string> = {};

      Object.entries(colors).forEach(([key, value]) => {
        if (value) {
          const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          originalStyles[cssVarName] = element.style.getPropertyValue(cssVarName);
          element.style.setProperty(cssVarName, value);
        }
      });

      // Return cleanup function
      return () => {
        Object.entries(originalStyles).forEach(([cssVarName, value]) => {
          if (value) {
            element.style.setProperty(cssVarName, value);
          } else {
            element.style.removeProperty(cssVarName);
          }
        });
      };
    },
  };
}
