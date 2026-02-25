'use client';

/**
 * CodeMirror 6 Editor for LaTeX
 * Provides syntax highlighting, bracket matching, code folding, search/replace,
 * and proper autocomplete positioning for LaTeX editing.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useMemo,
} from 'react';
import { EditorState, Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  HighlightStyle,
} from '@codemirror/language';
import {
  closeBrackets,
  closeBracketsKeymap,
  autocompletion,
  completionKeymap,
} from '@codemirror/autocomplete';
import { latex } from 'codemirror-lang-latex';
import { tags } from '@lezer/highlight';
import { cn } from '@/lib/utils';
import { searchSymbols, searchCommands } from '@/lib/latex/symbols';
import type { LaTeXEditorConfig } from '@/types/latex';

// ============================================================================
// Types
// ============================================================================

export interface CodeMirrorEditorHandle {
  insertText: (text: string) => void;
  replaceSelection: (text: string) => void;
  getSelectedText: () => string;
  focus: () => void;
  scrollToLine: (line: number) => void;
  getContent: () => string;
  undo: () => void;
  redo: () => void;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onCursorChange?: (pos: { line: number; column: number }) => void;
  onSelectionChange?: (text: string) => void;
  config: LaTeXEditorConfig;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

// ============================================================================
// LaTeX Autocomplete Source
// ============================================================================

function latexCompletionSource(context: { state: EditorState; pos: number; explicit: boolean }) {
  const word = context.state.doc.sliceString(Math.max(0, context.pos - 30), context.pos);
  const match = word.match(/\\([a-zA-Z]*)$/);
  if (!match) return null;
  const query = match[1];
  if (!query && !context.explicit) return null;
  const from = context.pos - match[0].length;
  const symbolResults = searchSymbols(query || '').slice(0, 8);
  const commandResults = searchCommands(query || '').slice(0, 8);
  const options = [
    ...symbolResults.map((s) => ({ label: s.command, detail: s.description || s.name, type: 'keyword' as const })),
    ...commandResults.map((c) => ({ label: `\\${c.name}`, apply: c.signature || `\\${c.name}{}`, detail: c.description, type: 'function' as const })),
  ];
  const seen = new Set<string>();
  const unique = options.filter((o) => { if (seen.has(o.label)) return false; seen.add(o.label); return true; });
  return unique.length === 0 ? null : { from, options: unique.slice(0, 12) };
}

// ============================================================================
// Keybinding helpers
// ============================================================================

/** Wrap selection (or insert empty wrapper at cursor) with a LaTeX command like \textbf{} */
function wrapSelectionWith(view: EditorView, prefix: string, suffix: string): boolean {
  const sel = view.state.selection.main;
  if (sel.empty) {
    const pos = sel.head;
    const insert = prefix + suffix;
    view.dispatch({ changes: { from: pos, insert }, selection: { anchor: pos + prefix.length } });
  } else {
    const text = view.state.sliceDoc(sel.from, sel.to);
    view.dispatch({ changes: { from: sel.from, to: sel.to, insert: `${prefix}${text}${suffix}` } });
  }
  return true;
}

// ============================================================================
// Highlight styles
// ============================================================================

const latexHighlightLight = HighlightStyle.define([
  { tag: tags.keyword, color: '#7c3aed' },
  { tag: tags.macroName, color: '#2563eb' },
  { tag: tags.typeName, color: '#059669' },
  { tag: tags.string, color: '#b45309' },
  { tag: tags.comment, color: '#6b7280', fontStyle: 'italic' },
  { tag: tags.number, color: '#dc2626' },
  { tag: tags.operator, color: '#7c3aed' },
  { tag: tags.bracket, color: '#6366f1' },
  { tag: tags.meta, color: '#6b7280' },
]);

const latexHighlightDark = HighlightStyle.define([
  { tag: tags.keyword, color: '#a78bfa' },
  { tag: tags.macroName, color: '#60a5fa' },
  { tag: tags.typeName, color: '#34d399' },
  { tag: tags.string, color: '#fbbf24' },
  { tag: tags.comment, color: '#9ca3af', fontStyle: 'italic' },
  { tag: tags.number, color: '#f87171' },
  { tag: tags.operator, color: '#a78bfa' },
  { tag: tags.bracket, color: '#818cf8' },
  { tag: tags.meta, color: '#9ca3af' },
]);

// ============================================================================
// Theme factory
// ============================================================================

function createEditorTheme(config: LaTeXEditorConfig) {
  return EditorView.theme({
    '&': { height: '100%', fontSize: `${config.fontSize}px`, fontFamily: config.fontFamily },
    '.cm-content': { fontFamily: config.fontFamily, padding: '16px 8px', caretColor: 'var(--foreground)' },
    '.cm-gutters': { backgroundColor: 'hsl(var(--muted) / 0.3)', color: 'hsl(var(--muted-foreground) / 0.6)', borderRight: '1px solid hsl(var(--border) / 0.5)' },
    '.cm-activeLineGutter': { backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'var(--foreground)' },
    '.cm-activeLine': { backgroundColor: 'hsl(var(--muted) / 0.3)' },
    '.cm-selectionBackground': { backgroundColor: 'hsl(var(--primary) / 0.2) !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: 'hsl(var(--primary) / 0.25) !important' },
    '.cm-cursor': { borderLeftColor: 'var(--foreground)' },
    '.cm-matchingBracket': { backgroundColor: 'hsl(var(--primary) / 0.2)', outline: '1px solid hsl(var(--primary) / 0.4)' },
    '.cm-foldGutter': { width: '16px' },
    '.cm-foldPlaceholder': { backgroundColor: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))', padding: '0 4px', borderRadius: '4px' },
    '.cm-tooltip': { backgroundColor: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', border: '1px solid hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' },
    '.cm-tooltip-autocomplete > ul > li': { padding: '4px 8px' },
    '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: 'hsl(var(--accent))', color: 'hsl(var(--accent-foreground))' },
    '.cm-panels': { backgroundColor: 'hsl(var(--muted))', color: 'var(--foreground)' },
    '.cm-panels input': { backgroundColor: 'hsl(var(--background))', color: 'var(--foreground)', border: '1px solid hsl(var(--border))', borderRadius: '4px', padding: '2px 6px' },
    '.cm-panels button': { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderRadius: '4px', padding: '2px 8px' },
    '.cm-search': { padding: '8px' },
  });
}

// ============================================================================
// Component
// ============================================================================

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(
  function CodeMirrorEditor(
    { value, onChange, onSave, onCursorChange, onSelectionChange, config, readOnly = false, placeholder = 'Enter LaTeX code here...', className },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef(onChange);
    const onSaveRef = useRef(onSave);
    const onCursorRef = useRef(onCursorChange);
    const onSelectionRef = useRef(onSelectionChange);

    // Keep refs updated
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
    useEffect(() => { onCursorRef.current = onCursorChange; }, [onCursorChange]);
    useEffect(() => { onSelectionRef.current = onSelectionChange; }, [onSelectionChange]);

    // Detect dark mode
    const isDark = useMemo(() => {
      if (config.theme === 'dark') return true;
      if (config.theme === 'light') return false;
      return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }, [config.theme]);

    // Build extensions
    const extensions = useMemo(() => {
      const exts = [
        latex(),
        createEditorTheme(config),
        syntaxHighlighting(isDark ? latexHighlightDark : latexHighlightLight),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        history(),
        drawSelection(),
        indentOnInput(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        highlightSelectionMatches(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        autocompletion({ override: [latexCompletionSource] }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          indentWithTab,
          { key: 'Mod-s', run: () => { onSaveRef.current?.(); return true; } },
          { key: 'Mod-b', run: (view) => wrapSelectionWith(view, '\\textbf{', '}') },
          { key: 'Mod-i', run: (view) => wrapSelectionWith(view, '\\textit{', '}') },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.selectionSet || update.docChanged) {
            const sel = update.state.selection.main;
            const line = update.state.doc.lineAt(sel.head);
            onCursorRef.current?.({ line: line.number, column: sel.head - line.from + 1 });
            if (!sel.empty) {
              onSelectionRef.current?.(update.state.sliceDoc(sel.from, sel.to));
            } else {
              onSelectionRef.current?.('');
            }
          }
        }),
        cmPlaceholder(placeholder),
        EditorState.tabSize.of(config.tabSize ?? 2),
      ];

      if (config.wordWrap) exts.push(EditorView.lineWrapping);
      if (config.lineNumbers) exts.push(lineNumbers());
      if (readOnly) exts.push(EditorState.readOnly.of(true));
      if (config.spellCheck) {
        exts.push(EditorView.contentAttributes.of({ spellcheck: 'true' }) as Extension);
      }

      return exts;
    }, [config, isDark, readOnly, placeholder]);

    // Create editor view
    useEffect(() => {
      if (!containerRef.current) return;

      const state = EditorState.create({ doc: value, extensions });
      const view = new EditorView({ state, parent: containerRef.current });
      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [extensions]);

    // Sync external value changes
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }, [value]);

    // Imperative handle
    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } });
        view.focus();
      },
      replaceSelection: (text: string) => {
        const view = viewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
        view.focus();
      },
      getSelectedText: () => {
        const view = viewRef.current;
        if (!view) return '';
        const sel = view.state.selection.main;
        return view.state.sliceDoc(sel.from, sel.to);
      },
      focus: () => { viewRef.current?.focus(); },
      scrollToLine: (line: number) => {
        const view = viewRef.current;
        if (!view) return;
        const lineInfo = view.state.doc.line(Math.min(line, view.state.doc.lines));
        view.dispatch({ selection: { anchor: lineInfo.from }, effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }) });
        view.focus();
      },
      getContent: () => viewRef.current?.state.doc.toString() ?? '',
      undo: () => { const view = viewRef.current; if (view) undo(view); },
      redo: () => { const view = viewRef.current; if (view) redo(view); },
    }), []);

    return (
      <div
        ref={containerRef}
        className={cn('h-full w-full overflow-hidden [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto', className)}
      />
    );
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default CodeMirrorEditor;
