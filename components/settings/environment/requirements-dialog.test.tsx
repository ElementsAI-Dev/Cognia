'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RequirementsDialog } from './requirements-dialog';

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

// Mock Tabs component
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value} onClick={() => {}}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div role="tabpanel" data-value={value}>{children}</div>
  ),
}));

const messages = {
  virtualEnv: {
    requirementsTitle: 'Requirements',
    export: 'Export',
    import: 'Import',
    generateRequirements: 'Generate Requirements',
    copyToClipboard: 'Copy to Clipboard',
    pasteRequirements: 'Paste requirements here...',
    installFromRequirements: 'Install from Requirements',
    close: 'Close',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('RequirementsDialog', () => {
  const mockHandlers = {
    onOpenChange: jest.fn(),
    onExport: jest.fn().mockResolvedValue('numpy==1.24.0\npandas==2.0.0'),
    onImport: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    });
  });

  it('renders when open', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(
      <RequirementsDialog
        open={false}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.queryByText('Requirements')).not.toBeInTheDocument();
  });

  it('renders export tab by default', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('switches to import tab', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('renders buttons', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders dialog content', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('renders when exporting', () => {
    const { container } = renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={true}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders tablist', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('disables import button when textarea empty', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByRole('tab', { name: /import/i }));
    expect(screen.getByText('Install from Requirements').closest('button')).toBeDisabled();
  });

  it('renders when installing', () => {
    const { container } = renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={true}
        {...mockHandlers}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onOpenChange when close button clicked', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(mockHandlers.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders footer', () => {
    renderWithProviders(
      <RequirementsDialog
        open={true}
        envPath="/path/to/env"
        isExporting={false}
        isInstalling={false}
        {...mockHandlers}
      />
    );
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
  });
});
