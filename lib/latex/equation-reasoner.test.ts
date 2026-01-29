/**
 * Equation Reasoner - Unit Tests
 */

import equationReasonerApi from './equation-reasoner';

describe('Equation Reasoner', () => {
  describe('default export API', () => {
    it('should export all functions', () => {
      expect(equationReasonerApi.analyzeEquation).toBeDefined();
      expect(equationReasonerApi.verifyEquation).toBeDefined();
      expect(equationReasonerApi.expandEquation).toBeDefined();
      expect(equationReasonerApi.simplifyEquation).toBeDefined();
    });
  });

  describe('analyzeEquation', () => {
    it('should analyze simple equation', () => {
      const result = equationReasonerApi.analyzeEquation('x + y = z');
      expect(result).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.variables).toBeDefined();
    });

    it('should identify variables', () => {
      const result = equationReasonerApi.analyzeEquation('ax^2 + bx + c = 0');
      expect(result.variables).toContain('x');
    });

    it('should identify functions', () => {
      const result = equationReasonerApi.analyzeEquation('\\sin(x) + \\cos(y) = 1');
      expect(result.functions).toBeDefined();
      expect(result.functions.length).toBeGreaterThan(0);
    });

    it('should calculate complexity', () => {
      const simple = equationReasonerApi.analyzeEquation('x = 1');
      const complex = equationReasonerApi.analyzeEquation('\\frac{d^2y}{dx^2} + \\omega^2 y = 0');
      expect(complex.complexity).toBeGreaterThanOrEqual(simple.complexity);
    });
  });

  describe('verifyEquation', () => {
    it('should verify valid equation', () => {
      const result = equationReasonerApi.verifyEquation('1 + 1 = 2');
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
    });

    it('should detect issues in invalid equations', () => {
      const result = equationReasonerApi.verifyEquation('x + = y');
      expect(result.issues).toBeDefined();
    });

    it('should provide suggestions', () => {
      const result = equationReasonerApi.verifyEquation('x^2 + y^2 = z^2');
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('expandEquation', () => {
    it('should expand algebraic expressions', () => {
      const result = equationReasonerApi.expandEquation('(a+b)^2');
      expect(result).toBeDefined();
      expect(result.expanded).toBeDefined();
    });

    it('should provide expansion steps', () => {
      const result = equationReasonerApi.expandEquation('(x+1)(x-1)');
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });

  describe('simplifyEquation', () => {
    it('should simplify expressions', () => {
      const result = equationReasonerApi.simplifyEquation('x + x');
      expect(result).toBeDefined();
      expect(result.simplified).toBeDefined();
    });

    it('should provide simplification steps', () => {
      const result = equationReasonerApi.simplifyEquation('2x + 3x');
      expect(result.steps).toBeDefined();
    });

    it('should preserve original expression', () => {
      const expr = 'x^2 + 2x + 1';
      const result = equationReasonerApi.simplifyEquation(expr);
      expect(result.original).toBe(expr);
    });
  });
});
