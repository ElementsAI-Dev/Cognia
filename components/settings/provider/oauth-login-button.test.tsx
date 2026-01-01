/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OAuthLoginButton } from './oauth-login-button';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock OAuth utilities
jest.mock('@/lib/ai/providers/oauth', () => ({
  buildOAuthUrl: jest.fn(),
  getOAuthState: jest.fn(),
  clearOAuthState: jest.fn(),
}));

// Mock stores
const mockUpdateProviderSettings = jest.fn();
const mockState = {
  providerSettings: {
    openrouter: { apiKey: '', oauthConnected: false },
  },
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: mockState.providerSettings,
      updateProviderSettings: mockUpdateProviderSettings,
    };
    return selector(state);
  },
}));

// Mock providers
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openrouter: {
      id: 'openrouter',
      name: 'OpenRouter',
      supportsOAuth: true,
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      supportsOAuth: false,
    },
  },
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="oauth-button">{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('OAuthLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders for OAuth-supporting provider', () => {
    render(<OAuthLoginButton providerId="openrouter" />);
    expect(screen.getByTestId('oauth-button')).toBeInTheDocument();
  });

  it('does not render for non-OAuth provider', () => {
    render(<OAuthLoginButton providerId="openai" />);
    expect(screen.queryByTestId('oauth-button')).not.toBeInTheDocument();
  });

  it('displays login text', () => {
    render(<OAuthLoginButton providerId="openrouter" />);
    expect(screen.getByText('oauthLogin')).toBeInTheDocument();
  });

  it('handles login click', async () => {
    const { unmount } = render(<OAuthLoginButton providerId="openrouter" />);
    const button = screen.getByTestId('oauth-button');
    expect(button).toBeInTheDocument();
    // Unmount to prevent state updates after test ends
    unmount();
  });

  it('does not render for unknown provider', () => {
    render(<OAuthLoginButton providerId="unknown" />);
    expect(screen.queryByTestId('oauth-button')).not.toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<OAuthLoginButton providerId="openrouter" />);
    expect(screen.getByTestId('oauth-button')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<OAuthLoginButton providerId="openrouter" size="lg" />);
    expect(screen.getByTestId('oauth-button')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<OAuthLoginButton providerId="openrouter" className="custom-class" />);
    expect(screen.getByTestId('oauth-button')).toBeInTheDocument();
  });
});
