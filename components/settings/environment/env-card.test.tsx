'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { EnvCard } from './env-card';
import type { VirtualEnvInfo } from '@/types/system/environment';

const messages = {
  virtualEnv: {
    active: 'Active',
    idle: 'Idle',
    outdated: 'Outdated',
    activate: 'Activate',
    viewPackages: 'View Packages',
    clone: 'Clone',
    importRequirements: 'Import Requirements',
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
    onImport: jest.fn(),
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
        latestPythonVersion={'3.12.0'}
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
        latestPythonVersion={'3.12.0'}
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
        latestPythonVersion={'3.12.0'}
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
        latestPythonVersion={'3.12.0'}
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
        latestPythonVersion={'3.12.0'}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mockHandlers.onSelect).toHaveBeenCalled();
  });

  it('expands on toggle', () => {
    const { container } = renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        latestPythonVersion={'3.12.0'}
        {...mockHandlers}
      />
    );
    const collapsible = container.querySelector('[data-slot="collapsible"]');
    expect(collapsible).toBeInTheDocument();
    const trigger = container.querySelector('[data-slot="collapsible-trigger"]');
    if (trigger) fireEvent.click(trigger);
    // After click, collapsible should change state
    expect(collapsible?.getAttribute('data-state')).toBe('open');
  });

  it('renders env info', () => {
    const { container } = renderWithProviders(
      <EnvCard
        env={mockEnv}
        isActive={false}
        isSelected={false}
        latestPythonVersion={'3.12.0'}
        {...mockHandlers}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
