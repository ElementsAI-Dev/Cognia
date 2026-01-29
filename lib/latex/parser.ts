/**
 * LaTeX Parser
 * Parses LaTeX source code for syntax highlighting, error detection, and autocomplete
 */

import type {
  LaTeXError,
  LaTeXErrorType,
  LaTeXErrorSeverity,
  CursorPosition,
  LaTeXDocumentMetadata,
} from '@/types/latex';

// ============================================================================
// Token Types
// ============================================================================

export type LaTeXTokenType =
  | 'command'
  | 'environment-begin'
  | 'environment-end'
  | 'environment-name'
  | 'math-inline'
  | 'math-display'
  | 'comment'
  | 'text'
  | 'brace-open'
  | 'brace-close'
  | 'bracket-open'
  | 'bracket-close'
  | 'parameter'
  | 'newline'
  | 'whitespace'
  | 'special'
  | 'unknown';

export interface LaTeXToken {
  type: LaTeXTokenType;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

// ============================================================================
// AST Node Types
// ============================================================================

export type LaTeXNodeType =
  | 'document'
  | 'preamble'
  | 'body'
  | 'command'
  | 'environment'
  | 'group'
  | 'text'
  | 'math-inline'
  | 'math-display'
  | 'comment'
  | 'newline'
  | 'parameter';

export interface LaTeXNode {
  type: LaTeXNodeType;
  value?: string;
  name?: string;
  children?: LaTeXNode[];
  parameters?: LaTeXNode[];
  optionalParameters?: LaTeXNode[];
  start: number;
  end: number;
  line: number;
  column: number;
}

// ============================================================================
// Parser State
// ============================================================================

interface ParserState {
  source: string;
  position: number;
  line: number;
  column: number;
  errors: LaTeXError[];
  tokens: LaTeXToken[];
  environmentStack: string[];
  mathMode: boolean;
  mathDelimiter?: string;
}

// ============================================================================
// Tokenizer
// ============================================================================

/**
 * Tokenize LaTeX source code
 */
export function tokenize(source: string): { tokens: LaTeXToken[]; errors: LaTeXError[] } {
  const state: ParserState = {
    source,
    position: 0,
    line: 1,
    column: 1,
    errors: [],
    tokens: [],
    environmentStack: [],
    mathMode: false,
  };

  while (state.position < source.length) {
    const char = source[state.position];

    if (char === '%') {
      tokenizeComment(state);
    } else if (char === '\\') {
      tokenizeCommand(state);
    } else if (char === '$') {
      tokenizeMath(state);
    } else if (char === '{') {
      addToken(state, 'brace-open', '{');
    } else if (char === '}') {
      addToken(state, 'brace-close', '}');
    } else if (char === '[') {
      addToken(state, 'bracket-open', '[');
    } else if (char === ']') {
      addToken(state, 'bracket-close', ']');
    } else if (char === '\n') {
      addToken(state, 'newline', '\n');
      state.line++;
      state.column = 1;
      state.position++;
      continue;
    } else if (/\s/.test(char)) {
      tokenizeWhitespace(state);
    } else if (/[&~^_]/.test(char)) {
      addToken(state, 'special', char);
    } else {
      tokenizeText(state);
    }
  }

  return { tokens: state.tokens, errors: state.errors };
}

function addToken(state: ParserState, type: LaTeXTokenType, value: string): void {
  state.tokens.push({
    type,
    value,
    start: state.position,
    end: state.position + value.length,
    line: state.line,
    column: state.column,
  });
  state.position += value.length;
  state.column += value.length;
}

function tokenizeComment(state: ParserState): void {
  const start = state.position;
  let end = state.source.indexOf('\n', start);
  if (end === -1) end = state.source.length;

  const value = state.source.slice(start, end);
  state.tokens.push({
    type: 'comment',
    value,
    start,
    end,
    line: state.line,
    column: state.column,
  });

  state.position = end;
  state.column += value.length;
}

function tokenizeCommand(state: ParserState): void {
  const start = state.position;
  state.position++; // Skip backslash

  // Check for special commands
  const nextChar = state.source[state.position];
  if (nextChar && /[^a-zA-Z]/.test(nextChar)) {
    // Single character command like \\ or \$
    const value = '\\' + nextChar;
    state.tokens.push({
      type: 'command',
      value,
      start,
      end: state.position + 1,
      line: state.line,
      column: state.column,
    });
    state.position++;
    state.column += 2;
    return;
  }

  // Read command name
  let end = state.position;
  while (end < state.source.length && /[a-zA-Z@*]/.test(state.source[end])) {
    end++;
  }

  const value = state.source.slice(start, end);
  const commandName = value.slice(1);

  // Check for environment commands
  if (commandName === 'begin' || commandName === 'end') {
    state.tokens.push({
      type: commandName === 'begin' ? 'environment-begin' : 'environment-end',
      value,
      start,
      end,
      line: state.line,
      column: state.column,
    });

    // Try to extract environment name
    const afterCommand = state.source.slice(end);
    const envMatch = afterCommand.match(/^\s*\{([^}]+)\}/);
    if (envMatch) {
      const envName = envMatch[1];
      if (commandName === 'begin') {
        state.environmentStack.push(envName);
      } else {
        const expected = state.environmentStack.pop();
        if (expected && expected !== envName) {
          state.errors.push(createError(
            'unbalanced-environment',
            `Environment mismatch: expected \\end{${expected}}, got \\end{${envName}}`,
            state.line,
            state.column,
            'error'
          ));
        }
      }
    }
  } else {
    state.tokens.push({
      type: 'command',
      value,
      start,
      end,
      line: state.line,
      column: state.column,
    });
  }

  state.column += end - start;
  state.position = end;
}

function tokenizeMath(state: ParserState): void {
  const _start = state.position;

  // Check for display math ($$)
  if (state.source[state.position + 1] === '$') {
    if (state.mathMode && state.mathDelimiter === '$$') {
      // End display math
      state.mathMode = false;
      state.mathDelimiter = undefined;
      addToken(state, 'math-display', '$$');
    } else if (!state.mathMode) {
      // Start display math
      state.mathMode = true;
      state.mathDelimiter = '$$';
      addToken(state, 'math-display', '$$');
    } else {
      // Nested math mode error
      state.errors.push(createError(
        'math-error',
        'Cannot nest display math inside inline math',
        state.line,
        state.column,
        'error'
      ));
      addToken(state, 'math-display', '$$');
    }
  } else {
    // Inline math ($)
    if (state.mathMode && state.mathDelimiter === '$') {
      // End inline math
      state.mathMode = false;
      state.mathDelimiter = undefined;
      addToken(state, 'math-inline', '$');
    } else if (!state.mathMode) {
      // Start inline math
      state.mathMode = true;
      state.mathDelimiter = '$';
      addToken(state, 'math-inline', '$');
    } else {
      // Math mode mismatch
      state.errors.push(createError(
        'math-error',
        'Cannot start inline math inside display math',
        state.line,
        state.column,
        'error'
      ));
      addToken(state, 'math-inline', '$');
    }
  }
}

function tokenizeWhitespace(state: ParserState): void {
  const start = state.position;
  let end = start;

  while (end < state.source.length && /[ \t]/.test(state.source[end])) {
    end++;
  }

  const value = state.source.slice(start, end);
  state.tokens.push({
    type: 'whitespace',
    value,
    start,
    end,
    line: state.line,
    column: state.column,
  });

  state.column += value.length;
  state.position = end;
}

function tokenizeText(state: ParserState): void {
  const start = state.position;
  let end = start;

  while (end < state.source.length) {
    const char = state.source[end];
    if (/[\\$%{}\[\]\n&~^_]/.test(char) || /\s/.test(char)) {
      break;
    }
    end++;
  }

  if (end > start) {
    const value = state.source.slice(start, end);
    state.tokens.push({
      type: 'text',
      value,
      start,
      end,
      line: state.line,
      column: state.column,
    });

    state.column += value.length;
    state.position = end;
  }
}

// ============================================================================
// Error Helpers
// ============================================================================

function createError(
  type: LaTeXErrorType,
  message: string,
  line: number,
  column: number,
  severity: LaTeXErrorSeverity
): LaTeXError {
  return {
    id: `error-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    severity,
    message,
    line,
    column,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate LaTeX source and return errors
 */
export function validate(source: string): LaTeXError[] {
  const errors: LaTeXError[] = [];
  const { tokens, errors: tokenErrors } = tokenize(source);
  errors.push(...tokenErrors);

  // Check for unbalanced braces
  const braceStack: { char: string; line: number; column: number }[] = [];
  for (const token of tokens) {
    if (token.type === 'brace-open') {
      braceStack.push({ char: '{', line: token.line, column: token.column });
    } else if (token.type === 'brace-close') {
      if (braceStack.length === 0) {
        errors.push(createError(
          'unbalanced-braces',
          'Unexpected closing brace',
          token.line,
          token.column,
          'error'
        ));
      } else {
        braceStack.pop();
      }
    }
  }

  for (const brace of braceStack) {
    errors.push(createError(
      'unbalanced-braces',
      'Unclosed brace',
      brace.line,
      brace.column,
      'error'
    ));
  }

  // Check for unclosed math mode
  const { tokens: finalTokens } = tokenize(source);
  let mathOpen = false;
  let mathOpenLine = 0;
  let mathOpenColumn = 0;

  for (const token of finalTokens) {
    if (token.type === 'math-inline' || token.type === 'math-display') {
      if (!mathOpen) {
        mathOpen = true;
        mathOpenLine = token.line;
        mathOpenColumn = token.column;
      } else {
        mathOpen = false;
      }
    }
  }

  if (mathOpen) {
    errors.push(createError(
      'math-error',
      'Unclosed math mode',
      mathOpenLine,
      mathOpenColumn,
      'error'
    ));
  }

  // Check for common command errors
  validateCommands(tokens, errors);

  return errors;
}

function validateCommands(tokens: LaTeXToken[], errors: LaTeXError[]): void {
  const validCommands = new Set([
    // Common commands
    'documentclass', 'usepackage', 'begin', 'end', 'title', 'author', 'date',
    'maketitle', 'tableofcontents', 'section', 'subsection', 'subsubsection',
    'chapter', 'part', 'paragraph', 'subparagraph',
    // Text formatting
    'textbf', 'textit', 'texttt', 'textrm', 'textsf', 'textsc', 'emph', 'underline',
    // Math
    'frac', 'dfrac', 'tfrac', 'sqrt', 'sum', 'prod', 'int', 'oint', 'lim',
    'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'max', 'min',
    // Math formatting
    'mathbf', 'mathit', 'mathrm', 'mathcal', 'mathbb', 'mathfrak', 'mathsf',
    // Spacing
    'quad', 'qquad', 'hspace', 'vspace', 'newline', 'linebreak', 'pagebreak',
    // References
    'label', 'ref', 'eqref', 'cite', 'bibliography', 'bibliographystyle',
    // Graphics
    'includegraphics', 'caption', 'centering',
    // Lists
    'item',
    // Tables
    'hline', 'cline', 'multicolumn', 'multirow',
    // Greek letters (lowercase)
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta',
    'theta', 'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi',
    'varpi', 'rho', 'varrho', 'sigma', 'varsigma', 'tau', 'upsilon', 'phi',
    'varphi', 'chi', 'psi', 'omega',
    // Greek letters (uppercase)
    'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi', 'Psi', 'Omega',
    // Operators
    'times', 'div', 'cdot', 'pm', 'mp', 'cup', 'cap', 'oplus', 'otimes',
    // Relations
    'leq', 'geq', 'neq', 'approx', 'equiv', 'sim', 'subset', 'supset', 'in', 'notin',
    // Arrows
    'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'leftrightarrow', 'Leftrightarrow',
    'to', 'gets', 'mapsto', 'implies', 'iff',
    // Delimiters
    'left', 'right', 'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil',
    // Accents
    'hat', 'check', 'breve', 'acute', 'grave', 'tilde', 'bar', 'vec', 'dot', 'ddot',
    'overline', 'underline', 'overbrace', 'underbrace', 'widehat', 'widetilde',
    // Misc
    'infty', 'partial', 'nabla', 'forall', 'exists', 'neg', 'emptyset', 'therefore',
    'ldots', 'cdots', 'vdots', 'ddots', 'dots',
    // Special characters
    '\\', '$', '%', '&', '#', '_', '{', '}', ' ', ',', ';', ':', '!', '|',
    // More commands
    'newcommand', 'renewcommand', 'newenvironment', 'renewenvironment',
    'def', 'let', 'input', 'include', 'footnote', 'thanks',
  ]);

  for (const token of tokens) {
    if (token.type === 'command') {
      const cmdName = token.value.slice(1); // Remove backslash
      if (cmdName.length > 0 && !validCommands.has(cmdName) && !/^[^a-zA-Z]$/.test(cmdName)) {
        // Only warn if it looks like a real command name
        if (/^[a-zA-Z]+$/.test(cmdName)) {
          errors.push({
            id: `warn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: 'undefined-command',
            severity: 'warning',
            message: `Unknown command: \\${cmdName}`,
            line: token.line,
            column: token.column,
            suggestion: `Did you mean to use a different command or define \\${cmdName}?`,
          });
        }
      }
    }
  }
}

// ============================================================================
// Metadata Extraction
// ============================================================================

/**
 * Extract document metadata from LaTeX source
 */
export function extractMetadata(source: string): LaTeXDocumentMetadata {
  const metadata: LaTeXDocumentMetadata = {
    packages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    wordCount: 0,
    characterCount: source.length,
  };

  // Extract document class
  const docClassMatch = source.match(/\\documentclass(?:\[([^\]]*)\])?\{([^}]+)\}/);
  if (docClassMatch) {
    metadata.documentClass = docClassMatch[2];
  }

  // Extract packages
  const packageRegex = /\\usepackage(?:\[([^\]]*)\])?\{([^}]+)\}/g;
  let packageMatch;
  while ((packageMatch = packageRegex.exec(source)) !== null) {
    const packages = packageMatch[2].split(',').map((p) => p.trim());
    metadata.packages.push(...packages);
  }

  // Extract title
  const titleMatch = source.match(/\\title\{([^}]+)\}/);
  if (titleMatch) {
    metadata.title = titleMatch[1];
  }

  // Extract author
  const authorMatch = source.match(/\\author\{([^}]+)\}/);
  if (authorMatch) {
    metadata.author = authorMatch[1];
  }

  // Extract date
  const dateMatch = source.match(/\\date\{([^}]+)\}/);
  if (dateMatch) {
    metadata.date = dateMatch[1];
  }

  // Extract bibliography
  const bibMatch = source.match(/\\bibliography\{([^}]+)\}/);
  if (bibMatch) {
    metadata.bibliography = bibMatch[1];
  }

  // Count words (rough estimate)
  const textContent = source
    .replace(/%.*/g, '') // Remove comments
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, ' ') // Remove commands
    .replace(/\$[^$]+\$/g, ' ') // Remove inline math
    .replace(/\$\$[^$]+\$\$/g, ' '); // Remove display math

  const words = textContent.split(/\s+/).filter((w) => w.length > 0);
  metadata.wordCount = words.length;

  return metadata;
}

// ============================================================================
// Position Utilities
// ============================================================================

/**
 * Convert offset to line and column
 */
export function offsetToPosition(source: string, offset: number): CursorPosition {
  let line = 1;
  let column = 1;
  let currentOffset = 0;

  for (let i = 0; i < source.length && i < offset; i++) {
    if (source[i] === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    currentOffset++;
  }

  return { line, column, offset: currentOffset };
}

/**
 * Convert line and column to offset
 */
export function positionToOffset(source: string, line: number, column: number): number {
  let currentLine = 1;
  let currentColumn = 1;
  let offset = 0;

  while (offset < source.length) {
    if (currentLine === line && currentColumn === column) {
      return offset;
    }

    if (source[offset] === '\n') {
      currentLine++;
      currentColumn = 1;
    } else {
      currentColumn++;
    }
    offset++;
  }

  return offset;
}

/**
 * Get the token at a specific position
 */
export function getTokenAtPosition(
  tokens: LaTeXToken[],
  line: number,
  column: number
): LaTeXToken | undefined {
  for (const token of tokens) {
    if (token.line === line) {
      const tokenEndColumn = token.column + token.value.length;
      if (column >= token.column && column <= tokenEndColumn) {
        return token;
      }
    }
  }
  return undefined;
}

/**
 * Get the context at a specific position (for autocomplete)
 */
export function getContextAtPosition(
  source: string,
  tokens: LaTeXToken[],
  line: number,
  column: number
): {
  inMath: boolean;
  inEnvironment: string | null;
  precedingCommand: string | null;
  precedingText: string;
} {
  let inMath = false;
  let inEnvironment: string | null = null;
  let precedingCommand: string | null = null;
  const environmentStack: string[] = [];

  for (const token of tokens) {
    // Stop if we've passed the position
    if (token.line > line || (token.line === line && token.column > column)) {
      break;
    }

    if (token.type === 'math-inline' || token.type === 'math-display') {
      inMath = !inMath;
    }

    if (token.type === 'environment-begin') {
      // Extract environment name from next tokens
      const idx = tokens.indexOf(token);
      for (let i = idx + 1; i < tokens.length && i < idx + 5; i++) {
        if (tokens[i].type === 'text' || tokens[i].value.match(/^[a-zA-Z*]+$/)) {
          environmentStack.push(tokens[i].value);
          break;
        }
      }
    }

    if (token.type === 'environment-end') {
      environmentStack.pop();
    }

    if (token.type === 'command') {
      precedingCommand = token.value;
    }
  }

  inEnvironment = environmentStack.length > 0 ? environmentStack[environmentStack.length - 1] : null;

  // Get preceding text for autocomplete
  const offset = positionToOffset(source, line, column);
  let start = offset - 1;
  while (start >= 0 && /[a-zA-Z\\]/.test(source[start])) {
    start--;
  }
  const precedingText = source.slice(start + 1, offset);

  return {
    inMath,
    inEnvironment,
    precedingCommand,
    precedingText,
  };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format LaTeX source code
 */
export function format(source: string, options: {
  indentSize?: number;
  insertSpaces?: boolean;
  maxLineLength?: number;
} = {}): string {
  const { indentSize = 2, insertSpaces = true, maxLineLength = 80 } = options;
  const indent = insertSpaces ? ' '.repeat(indentSize) : '\t';

  const lines = source.split('\n');
  const result: string[] = [];
  let indentLevel = 0;
  let inVerbatim = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for verbatim environments
    if (/\\begin\{(verbatim|lstlisting)\}/.test(trimmed)) {
      inVerbatim = true;
    }
    if (/\\end\{(verbatim|lstlisting)\}/.test(trimmed)) {
      inVerbatim = false;
    }

    // Don't format verbatim content
    if (inVerbatim) {
      result.push(line);
      continue;
    }

    // Decrease indent before \end
    if (/^\\end\{/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add formatted line
    if (trimmed.length === 0) {
      result.push('');
    } else {
      const formattedLine = indent.repeat(indentLevel) + trimmed;

      // Wrap long lines (but not in math mode or commands)
      if (formattedLine.length > maxLineLength && !trimmed.startsWith('\\') && !trimmed.includes('$')) {
        const words = trimmed.split(' ');
        let currentLine = indent.repeat(indentLevel);

        for (const word of words) {
          if (currentLine.length + word.length + 1 > maxLineLength && currentLine.trim().length > 0) {
            result.push(currentLine.trimEnd());
            currentLine = indent.repeat(indentLevel) + word;
          } else {
            currentLine += (currentLine.trim().length > 0 ? ' ' : '') + word;
          }
        }

        if (currentLine.trim().length > 0) {
          result.push(currentLine.trimEnd());
        }
      } else {
        result.push(formattedLine);
      }
    }

    // Increase indent after \begin
    if (/\\begin\{/.test(trimmed) && !/\\end\{/.test(trimmed)) {
      indentLevel++;
    }
  }

  return result.join('\n');
}

const latexParserApi = {
  tokenize,
  validate,
  extractMetadata,
  offsetToPosition,
  positionToOffset,
  getTokenAtPosition,
  getContextAtPosition,
  format,
};

export default latexParserApi;
