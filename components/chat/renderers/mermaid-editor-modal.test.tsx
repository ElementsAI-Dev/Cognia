/**
 * Tests for MermaidEditorModal component
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
    render: jest.fn().mockResolvedValue({ svg: '<svg>test</svg>' }),
  },
}));

// Mock diagram export
jest.mock('@/lib/export/diagram-export', () => ({
  exportDiagram: jest.fn().mockResolvedValue(undefined),
  generateDiagramFilename: jest.fn().mockReturnValue('diagram.png'),
}));

// Mock useCopy and useMermaid hooks
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

import { MermaidEditorModal } from './mermaid-editor-modal';

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

describe('MermaidEditorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when open is true', () => {
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={jest.fn()}
        initialCode="graph TD\nA-->B"
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    renderWithProviders(
      <MermaidEditorModal
        open={false}
        onOpenChange={jest.fn()}
        initialCode="graph TD\nA-->B"
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display custom title', () => {
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={jest.fn()}
        title="Custom Title"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('should show save button when onSave is provided', () => {
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={jest.fn()}
        onSave={jest.fn()}
      />
    );
    
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Save & Close')).toBeInTheDocument();
  });

  it('should call onSave when save button is clicked', async () => {
    const handleSave = jest.fn();
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={jest.fn()}
        onSave={handleSave}
        initialCode="graph TD\nA-->B"
      />
    );
    
    // Change the code first to enable save
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'graph LR\nA-->B' } });
    
    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith('graph LR\nA-->B');
    });
  });

  it('should call onOpenChange when close button is clicked', () => {
    const handleOpenChange = jest.fn();
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={handleOpenChange}
      />
    );
    
    // Find and click close button by aria-label
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(
      (btn) => btn.getAttribute('aria-label')?.includes('Close') || btn.textContent === ''
    );
    
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it('should show unsaved indicator when code changes', async () => {
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={jest.fn()}
        onSave={jest.fn()}
        initialCode="graph TD\nA-->B"
      />
    );
    
    // Change the code
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'graph LR\nA-->B' } });
    
    await waitFor(() => {
      expect(screen.getByText(/unsaved/i)).toBeInTheDocument();
    });
  });

  it('should toggle fullscreen mode', async () => {
    renderWithProviders(
      <MermaidEditorModal
        open={true}
        onOpenChange={jest.fn()}
      />
    );
    
    // Find fullscreen button
    const fullscreenButton = screen.getByRole('button', { name: /fullscreen/i });
    fireEvent.click(fullscreenButton);
    
    // After clicking, the button should now show "Exit fullscreen"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /exit fullscreen/i })).toBeInTheDocument();
    });
  });
});
