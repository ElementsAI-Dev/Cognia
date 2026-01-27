'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NetworkStatusIndicator, OfflineBanner } from './network-status-indicator';
import * as networkHooks from '@/hooks/network';

jest.mock('@/hooks/network', () => ({
  useNetworkStatus: jest.fn(() => ({
    isOnline: true,
    isSlowConnection: false,
    effectiveType: '4g',
    rtt: 50,
  })),
}));

describe('NetworkStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (networkHooks.useNetworkStatus as jest.Mock).mockReturnValue({
      isOnline: true,
      isSlowConnection: false,
      effectiveType: '4g',
      rtt: 50,
    });
  });

  it('renders online status', () => {
    render(<NetworkStatusIndicator showLabel />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders with green background when online', () => {
    const { container } = render(<NetworkStatusIndicator />);
    const indicator = container.querySelector('.bg-green-500\\/10');
    expect(indicator).toBeInTheDocument();
  });

  it('renders without label by default', () => {
    render(<NetworkStatusIndicator />);
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<NetworkStatusIndicator className="custom-class" />);
    const indicator = container.querySelector('.custom-class');
    expect(indicator).toBeInTheDocument();
  });
});

describe('NetworkStatusIndicator offline', () => {
  beforeEach(() => {
    (networkHooks.useNetworkStatus as jest.Mock).mockReturnValue({
      isOnline: false,
      isSlowConnection: false,
      effectiveType: null,
      rtt: null,
    });
  });

  it('renders offline status', () => {
    render(<NetworkStatusIndicator showLabel />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders with red background when offline', () => {
    const { container } = render(<NetworkStatusIndicator />);
    const indicator = container.querySelector('.bg-destructive\\/10');
    expect(indicator).toBeInTheDocument();
  });
});

describe('NetworkStatusIndicator slow', () => {
  beforeEach(() => {
    (networkHooks.useNetworkStatus as jest.Mock).mockReturnValue({
      isOnline: true,
      isSlowConnection: true,
      effectiveType: '2g',
      rtt: 500,
    });
  });

  it('renders slow status', () => {
    render(<NetworkStatusIndicator showLabel />);
    expect(screen.getByText('Slow')).toBeInTheDocument();
  });

  it('renders with yellow background when slow', () => {
    const { container } = render(<NetworkStatusIndicator />);
    const indicator = container.querySelector('.bg-yellow-500\\/10');
    expect(indicator).toBeInTheDocument();
  });
});

describe('OfflineBanner', () => {
  it('returns null when online', () => {
    (networkHooks.useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders banner when offline', () => {
    (networkHooks.useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    render(<OfflineBanner />);
    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });
});
