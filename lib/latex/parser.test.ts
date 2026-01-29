/**
 * LaTeX Parser - Unit Tests
 */

import {
  tokenize,
  validate,
  extractMetadata,
  offsetToPosition,
  positionToOffset,
  getTokenAtPosition,
  getContextAtPosition,
  format,
} from './parser';

describe('LaTeX Parser', () => {
  describe('tokenize', () => {
    it('should tokenize simple text', () => {
      const { tokens } = tokenize('Hello world');
      expect(tokens).toHaveLength(3);
      expect(tokens[0]).toMatchObject({ type: 'text', value: 'Hello' });
      expect(tokens[1]).toMatchObject({ type: 'whitespace' });
      expect(tokens[2]).toMatchObject({ type: 'text', value: 'world' });
    });

    it('should tokenize LaTeX commands', () => {
      const { tokens } = tokenize('\\textbf{bold}');
      expect(tokens[0]).toMatchObject({ type: 'command', value: '\\textbf' });
      expect(tokens[1]).toMatchObject({ type: 'brace-open', value: '{' });
      expect(tokens[2]).toMatchObject({ type: 'text', value: 'bold' });
      expect(tokens[3]).toMatchObject({ type: 'brace-close', value: '}' });
    });

    it('should tokenize inline math', () => {
      const { tokens } = tokenize('$x^2$');
      expect(tokens[0]).toMatchObject({ type: 'math-inline', value: '$' });
      expect(tokens[1]).toMatchObject({ type: 'text', value: 'x' });
      expect(tokens[2]).toMatchObject({ type: 'special', value: '^' });
      expect(tokens[3]).toMatchObject({ type: 'text', value: '2' });
      expect(tokens[4]).toMatchObject({ type: 'math-inline', value: '$' });
    });

    it('should tokenize display math', () => {
      const { tokens } = tokenize('$$E=mc^2$$');
      expect(tokens[0]).toMatchObject({ type: 'math-display', value: '$$' });
      expect(tokens[tokens.length - 1]).toMatchObject({ type: 'math-display', value: '$$' });
    });

    it('should tokenize comments', () => {
      const { tokens } = tokenize('text % comment\nnext line');
      const commentToken = tokens.find(t => t.type === 'comment');
      expect(commentToken).toBeDefined();
      expect(commentToken?.value).toBe('% comment');
    });

    it('should tokenize environment begin/end', () => {
      const { tokens } = tokenize('\\begin{document}\\end{document}');
      expect(tokens[0]).toMatchObject({ type: 'environment-begin', value: '\\begin' });
      const endToken = tokens.find(t => t.type === 'environment-end');
      expect(endToken).toMatchObject({ type: 'environment-end', value: '\\end' });
    });

    it('should handle newlines', () => {
      const { tokens } = tokenize('line1\nline2');
      const newlineToken = tokens.find(t => t.type === 'newline');
      expect(newlineToken).toBeDefined();
      expect(tokens.length).toBeGreaterThan(2);
    });

    it('should tokenize special characters', () => {
      const { tokens } = tokenize('a & b ~ c ^ d _ e');
      const specialTokens = tokens.filter(t => t.type === 'special');
      expect(specialTokens).toHaveLength(4);
      expect(specialTokens.map(t => t.value)).toEqual(['&', '~', '^', '_']);
    });

    it('should tokenize single character commands', () => {
      const { tokens } = tokenize('\\$ \\% \\\\');
      const commands = tokens.filter(t => t.type === 'command');
      expect(commands[0]).toMatchObject({ value: '\\$' });
      expect(commands[1]).toMatchObject({ value: '\\%' });
      expect(commands[2]).toMatchObject({ value: '\\\\' });
    });

    it('should detect environment mismatch errors', () => {
      const { errors } = tokenize('\\begin{itemize}\\end{enumerate}');
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('unbalanced-environment');
    });
  });

  describe('validate', () => {
    it('should return no errors for valid LaTeX', () => {
      const errors = validate('\\documentclass{article}\\begin{document}Hello\\end{document}');
      const realErrors = errors.filter(e => e.severity === 'error');
      expect(realErrors).toHaveLength(0);
    });

    it('should detect unbalanced braces', () => {
      const errors = validate('\\textbf{unclosed');
      expect(errors.some(e => e.type === 'unbalanced-braces')).toBe(true);
    });

    it('should detect unexpected closing brace', () => {
      const errors = validate('text}');
      expect(errors.some(e => e.type === 'unbalanced-braces' && e.message.includes('Unexpected'))).toBe(true);
    });

    it('should detect unclosed math mode', () => {
      const errors = validate('$x^2');
      expect(errors.some(e => e.type === 'math-error')).toBe(true);
    });

    it('should warn about unknown commands', () => {
      const errors = validate('\\unknowncommand');
      expect(errors.some(e => e.type === 'undefined-command')).toBe(true);
    });

    it('should not warn about known commands', () => {
      const errors = validate('\\textbf{text}');
      expect(errors.filter(e => e.type === 'undefined-command')).toHaveLength(0);
    });
  });

  describe('extractMetadata', () => {
    it('should extract document class', () => {
      const metadata = extractMetadata('\\documentclass{article}');
      expect(metadata.documentClass).toBe('article');
    });

    it('should extract packages', () => {
      const metadata = extractMetadata('\\usepackage{amsmath}\\usepackage{graphicx}');
      expect(metadata.packages).toContain('amsmath');
      expect(metadata.packages).toContain('graphicx');
    });

    it('should extract multiple packages from single usepackage', () => {
      const metadata = extractMetadata('\\usepackage{amsmath, amssymb}');
      expect(metadata.packages).toContain('amsmath');
      expect(metadata.packages).toContain('amssymb');
    });

    it('should extract title', () => {
      const metadata = extractMetadata('\\title{My Document}');
      expect(metadata.title).toBe('My Document');
    });

    it('should extract author', () => {
      const metadata = extractMetadata('\\author{John Doe}');
      expect(metadata.author).toBe('John Doe');
    });

    it('should extract date', () => {
      const metadata = extractMetadata('\\date{2024}');
      expect(metadata.date).toBe('2024');
    });

    it('should extract bibliography', () => {
      const metadata = extractMetadata('\\bibliography{refs}');
      expect(metadata.bibliography).toBe('refs');
    });

    it('should count words', () => {
      const metadata = extractMetadata('Hello world this is text');
      expect(metadata.wordCount).toBeGreaterThan(0);
    });

    it('should count characters', () => {
      const source = 'Hello world';
      const metadata = extractMetadata(source);
      expect(metadata.characterCount).toBe(source.length);
    });
  });

  describe('offsetToPosition', () => {
    it('should convert offset to line and column', () => {
      const source = 'line1\nline2\nline3';
      
      const pos0 = offsetToPosition(source, 0);
      expect(pos0).toMatchObject({ line: 1, column: 1 });
      
      const pos6 = offsetToPosition(source, 6);
      expect(pos6).toMatchObject({ line: 2, column: 1 });
      
      const pos8 = offsetToPosition(source, 8);
      expect(pos8).toMatchObject({ line: 2, column: 3 });
    });

    it('should handle empty source', () => {
      const pos = offsetToPosition('', 0);
      expect(pos).toMatchObject({ line: 1, column: 1 });
    });
  });

  describe('positionToOffset', () => {
    it('should convert line and column to offset', () => {
      const source = 'line1\nline2\nline3';
      
      expect(positionToOffset(source, 1, 1)).toBe(0);
      expect(positionToOffset(source, 2, 1)).toBe(6);
      expect(positionToOffset(source, 2, 3)).toBe(8);
    });

    it('should handle position beyond source', () => {
      const source = 'short';
      const offset = positionToOffset(source, 10, 1);
      expect(offset).toBe(source.length);
    });
  });

  describe('getTokenAtPosition', () => {
    it('should return token at position', () => {
      const { tokens } = tokenize('\\textbf{bold}');
      const token = getTokenAtPosition(tokens, 1, 1);
      expect(token).toMatchObject({ type: 'command', value: '\\textbf' });
    });

    it('should return undefined for position with no token', () => {
      const { tokens } = tokenize('text');
      const token = getTokenAtPosition(tokens, 99, 99);
      expect(token).toBeUndefined();
    });
  });

  describe('getContextAtPosition', () => {
    it('should detect math mode', () => {
      const source = '$x + y$';
      const { tokens } = tokenize(source);
      
      const contextInMath = getContextAtPosition(source, tokens, 1, 4);
      expect(contextInMath.inMath).toBe(true);
    });

    it('should detect environment begin/end tokens', () => {
      const source = '\\begin{equation}x\\end{equation}';
      const { tokens } = tokenize(source);
      
      const beginToken = tokens.find(t => t.type === 'environment-begin');
      const endToken = tokens.find(t => t.type === 'environment-end');
      expect(beginToken).toBeDefined();
      expect(endToken).toBeDefined();
    });

    it('should track preceding command', () => {
      const source = '\\textbf{text}';
      const { tokens } = tokenize(source);
      
      const context = getContextAtPosition(source, tokens, 1, 9);
      expect(context.precedingCommand).toBe('\\textbf');
    });

    it('should get preceding text', () => {
      const source = '\\alpha';
      const { tokens } = tokenize(source);
      
      const context = getContextAtPosition(source, tokens, 1, 7);
      expect(context.precedingText).toBe('\\alpha');
    });
  });

  describe('format', () => {
    it('should format with proper indentation', () => {
      const source = '\\begin{document}\nHello\n\\end{document}';
      const formatted = format(source);
      
      expect(formatted).toContain('  Hello');
    });

    it('should decrease indent after \\end', () => {
      const source = '\\begin{itemize}\n\\item One\n\\end{itemize}\nAfter';
      const formatted = format(source);
      
      const lines = formatted.split('\n');
      expect(lines[lines.length - 1]).toBe('After');
    });

    it('should preserve verbatim content', () => {
      const source = '\\begin{verbatim}\n  code here\n\\end{verbatim}';
      const formatted = format(source);
      
      expect(formatted).toContain('  code here');
    });

    it('should use custom indent size', () => {
      const source = '\\begin{document}\ntext\n\\end{document}';
      const formatted = format(source, { indentSize: 4 });
      
      expect(formatted).toContain('    text');
    });

    it('should use tabs when specified', () => {
      const source = '\\begin{document}\ntext\n\\end{document}';
      const formatted = format(source, { insertSpaces: false });
      
      expect(formatted).toContain('\ttext');
    });

    it('should preserve empty lines', () => {
      const source = 'line1\n\nline3';
      const formatted = format(source);
      
      expect(formatted).toBe('line1\n\nline3');
    });
  });
});
