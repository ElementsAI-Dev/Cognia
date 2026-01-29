/**
 * useLatex - Unified hook for LaTeX functionality
 *
 * Provides access to LaTeX parsing, templates, export, voice input, and AI assistance
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import latexParser from '@/lib/latex/parser';
import latexSymbols, {
  GREEK_LETTERS,
  MATH_OPERATORS,
  RELATIONS,
  ARROWS,
  DELIMITERS,
  ACCENTS,
  FUNCTIONS,
  SETS_LOGIC,
  MISC_SYMBOLS,
  COMMON_COMMANDS,
  COMMON_ENVIRONMENTS,
} from '@/lib/latex/symbols';
import {
  ALL_TEMPLATES,
  getTemplatesByCategory,
  searchTemplates as searchTemplatesLib,
  getTemplateById as getTemplateByIdLib,
  getTemplateCategories,
  createDocumentFromTemplate,
} from '@/lib/latex/templates';
import {
  latexToHtml,
  latexToMarkdown,
  latexToPlainText,
} from '@/lib/latex/export';
import {
  analyzeEquation,
  verifyEquation,
  expandEquation,
  simplifyEquation,
} from '@/lib/latex/equation-reasoner';
import type {
  LaTeXTemplate,
  LaTeXTemplateCategory,
  LaTeXError,
  LaTeXSymbol,
} from '@/types/latex';

export interface UseLatexOptions {
  initialContent?: string;
  autoValidate?: boolean;
  validateDebounceMs?: number;
}

export interface UseLatexReturn {
  // Content state
  content: string;
  setContent: (content: string) => void;

  // Validation
  errors: LaTeXError[];
  warnings: LaTeXError[];
  isValid: boolean;
  validate: (content?: string) => { errors: LaTeXError[]; warnings: LaTeXError[] };

  // Parsing
  tokenize: typeof latexParser.tokenize;
  extractMetadata: typeof latexParser.extractMetadata;
  format: typeof latexParser.format;

  // Symbols
  symbols: typeof latexSymbols;
  greekLetters: typeof GREEK_LETTERS;
  mathOperators: typeof MATH_OPERATORS;
  relations: typeof RELATIONS;
  arrows: typeof ARROWS;
  delimiters: typeof DELIMITERS;
  accents: typeof ACCENTS;
  functions: typeof FUNCTIONS;
  setsAndLogic: typeof SETS_LOGIC;
  miscellaneous: typeof MISC_SYMBOLS;
  commonCommands: typeof COMMON_COMMANDS;
  commonEnvironments: typeof COMMON_ENVIRONMENTS;
  searchSymbols: (query: string) => LaTeXSymbol[];

  // Templates
  templates: LaTeXTemplate[];
  templateCategories: { category: LaTeXTemplateCategory; count: number }[];
  getTemplatesByCategory: typeof getTemplatesByCategory;
  searchTemplates: typeof searchTemplatesLib;
  getTemplateById: typeof getTemplateByIdLib;
  createFromTemplate: (templateId: string, replacements?: Record<string, string>) => string | null;

  // Export
  exportToFormat: (content: string, format: 'html' | 'markdown' | 'plaintext') => Promise<string>;
  isExporting: boolean;

  // Equation reasoning
  analyzeEquation: typeof analyzeEquation;
  verifyEquation: typeof verifyEquation;
  expandEquation: typeof expandEquation;
  simplifyEquation: typeof simplifyEquation;
}

export function useLatex(options: UseLatexOptions = {}): UseLatexReturn {
  const { initialContent = '', autoValidate = true } = options;

  const [content, setContentInternal] = useState(initialContent);
  const [errors, setErrors] = useState<LaTeXError[]>([]);
  const [warnings, setWarnings] = useState<LaTeXError[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Validate content
  const validate = useCallback((contentToValidate?: string) => {
    const targetContent = contentToValidate ?? content;
    const result = latexParser.validate(targetContent);

    const validationErrors: LaTeXError[] = result
      .filter((err: LaTeXError) => err.severity === 'error')
      .map((err: LaTeXError) => ({
        id: err.id,
        type: err.type,
        message: err.message,
        line: err.line,
        column: err.column,
        severity: err.severity,
      }));

    const validationWarnings: LaTeXError[] = result
      .filter((err: LaTeXError) => err.severity === 'warning')
      .map((warn: LaTeXError) => ({
        id: warn.id,
        type: warn.type,
        message: warn.message,
        line: warn.line,
        column: warn.column,
        severity: warn.severity,
      }));

    setErrors(validationErrors);
    setWarnings(validationWarnings);

    return { errors: validationErrors, warnings: validationWarnings };
  }, [content]);

  // Set content with optional auto-validation
  const setContent = useCallback(
    (newContent: string) => {
      setContentInternal(newContent);
      if (autoValidate) {
        validate(newContent);
      }
    },
    [autoValidate, validate]
  );

  // Search symbols
  const searchSymbols = useCallback((query: string): LaTeXSymbol[] => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    const allSymbols = [
      ...GREEK_LETTERS,
      ...MATH_OPERATORS,
      ...RELATIONS,
      ...ARROWS,
      ...DELIMITERS,
      ...ACCENTS,
      ...FUNCTIONS,
      ...SETS_LOGIC,
      ...MISC_SYMBOLS,
    ];

    return allSymbols.filter(
      (symbol) =>
        symbol.name.toLowerCase().includes(lowerQuery) ||
        symbol.command.toLowerCase().includes(lowerQuery) ||
        symbol.description?.toLowerCase().includes(lowerQuery)
    );
  }, []);

  // Create document from template
  const createFromTemplate = useCallback(
    (templateId: string, replacements?: Record<string, string>): string | null => {
      const template = getTemplateByIdLib(templateId);
      if (!template) return null;

      if (replacements) {
        return createDocumentFromTemplate(template, replacements);
      }
      return template.content;
    },
    []
  );

  // Export to format
  const exportToFormat = useCallback(
    async (contentToExport: string, format: 'html' | 'markdown' | 'plaintext'): Promise<string> => {
      setIsExporting(true);
      try {
        switch (format) {
          case 'html':
            return latexToHtml(contentToExport);
          case 'markdown':
            return latexToMarkdown(contentToExport);
          case 'plaintext':
            return latexToPlainText(contentToExport);
          default:
            return contentToExport;
        }
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  // Template categories
  const templateCategories = useMemo(() => getTemplateCategories(), []);

  // Is valid check
  const isValid = useMemo(() => errors.length === 0, [errors]);

  return {
    // Content state
    content,
    setContent,

    // Validation
    errors,
    warnings,
    isValid,
    validate,

    // Parsing
    tokenize: latexParser.tokenize,
    extractMetadata: latexParser.extractMetadata,
    format: latexParser.format,

    // Symbols
    symbols: latexSymbols,
    greekLetters: GREEK_LETTERS,
    mathOperators: MATH_OPERATORS,
    relations: RELATIONS,
    arrows: ARROWS,
    delimiters: DELIMITERS,
    accents: ACCENTS,
    functions: FUNCTIONS,
    setsAndLogic: SETS_LOGIC,
    miscellaneous: MISC_SYMBOLS,
    commonCommands: COMMON_COMMANDS,
    commonEnvironments: COMMON_ENVIRONMENTS,
    searchSymbols,

    // Templates
    templates: ALL_TEMPLATES,
    templateCategories,
    getTemplatesByCategory,
    searchTemplates: searchTemplatesLib,
    getTemplateById: getTemplateByIdLib,
    createFromTemplate,

    // Export
    exportToFormat,
    isExporting,

    // Equation reasoning
    analyzeEquation,
    verifyEquation,
    expandEquation,
    simplifyEquation,
  };
}

export default useLatex;
