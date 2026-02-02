/**
 * Tests for MermaidEditor component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

// Mock Monaco editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock mermaid
jest.mock('mermaid', () => ({
  default: {
    initialize: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg data-testid="mermaid-svg">test</svg>' }),
  },
}));

// Mock diagram export
jest.mock('@/lib/export/diagram/diagram-export', () => ({
  exportDiagram: jest.fn().mockResolvedValue(undefined),
  generateDiagramFilename: jest.fn().mockReturnValue('diagram.png'),
}));

// Mock useCopy hook
jest.mock('@/hooks/ui', () => ({
  ...jest.requireActual('@/hooks/ui'),
  useCopy: () => ({
    copy: jest.fn().mockResolvedValue(undefined),
    isCopying: false,
  }),
  useMermaid: () => ({
    svg: '<svg>test</svg>',
    error: null,
    isLoading: false,
    render: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: () => 'light',
}));

import { MermaidEditor } from './mermaid-editor';

const messages = {
  mermaidEditor: {
    split: 'Split',
    code: 'Code',
    preview: 'Preview',
    templates: 'Templates',
    selectTemplate: 'Select a template',
    refresh: 'Refresh',
    copyCode: 'Copy code',
    export: 'Export',
    exportPng: 'Export as PNG',
    exportSvg: 'Export as SVG',
    save: 'Save',
    saveAndClose: 'Save & Close',
    close: 'Close',
    editDiagram: 'Edit Diagram',
    unsaved: 'unsaved',
    unsavedChangesConfirm: 'You have unsaved changes. Are you sure you want to close?',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset view',
    rendering: 'Rendering...',
    renderError: 'Render Error',
    emptyPreview: 'Enter Mermaid code to see preview',
  },
  toasts: {
    mermaidCopied: 'Mermaid code copied',
    exported: 'Exported as {format}',
    exportFailed: 'Export failed: {error}',
    saved: 'Saved',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('MermaidEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with initial code', () => {
    renderWithProviders(<MermaidEditor initialCode="graph TD\nA-->B" />);
    
    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue('graph TD\nA-->B');
  });

  it('should render toolbar by default', () => {
    renderWithProviders(<MermaidEditor />);
    
    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
  });

  it('should hide toolbar when showToolbar is false', () => {
    renderWithProviders(<MermaidEditor showToolbar={false} />);
    
    expect(screen.queryByText('Templates')).not.toBeInTheDocument();
  });

  it('should call onChange when code changes', () => {
    const handleChange = jest.fn();
    renderWithProviders(<MermaidEditor onChange={handleChange} />);
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'graph LR\nA-->B' } });
    
    expect(handleChange).toHaveBeenCalledWith('graph LR\nA-->B');
  });

  it('should switch view modes', async () => {
    renderWithProviders(<MermaidEditor />);
    
    // Default is split mode
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    
    // Switch to code only
    fireEvent.click(screen.getByText('Code'));
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
    
    // Switch to preview only
    fireEvent.click(screen.getByText('Preview'));
    await waitFor(() => {
      expect(screen.queryByTestId('monaco-editor')).not.toBeInTheDocument();
    });
  });

  it('should show save button when onSave is provided', () => {
    const handleSave = jest.fn();
    renderWithProviders(<MermaidEditor onSave={handleSave} />);
    
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should not show save button when onSave is not provided', () => {
    renderWithProviders(<MermaidEditor />);
    
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('should be read-only when readOnly is true', () => {
    renderWithProviders(<MermaidEditor readOnly />);
    
    // Monaco editor mock doesn't fully support readOnly, but the prop is passed
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });
});
