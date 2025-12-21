/**
 * Jest setup file
 * This file is executed before each test file
 */

import '@testing-library/jest-dom';
import React from 'react';

// Polyfill structuredClone for fake-indexeddb
if (typeof structuredClone === 'undefined') {
  global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

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

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

