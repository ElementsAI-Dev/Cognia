/**
 * Jest setup file
 * This file is executed before each test file
 */

import '@testing-library/jest-dom';
import React from 'react';

// Configure React 19 for testing - suppress act() warnings for async updates
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mock TooltipProvider globally to avoid "must be used within TooltipProvider" errors
jest.mock('@/components/ui/tooltip', () => {
  const actual = jest.requireActual('@/components/ui/tooltip');
  return {
    ...actual,
    TooltipProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'tooltip' }, children),
    TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => 
      asChild ? children : React.createElement('button', { 'data-testid': 'tooltip-trigger' }, children),
    TooltipContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'tooltip-content' }, children),
  };
});

// Polyfill structuredClone for fake-indexeddb
if (typeof structuredClone === 'undefined') {
  global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

// Mock window.matchMedia for components using media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill TransformStream for eventsource-parser
if (typeof TransformStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const polyfill = require('web-streams-polyfill');
  global.TransformStream = polyfill.TransformStream;
}

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Clean up after each test to prevent memory leaks
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear all timers
  jest.clearAllTimers();
  
  // Force garbage collection hint (if available)
  if (global.gc) {
    global.gc();
  }
});

// Increase test timeout for slower machines
jest.setTimeout(30000);

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

