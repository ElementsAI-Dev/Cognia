'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { RulesEditorMobileToolbar } from './rules-editor-mobile-toolbar';

const messages = {
  rules: {
    ariaLabels: {
      undo: 'Undo',
      redo: 'Redo',
      togglePreview: 'Toggle preview',
      toggleWordWrap: 'Toggle word wrap',
      aiOptimize: 'AI optimize',
      import: 'Import',
      export: 'Export',
      reset: 'Reset',
      copy: 'Copy',
      save: 'Save',
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

describe('RulesEditorMobileToolbar', () => {
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
    onImport: jest.fn(),
    onExport: jest.fn(),
    onReset: jest.fn(),
    onCopy: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all buttons', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(10);
  });

  it('calls onUndo when undo button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Undo'));
    expect(defaultProps.onUndo).toHaveBeenCalled();
  });

  it('calls onRedo when redo button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Redo'));
    expect(defaultProps.onRedo).toHaveBeenCalled();
  });

  it('disables undo button when canUndo is false', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} canUndo={false} />);
    expect(screen.getByLabelText('Undo')).toBeDisabled();
  });

  it('disables redo button when canRedo is false', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} canRedo={false} />);
    expect(screen.getByLabelText('Redo')).toBeDisabled();
  });

  it('calls onTogglePreview when preview button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Toggle preview'));
    expect(defaultProps.onTogglePreview).toHaveBeenCalled();
  });

  it('calls onToggleWordWrap when word wrap button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Toggle word wrap'));
    expect(defaultProps.onToggleWordWrap).toHaveBeenCalled();
  });

  it('calls onOptimize when optimize button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Find optimize button (5th button in the toolbar)
    fireEvent.click(buttons[4]);
    expect(defaultProps.onOptimize).toHaveBeenCalled();
  });

  it('renders when isOptimizing', () => {
    const { container } = renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} isOptimizing={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders when no content', () => {
    const { container } = renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} activeContent="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onImport when import button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Import'));
    expect(defaultProps.onImport).toHaveBeenCalled();
  });

  it('calls onExport when export button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Export'));
    expect(defaultProps.onExport).toHaveBeenCalled();
  });

  it('calls onReset when reset button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Reset'));
    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it('calls onCopy when copy button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Copy'));
    expect(defaultProps.onCopy).toHaveBeenCalled();
  });

  it('calls onSave when save button clicked', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Save'));
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('disables save button when not dirty', () => {
    renderWithProviders(<RulesEditorMobileToolbar {...defaultProps} isDirty={false} />);
    expect(screen.getByLabelText('Save')).toBeDisabled();
  });
});
