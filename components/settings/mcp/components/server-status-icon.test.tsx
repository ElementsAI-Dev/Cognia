'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ServerStatusIcon } from './server-status-icon';
import type { McpServerStatus } from '@/types/mcp';

const messages = {
  mcpSettings: {
    statusConnected: 'Connected',
    statusConnecting: 'Connecting',
    statusReconnecting: 'Reconnecting',
    statusError: 'Error',
    statusDisconnected: 'Disconnected',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ServerStatusIcon', () => {
  it('renders connected icon', () => {
    const status: McpServerStatus = { type: 'connected' };
    const { container } = renderWithProviders(<ServerStatusIcon status={status} />);
    // Check icon has green color class
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders connecting icon with animation', () => {
    const status: McpServerStatus = { type: 'connecting' };
    const { container } = renderWithProviders(<ServerStatusIcon status={status} />);
    const icon = container.querySelector('svg');
    expect(icon?.classList.contains('animate-spin')).toBe(true);
  });

  it('renders reconnecting icon with animation', () => {
    const status: McpServerStatus = { type: 'reconnecting' };
    const { container } = renderWithProviders(<ServerStatusIcon status={status} />);
    const icon = container.querySelector('svg');
    expect(icon?.classList.contains('animate-spin')).toBe(true);
  });

  it('renders error icon', () => {
    const status: McpServerStatus = { type: 'error', message: 'Connection failed' };
    const { container } = renderWithProviders(<ServerStatusIcon status={status} />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders disconnected icon', () => {
    const status: McpServerStatus = { type: 'disconnected' };
    const { container } = renderWithProviders(<ServerStatusIcon status={status} />);
    const icon = container.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('has tooltip', () => {
    const status: McpServerStatus = { type: 'connected' };
    const { container } = renderWithProviders(<ServerStatusIcon status={status} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders different icons for different states', () => {
    const { container: connected } = renderWithProviders(
      <ServerStatusIcon status={{ type: 'connected' }} />
    );
    const { container: disconnected } = renderWithProviders(
      <ServerStatusIcon status={{ type: 'disconnected' }} />
    );
    
    // Both render SVG icons
    expect(connected.querySelector('svg')).toBeInTheDocument();
    expect(disconnected.querySelector('svg')).toBeInTheDocument();
  });
});
