import type { BackgroundLayerSettings, BackgroundSettings } from './presets';

function hasNonEmptyValue(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isLayerRenderable(layer: BackgroundLayerSettings): boolean {
  if (!layer.enabled) {
    return false;
  }

  if (layer.source === 'none') {
    return false;
  }

  if (layer.source === 'preset') {
    return hasNonEmptyValue(layer.presetId);
  }

  if (layer.source === 'url') {
    return hasNonEmptyValue(layer.imageUrl);
  }

  if (layer.source === 'local') {
    return hasNonEmptyValue(layer.localAssetId) || hasNonEmptyValue(layer.imageUrl);
  }

  return false;
}

function toSingleLayer(settings: BackgroundSettings): BackgroundLayerSettings {
  return {
    id: 'single-layer',
    enabled: settings.enabled,
    source: settings.source,
    imageUrl: settings.imageUrl,
    localAssetId: settings.localAssetId,
    presetId: settings.presetId,
    fit: settings.fit,
    position: settings.position,
    opacity: settings.opacity,
    blur: settings.blur,
    overlayColor: settings.overlayColor,
    overlayOpacity: settings.overlayOpacity,
    brightness: settings.brightness,
    saturation: settings.saturation,
    attachment: settings.attachment,
    animation: settings.animation,
    animationSpeed: settings.animationSpeed,
    contrast: settings.contrast,
    grayscale: settings.grayscale,
  };
}

export function getRenderableLayers(settings: BackgroundSettings): BackgroundLayerSettings[] {
  if (!settings.enabled) {
    return [];
  }

  if (settings.mode === 'single') {
    const layer = toSingleLayer(settings);
    return isLayerRenderable(layer) ? [layer] : [];
  }

  if (settings.mode === 'layers') {
    return settings.layers.filter(isLayerRenderable);
  }

  return settings.slideshow.slides.filter(isLayerRenderable);
}

export function isBackgroundRenderable(settings: BackgroundSettings): boolean {
  return getRenderableLayers(settings).length > 0;
}

