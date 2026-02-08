/**
 * Monaco Editor Document Symbol Provider
 * Provides document symbols for breadcrumbs and Go-to-Symbol (Ctrl+Shift+O)
 * Parses React components, hooks, interfaces, types, functions, classes
 */

import type * as Monaco from 'monaco-editor';

// ============================================================
// Symbol Extraction Patterns
// ============================================================

interface SymbolPattern {
  /** Regex to match the symbol declaration */
  pattern: RegExp;
  /** Monaco SymbolKind */
  kind: number; // Monaco.languages.SymbolKind
  /** Function to extract the symbol name from regex match */
  getName: (match: RegExpMatchArray) => string;
  /** Optional detail text */
  getDetail?: (match: RegExpMatchArray) => string;
}

/**
 * Get all symbol patterns with Monaco SymbolKind constants
 * Must pass monaco to access SymbolKind enum at runtime
 */
function getSymbolPatterns(monaco: typeof Monaco): SymbolPattern[] {
  return [
    // React Component: export function ComponentName / export const ComponentName = 
    {
      pattern: /^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*)/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'React Component',
    },
    {
      pattern: /^(?:export\s+)?const\s+([A-Z]\w*)\s*(?::\s*(?:React\.)?FC|=\s*(?:React\.)?(?:memo|forwardRef|lazy)\s*\()/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'React Component',
    },
    {
      pattern: /^(?:export\s+)?const\s+([A-Z]\w*)\s*=\s*\([^)]*\)\s*(?::\s*\w+)?\s*=>/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'React Component (arrow)',
    },

    // Custom Hook: export function useXxx / const useXxx =
    {
      pattern: /^(?:export\s+)?(?:default\s+)?function\s+(use[A-Z]\w*)/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'React Hook',
    },
    {
      pattern: /^(?:export\s+)?const\s+(use[A-Z]\w*)\s*=/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'React Hook',
    },

    // Regular function: export function name / function name
    {
      pattern: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+([a-z]\w*)/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'Function',
    },

    // Arrow function: export const name = (...) =>
    {
      pattern: /^(?:export\s+)?const\s+([a-z]\w*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*[^=]+)?\s*=>/,
      kind: monaco.languages.SymbolKind.Function,
      getName: (m) => m[1],
      getDetail: () => 'Arrow Function',
    },

    // Interface: export interface Name
    {
      pattern: /^(?:export\s+)?interface\s+(\w+)/,
      kind: monaco.languages.SymbolKind.Interface,
      getName: (m) => m[1],
      getDetail: () => 'Interface',
    },

    // Type alias: export type Name =
    {
      pattern: /^(?:export\s+)?type\s+(\w+)\s*(?:<[^>]*>)?\s*=/,
      kind: monaco.languages.SymbolKind.TypeParameter,
      getName: (m) => m[1],
      getDetail: () => 'Type',
    },

    // Enum: export enum Name
    {
      pattern: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/,
      kind: monaco.languages.SymbolKind.Enum,
      getName: (m) => m[1],
      getDetail: () => 'Enum',
    },

    // Class: export class Name
    {
      pattern: /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/,
      kind: monaco.languages.SymbolKind.Class,
      getName: (m) => m[1],
      getDetail: () => 'Class',
    },

    // Constant: export const NAME = (UPPER_CASE constants)
    {
      pattern: /^(?:export\s+)?const\s+([A-Z][A-Z0-9_]+)\s*(?::\s*[^=]+)?\s*=/,
      kind: monaco.languages.SymbolKind.Constant,
      getName: (m) => m[1],
      getDetail: () => 'Constant',
    },

    // Variable: export const name = (non-function, non-component)
    {
      pattern: /^(?:export\s+)?(?:const|let|var)\s+([a-z]\w*)\s*(?::\s*[^=]+)?\s*=\s*(?!(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>)/,
      kind: monaco.languages.SymbolKind.Variable,
      getName: (m) => m[1],
      getDetail: () => 'Variable',
    },

    // Namespace/Module: declare module / declare namespace
    {
      pattern: /^declare\s+(?:module|namespace)\s+['"]?(\w+)['"]?/,
      kind: monaco.languages.SymbolKind.Module,
      getName: (m) => m[1],
      getDetail: () => 'Module Declaration',
    },
  ];
}

// ============================================================
// Symbol Extraction
// ============================================================

interface ExtractedSymbol {
  name: string;
  kind: number;
  detail: string;
  lineNumber: number;
  column: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Extract symbols from document text
 */
function extractSymbols(
  model: Monaco.editor.ITextModel,
  patterns: SymbolPattern[]
): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = [];
  const lineCount = model.getLineCount();
  const seenNames = new Set<string>();

  for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
    const lineContent = model.getLineContent(lineNumber).trim();

    // Skip empty lines, comments, imports
    if (!lineContent || lineContent.startsWith('//') || lineContent.startsWith('/*') ||
        lineContent.startsWith('*') || lineContent.startsWith('import ') ||
        lineContent.startsWith("'use ") || lineContent.startsWith('"use ')) {
      continue;
    }

    for (const sp of patterns) {
      const match = lineContent.match(sp.pattern);
      if (match) {
        const name = sp.getName(match);
        // Avoid duplicates (first match wins for same name)
        const key = `${name}:${sp.kind}`;
        if (seenNames.has(key)) continue;
        seenNames.add(key);

        // Find the end of the declaration block
        const endLine = findBlockEnd(model, lineNumber, lineCount);

        symbols.push({
          name,
          kind: sp.kind,
          detail: sp.getDetail?.(match) || '',
          lineNumber,
          column: 1,
          endLineNumber: endLine,
          endColumn: model.getLineContent(endLine).length + 1,
        });
        break; // Only match first pattern per line
      }
    }
  }

  return symbols;
}

/**
 * Find the end of a code block starting at a given line
 * Tracks brace depth to find matching closing brace
 */
function findBlockEnd(model: Monaco.editor.ITextModel, startLine: number, maxLine: number): number {
  let braceDepth = 0;
  let foundOpenBrace = false;

  for (let line = startLine; line <= maxLine; line++) {
    const content = model.getLineContent(line);
    for (const ch of content) {
      if (ch === '{') {
        braceDepth++;
        foundOpenBrace = true;
      } else if (ch === '}') {
        braceDepth--;
        if (foundOpenBrace && braceDepth === 0) {
          return line;
        }
      }
    }
    // For single-line declarations without braces (e.g., type aliases)
    if (line === startLine && !foundOpenBrace && content.endsWith(';')) {
      return line;
    }
  }

  // If no block end found, return the start line
  return foundOpenBrace ? Math.min(startLine + 50, maxLine) : startLine;
}

// ============================================================
// Registration
// ============================================================

/**
 * Register document symbol provider for Monaco
 */
export function registerDocumentSymbolProvider(
  monaco: typeof Monaco,
  languages: string[] = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact']
): Monaco.IDisposable[] {
  const disposables: Monaco.IDisposable[] = [];
  const patterns = getSymbolPatterns(monaco);

  for (const lang of languages) {
    const disposable = monaco.languages.registerDocumentSymbolProvider(lang, {
      displayName: 'Cognia Symbol Provider',
      provideDocumentSymbols: (model) => {
        const extracted = extractSymbols(model, patterns);

        return extracted.map((sym) => ({
          name: sym.name,
          detail: sym.detail,
          kind: sym.kind as Monaco.languages.SymbolKind,
          tags: [],
          range: {
            startLineNumber: sym.lineNumber,
            startColumn: sym.column,
            endLineNumber: sym.endLineNumber,
            endColumn: sym.endColumn,
          },
          selectionRange: {
            startLineNumber: sym.lineNumber,
            startColumn: sym.column,
            endLineNumber: sym.lineNumber,
            endColumn: sym.column + sym.name.length,
          },
        }));
      },
    });
    disposables.push(disposable);
  }

  return disposables;
}

// Export for testing
export {
  getSymbolPatterns,
  extractSymbols,
  findBlockEnd,
  type ExtractedSymbol,
  type SymbolPattern,
};
