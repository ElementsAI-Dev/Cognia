/**
 * Theme and Background Validation Utilities
 * Used for importing/exporting theme and background configurations
 */

import { isValidHex } from './color-utils';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate imported theme data structure
 */
export function validateThemeData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  const themeData = data as Record<string, unknown>;

  if (themeData.version !== '1.0') {
    return { valid: false, error: 'Unsupported version format' };
  }

  if (!Array.isArray(themeData.themes)) {
    return { valid: false, error: 'Missing themes array' };
  }

  for (const theme of themeData.themes) {
    if (!theme || typeof theme !== 'object') {
      return { valid: false, error: 'Invalid theme object' };
    }

    const t = theme as Record<string, unknown>;
    if (typeof t.name !== 'string' || !t.name.trim()) {
      return { valid: false, error: 'Theme missing name' };
    }

    if (typeof t.isDark !== 'boolean') {
      return { valid: false, error: 'Theme missing isDark property' };
    }

    if (!t.colors || typeof t.colors !== 'object') {
      return { valid: false, error: 'Theme missing colors' };
    }

    const colors = t.colors as Record<string, unknown>;
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted'];
    for (const colorKey of requiredColors) {
      if (typeof colors[colorKey] !== 'string' || !isValidHex(colors[colorKey] as string)) {
        return { valid: false, error: `Invalid color: ${colorKey}` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate imported background data structure
 */
export function validateBackgroundData(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  const bgData = data as Record<string, unknown>;

  if (bgData.version !== '1.0') {
    return { valid: false, error: 'Unsupported version format' };
  }

  if (!bgData.settings || typeof bgData.settings !== 'object') {
    return { valid: false, error: 'Missing settings object' };
  }

  const settings = bgData.settings as Record<string, unknown>;

  // Validate required fields
  if (typeof settings.enabled !== 'boolean') {
    return { valid: false, error: 'Missing enabled property' };
  }

  if (!['none', 'url', 'local', 'preset'].includes(settings.source as string)) {
    return { valid: false, error: 'Invalid source type' };
  }

  return { valid: true };
}
