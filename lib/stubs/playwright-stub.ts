/**
 * Browser/SSR stub for playwright
 * Playwright is a Node.js-only package that cannot be bundled for the browser.
 * At runtime, the actual module is dynamically imported only in server contexts.
 */

import { loggers } from '@/lib/logger';

const log = loggers.app;

const notAvailable = () => {
  log.warn('Playwright is not available in browser environment');
  throw new Error('Playwright is not available in browser environment');
};

const createMockBrowserType = () => ({
  launch: notAvailable,
  connect: notAvailable,
  connectOverCDP: notAvailable,
  launchPersistentContext: notAvailable,
  launchServer: notAvailable,
  name: () => 'stub',
  executablePath: () => '',
});

export const chromium = createMockBrowserType();
export const firefox = createMockBrowserType();
export const webkit = createMockBrowserType();

export const devices = {};
export const errors = {
  TimeoutError: class TimeoutError extends Error {},
};
export const selectors = {
  register: notAvailable,
};
export const request = {
  newContext: notAvailable,
};

const playwrightStub = { chromium, firefox, webkit, devices, errors, selectors, request };
export default playwrightStub;
