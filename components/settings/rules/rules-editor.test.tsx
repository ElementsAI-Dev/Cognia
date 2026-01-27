'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditor } from './rules-editor';

jest.mock('@/hooks/settings', () => ({
  useRulesEditor: jest.fn().mockReturnValue({
    activeTab: 'cursor',
    activeContent: '# Test Content',
    isDirty: false,
    showPreview: false,
    wordWrap: true,
    theme: 'vs-dark',
    mobileMenuOpen: false,
    canUndo: false,
    canRedo: false,
    isOptimizing: false,
    showResetDialog: false,
    charCount: 14,
    wordCount: 2,
    tokenEstimate: 5,
    setActiveTab: jest.fn(),
    handleContentChange: jest.fn(),
    handleApplyTemplate: jest.fn(),
    handleInsertVariable: jest.fn(),
    handleUndo: jest.fn(),
    handleRedo: jest.fn(),
    handleSave: jest.fn(),
    handleCopy: jest.fn(),
    handleImport: jest.fn(),
    handleExport: jest.fn(),
    handleReset: jest.fn(),
    handleFileChange: jest.fn(),
    handleOptimize: jest.fn(),
    setShowPreview: jest.fn(),
    setWordWrap: jest.fn(),
    setTheme: jest.fn(),
    setMobileMenuOpen: jest.fn(),
    setShowResetDialog: jest.fn(),
    fileInputRef: { current: null },
  }),
}));

jest.mock('./components', () => ({
  RulesEditorHeader: ({ isDirty }: { isDirty: boolean }) => (
    <div data-testid="rules-editor-header">{isDirty ? 'Unsaved' : 'Saved'}</div>
  ),
  RulesEditorToolbar: () => <div data-testid="rules-editor-toolbar">Toolbar</div>,
  RulesEditorMobileToolbar: () => <div data-testid="rules-editor-mobile-toolbar">Mobile Toolbar</div>,
  RulesEditorTabs: ({ activeTab }: { activeTab: string }) => (
    <div data-testid="rules-editor-tabs">{activeTab}</div>
  ),
  RulesEditorContent: ({ activeContent }: { activeContent: string }) => (
    <div data-testid="rules-editor-content">{activeContent}</div>
  ),
  RulesEditorFooter: ({ charCount, wordCount }: { charCount: number; wordCount: number }) => (
    <div data-testid="rules-editor-footer">
      {charCount} chars, {wordCount} words
    </div>
  ),
}));

const messages = {
  rules: {
    reset: 'Reset',
    resetConfirm: 'Are you sure you want to reset?',
  },
  common: {
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('RulesEditor', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByTestId('rules-editor-header')).toBeInTheDocument();
  });

  it('renders toolbar component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByTestId('rules-editor-toolbar')).toBeInTheDocument();
  });

  it('renders tabs component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByTestId('rules-editor-tabs')).toBeInTheDocument();
  });

  it('renders content component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByTestId('rules-editor-content')).toBeInTheDocument();
  });

  it('renders footer component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByTestId('rules-editor-footer')).toBeInTheDocument();
  });

  it('passes activeTab to tabs component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByText('cursor')).toBeInTheDocument();
  });

  it('passes activeContent to content component', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByText('# Test Content')).toBeInTheDocument();
  });

  it('passes char and word count to footer', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.getByText('14 chars, 2 words')).toBeInTheDocument();
  });

  it('renders file input for import', () => {
    const { container } = renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('file input accepts correct file types', () => {
    const { container } = renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput?.getAttribute('accept')).toBe('.md,.txt,.cursorrules,.windsurfrules');
  });

  it('does not render mobile toolbar when closed', () => {
    renderWithProviders(<RulesEditor onSave={mockOnSave} />);
    expect(screen.queryByTestId('rules-editor-mobile-toolbar')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <RulesEditor onSave={mockOnSave} className="custom-class" />
    );
    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });
});
