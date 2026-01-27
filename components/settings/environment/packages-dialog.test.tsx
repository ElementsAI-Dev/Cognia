'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PackagesDialog } from './packages-dialog';
import type { PackageInfo } from '@/types/system/environment';

// Mock UI dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

const messages = {
  virtualEnv: {
    packagesIn: 'Packages in {name}',
    enterPackages: 'Enter packages',
    searchPackages: 'Search packages',
    noMatchingPackages: 'No matching packages',
    noPackages: 'No packages installed',
    close: 'Close',
  },
};

const mockPackages: PackageInfo[] = [
  { name: 'numpy', version: '1.24.0', latest: '1.24.0', description: 'NumPy', location: '/path' },
  { name: 'pandas', version: '2.0.0', latest: '2.0.0', description: 'Pandas', location: '/path' },
  { name: 'requests', version: '2.28.0', latest: '2.28.0', description: 'Requests', location: '/path' },
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PackagesDialog', () => {
  const mockHandlers = {
    onOpenChange: jest.fn(),
    onInstall: jest.fn().mockResolvedValue(undefined),
    onUninstall: jest.fn().mockResolvedValue(undefined),
    onUpgradeAll: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={mockPackages}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Packages in test-env')).toBeInTheDocument();
  });

  it('renders package list', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={mockPackages}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('numpy')).toBeInTheDocument();
    expect(screen.getByText('pandas')).toBeInTheDocument();
  });

  it('renders version badges', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={mockPackages}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('1.24.0')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
  });

  it('renders inputs', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={mockPackages}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('shows loading state', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={[]}
        isLoading={true}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    const loader = document.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('shows empty state when no packages', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={[]}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('No packages installed')).toBeInTheDocument();
  });

  it('renders install button', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={mockPackages}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders close button', () => {
    renderWithProviders(
      <PackagesDialog
        open={true}
        envName="test-env"
        envPath="/path/to/env"
        packages={mockPackages}
        isLoading={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});
