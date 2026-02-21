'use client';

/**
 * App Providers - wraps the app with necessary context providers
 *
 * Provider Hierarchy (from outermost to innermost):
 * 1. ErrorBoundaryProvider - Catches React errors
 * 2. LoggerProvider - Centralized logging
 * 3. CacheProvider - Performance optimization
 * 4. AudioProvider - Voice/audio features
 * 5. ProviderProvider - Unified AI provider state
 * 6. I18nProvider - Internationalization
 * 7. ThemeProvider - Theme management
 * 8. TooltipProvider - UI tooltips
 * 9. SkillProvider - Built-in skills
 * 10. NativeProvider - Desktop functionality
 * 11. OnboardingProvider - Setup wizard
 */

import { useEffect, useLayoutEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useSettingsStore } from '@/stores';
import { useSelectionStore } from '@/stores/context';
import { I18nProvider } from '@/lib/i18n';
import {
  applyResolvedThemeToDocument,
  resolveActiveThemeColors,
  applyBackgroundSettings,
  applyUICustomization,
  removeBackgroundSettings,
  isBackgroundRenderable,
} from '@/lib/themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommandPalette } from '@/components/layout/overlays/command-palette';
import { Toaster } from '@/components/ui/sonner';
import { toast } from '@/components/ui/sonner';
import { KeyboardShortcutsDialog } from '@/components/layout/overlays/keyboard-shortcuts-dialog';
import { SetupWizard } from '@/components/settings';
import { BackgroundRenderer } from '@/components/layout';
import { TourManager, isOnboardingCompleted } from '@/components/onboarding';
import { initializePluginManager } from '@/lib/plugin';
import { PluginPermissionRequestDialog } from '@/components/plugin/permission-request-dialog';
import {
  ErrorBoundaryProvider,
  LoggerProvider,
  CacheProvider,
  AudioProvider,
  ProviderProvider,
  SkillProvider,
  NativeProvider,
  StoreInitializer,
  SkillSyncInitializer,
  ContextSyncInitializer,
  SpeedPassRuntimeInitializer,
  ExternalAgentInitializer,
} from '@/components/providers';
import { ObservabilityInitializer } from '@/components/observability';
import { LocaleInitializer, AgentTraceInitializer } from '@/components/providers/initializers';
import { SchedulerInitializer } from '@/components/scheduler';
import { useChatWidgetStore } from '@/stores/chat';
import { useScreenshotStore } from '@/stores/media';
import { getWindowLabel, isTauri as detectTauri, WINDOW_LABELS } from '@/lib/native/utils';
import { AppLoadingScreen } from '@/components/ui/app-loading-screen';
import { createLogger } from '@/lib/logger';

interface ProvidersProps {
  children: React.ReactNode;
}

const providersLogger = createLogger('app:providers');

let pluginInitPromise: Promise<void> | null = null;

async function ensurePluginSystemInitialized(): Promise<void> {
  if (pluginInitPromise) return pluginInitPromise;

  pluginInitPromise = (async () => {
    if (typeof window === 'undefined') return;
    if (!detectTauri()) return;

    const label = await getWindowLabel();
    if (label && label !== WINDOW_LABELS.MAIN) return;

    const { invoke } = await import('@tauri-apps/api/core');
    const pluginDirectory = await invoke<string>('plugin_get_directory');

    await initializePluginManager({
      pluginDirectory,
      enablePython: true,
    });
  })().catch((error) => {
    toast.error('Failed to initialize plugins');
    providersLogger.error('Failed to initialize plugins', error, {
      action: 'initializePluginManager',
    });
  });

  return pluginInitPromise;
}

const ChatAssistantContainerLazy = lazy(() =>
  import('@/components/chat-widget/chat-assistant-container').then((m) => ({
    default: m.ChatAssistantContainer,
  }))
);

function ChatAssistantContainerGate() {
  // AI assistant FAB + Panel is a desktop-only feature.
  // Renders only in Tauri main window (not in standalone chat-widget / bubble / toolbar windows).
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!detectTauri()) return;
    getWindowLabel().then((label) => {
      if (!label || label === WINDOW_LABELS.MAIN) {
        setShouldRender(true);
      }
    });
  }, []);

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <ChatAssistantContainerLazy tauriOnly={true} />
    </Suspense>
  );
}

function ChatWidgetNativeSync() {
  const config = useChatWidgetStore((s) => s.config);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!detectTauri()) return;

    const payload = {
      width: config.width,
      height: config.height,
      x: config.x,
      y: config.y,
      rememberPosition: config.rememberPosition,
      startMinimized: config.startMinimized,
      opacity: config.opacity,
      shortcut: config.shortcut,
      pinned: config.pinned,
      backgroundColor: config.backgroundColor,
    };

    (async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('chat_widget_update_config', { config: payload });
    })().catch(() => {
      // best-effort sync; ignore failures (e.g., web mode)
    });
  }, [
    config.width,
    config.height,
    config.x,
    config.y,
    config.rememberPosition,
    config.startMinimized,
    config.opacity,
    config.shortcut,
    config.pinned,
    config.backgroundColor,
  ]);

  return null;
}

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;


/**
 * OnboardingProvider - Shows setup wizard and page-specific tours for users
 */
function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const [showWizard, setShowWizard] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if user needs onboarding
  const needsOnboarding = useMemo(() => {
    if (hasCompletedOnboarding) return false;

    // Check if at least one provider has a valid API key configured
    const hasConfiguredProvider = Object.entries(providerSettings).some(
      ([id, settings]) => settings?.enabled && (settings?.apiKey || id === 'ollama')
    );

    return !hasConfiguredProvider;
  }, [hasCompletedOnboarding, providerSettings]);

  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  // Show wizard after mount if needed
  useEffect(() => {
    if (mounted && needsOnboarding) {
      // Small delay to ensure smooth initial render
      const timer = setTimeout(() => setShowWizard(true), 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, needsOnboarding]);

  // Check if feature tour should be shown (after wizard but tour not completed)
  useEffect(() => {
    if (mounted && !needsOnboarding && !showWizard) {
      const tourCompleted = isOnboardingCompleted('feature-tour');
      if (!tourCompleted) {
        // Small delay to let the UI settle
        const timer = setTimeout(() => setShowTour(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [mounted, needsOnboarding, showWizard]);

  const handleWizardComplete = useCallback(() => {
    setShowWizard(false);
    // Show feature tour after wizard completes
    const timer = setTimeout(() => setShowTour(true), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {children}
      <SetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
      {/* TourManager handles page-specific tours automatically */}
      {showTour && <TourManager autoDetect={true} showDelay={300} />}
    </>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((state) => state.theme);
  const colorTheme = useSettingsStore((state) => state.colorTheme);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const activeCustomThemeId = useSettingsStore((state) => state.activeCustomThemeId);
  const backgroundSettings = useSettingsStore((state) => state.backgroundSettings);
  const uiCustomization = useSettingsStore((state) => state.uiCustomization);
  const themeSchedule = useSettingsStore((state) => state.themeSchedule);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const [mounted, setMounted] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [resolvedLocalBgUrl, setResolvedLocalBgUrl] = useState<string | null>(null);

  // Set mounted state synchronously after hydration
  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  // Handle light/dark mode
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const nextResolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    setResolvedTheme(nextResolved);
    root.classList.add(nextResolved);
  }, [theme, mounted]);

  // Handle color theme (presets and custom)
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const resolved = resolveActiveThemeColors({
      colorTheme,
      resolvedTheme,
      activeCustomThemeId,
      customThemes,
    });
    applyResolvedThemeToDocument(resolved, root);
  }, [
    colorTheme,
    activeCustomThemeId,
    customThemes,
    mounted,
    resolvedTheme,
  ]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const currentTheme = useSettingsStore.getState().theme;
      if (currentTheme === 'system') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        const nextResolved = e.matches ? 'dark' : 'light';
        root.classList.add(nextResolved);
        setResolvedTheme(nextResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  // Apply UI customization globally (not only on settings page)
  useEffect(() => {
    if (!mounted) return;
    applyUICustomization(uiCustomization);
  }, [mounted, uiCustomization]);

  // Apply scheduled theme switching globally
  useEffect(() => {
    if (!mounted) return;
    if (!themeSchedule.enabled) return;

    const parseTimeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const isLightModePeriod = (lightStart: string, darkStart: string): boolean => {
      const now = new Date();
      const current = now.getHours() * 60 + now.getMinutes();
      const lightMinutes = parseTimeToMinutes(lightStart);
      const darkMinutes = parseTimeToMinutes(darkStart);

      if (lightMinutes < darkMinutes) {
        return current >= lightMinutes && current < darkMinutes;
      }
      return current >= lightMinutes || current < darkMinutes;
    };

    const applyScheduledTheme = () => {
      const currentTheme = useSettingsStore.getState().theme;
      // Skip if theme is 'system' and overrideSystem is not enabled
      if (currentTheme === 'system' && !themeSchedule.overrideSystem) return;

      const shouldBeLight = isLightModePeriod(
        themeSchedule.lightModeStart,
        themeSchedule.darkModeStart
      );
      const target = shouldBeLight ? 'light' : 'dark';
      if (currentTheme !== target) {
        setTheme(target);
      }
    };

    applyScheduledTheme();
    const interval = setInterval(applyScheduledTheme, 60000);
    return () => clearInterval(interval);
  }, [
    mounted,
    themeSchedule.enabled,
    themeSchedule.lightModeStart,
    themeSchedule.darkModeStart,
    themeSchedule.overrideSystem,
    setTheme,
  ]);

  // Resolve web-local background asset to an object URL (do not persist object URL)
  useEffect(() => {
    if (!mounted) return;
    if (typeof window === 'undefined') return;
    if (detectTauri()) {
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

    resolve();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    mounted,
    backgroundSettings.mode,
    backgroundSettings.source,
    backgroundSettings.localAssetId,
  ]);

  // Apply background settings
  useEffect(() => {
    if (!mounted) return;
    const root = typeof window !== 'undefined' ? document.documentElement : null;

    if (backgroundSettings.mode !== 'single') {
      removeBackgroundSettings();
      if (isBackgroundRenderable(backgroundSettings)) {
        root?.classList.add('has-bg-image');
        root?.classList.add('has-bg-renderer');
      } else {
        root?.classList.remove('has-bg-image');
        root?.classList.remove('has-bg-renderer');
      }
      return;
    }

    root?.classList.remove('has-bg-renderer');

    const effectiveSettings =
      backgroundSettings.source === 'local'
        ? resolvedLocalBgUrl
          ? { ...backgroundSettings, imageUrl: resolvedLocalBgUrl }
          : { ...backgroundSettings, imageUrl: '', localAssetId: null }
        : backgroundSettings;

    if (!isBackgroundRenderable(effectiveSettings)) {
      removeBackgroundSettings();
      root?.classList.remove('has-bg-image');
      return;
    }

    applyBackgroundSettings(effectiveSettings);
  }, [backgroundSettings, mounted, resolvedLocalBgUrl]);

  return (
    <>
      <AppLoadingScreen visible={!mounted} />
      {mounted && (
        <>
          <BackgroundRenderer />
          {children}
        </>
      )}
    </>
  );
}

/**
 * SecureStorageInitializer - Detects and initializes secure storage capabilities
 * In Tauri: Checks Stronghold availability for API key encryption
 * In Browser: No-op (Web Crypto fallback is handled at module level)
 */
function SecureStorageInitializer() {
  useEffect(() => {
    if (!detectTauri()) return;

    (async () => {
      try {
        const { isStrongholdReady } = await import('@/lib/native/stronghold');
        if (isStrongholdReady()) {
          // Stronghold already initialized (e.g., from previous session)
          // Trigger hydration of API keys from secure storage
          const { migrateApiKeysToStronghold } = await import(
            '@/lib/native/stronghold-integration'
          );
          const settings = useSettingsStore.getState();
          await migrateApiKeysToStronghold({
            providerSettings: settings.providerSettings,
            customProviders: settings.customProviders,
            searchProviders: settings.searchProviders,
            tavilyApiKey: settings.tavilyApiKey,
          });
        }
      } catch {
        // Stronghold not initialized yet — user needs to unlock from Settings
      }
    })();
  }, []);

  return null;
}

/**
 * StoragePersistenceInitializer - Requests persistent storage from the browser
 * Prevents data eviction under storage pressure
 */
function StoragePersistenceInitializer() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return;

    (async () => {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          await navigator.storage.persist();
        }
      } catch {
        // Best-effort; ignore failures silently
      }
    })();
  }, []);

  return null;
}

function SelectionNativeSync() {
  const selectionConfig = useSelectionStore((s) => s.config);
  const selectionEnabled = useSelectionStore((s) => s.isEnabled);

  useEffect(() => {
    if (typeof window === 'undefined' || !detectTauri()) {
      return;
    }

    const syncSelection = async () => {
      try {
        const [{ updateConfig, startSelectionService, stopSelectionService }, { invoke }] =
          await Promise.all([import('@/lib/native/selection'), import('@tauri-apps/api/core')]);

        await updateConfig({
          enabled: selectionEnabled,
          trigger_mode: selectionConfig.triggerMode,
          min_text_length: selectionConfig.minTextLength,
          max_text_length: selectionConfig.maxTextLength,
          delay_ms: selectionConfig.delayMs,
          target_language: selectionConfig.targetLanguage,
          excluded_apps: selectionConfig.excludedApps,
        });

        await invoke('selection_set_auto_hide_timeout', {
          timeoutMs: selectionConfig.autoHideDelay ?? 0,
        });

        if (selectionEnabled) {
          await startSelectionService();
        } else {
          await stopSelectionService();
        }
      } catch (error) {
        providersLogger.error('Failed to sync selection service', error, {
          action: 'syncSelectionService',
        });
      }
    };

    syncSelection();
  }, [
    selectionEnabled,
    selectionConfig.triggerMode,
    selectionConfig.minTextLength,
    selectionConfig.maxTextLength,
    selectionConfig.delayMs,
    selectionConfig.targetLanguage,
    selectionConfig.excludedApps,
    selectionConfig.autoHideDelay,
  ]);

  return null;
}

function isSelectionCancelledError(error: string): boolean {
  const normalized = error.toLowerCase();
  return (
    normalized.includes('selection cancelled') ||
    normalized.includes('selection canceled') ||
    normalized.includes('cancelled') ||
    normalized.includes('canceled')
  );
}

function ScreenshotNativeSync() {
  useEffect(() => {
    if (typeof window === 'undefined' || !detectTauri()) {
      return;
    }

    let unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      const [{ listen, emit }, screenshotApi] = await Promise.all([
        import('@tauri-apps/api/event'),
        import('@/lib/native/screenshot'),
      ]);

      const ingestCapture = async (payload: unknown) => {
        if (!payload || typeof payload !== 'object') {
          return;
        }
        const maybe = payload as Record<string, unknown>;
        const hasImage = typeof maybe.image_base64 === 'string' || typeof maybe.imageBase64 === 'string';
        if (!hasImage || !maybe.metadata || typeof maybe.metadata !== 'object') {
          return;
        }
        await useScreenshotStore.getState().ingestExternalCapture({
          image_base64: maybe.image_base64 as string | undefined,
          imageBase64: maybe.imageBase64 as string | undefined,
          metadata: maybe.metadata as Record<string, unknown>,
          source: maybe.source as string | undefined,
        });
      };

      const emitScreenshotError = async (action: string, message: string) => {
        try {
          await emit('screenshot-error', { action, message });
        } catch {
          // Ignore bridge-emission failures in web mode or non-main windows.
        }
      };

      const runLegacyRegionCapture = async (action: string, runOcr: boolean) => {
        try {
          const region = await screenshotApi.startRegionSelection();
          const capture = await screenshotApi.captureRegionWithHistory(
            region.x,
            region.y,
            region.width,
            region.height
          );

          await useScreenshotStore.getState().ingestExternalCapture({
            image_base64: capture.image_base64,
            metadata: capture.metadata as unknown as Record<string, unknown>,
            source: `legacy:${action}`,
          });

          if (!runOcr) {
            return;
          }

          let text = '';
          let language: string | undefined;

          try {
            const windowsOcr = await screenshotApi.extractTextWindows(capture.image_base64);
            text = windowsOcr?.text || '';
            language = windowsOcr?.language;
          } catch {
            text = await screenshotApi.extractText(capture.image_base64);
          }

          if (!text.trim()) {
            return;
          }

          try {
            await navigator.clipboard.writeText(text);
          } catch {
            // Clipboard write is best-effort.
          }

          await emit('screenshot-ocr-result', {
            text,
            imageBase64: capture.image_base64,
            language,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error ?? 'Unknown screenshot error');
          if (isSelectionCancelledError(message)) {
            return;
          }
          await emitScreenshotError(action, message);
        }
      };

      unlisteners.push(
        await listen('screenshot-captured', (event) => {
          void ingestCapture(event.payload);
        })
      );

      unlisteners.push(
        await listen('screenshot-error', (event) => {
          const payload = event.payload;
          let action = 'unknown';
          let message = 'Screenshot failed';

          if (typeof payload === 'string') {
            message = payload;
          } else if (payload && typeof payload === 'object') {
            const typed = payload as Record<string, unknown>;
            action = String(typed.action ?? action);
            message = String(typed.message ?? message);
          }

          if (!isSelectionCancelledError(message)) {
            toast.error(`${action}: ${message}`);
          }
        })
      );

      unlisteners.push(
        await listen('screenshot-ocr-result', (event) => {
          const payload = event.payload as { text?: string };
          const text = payload?.text?.trim();
          if (!text) {
            return;
          }
          void emit('selection-send-to-chat', { text });
        })
      );

      // Legacy tray/menu triggers kept for backward compatibility.
      unlisteners.push(
        await listen('start-region-screenshot', () => {
          void runLegacyRegionCapture('start-region-screenshot', false);
        })
      );
      unlisteners.push(
        await listen('start-window-screenshot', () => {
          void useScreenshotStore.getState().captureWindow();
        })
      );
      unlisteners.push(
        await listen('start-ocr-screenshot', () => {
          void runLegacyRegionCapture('start-ocr-screenshot', true);
        })
      );
    };

    void setupListeners();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
      unlisteners = [];
    };
  }, []);

  return null;
}

/**
 * Main Providers component
 *
 * Wraps the application with all necessary context providers in the correct order.
 * Each provider handles a specific concern and provides functionality to the app.
 */
export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    ensurePluginSystemInitialized();
  }, []);

  return (
    <ErrorBoundaryProvider maxRetries={3} showDetails={process.env.NODE_ENV === 'development'}>
      <LoggerProvider
        config={{
          minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
          enableConsole: true,
          enableStorage: true,
          enableRemote: false,
          maxStorageEntries: 1000,
          includeStackTrace: process.env.NODE_ENV === 'development',
        }}
      >
        <CacheProvider
          config={{
            defaultTTL: 5 * 60 * 1000, // 5 minutes
            maxSize: 1000,
            persistToStorage: true,
            storageKey: 'cognia-cache',
            cleanupInterval: 60 * 1000, // 1 minute
          }}
        >
          <AudioProvider>
            <ProviderProvider
              enableHealthChecks={true}
              healthCheckInterval={5 * 60 * 1000} // 5 minutes
            >
              <LocaleInitializer />
              <I18nProvider>
                <ThemeProvider>
                  <TooltipProvider delayDuration={0}>
                    <SkillProvider loadBuiltinSkills={true}>
                      <NativeProvider checkUpdatesOnMount={true}>
                        <StoragePersistenceInitializer />
                        <SecureStorageInitializer />
                        <StoreInitializer />
                        <SkillSyncInitializer />
                        <ContextSyncInitializer />
                        <SpeedPassRuntimeInitializer />
                        <ExternalAgentInitializer />
                        <ObservabilityInitializer />
                        <SchedulerInitializer />
                        <AgentTraceInitializer />
                        <SelectionNativeSync />
                        <ScreenshotNativeSync />
                        <OnboardingProvider>{children}</OnboardingProvider>
                      </NativeProvider>
                    </SkillProvider>
                    <CommandPalette />
                    <Toaster />
                    <PluginPermissionRequestDialog />
                    <KeyboardShortcutsDialog />
                    <ChatWidgetNativeSync />
                    <ChatAssistantContainerGate />
                  </TooltipProvider>
                </ThemeProvider>
              </I18nProvider>
            </ProviderProvider>
          </AudioProvider>
        </CacheProvider>
      </LoggerProvider>
    </ErrorBoundaryProvider>
  );
}

export default Providers;
