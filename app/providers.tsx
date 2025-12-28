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

import { useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import { I18nProvider } from '@/lib/i18n';
import { THEME_PRESETS, applyThemeColors, removeCustomThemeColors } from '@/lib/themes';
import type { ColorThemePreset as _ColorThemePreset } from '@/lib/themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommandPalette } from '@/components/layout/command-palette';
import { Toaster } from '@/components/ui/toaster';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts-dialog';
import { SetupWizard } from '@/components/settings/setup-wizard';
import {
  ErrorBoundaryProvider,
  LoggerProvider,
  CacheProvider,
  AudioProvider,
  ProviderProvider,
  SkillProvider,
  NativeProvider,
} from '@/components/providers';

interface ProvidersProps {
  children: React.ReactNode;
}

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * AppLoadingScreen - Shows during initial app hydration
 * Uses inline styles for colors as a fallback when CSS variables are not yet loaded
 */
function AppLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-300"
      style={{
        backgroundColor: 'var(--background, #ffffff)',
        // Fallback for dark mode detection before theme is applied
        ...(typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? { backgroundColor: '#0a0a0a' }
          : {})
      }}
    >
      <div className="flex flex-col items-center gap-6">
        {/* Logo / Brand with animated gradient */}
        <div className="relative">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)'
            }}
          >
            <div
              className="h-8 w-8 rounded-lg animate-pulse"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.8)' }}
            />
          </div>
          {/* Outer ring animation */}
          <div
            className="absolute -inset-2 rounded-3xl animate-[spin_3s_linear_infinite]"
            style={{ border: '2px solid rgba(59, 130, 246, 0.2)' }}
          />
        </div>

        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <span
            className="text-lg font-medium"
            style={{ color: 'var(--foreground, #171717)' }}
          >
            Cognia
          </span>
          <div className="flex items-center gap-1.5">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="h-1.5 w-1.5 rounded-full animate-bounce"
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  animationDelay: `${delay}ms`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * OnboardingProvider - Shows setup wizard for first-time users
 */
function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const [showWizard, setShowWizard] = useState(false);
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

  const handleWizardComplete = useCallback(() => {
    setShowWizard(false);
  }, []);

  if (!mounted) {
    return <AppLoadingScreen />;
  }

  return (
    <>
      {children}
      <SetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
    </>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore((state) => state.theme);
  const colorTheme = useSettingsStore((state) => state.colorTheme);
  const customThemes = useSettingsStore((state) => state.customThemes);
  const activeCustomThemeId = useSettingsStore((state) => state.activeCustomThemeId);
  const [mounted, setMounted] = useState(false);

  // Set mounted state synchronously after hydration
  useIsomorphicLayoutEffect(() => {
    setMounted(true);
  }, []);

  // Handle light/dark mode
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  // Handle color theme (presets and custom)
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const isDark = root.classList.contains('dark');

    // Remove all theme classes first
    const themeClasses = Object.keys(THEME_PRESETS).map(t => `theme-${t}`);
    root.classList.remove(...themeClasses);

    // Check if using a custom theme
    if (activeCustomThemeId) {
      const customTheme = customThemes.find(t => t.id === activeCustomThemeId);
      if (customTheme) {
        // Apply custom theme colors as CSS variables
        const colors = {
          primary: customTheme.colors.primary,
          primaryForeground: isDark ? 'oklch(0.15 0.02 0)' : 'oklch(0.985 0.002 0)',
          secondary: customTheme.colors.secondary,
          secondaryForeground: isDark ? 'oklch(0.95 0.01 0)' : 'oklch(0.25 0.01 0)',
          accent: customTheme.colors.accent,
          accentForeground: isDark ? 'oklch(0.95 0.01 0)' : 'oklch(0.25 0.01 0)',
          background: customTheme.colors.background,
          foreground: customTheme.colors.foreground,
          muted: customTheme.colors.muted,
          mutedForeground: isDark ? 'oklch(0.7 0.01 0)' : 'oklch(0.5 0.01 0)',
          card: customTheme.colors.background,
          cardForeground: customTheme.colors.foreground,
          border: isDark ? 'oklch(0.3 0.02 0)' : 'oklch(0.9 0.02 0)',
          ring: customTheme.colors.primary,
          destructive: isDark ? 'oklch(0.65 0.2 27)' : 'oklch(0.55 0.2 27)',
          destructiveForeground: isDark ? 'oklch(0.15 0.02 27)' : 'oklch(0.985 0.002 27)',
        };
        applyThemeColors(colors);
        return;
      }
    }

    // Remove any custom theme CSS variables
    removeCustomThemeColors();

    // Apply preset theme class
    if (colorTheme !== 'default') {
      root.classList.add(`theme-${colorTheme}`);
    }
  }, [colorTheme, activeCustomThemeId, customThemes, mounted, theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const currentTheme = useSettingsStore.getState().theme;
      if (currentTheme === 'system') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}

/**
 * Main Providers component
 *
 * Wraps the application with all necessary context providers in the correct order.
 * Each provider handles a specific concern and provides functionality to the app.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundaryProvider
      maxRetries={3}
      showDetails={process.env.NODE_ENV === 'development'}
    >
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
              <I18nProvider>
                <ThemeProvider>
                  <TooltipProvider delayDuration={0}>
                    <SkillProvider loadBuiltinSkills={true}>
                      <NativeProvider checkUpdatesOnMount={true}>
                        <OnboardingProvider>
                          {children}
                        </OnboardingProvider>
                      </NativeProvider>
                    </SkillProvider>
                    <CommandPalette />
                    <Toaster />
                    <KeyboardShortcutsDialog />
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
