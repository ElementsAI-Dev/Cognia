'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorContent } from './rules-editor-content';

jest.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

jest.mock('./rules-editor-preview', () => ({
  RulesEditorPreview: ({ content }: { content: string }) => (
    <div data-testid="rules-editor-preview">{content}</div>
  ),
}));

// Mock resizable components to avoid DOM prop warnings
jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

const messages = {
  rules: {
    optimizing: 'Optimizing...',
    toggleTheme: 'Toggle theme',
    ariaLabels: {
      toggleTheme: 'Toggle editor theme',
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

describe('RulesEditorContent', () => {
  const defaultProps = {
    activeContent: '# Test Content',
    onContentChange: jest.fn(),
    showPreview: false,
    wordWrap: true,
    theme: 'vs-dark' as const,
    onThemeToggle: jest.fn(),
    isOptimizing: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders monaco editor', () => {
    renderWithProviders(<RulesEditorContent {...defaultProps} />);
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('passes content to editor', () => {
    renderWithProviders(<RulesEditorContent {...defaultProps} />);
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('# Test Content');
  });

  it('does not show preview when showPreview is false', () => {
    renderWithProviders(<RulesEditorContent {...defaultProps} />);
    expect(screen.queryByTestId('rules-editor-preview')).not.toBeInTheDocument();
  });

  it('shows preview when showPreview is true', () => {
    renderWithProviders(<RulesEditorContent {...defaultProps} showPreview={true} />);
    expect(screen.getByTestId('rules-editor-preview')).toBeInTheDocument();
  });

  it('passes content to preview', () => {
    renderWithProviders(<RulesEditorContent {...defaultProps} showPreview={true} />);
    const preview = screen.getByTestId('rules-editor-preview');
    expect(preview).toHaveTextContent('# Test Content');
  });

  it('shows optimizing overlay when isOptimizing', () => {
    const { container } = renderWithProviders(<RulesEditorContent {...defaultProps} isOptimizing={true} />);
    // Check for loader/spinner element instead of text
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('hides optimizing overlay when not optimizing', () => {
    renderWithProviders(<RulesEditorContent {...defaultProps} isOptimizing={false} />);
    expect(screen.queryByText('Optimizing...')).not.toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    const { container } = renderWithProviders(<RulesEditorContent {...defaultProps} />);
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
  });
});
