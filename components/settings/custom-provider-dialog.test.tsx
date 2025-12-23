/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomProviderDialog } from './custom-provider-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores - use stable references to avoid infinite loops
const mockAddCustomProvider = jest.fn();
const mockUpdateCustomProvider = jest.fn();
const mockRemoveCustomProvider = jest.fn();
const mockCustomProviders = {};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      customProviders: mockCustomProviders,
      addCustomProvider: mockAddCustomProvider,
      updateCustomProvider: mockUpdateCustomProvider,
      removeCustomProvider: mockRemoveCustomProvider,
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, id }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type} id={id} data-testid={id || 'input'} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

describe('CustomProviderDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    editingProviderId: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CustomProviderDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays add provider title when not editing', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('addCustomProvider')).toBeInTheDocument();
  });

  it('displays provider name input', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('providerName')).toBeInTheDocument();
  });

  it('displays base URL input', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('baseURL')).toBeInTheDocument();
  });

  it('displays API key input', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('apiKey')).toBeInTheDocument();
  });

  it('displays models section', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('models')).toBeInTheDocument();
  });

  it('displays save button', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('save')).toBeInTheDocument();
  });

  it('displays cancel button', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });

  it('displays test button', () => {
    render(<CustomProviderDialog {...defaultProps} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
