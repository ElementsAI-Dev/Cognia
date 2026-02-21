'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { BackgroundRenderer } from '@/components/layout';
import {
  applyBackgroundSettings,
  applyResolvedThemeToDocument,
  applyUICustomization,
  isBackgroundRenderable,
  removeBackgroundSettings,
  resolveActiveThemeColors,
} from '@/lib/themes';
import { isTauri as detectTauri } from '@/lib/native/utils';
import { useSettingsStore } from '@/stores';

interface StandaloneThemeSyncProviderProps {
  children: React.ReactNode;
  allowBackgroundImage?: boolean;
  forceTransparent?: boolean;
}

export function StandaloneThemeSyncProvider({
  children,
  allowBackgroundImage = true,
  forceTransparent = false,
}: StandaloneThemeSyncProviderProps) {
  const theme = useSettingsStore((state) => state.theme);
  const colorTheme = useSettingsStore((state) => state.colorTheme);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const activeCustomThemeId = useSettingsStore((state) => state.activeCustomThemeId);
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const uiCustomization = useSettingsStore((state) => state.uiCustomization);

  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [resolvedLocalBgUrl, setResolvedLocalBgUrl] = useState<string | null>(null);
  const isTauriEnv = useMemo(() => detectTauri(), []);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    const nextResolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    setResolvedTheme(nextResolved);
    root.classList.add(nextResolved);
  }, [mounted, theme]);

  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (useSettingsStore.getState().theme !== 'system') {
        return;
      }

      const root = document.documentElement;
      const nextResolved = event.matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(nextResolved);
      setResolvedTheme(nextResolved);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const resolved = resolveActiveThemeColors({
      colorTheme,
      resolvedTheme,
      activeCustomThemeId,
      customThemes,
    });
    applyResolvedThemeToDocument(resolved, document.documentElement);
  }, [activeCustomThemeId, colorTheme, customThemes, mounted, resolvedTheme]);

  useEffect(() => {
    if (!mounted) return;
    applyUICustomization(uiCustomization);
  }, [mounted, uiCustomization]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined' || isTauriEnv) {
      setResolvedLocalBgUrl(null);
      return;
    }

    if (backgroundSettings.mode !== 'single') {
      setResolvedLocalBgUrl(null);
      return;
    }

    if (backgroundSettings.source !== 'local' || !backgroundSettings.localAssetId) {
      setResolvedLocalBgUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const resolve = async () => {
      const { getBackgroundImageAssetBlob } = await import('@/lib/themes/background-assets');
      const blob = await getBackgroundImageAssetBlob(backgroundSettings.localAssetId!);
      if (!blob || cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setResolvedLocalBgUrl(objectUrl);
    };

    void resolve();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [
    backgroundSettings.localAssetId,
    backgroundSettings.mode,
    backgroundSettings.source,
    isTauriEnv,
    mounted,
  ]);

  const backgroundAllowed = allowBackgroundImage && !forceTransparent;
  const rendererEnabled =
    backgroundAllowed &&
    backgroundSettings.mode !== 'single' &&
    isBackgroundRenderable(backgroundSettings);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    if (!backgroundAllowed) {
      removeBackgroundSettings();
      root.classList.remove('has-bg-image');
      root.classList.remove('has-bg-renderer');
      return;
    }

    if (backgroundSettings.mode !== 'single') {
      removeBackgroundSettings();
      if (isBackgroundRenderable(backgroundSettings)) {
        root.classList.add('has-bg-image');
        root.classList.add('has-bg-renderer');
      } else {
        root.classList.remove('has-bg-image');
        root.classList.remove('has-bg-renderer');
      }
      return;
    }

    root.classList.remove('has-bg-renderer');
    const effectiveSettings =
      backgroundSettings.source === 'local'
        ? resolvedLocalBgUrl
          ? { ...backgroundSettings, imageUrl: resolvedLocalBgUrl }
          : { ...backgroundSettings, imageUrl: '', localAssetId: null }
        : backgroundSettings;

    if (!isBackgroundRenderable(effectiveSettings)) {
      removeBackgroundSettings();
      root.classList.remove('has-bg-image');
      return;
    }

    applyBackgroundSettings(effectiveSettings);
  }, [backgroundAllowed, backgroundSettings, mounted, resolvedLocalBgUrl]);

  return (
    <>
      {rendererEnabled && <BackgroundRenderer />}
      {children}
    </>
  );
}

export default StandaloneThemeSyncProvider;

