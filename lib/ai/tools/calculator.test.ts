/**
 * Tests for Calculator Tool
 */

import {
  executeCalculator,
  convertUnit,
  unitConversions,
  calculatorTool,
  type CalculatorInput,
} from './calculator';

describe('executeCalculator', () => {
  describe('basic operations', () => {
    it('evaluates addition', async () => {
      const input: CalculatorInput = { expression: '2 + 3', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('evaluates subtraction', async () => {
      const input: CalculatorInput = { expression: '10 - 4', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(6);
    });

    it('evaluates multiplication', async () => {
      const input: CalculatorInput = { expression: '7 * 8', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(56);
    });

    it('evaluates division', async () => {
      const input: CalculatorInput = { expression: '20 / 4', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('evaluates modulo', async () => {
      const input: CalculatorInput = { expression: '17 % 5', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(2);
    });

    it('evaluates exponentiation', async () => {
      const input: CalculatorInput = { expression: '2 ^ 8', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(256);
    });
  });

  describe('math functions', () => {
    it('evaluates sqrt', async () => {
      const input: CalculatorInput = { expression: 'sqrt(16)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('evaluates abs', async () => {
      const input: CalculatorInput = { expression: 'abs(-5)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('evaluates floor', async () => {
      const input: CalculatorInput = { expression: 'floor(3.7)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    it('evaluates ceil', async () => {
      const input: CalculatorInput = { expression: 'ceil(3.2)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('evaluates round', async () => {
      const input: CalculatorInput = { expression: 'round(3.5)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('evaluates sin', async () => {
      const input: CalculatorInput = { expression: 'sin(0)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(0);
    });

    it('evaluates cos', async () => {
      const input: CalculatorInput = { expression: 'cos(0)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(1);
    });

    it('evaluates tan', async () => {
      const input: CalculatorInput = { expression: 'tan(0)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(0);
    });

    it('evaluates log (base 10)', async () => {
      const input: CalculatorInput = { expression: 'log(100)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(2);
    });

    it('evaluates ln (natural log)', async () => {
      const input: CalculatorInput = { expression: 'ln(1)', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(0);
    });
  });

  describe('constants', () => {
    it('uses pi constant', async () => {
      const input: CalculatorInput = { expression: 'pi', precision: 5 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(3.14159, 4);
    });

    it('uses e constant', async () => {
      const input: CalculatorInput = { expression: 'e', precision: 5 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBeCloseTo(2.71828, 4);
    });
  });

  describe('complex expressions', () => {
    it('handles parentheses', async () => {
      const input: CalculatorInput = { expression: '(2 + 3) * 4', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
    });

    it('handles nested functions', async () => {
      const input: CalculatorInput = { expression: 'sqrt(abs(-16))', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('handles mixed operations', async () => {
      const input: CalculatorInput = { expression: '2 + 3 * 4 - 1', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(13);
    });
  });

  describe('precision', () => {
    it('respects precision setting', async () => {
      const input: CalculatorInput = { expression: '1/3', precision: 2 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe(0.33);
    });

    it('handles high precision', async () => {
      const input: CalculatorInput = { expression: 'pi', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(true);
      expect(result.result?.toString().length).toBeGreaterThan(5);
    });
  });

  describe('error handling', () => {
    it('handles invalid expressions', async () => {
      const input: CalculatorInput = { expression: 'invalid', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles division by zero', async () => {
      const input: CalculatorInput = { expression: '1/0', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.success).toBe(false);
    });

    it('returns original expression in result', async () => {
      const input: CalculatorInput = { expression: '2 + 2', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.expression).toBe('2 + 2');
    });

    it('provides formatted result', async () => {
      const input: CalculatorInput = { expression: '1000 + 234', precision: 10 };
      const result = await executeCalculator(input);
      
      expect(result.formattedResult).toBeDefined();
      expect(result.formattedResult).toContain('1');
    });
  });
});

describe('convertUnit', () => {
  describe('length conversions', () => {
    it('converts meters to kilometers', () => {
      expect(convertUnit(1000, 'm', 'km', 'length')).toBe(1);
    });

    it('converts kilometers to meters', () => {
      expect(convertUnit(1, 'km', 'm', 'length')).toBe(1000);
    });

    it('converts meters to centimeters', () => {
      expect(convertUnit(1, 'm', 'cm', 'length')).toBe(100);
    });

    it('converts feet to meters', () => {
      expect(convertUnit(1, 'ft', 'm', 'length')).toBeCloseTo(0.3048, 4);
    });

    it('converts miles to kilometers', () => {
      expect(convertUnit(1, 'mi', 'km', 'length')).toBeCloseTo(1.609344, 4);
    });

    it('converts inches to centimeters', () => {
      expect(convertUnit(1, 'in', 'cm', 'length')).toBeCloseTo(2.54, 2);
    });
  });

  describe('weight conversions', () => {
    it('converts kilograms to grams', () => {
      expect(convertUnit(1, 'kg', 'g', 'weight')).toBe(1000);
    });

    it('converts pounds to kilograms', () => {
      expect(convertUnit(1, 'lb', 'kg', 'weight')).toBeCloseTo(0.453592, 4);
    });

    it('converts ounces to grams', () => {
      expect(convertUnit(1, 'oz', 'g', 'weight')).toBeCloseTo(28.3495, 2);
    });

    it('converts tons to kilograms', () => {
      expect(convertUnit(1, 'ton', 'kg', 'weight')).toBe(1000);
    });
  });

  describe('temperature conversions', () => {
    it('converts Celsius to Fahrenheit', () => {
      expect(convertUnit(0, 'c', 'f', 'temperature')).toBe(32);
    });

    it('converts Fahrenheit to Celsius', () => {
      expect(convertUnit(32, 'f', 'c', 'temperature')).toBe(0);
    });

    it('converts Celsius to Kelvin', () => {
      expect(convertUnit(0, 'c', 'k', 'temperature')).toBeCloseTo(273.15, 2);
    });

    it('converts Kelvin to Celsius', () => {
      expect(convertUnit(273.15, 'k', 'c', 'temperature')).toBeCloseTo(0, 2);
    });

    it('converts 100°C to 212°F', () => {
      expect(convertUnit(100, 'c', 'f', 'temperature')).toBe(212);
    });
  });

  describe('time conversions', () => {
    it('converts minutes to seconds', () => {
      expect(convertUnit(1, 'min', 's', 'time')).toBe(60);
    });

    it('converts hours to minutes', () => {
      expect(convertUnit(1, 'h', 'min', 'time')).toBe(60);
    });

    it('converts days to hours', () => {
      expect(convertUnit(1, 'd', 'h', 'time')).toBe(24);
    });

    it('converts weeks to days', () => {
      expect(convertUnit(1, 'wk', 'd', 'time')).toBe(7);
    });
  });

  describe('data conversions', () => {
    it('converts kilobytes to bytes', () => {
      expect(convertUnit(1, 'kb', 'b', 'data')).toBe(1024);
    });

    it('converts megabytes to kilobytes', () => {
      expect(convertUnit(1, 'mb', 'kb', 'data')).toBe(1024);
    });

    it('converts gigabytes to megabytes', () => {
      expect(convertUnit(1, 'gb', 'mb', 'data')).toBe(1024);
    });

    it('converts terabytes to gigabytes', () => {
      expect(convertUnit(1, 'tb', 'gb', 'data')).toBe(1024);
    });
  });

  describe('error handling', () => {
    it('throws error for unknown category', () => {
      expect(() => convertUnit(1, 'm', 'km', 'unknown' as keyof typeof unitConversions)).toThrow('Unknown unit category');
    });

    it('throws error for unknown unit', () => {
      expect(() => convertUnit(1, 'unknown', 'km', 'length')).toThrow('Unknown unit');
    });

    it('is case insensitive', () => {
      expect(convertUnit(1, 'KM', 'M', 'length')).toBe(1000);
    });
  });
});

describe('calculatorTool', () => {
  it('has correct name', () => {
    expect(calculatorTool.name).toBe('calculator');
  });

  it('has description', () => {
    expect(calculatorTool.description).toBeDefined();
    expect(calculatorTool.description.length).toBeGreaterThan(0);
  });

  it('has parameters schema', () => {
    expect(calculatorTool.parameters).toBeDefined();
  });

  it('has execute function', () => {
    expect(typeof calculatorTool.execute).toBe('function');
  });

  it('does not require approval', () => {
    expect(calculatorTool.requiresApproval).toBe(false);
  });

  it('is in system category', () => {
    expect(calculatorTool.category).toBe('system');
  });
});
