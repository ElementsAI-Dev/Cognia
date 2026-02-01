/**
 * Unit tests for LaTeXEditor component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaTeXEditor, LaTeXEditorHandle } from './latex-editor';

// Mock child components
jest.mock('./latex-preview', () => ({
  LaTeXPreview: ({ content }: { content: string }) => (
    <div data-testid="latex-preview">{content}</div>
  ),
}));

jest.mock('./latex-toolbar', () => ({
  LaTeXToolbar: ({ onInsert, onUndo, onRedo, mode, onModeChange }: {
    onInsert: (text: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    mode: string;
    onModeChange: (mode: string) => void;
  }) => (
    <div data-testid="latex-toolbar">
      <button data-testid="insert-btn" onClick={() => onInsert('\\alpha')}>Insert</button>
      <button data-testid="undo-btn" onClick={onUndo}>Undo</button>
      <button data-testid="redo-btn" onClick={onRedo}>Redo</button>
      <button data-testid="mode-source" onClick={() => onModeChange('source')}>Source</button>
      <button data-testid="mode-visual" onClick={() => onModeChange('visual')}>Visual</button>
      <button data-testid="mode-split" onClick={() => onModeChange('split')}>Split</button>
      <span data-testid="current-mode">{mode}</span>
    </div>
  ),
}));

jest.mock('./latex-autocomplete', () => ({
  LaTeXAutocomplete: () => <div data-testid="latex-autocomplete" />,
}));

jest.mock('./latex-ai-context-menu', () => ({
  LatexAIContextMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock libs
jest.mock('@/lib/latex/parser', () => ({
  validate: () => [],
  extractMetadata: () => ({
    wordCount: 100,
    characterCount: 500,
    documentClass: 'article',
  }),
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

  it('renders the editor', () => {
    render(<LaTeXEditor {...defaultProps} />);
    expect(screen.getByTestId('latex-toolbar')).toBeInTheDocument();
  });

  it('renders with initial content', () => {
    render(<LaTeXEditor {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(defaultProps.initialContent);
  });

  it('calls onChange when content changes', async () => {
    render(<LaTeXEditor {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    
    await userEvent.type(textarea, 'test');
    expect(defaultProps.onChange).toHaveBeenCalled();
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

  it('handles undo action', async () => {
    render(<LaTeXEditor {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    
    // Type something first
    await userEvent.type(textarea, 'test');
    
    // Click undo
    const undoBtn = screen.getByTestId('undo-btn');
    await userEvent.click(undoBtn);
    
    // onChange should be called
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('handles redo action', async () => {
    render(<LaTeXEditor {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    
    // Type, undo, then redo
    await userEvent.type(textarea, 'test');
    
    const undoBtn = screen.getByTestId('undo-btn');
    await userEvent.click(undoBtn);
    
    const redoBtn = screen.getByTestId('redo-btn');
    await userEvent.click(redoBtn);
    
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('inserts text via toolbar', async () => {
    render(<LaTeXEditor {...defaultProps} />);
    
    const insertBtn = screen.getByTestId('insert-btn');
    await userEvent.click(insertBtn);
    
    expect(defaultProps.onChange).toHaveBeenCalled();
  });

  it('handles Ctrl+S to save', async () => {
    render(<LaTeXEditor {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    
    await userEvent.type(textarea, '{Control>}s{/Control}');
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('supports read-only mode', () => {
    render(<LaTeXEditor {...defaultProps} readOnly />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('readonly');
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
});
