'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { EnvVariablesForm } from './env-variables-form';

const messages = {
  mcp: {
    envVariables: 'Environment Variables',
    envKeyPlaceholder: 'KEY',
    envValuePlaceholder: 'Value',
    hidePassword: 'Hide',
    showPassword: 'Show',
    removeEnvVar: 'Remove',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('EnvVariablesForm', () => {
  const defaultProps = {
    env: {},
    newEnvKey: '',
    newEnvValue: '',
    showEnvValues: {},
    onNewEnvKeyChange: jest.fn(),
    onNewEnvValueChange: jest.fn(),
    onAddEnv: jest.fn(),
    onRemoveEnv: jest.fn(),
    onToggleVisibility: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders label', () => {
    renderWithProviders(<EnvVariablesForm {...defaultProps} />);
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('renders inputs', () => {
    renderWithProviders(<EnvVariablesForm {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('calls handlers when inputs change', () => {
    renderWithProviders(<EnvVariablesForm {...defaultProps} />);
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'MY_KEY' } });
    expect(defaultProps.onNewEnvKeyChange).toHaveBeenCalled();
  });

  it('calls onAddEnv when add button clicked', () => {
    renderWithProviders(<EnvVariablesForm {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(defaultProps.onAddEnv).toHaveBeenCalled();
  });

  it('displays existing env variables', () => {
    renderWithProviders(
      <EnvVariablesForm
        {...defaultProps}
        env={{ API_KEY: 'secret123', DB_HOST: 'localhost' }}
      />
    );
    expect(screen.getByText('API_KEY')).toBeInTheDocument();
    expect(screen.getByText('DB_HOST')).toBeInTheDocument();
  });

  it('shows masked values by default', () => {
    renderWithProviders(
      <EnvVariablesForm
        {...defaultProps}
        env={{ API_KEY: 'secret123' }}
        showEnvValues={{}}
      />
    );
    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('shows actual value when visibility toggled', () => {
    renderWithProviders(
      <EnvVariablesForm
        {...defaultProps}
        env={{ API_KEY: 'secret123' }}
        showEnvValues={{ API_KEY: true }}
      />
    );
    expect(screen.getByText('secret123')).toBeInTheDocument();
  });

  it('calls onToggleVisibility when eye button clicked', () => {
    renderWithProviders(
      <EnvVariablesForm
        {...defaultProps}
        env={{ API_KEY: 'secret123' }}
      />
    );
    const buttons = screen.getAllByRole('button');
    // Find the visibility toggle button (second button after add)
    fireEvent.click(buttons[1]);
    expect(defaultProps.onToggleVisibility).toHaveBeenCalledWith('API_KEY');
  });

  it('calls onRemoveEnv when remove button clicked', () => {
    renderWithProviders(
      <EnvVariablesForm
        {...defaultProps}
        env={{ API_KEY: 'secret123' }}
      />
    );
    const buttons = screen.getAllByRole('button');
    // Find the remove button (third button after add and visibility)
    fireEvent.click(buttons[2]);
    expect(defaultProps.onRemoveEnv).toHaveBeenCalledWith('API_KEY');
  });

  it('does not render env list when empty', () => {
    renderWithProviders(<EnvVariablesForm {...defaultProps} />);
    expect(screen.queryByText('=')).not.toBeInTheDocument();
  });

  it('renders equals sign between key and value', () => {
    renderWithProviders(
      <EnvVariablesForm
        {...defaultProps}
        env={{ API_KEY: 'secret123' }}
      />
    );
    expect(screen.getByText('=')).toBeInTheDocument();
  });
});
