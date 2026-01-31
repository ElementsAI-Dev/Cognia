'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { EnvVarsPanel } from './env-vars-panel';

// Mock next-intl
const messages = {
  envVars: {
    title: 'Environment Variables',
    description: 'Manage environment variables for your development workflow.',
    notAvailable: 'Environment variables management requires the desktop app.',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    secret: 'Secret',
    copied: 'Copied!',
    copyValue: 'Copy value',
    addVariable: 'Add Variable',
    editVariable: 'Edit Variable',
    addVariableDesc: 'Create a new environment variable.',
    editVariableDesc: 'Update an existing environment variable.',
    variableName: 'Variable Name',
    variableValue: 'Value',
    valuePlaceholder: 'Enter value...',
    category: 'Category',
    markAsSecret: 'Mark as secret (hide value)',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    dismiss: 'Dismiss',
    importExport: 'Import/Export',
    import: 'Import',
    export: 'Export',
    pasteEnvFile: 'Paste .env file contents here...',
    overwriteExisting: 'Overwrite existing variables',
    importVariables: 'Import Variables',
    generateEnvFile: 'Generate .env File',
    copyToClipboard: 'Copy to Clipboard',
    searchPlaceholder: 'Search variables...',
    filter: 'Filter',
    allCategories: 'All Categories',
    clearFilters: 'Clear Filters',
    noVariables: 'No environment variables found',
    addFirst: 'Add your first variable',
    confirmDeleteTitle: 'Delete Variable?',
    confirmDeleteDesc: 'Are you sure you want to delete {key}? This action cannot be undone.',
  },
};

// Mock useEnvVars hook
jest.mock('@/hooks/system/use-env-vars', () => ({
  useEnvVars: () => ({
    envVars: [],
    filteredEnvVars: [],
    isLoading: false,
    error: null,
    isAvailable: true,
    searchQuery: '',
    categoryFilter: 'all',
    refreshEnvVars: jest.fn(),
    addEnvVar: jest.fn(),
    updateEnvVar: jest.fn(),
    removeEnvVar: jest.fn(),
    importFromFile: jest.fn(),
    exportToFile: jest.fn(),
    setSearchQuery: jest.fn(),
    setCategoryFilter: jest.fn(),
    clearFilters: jest.fn(),
    clearError: jest.fn(),
  }),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 data-testid="card-title" className={className}>{children}</h3>
  ),
  CardDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p data-testid="card-description" className={className}>{children}</p>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('EnvVarsPanel', () => {
  it('renders panel title', () => {
    renderWithProviders(<EnvVarsPanel />);
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('renders panel description', () => {
    renderWithProviders(<EnvVarsPanel />);
    expect(screen.getByText('Manage environment variables for your development workflow.')).toBeInTheDocument();
  });

  it('renders add button', () => {
    renderWithProviders(<EnvVarsPanel />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders import/export button', () => {
    renderWithProviders(<EnvVarsPanel />);
    expect(screen.getByText('Import/Export')).toBeInTheDocument();
  });

  it('renders empty state when no variables', () => {
    renderWithProviders(<EnvVarsPanel />);
    expect(screen.getByText('No environment variables found')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<EnvVarsPanel />);
    expect(screen.getByPlaceholderText('Search variables...')).toBeInTheDocument();
  });
});
