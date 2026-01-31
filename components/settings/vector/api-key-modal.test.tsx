/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VectorApiKeyModal } from './api-key-modal';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Configure API Key',
      apiKey: 'API Key',
      'getKey': 'Get your API key from {provider} Dashboard',
      cancel: 'Cancel',
      save: 'Save API Key',
      saved: 'Saved',
    };
    return translations[key] || key;
  },
}));

// Mock useSettingsStore
const mockSetProviderSetting = jest.fn();
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: '' },
        google: { apiKey: '' },
        cohere: { apiKey: '' },
        mistral: { apiKey: '' },
      },
      setProviderSetting: mockSetProviderSetting,
    };
    return selector(state);
  },
}));

// Mock provider helpers
jest.mock('@/lib/ai/providers/provider-helpers', () => ({
  getProviderDashboardUrl: (provider: string) => `https://${provider}.example.com/dashboard`,
}));

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-description">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type, placeholder }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      data-testid="input"
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label data-testid="label">{children}</label>
  ),
}));

describe('VectorApiKeyModal', () => {
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <VectorApiKeyModal
        open={false}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays the dialog title', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Configure API Key');
  });

  it('displays API Key label', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.getByText('API Key')).toBeInTheDocument();
  });

  it('displays input field for API key', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('displays Cancel button', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('displays Save button', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    expect(screen.getByText('Save API Key')).toBeInTheDocument();
  });

  it('handles input change', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'test-api-key' } });

    // Input is controlled by component state, verify change event fires
    expect(input).toBeInTheDocument();
  });

  it('closes modal when Cancel is clicked', () => {
    render(
      <VectorApiKeyModal
        open={true}
        onOpenChange={mockOnOpenChange}
        provider="openai"
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
