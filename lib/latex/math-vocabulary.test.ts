import {
  GREEK_LETTERS,
  NUMBERS,
  OPERATORS,
  FUNCTIONS,
  CALCULUS,
  SET_THEORY,
  LOGIC,
  ARROWS,
  FORMATTING,
  NATURAL_LANGUAGE_TO_LATEX,
  CHINESE_MATH_VOCABULARY,
  getEnglishMathVocabulary,
  getMathVocabularyByLanguage,
  getNaturalLanguageToLatex,
} from './math-vocabulary';

describe('math-vocabulary', () => {
  describe('GREEK_LETTERS', () => {
    it('contains lowercase Greek letters', () => {
      expect(GREEK_LETTERS['alpha']).toBe('\\alpha');
      expect(GREEK_LETTERS['beta']).toBe('\\beta');
      expect(GREEK_LETTERS['gamma']).toBe('\\gamma');
      expect(GREEK_LETTERS['omega']).toBe('\\omega');
    });

    it('contains uppercase Greek letters', () => {
      expect(GREEK_LETTERS['capital gamma']).toBe('\\Gamma');
      expect(GREEK_LETTERS['capital delta']).toBe('\\Delta');
      expect(GREEK_LETTERS['capital omega']).toBe('\\Omega');
    });
  });

  describe('NUMBERS', () => {
    it('maps number words to digits', () => {
      expect(NUMBERS['zero']).toBe('0');
      expect(NUMBERS['one']).toBe('1');
      expect(NUMBERS['five']).toBe('5');
      expect(NUMBERS['ten']).toBe('10');
    });
  });

  describe('OPERATORS', () => {
    it('contains basic operators', () => {
      expect(OPERATORS['plus']).toBe('+');
      expect(OPERATORS['minus']).toBe('-');
      expect(OPERATORS['times']).toBe('\\times');
      expect(OPERATORS['equals']).toBe('=');
    });

    it('contains comparison operators', () => {
      expect(OPERATORS['less than']).toBe('<');
      expect(OPERATORS['greater than']).toBe('>');
      expect(OPERATORS['less than or equal']).toBe('\\leq');
      expect(OPERATORS['not equal']).toBe('\\neq');
    });
  });

  describe('FUNCTIONS', () => {
    it('contains trigonometric functions', () => {
      expect(FUNCTIONS['sine']).toBe('\\sin');
      expect(FUNCTIONS['cosine']).toBe('\\cos');
      expect(FUNCTIONS['tangent']).toBe('\\tan');
    });

    it('contains logarithmic functions', () => {
      expect(FUNCTIONS['log']).toBe('\\log');
      expect(FUNCTIONS['natural log']).toBe('\\ln');
    });
  });

  describe('CALCULUS', () => {
    it('contains calculus symbols', () => {
      expect(CALCULUS['integral']).toBe('\\int');
      expect(CALCULUS['sum']).toBe('\\sum');
      expect(CALCULUS['limit']).toBe('\\lim');
      expect(CALCULUS['infinity']).toBe('\\infty');
    });
  });

  describe('SET_THEORY', () => {
    it('contains set theory symbols', () => {
      expect(SET_THEORY['element of']).toBe('\\in');
      expect(SET_THEORY['subset']).toBe('\\subset');
      expect(SET_THEORY['union']).toBe('\\cup');
      expect(SET_THEORY['empty set']).toBe('\\emptyset');
    });
  });

  describe('LOGIC', () => {
    it('contains logic symbols', () => {
      expect(LOGIC['and']).toBe('\\land');
      expect(LOGIC['or']).toBe('\\lor');
      expect(LOGIC['for all']).toBe('\\forall');
      expect(LOGIC['implies']).toBe('\\implies');
    });
  });

  describe('ARROWS', () => {
    it('contains arrow symbols', () => {
      expect(ARROWS['right arrow']).toBe('\\rightarrow');
      expect(ARROWS['left arrow']).toBe('\\leftarrow');
      expect(ARROWS['maps to']).toBe('\\mapsto');
    });
  });

  describe('FORMATTING', () => {
    it('contains formatting commands with placeholders', () => {
      expect(FORMATTING['bold']).toBe('\\textbf{#}');
      expect(FORMATTING['italic']).toBe('\\textit{#}');
      expect(FORMATTING['vector']).toBe('\\vec{#}');
    });
  });

  describe('NATURAL_LANGUAGE_TO_LATEX', () => {
    it('contains natural language patterns', () => {
      expect(NATURAL_LANGUAGE_TO_LATEX['square root']).toBe('\\sqrt{#}');
      expect(NATURAL_LANGUAGE_TO_LATEX['fraction']).toBe('\\frac{#}{#}');
    });
  });

  describe('CHINESE_MATH_VOCABULARY', () => {
    it('contains Chinese number mappings', () => {
      expect(CHINESE_MATH_VOCABULARY['零']).toBe('0');
      expect(CHINESE_MATH_VOCABULARY['一']).toBe('1');
      expect(CHINESE_MATH_VOCABULARY['十']).toBe('10');
    });

    it('contains Chinese operator mappings', () => {
      expect(CHINESE_MATH_VOCABULARY['加']).toBe('+');
      expect(CHINESE_MATH_VOCABULARY['减']).toBe('-');
      expect(CHINESE_MATH_VOCABULARY['乘']).toBe('\\times');
    });

    it('contains Chinese Greek letter mappings', () => {
      expect(CHINESE_MATH_VOCABULARY['阿尔法']).toBe('\\alpha');
      expect(CHINESE_MATH_VOCABULARY['派']).toBe('\\pi');
    });
  });

  describe('getEnglishMathVocabulary', () => {
    it('returns combined English vocabulary', () => {
      const vocab = getEnglishMathVocabulary();

      expect(vocab['alpha']).toBe('\\alpha');
      expect(vocab['plus']).toBe('+');
      expect(vocab['sine']).toBe('\\sin');
      expect(vocab['integral']).toBe('\\int');
    });

    it('includes all vocabulary categories', () => {
      const vocab = getEnglishMathVocabulary();

      // Check that it includes items from each category
      expect('alpha' in vocab).toBe(true); // GREEK_LETTERS
      expect('one' in vocab).toBe(true); // NUMBERS
      expect('plus' in vocab).toBe(true); // OPERATORS
      expect('sine' in vocab).toBe(true); // FUNCTIONS
      expect('integral' in vocab).toBe(true); // CALCULUS
      expect('element of' in vocab).toBe(true); // SET_THEORY
      expect('and' in vocab).toBe(true); // LOGIC
      expect('right arrow' in vocab).toBe(true); // ARROWS
    });
  });

  describe('getMathVocabularyByLanguage', () => {
    it('returns English vocabulary for English language', () => {
      const vocab = getMathVocabularyByLanguage('en-US');

      expect(vocab['alpha']).toBe('\\alpha');
      expect(vocab['plus']).toBe('+');
    });

    it('includes Chinese vocabulary for Chinese language', () => {
      const vocab = getMathVocabularyByLanguage('zh-CN');

      // Should include both English and Chinese
      expect(vocab['alpha']).toBe('\\alpha');
      expect(vocab['加']).toBe('+');
      expect(vocab['派']).toBe('\\pi');
    });

    it('handles zh prefix', () => {
      const vocab = getMathVocabularyByLanguage('zh');

      expect(vocab['零']).toBe('0');
    });
  });

  describe('getNaturalLanguageToLatex', () => {
    it('returns all natural language patterns', () => {
      const patterns = getNaturalLanguageToLatex();

      expect(patterns['square root']).toBe('\\sqrt{#}');
      expect(patterns['alpha']).toBe('\\alpha');
      expect(patterns['plus']).toBe('+');
      expect(patterns['bold']).toBe('\\textbf{#}');
    });

    it('includes formatting patterns', () => {
      const patterns = getNaturalLanguageToLatex();

      expect('bold' in patterns).toBe(true);
      expect('italic' in patterns).toBe(true);
      expect('vector' in patterns).toBe(true);
    });
  });
});
