/**
 * Calculator Tool - Perform mathematical calculations
 */

import { z } from 'zod';

export const calculatorInputSchema = z.object({
  expression: z.string().describe('The mathematical expression to evaluate'),
  precision: z
    .number()
    .min(0)
    .max(15)
    .optional()
    .default(10)
    .describe('Number of decimal places for the result'),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;

export interface CalculatorResult {
  success: boolean;
  expression?: string;
  result?: number;
  formattedResult?: string;
  error?: string;
}

/**
 * Safe math expression evaluator
 * Supports: +, -, *, /, ^, %, sqrt, sin, cos, tan, log, ln, abs, floor, ceil, round
 */
function evaluateExpression(expr: string): number {
  // Sanitize input - only allow safe characters
  const sanitized = expr
    .replace(/\s+/g, '')
    .toLowerCase()
    // Replace common math functions with Math equivalents
    .replace(/sqrt\(/g, 'Math.sqrt(')
    .replace(/sin\(/g, 'Math.sin(')
    .replace(/cos\(/g, 'Math.cos(')
    .replace(/tan\(/g, 'Math.tan(')
    .replace(/log\(/g, 'Math.log10(')
    .replace(/ln\(/g, 'Math.log(')
    .replace(/abs\(/g, 'Math.abs(')
    .replace(/floor\(/g, 'Math.floor(')
    .replace(/ceil\(/g, 'Math.ceil(')
    .replace(/round\(/g, 'Math.round(')
    .replace(/pi/g, 'Math.PI')
    .replace(/e(?![a-z])/g, 'Math.E')
    // Replace ^ with ** for exponentiation
    .replace(/\^/g, '**');

  // Validate - only allow safe characters (numbers, operators, Math functions)
  // Allow: digits, operators, parentheses, Math object methods, and common constants
  const safePattern = /^[0-9+\-*/().%\s,Mathsqrtincoabflerundlog.PIEL*]+$/;
  if (!safePattern.test(sanitized)) {
    throw new Error('Invalid characters in expression');
  }

  // Evaluate using Function constructor (safer than eval)
  try {
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const result = fn();
    
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return result;
  } catch {
    throw new Error('Failed to evaluate expression');
  }
}

/**
 * Execute calculator
 */
export async function executeCalculator(
  input: CalculatorInput
): Promise<CalculatorResult> {
  try {
    const result = evaluateExpression(input.expression);
    const rounded = Number(result.toFixed(input.precision));

    return {
      success: true,
      expression: input.expression,
      result: rounded,
      formattedResult: rounded.toLocaleString('en-US', {
        maximumFractionDigits: input.precision,
      }),
    };
  } catch (error) {
    return {
      success: false,
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
    'Perform mathematical calculations. Supports basic operations (+, -, *, /, ^, %), and functions (sqrt, sin, cos, tan, log, ln, abs, floor, ceil, round). Use pi and e for constants.',
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
  },
  temperature: {
    c: 1, // Celsius as base (special handling needed)
    f: 1,
    k: 1,
  },
  time: {
    s: 1,
    ms: 0.001,
    min: 60,
    h: 3600,
    d: 86400,
    wk: 604800,
  },
  data: {
    b: 1,
    kb: 1024,
    mb: 1048576,
    gb: 1073741824,
    tb: 1099511627776,
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
