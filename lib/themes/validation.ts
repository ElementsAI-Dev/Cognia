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

  // Multi-mode support (backward compatible)
  if (typeof settings.mode !== 'undefined') {
    if (!['single', 'layers', 'slideshow'].includes(settings.mode as string)) {
      return { valid: false, error: 'Invalid background mode' };
    }
  }

  if (typeof settings.layers !== 'undefined') {
    if (!Array.isArray(settings.layers)) {
      return { valid: false, error: 'Invalid layers format' };
    }
  }

  if (typeof settings.slideshow !== 'undefined') {
    if (!settings.slideshow || typeof settings.slideshow !== 'object') {
      return { valid: false, error: 'Invalid slideshow format' };
    }
    const slideshow = settings.slideshow as Record<string, unknown>;
    if (typeof slideshow.slides !== 'undefined' && !Array.isArray(slideshow.slides)) {
      return { valid: false, error: 'Invalid slideshow slides format' };
    }
    if (typeof slideshow.intervalMs !== 'undefined' && typeof slideshow.intervalMs !== 'number') {
      return { valid: false, error: 'Invalid slideshow interval' };
    }
    if (typeof slideshow.transitionMs !== 'undefined' && typeof slideshow.transitionMs !== 'number') {
      return { valid: false, error: 'Invalid slideshow transition' };
    }
    if (typeof slideshow.shuffle !== 'undefined' && typeof slideshow.shuffle !== 'boolean') {
      return { valid: false, error: 'Invalid slideshow shuffle' };
    }
  }

  return { valid: true };
}
