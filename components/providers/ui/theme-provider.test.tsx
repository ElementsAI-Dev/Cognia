'use client';

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme-provider';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockMatchMedia = (matches: boolean) => ({
  matches,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
});

function TestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    document.documentElement.classList.remove('dark', 'light');
    window.matchMedia = jest.fn().mockImplementation(() => mockMatchMedia(false));
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    );
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('provides default theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('uses custom default theme', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('allows setting theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    act(() => {
      screen.getByText('Set Dark').click();
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('persists theme to localStorage', () => {
    render(
      <ThemeProvider storageKey="test-theme">
        <TestComponent />
      </ThemeProvider>
    );
    act(() => {
      screen.getByText('Set Dark').click();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-theme', 'dark');
  });

  it('loads theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark');
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
  });
});

describe('useTheme', () => {
  it('throws error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within a ThemeProvider');
    consoleError.mockRestore();
  });
});
