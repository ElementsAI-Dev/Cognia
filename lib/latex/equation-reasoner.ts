/**
 * Equation Reasoner
 * Verifies mathematical correctness, expands derivations, and analyzes equations
 */

// ============================================================================
// Types
// ============================================================================

export interface EquationVerificationResult {
  isValid: boolean;
  confidence: number;
  issues: EquationIssue[];
  suggestions: string[];
  steps?: DerivationStep[];
}

export interface EquationIssue {
  type: EquationIssueType;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    start: number;
    end: number;
  };
  suggestion?: string;
}

export type EquationIssueType =
  | 'syntax-error'
  | 'dimension-mismatch'
  | 'undefined-variable'
  | 'type-mismatch'
  | 'domain-error'
  | 'simplification-possible'
  | 'notation-inconsistency'
  | 'missing-parentheses'
  | 'redundant-operation';

export interface DerivationStep {
  step: number;
  expression: string;
  description: string;
  rule?: string;
}

export interface EquationAnalysis {
  type: EquationType;
  variables: string[];
  constants: string[];
  operators: string[];
  functions: string[];
  complexity: number;
  domain?: string;
  range?: string;
}

export type EquationType =
  | 'algebraic'
  | 'differential'
  | 'integral'
  | 'matrix'
  | 'trigonometric'
  | 'exponential'
  | 'logarithmic'
  | 'polynomial'
  | 'rational'
  | 'mixed';

export interface SimplificationResult {
  original: string;
  simplified: string;
  steps: DerivationStep[];
  equivalenceProof?: string;
}

export interface ExpansionResult {
  original: string;
  expanded: string;
  steps: DerivationStep[];
}

// ============================================================================
// Pattern Recognition
// ============================================================================

const VARIABLE_PATTERN = /[a-zA-Z](?![a-zA-Z])/g;
const CONSTANT_PATTERN = /\d+\.?\d*|\\pi|\\e|\\infty/g;
const FUNCTION_PATTERN = /\\(sin|cos|tan|cot|sec|csc|log|ln|exp|sqrt|lim|sum|prod|int)/g;
const OPERATOR_PATTERN = /[+\-*/^=<>]|\\(times|div|cdot|pm|mp|leq|geq|neq|approx|equiv)/g;

const GREEK_LETTERS = [
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'rho', 'sigma',
  'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega',
];

const COMMON_IDENTITIES: { pattern: RegExp; name: string; equivalent: string }[] = [
  { pattern: /\\sin\^2\s*\+\s*\\cos\^2/, name: 'Pythagorean identity', equivalent: '1' },
  { pattern: /1\s*-\s*\\cos\^2/, name: 'Pythagorean identity', equivalent: '\\sin^2' },
  { pattern: /1\s*-\s*\\sin\^2/, name: 'Pythagorean identity', equivalent: '\\cos^2' },
  { pattern: /\\frac\{\\sin\}\{\\cos\}/, name: 'Tangent definition', equivalent: '\\tan' },
  { pattern: /\\frac\{\\cos\}\{\\sin\}/, name: 'Cotangent definition', equivalent: '\\cot' },
  { pattern: /e\^{i\\pi}\s*\+\s*1/, name: "Euler's identity", equivalent: '0' },
  { pattern: /\\ln\(e\^/, name: 'Logarithm-exponential inverse', equivalent: '' },
  { pattern: /e\^{\\ln/, name: 'Exponential-logarithm inverse', equivalent: '' },
];

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze an equation to extract components
 */
export function analyzeEquation(latex: string): EquationAnalysis {
  const variables = extractVariables(latex);
  const constants = extractConstants(latex);
  const operators = extractOperators(latex);
  const functions = extractFunctions(latex);
  const type = determineEquationType(latex, functions);
  const complexity = calculateComplexity(latex, variables, functions, operators);

  return {
    type,
    variables,
    constants,
    operators,
    functions,
    complexity,
  };
}

/**
 * Extract variables from LaTeX expression
 */
function extractVariables(latex: string): string[] {
  const variables = new Set<string>();

  // Single letter variables
  const singleLetters = latex.match(VARIABLE_PATTERN) || [];
  singleLetters.forEach((v) => variables.add(v));

  // Greek letters as variables
  for (const greek of GREEK_LETTERS) {
    if (latex.includes(`\\${greek}`)) {
      variables.add(`\\${greek}`);
    }
  }

  // Note: Common variable names like 'x', 'y', 'z', 't', 'n', 'i', 'j', 'k'
  // are kept as they're typically variables, not function names

  // Remove 'd' when it's part of differential
  if (latex.includes('\\frac{d')) {
    variables.delete('d');
  }

  return Array.from(variables);
}

/**
 * Extract constants from LaTeX expression
 */
function extractConstants(latex: string): string[] {
  const constants = new Set<string>();

  const matches = latex.match(CONSTANT_PATTERN) || [];
  matches.forEach((c) => constants.add(c));

  return Array.from(constants);
}

/**
 * Extract operators from LaTeX expression
 */
function extractOperators(latex: string): string[] {
  const operators = new Set<string>();

  const matches = latex.match(OPERATOR_PATTERN) || [];
  matches.forEach((o) => operators.add(o));

  return Array.from(operators);
}

/**
 * Extract functions from LaTeX expression
 */
function extractFunctions(latex: string): string[] {
  const functions = new Set<string>();

  const matches = latex.match(FUNCTION_PATTERN) || [];
  matches.forEach((f) => functions.add(f));

  // Check for matrix environments
  if (latex.includes('matrix') || latex.includes('pmatrix') || latex.includes('bmatrix')) {
    functions.add('matrix');
  }

  return Array.from(functions);
}

/**
 * Determine the type of equation
 */
function determineEquationType(latex: string, functions: string[]): EquationType {
  // Check for differential equations
  if (latex.includes('\\frac{d') || latex.includes("'") || latex.includes('\\dot')) {
    return 'differential';
  }

  // Check for integrals
  if (functions.some((f) => f.includes('int'))) {
    return 'integral';
  }

  // Check for matrices
  if (functions.includes('matrix')) {
    return 'matrix';
  }

  // Check for trigonometric
  if (functions.some((f) => ['\\sin', '\\cos', '\\tan', '\\cot', '\\sec', '\\csc'].includes(f))) {
    return 'trigonometric';
  }

  // Check for exponential/logarithmic
  if (functions.some((f) => f.includes('exp') || f.includes('log') || f.includes('ln'))) {
    if (functions.some((f) => f.includes('log') || f.includes('ln'))) {
      return 'logarithmic';
    }
    return 'exponential';
  }

  // Check for polynomial (has powers but no special functions)
  if (latex.includes('^') && functions.length === 0) {
    return 'polynomial';
  }

  // Check for rational expressions
  if (latex.includes('\\frac') && !latex.includes('\\frac{d')) {
    return 'rational';
  }

  return 'algebraic';
}

/**
 * Calculate complexity score
 */
function calculateComplexity(
  latex: string,
  variables: string[],
  functions: string[],
  operators: string[]
): number {
  let complexity = 0;

  // Base complexity from length
  complexity += Math.log10(latex.length + 1);

  // Add for variables
  complexity += variables.length * 0.5;

  // Add for functions (weighted by type)
  for (const func of functions) {
    if (func.includes('int') || func.includes('sum') || func.includes('prod')) {
      complexity += 2;
    } else if (func.includes('lim')) {
      complexity += 1.5;
    } else {
      complexity += 1;
    }
  }

  // Add for nested structures
  const braceDepth = Math.max(...calculateBraceDepths(latex));
  complexity += braceDepth * 0.5;

  // Add for operators
  complexity += operators.length * 0.3;

  return Math.round(complexity * 10) / 10;
}

/**
 * Calculate brace depths throughout the expression
 */
function calculateBraceDepths(latex: string): number[] {
  const depths: number[] = [];
  let currentDepth = 0;

  for (const char of latex) {
    if (char === '{') {
      currentDepth++;
    } else if (char === '}') {
      currentDepth--;
    }
    depths.push(currentDepth);
  }

  return depths.length > 0 ? depths : [0];
}

// ============================================================================
// Verification Functions
// ============================================================================

/**
 * Verify mathematical correctness of an equation
 */
export function verifyEquation(latex: string): EquationVerificationResult {
  const issues: EquationIssue[] = [];
  const suggestions: string[] = [];

  // Check syntax
  const syntaxIssues = checkSyntax(latex);
  issues.push(...syntaxIssues);

  // Check for balanced delimiters
  const delimiterIssues = checkDelimiters(latex);
  issues.push(...delimiterIssues);

  // Check for common mistakes
  const mistakeIssues = checkCommonMistakes(latex);
  issues.push(...mistakeIssues);

  // Check for simplification opportunities
  const simplificationSuggestions = findSimplifications(latex);
  suggestions.push(...simplificationSuggestions);

  // Calculate confidence
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const confidence = Math.max(0, 1 - errorCount * 0.3 - warningCount * 0.1);

  return {
    isValid: errorCount === 0,
    confidence,
    issues,
    suggestions,
  };
}

/**
 * Check LaTeX syntax
 */
function checkSyntax(latex: string): EquationIssue[] {
  const issues: EquationIssue[] = [];

  // Check for unmatched braces
  let braceCount = 0;
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === '{') braceCount++;
    if (latex[i] === '}') braceCount--;
    if (braceCount < 0) {
      issues.push({
        type: 'syntax-error',
        severity: 'error',
        message: 'Unexpected closing brace',
        location: { start: i, end: i + 1 },
      });
      braceCount = 0;
    }
  }
  if (braceCount > 0) {
    issues.push({
      type: 'syntax-error',
      severity: 'error',
      message: `${braceCount} unclosed brace(s)`,
    });
  }

  // Check for incomplete commands
  const incompleteCommands = latex.match(/\\[a-zA-Z]+(?![{a-zA-Z])/g) || [];
  for (const cmd of incompleteCommands) {
    // These commands don't need arguments
    const noArgCommands = [
      '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\pi',
      '\\infty', '\\times', '\\div', '\\cdot', '\\pm', '\\mp',
      '\\leq', '\\geq', '\\neq', '\\approx', '\\equiv',
      '\\sin', '\\cos', '\\tan', '\\log', '\\ln', '\\exp',
      '\\quad', '\\qquad', '\\left', '\\right',
    ];
    if (!noArgCommands.some((c) => cmd.startsWith(c))) {
      // Check if it's followed by a brace
      const cmdIndex = latex.indexOf(cmd);
      const afterCmd = latex.slice(cmdIndex + cmd.length);
      if (!afterCmd.startsWith('{') && !afterCmd.startsWith('[')) {
        issues.push({
          type: 'syntax-error',
          severity: 'warning',
          message: `Command ${cmd} may need arguments`,
          suggestion: `${cmd}{}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Check for balanced delimiters
 */
function checkDelimiters(latex: string): EquationIssue[] {
  const issues: EquationIssue[] = [];
  const pairs: [string, string][] = [
    ['(', ')'],
    ['[', ']'],
    ['\\{', '\\}'],
    ['\\left', '\\right'],
    ['\\begin', '\\end'],
  ];

  // Helper to escape regex special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  for (const [open, close] of pairs) {
    const openCount = (latex.match(new RegExp(escapeRegex(open), 'g')) || []).length;
    const closeCount = (latex.match(new RegExp(escapeRegex(close), 'g')) || []).length;

    if (openCount !== closeCount) {
      issues.push({
        type: 'syntax-error',
        severity: 'error',
        message: `Unbalanced ${open}...${close} (${openCount} open, ${closeCount} close)`,
      });
    }
  }

  return issues;
}

/**
 * Check for common mathematical mistakes
 */
function checkCommonMistakes(latex: string): EquationIssue[] {
  const issues: EquationIssue[] = [];

  // Division by zero potential
  if (latex.includes('\\frac{') && latex.match(/\\frac\{[^}]+\}\{0\}/)) {
    issues.push({
      type: 'domain-error',
      severity: 'error',
      message: 'Division by zero',
    });
  }

  // Missing multiplication between variable and parenthesis
  if (/[a-zA-Z]\(/.test(latex) && !latex.includes('\\')) {
    issues.push({
      type: 'notation-inconsistency',
      severity: 'info',
      message: 'Consider adding explicit multiplication: a(b) → a \\cdot (b) or a \\times (b)',
    });
  }

  // Double negative
  if (/--/.test(latex) || /\+-/.test(latex) || /-\+/.test(latex)) {
    issues.push({
      type: 'simplification-possible',
      severity: 'info',
      message: 'Double sign can be simplified',
    });
  }

  // Redundant parentheses
  if (/\(\([^()]+\)\)/.test(latex)) {
    issues.push({
      type: 'redundant-operation',
      severity: 'info',
      message: 'Redundant nested parentheses detected',
    });
  }

  return issues;
}

/**
 * Find simplification opportunities
 */
function findSimplifications(latex: string): string[] {
  const suggestions: string[] = [];

  // Check for known identities
  for (const identity of COMMON_IDENTITIES) {
    if (identity.pattern.test(latex)) {
      suggestions.push(`${identity.name} can simplify to ${identity.equivalent || 'a simpler form'}`);
    }
  }

  // x^1 = x
  if (/\^{?1}?(?![0-9])/.test(latex)) {
    suggestions.push('x^1 can be simplified to x');
  }

  // x^0 = 1
  if (/\^{?0}?(?![0-9])/.test(latex)) {
    suggestions.push('x^0 = 1 for x ≠ 0');
  }

  // x * 1 or 1 * x
  if (/\\cdot\s*1(?![0-9])/.test(latex) || /1\s*\\cdot/.test(latex)) {
    suggestions.push('Multiplication by 1 can be removed');
  }

  // x + 0 or 0 + x
  if (/\+\s*0(?![0-9])/.test(latex) || /0\s*\+/.test(latex)) {
    suggestions.push('Addition of 0 can be removed');
  }

  return suggestions;
}

// ============================================================================
// Expansion and Simplification
// ============================================================================

/**
 * Expand an equation step by step
 */
export function expandEquation(latex: string): ExpansionResult {
  const steps: DerivationStep[] = [];
  let current = latex;
  let stepNum = 1;

  // Add initial step
  steps.push({
    step: stepNum++,
    expression: current,
    description: 'Original expression',
  });

  // Expand (a + b)^2
  if (/\(([^)]+)\s*\+\s*([^)]+)\)\^{?2}?/.test(current)) {
    const match = current.match(/\(([^)]+)\s*\+\s*([^)]+)\)\^{?2}?/);
    if (match) {
      const a = match[1];
      const b = match[2];
      const expanded = `${a}^2 + 2${a}${b} + ${b}^2`;
      current = current.replace(match[0], expanded);
      steps.push({
        step: stepNum++,
        expression: current,
        description: 'Expand perfect square: (a+b)² = a² + 2ab + b²',
        rule: 'Perfect square expansion',
      });
    }
  }

  // Expand (a - b)^2
  if (/\(([^)]+)\s*-\s*([^)]+)\)\^{?2}?/.test(current)) {
    const match = current.match(/\(([^)]+)\s*-\s*([^)]+)\)\^{?2}?/);
    if (match) {
      const a = match[1];
      const b = match[2];
      const expanded = `${a}^2 - 2${a}${b} + ${b}^2`;
      current = current.replace(match[0], expanded);
      steps.push({
        step: stepNum++,
        expression: current,
        description: 'Expand perfect square: (a-b)² = a² - 2ab + b²',
        rule: 'Perfect square expansion',
      });
    }
  }

  // Expand (a + b)(a - b)
  if (/\(([^)]+)\s*\+\s*([^)]+)\)\s*\(([^)]+)\s*-\s*([^)]+)\)/.test(current)) {
    const match = current.match(/\(([^)]+)\s*\+\s*([^)]+)\)\s*\(([^)]+)\s*-\s*([^)]+)\)/);
    if (match && match[1] === match[3] && match[2] === match[4]) {
      const a = match[1];
      const b = match[2];
      const expanded = `${a}^2 - ${b}^2`;
      current = current.replace(match[0], expanded);
      steps.push({
        step: stepNum++,
        expression: current,
        description: 'Difference of squares: (a+b)(a-b) = a² - b²',
        rule: 'Difference of squares',
      });
    }
  }

  return {
    original: latex,
    expanded: current,
    steps,
  };
}

/**
 * Simplify an equation step by step
 */
export function simplifyEquation(latex: string): SimplificationResult {
  const steps: DerivationStep[] = [];
  let current = latex;
  let stepNum = 1;

  // Add initial step
  steps.push({
    step: stepNum++,
    expression: current,
    description: 'Original expression',
  });

  // Simplify x^1 to x
  if (/\^{?1}?(?![0-9])/.test(current)) {
    current = current.replace(/\^{?1}?(?![0-9])/g, '');
    steps.push({
      step: stepNum++,
      expression: current,
      description: 'x^1 = x',
      rule: 'Identity exponent',
    });
  }

  // Simplify x^0 to 1 (when appropriate)
  // Note: This is a simplification that needs context

  // Simplify a/a to 1
  if (/\\frac\{([^}]+)\}\{\1\}/.test(current)) {
    current = current.replace(/\\frac\{([^}]+)\}\{\1\}/g, '1');
    steps.push({
      step: stepNum++,
      expression: current,
      description: 'a/a = 1',
      rule: 'Self-division',
    });
  }

  // Simplify x * 1 to x
  if (/\\cdot\s*1(?![0-9])/.test(current)) {
    current = current.replace(/\\cdot\s*1(?![0-9])/g, '');
    steps.push({
      step: stepNum++,
      expression: current,
      description: 'x · 1 = x',
      rule: 'Multiplicative identity',
    });
  }

  // Simplify x + 0 to x
  if (/\+\s*0(?![0-9])/.test(current)) {
    current = current.replace(/\+\s*0(?![0-9])/g, '');
    steps.push({
      step: stepNum++,
      expression: current,
      description: 'x + 0 = x',
      rule: 'Additive identity',
    });
  }

  // Apply trigonometric identities
  if (/\\sin\^2\s*\+\s*\\cos\^2/.test(current)) {
    current = current.replace(/\\sin\^2\s*\+\s*\\cos\^2/g, '1');
    steps.push({
      step: stepNum++,
      expression: current,
      description: 'sin²θ + cos²θ = 1',
      rule: 'Pythagorean identity',
    });
  }

  return {
    original: latex,
    simplified: current,
    steps,
  };
}

// ============================================================================
// Export
// ============================================================================

const equationReasonerApi = {
  analyzeEquation,
  verifyEquation,
  expandEquation,
  simplifyEquation,
};

export default equationReasonerApi;
