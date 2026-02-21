'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettingsStore } from '@/stores';
import { BACKGROUND_PRESETS, getRenderableLayers } from '@/lib/themes';
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
    if (
      layer.imageUrl.startsWith('linear-gradient') ||
      layer.imageUrl.startsWith('radial-gradient')
    ) {
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

interface RenderLayerEntry {
  key: string;
  layer: BackgroundLayerSettings;
  opacityMultiplier: number;
  transitionMs: number;
}

export function BackgroundRenderer() {
  const backgroundSettings = useSettingsStore((s) => s.backgroundSettings);

  const isTauriEnv = useMemo(() => isTauri(), []);

  const [localUrlMap, setLocalUrlMap] = useState<Record<string, string>>({});
  const localUrlMapRef = useRef<Record<string, string>>({});
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    localUrlMapRef.current = localUrlMap;
  }, [localUrlMap]);

  const rendererMode = backgroundSettings.mode;
  const renderableLayers = useMemo(
    () => getRenderableLayers(backgroundSettings),
    [backgroundSettings]
  );

  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [previousSlideshowIndex, setPreviousSlideshowIndex] = useState<number | null>(null);
  const [slideshowTransitionReady, setSlideshowTransitionReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      setReduceMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
      }
    };
  }, []);

  // Slideshow timer with Visibility API optimization
  // Pauses when page is hidden to save CPU resources
  useEffect(() => {
    if (rendererMode !== 'slideshow') return;
    const slides = renderableLayers;
    if (!slides || slides.length <= 1) return;

    const intervalMs = Math.max(1000, backgroundSettings.slideshow.intervalMs);
    const transitionMs = reduceMotion
      ? 0
      : Math.max(0, Math.min(backgroundSettings.slideshow.transitionMs, intervalMs - 100));
    let timer: number | null = null;

    const advanceSlide = () => {
      setSlideshowIndex((prev) => {
        let nextIndex = prev;
        if (backgroundSettings.slideshow.shuffle) {
          if (slides.length <= 1) return prev;
          let attempts = 0;
          while (nextIndex === prev && attempts < 10) {
            nextIndex = Math.floor(Math.random() * slides.length);
            attempts += 1;
          }
          if (nextIndex === prev) {
            nextIndex = (prev + 1) % slides.length;
          }
        } else {
          nextIndex = (prev + 1) % slides.length;
        }

        if (nextIndex === prev) return prev;

        if (transitionMs <= 0) {
          if (transitionTimeoutRef.current !== null) {
            window.clearTimeout(transitionTimeoutRef.current);
            transitionTimeoutRef.current = null;
          }
          if (transitionFrameRef.current !== null) {
            window.cancelAnimationFrame(transitionFrameRef.current);
            transitionFrameRef.current = null;
          }
          setPreviousSlideshowIndex(null);
          setSlideshowTransitionReady(false);
          return nextIndex;
        }

        setPreviousSlideshowIndex(prev);
        setSlideshowTransitionReady(false);

        if (transitionFrameRef.current !== null) {
          window.cancelAnimationFrame(transitionFrameRef.current);
        }
        transitionFrameRef.current = window.requestAnimationFrame(() => {
          setSlideshowTransitionReady(true);
          transitionFrameRef.current = null;
        });

        if (transitionTimeoutRef.current !== null) {
          window.clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = window.setTimeout(() => {
          setPreviousSlideshowIndex(null);
          setSlideshowTransitionReady(false);
          transitionTimeoutRef.current = null;
        }, transitionMs);

        return nextIndex;
      });
    };

    const startTimer = () => {
      if (timer !== null) return;
      timer = window.setInterval(advanceSlide, intervalMs);
    };

    const stopTimer = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    // Start timer only if page is visible
    if (!document.hidden) {
      startTimer();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTimer();
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
        transitionFrameRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    backgroundSettings.slideshow.intervalMs,
    backgroundSettings.slideshow.transitionMs,
    backgroundSettings.slideshow.shuffle,
    renderableLayers,
    reduceMotion,
    rendererMode,
  ]);

  const layersToRender = useMemo<RenderLayerEntry[]>(() => {
    if (renderableLayers.length === 0) return [];

    if (rendererMode === 'slideshow') {
      const slides = renderableLayers;
      if (!slides || slides.length === 0) return [];
      const clampedCurrentIndex = Math.min(slideshowIndex, slides.length - 1);
      const current = slides[clampedCurrentIndex];
      if (!current) return [];

      const transitionMs = reduceMotion
        ? 0
        : Math.max(0, Math.min(backgroundSettings.slideshow.transitionMs, backgroundSettings.slideshow.intervalMs - 100));
      const entries: RenderLayerEntry[] = [];

      if (previousSlideshowIndex !== null) {
        const clampedPreviousIndex = Math.min(previousSlideshowIndex, slides.length - 1);
        const previous = slides[clampedPreviousIndex];
        if (previous) {
          entries.push({
            key: `slide-prev-${clampedPreviousIndex}-${slideshowIndex}`,
            layer: previous,
            opacityMultiplier: slideshowTransitionReady ? 0 : 1,
            transitionMs,
          });
        }
      }

      entries.push({
        key: `slide-current-${clampedCurrentIndex}`,
        layer: current,
        opacityMultiplier: previousSlideshowIndex !== null ? (slideshowTransitionReady ? 1 : 0) : 1,
        transitionMs,
      });

      return entries;
    }

    if (rendererMode === 'layers') {
      return renderableLayers.map((layer) => ({
        key: layer.id,
        layer,
        opacityMultiplier: 1,
        transitionMs: 0,
      }));
    }

    return [];
  }, [
    backgroundSettings.slideshow.intervalMs,
    backgroundSettings.slideshow.transitionMs,
    previousSlideshowIndex,
    renderableLayers,
    reduceMotion,
    rendererMode,
    slideshowTransitionReady,
    slideshowIndex,
  ]);

  // Preload next slideshow image to prevent white flash during transitions
  useEffect(() => {
    if (rendererMode !== 'slideshow') return;
    const slides = renderableLayers;
    if (!slides || slides.length <= 1) return;

    const nextIndex = (slideshowIndex + 1) % slides.length;
    const nextSlide = slides[nextIndex];

    if (!nextSlide) return;

    // Preload URL-based images
    if (nextSlide.source === 'url' && nextSlide.imageUrl) {
      // Skip gradient strings
      if (
        nextSlide.imageUrl.startsWith('linear-gradient') ||
        nextSlide.imageUrl.startsWith('radial-gradient')
      ) {
        return;
      }

      // Create a prefetch link
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = nextSlide.imageUrl;
      document.head.appendChild(link);

      return () => {
        try {
          if (link.parentNode) {
            document.head.removeChild(link);
          }
        } catch {
          // Link already removed, ignore
        }
      };
    }

    // Preload preset images
    if (nextSlide.source === 'preset' && nextSlide.presetId) {
      const preset = BACKGROUND_PRESETS.find((p) => p.id === nextSlide.presetId);
      if (
        preset &&
        !preset.url.startsWith('linear-gradient') &&
        !preset.url.startsWith('radial-gradient')
      ) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = preset.url;
        document.head.appendChild(link);

        return () => {
          try {
            if (link.parentNode) {
              document.head.removeChild(link);
            }
          } catch {
            // Link already removed, ignore
          }
        };
      }
    }
  }, [
    renderableLayers,
    rendererMode,
    slideshowIndex,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isTauriEnv) return;

    const controller = new AbortController();

    const requiredAssetIds = new Set<string>();
    layersToRender.forEach(({ layer }) => {
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

        // Revoke URLs no longer needed
        for (const [assetId, objectUrl] of Object.entries(prev)) {
          if (!requiredAssetIds.has(assetId)) {
            URL.revokeObjectURL(objectUrl);
          }
        }

        // Avoid state update if nothing changed (prevents infinite loop)
        const prevKeys = Object.keys(prev).sort();
        const nextKeys = Object.keys(nextMap).sort();
        if (
          prevKeys.length === nextKeys.length &&
          prevKeys.every((k, i) => k === nextKeys[i] && prev[k] === nextMap[k])
        ) {
          return prev;
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

  const containerEnabled =
    (rendererMode === 'layers' || rendererMode === 'slideshow') && renderableLayers.length > 0;

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

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -2, pointerEvents: 'none' }}>
      {layersToRender.map((entry) => {
        const { layer } = entry;
        const effectiveLayer: BackgroundLayerSettings =
          !isTauriEnv &&
          layer.source === 'local' &&
          layer.localAssetId &&
          localUrlMap[layer.localAssetId]
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
        const animationName =
          layer.animation === 'kenburns'
            ? 'bg-kenburns'
            : layer.animation === 'gradient-shift'
              ? 'bg-gradient-shift'
              : 'none';

        const animation =
          reduceMotion || animationName === 'none'
            ? undefined
            : `${animationName} ${durationSec}s ease-in-out infinite`;

        const transform =
          reduceMotion ? undefined : layer.animation === 'parallax' ? 'translateZ(-1px) scale(1.5)' : undefined;

        const isGradient =
          backgroundValue.startsWith('linear-gradient') ||
          backgroundValue.startsWith('radial-gradient');

        const backgroundSize = isGradient ? undefined : (sizeMap[layer.fit] ?? 'cover');
        const backgroundRepeat = layer.fit === 'tile' ? 'repeat' : 'no-repeat';
        const backgroundPosition = positionMap[layer.position] ?? 'center center';

        return (
          <div key={entry.key} style={{ position: 'absolute', inset: 0 }}>
            <div
              data-bg-render-layer="true"
              style={{
                position: 'absolute',
                inset: 0,
                // Use backgroundImage instead of background shorthand to avoid React warning
                // when combining with backgroundSize, backgroundPosition, backgroundRepeat
                backgroundImage: backgroundValue,
                backgroundSize,
                backgroundPosition,
                backgroundRepeat,
                backgroundAttachment: attachmentMap[layer.attachment] ?? 'fixed',
                opacity: Math.min(1, Math.max(0, layer.opacity / 100)) * entry.opacityMultiplier,
                filter: `blur(${layer.blur}px) brightness(${layer.brightness}%) saturate(${layer.saturation}%) contrast(${layer.contrast}%) grayscale(${layer.grayscale}%)`,
                transition:
                  entry.transitionMs > 0 && !reduceMotion
                    ? `opacity ${entry.transitionMs}ms ease-in-out`
                    : undefined,
                animation,
                transform,
                willChange:
                  !reduceMotion && layer.animation !== 'none'
                    ? 'transform, opacity'
                    : entry.transitionMs > 0
                      ? 'opacity'
                      : undefined,
              }}
            />
            {layer.overlayOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: layer.overlayColor,
                  opacity:
                    Math.min(1, Math.max(0, layer.overlayOpacity / 100)) * entry.opacityMultiplier,
                  transition:
                    entry.transitionMs > 0 && !reduceMotion
                      ? `opacity ${entry.transitionMs}ms ease-in-out`
                      : undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
