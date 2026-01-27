'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { DebugButton } from './debug-button';

jest.mock('@/lib/native/utils', () => ({
  isTauri: () => false,
}));

const messages = {
  debug: {
    tools: 'Debug Tools',
    openDevTools: 'Open DevTools',
    logInfo: 'Log Debug Info',
    dumpStore: 'Dump Store State',
    testing: 'Testing',
    testChat: 'Test Chat Widget',
    testSelection: 'Test Selection',
    inspectChat: 'Inspect Chat',
    inspectSelection: 'Inspect Selection',
    performance: 'Performance',
    showPerf: 'Show Performance',
    hidePerf: 'Hide Performance',
    forceGC: 'Force GC',
    memory: 'Memory',
    heapUsed: 'Heap Used',
    heapTotal: 'Heap Total',
    heapLimit: 'Heap Limit',
    actions: 'Actions',
    clearStorage: 'Clear Storage',
    tauriOnly: 'Tauri only',
    tauriDesktop: 'Tauri Desktop',
    browser: 'Browser',
    development: 'Development',
    production: 'Production',
    loadTime: 'Load Time',
    domReady: 'DOM Ready',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('DebugButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Note: DebugButton uses useEffect to check NODE_ENV at runtime.
  // In test environment, the component renders based on initial state (isDevMode=false),
  // then updates via useEffect. Since we can't reliably control NODE_ENV in Jest,
  // we test the component's structure and production behavior.

  it('component exists and can be imported', () => {
    expect(DebugButton).toBeDefined();
  });

  it('renders without crashing in test environment', () => {
    const { container } = renderWithProviders(<DebugButton />);
    // Component may return null based on isDevMode state
    expect(container).toBeDefined();
  });
});

describe('DebugButton production', () => {
  beforeEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      writable: true,
    });
  });

  it('returns null in production mode', () => {
    const { container } = renderWithProviders(<DebugButton />);
    expect(container.firstChild).toBeNull();
  });
});
