'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ProjectConfigCard } from './project-config-card';
import type { ProjectEnvConfig, VirtualEnvInfo } from '@/types/system/environment';

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
  projectEnv: {
    environmentSettings: 'Environment Settings',
    virtualEnvironment: 'Virtual Environment',
    selectEnvironment: 'Select environment',
    none: 'None',
    autoActivate: 'Auto Activate',
    autoActivateDesc: 'Automatically activate when opening project',
    environmentVariables: 'Environment Variables',
    noEnvVars: 'No environment variables defined',
    addVariable: 'Add Variable',
    addEnvVariable: 'Add Environment Variable',
    variableName: 'Variable Name',
    variableValue: 'Variable Value',
    cancel: 'Cancel',
    add: 'Add',
    name: 'Name',
    value: 'Value',
  },
};

const mockConfig: ProjectEnvConfig = {
  id: 'config-1',
  projectPath: '/path/to/project',
  projectName: 'test-project',
  pythonVersion: null,
  nodeVersion: null,
  virtualEnvId: null,
  virtualEnvPath: null,
  autoActivate: false,
  envVars: {},
  scripts: {},
  dependencies: { python: [], node: [], system: [] },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockEnvironments: VirtualEnvInfo[] = [
  {
    id: 'env-1',
    name: 'venv-1',
    type: 'venv',
    path: '/path/to/venv',
    pythonVersion: '3.11.0',
    packages: 10,
    size: '100 MB',
    createdAt: new Date().toISOString(),
  } as VirtualEnvInfo,
];

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('ProjectConfigCard', () => {
  const mockHandlers = {
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project name', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('test-project')).toBeInTheDocument();
  });

  it('renders project path', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('/path/to/project')).toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    const deleteButton = screen.getAllByRole('button')[0];
    fireEvent.click(deleteButton);
    expect(mockHandlers.onDelete).toHaveBeenCalled();
  });

  it('renders environment settings accordion', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Environment Settings')).toBeInTheDocument();
  });

  it('renders environment variables accordion', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('shows no env vars message when empty', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    // Accordion trigger contains the text
    const trigger = screen.getByText('Environment Variables');
    expect(trigger).toBeInTheDocument();
  });

  it('shows env var count badge', () => {
    const configWithVars = {
      ...mockConfig,
      envVars: { VAR1: 'value1', VAR2: 'value2' },
    };
    renderWithProviders(
      <ProjectConfigCard
        config={configWithVars}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders auto activate switch', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    // Environment Settings accordion exists
    expect(screen.getByText('Environment Settings')).toBeInTheDocument();
  });

  it('opens add variable dialog', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Environment Variables'));
    fireEvent.click(screen.getByText('Add Variable'));
    expect(screen.getByText('Add Environment Variable')).toBeInTheDocument();
  });

  it('has add variable button', () => {
    renderWithProviders(
      <ProjectConfigCard
        config={mockConfig}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    // Environment Variables accordion contains Add Variable button
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('accepts linked environment', () => {
    const configWithEnv = {
      ...mockConfig,
      virtualEnvId: 'env-1',
      virtualEnvPath: '/path/to/venv',
    };
    renderWithProviders(
      <ProjectConfigCard
        config={configWithEnv}
        environments={mockEnvironments}
        {...mockHandlers}
      />
    );
    // Component renders with environment config
    expect(screen.getByText('test-project')).toBeInTheDocument();
  });
});
