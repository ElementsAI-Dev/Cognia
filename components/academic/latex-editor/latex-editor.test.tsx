/**
 * Unit tests for LaTeXEditor component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaTeXEditor, LaTeXEditorHandle } from './latex-editor';

// Mock CodeMirror editor
const mockInsertText = jest.fn();
const mockReplaceSelection = jest.fn();
const mockGetSelectedText = jest.fn().mockReturnValue('');
const mockFocus = jest.fn();
const mockScrollToLine = jest.fn();
const mockGetContent = jest.fn().mockReturnValue('');

jest.mock('./codemirror-editor', () => ({
  CodeMirrorEditor: React.forwardRef(function MockCodeMirrorEditor(
    props: {
      value: string;
      onChange: (v: string) => void;
      onSave?: () => void;
      onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
      readOnly?: boolean;
      className?: string;
    },
    ref: React.Ref<unknown>
  ) {
    React.useImperativeHandle(ref, () => ({
      insertText: mockInsertText,
      replaceSelection: mockReplaceSelection,
      getSelectedText: mockGetSelectedText,
      focus: mockFocus,
      scrollToLine: mockScrollToLine,
      getContent: mockGetContent,
    }));
    return (
      <div data-testid="codemirror-editor" data-readonly={props.readOnly}>
        <textarea
          data-testid="cm-textarea"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          readOnly={props.readOnly}
        />
      </div>
    );
  }),
}));

// Mock child components
jest.mock('./latex-preview', () => ({
  LaTeXPreview: ({ content }: { content: string }) => (
    <div data-testid="latex-preview">{content}</div>
  ),
}));

jest.mock('./latex-toolbar', () => ({
  LaTeXToolbar: ({ onInsert, mode, onModeChange, onImport, onExport, onFormat }: {
    onInsert: (text: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    mode: string;
    onModeChange: (mode: string) => void;
    onImport?: () => void;
    onExport?: () => void;
    onFormat?: () => void;
  }) => (
    <div data-testid="latex-toolbar">
      <button data-testid="insert-btn" onClick={() => onInsert('\\alpha')}>Insert</button>
      <button data-testid="mode-source" onClick={() => onModeChange('source')}>Source</button>
      <button data-testid="mode-visual" onClick={() => onModeChange('visual')}>Visual</button>
      <button data-testid="mode-split" onClick={() => onModeChange('split')}>Split</button>
      <button data-testid="import-btn" onClick={() => onImport?.()}>Import</button>
      <button data-testid="export-btn" onClick={() => onExport?.()}>Export</button>
      <button data-testid="format-btn" onClick={() => onFormat?.()}>Format</button>
      <span data-testid="current-mode">{mode}</span>
    </div>
  ),
}));

jest.mock('./latex-ai-context-menu', () => ({
  LatexAIContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('./latex-ai-panel', () => ({
  LatexAIPanel: () => <div data-testid="latex-ai-panel" />,
}));

jest.mock('./error-panel', () => ({
  ErrorPanel: ({ onErrorClick }: { onErrorClick?: (error: { line: number; column: number }) => void }) => (
    <button
      data-testid="error-panel"
      onClick={() => onErrorClick?.({ line: 12, column: 4 })}
      type="button"
    >
      Error Panel
    </button>
  ),
}));

jest.mock('./document-outline', () => ({
  DocumentOutline: ({ onNavigate }: { onNavigate?: (line: number) => void }) => (
    <button
      type="button"
      data-testid="document-outline"
      onClick={() => onNavigate?.(7)}
    >
      Outline
    </button>
  ),
}));

// Mock libs
jest.mock('@/lib/latex/parser', () => ({
  validate: () => [],
  extractMetadata: () => ({
    wordCount: 100,
    characterCount: 500,
    documentClass: 'article',
  }),
  format: (s: string) => s,
}));

// Mock UI components
jest.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-group">{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="resizable-panel">{children}</div>
  ),
  ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

describe('LaTeXEditor', () => {
  const defaultProps = {
    initialContent: '\\documentclass{article}\n\\begin{document}\nHello World\n\\end{document}',
    onChange: jest.fn(),
    onSave: jest.fn(),
    onError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the editor with toolbar', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByTestId('latex-toolbar')).toBeInTheDocument();
  });

  it('renders CodeMirror editor', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByTestId('codemirror-editor')).toBeInTheDocument();
  });

  it('displays word count in status bar', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByText(/100 words/)).toBeInTheDocument();
  });

  it('displays character count in status bar', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByText(/500 characters/)).toBeInTheDocument();
  });

  it('displays document class in status bar', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByText(/Class: article/)).toBeInTheDocument();
  });

  it('displays cursor position', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByText(/Line 1, Column 1/)).toBeInTheDocument();
  });

  it('switches to source mode', async () => {
    render(<LaTeXEditor {...defaultProps} />);

    const sourceModeBtn = screen.getByTestId('mode-source');
    await userEvent.click(sourceModeBtn);

    expect(screen.getByTestId('current-mode')).toHaveTextContent('source');
  });

  it('switches to visual mode', async () => {
    render(<LaTeXEditor {...defaultProps} />);

    const visualModeBtn = screen.getByTestId('mode-visual');
    await userEvent.click(visualModeBtn);

    expect(screen.getByTestId('current-mode')).toHaveTextContent('visual');
  });

  it('inserts text via toolbar using CodeMirror handle', async () => {
    render(<LaTeXEditor {...defaultProps} />);

    const insertBtn = screen.getByTestId('insert-btn');
    await userEvent.click(insertBtn);

    expect(mockInsertText).toHaveBeenCalledWith('\\alpha');
  });

  it('exposes imperative handle methods', () => {
    const ref = React.createRef<LaTeXEditorHandle>();
    render(<LaTeXEditor {...defaultProps} ref={ref} />);

    expect(ref.current).toBeDefined();
    expect(typeof ref.current?.insertText).toBe('function');
    expect(typeof ref.current?.replaceSelection).toBe('function');
    expect(typeof ref.current?.getSelectedText).toBe('function');
    expect(typeof ref.current?.focus).toBe('function');
  });

  it('renders preview in split mode', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByTestId('latex-preview')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LaTeXEditor {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes readOnly to CodeMirror editor', () => {
    render(<LaTeXEditor {...defaultProps} readOnly />);
    const editor = screen.getByTestId('codemirror-editor');
    expect(editor.getAttribute('data-readonly')).toBe('true');
  });

  it('switches to source mode and navigates when clicking an error in visual mode', async () => {
    render(<LaTeXEditor {...defaultProps} />);

    await userEvent.click(screen.getByTestId('mode-visual'));
    expect(screen.getByTestId('current-mode')).toHaveTextContent('visual');

    await userEvent.click(screen.getByTestId('error-panel'));

    await waitFor(() => {
      expect(screen.getByTestId('current-mode')).toHaveTextContent('source');
      expect(mockScrollToLine).toHaveBeenCalledWith(12);
    });
  });

  it('navigates to outline line selection', async () => {
    render(<LaTeXEditor {...defaultProps} />);

    await userEvent.click(screen.getByTitle('Toggle Outline'));
    await userEvent.click(screen.getByTestId('document-outline'));

    expect(mockScrollToLine).toHaveBeenCalledWith(7);
  });

  it('reports unsupported import file types', async () => {
    const onImportResult = jest.fn();
    const originalCreateElement = document.createElement.bind(document);

    const fakeInput = {
      type: '',
      accept: '',
      onchange: null as ((event: Event) => void) | null,
      click: jest.fn(function click() {
        const file = new File(['bad'], 'bad.pdf', { type: 'application/pdf' });
        const event = {
          target: {
            files: [file],
          },
        } as unknown as Event;
        this.onchange?.(event);
      }),
    } as unknown as HTMLInputElement;

    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'input') {
        return fakeInput;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);

    render(<LaTeXEditor {...defaultProps} onImportResult={onImportResult} />);
    await userEvent.click(screen.getByTestId('import-btn'));

    expect(onImportResult).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        fileName: 'bad.pdf',
      })
    );

    createElementSpy.mockRestore();
  });

  it('reports format success through callback', async () => {
    const onFormatResult = jest.fn();
    render(<LaTeXEditor {...defaultProps} onFormatResult={onFormatResult} />);

    await userEvent.click(screen.getByTestId('format-btn'));

    expect(onFormatResult).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
      })
    );
  });
});
