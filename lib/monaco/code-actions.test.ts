/**
 * @jest-environment jsdom
 */

import { ALL_CODE_ACTIONS, type CodeActionContext } from './code-actions';

// Mock Monaco Range
class MockRange {
  constructor(
    public startLineNumber: number,
    public startColumn: number,
    public endLineNumber: number,
    public endColumn: number
  ) {}
}

// Minimal mock for monaco
const mockMonaco = {
  Range: MockRange,
} as unknown as typeof import('monaco-editor');

function createContext(overrides: Partial<CodeActionContext> = {}): CodeActionContext {
  return {
    model: { uri: 'file:///test.ts', getVersionId: () => 1 } as unknown as CodeActionContext['model'],
    range: new MockRange(1, 1, 1, 20) as unknown as CodeActionContext['range'],
    selectedText: '',
    lineContent: '',
    fullLineRange: { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 20 },
    lineNumber: 1,
    ...overrides,
  };
}

describe('code-actions', () => {
  describe('ALL_CODE_ACTIONS', () => {
    it('should have multiple actions defined', () => {
      expect(ALL_CODE_ACTIONS.length).toBeGreaterThan(10);
    });

    it('should have unique IDs', () => {
      const ids = ALL_CODE_ACTIONS.map(a => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have titles for all actions', () => {
      for (const action of ALL_CODE_ACTIONS) {
        expect(action.title).toBeTruthy();
        expect(action.kind).toBeTruthy();
      }
    });
  });

  describe('wrapInTryCatch', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.wrapInTryCatch')!;

    it('should be applicable to non-empty lines', () => {
      const ctx = createContext({ lineContent: '  doSomething();' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to empty lines', () => {
      const ctx = createContext({ lineContent: '' });
      expect(action.isApplicable(ctx)).toBe(false);
    });

    it('should not be applicable to try blocks', () => {
      const ctx = createContext({ lineContent: 'try {' });
      expect(action.isApplicable(ctx)).toBe(false);
    });

    it('should not be applicable to import statements', () => {
      const ctx = createContext({ lineContent: "import { useState } from 'react';" });
      expect(action.isApplicable(ctx)).toBe(false);
    });

    it('should create valid edit', () => {
      const ctx = createContext({ lineContent: '  doSomething();' });
      const edit = action.createEdit(ctx, mockMonaco);
      expect(edit.edits).toHaveLength(1);
      expect(edit.edits[0].textEdit.text).toContain('try {');
      expect(edit.edits[0].textEdit.text).toContain('catch (error)');
    });
  });

  describe('wrapInAsyncTryCatch', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.wrapInAsyncTryCatch')!;

    it('should be applicable to await expressions', () => {
      const ctx = createContext({ lineContent: '  const data = await fetchData();' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should be applicable to .then() calls', () => {
      const ctx = createContext({ lineContent: '  fetchData().then(data => console.log(data));' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to regular lines', () => {
      const ctx = createContext({ lineContent: '  const x = 5;' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('extractToVariable', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.extractToVariable')!;

    it('should be applicable to selected expressions', () => {
      const ctx = createContext({ selectedText: 'someObject.property + 1' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to declarations', () => {
      const ctx = createContext({ selectedText: 'const x = 5' });
      expect(action.isApplicable(ctx)).toBe(false);
    });

    it('should not be applicable to empty selection', () => {
      const ctx = createContext({ selectedText: '' });
      expect(action.isApplicable(ctx)).toBe(false);
    });

    it('should not be applicable to short text', () => {
      const ctx = createContext({ selectedText: 'x' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('convertToArrowFunction', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.convertToArrowFunction')!;

    it('should be applicable to function declarations', () => {
      const ctx = createContext({ lineContent: 'function handleClick() {' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should be applicable to export function declarations', () => {
      const ctx = createContext({ lineContent: 'export function handleClick() {' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should be applicable to async function declarations', () => {
      const ctx = createContext({ lineContent: 'export async function fetchData() {' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to arrow functions', () => {
      const ctx = createContext({ lineContent: 'const handleClick = () => {' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('surroundWithFragment', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.surroundWithFragment')!;

    it('should be applicable to JSX elements', () => {
      const ctx = createContext({ selectedText: '<div>hello</div>' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should be applicable to self-closing JSX', () => {
      const ctx = createContext({ selectedText: '<Input />' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to empty selection', () => {
      const ctx = createContext({ selectedText: '' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('addOptionalChaining', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.addOptionalChaining')!;

    it('should be applicable to property access', () => {
      const ctx = createContext({ lineContent: 'user.name' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to optional chaining', () => {
      const ctx = createContext({ lineContent: 'user?.name' });
      expect(action.isApplicable(ctx)).toBe(false);
    });

    it('should not be applicable to import statements', () => {
      const ctx = createContext({ lineContent: "import { x } from 'module'" });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('removeOptionalChaining', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.removeOptionalChaining')!;

    it('should be applicable to optional chaining', () => {
      const ctx = createContext({ lineContent: 'user?.name' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable without optional chaining', () => {
      const ctx = createContext({ lineContent: 'user.name' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('convertToTemplateLiteral', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.convertToTemplateLiteral')!;

    it('should be applicable to string concatenation', () => {
      const ctx = createContext({ lineContent: "'hello' + name" });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to template literals', () => {
      const ctx = createContext({ lineContent: '`hello ${name}`' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });

  describe('addConsoleLog', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.addConsoleLog')!;

    it('should be applicable to variable declarations', () => {
      const ctx = createContext({ lineContent: 'const name = "hello";' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should be applicable to selected identifiers', () => {
      const ctx = createContext({ selectedText: 'myVariable', lineContent: 'return myVariable;' });
      expect(action.isApplicable(ctx)).toBe(true);
    });
  });

  describe('convertToNamedExport', () => {
    const action = ALL_CODE_ACTIONS.find(a => a.id === 'refactor.convertToNamedExport')!;

    it('should be applicable to default exports', () => {
      const ctx = createContext({ lineContent: 'export default function MyComponent() {' });
      expect(action.isApplicable(ctx)).toBe(true);
    });

    it('should not be applicable to named exports', () => {
      const ctx = createContext({ lineContent: 'export function MyComponent() {' });
      expect(action.isApplicable(ctx)).toBe(false);
    });
  });
});
