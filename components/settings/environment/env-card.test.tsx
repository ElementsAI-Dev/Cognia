'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { EnvCard } from './env-card';
import type { VirtualEnvInfo } from '@/types/system/environment';

const messages = {
  virtualEnv: {
    active: 'Active',
    activate: 'Activate',
    viewPackages: 'View Packages',
    clone: 'Clone',
    exportRequirements: 'Export Requirements',
    delete: 'Delete',
    packagesCount: 'packages',
  },
};

const mockEnv = {
  name: 'test-env',
  type: 'venv',
  pythonVersion: '3.11.0',
  path: '/path/to/env',
  packages: 10,
  size: '100 MB',
  createdAt: new Date().toISOString(),
} as unknown as VirtualEnvInfo;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('EnvCard', () => {
  const mockHandlers = {
    onActivate: jest.fn(),
    onDelete: jest.fn(),
    onViewPackages: jest.fn(),
    onClone: jest.fn(),
    onExport: jest.fn(),
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders env name', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('test-env')).toBeInTheDocument();
  });

  it('shows active badge when active', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={true}
        isSelected={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows activate button when not active', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        {...mockHandlers}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders checkbox for selection', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('calls onSelect when checkbox clicked', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockHandlers.onSelect).toHaveBeenCalled();
  });

  it('expands to show details on toggle', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        {...mockHandlers}
      />
    );
    const expandBtn = screen.getAllByRole('button')[1];
    fireEvent.click(expandBtn);
    expect(screen.getByText('Python 3.11.0')).toBeInTheDocument();
  });

  it('shows package count', () => {
    renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        {...mockHandlers}
      />
    );
    const expandBtn = screen.getAllByRole('button')[1];
    fireEvent.click(expandBtn);
    expect(screen.getByText('10 packages')).toBeInTheDocument();
  });
});
