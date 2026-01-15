/**
 * Tests for provider.tsx
 * I18n Provider component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from './provider';
import { useSettingsStore } from '@/stores';

// Mock the stores
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children, locale, messages }: { 
    children: React.ReactNode; 
    locale: string;
    messages: Record<string, unknown>;
  }) => (
    <div data-testid="intl-provider" data-locale={locale} data-has-messages={!!messages}>
      {children}
    </div>
  ),
}));

// Mock messages
jest.mock('./messages/en.json', () => ({
  common: { greeting: 'Hello' },
}), { virtual: true });

jest.mock('./messages/zh-CN.json', () => ({
  common: { greeting: '你好' },
}), { virtual: true });

const mockedUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

describe('I18nProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default to English
    mockedUseSettingsStore.mockImplementation((selector) => {
      const state = { language: 'en' as const };
      return selector(state as never);
    });
  });

  it('should render children', () => {
    render(
      <I18nProvider>
        <div data-testid="child">Child content</div>
      </I18nProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should wrap children with NextIntlClientProvider', () => {
    render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    expect(screen.getByTestId('intl-provider')).toBeInTheDocument();
  });

  it('should use English locale by default', () => {
    render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    const provider = screen.getByTestId('intl-provider');
    expect(provider).toHaveAttribute('data-locale', 'en');
  });

  it('should use language from settings store', () => {
    mockedUseSettingsStore.mockImplementation((selector) => {
      const state = { language: 'zh-CN' as const };
      return selector(state as never);
    });

    render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    const provider = screen.getByTestId('intl-provider');
    expect(provider).toHaveAttribute('data-locale', 'zh-CN');
  });

  it('should provide messages to the provider', () => {
    render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    const provider = screen.getByTestId('intl-provider');
    expect(provider).toHaveAttribute('data-has-messages', 'true');
  });

  it('should fallback to English for unknown locale', () => {
    mockedUseSettingsStore.mockImplementation((selector) => {
      const state = { language: 'unknown' as never };
      return selector(state as never);
    });

    render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    // Should still render without errors
    expect(screen.getByTestId('intl-provider')).toBeInTheDocument();
  });

  it('should handle multiple children', () => {
    render(
      <I18nProvider>
        <div data-testid="child1">First</div>
        <div data-testid="child2">Second</div>
      </I18nProvider>
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });

  it('should update locale when settings change', () => {
    const { rerender } = render(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    // Change language
    mockedUseSettingsStore.mockImplementation((selector) => {
      const state = { language: 'zh-CN' as const };
      return selector(state as never);
    });

    rerender(
      <I18nProvider>
        <div>Content</div>
      </I18nProvider>
    );

    const provider = screen.getByTestId('intl-provider');
    expect(provider).toHaveAttribute('data-locale', 'zh-CN');
  });
});
