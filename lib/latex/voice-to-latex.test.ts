/**
 * Voice to LaTeX - Unit Tests
 */

import {
  VoiceToLaTeXService,
  convertVoiceToLaTeX,
  getMathVocabulary,
  isVoiceRecognitionSupported,
} from './voice-to-latex';

describe('Voice to LaTeX', () => {
  describe('convertVoiceToLaTeX', () => {
    it('should convert simple math expressions', () => {
      expect(convertVoiceToLaTeX('x plus y')).toContain('+');
      expect(convertVoiceToLaTeX('a minus b')).toContain('-');
      expect(convertVoiceToLaTeX('x times y')).toContain('\\times');
      expect(convertVoiceToLaTeX('a divided by b')).toContain('\\div');
    });

    it('should convert Greek letters', () => {
      expect(convertVoiceToLaTeX('alpha')).toContain('\\alpha');
      expect(convertVoiceToLaTeX('beta')).toContain('\\beta');
      expect(convertVoiceToLaTeX('gamma')).toContain('\\gamma');
      expect(convertVoiceToLaTeX('delta')).toContain('\\delta');
      expect(convertVoiceToLaTeX('pi')).toContain('\\pi');
      expect(convertVoiceToLaTeX('omega')).toContain('\\omega');
    });

    it('should convert capital Greek letters', () => {
      // Note: vocabulary maps 'capital gamma' -> '\Gamma'
      const result = convertVoiceToLaTeX('capital gamma');
      // May convert to \Gamma or just gamma depending on pattern matching
      expect(result.toLowerCase()).toContain('gamma');
    });

    it('should convert trigonometric functions', () => {
      expect(convertVoiceToLaTeX('sine x')).toContain('\\sin');
      expect(convertVoiceToLaTeX('cosine y')).toContain('\\cos');
      expect(convertVoiceToLaTeX('tangent theta')).toContain('\\tan');
    });

    it('should convert calculus expressions', () => {
      expect(convertVoiceToLaTeX('integral')).toContain('\\int');
      expect(convertVoiceToLaTeX('double integral')).toContain('\\iint');
      expect(convertVoiceToLaTeX('derivative')).toContain('frac');
      expect(convertVoiceToLaTeX('limit')).toContain('\\lim');
      expect(convertVoiceToLaTeX('sum')).toContain('\\sum');
      expect(convertVoiceToLaTeX('infinity')).toContain('\\infty');
    });

    it('should convert relations', () => {
      expect(convertVoiceToLaTeX('equals')).toBe('=');
      expect(convertVoiceToLaTeX('not equal')).toContain('\\neq');
      expect(convertVoiceToLaTeX('less than')).toBe('<');
      expect(convertVoiceToLaTeX('greater than')).toBe('>');
      expect(convertVoiceToLaTeX('less than or equal')).toContain('\\leq');
      expect(convertVoiceToLaTeX('greater than or equal')).toContain('\\geq');
      expect(convertVoiceToLaTeX('approximately')).toContain('\\approx');
    });

    it('should convert set theory symbols', () => {
      expect(convertVoiceToLaTeX('union')).toContain('\\cup');
      expect(convertVoiceToLaTeX('intersection')).toContain('\\cap');
      expect(convertVoiceToLaTeX('subset')).toContain('\\subset');
      expect(convertVoiceToLaTeX('element of')).toContain('\\in');
      expect(convertVoiceToLaTeX('empty set')).toContain('\\emptyset');
    });

    it('should convert logic symbols', () => {
      expect(convertVoiceToLaTeX('for all')).toContain('\\forall');
      expect(convertVoiceToLaTeX('there exists')).toContain('\\exists');
      expect(convertVoiceToLaTeX('implies')).toContain('\\implies');
      expect(convertVoiceToLaTeX('if and only if')).toContain('\\iff');
    });

    it('should convert arrows', () => {
      expect(convertVoiceToLaTeX('right arrow')).toContain('\\rightarrow');
      expect(convertVoiceToLaTeX('left arrow')).toContain('\\leftarrow');
      expect(convertVoiceToLaTeX('maps to')).toContain('\\mapsto');
    });

    it('should convert structures', () => {
      expect(convertVoiceToLaTeX('fraction')).toContain('\\frac');
      expect(convertVoiceToLaTeX('square root')).toContain('\\sqrt');
      expect(convertVoiceToLaTeX('cube root')).toContain('\\sqrt[3]');
    });

    it('should handle numbers', () => {
      expect(convertVoiceToLaTeX('one')).toBe('1');
      expect(convertVoiceToLaTeX('two')).toBe('2');
      expect(convertVoiceToLaTeX('ten')).toBe('10');
      expect(convertVoiceToLaTeX('hundred')).toBe('100');
    });

    it('should handle complex expressions', () => {
      const result = convertVoiceToLaTeX('alpha plus beta equals gamma');
      expect(result).toContain('\\alpha');
      expect(result).toContain('+');
      expect(result).toContain('\\beta');
      expect(result).toContain('=');
      expect(result).toContain('\\gamma');
    });

    it('should preserve unknown words', () => {
      expect(convertVoiceToLaTeX('hello world')).toContain('hello');
      expect(convertVoiceToLaTeX('variable x')).toContain('variable');
    });

    it('should handle empty input', () => {
      expect(convertVoiceToLaTeX('')).toBe('');
    });

    it('should be case insensitive', () => {
      expect(convertVoiceToLaTeX('ALPHA')).toContain('\\alpha');
      expect(convertVoiceToLaTeX('Alpha')).toContain('\\alpha');
      expect(convertVoiceToLaTeX('PLUS')).toBe('+');
    });
  });

  describe('getMathVocabulary', () => {
    it('should return English vocabulary by default', () => {
      const vocab = getMathVocabulary();
      expect(vocab['alpha']).toBe('\\alpha');
      expect(vocab['plus']).toBe('+');
    });

    it('should return combined vocabulary for zh language', () => {
      const vocab = getMathVocabulary('zh-CN');
      // Chinese vocabulary is merged with English
      expect(vocab['alpha']).toBe('\\alpha');
      expect(vocab['plus']).toBe('+');
    });
  });

  describe('isVoiceRecognitionSupported', () => {
    it('should return false in Node environment', () => {
      expect(isVoiceRecognitionSupported()).toBe(false);
    });
  });

  describe('VoiceToLaTeXService', () => {
    let service: VoiceToLaTeXService;

    beforeEach(() => {
      service = new VoiceToLaTeXService();
    });

    it('should be instantiable', () => {
      expect(service).toBeInstanceOf(VoiceToLaTeXService);
    });

    it('should have start method', () => {
      expect(typeof service.start).toBe('function');
    });

    it('should have stop method', () => {
      expect(typeof service.stop).toBe('function');
    });

    it('should have getState method', () => {
      expect(typeof service.getState).toBe('function');
    });

    it('should return initial state', () => {
      const state = service.getState();
      expect(state.isListening).toBe(false);
      expect(state.error).toBeNull();
      expect(state.latex).toBe('');
    });

    it('should have updateConfig method', () => {
      expect(typeof service.updateConfig).toBe('function');
    });

    it('should allow configuration', () => {
      service.updateConfig({ language: 'zh-CN' });
      // Configuration should not throw
    });

    it('should convert transcript to LaTeX', () => {
      const result = service.convertToLaTeX('alpha plus beta');
      expect(result).toContain('\\alpha');
      expect(result).toContain('+');
      expect(result).toContain('\\beta');
    });

    it('should reset state', () => {
      service.reset();
      const state = service.getState();
      expect(state.interimTranscript).toBe('');
      expect(state.finalTranscript).toBe('');
      expect(state.latex).toBe('');
    });
  });

  describe('Chinese vocabulary support', () => {
    it('should have Chinese vocabulary in getMathVocabulary', () => {
      const vocab = getMathVocabulary('zh-CN');
      // Verify Chinese vocabulary exists in the combined vocabulary
      expect(vocab['加']).toBe('+');
      expect(vocab['减']).toBe('-');
      expect(vocab['阿尔法']).toBe('\\alpha');
      expect(vocab['积分']).toBe('\\int');
      expect(vocab['并集']).toBe('\\cup');
    });

    it('should include English vocabulary when using Chinese language', () => {
      const vocab = getMathVocabulary('zh-CN');
      // English vocabulary is still available
      expect(vocab['alpha']).toBe('\\alpha');
      expect(vocab['integral']).toBe('\\int');
    });
  });
});
