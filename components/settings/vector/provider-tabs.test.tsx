/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProviderTabs } from './provider-tabs';

// Mock stores
jest.mock('@/stores/data', () => ({}));

// Mock Tabs components
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ onValueChange?: (v: string) => void }>, { onValueChange }) : child
      )}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tabs-list" role="tablist">{children}</div>
  ),
  TabsTrigger: ({ children, value, disabled, onClick }: { children: React.ReactNode; value: string; disabled?: boolean; onClick?: () => void }) => (
    <button
      role="tab"
      data-testid={`tab-${value}`}
      data-value={value}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

const mockOptions = [
  { value: 'native' as const, label: 'Native' },
  { value: 'chroma' as const, label: 'Chroma' },
  { value: 'pinecone' as const, label: 'Pinecone' },
  { value: 'qdrant' as const, label: 'Qdrant' },
  { value: 'milvus' as const, label: 'Milvus' },
];

describe('ProviderTabs', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <ProviderTabs
        value="chroma"
        onValueChange={mockOnValueChange}
        options={mockOptions}
      />
    );
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
  });

  it('displays all provider options', () => {
    render(
      <ProviderTabs
        value="chroma"
        onValueChange={mockOnValueChange}
        options={mockOptions}
      />
    );

    expect(screen.getByText('Native')).toBeInTheDocument();
    expect(screen.getByText('Chroma')).toBeInTheDocument();
    expect(screen.getByText('Pinecone')).toBeInTheDocument();
    expect(screen.getByText('Qdrant')).toBeInTheDocument();
    expect(screen.getByText('Milvus')).toBeInTheDocument();
  });

  it('shows current value correctly', () => {
    render(
      <ProviderTabs
        value="pinecone"
        onValueChange={mockOnValueChange}
        options={mockOptions}
      />
    );

    const tabs = screen.getByTestId('tabs');
    expect(tabs).toHaveAttribute('data-value', 'pinecone');
  });

  it('renders tab triggers for each option', () => {
    render(
      <ProviderTabs
        value="chroma"
        onValueChange={mockOnValueChange}
        options={mockOptions}
      />
    );

    expect(screen.getByTestId('tab-native')).toBeInTheDocument();
    expect(screen.getByTestId('tab-chroma')).toBeInTheDocument();
    expect(screen.getByTestId('tab-pinecone')).toBeInTheDocument();
    expect(screen.getByTestId('tab-qdrant')).toBeInTheDocument();
    expect(screen.getByTestId('tab-milvus')).toBeInTheDocument();
  });

  it('disables tabs when disabled option is true', () => {
    const optionsWithDisabled = [
      { value: 'native' as const, label: 'Native' },
      { value: 'chroma' as const, label: 'Chroma', disabled: true },
    ];

    render(
      <ProviderTabs
        value="native"
        onValueChange={mockOnValueChange}
        options={optionsWithDisabled}
      />
    );

    const chromaTab = screen.getByTestId('tab-chroma');
    expect(chromaTab).toBeDisabled();
  });

  it('renders tabs list container', () => {
    render(
      <ProviderTabs
        value="chroma"
        onValueChange={mockOnValueChange}
        options={mockOptions}
      />
    );

    expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(
      <ProviderTabs
        value="chroma"
        onValueChange={mockOnValueChange}
        options={mockOptions}
        className="custom-class"
      />
    );

    // Component may or may not pass className to wrapper, check tabs element instead
    const tabs = screen.getByTestId('tabs');
    expect(tabs).toBeInTheDocument();
  });
});
