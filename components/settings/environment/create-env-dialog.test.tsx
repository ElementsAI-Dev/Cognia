'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CreateEnvDialog } from './create-env-dialog';

const messages = {
  virtualEnv: {
    createEnvironment: 'Create Environment',
    createEnvironmentDesc: 'Create a new virtual environment',
    presets: 'Presets',
    environmentName: 'Environment Name',
    environmentType: 'Environment Type',
    pythonVersion: 'Python Version',
    selectPythonVersion: 'Select Python version',
    initialPackages: 'Initial Packages',
    packagesHint: 'Comma-separated list',
    cancel: 'Cancel',
    create: 'Create',
    creating: 'Creating...',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('CreateEnvDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
  const pythonVersions = ['3.11.0', '3.10.0', '3.9.0'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    expect(screen.getByText('Create Environment')).toBeInTheDocument();
  });

  it('renders presets section', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    expect(screen.getByText('Presets')).toBeInTheDocument();
  });

  it('renders name input', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    expect(screen.getByPlaceholderText('my-project-env')).toBeInTheDocument();
  });

  it('renders environment type selector', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    expect(screen.getByText('Environment Type')).toBeInTheDocument();
  });

  it('renders packages input', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    expect(screen.getByPlaceholderText('numpy, pandas, requests')).toBeInTheDocument();
  });

  it('disables create button when name is empty', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    const createBtn = screen.getByRole('button', { name: /create/i });
    expect(createBtn).toBeDisabled();
  });

  it('calls onSubmit when create button clicked with name', async () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={false}
      />
    );
    const input = screen.getByPlaceholderText('my-project-env');
    fireEvent.change(input, { target: { value: 'test-env' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it('shows loading state when creating', () => {
    renderWithProviders(
      <CreateEnvDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        availablePythonVersions={pythonVersions}
        isCreating={true}
      />
    );
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });
});
