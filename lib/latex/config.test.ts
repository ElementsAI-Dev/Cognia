/**
 * Tests for LaTeX configuration module
 */

import {
  KATEX_MACROS,
  KATEX_BASE_OPTIONS,
  KATEX_UNTRUSTED_OPTIONS,
  KATEX_DISPLAY_OPTIONS,
  KATEX_INLINE_OPTIONS,
  REHYPE_KATEX_OPTIONS,
  getKatexOptions,
  KATEX_CDN_VERSION,
  KATEX_ERROR_COLOR,
  MATH_CACHE_MAX_SIZE,
  MATH_CACHE_MAX_AGE,
} from './config';

describe('LaTeX Config', () => {
  describe('KATEX_MACROS', () => {
    it('should define common number set macros', () => {
      expect(KATEX_MACROS['\\R']).toBe('\\mathbb{R}');
      expect(KATEX_MACROS['\\N']).toBe('\\mathbb{N}');
      expect(KATEX_MACROS['\\Z']).toBe('\\mathbb{Z}');
      expect(KATEX_MACROS['\\Q']).toBe('\\mathbb{Q}');
      expect(KATEX_MACROS['\\C']).toBe('\\mathbb{C}');
    });

    it('should define probability and statistics macros', () => {
      expect(KATEX_MACROS['\\E']).toBe('\\mathbb{E}');
      expect(KATEX_MACROS['\\P']).toBe('\\mathbb{P}');
      expect(KATEX_MACROS['\\Var']).toBe('\\operatorname{Var}');
      expect(KATEX_MACROS['\\Cov']).toBe('\\operatorname{Cov}');
    });

    it('should define linear algebra macros', () => {
      expect(KATEX_MACROS['\\rank']).toBe('\\operatorname{rank}');
      expect(KATEX_MACROS['\\trace']).toBe('\\operatorname{trace}');
      expect(KATEX_MACROS['\\det']).toBe('\\operatorname{det}');
    });

    it('should define calculus macros', () => {
      expect(KATEX_MACROS['\\d']).toBe('\\mathrm{d}');
      expect(KATEX_MACROS['\\pd']).toBe('\\partial');
    });

    it('should define common operator macros', () => {
      expect(KATEX_MACROS['\\argmax']).toBe('\\operatorname{arg\\,max}');
      expect(KATEX_MACROS['\\argmin']).toBe('\\operatorname{arg\\,min}');
      expect(KATEX_MACROS['\\sgn']).toBe('\\operatorname{sgn}');
    });

    it('should define machine learning macros', () => {
      expect(KATEX_MACROS['\\softmax']).toBe('\\operatorname{softmax}');
      expect(KATEX_MACROS['\\sigmoid']).toBe('\\operatorname{sigmoid}');
      expect(KATEX_MACROS['\\relu']).toBe('\\operatorname{ReLU}');
    });
  });

  describe('KATEX_UNTRUSTED_OPTIONS', () => {
    it('should set trust to false', () => {
      expect(KATEX_UNTRUSTED_OPTIONS.trust).toBe(false);
    });
  });

  describe('KATEX_BASE_OPTIONS', () => {
    it('should have throwOnError set to false', () => {
      expect(KATEX_BASE_OPTIONS.throwOnError).toBe(false);
    });

    it('should have strict set to warn', () => {
      expect(KATEX_BASE_OPTIONS.strict).toBe('warn');
    });

    it('should have trust set to true', () => {
      expect(KATEX_BASE_OPTIONS.trust).toBe(true);
    });

    it('should have output set to htmlAndMathml', () => {
      expect(KATEX_BASE_OPTIONS.output).toBe('htmlAndMathml');
    });

    it('should include macros', () => {
      expect(KATEX_BASE_OPTIONS.macros).toBe(KATEX_MACROS);
    });
  });

  describe('KATEX_DISPLAY_OPTIONS', () => {
    it('should have displayMode set to true', () => {
      expect(KATEX_DISPLAY_OPTIONS.displayMode).toBe(true);
    });

    it('should include base options', () => {
      expect(KATEX_DISPLAY_OPTIONS.throwOnError).toBe(false);
      expect(KATEX_DISPLAY_OPTIONS.trust).toBe(true);
    });
  });

  describe('KATEX_INLINE_OPTIONS', () => {
    it('should have displayMode set to false', () => {
      expect(KATEX_INLINE_OPTIONS.displayMode).toBe(false);
    });

    it('should include base options', () => {
      expect(KATEX_INLINE_OPTIONS.throwOnError).toBe(false);
      expect(KATEX_INLINE_OPTIONS.trust).toBe(true);
    });
  });

  describe('REHYPE_KATEX_OPTIONS', () => {
    it('should have output set to htmlAndMathml', () => {
      expect(REHYPE_KATEX_OPTIONS.output).toBe('htmlAndMathml');
    });

    it('should include base options', () => {
      expect(REHYPE_KATEX_OPTIONS.throwOnError).toBe(false);
      expect(REHYPE_KATEX_OPTIONS.trust).toBe(false);
    });
  });

  describe('getKatexOptions', () => {
    it('should return display mode options when displayMode is true', () => {
      const options = getKatexOptions(true);
      expect(options.displayMode).toBe(true);
      expect(options.throwOnError).toBe(false);
      expect(options.trust).toBe(true);
    });

    it('should return inline mode options when displayMode is false', () => {
      const options = getKatexOptions(false);
      expect(options.displayMode).toBe(false);
      expect(options.throwOnError).toBe(false);
      expect(options.trust).toBe(true);
    });

    it('should include macros in returned options', () => {
      const options = getKatexOptions(true);
      expect(options.macros).toBe(KATEX_MACROS);
    });

    it('should allow trust override', () => {
      const options = getKatexOptions(true, { trust: false });
      expect(options.trust).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should define KATEX_CDN_VERSION', () => {
      expect(KATEX_CDN_VERSION).toBe('0.16.28');
    });

    it('should define KATEX_ERROR_COLOR', () => {
      expect(KATEX_ERROR_COLOR).toBe('#cc0000');
    });

    it('should define MATH_CACHE_MAX_SIZE', () => {
      expect(MATH_CACHE_MAX_SIZE).toBe(500);
    });

    it('should define MATH_CACHE_MAX_AGE as 30 minutes', () => {
      expect(MATH_CACHE_MAX_AGE).toBe(30 * 60 * 1000);
    });
  });
});
