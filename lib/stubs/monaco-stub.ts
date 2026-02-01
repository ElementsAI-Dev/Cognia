/**
 * SSR Runtime Stub for monaco-editor
 * 
 * IMPORTANT: Monaco Editor provides official TypeScript types bundled with the package.
 * For TypeScript types, use:
 *   import type { editor, languages, Range, Position } from 'monaco-editor'
 * or:
 *   import type * as Monaco from 'monaco-editor'
 * 
 * This stub is ONLY for SSR (Server-Side Rendering) runtime safety.
 * It provides mock implementations to prevent crashes during SSR when
 * monaco-editor is dynamically imported but the DOM is not available.
 * 
 * Use @monaco-editor/react for React integration - it handles SSR automatically.
 * 
 * Updated for Monaco Editor v0.55.1 API surface
 */

import { loggers } from '@/lib/logger';

const log = loggers.app;

const noopDisposable = { dispose: () => {} };

const createMockRange = () => ({
  startLineNumber: 1,
  startColumn: 1,
  endLineNumber: 1,
  endColumn: 1,
});

const createMockPosition = () => ({
  lineNumber: 1,
  column: 1,
});

const createMockModel = () => ({
  getValue: () => '',
  setValue: (_value: string) => {},
  getValueInRange: (_range: unknown) => '',
  getLineContent: (_lineNumber: number) => '',
  getLineCount: () => 1,
  getWordAtPosition: (_position: unknown) => null,
  getWordUntilPosition: (_position: unknown) => ({ word: '', startColumn: 1, endColumn: 1 }),
  onDidChangeContent: (_callback: () => void) => noopDisposable,
  dispose: () => {},
});

export const editor = {
  create: (_container: HTMLElement, _options?: unknown) => {
    log.warn('monaco-editor direct import is not available. Use @monaco-editor/react instead.');
    return {
      getValue: () => '',
      setValue: (_value: string) => {},
      getModel: () => createMockModel(),
      getPosition: () => createMockPosition(),
      getSelection: () => createMockRange(),
      setPosition: (_position: unknown) => {},
      setSelection: (_selection: unknown) => {},
      getScrolledVisiblePosition: (_position: unknown) => ({ top: 0, left: 0, height: 0 }),
      focus: () => {},
      layout: () => {},
      dispose: () => {},
      onDidChangeModelContent: (_callback: () => void) => noopDisposable,
      onDidChangeCursorPosition: (_callback: () => void) => noopDisposable,
      onDidChangeCursorSelection: (_callback: () => void) => noopDisposable,
      onDidFocusEditorWidget: (_callback: () => void) => noopDisposable,
      onDidBlurEditorWidget: (_callback: () => void) => noopDisposable,
      addCommand: (_keybinding: number, _handler: () => void) => '',
      addAction: (_action: unknown) => noopDisposable,
      executeEdits: (_source: string, _edits: unknown[]) => true,
      revealLine: (_lineNumber: number) => {},
      revealLineInCenter: (_lineNumber: number) => {},
      trigger: (_source: string, _handlerId: string, _payload: unknown) => {},
      updateOptions: (_options: unknown) => {},
    };
  },
  createModel: (_value: string, _language?: string) => createMockModel(),
  setTheme: (_theme: string) => {},
  defineTheme: (_themeName: string, _themeData: unknown) => {},
  setModelLanguage: (_model: unknown, _languageId: string) => {},
  getModels: () => [],
  onDidCreateModel: (_callback: () => void) => noopDisposable,
  onWillDisposeModel: (_callback: () => void) => noopDisposable,
};

export const KeyMod = {
  CtrlCmd: 2048,
  Shift: 1024,
  Alt: 512,
  WinCtrl: 256,
};

export const KeyCode = {
  Backspace: 1,
  Tab: 2,
  Enter: 3,
  Escape: 9,
  Space: 10,
  Delete: 20,
  KeyA: 31,
  KeyB: 32,
  KeyC: 33,
  KeyD: 34,
  KeyE: 35,
  KeyF: 36,
  KeyG: 37,
  KeyH: 38,
  KeyI: 39,
  KeyJ: 40,
  KeyK: 41,
  KeyL: 42,
  KeyM: 43,
  KeyN: 44,
  KeyO: 45,
  KeyP: 46,
  KeyQ: 47,
  KeyR: 48,
  KeyS: 49,
  KeyT: 50,
  KeyU: 51,
  KeyV: 52,
  KeyW: 53,
  KeyX: 54,
  KeyY: 55,
  KeyZ: 56,
  F1: 59,
  F2: 60,
  F3: 61,
  F4: 62,
  F5: 63,
  F6: 64,
  F7: 65,
  F8: 66,
  F9: 67,
  F10: 68,
  F11: 69,
  F12: 70,
};

export const languages = {
  register: (_language: unknown) => {},
  getLanguages: () => [],
  setMonarchTokensProvider: (_languageId: string, _languageDef: unknown) => noopDisposable,
  setLanguageConfiguration: (_languageId: string, _configuration: unknown) => noopDisposable,
  registerCompletionItemProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerHoverProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerSignatureHelpProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerDocumentFormattingEditProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerDocumentRangeFormattingEditProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerDefinitionProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerReferenceProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerDocumentSymbolProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerCodeActionProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerCodeLensProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerInlayHintsProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerFoldingRangeProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerColorProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  registerLinkProvider: (_languageId: string, _provider: unknown) => noopDisposable,
  CompletionItemKind: {
    Text: 0,
    Method: 1,
    Function: 2,
    Constructor: 3,
    Field: 4,
    Variable: 5,
    Class: 6,
    Interface: 7,
    Module: 8,
    Property: 9,
    Unit: 10,
    Value: 11,
    Enum: 12,
    Keyword: 13,
    Snippet: 14,
    Color: 15,
    File: 16,
    Reference: 17,
    Folder: 18,
    EnumMember: 19,
    Constant: 20,
    Struct: 21,
    Event: 22,
    Operator: 23,
    TypeParameter: 24,
  },
  CompletionItemInsertTextRule: {
    None: 0,
    InsertAsSnippet: 4,
  },
};

export const Range = class {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;

  constructor(
    startLineNumber: number,
    startColumn: number,
    endLineNumber: number,
    endColumn: number
  ) {
    this.startLineNumber = startLineNumber;
    this.startColumn = startColumn;
    this.endLineNumber = endLineNumber;
    this.endColumn = endColumn;
  }

  isEmpty() {
    return (
      this.startLineNumber === this.endLineNumber &&
      this.startColumn === this.endColumn
    );
  }

  containsPosition(_position: unknown) {
    return false;
  }

  containsRange(_range: unknown) {
    return false;
  }
};

export const Position = class {
  lineNumber: number;
  column: number;

  constructor(lineNumber: number, column: number) {
    this.lineNumber = lineNumber;
    this.column = column;
  }
};

export const Uri = {
  parse: (_value: string) => ({ toString: () => _value }),
  file: (_path: string) => ({ toString: () => `file://${_path}` }),
};

export const MarkerSeverity = {
  Hint: 1,
  Info: 2,
  Warning: 4,
  Error: 8,
};

const monacoStub = {
  editor,
  KeyMod,
  KeyCode,
  languages,
  Range,
  Position,
  Uri,
  MarkerSeverity,
};

export default monacoStub;
