'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { CloneDialog } from './clone-dialog';
import type { VirtualEnvInfo } from '@/types/system/environment';

const messages = {
  virtualEnv: {
    cloneEnvironment: 'Clone Environment',
    cloneEnvironmentDesc: 'Clone "{name}" to a new environment',
    newEnvironmentName: 'New Environment Name',
    cancel: 'Cancel',
    clone: 'Clone',
  },
};

const mockSourceEnv = {
  name: 'test-env',
  type: 'venv',
  pythonVersion: '3.11.0',
  path: '/path/to/env',
  packages: 10,
  createdAt: new Date().toISOString(),
} as unknown as VirtualEnvInfo;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('CloneDialog', () => {
  const mockOnOpenChange = jest.fn();
  const mockOnClone = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    // Dialog renders via portal, check for dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders source env name in description', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    expect(screen.getByText(/test-env/)).toBeInTheDocument();
  });

  it('renders name input', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    expect(screen.getByPlaceholderText('test-env-copy')).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders clone button', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument();
  });

  it('disables clone button when name is empty', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    const cloneBtn = screen.getByRole('button', { name: /clone/i });
    expect(cloneBtn).toBeDisabled();
  });

  it('calls onClone when clone button clicked with name', async () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={false}
      />
    );
    const input = screen.getByPlaceholderText('test-env-copy');
    fireEvent.change(input, { target: { value: 'new-env' } });
    fireEvent.click(screen.getByRole('button', { name: /clone/i }));
    await waitFor(() => {
      expect(mockOnClone).toHaveBeenCalledWith('new-env');
    });
  });

  it('disables buttons when creating', () => {
    renderWithProviders(
      <CloneDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        sourceEnv={mockSourceEnv}
        onClone={mockOnClone}
        isCreating={true}
      />
    );
    expect(screen.getByText('Cancel')).toBeDisabled();
  });
});
