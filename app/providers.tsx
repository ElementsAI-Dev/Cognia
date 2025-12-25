'use client';

/**
 * App Providers - wraps the app with necessary context providers
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
import { SkillProvider } from '@/components/providers/skill-provider';

interface ProvidersProps {
  children: React.ReactNode;
}

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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
    return null;
  }

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <TooltipProvider delayDuration={0}>
          <SkillProvider loadBuiltinSkills={true}>
            <OnboardingProvider>
              {children}
            </OnboardingProvider>
          </SkillProvider>
          <CommandPalette />
          <Toaster />
          <KeyboardShortcutsDialog />
        </TooltipProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default Providers;
