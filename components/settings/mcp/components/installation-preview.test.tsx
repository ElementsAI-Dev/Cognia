'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { InstallationPreview } from './installation-preview';
import type { McpInstallConfig } from '@/lib/mcp/marketplace';
import type { EnvironmentCheckResult } from '@/lib/mcp/marketplace-utils';

const messages = {
  mcpMarketplace: {
    checkingEnvironment: 'Checking environment...',
    environmentNotSupported: 'Environment not supported',
    missingDeps: 'Missing dependencies',
    environmentReady: 'Environment ready',
    installCommand: 'Install Command',
    connectionType: 'Connection Type',
    environmentVariables: 'Environment Variables',
    envVarsDescription: 'Configure the required environment variables',
    enterEnvVar: 'Enter {key}',
    noConfigRequired: 'No configuration required',
    noConfigRequiredDesc: 'This server can be installed without additional configuration',
    configPreview: 'Configuration Preview',
  },
  common: {
    copy: 'Copy',
    copied: 'Copied!',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('InstallationPreview', () => {
  const mockInstallConfig: McpInstallConfig = {
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-example'],
    connectionType: 'stdio',
    envKeys: ['API_KEY'],
  };

  const mockEnvCheck: EnvironmentCheckResult = {
    supported: true,
    hasNode: true,
    hasNpx: true,
    nodeVersion: '20.0.0',
    missingDeps: [],
  };

  const defaultProps = {
    installConfig: mockInstallConfig,
    mcpId: '@modelcontextprotocol/server-example',
    isRemote: false,
    envValues: {},
    envCheck: mockEnvCheck,
    isCheckingEnv: false,
    onEnvValueChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders install command', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(screen.getByText(/npx -y @modelcontextprotocol\/server-example/)).toBeInTheDocument();
  });

  it('renders connection type', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(screen.getByText('STDIO')).toBeInTheDocument();
  });

  it('shows environment ready message when check passes', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(screen.getByText(/Environment ready/)).toBeInTheDocument();
  });

  it('shows node version in environment ready message', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(screen.getByText(/Node 20.0.0/)).toBeInTheDocument();
  });

  it('shows checking message when isCheckingEnv is true', () => {
    renderWithProviders(
      <InstallationPreview {...defaultProps} isCheckingEnv={true} envCheck={null} />
    );
    expect(screen.getByText('Checking environment...')).toBeInTheDocument();
  });

  it('shows error message when environment not supported', () => {
    const unsupportedCheck: EnvironmentCheckResult = {
      supported: false,
      hasNode: false,
      hasNpx: false,
      message: 'Node.js not installed',
      missingDeps: ['node'],
    };
    renderWithProviders(
      <InstallationPreview {...defaultProps} envCheck={unsupportedCheck} />
    );
    expect(screen.getByText(/Node.js not installed/)).toBeInTheDocument();
  });

  it('shows missing deps when present', () => {
    const checkWithMissingDeps: EnvironmentCheckResult = {
      supported: false,
      hasNode: false,
      hasNpx: false,
      missingDeps: ['npm', 'node'],
    };
    renderWithProviders(
      <InstallationPreview {...defaultProps} envCheck={checkWithMissingDeps} />
    );
    expect(screen.getByText(/npm, node/)).toBeInTheDocument();
  });

  it('renders env variables form when envKeys present', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('renders when no envKeys', () => {
    const configWithoutEnvKeys = { ...mockInstallConfig, envKeys: [] };
    const { container } = renderWithProviders(
      <InstallationPreview {...defaultProps} installConfig={configWithoutEnvKeys} />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders env input when envKeys present', () => {
    const { container } = renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(container.querySelector('input')).toBeInTheDocument();
  });

  it('copies command to clipboard when copy button clicked', async () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    const copyButton = screen.getAllByRole('button')[0];
    fireEvent.click(copyButton);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'npx -y @modelcontextprotocol/server-example'
      );
    });
  });

  it('shows config preview', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} />);
    expect(screen.getByText('Configuration Preview')).toBeInTheDocument();
  });

  it('hides environment check for remote servers', () => {
    renderWithProviders(<InstallationPreview {...defaultProps} isRemote={true} />);
    expect(screen.queryByText(/Environment ready/)).not.toBeInTheDocument();
  });

  it('displays SSE url when connection type is sse', () => {
    const sseConfig: McpInstallConfig = {
      command: 'node',
      args: ['server.js'],
      connectionType: 'sse',
      url: 'https://example.com/sse',
      envKeys: [],
    };
    renderWithProviders(
      <InstallationPreview {...defaultProps} installConfig={sseConfig} />
    );
    expect(screen.getByText('https://example.com/sse')).toBeInTheDocument();
  });

  it('uses mcpId as fallback when no installConfig', () => {
    renderWithProviders(
      <InstallationPreview {...defaultProps} installConfig={null} />
    );
    expect(screen.getByText(/npx -y @modelcontextprotocol\/server-example/)).toBeInTheDocument();
  });
});
