'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorTabs } from './rules-editor-tabs';

// Mock Tabs component
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange: _onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, onClick: _onClick }: { children: React.ReactNode; value: string; onClick?: () => void }) => (
    <button role="tab" data-value={value} data-state={value === 'cursor' ? 'active' : 'inactive'}>{children}</button>
  ),
}));

const messages = {
  rules: {
    targets: {
      cursor: 'Cursor',
      windsurf: 'Windsurf',
      copilot: 'Copilot',
      gemini: 'Gemini',
    },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('RulesEditorTabs', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all target tabs', () => {
    renderWithProviders(
      <RulesEditorTabs activeTab="cursor" onTabChange={mockOnTabChange} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('renders tabs container', () => {
    renderWithProviders(
      <RulesEditorTabs activeTab="cursor" onTabChange={mockOnTabChange} />
    );
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('renders tablist', () => {
    renderWithProviders(
      <RulesEditorTabs activeTab="cursor" onTabChange={mockOnTabChange} />
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('sets active tab value', () => {
    renderWithProviders(
      <RulesEditorTabs activeTab="cursor" onTabChange={mockOnTabChange} />
    );
    expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'cursor');
  });

  it('renders 4 tabs', () => {
    renderWithProviders(
      <RulesEditorTabs activeTab="cursor" onTabChange={mockOnTabChange} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });
});
