'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PackagesDialog } from './packages-dialog';
import type { PackageInfo } from '@/types/system/environment';

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
  { name: 'numpy', version: '1.24.0' },
  { name: 'pandas', version: '2.0.0' },
  { name: 'requests', version: '2.28.0' },
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

  it('renders install input', () => {
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
    expect(screen.getByPlaceholderText('Enter packages')).toBeInTheDocument();
  });

  it('renders search input', () => {
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
    expect(screen.getByPlaceholderText('Search packages')).toBeInTheDocument();
  });

  it('filters packages on search', () => {
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
    const searchInput = screen.getByPlaceholderText('Search packages');
    fireEvent.change(searchInput, { target: { value: 'num' } });
    expect(screen.getByText('numpy')).toBeInTheDocument();
    expect(screen.queryByText('pandas')).not.toBeInTheDocument();
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

  it('calls onInstall when installing packages', async () => {
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
    const installInput = screen.getByPlaceholderText('Enter packages');
    fireEvent.change(installInput, { target: { value: 'scipy' } });
    const installBtn = screen.getAllByRole('button')[0];
    fireEvent.click(installBtn);
    await waitFor(() => {
      expect(mockHandlers.onInstall).toHaveBeenCalledWith(['scipy']);
    });
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
