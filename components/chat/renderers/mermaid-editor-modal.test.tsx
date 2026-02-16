/**
 * Tests for MermaidEditorModal component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

// Mock next/dynamic to avoid async loading behavior in tests
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Monaco = require('@monaco-editor/react').default;
    return Monaco;
  },
}));

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
jest.mock('@/lib/export/diagram/diagram-export', () => ({
  exportDiagram: jest.fn().mockResolvedValue(undefined),
  generateDiagramFilename: jest.fn().mockReturnValue('diagram.png'),
}));

// Mock useCopy and useMermaid hooks
jest.mock('@/hooks/ui', () => ({
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
    const editor = screen.getByRole('textbox');
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
    
    const closeButton = screen.getAllByRole('button').find(
      (btn) => !!btn.querySelector('svg.lucide-x.h-4.w-4')
    );
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton as HTMLButtonElement);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
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
    const editor = screen.getByRole('textbox');
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
    
    const fullscreenButton = screen.getAllByRole('button').find(
      (btn) => !!btn.querySelector('svg.lucide-maximize-2')
    );
    expect(fullscreenButton).toBeTruthy();
    fireEvent.click(fullscreenButton as HTMLButtonElement);
    
    // After clicking, icon should toggle to minimize
    await waitFor(() => {
      const minimizeButton = screen.getAllByRole('button').find(
        (btn) => !!btn.querySelector('svg.lucide-minimize-2')
      );
      expect(minimizeButton).toBeTruthy();
    });
  });
});
