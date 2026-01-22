'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettingsStore } from '@/stores';
import { BACKGROUND_PRESETS } from '@/lib/themes';
import type { BackgroundLayerSettings } from '@/lib/themes';
import { isTauri } from '@/lib/native/utils';

function resolveBackgroundValue(layer: BackgroundLayerSettings): string {
  if (!layer.enabled || layer.source === 'none') return '';

  if (layer.source === 'preset' && layer.presetId) {
    const preset = BACKGROUND_PRESETS.find((p) => p.id === layer.presetId);
    return preset?.url ?? '';
  }

  if (layer.source === 'url' || layer.source === 'local') {
    if (!layer.imageUrl) return '';
    if (layer.imageUrl.startsWith('linear-gradient') || layer.imageUrl.startsWith('radial-gradient')) {
      return layer.imageUrl;
    }
    return `url("${layer.imageUrl}")`;
  }

  return '';
}

async function resolveLocalAssetUrl(assetId: string, signal: AbortSignal): Promise<string | null> {
  const { getBackgroundImageAssetBlob } = await import('@/lib/themes/background-assets');
  const blob = await getBackgroundImageAssetBlob(assetId);
  if (signal.aborted) return null;
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export function BackgroundRenderer() {
  const backgroundSettings = useSettingsStore((s) => s.backgroundSettings);

  const isTauriEnv = useMemo(() => isTauri(), []);

  const [localUrlMap, setLocalUrlMap] = useState<Record<string, string>>({});
  const localUrlMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    localUrlMapRef.current = localUrlMap;
  }, [localUrlMap]);

  const rendererMode = backgroundSettings.mode;

  const [slideshowIndex, setSlideshowIndex] = useState(0);

  useEffect(() => {
    if (rendererMode !== 'slideshow') return;
    if (!backgroundSettings.enabled) return;

    const slides = backgroundSettings.slideshow.slides;
    if (!slides || slides.length <= 1) return;

    const intervalMs = Math.max(1000, backgroundSettings.slideshow.intervalMs);

    const timer = window.setInterval(() => {
      setSlideshowIndex((prev) => {
        if (backgroundSettings.slideshow.shuffle) {
          return Math.floor(Math.random() * slides.length);
        }
        return (prev + 1) % slides.length;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [backgroundSettings.enabled, backgroundSettings.slideshow.intervalMs, backgroundSettings.slideshow.shuffle, backgroundSettings.slideshow.slides, rendererMode]);

  const layersToRender = useMemo(() => {
    if (!backgroundSettings.enabled) return [];

    if (rendererMode === 'slideshow') {
      const slides = backgroundSettings.slideshow.slides;
      if (!slides || slides.length === 0) return [];
      const current = slides[Math.min(slideshowIndex, slides.length - 1)];
      return current ? [current] : [];
    }

    if (rendererMode === 'layers') {
      return backgroundSettings.layers;
    }

    return [];
  }, [backgroundSettings.enabled, backgroundSettings.layers, backgroundSettings.slideshow.slides, rendererMode, slideshowIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isTauriEnv) return;

    const controller = new AbortController();

    const requiredAssetIds = new Set<string>();
    layersToRender.forEach((layer) => {
      if (layer.source === 'local' && layer.localAssetId) {
        requiredAssetIds.add(layer.localAssetId);
      }
    });

    const ensureUrls = async () => {
      const existing = localUrlMapRef.current;
      const additions: Record<string, string> = {};
      for (const assetId of requiredAssetIds) {
        if (existing[assetId]) continue;
        const url = await resolveLocalAssetUrl(assetId, controller.signal);
        if (!url) continue;
        additions[assetId] = url;
      }

      if (controller.signal.aborted) return;

      setLocalUrlMap((prev) => {
        const nextMap: Record<string, string> = {};

        for (const assetId of requiredAssetIds) {
          const existingUrl = prev[assetId] ?? additions[assetId];
          if (existingUrl) nextMap[assetId] = existingUrl;
        }

        for (const [assetId, objectUrl] of Object.entries(prev)) {
          if (!requiredAssetIds.has(assetId)) {
            URL.revokeObjectURL(objectUrl);
          }
        }

        return nextMap;
      });
    };

    void ensureUrls();

    return () => {
      controller.abort();
    };
  }, [isTauriEnv, layersToRender]);

  useEffect(() => {
    return () => {
      for (const objectUrl of Object.values(localUrlMapRef.current)) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

  const containerEnabled = backgroundSettings.enabled && (rendererMode === 'layers' || rendererMode === 'slideshow');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;

    if (containerEnabled) {
      root.classList.add('has-bg-image');
      root.classList.add('has-bg-renderer');
    } else {
      root.classList.remove('has-bg-image');
      root.classList.remove('has-bg-renderer');
    }
  }, [containerEnabled]);

  if (!containerEnabled) return null;

  const transitionMs = rendererMode === 'slideshow' ? Math.max(0, backgroundSettings.slideshow.transitionMs) : 0;

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none' }}
    >
      {layersToRender.map((layer) => {
        const effectiveLayer: BackgroundLayerSettings =
          !isTauriEnv && layer.source === 'local' && layer.localAssetId && localUrlMap[layer.localAssetId]
            ? { ...layer, imageUrl: localUrlMap[layer.localAssetId] }
            : layer;

        const backgroundValue = resolveBackgroundValue(effectiveLayer);
        if (!backgroundValue) return null;

        const sizeMap: Record<string, string> = {
          cover: 'cover',
          contain: 'contain',
          fill: '100% 100%',
          tile: 'auto',
        };

        const positionMap: Record<string, string> = {
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

        const attachmentMap: Record<string, string> = {
          fixed: 'fixed',
          scroll: 'scroll',
          local: 'local',
        };

        const durationSec = (11 - Math.min(10, Math.max(1, layer.animationSpeed))) * 5;
        const animationName = layer.animation === 'kenburns'
          ? 'bg-kenburns'
          : layer.animation === 'gradient-shift'
            ? 'bg-gradient-shift'
            : 'none';

        const animation = animationName === 'none'
          ? undefined
          : `${animationName} ${durationSec}s ease-in-out infinite`;

        const transform = layer.animation === 'parallax'
          ? 'translateZ(-1px) scale(1.5)'
          : undefined;

        const isGradient = backgroundValue.startsWith('linear-gradient') || backgroundValue.startsWith('radial-gradient');

        const backgroundSize = isGradient ? undefined : (sizeMap[layer.fit] ?? 'cover');
        const backgroundRepeat = layer.fit === 'tile' ? 'repeat' : 'no-repeat';
        const backgroundPosition = positionMap[layer.position] ?? 'center center';

        return (
          <div key={layer.id} style={{ position: 'absolute', inset: 0 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: backgroundValue,
                backgroundSize,
                backgroundPosition,
                backgroundRepeat,
                backgroundAttachment: attachmentMap[layer.attachment] ?? 'fixed',
                opacity: Math.min(1, Math.max(0, layer.opacity / 100)),
                filter: `blur(${layer.blur}px) brightness(${layer.brightness}%) saturate(${layer.saturation}%) contrast(${layer.contrast}%) grayscale(${layer.grayscale}%)`,
                transition: transitionMs > 0 ? `opacity ${transitionMs}ms ease-in-out` : undefined,
                animation,
                transform,
                willChange: layer.animation !== 'none' ? 'transform, opacity' : undefined,
              }}
            />
            {layer.overlayOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: layer.overlayColor,
                  opacity: Math.min(1, Math.max(0, layer.overlayOpacity / 100)),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
