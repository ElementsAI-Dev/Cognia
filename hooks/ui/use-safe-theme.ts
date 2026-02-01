'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

/**
 * Get current theme from DOM
 */
function getThemeSnapshot(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  const isDark =
    document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return isDark ? 'dark' : 'light';
}

/**
 * Server snapshot always returns dark
 */
function getServerSnapshot(): 'dark' | 'light' {
  return 'dark';
}

/**
 * Subscribe to theme changes
 */
function subscribeToTheme(callback: () => void): () => void {
  // Observe class changes on html element
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // Also listen for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);

  return () => {
    observer.disconnect();
    mediaQuery.removeEventListener('change', callback);
  };
}

/**
 * Safe theme hook that doesn't throw when used outside ThemeProvider
 * Detects theme from document class or system preference
 * Uses useSyncExternalStore for proper SSR support
 */
export function useSafeTheme() {
  const resolvedTheme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerSnapshot
  );

  return { resolvedTheme, isDark: resolvedTheme === 'dark' };
}

/**
 * Legacy hook using useState for components that need it
 * @deprecated Use useSafeTheme instead
 */
export function useSafeThemeLegacy() {
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const isDark =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDark ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for class changes on html element
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setResolvedTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      // Only update if no explicit class is set
      if (
        !document.documentElement.classList.contains('dark') &&
        !document.documentElement.classList.contains('light')
      ) {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  return { resolvedTheme, isDark: resolvedTheme === 'dark' };
}

export default useSafeTheme;
