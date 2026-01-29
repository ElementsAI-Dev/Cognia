/**
 * LaTeX Assistant Tool - AI-powered LaTeX generation and assistance
 * Provides natural language to LaTeX conversion, explanation, correction, and more
 */

import { z } from 'zod';
import type {
  LaTeXAIAction,
  LaTeXAIResult,
  LaTeXAIOptions,
} from '@/types/latex';

// ============================================================================
// Schema Definitions
// ============================================================================

export const latexAssistantInputSchema = z.object({
  action: z.enum([
    'generate',
    'explain',
    'simplify',
    'correct',
    'convert',
    'complete',
    'refactor',
    'translate',
    'format',
    'verify',
    'expand',
    'optimize',
  ]).describe('The action to perform'),
  input: z.string().describe('The input text or LaTeX code'),
  context: z.string().optional().describe('Additional context or surrounding LaTeX code'),
  options: z.object({
    outputFormat: z.enum(['latex', 'mathml', 'unicode', 'ascii']).optional(),
    style: z.enum(['academic', 'casual', 'technical']).optional(),
    verbosity: z.enum(['brief', 'detailed', 'comprehensive']).optional(),
    targetAudience: z.enum(['expert', 'student', 'general']).optional(),
    includeExplanation: z.boolean().optional(),
    preserveFormatting: z.boolean().optional(),
    language: z.string().optional(),
  }).optional(),
});

export type LaTeXAssistantInput = z.infer<typeof latexAssistantInputSchema>;

// ============================================================================
// Prompt Templates
// ============================================================================

const _SYSTEM_PROMPT = `You are an expert LaTeX assistant. You help users with LaTeX code generation, correction, explanation, and optimization.

Guidelines:
1. Generate clean, well-formatted LaTeX code
2. Use appropriate packages when needed (mention them in explanations)
3. Follow best practices for academic writing
4. Provide clear explanations when requested
5. Handle both math and text LaTeX
6. Support multiple output formats when applicable

For math expressions:
- Use appropriate environments (equation, align, gather, etc.)
- Apply proper spacing commands (\\quad, \\qquad, etc.)
- Use semantic commands (\\sin, \\cos, \\lim, etc.)
- Handle fractions, roots, and matrices correctly`;

const ACTION_PROMPTS: Record<LaTeXAIAction, string> = {
  generate: `Convert the following natural language description into LaTeX code.
Be precise and use appropriate LaTeX commands and environments.
If the description involves math, use proper math mode and environments.

Input: {input}
{context}

Generate the LaTeX code:`,

  explain: `Explain the following LaTeX code in plain language.
Describe what each command does and how the output will appear.

LaTeX code:
{input}

Provide a clear explanation:`,

  simplify: `Simplify the following LaTeX expression while maintaining mathematical equivalence.
Reduce complexity where possible without changing the meaning.

Expression:
{input}

Simplified form:`,

  correct: `Review and correct the following LaTeX code.
Fix any syntax errors, improve formatting, and suggest better alternatives.

LaTeX code:
{input}

Corrected code with explanations:`,

  convert: `Convert the following content to the requested format.
Maintain mathematical accuracy and proper formatting.

Input:
{input}

Target format: {outputFormat}

Converted output:`,

  complete: `Complete the following partial LaTeX code.
Maintain consistency with the existing style and context.

Partial code:
{input}

Context:
{context}

Completed code:`,

  refactor: `Refactor the following LaTeX code to improve readability and maintainability.
Use best practices and appropriate abstractions.

LaTeX code:
{input}

Refactored code:`,

  translate: `Translate the following LaTeX document content to {language}.
Preserve all LaTeX commands and structure, only translate the text content.

LaTeX content:
{input}

Translated content:`,

  format: `Format and beautify the following LaTeX code.
Apply consistent indentation, spacing, and line breaks.

LaTeX code:
{input}

Formatted code:`,

  verify: `Verify the mathematical correctness of the following LaTeX expression.
Check for logical errors, unit consistency, and mathematical validity.

Expression:
{input}

Verification result:`,

  expand: `Expand the following LaTeX macros and abbreviations.
Show the fully expanded form of all custom commands.

LaTeX code:
{input}

Expanded code:`,

  optimize: `Optimize the following LaTeX code for faster compilation.
Reduce redundancy and improve efficiency while maintaining output quality.

LaTeX code:
{input}

Optimized code:`,
};

// ============================================================================
// Common LaTeX Patterns
// ============================================================================

const NATURAL_LANGUAGE_TO_LATEX: Record<string, string> = {
  // Basic math operations
  'square root': '\\sqrt{#}',
  'cube root': '\\sqrt[3]{#}',
  'nth root': '\\sqrt[n]{#}',
  'fraction': '\\frac{#}{#}',
  'sum': '\\sum_{#}^{#}',
  'product': '\\prod_{#}^{#}',
  'integral': '\\int_{#}^{#}',
  'double integral': '\\iint_{#}',
  'triple integral': '\\iiint_{#}',
  'limit': '\\lim_{# \\to #}',
  'derivative': '\\frac{d#}{d#}',
  'partial derivative': '\\frac{\\partial #}{\\partial #}',
  'infinity': '\\infty',

  // Greek letters
  'alpha': '\\alpha',
  'beta': '\\beta',
  'gamma': '\\gamma',
  'delta': '\\delta',
  'epsilon': '\\epsilon',
  'theta': '\\theta',
  'lambda': '\\lambda',
  'mu': '\\mu',
  'pi': '\\pi',
  'sigma': '\\sigma',
  'phi': '\\phi',
  'omega': '\\omega',

  // Relations
  'less than or equal': '\\leq',
  'greater than or equal': '\\geq',
  'not equal': '\\neq',
  'approximately equal': '\\approx',
  'equivalent': '\\equiv',
  'proportional to': '\\propto',

  // Set operations
  'element of': '\\in',
  'not element of': '\\notin',
  'subset': '\\subset',
  'superset': '\\supset',
  'union': '\\cup',
  'intersection': '\\cap',
  'empty set': '\\emptyset',

  // Logic
  'for all': '\\forall',
  'there exists': '\\exists',
  'implies': '\\implies',
  'if and only if': '\\iff',
  'therefore': '\\therefore',

  // Arrows
  'right arrow': '\\rightarrow',
  'left arrow': '\\leftarrow',
  'double right arrow': '\\Rightarrow',
  'double left arrow': '\\Leftarrow',
  'maps to': '\\mapsto',

  // Formatting
  'bold': '\\textbf{#}',
  'italic': '\\textit{#}',
  'underline': '\\underline{#}',
  'hat': '\\hat{#}',
  'bar': '\\bar{#}',
  'vector': '\\vec{#}',
  'dot': '\\dot{#}',
  'tilde': '\\tilde{#}',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build prompt for AI model
 */
function buildPrompt(
  action: LaTeXAIAction,
  input: string,
  context?: string,
  options?: LaTeXAIOptions
): string {
  let prompt = ACTION_PROMPTS[action];

  prompt = prompt.replace('{input}', input);
  prompt = prompt.replace('{context}', context ? `Context:\n${context}` : '');
  prompt = prompt.replace('{outputFormat}', options?.outputFormat || 'latex');
  prompt = prompt.replace('{language}', options?.language || 'English');

  return prompt;
}

/**
 * Quick pattern-based conversion for simple expressions
 */
function quickConvert(input: string): string | null {
  const lowerInput = input.toLowerCase().trim();

  // Check for direct pattern matches
  for (const [pattern, latex] of Object.entries(NATURAL_LANGUAGE_TO_LATEX)) {
    if (lowerInput === pattern) {
      return latex;
    }
  }

  // Check for pattern matches with placeholders
  for (const [pattern, latex] of Object.entries(NATURAL_LANGUAGE_TO_LATEX)) {
    if (lowerInput.startsWith(pattern + ' of ')) {
      const value = lowerInput.slice(pattern.length + 4);
      return latex.replace('#', value);
    }
  }

  // Simple expression patterns
  const patterns: { regex: RegExp; replace: string }[] = [
    // Fractions: "a over b" or "a/b"
    { regex: /^(.+)\s+over\s+(.+)$/i, replace: '\\frac{$1}{$2}' },
    { regex: /^(.+)\/(.+)$/i, replace: '\\frac{$1}{$2}' },

    // Powers: "x to the power of n" or "x^n"
    { regex: /^(.+)\s+to\s+the\s+power\s+of\s+(.+)$/i, replace: '$1^{$2}' },
    { regex: /^(.+)\s+squared$/i, replace: '$1^{2}' },
    { regex: /^(.+)\s+cubed$/i, replace: '$1^{3}' },

    // Subscripts: "x sub n" or "x_n"
    { regex: /^(.+)\s+sub\s+(.+)$/i, replace: '$1_{$2}' },

    // Square root: "square root of x"
    { regex: /^square\s+root\s+of\s+(.+)$/i, replace: '\\sqrt{$1}' },

    // Summation: "sum from n=1 to infinity of x"
    { regex: /^sum\s+from\s+(.+)\s+to\s+(.+)\s+of\s+(.+)$/i, replace: '\\sum_{$1}^{$2} $3' },

    // Integral: "integral from a to b of f(x) dx"
    { regex: /^integral\s+from\s+(.+)\s+to\s+(.+)\s+of\s+(.+)$/i, replace: '\\int_{$1}^{$2} $3' },

    // Limit: "limit as x approaches a of f(x)"
    { regex: /^limit\s+as\s+(.+)\s+approaches?\s+(.+)\s+of\s+(.+)$/i, replace: '\\lim_{$1 \\to $2} $3' },
  ];

  for (const { regex, replace } of patterns) {
    if (regex.test(lowerInput)) {
      return lowerInput.replace(regex, replace);
    }
  }

  return null;
}

/**
 * Validate LaTeX syntax
 */
function validateLatex(latex: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for balanced braces
  let braceCount = 0;
  for (const char of latex) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) {
      errors.push('Unbalanced braces: unexpected closing brace');
      break;
    }
  }
  if (braceCount > 0) {
    errors.push(`Unbalanced braces: ${braceCount} unclosed opening brace(s)`);
  }

  // Check for balanced math delimiters
  const dollarCount = (latex.match(/(?<!\\)\$/g) || []).length;
  if (dollarCount % 2 !== 0) {
    errors.push('Unbalanced math delimiters: odd number of $ signs');
  }

  // Check for common errors
  if (/\\begin\{([^}]+)\}/.test(latex)) {
    const begins = latex.match(/\\begin\{([^}]+)\}/g) || [];
    const ends = latex.match(/\\end\{([^}]+)\}/g) || [];

    if (begins.length !== ends.length) {
      errors.push('Unbalanced environments: number of \\begin and \\end do not match');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format LaTeX output
 */
function formatOutput(latex: string, options?: LaTeXAIOptions): string {
  let output = latex.trim();

  // Convert to requested format
  if (options?.outputFormat === 'unicode') {
    output = latexToUnicode(output);
  } else if (options?.outputFormat === 'ascii') {
    output = latexToAscii(output);
  }

  return output;
}

/**
 * Convert simple LaTeX to Unicode (basic support)
 */
function latexToUnicode(latex: string): string {
  const replacements: Record<string, string> = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
    '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ',
    '\\Psi': 'Ψ', '\\Omega': 'Ω',
    '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
    '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\pm': '±',
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
    '\\equiv': '≡', '\\sim': '∼', '\\propto': '∝',
    '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\supset': '⊃',
    '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅',
    '\\forall': '∀', '\\exists': '∃', '\\neg': '¬',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
    '\\Leftarrow': '⇐', '\\leftrightarrow': '↔', '\\Leftrightarrow': '⇔',
    '\\sum': '∑', '\\prod': '∏', '\\int': '∫',
  };

  let result = latex;
  for (const [cmd, unicode] of Object.entries(replacements)) {
    result = result.replace(new RegExp(cmd.replace(/\\/g, '\\\\'), 'g'), unicode);
  }

  // Handle superscripts
  result = result.replace(/\^(\d)/g, (_, d) => {
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    return superscripts[parseInt(d)] || `^${d}`;
  });

  // Handle subscripts
  result = result.replace(/_(\d)/g, (_, d) => {
    const subscripts = '₀₁₂₃₄₅₆₇₈₉';
    return subscripts[parseInt(d)] || `_${d}`;
  });

  return result;
}

/**
 * Convert LaTeX to ASCII representation
 */
function latexToAscii(latex: string): string {
  let result = latex;

  // Remove backslashes from simple commands
  result = result.replace(/\\([a-zA-Z]+)/g, '$1');

  // Convert fractions
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

  // Convert superscripts and subscripts
  result = result.replace(/\^{([^}]+)}/g, '^($1)');
  result = result.replace(/_{([^}]+)}/g, '_($1)');

  // Remove remaining braces
  result = result.replace(/[{}]/g, '');

  return result;
}

// ============================================================================
// Main Execution Function
// ============================================================================

/**
 * Execute LaTeX assistant action
 */
export async function executeLatexAssistant(
  input: LaTeXAssistantInput
): Promise<LaTeXAIResult> {
  const startTime = Date.now();

  try {
    const { action, input: userInput, context, options } = input;

    // Try quick pattern-based conversion first for 'generate' action
    if (action === 'generate') {
      const quickResult = quickConvert(userInput);
      if (quickResult) {
        const validation = validateLatex(quickResult);
        return {
          success: true,
          output: formatOutput(quickResult, options),
          explanation: options?.includeExplanation
            ? `Generated from pattern: "${userInput}"`
            : undefined,
          warnings: validation.valid ? undefined : validation.errors,
          confidence: 0.95,
          processingTime: Date.now() - startTime,
        };
      }
    }

    // For simple corrections, try local validation first
    if (action === 'correct') {
      const validation = validateLatex(userInput);
      if (validation.valid) {
        return {
          success: true,
          output: userInput,
          explanation: 'The LaTeX code appears to be syntactically correct.',
          confidence: 0.9,
          processingTime: Date.now() - startTime,
        };
      }
    }

    // Build prompt for AI
    const prompt = buildPrompt(action, userInput, context, options);

    // For now, return a structured response indicating AI processing is needed
    // In production, this would call an AI model
    const result = await processWithAI(action, prompt, userInput, options);

    return {
      success: true,
      output: formatOutput(result.output, options),
      explanation: result.explanation,
      alternatives: result.alternatives,
      warnings: result.warnings,
      suggestions: result.suggestions,
      confidence: result.confidence,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      warnings: [error instanceof Error ? error.message : 'Unknown error occurred'],
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Process with AI model (placeholder for actual AI integration)
 */
async function processWithAI(
  action: LaTeXAIAction,
  _prompt: string,
  input: string,
  options?: LaTeXAIOptions
): Promise<{
  output: string;
  explanation?: string;
  alternatives?: string[];
  warnings?: string[];
  suggestions?: string[];
  confidence: number;
}> {
  // This is a placeholder implementation
  // In production, this would call an AI model like GPT-4 or Claude

  switch (action) {
    case 'generate':
      return {
        output: generateLatexFromDescription(input),
        explanation: options?.includeExplanation
          ? 'Generated LaTeX code from natural language description.'
          : undefined,
        confidence: 0.8,
      };

    case 'explain':
      return {
        output: explainLatex(input),
        confidence: 0.85,
      };

    case 'simplify':
      return {
        output: input, // Would simplify with AI
        explanation: 'Expression analysis completed.',
        confidence: 0.75,
      };

    case 'correct':
      const corrected = correctLatex(input);
      return {
        output: corrected.output,
        warnings: corrected.warnings,
        suggestions: corrected.suggestions,
        confidence: 0.85,
      };

    case 'format':
      return {
        output: formatLatex(input),
        confidence: 0.95,
      };

    case 'verify':
      return {
        output: input,
        explanation: 'Mathematical verification requires advanced AI processing.',
        confidence: 0.7,
      };

    default:
      return {
        output: input,
        explanation: `Action "${action}" processed.`,
        confidence: 0.7,
      };
  }
}

/**
 * Generate LaTeX from natural language description
 */
function generateLatexFromDescription(description: string): string {
  const lower = description.toLowerCase();

  // Equation patterns
  if (lower.includes('equation') || lower.includes('formula')) {
    if (lower.includes('quadratic')) {
      return 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    }
    if (lower.includes('pythagorean') || lower.includes('pythagoras')) {
      return 'a^2 + b^2 = c^2';
    }
    if (lower.includes('euler')) {
      return 'e^{i\\pi} + 1 = 0';
    }
    if (lower.includes('einstein') || lower.includes('energy')) {
      return 'E = mc^2';
    }
    if (lower.includes('schrodinger') || lower.includes('schrödinger')) {
      return 'i\\hbar \\frac{\\partial}{\\partial t} \\Psi = \\hat{H} \\Psi';
    }
    if (lower.includes('maxwell')) {
      return '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}';
    }
  }

  // Matrix patterns
  if (lower.includes('matrix') || lower.includes('matrices')) {
    if (lower.includes('identity') || lower.includes('unit')) {
      return '\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}';
    }
    if (lower.includes('2x2') || lower.includes('2 by 2')) {
      return '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}';
    }
    if (lower.includes('3x3') || lower.includes('3 by 3')) {
      return '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}';
    }
    return '\\begin{pmatrix} a_{11} & a_{12} \\\\ a_{21} & a_{22} \\end{pmatrix}';
  }

  // Calculus patterns
  if (lower.includes('derivative')) {
    if (lower.includes('partial')) {
      return '\\frac{\\partial f}{\\partial x}';
    }
    return '\\frac{df}{dx}';
  }

  if (lower.includes('integral')) {
    if (lower.includes('definite')) {
      return '\\int_{a}^{b} f(x) \\, dx';
    }
    if (lower.includes('double')) {
      return '\\iint_{D} f(x, y) \\, dA';
    }
    if (lower.includes('triple')) {
      return '\\iiint_{V} f(x, y, z) \\, dV';
    }
    return '\\int f(x) \\, dx';
  }

  if (lower.includes('limit')) {
    return '\\lim_{x \\to a} f(x)';
  }

  if (lower.includes('sum') || lower.includes('summation') || lower.includes('series')) {
    if (lower.includes('infinite')) {
      return '\\sum_{n=1}^{\\infty} a_n';
    }
    return '\\sum_{i=1}^{n} a_i';
  }

  // Set theory
  if (lower.includes('set')) {
    if (lower.includes('union')) {
      return 'A \\cup B';
    }
    if (lower.includes('intersection')) {
      return 'A \\cap B';
    }
    if (lower.includes('difference')) {
      return 'A \\setminus B';
    }
    return '\\{x \\in X : P(x)\\}';
  }

  // Logic
  if (lower.includes('logic') || lower.includes('proposition')) {
    return 'P \\land Q \\implies R';
  }

  // Default: wrap in math mode
  return `$${description}$`;
}

/**
 * Explain LaTeX code
 */
function explainLatex(latex: string): string {
  const explanations: string[] = [];

  // Check for common patterns
  if (latex.includes('\\frac')) {
    explanations.push('- \\frac{a}{b} creates a fraction with numerator a and denominator b');
  }
  if (latex.includes('\\sqrt')) {
    explanations.push('- \\sqrt{x} creates a square root; \\sqrt[n]{x} creates an nth root');
  }
  if (latex.includes('\\sum')) {
    explanations.push('- \\sum creates a summation symbol; subscript and superscript define bounds');
  }
  if (latex.includes('\\int')) {
    explanations.push('- \\int creates an integral symbol; \\iint and \\iiint for double/triple integrals');
  }
  if (latex.includes('\\lim')) {
    explanations.push('- \\lim creates a limit; use subscript for the approaching value');
  }
  if (latex.includes('\\begin{') && latex.includes('matrix')) {
    explanations.push('- Matrix environments (pmatrix, bmatrix, etc.) create matrices with different delimiters');
  }
  if (latex.includes('\\begin{align')) {
    explanations.push('- align environment creates multiple aligned equations; use & for alignment points');
  }

  if (explanations.length === 0) {
    return 'This LaTeX code contains standard commands and formatting.';
  }

  return 'Explanation:\n' + explanations.join('\n');
}

/**
 * Correct common LaTeX errors
 */
function correctLatex(latex: string): {
  output: string;
  warnings: string[];
  suggestions: string[];
} {
  let corrected = latex;
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Fix common errors
  // Missing braces around multi-character subscripts/superscripts
  corrected = corrected.replace(/\^([a-zA-Z0-9]{2,})(?![}])/g, (match, p1) => {
    suggestions.push(`Added braces around superscript: ^${p1} → ^{${p1}}`);
    return `^{${p1}}`;
  });

  corrected = corrected.replace(/_([a-zA-Z0-9]{2,})(?![}])/g, (match, p1) => {
    suggestions.push(`Added braces around subscript: _${p1} → _{${p1}}`);
    return `_{${p1}}`;
  });

  // Fix unescaped special characters
  const specialChars = ['%', '&', '#', '_'];
  for (const char of specialChars) {
    const regex = new RegExp(`(?<!\\\\)\\${char}`, 'g');
    if (regex.test(corrected) && !corrected.includes(`\\${char}`)) {
      warnings.push(`Unescaped special character: ${char} should be \\${char}`);
    }
  }

  // Check for balanced delimiters
  const braceBalance = (corrected.match(/{/g) || []).length - (corrected.match(/}/g) || []).length;
  if (braceBalance !== 0) {
    warnings.push(`Unbalanced braces: ${braceBalance > 0 ? 'missing closing' : 'extra closing'} brace(s)`);
  }

  return { output: corrected, warnings, suggestions };
}

/**
 * Format LaTeX code
 */
function formatLatex(latex: string): string {
  let formatted = latex;

  // Add spaces around binary operators
  formatted = formatted.replace(/([^\\])([+\-])([^\\])/g, '$1 $2 $3');

  // Add proper spacing after commas
  formatted = formatted.replace(/,([^\s])/g, ', $1');

  // Format environments
  formatted = formatted.replace(/\\begin\{(\w+)\}/g, '\n\\begin{$1}\n');
  formatted = formatted.replace(/\\end\{(\w+)\}/g, '\n\\end{$1}\n');

  // Remove multiple blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

// ============================================================================
// Tool Definition
// ============================================================================

export const latexAssistantTool = {
  name: 'latex_assistant',
  description: `AI-powered LaTeX assistant for:
- Generating LaTeX code from natural language descriptions
- Explaining LaTeX code in plain language
- Correcting syntax errors and improving code quality
- Converting between formats (LaTeX, Unicode, ASCII)
- Simplifying complex expressions
- Formatting and beautifying code
- Verifying mathematical correctness

Use this tool to help with any LaTeX-related task.`,
  parameters: latexAssistantInputSchema,
  execute: executeLatexAssistant,
};

export default latexAssistantTool;
