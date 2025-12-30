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
import { Toaster } from '@/components/ui/sonner';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts-dialog';
import { SetupWizard } from '@/components/settings';
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
 * Features beautiful, modern loading animation with theme adaptation
 */
function AppLoadingScreen() {
  const [isDark, setIsDark] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useIsomorphicLayoutEffect(() => {
    setIsDark(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  }, []);

  // Simulate loading progress with realistic stages
  useEffect(() => {
    const stages = [
      { progress: 15, text: 'Loading core modules...' },
      { progress: 35, text: 'Initializing providers...' },
      { progress: 55, text: 'Loading themes...' },
      { progress: 75, text: 'Preparing workspace...' },
      { progress: 90, text: 'Almost ready...' },
      { progress: 100, text: 'Ready!' },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < stages.length) {
        setProgress(stages[currentStage].progress);
        setLoadingText(stages[currentStage].text);
        currentStage++;
      } else {
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  // Theme-adaptive colors
  const colors = {
    bg: isDark ? '#09090b' : '#fafafa',
    text: isDark ? '#fafafa' : '#09090b',
    textMuted: isDark ? 'rgba(250, 250, 250, 0.5)' : 'rgba(9, 9, 11, 0.5)',
    primary: '#3b82f6',
    primaryGlow: isDark ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)',
    ring: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
    gradient1: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
    gradient2: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ backgroundColor: colors.bg }}
    >
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% -20%, ${colors.gradient1}, transparent),
                       radial-gradient(ellipse 60% 40% at 80% 100%, ${colors.gradient2}, transparent)`,
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Logo Container */}
        <div className="relative">
          {/* Outer glow ring - slow rotation */}
          <div
            className="absolute -inset-6 rounded-full opacity-30"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${colors.primary}, transparent)`,
              animation: 'spin 4s linear infinite',
            }}
          />
          
          {/* Middle pulsing ring */}
          <div
            className="absolute -inset-4 rounded-full"
            style={{
              border: `2px solid ${colors.ring}`,
              animation: 'pulse-ring 2s ease-in-out infinite',
            }}
          />

          {/* Inner breathing ring */}
          <div
            className="absolute -inset-2 rounded-full"
            style={{
              border: `1px solid ${colors.ring}`,
              animation: 'pulse-ring 2s ease-in-out infinite 0.5s',
            }}
          />

          {/* Logo container with glass effect */}
          <div
            className="relative h-20 w-20 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${colors.gradient1} 0%, ${colors.gradient2} 100%)`,
              backdropFilter: 'blur(10px)',
              boxShadow: `0 0 40px ${colors.primaryGlow}, inset 0 0 20px ${colors.ring}`,
            }}
          >
            {/* Animated gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(45deg, ${colors.primary}20, transparent, ${colors.primary}10)`,
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
            
            {/* Core logo shape */}
            <div className="relative z-10">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                {/* Neural network / brain icon */}
                <circle
                  cx="12" cy="12" r="3"
                  fill={colors.primary}
                  style={{ animation: 'pulse 2s ease-in-out infinite' }}
                />
                <circle
                  cx="12" cy="4" r="2"
                  fill={colors.primary}
                  opacity="0.7"
                  style={{ animation: 'pulse 2s ease-in-out infinite 0.2s' }}
                />
                <circle
                  cx="12" cy="20" r="2"
                  fill={colors.primary}
                  opacity="0.7"
                  style={{ animation: 'pulse 2s ease-in-out infinite 0.4s' }}
                />
                <circle
                  cx="4" cy="12" r="2"
                  fill={colors.primary}
                  opacity="0.7"
                  style={{ animation: 'pulse 2s ease-in-out infinite 0.6s' }}
                />
                <circle
                  cx="20" cy="12" r="2"
                  fill={colors.primary}
                  opacity="0.7"
                  style={{ animation: 'pulse 2s ease-in-out infinite 0.8s' }}
                />
                {/* Connecting lines */}
                <line x1="12" y1="9" x2="12" y2="6" stroke={colors.primary} strokeWidth="1.5" opacity="0.5" />
                <line x1="12" y1="15" x2="12" y2="18" stroke={colors.primary} strokeWidth="1.5" opacity="0.5" />
                <line x1="9" y1="12" x2="6" y2="12" stroke={colors.primary} strokeWidth="1.5" opacity="0.5" />
                <line x1="15" y1="12" x2="18" y2="12" stroke={colors.primary} strokeWidth="1.5" opacity="0.5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brand name with fade-in effect */}
        <div className="flex flex-col items-center gap-4">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: colors.text }}
          >
            Cognia
          </h1>
          
          {/* Progress bar container */}
          <div className="w-48 flex flex-col items-center gap-2">
            {/* Progress bar background */}
            <div
              className="relative w-full h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
            >
              {/* Progress bar fill */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}cc)`,
                  boxShadow: `0 0 12px ${colors.primaryGlow}`,
                }}
              />
              {/* Shimmer effect on progress */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'progress-shimmer 1.5s ease-in-out infinite',
                }}
              />
            </div>
            
            {/* Progress percentage and text */}
            <div className="flex items-center justify-between w-full">
              <span
                className="text-xs font-medium transition-all duration-300"
                style={{ color: colors.textMuted }}
              >
                {loadingText}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: colors.primary }}
              >
                {progress}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.05); opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
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
