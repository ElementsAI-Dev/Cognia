'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorToolbar } from './rules-editor-toolbar';

const messages = {
  rules: {
    undo: 'Undo',
    redo: 'Redo',
    preview: 'Preview',
    wordWrap: 'Word Wrap',
    optimize: 'Optimize',
    optimizing: 'Optimizing...',
    templates: 'Templates',
    variables: 'Variables',
    insert: 'Insert variable',
    import: 'Import',
    export: 'Export',
    reset: 'Reset',
    copy: 'Copy',
    save: 'Save',
    categories: {
      general: 'General',
      frontend: 'Frontend',
      backend: 'Backend',
      testing: 'Testing',
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

describe('RulesEditorToolbar', () => {
  const defaultProps = {
    canUndo: true,
    canRedo: true,
    showPreview: false,
    wordWrap: true,
    isOptimizing: false,
    isDirty: true,
    activeContent: '# Content',
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onTogglePreview: jest.fn(),
    onToggleWordWrap: jest.fn(),
    onOptimize: jest.fn(),
    onApplyTemplate: jest.fn(),
    onInsertVariable: jest.fn(),
    onImport: jest.fn(),
    onExport: jest.fn(),
    onReset: jest.fn(),
    onCopy: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders toolbar buttons', () => {
    renderWithProviders(<RulesEditorToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(5);
  });

  it('calls onUndo when clicked', () => {
    renderWithProviders(<RulesEditorToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // First button should be undo
    fireEvent.click(buttons[0]);
    expect(defaultProps.onUndo).toHaveBeenCalled();
  });

  it('calls onRedo when clicked', () => {
    renderWithProviders(<RulesEditorToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Second button should be redo
    fireEvent.click(buttons[1]);
    expect(defaultProps.onRedo).toHaveBeenCalled();
  });

  it('renders toolbar when optimizing', () => {
    const { container } = renderWithProviders(<RulesEditorToolbar {...defaultProps} isOptimizing={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders toolbar when not dirty', () => {
    const { container } = renderWithProviders(<RulesEditorToolbar {...defaultProps} isDirty={false} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
