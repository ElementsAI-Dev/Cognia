/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppShell } from './app-shell';

// Mock useNetworkStatus hook to prevent act() warnings from async state updates
jest.mock('@/hooks/network/use-network-status', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'wifi',
  }),
  __esModule: true,
  default: () => ({
    isOnline: true,
    isSlowConnection: false,
    connectionType: 'wifi',
  }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<AppShell>Content</AppShell>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <AppShell>
        <div data-testid="main-content">Main Content</div>
      </AppShell>
    );
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });
});
