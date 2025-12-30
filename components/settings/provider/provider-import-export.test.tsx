/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderImportExport } from './provider-import-export';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockSetProviderSettings = jest.fn();
const mockAddCustomProvider = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key', enabled: true },
      },
      customProviders: {},
      setProviderSettings: mockSetProviderSettings,
      addCustomProvider: mockAddCustomProvider,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; id?: string }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} id={id} data-testid="checkbox" />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe('ProviderImportExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProviderImportExport />);
    expect(screen.getByText('export')).toBeInTheDocument();
  });

  it('displays export button', () => {
    render(<ProviderImportExport />);
    expect(screen.getByText('export')).toBeInTheDocument();
  });

  it('displays import button', () => {
    render(<ProviderImportExport />);
    expect(screen.getByText('import')).toBeInTheDocument();
  });

  it('opens export dialog on click', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('displays export dialog title', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByText('exportTitle')).toBeInTheDocument();
  });

  it('displays include API keys checkbox', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByText('includeApiKeys')).toBeInTheDocument();
  });

  it('displays export warning alert', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByText('exportWarning')).toBeInTheDocument();
  });

  it('displays export description', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByText('exportDescription')).toBeInTheDocument();
  });

  it('displays cancel button in export dialog', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('displays exportNow button', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    expect(screen.getByText('exportNow')).toBeInTheDocument();
  });

  it('toggles includeApiKeys checkbox', () => {
    render(<ProviderImportExport />);
    fireEvent.click(screen.getByText('export'));
    const checkbox = screen.getByTestId('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeInTheDocument();
  });
});
