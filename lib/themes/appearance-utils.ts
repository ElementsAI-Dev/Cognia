/**
 * Appearance Utilities
 * Small utility functions for appearance settings
 */

import { THEME_PRESETS, type ColorThemePreset } from './presets';

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get CSS color values for a preset theme
 */
export function getPresetColors(preset: ColorThemePreset, isDark: boolean) {
  const presetData = THEME_PRESETS[preset];
  if (!presetData) {
    return {
      primary: isDark ? '#3b82f6' : '#2563eb',
      background: isDark ? '#0f172a' : '#ffffff',
      foreground: isDark ? '#f8fafc' : '#0f172a',
      muted: isDark ? '#1e293b' : '#f1f5f9',
      secondary: isDark ? '#1e293b' : '#f1f5f9',
    };
  }

  // Map preset to approximate hex colors
  const colorMap: Record<ColorThemePreset, { light: string; dark: string }> = {
    default: { light: '#2563eb', dark: '#3b82f6' },
    ocean: { light: '#0891b2', dark: '#06b6d4' },
    forest: { light: '#059669', dark: '#10b981' },
    sunset: { light: '#ea580c', dark: '#f97316' },
    lavender: { light: '#7c3aed', dark: '#8b5cf6' },
    rose: { light: '#e11d48', dark: '#f43f5e' },
    slate: { light: '#475569', dark: '#64748b' },
    amber: { light: '#d97706', dark: '#f59e0b' },
  };

  const primary = isDark ? colorMap[preset].dark : colorMap[preset].light;

  return {
    primary,
    background: isDark ? '#0f172a' : '#ffffff',
    foreground: isDark ? '#f8fafc' : '#0f172a',
    muted: isDark ? '#1e293b' : '#f1f5f9',
    secondary: isDark ? '#1e293b' : '#f1f5f9',
  };
}

/**
 * Preview colors type
 */
export interface PreviewColors {
  primary: string;
  background: string;
  foreground: string;
  muted: string;
  secondary: string;
}
