/**
 * Calculator Tool - Perform mathematical calculations
 */

import { z } from 'zod';

export const calculatorInputSchema = z.object({
  expression: z.string().optional().describe('The mathematical expression to evaluate (required for calculate mode)'),
  precision: z
    .number()
    .min(0)
    .max(15)
    .optional()
    .default(10)
    .describe('Number of decimal places for the result'),
  mode: z
    .enum(['calculate', 'convert'])
    .optional()
    .default('calculate')
    .describe('Operation mode: "calculate" for math expressions, "convert" for unit conversions'),
  value: z
    .number()
    .optional()
    .describe('The numeric value to convert (required for convert mode)'),
  fromUnit: z
    .string()
    .optional()
    .describe('Source unit for conversion (e.g., "km", "lb", "f")'),
  toUnit: z
    .string()
    .optional()
    .describe('Target unit for conversion (e.g., "mi", "kg", "c")'),
  category: z
    .enum(['length', 'weight', 'temperature', 'time', 'data', 'speed', 'area', 'volume', 'angle', 'pressure'])
    .optional()
    .describe('Unit category for conversion. Available units — length: m/km/cm/mm/mi/ft/in/yd/nm/um, weight: kg/g/mg/lb/oz/ton/st, temperature: c/f/k, time: s/ms/us/ns/min/h/d/wk/mo/yr, data: b/kb/mb/gb/tb/pb, speed: m/s/km/h/mph/kn/ft/s, area: m2/km2/cm2/ha/acre/ft2/in2, volume: l/ml/m3/gal/qt/pt/cup/floz, angle: deg/rad/grad/turn, pressure: pa/kpa/bar/atm/psi/mmhg'),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

export interface CalculatorResult {
  success: boolean;
  expression?: string;
  result?: number;
  formattedResult?: string;
  error?: string;
  mode?: 'calculate' | 'convert';
  conversion?: {
    value: number;
    fromUnit: string;
    toUnit: string;
    category: string;
    result: number;
    formattedResult: string;
  };
}

/**
 * Safe math expression evaluator
 * Supports: +, -, *, /, ^, %, sqrt, sin, cos, tan, log, ln, abs, floor, ceil, round
 */
/**
 * Compute factorial of a non-negative integer
 */
function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error('Factorial requires a non-negative integer');
  if (n > 170) throw new Error('Factorial overflow: n must be <= 170');
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/**
 * Compute permutations P(n, r)
 */
function permutations(n: number, r: number): number {
  if (r > n) throw new Error('r cannot be greater than n in P(n,r)');
  return factorial(n) / factorial(n - r);
}

/**
 * Compute combinations C(n, r)
 */
function combinations(n: number, r: number): number {
  if (r > n) throw new Error('r cannot be greater than n in C(n,r)');
  return factorial(n) / (factorial(r) * factorial(n - r));
}

function evaluateExpression(expr: string): number {
  // Sanitize input - only allow safe characters
  const sanitized = expr
    .replace(/\s+/g, '')
    .toLowerCase()
    // Replace factorial notation: n! -> __fact__(n)
    .replace(/(\d+)!/g, '__fact__($1)')
    // Replace permutation notation: P(n,r) or perm(n,r)
    .replace(/(?:p|perm)\((\d+),(\d+)\)/g, '__perm__($1,$2)')
    // Replace combination notation: C(n,r) or comb(n,r)
    .replace(/(?:c|comb)\((\d+),(\d+)\)/g, '__comb__($1,$2)')
    // Replace common math functions with Math equivalents
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/cbrt\(/g, 'Math.cbrt(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/asin\(/g, 'Math.asin(')
    .replace(/acos\(/g, 'Math.acos(')
    .replace(/atan\(/g, 'Math.atan(')
    .replace(/atan2\(/g, 'Math.atan2(')
    .replace(/log2\(/g, 'Math.log2(')
    .replace(/log10\(/g, 'Math.log10(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/exp\(/g, 'Math.exp(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/floor\(/g, 'Math.floor(')
    .replace(/ceil\(/g, 'Math.ceil(')
    .replace(/round\(/g, 'Math.round(')
    .replace(/sign\(/g, 'Math.sign(')
    .replace(/trunc\(/g, 'Math.trunc(')
    .replace(/min\(/g, 'Math.min(')
    .replace(/max\(/g, 'Math.max(')
    .replace(/pow\(/g, 'Math.pow(')
    .replace(/hypot\(/g, 'Math.hypot(')
    .replace(/random\(\)/g, 'Math.random()')
    .replace(/pi/g, 'Math.PI')
    .replace(/(?<![a-z])e(?![a-z])/g, 'Math.E')
    .replace(/tau/g, '(2*Math.PI)')
    .replace(/inf/g, 'Infinity')
    // Replace ^ with ** for exponentiation
    .replace(/\^/g, '**')
    // Replace internal function markers
    .replace(/__fact__/g, '__f__')
    .replace(/__perm__/g, '__p__')
    .replace(/__comb__/g, '__c__');

  // Validate - only allow safe characters
  const safePattern = /^[0-9+\-*/().%,Mathsqrtcbincoabflerundlogsigxpwyhp2tINFI_PIEL*]+$/;
  if (!safePattern.test(sanitized)) {
    throw new Error('Invalid characters in expression');
  }

  // Evaluate using Function constructor with helper functions
  try {
    const fn = new Function(
      '__f__', '__p__', '__c__',
      `"use strict"; return (${sanitized});`
    );
    const result = fn(factorial, permutations, combinations);
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return result;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to evaluate expression');
  }
}

/**
 * Execute calculator
 */
export async function executeCalculator(
  input: CalculatorInput
): Promise<CalculatorResult> {
  const mode = input.mode || 'calculate';

  // Unit conversion mode
  if (mode === 'convert') {
    if (input.value === undefined || !input.fromUnit || !input.toUnit || !input.category) {
      return {
        success: false,
        mode: 'convert',
        error: 'Unit conversion requires: value, fromUnit, toUnit, and category',
      };
    }

    try {
      const result = convertUnit(input.value, input.fromUnit, input.toUnit, input.category);
      const rounded = Number(result.toFixed(input.precision));

      return {
        success: true,
        mode: 'convert',
        result: rounded,
        formattedResult: `${input.value} ${input.fromUnit} = ${rounded.toLocaleString('en-US', { maximumFractionDigits: input.precision })} ${input.toUnit}`,
        conversion: {
          value: input.value,
          fromUnit: input.fromUnit,
          toUnit: input.toUnit,
          category: input.category,
          result: rounded,
          formattedResult: rounded.toLocaleString('en-US', { maximumFractionDigits: input.precision }),
        },
      };
    } catch (error) {
      return {
        success: false,
        mode: 'convert',
        error: error instanceof Error ? error.message : 'Unit conversion failed',
      };
    }
  }

  // Calculate mode (default)
  if (!input.expression) {
    return {
      success: false,
      mode: 'calculate',
      error: 'Expression is required for calculate mode',
    };
  }

  try {
    const result = evaluateExpression(input.expression);
    const rounded = Number(result.toFixed(input.precision));

    return {
      success: true,
      mode: 'calculate',
      expression: input.expression,
      result: rounded,
      formattedResult: rounded.toLocaleString('en-US', {
        maximumFractionDigits: input.precision,
      }),
    };
  } catch (error) {
    return {
      success: false,
      mode: 'calculate',
      expression: input.expression,
      error: error instanceof Error ? error.message : 'Calculation failed',
    };
  }
}

/**
 * Calculator tool definition
 */
export const calculatorTool = {
  name: 'calculator',
  description:
    `Perform mathematical calculations and unit conversions.

Calculate mode (default): Supports +, -, *, /, ^, %, and functions:
- Basic: sqrt, cbrt, abs, floor, ceil, round, sign, trunc, exp, pow(x,y)
- Trig: sin, cos, tan, asin, acos, atan, atan2(y,x)
- Log: log (base-10), log2, ln (natural), log10
- Stats: min(a,b,...), max(a,b,...), hypot(a,b)
- Combinatorics: n! (factorial), P(n,r) or perm(n,r), C(n,r) or comb(n,r)
- Constants: pi, e, tau (2*pi), inf

Convert mode: Set mode="convert" with value, fromUnit, toUnit, and category.
Categories: length, weight, temperature, time, data, speed, area, volume, angle, pressure.`,
  parameters: calculatorInputSchema,
  execute: executeCalculator,
  requiresApproval: false,
  category: 'system' as const,
};

/**
 * Unit conversion helper
 */
export const unitConversions: Record<string, Record<string, number>> = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    um: 0.000001,
    nm: 0.000000001,
    mi: 1609.344,
    ft: 0.3048,
    in: 0.0254,
    yd: 0.9144,
  },
  weight: {
    kg: 1,
    g: 0.001,
    mg: 0.000001,
    lb: 0.453592,
    oz: 0.0283495,
    ton: 1000,
    st: 6.35029,
  },
  temperature: {
    c: 1, // Celsius as base (special handling needed)
    f: 1,
    k: 1,
  },
  time: {
    s: 1,
    ms: 0.001,
    us: 0.000001,
    ns: 0.000000001,
    min: 60,
    h: 3600,
    d: 86400,
    wk: 604800,
    mo: 2592000,
    yr: 31536000,
  },
  data: {
    b: 1,
    kb: 1024,
    mb: 1048576,
    gb: 1073741824,
    tb: 1099511627776,
    pb: 1125899906842624,
  },
  speed: {
    'm/s': 1,
    'km/h': 1 / 3.6,
    mph: 0.44704,
    kn: 0.514444,
    'ft/s': 0.3048,
  },
  area: {
    m2: 1,
    km2: 1000000,
    cm2: 0.0001,
    ha: 10000,
    acre: 4046.8564224,
    ft2: 0.09290304,
    in2: 0.00064516,
  },
  volume: {
    l: 1,
    ml: 0.001,
    m3: 1000,
    gal: 3.78541,
    qt: 0.946353,
    pt: 0.473176,
    cup: 0.236588,
    floz: 0.0295735,
  },
  angle: {
    deg: 1,
    rad: 180 / Math.PI,
    grad: 0.9,
    turn: 360,
  },
  pressure: {
    pa: 1,
    kpa: 1000,
    bar: 100000,
    atm: 101325,
    psi: 6894.757,
    mmhg: 133.322,
  },
};

/**
 * Convert between units
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: keyof typeof unitConversions
): number {
  const conversions = unitConversions[category];
  if (!conversions) {
    throw new Error(`Unknown unit category: ${category}`);
  }

  const from = fromUnit.toLowerCase();
  const to = toUnit.toLowerCase();

  // Special handling for temperature
  if (category === 'temperature') {
    return convertTemperature(value, from, to);
  }

  const fromFactor = conversions[from];
  const toFactor = conversions[to];

  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unknown unit: ${from} or ${to}`);
  }

  // Convert to base unit, then to target unit
  const baseValue = value * fromFactor;
  return baseValue / toFactor;
}

/**
 * Convert temperature between Celsius, Fahrenheit, and Kelvin
 */
function convertTemperature(value: number, from: string, to: string): number {
  // Convert to Celsius first
  let celsius: number;
  switch (from) {
    case 'c':
      celsius = value;
      break;
    case 'f':
      celsius = (value - 32) * (5 / 9);
      break;
    case 'k':
      celsius = value - 273.15;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${from}`);
  }

  // Convert from Celsius to target
  switch (to) {
    case 'c':
      return celsius;
    case 'f':
      return celsius * (9 / 5) + 32;
    case 'k':
      return celsius + 273.15;
    default:
      throw new Error(`Unknown temperature unit: ${to}`);
  }
}
