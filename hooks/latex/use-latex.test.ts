/**
 * Tests for useLatex hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLatex } from './use-latex';

// Mock dependencies
const mockValidate = jest.fn();
const mockTokenize = jest.fn();
const mockExtractMetadata = jest.fn();
const mockFormat = jest.fn();

jest.mock('@/lib/latex/parser', () => ({
  __esModule: true,
  default: {
    validate: (...args: unknown[]) => mockValidate(...args),
    tokenize: (...args: unknown[]) => mockTokenize(...args),
    extractMetadata: (...args: unknown[]) => mockExtractMetadata(...args),
    format: (...args: unknown[]) => mockFormat(...args),
  },
}));

jest.mock('@/lib/latex/symbols', () => ({
  __esModule: true,
  default: {},
  GREEK_LETTERS: [{ name: 'alpha', command: '\\alpha', description: 'Greek letter alpha' }],
  MATH_OPERATORS: [{ name: 'sum', command: '\\sum', description: 'Summation' }],
  RELATIONS: [{ name: 'equals', command: '=', description: 'Equals' }],
  ARROWS: [{ name: 'rightarrow', command: '\\rightarrow', description: 'Right arrow' }],
  DELIMITERS: [{ name: 'left paren', command: '(', description: 'Left parenthesis' }],
  ACCENTS: [{ name: 'hat', command: '\\hat', description: 'Hat accent' }],
  FUNCTIONS: [{ name: 'sin', command: '\\sin', description: 'Sine function' }],
  SETS_LOGIC: [{ name: 'in', command: '\\in', description: 'Element of' }],
  MISC_SYMBOLS: [{ name: 'infinity', command: '\\infty', description: 'Infinity symbol' }],
  COMMON_COMMANDS: [],
  COMMON_ENVIRONMENTS: [],
}));

jest.mock('@/lib/latex/templates', () => ({
  ALL_TEMPLATES: [
    { id: 'article', name: 'Article', category: 'document', content: '\\documentclass{article}' },
  ],
  getTemplatesByCategory: jest.fn(() => []),
  searchTemplates: jest.fn(() => []),
  getTemplateById: jest.fn((id: string) => {
    if (id === 'article') {
      return { id: 'article', name: 'Article', category: 'document', content: '\\documentclass{article}' };
    }
    return null;
  }),
  getTemplateCategories: jest.fn(() => [{ category: 'document', count: 1 }]),
  createDocumentFromTemplate: jest.fn((template, replacements) => {
    let content = template.content;
    for (const [key, value] of Object.entries(replacements || {})) {
      content = content.replace(`{{${key}}}`, value as string);
    }
    return content;
  }),
}));

jest.mock('@/lib/latex/export', () => ({
  latexToHtml: jest.fn((content: string) => `<html>${content}</html>`),
  latexToMarkdown: jest.fn((content: string) => `# ${content}`),
  latexToPlainText: jest.fn((content: string) => content.replace(/\\/g, '')),
}));

jest.mock('@/lib/latex/equation-reasoner', () => ({
  analyzeEquation: jest.fn(() => ({ type: 'equation', variables: [] })),
  verifyEquation: jest.fn(() => ({ isValid: true })),
  expandEquation: jest.fn((eq: string) => `expanded: ${eq}`),
  simplifyEquation: jest.fn((eq: string) => `simplified: ${eq}`),
}));

describe('useLatex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidate.mockReturnValue([]);
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.content).toBe('');
      expect(result.current.errors).toEqual([]);
      expect(result.current.warnings).toEqual([]);
      expect(result.current.isValid).toBe(true);
      expect(result.current.isExporting).toBe(false);
    });

    it('should accept initial content', () => {
      const { result } = renderHook(() => useLatex({ initialContent: '\\frac{1}{2}' }));

      expect(result.current.content).toBe('\\frac{1}{2}');
    });
  });

  describe('content management', () => {
    it('should update content', () => {
      const { result } = renderHook(() => useLatex());

      act(() => {
        result.current.setContent('\\alpha + \\beta');
      });

      expect(result.current.content).toBe('\\alpha + \\beta');
    });

    it('should auto-validate when enabled', () => {
      mockValidate.mockReturnValue([]);

      const { result } = renderHook(() => useLatex({ autoValidate: true }));

      act(() => {
        result.current.setContent('\\frac{1}{2}');
      });

      expect(mockValidate).toHaveBeenCalledWith('\\frac{1}{2}');
    });

    it('should not auto-validate when disabled', () => {
      const { result } = renderHook(() => useLatex({ autoValidate: false }));

      act(() => {
        result.current.setContent('\\frac{1}{2}');
      });

      expect(mockValidate).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate content', () => {
      mockValidate.mockReturnValue([
        { id: '1', type: 'syntax', message: 'Missing brace', line: 1, column: 5, severity: 'error' },
      ]);

      const { result } = renderHook(() => useLatex({ autoValidate: false }));

      act(() => {
        result.current.validate('\\frac{1}');
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.isValid).toBe(false);
    });

    it('should separate errors and warnings', () => {
      mockValidate.mockReturnValue([
        { id: '1', type: 'syntax', message: 'Error', line: 1, column: 1, severity: 'error' },
        { id: '2', type: 'style', message: 'Warning', line: 2, column: 1, severity: 'warning' },
      ]);

      const { result } = renderHook(() => useLatex({ autoValidate: false }));

      act(() => {
        result.current.validate('test content');
      });

      expect(result.current.errors).toHaveLength(1);
      expect(result.current.warnings).toHaveLength(1);
    });

    it('should validate current content when no argument provided', () => {
      mockValidate.mockReturnValue([]);

      const { result } = renderHook(() => useLatex({ initialContent: 'test', autoValidate: false }));

      act(() => {
        result.current.validate();
      });

      expect(mockValidate).toHaveBeenCalledWith('test');
    });
  });

  describe('symbol search', () => {
    it('should search symbols by name', () => {
      const { result } = renderHook(() => useLatex());

      const symbols = result.current.searchSymbols('alpha');

      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('alpha');
    });

    it('should search symbols by command', () => {
      const { result } = renderHook(() => useLatex());

      const symbols = result.current.searchSymbols('\\sum');

      expect(symbols).toHaveLength(1);
      expect(symbols[0].command).toBe('\\sum');
    });

    it('should return empty array for empty query', () => {
      const { result } = renderHook(() => useLatex());

      const symbols = result.current.searchSymbols('');

      expect(symbols).toEqual([]);
    });

    it('should return empty array for whitespace query', () => {
      const { result } = renderHook(() => useLatex());

      const symbols = result.current.searchSymbols('   ');

      expect(symbols).toEqual([]);
    });
  });

  describe('templates', () => {
    it('should create document from template', () => {
      const { result } = renderHook(() => useLatex());

      const content = result.current.createFromTemplate('article');

      expect(content).toBe('\\documentclass{article}');
    });

    it('should return null for unknown template', () => {
      const { result } = renderHook(() => useLatex());

      const content = result.current.createFromTemplate('unknown');

      expect(content).toBeNull();
    });

    it('should apply replacements', () => {
      const { result } = renderHook(() => useLatex());

      const content = result.current.createFromTemplate('article', { title: 'Test' });

      expect(content).toBeDefined();
    });

    it('should expose template categories', () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.templateCategories).toEqual([{ category: 'document', count: 1 }]);
    });

    it('should expose all templates', () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.templates).toHaveLength(1);
    });
  });

  describe('export', () => {
    it('should export to HTML', async () => {
      const { result } = renderHook(() => useLatex());

      let output;
      await act(async () => {
        output = await result.current.exportToFormat('\\frac{1}{2}', 'html');
      });

      expect(output).toBe('<html>\\frac{1}{2}</html>');
    });

    it('should export to Markdown', async () => {
      const { result } = renderHook(() => useLatex());

      let output;
      await act(async () => {
        output = await result.current.exportToFormat('Test', 'markdown');
      });

      expect(output).toBe('# Test');
    });

    it('should export to plain text', async () => {
      const { result } = renderHook(() => useLatex());

      let output;
      await act(async () => {
        output = await result.current.exportToFormat('\\alpha', 'plaintext');
      });

      expect(output).toBe('alpha');
    });

    it('should track exporting state', async () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.isExporting).toBe(false);

      await act(async () => {
        await result.current.exportToFormat('test', 'html');
      });

      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('equation reasoning', () => {
    it('should expose analyzeEquation', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.analyzeEquation).toBe('function');
    });

    it('should expose verifyEquation', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.verifyEquation).toBe('function');
    });

    it('should expose expandEquation', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.expandEquation).toBe('function');
    });

    it('should expose simplifyEquation', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.simplifyEquation).toBe('function');
    });
  });

  describe('symbol categories', () => {
    it('should expose Greek letters', () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.greekLetters).toBeDefined();
      expect(result.current.greekLetters.length).toBeGreaterThan(0);
    });

    it('should expose math operators', () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.mathOperators).toBeDefined();
    });

    it('should expose all symbol categories', () => {
      const { result } = renderHook(() => useLatex());

      expect(result.current.relations).toBeDefined();
      expect(result.current.arrows).toBeDefined();
      expect(result.current.delimiters).toBeDefined();
      expect(result.current.accents).toBeDefined();
      expect(result.current.functions).toBeDefined();
      expect(result.current.setsAndLogic).toBeDefined();
      expect(result.current.miscellaneous).toBeDefined();
    });
  });

  describe('parsing functions', () => {
    it('should expose tokenize function', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.tokenize).toBe('function');
    });

    it('should expose extractMetadata function', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.extractMetadata).toBe('function');
    });

    it('should expose format function', () => {
      const { result } = renderHook(() => useLatex());

      expect(typeof result.current.format).toBe('function');
    });
  });
});
