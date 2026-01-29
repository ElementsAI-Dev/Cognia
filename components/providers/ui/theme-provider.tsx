'use client';

import * as React from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  attribute = 'class',
  defaultTheme = 'system',
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = 'theme',
  ...props
}: ThemeProviderProps) {
  // Use lazy initialization to read from localStorage on first render (avoids hydration flash)
  const [theme, setTheme] = React.useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    const stored = localStorage.getItem(storageKey) as Theme | null;
    return stored || defaultTheme;
  });
  
  // Initialize resolved theme with proper system detection
  const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem(storageKey) as Theme | null;
    const currentTheme = stored || defaultTheme;
    if (currentTheme === 'system' && enableSystem) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return currentTheme === 'system' ? 'light' : currentTheme;
  });
  
  // Track mount state for potential SSR hydration handling
  const [_mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Handle transition disable on theme change
  React.useEffect(() => {
    const root = window.document.documentElement;

    if (disableTransitionOnChange) {
      root.classList.add('[&_*]:!transition-none');
      const timeout = setTimeout(() => {
        root.classList.remove('[&_*]:!transition-none');
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [theme, disableTransitionOnChange]);

  // Apply theme to document and track resolved theme
  React.useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    let newResolvedTheme: 'dark' | 'light' = theme === 'system' ? 'light' : theme;
    if (theme === 'system' && enableSystem) {
      newResolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setResolvedTheme(newResolvedTheme);

    if (attribute === 'class') {
      root.classList.add(newResolvedTheme);
    } else {
      root.setAttribute(attribute, newResolvedTheme);
    }
  }, [theme, attribute, enableSystem]);

  // Listen for system theme changes when using 'system' theme
  React.useEffect(() => {
    if (theme !== 'system' || !enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newResolvedTheme);
      
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      if (attribute === 'class') {
        root.classList.add(newResolvedTheme);
      } else {
        root.setAttribute(attribute, newResolvedTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, enableSystem, attribute]);

  const value = React.useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        setTheme(newTheme);
      },
    }),
    [theme, resolvedTheme, storageKey]
  );

  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
