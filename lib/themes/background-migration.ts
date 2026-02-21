import {
  normalizeBackgroundSettings,
  type BackgroundLayerSettings,
  type BackgroundSettings,
} from './presets';
import { sanitizeBackgroundUrl } from './background-safety';

const GRADIENT_PREFIXES = ['linear-gradient(', 'radial-gradient(', 'conic-gradient('];

export interface BackgroundMigrationOptions {
  downgradeUnresolvedLocalToNone?: boolean;
  allowIncompleteUrlSource?: boolean;
}

export interface BackgroundMigrationResult {
  success: boolean;
  settings: BackgroundSettings;
  warnings: string[];
  error?: string;
}

function isGradientBackground(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return GRADIENT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function emptyLayerSource(layer: BackgroundLayerSettings): BackgroundLayerSettings {
  return {
    ...layer,
    source: 'none',
    imageUrl: '',
    localAssetId: null,
    presetId: null,
  };
}

function sanitizeLayer(
  layer: BackgroundLayerSettings,
  context: string,
  options: Required<BackgroundMigrationOptions>
): { layer: BackgroundLayerSettings; warnings: string[]; error?: string } {
  const warnings: string[] = [];

  if (!layer.enabled || layer.source === 'none') {
    return { layer, warnings };
  }

  if (layer.source === 'preset') {
    if (!layer.presetId?.trim()) {
      warnings.push(`${context}: preset source missing presetId, downgraded to none`);
      return { layer: emptyLayerSource(layer), warnings };
    }
    return { layer, warnings };
  }

  if (layer.source === 'url') {
    const trimmed = layer.imageUrl.trim();
    if (!trimmed) {
      if (options.allowIncompleteUrlSource) {
        return { layer, warnings };
      }
      return { layer, warnings, error: `${context}: URL source is missing imageUrl` };
    }

    if (isGradientBackground(trimmed)) {
      return { layer: { ...layer, imageUrl: trimmed }, warnings };
    }

    const sanitized = sanitizeBackgroundUrl(trimmed);
    if (!sanitized.valid || !sanitized.normalized) {
      return {
        layer,
        warnings,
        error: `${context}: ${sanitized.reason ?? 'invalid URL'}`,
      };
    }
    return { layer: { ...layer, imageUrl: sanitized.normalized }, warnings };
  }

  if (layer.source === 'local') {
    const localAssetId = layer.localAssetId?.trim() ?? '';
    const imageUrl = layer.imageUrl.trim();

    if (!localAssetId && options.downgradeUnresolvedLocalToNone) {
      warnings.push(`${context}: unresolved local asset downgraded to none`);
      return { layer: emptyLayerSource(layer), warnings };
    }

    if (!imageUrl) {
      return { layer, warnings };
    }

    if (isGradientBackground(imageUrl)) {
      return { layer: { ...layer, imageUrl }, warnings };
    }

    const sanitized = sanitizeBackgroundUrl(imageUrl);
    if (!sanitized.valid || !sanitized.normalized) {
      return {
        layer,
        warnings,
        error: `${context}: ${sanitized.reason ?? 'invalid URL'}`,
      };
    }
    return { layer: { ...layer, imageUrl: sanitized.normalized }, warnings };
  }

  return { layer, warnings };
}

export function migrateAndSanitizeBackgroundSettings(
  input: Partial<BackgroundSettings> | null | undefined,
  options: BackgroundMigrationOptions = {}
): BackgroundMigrationResult {
  const resolvedOptions: Required<BackgroundMigrationOptions> = {
    downgradeUnresolvedLocalToNone: options.downgradeUnresolvedLocalToNone ?? false,
    allowIncompleteUrlSource: options.allowIncompleteUrlSource ?? false,
  };

  const normalized = normalizeBackgroundSettings(input);
  const warnings: string[] = [];

  const singleLayer = sanitizeLayer(
    {
      id: 'single-layer',
      enabled: normalized.enabled,
      source: normalized.source,
      imageUrl: normalized.imageUrl,
      localAssetId: normalized.localAssetId,
      presetId: normalized.presetId,
      fit: normalized.fit,
      position: normalized.position,
      opacity: normalized.opacity,
      blur: normalized.blur,
      overlayColor: normalized.overlayColor,
      overlayOpacity: normalized.overlayOpacity,
      brightness: normalized.brightness,
      saturation: normalized.saturation,
      attachment: normalized.attachment,
      animation: normalized.animation,
      animationSpeed: normalized.animationSpeed,
      contrast: normalized.contrast,
      grayscale: normalized.grayscale,
    },
    'Single background',
    resolvedOptions
  );

  if (singleLayer.error) {
    return {
      success: false,
      settings: normalized,
      warnings,
      error: singleLayer.error,
    };
  }
  warnings.push(...singleLayer.warnings);

  const sanitizedLayers: BackgroundLayerSettings[] = [];
  for (let index = 0; index < normalized.layers.length; index += 1) {
    const result = sanitizeLayer(
      normalized.layers[index],
      `Layer ${index + 1}`,
      resolvedOptions
    );
    if (result.error) {
      return {
        success: false,
        settings: normalized,
        warnings: [...warnings, ...result.warnings],
        error: result.error,
      };
    }
    warnings.push(...result.warnings);
    sanitizedLayers.push(result.layer);
  }

  const sanitizedSlides: BackgroundLayerSettings[] = [];
  for (let index = 0; index < normalized.slideshow.slides.length; index += 1) {
    const result = sanitizeLayer(
      normalized.slideshow.slides[index],
      `Slideshow slide ${index + 1}`,
      resolvedOptions
    );
    if (result.error) {
      return {
        success: false,
        settings: normalized,
        warnings: [...warnings, ...result.warnings],
        error: result.error,
      };
    }
    warnings.push(...result.warnings);
    sanitizedSlides.push(result.layer);
  }

  const sanitized = normalizeBackgroundSettings({
    ...normalized,
    enabled: singleLayer.layer.enabled,
    source: singleLayer.layer.source,
    imageUrl: singleLayer.layer.imageUrl,
    localAssetId: singleLayer.layer.localAssetId,
    presetId: singleLayer.layer.presetId,
    layers: sanitizedLayers,
    slideshow: {
      ...normalized.slideshow,
      slides: sanitizedSlides,
    },
  });

  return {
    success: true,
    settings: sanitized,
    warnings,
  };
}
