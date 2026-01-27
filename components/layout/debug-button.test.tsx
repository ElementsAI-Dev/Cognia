'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'development',
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: originalEnv,
      writable: true,
    });
  });

  it('renders debug button in development mode', () => {
    renderWithProviders(<DebugButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens dropdown menu on click', () => {
    renderWithProviders(<DebugButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Debug Tools')).toBeInTheDocument();
  });

  it('shows DEV badge', () => {
    renderWithProviders(<DebugButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('DEV')).toBeInTheDocument();
  });

  it('renders log debug info option', () => {
    renderWithProviders(<DebugButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Log Debug Info')).toBeInTheDocument();
  });

  it('renders testing section', () => {
    renderWithProviders(<DebugButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Testing')).toBeInTheDocument();
  });

  it('renders performance section', () => {
    renderWithProviders(<DebugButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Performance')).toBeInTheDocument();
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
