'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ToolCard } from './tool-card';
import type { ToolStatus } from '@/types/system/environment';

jest.mock('@/types/system/environment', () => ({
  TOOL_INFO: {
    uv: {
      name: 'uv',
      icon: '📦',
      description: 'Fast Python package installer',
      category: 'language_manager',
      website: 'https://github.com/astral-sh/uv',
    },
    docker: {
      name: 'Docker',
      icon: '🐳',
      description: 'Container runtime',
      category: 'container_runtime',
      website: 'https://docker.com',
    },
  },
}));

const messages = {
  environmentSettings: {
    checking: 'Checking',
    installing: 'Installing',
    installed: 'Installed',
    notInstalled: 'Not Installed',
    error: 'Error',
    version: 'Version',
    path: 'Path',
    install: 'Install',
    refresh: 'Refresh',
    docs: 'Docs',
    categoryLanguageManager: 'Language Manager',
    categoryContainerRuntime: 'Container Runtime',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ToolCard', () => {
  const mockHandlers = {
    onInstall: jest.fn(),
    onOpenWebsite: jest.fn(),
    onRefresh: jest.fn(),
  };

  const installedStatus: ToolStatus = {
    tool: 'uv',
    installed: true,
    version: '0.1.0',
    path: '/usr/local/bin/uv',
    status: 'installed',
    error: null,
    lastChecked: new Date().toISOString(),
  };

  const notInstalledStatus: ToolStatus = {
    tool: 'uv',
    installed: false,
    version: null,
    path: null,
    status: 'not_installed',
    error: null,
    lastChecked: new Date().toISOString(),
  };

  const checkingStatus: ToolStatus = {
    tool: 'uv',
    installed: false,
    version: null,
    path: null,
    status: 'checking',
    error: null,
    lastChecked: null,
  };

  const installingStatus: ToolStatus = {
    tool: 'uv',
    installed: false,
    version: null,
    path: null,
    status: 'installing',
    error: null,
    lastChecked: null,
  };

  const errorStatus: ToolStatus = {
    tool: 'uv',
    installed: false,
    version: null,
    path: null,
    status: 'error',
    error: 'Installation failed',
    lastChecked: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tool name', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('uv')).toBeInTheDocument();
  });

  it('renders tool description', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Fast Python package installer')).toBeInTheDocument();
  });

  it('shows installed badge when installed', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('shows not installed badge when not installed', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={notInstalledStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Not Installed')).toBeInTheDocument();
  });

  it('shows checking badge when checking', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={checkingStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Checking')).toBeInTheDocument();
  });

  it('shows installing badge when installing', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installingStatus}
        isInstalling={true}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installing')).toBeInTheDocument();
  });

  it('shows error badge when error', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={errorStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('shows version when installed', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
  });

  it('shows path when installed', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('/usr/local/bin/uv')).toBeInTheDocument();
  });

  it('shows error message when error', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={errorStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installation failed')).toBeInTheDocument();
  });

  it('shows install button when not installed', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={notInstalledStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('hides install button when installed', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.queryByText('Install')).not.toBeInTheDocument();
  });

  it('calls onInstall when install button clicked', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={notInstalledStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Install'));
    expect(mockHandlers.onInstall).toHaveBeenCalled();
  });

  it('calls onRefresh when refresh button clicked', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Refresh'));
    expect(mockHandlers.onRefresh).toHaveBeenCalled();
  });

  it('calls onOpenWebsite when docs button clicked', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Docs'));
    expect(mockHandlers.onOpenWebsite).toHaveBeenCalled();
  });

  it('disables refresh button when checking', () => {
    renderWithProviders(
      <ToolCard
        tool="uv"
        status={checkingStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Refresh').closest('button')).toBeDisabled();
  });

  it('renders container runtime icon for docker', () => {
    renderWithProviders(
      <ToolCard
        tool="docker"
        status={installedStatus}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Docker')).toBeInTheDocument();
  });
});
