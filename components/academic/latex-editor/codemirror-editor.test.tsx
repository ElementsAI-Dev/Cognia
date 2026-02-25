/**
 * Unit tests for CodeMirrorEditor component
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from './codemirror-editor';
import type { LaTeXEditorConfig } from '@/types/latex';

// Mock CodeMirror modules — use inline fns to avoid hoisting issues
const mockDispatch = jest.fn();
const mockFocus = jest.fn();
const mockDestroy = jest.fn();
const mockDocToString = jest.fn().mockReturnValue('test content');
const mockSliceDoc = jest.fn().mockReturnValue('selected');
const mockLine = jest.fn().mockReturnValue({ from: 0, number: 1 });

jest.mock('@codemirror/state', () => ({
  EditorState: {
    create: jest.fn().mockReturnValue({}),
    readOnly: { of: jest.fn() },
    tabSize: { of: jest.fn().mockReturnValue([]) },
  },
  Extension: {},
}));

jest.mock('@codemirror/view', () => {
  const viewConstructor: Record<string, unknown> & jest.Mock = Object.assign(jest.fn().mockImplementation(() => ({
    dispatch: mockDispatch,
    focus: mockFocus,
    destroy: mockDestroy,
    state: {
      doc: {
        toString: mockDocToString,
        line: mockLine,
        lines: 5,
      },
      selection: { main: { head: 0, from: 0, to: 0, empty: true } },
      sliceDoc: mockSliceDoc,
    },
  })), {} as Record<string, unknown>);
  viewConstructor.theme = jest.fn().mockReturnValue([]);
  viewConstructor.updateListener = { of: jest.fn().mockReturnValue([]) };
  viewConstructor.lineWrapping = [];
  viewConstructor.scrollIntoView = jest.fn().mockReturnValue([]);
  viewConstructor.contentAttributes = { of: jest.fn().mockReturnValue([]) };

  return {
    EditorView: viewConstructor,
    keymap: { of: jest.fn().mockReturnValue([]) },
    lineNumbers: jest.fn().mockReturnValue([]),
    highlightActiveLine: jest.fn().mockReturnValue([]),
    highlightActiveLineGutter: jest.fn().mockReturnValue([]),
    drawSelection: jest.fn().mockReturnValue([]),
    placeholder: jest.fn().mockReturnValue([]),
  };
});

jest.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  history: jest.fn().mockReturnValue([]),
  historyKeymap: [],
  indentWithTab: {},
}));

jest.mock('@codemirror/search', () => ({
  searchKeymap: [],
  highlightSelectionMatches: jest.fn().mockReturnValue([]),
}));

jest.mock('@codemirror/language', () => ({
  bracketMatching: jest.fn().mockReturnValue([]),
  foldGutter: jest.fn().mockReturnValue([]),
  foldKeymap: [],
  indentOnInput: jest.fn().mockReturnValue([]),
  syntaxHighlighting: jest.fn().mockReturnValue([]),
  defaultHighlightStyle: {},
  HighlightStyle: { define: jest.fn().mockReturnValue({}) },
}));

jest.mock('@codemirror/autocomplete', () => ({
  closeBrackets: jest.fn().mockReturnValue([]),
  closeBracketsKeymap: [],
  autocompletion: jest.fn().mockReturnValue([]),
  completionKeymap: [],
}));

jest.mock('codemirror-lang-latex', () => ({
  latex: jest.fn().mockReturnValue([]),
}));

jest.mock('@lezer/highlight', () => ({
  tags: {
    keyword: 'keyword',
    macroName: 'macroName',
    typeName: 'typeName',
    string: 'string',
    comment: 'comment',
    number: 'number',
    operator: 'operator',
    bracket: 'bracket',
    meta: 'meta',
  },
}));

jest.mock('@/lib/latex/symbols', () => ({
  searchSymbols: jest.fn().mockReturnValue([]),
  searchCommands: jest.fn().mockReturnValue([]),
}));

const defaultConfig = {
  fontSize: 14,
  fontFamily: 'monospace',
  theme: 'system' as const,
  lineNumbers: true,
  wordWrap: true,
  tabSize: 2,
  spellCheck: false,
  insertSpaces: true,
  minimap: false,
  autocomplete: true,
  syntaxHighlighting: true,
  bracketMatching: true,
  autoClosingBrackets: true,
  spellCheckLanguage: 'en',
  previewDelay: 500,
  livePreview: true,
  previewScale: 1,
  syncScroll: true,
  vimMode: false,
  keybindings: [],
} satisfies LaTeXEditorConfig;

describe('CodeMirrorEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a container div', () => {
    const { container } = render(
      <CodeMirrorEditor value="hello" onChange={jest.fn()} config={defaultConfig} />
    );
    expect(container.firstChild).toBeDefined();
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
  });

  it('creates an EditorView on mount', () => {
    const { EditorView } = require('@codemirror/view');
    render(
      <CodeMirrorEditor value="\\section{Test}" onChange={jest.fn()} config={defaultConfig} />
    );
    expect(EditorView).toHaveBeenCalled();
  });

  it('destroys EditorView on unmount', () => {
    const { unmount } = render(
      <CodeMirrorEditor value="" onChange={jest.fn()} config={defaultConfig} />
    );
    unmount();
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <CodeMirrorEditor value="" onChange={jest.fn()} config={defaultConfig} className="my-editor" />
    );
    expect(container.firstChild).toHaveClass('my-editor');
  });

  it('exposes imperative handle via ref', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="" onChange={jest.fn()} config={defaultConfig} />
    );

    expect(ref.current).toBeDefined();
    expect(typeof ref.current?.insertText).toBe('function');
    expect(typeof ref.current?.replaceSelection).toBe('function');
    expect(typeof ref.current?.getSelectedText).toBe('function');
    expect(typeof ref.current?.focus).toBe('function');
    expect(typeof ref.current?.scrollToLine).toBe('function');
    expect(typeof ref.current?.getContent).toBe('function');
  });

  it('getContent returns editor content', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="test" onChange={jest.fn()} config={defaultConfig} />
    );

    expect(ref.current?.getContent()).toBe('test content');
  });

  it('getSelectedText returns selected text', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="hello world" onChange={jest.fn()} config={defaultConfig} />
    );

    expect(ref.current?.getSelectedText()).toBe('selected');
  });

  it('insertText dispatches and focuses', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="" onChange={jest.fn()} config={defaultConfig} />
    );

    ref.current?.insertText('\\alpha');
    expect(mockDispatch).toHaveBeenCalled();
    expect(mockFocus).toHaveBeenCalled();
  });

  it('replaceSelection dispatches and focuses', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="" onChange={jest.fn()} config={defaultConfig} />
    );

    ref.current?.replaceSelection('replacement');
    expect(mockDispatch).toHaveBeenCalled();
    expect(mockFocus).toHaveBeenCalled();
  });

  it('focus calls view.focus', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="" onChange={jest.fn()} config={defaultConfig} />
    );

    ref.current?.focus();
    expect(mockFocus).toHaveBeenCalled();
  });

  it('scrollToLine dispatches and focuses', () => {
    const ref = React.createRef<CodeMirrorEditorHandle>();
    render(
      <CodeMirrorEditor ref={ref} value="line1\nline2\nline3" onChange={jest.fn()} config={defaultConfig} />
    );

    ref.current?.scrollToLine(2);
    expect(mockDispatch).toHaveBeenCalled();
    expect(mockFocus).toHaveBeenCalled();
  });
});
