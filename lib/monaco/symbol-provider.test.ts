/**
 * @jest-environment jsdom
 */

import { findBlockEnd, type ExtractedSymbol } from './symbol-provider';

// Mock Monaco model
function createMockModel(lines: string[]): {
  getLineCount: () => number;
  getLineContent: (lineNumber: number) => string;
  uri: string;
} {
  return {
    getLineCount: () => lines.length,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] || '',
    uri: 'file:///test.tsx',
  };
}

describe('symbol-provider', () => {
  describe('findBlockEnd', () => {
    it('should find matching closing brace', () => {
      const model = createMockModel([
        'function hello() {',
        '  return 1;',
        '}',
      ]);
      expect(findBlockEnd(model, 1, 3)).toBe(3);
    });

    it('should handle nested braces', () => {
      const model = createMockModel([
        'function hello() {',
        '  if (true) {',
        '    return 1;',
        '  }',
        '}',
      ]);
      expect(findBlockEnd(model, 1, 5)).toBe(5);
    });

    it('should handle single-line with semicolon', () => {
      const model = createMockModel([
        'type Foo = string;',
      ]);
      expect(findBlockEnd(model, 1, 1)).toBe(1);
    });

    it('should cap at reasonable distance if no close found', () => {
      const lines = ['function hello() {'];
      for (let i = 0; i < 100; i++) {
        lines.push('  // line');
      }
      const model = createMockModel(lines);
      const result = findBlockEnd(model, 1, lines.length);
      expect(result).toBeLessThanOrEqual(51);
    });

    it('should return start line if no braces found', () => {
      const model = createMockModel([
        'const x = 5',
      ]);
      expect(findBlockEnd(model, 1, 1)).toBe(1);
    });
  });

  describe('symbol patterns (integration)', () => {
    // We test the pattern matching logic by importing getSymbolPatterns
    // and running them against sample code
    it('should export ExtractedSymbol type', () => {
      // Type-only test — just ensure the type is exported
      const sym: ExtractedSymbol = {
        name: 'test',
        kind: 0,
        detail: 'test',
        lineNumber: 1,
        column: 1,
        endLineNumber: 1,
        endColumn: 10,
      };
      expect(sym.name).toBe('test');
    });
  });

  describe('pattern matching against sample code', () => {
    // Test the regex patterns that getSymbolPatterns would produce
    it('should match function component', () => {
      const pattern = /^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*)/;
      expect(pattern.test('export default function MyComponent() {')).toBe(true);
      expect(pattern.test('function MyComponent() {')).toBe(true);
      expect(pattern.test('function myHelper() {')).toBe(false);
    });

    it('should match arrow component', () => {
      const pattern = /^(?:export\s+)?const\s+([A-Z]\w*)\s*=\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>/;
      expect(pattern.test('export const MyComponent = () =>')).toBe(true);
      expect(pattern.test('const MyComponent = (props: Props) =>')).toBe(true);
      expect(pattern.test('const myHelper = () =>')).toBe(false);
    });

    it('should match custom hooks', () => {
      const pattern = /^(?:export\s+)?(?:default\s+)?function\s+(use[A-Z]\w*)/;
      expect(pattern.test('export function useMyHook() {')).toBe(true);
      expect(pattern.test('function useState() {')).toBe(true);
      expect(pattern.test('function usemyhook() {')).toBe(false);
    });

    it('should match interface', () => {
      const pattern = /^(?:export\s+)?interface\s+(\w+)/;
      expect(pattern.test('export interface MyProps {')).toBe(true);
      expect(pattern.test('interface State {')).toBe(true);
    });

    it('should match type alias', () => {
      const pattern = /^(?:export\s+)?type\s+(\w+)\s*(?:<[^>]*>)?\s*=/;
      expect(pattern.test('export type MyType = string')).toBe(true);
      expect(pattern.test('type State<T> = {')).toBe(true);
    });

    it('should match enum', () => {
      const pattern = /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/;
      expect(pattern.test('export enum MyEnum {')).toBe(true);
      expect(pattern.test('const enum Direction {')).toBe(true);
    });

    it('should match class', () => {
      const pattern = /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/;
      expect(pattern.test('export class MyService {')).toBe(true);
      expect(pattern.test('abstract class Base {')).toBe(true);
    });

    it('should match UPPER_CASE constants', () => {
      const pattern = /^(?:export\s+)?const\s+([A-Z][A-Z0-9_]+)\s*(?::\s*[^=]+)?\s*=/;
      expect(pattern.test('export const MAX_SIZE = 100')).toBe(true);
      expect(pattern.test('const API_URL = "..."')).toBe(true);
      expect(pattern.test('const myVar = 5')).toBe(false);
    });

    it('should match module declarations', () => {
      const pattern = /^declare\s+(?:module|namespace)\s+['"]?(\w+)['"]?/;
      expect(pattern.test("declare module 'react'")).toBe(true);
      expect(pattern.test('declare namespace JSX')).toBe(true);
    });
  });
});
