/**
 * Theme and Background Validation Utilities
 * Used for importing/exporting theme and background configurations
 */

import { isValidHex } from './color-utils';
import { BACKGROUND_LIMITS } from './appearance-constants';
import { sanitizeBackgroundUrl } from './background-safety';

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isWithinRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max;
}

function validateBackgroundLayer(
  layer: unknown,
  context: string
): ValidationResult {
  if (!isObject(layer)) {
    return { valid: false, error: `${context} is not a valid object` };
  }

  if (typeof layer.source !== 'undefined' && !['none', 'url', 'local', 'preset'].includes(String(layer.source))) {
    return { valid: false, error: `${context} has invalid source` };
  }

  if (typeof layer.opacity !== 'undefined' && !isWithinRange(layer.opacity, BACKGROUND_LIMITS.opacity.min, BACKGROUND_LIMITS.opacity.max)) {
    return { valid: false, error: `${context} opacity out of range` };
  }
  if (typeof layer.blur !== 'undefined' && !isWithinRange(layer.blur, BACKGROUND_LIMITS.blur.min, BACKGROUND_LIMITS.blur.max)) {
    return { valid: false, error: `${context} blur out of range` };
  }
  if (typeof layer.overlayOpacity !== 'undefined' && !isWithinRange(layer.overlayOpacity, BACKGROUND_LIMITS.overlayOpacity.min, BACKGROUND_LIMITS.overlayOpacity.max)) {
    return { valid: false, error: `${context} overlay opacity out of range` };
  }
  if (typeof layer.brightness !== 'undefined' && !isWithinRange(layer.brightness, BACKGROUND_LIMITS.brightness.min, BACKGROUND_LIMITS.brightness.max)) {
    return { valid: false, error: `${context} brightness out of range` };
  }
  if (typeof layer.saturation !== 'undefined' && !isWithinRange(layer.saturation, BACKGROUND_LIMITS.saturation.min, BACKGROUND_LIMITS.saturation.max)) {
    return { valid: false, error: `${context} saturation out of range` };
  }
  if (typeof layer.contrast !== 'undefined' && !isWithinRange(layer.contrast, BACKGROUND_LIMITS.contrast.min, BACKGROUND_LIMITS.contrast.max)) {
    return { valid: false, error: `${context} contrast out of range` };
  }
  if (typeof layer.grayscale !== 'undefined' && !isWithinRange(layer.grayscale, BACKGROUND_LIMITS.grayscale.min, BACKGROUND_LIMITS.grayscale.max)) {
    return { valid: false, error: `${context} grayscale out of range` };
  }
  if (typeof layer.animationSpeed !== 'undefined' && !isWithinRange(layer.animationSpeed, BACKGROUND_LIMITS.animationSpeed.min, BACKGROUND_LIMITS.animationSpeed.max)) {
    return { valid: false, error: `${context} animation speed out of range` };
  }

  if (layer.source === 'url' || layer.source === 'local') {
    if (typeof layer.imageUrl !== 'string' || !layer.imageUrl.trim()) {
      return { valid: false, error: `${context} image URL is missing` };
    }
    const sanitized = sanitizeBackgroundUrl(layer.imageUrl);
    if (!sanitized.valid) {
      return { valid: false, error: `${context} URL is not allowed: ${sanitized.reason}` };
    }
  }

  return { valid: true };
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
  if (!isObject(data)) {
    return { valid: false, error: 'Invalid data format' };
  }

  const bgData = data;

  if (bgData.version !== '1.0') {
    return { valid: false, error: 'Unsupported version format' };
  }

  if (!isObject(bgData.settings)) {
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

  if (typeof settings.opacity !== 'undefined' && !isWithinRange(settings.opacity, BACKGROUND_LIMITS.opacity.min, BACKGROUND_LIMITS.opacity.max)) {
    return { valid: false, error: 'Opacity out of range' };
  }
  if (typeof settings.blur !== 'undefined' && !isWithinRange(settings.blur, BACKGROUND_LIMITS.blur.min, BACKGROUND_LIMITS.blur.max)) {
    return { valid: false, error: 'Blur out of range' };
  }
  if (typeof settings.overlayOpacity !== 'undefined' && !isWithinRange(settings.overlayOpacity, BACKGROUND_LIMITS.overlayOpacity.min, BACKGROUND_LIMITS.overlayOpacity.max)) {
    return { valid: false, error: 'Overlay opacity out of range' };
  }
  if (typeof settings.brightness !== 'undefined' && !isWithinRange(settings.brightness, BACKGROUND_LIMITS.brightness.min, BACKGROUND_LIMITS.brightness.max)) {
    return { valid: false, error: 'Brightness out of range' };
  }
  if (typeof settings.saturation !== 'undefined' && !isWithinRange(settings.saturation, BACKGROUND_LIMITS.saturation.min, BACKGROUND_LIMITS.saturation.max)) {
    return { valid: false, error: 'Saturation out of range' };
  }
  if (typeof settings.contrast !== 'undefined' && !isWithinRange(settings.contrast, BACKGROUND_LIMITS.contrast.min, BACKGROUND_LIMITS.contrast.max)) {
    return { valid: false, error: 'Contrast out of range' };
  }
  if (typeof settings.grayscale !== 'undefined' && !isWithinRange(settings.grayscale, BACKGROUND_LIMITS.grayscale.min, BACKGROUND_LIMITS.grayscale.max)) {
    return { valid: false, error: 'Grayscale out of range' };
  }
  if (typeof settings.animationSpeed !== 'undefined' && !isWithinRange(settings.animationSpeed, BACKGROUND_LIMITS.animationSpeed.min, BACKGROUND_LIMITS.animationSpeed.max)) {
    return { valid: false, error: 'Animation speed out of range' };
  }

  if (settings.source === 'url' || settings.source === 'local') {
    if (typeof settings.imageUrl !== 'string' || !settings.imageUrl.trim()) {
      return { valid: false, error: 'Missing image URL for selected source' };
    }
    const sanitized = sanitizeBackgroundUrl(settings.imageUrl);
    if (!sanitized.valid) {
      return { valid: false, error: sanitized.reason ?? 'Invalid background URL' };
    }
  }

  if (typeof settings.layers !== 'undefined') {
    if (!Array.isArray(settings.layers)) {
      return { valid: false, error: 'Invalid layers format' };
    }

    for (let index = 0; index < settings.layers.length; index += 1) {
      const result = validateBackgroundLayer(settings.layers[index], `Layer ${index + 1}`);
      if (!result.valid) return result;
    }
  }

  if (typeof settings.slideshow !== 'undefined') {
    if (!isObject(settings.slideshow)) {
      return { valid: false, error: 'Invalid slideshow format' };
    }
    const slideshow = settings.slideshow as Record<string, unknown>;
    if (typeof slideshow.slides !== 'undefined' && !Array.isArray(slideshow.slides)) {
      return { valid: false, error: 'Invalid slideshow slides format' };
    }
    if (typeof slideshow.intervalMs !== 'undefined' && !isWithinRange(slideshow.intervalMs, BACKGROUND_LIMITS.slideshowInterval.min * 1000, BACKGROUND_LIMITS.slideshowInterval.max * 1000)) {
      return { valid: false, error: 'Invalid slideshow interval' };
    }
    if (typeof slideshow.transitionMs !== 'undefined' && !isWithinRange(slideshow.transitionMs, BACKGROUND_LIMITS.slideshowTransition.min, BACKGROUND_LIMITS.slideshowTransition.max)) {
      return { valid: false, error: 'Invalid slideshow transition' };
    }
    if (typeof slideshow.shuffle !== 'undefined' && typeof slideshow.shuffle !== 'boolean') {
      return { valid: false, error: 'Invalid slideshow shuffle' };
    }
    if (Array.isArray(slideshow.slides)) {
      for (let index = 0; index < slideshow.slides.length; index += 1) {
        const result = validateBackgroundLayer(slideshow.slides[index], `Slideshow slide ${index + 1}`);
        if (!result.valid) return result;
      }
    }
  }

  return { valid: true };
}
