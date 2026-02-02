/**
 * Math Vocabulary - Unified mathematical vocabulary for LaTeX conversion
 * Used by voice-to-latex, latex-assistant-tool, and other modules
 */

// ============================================================================
// Greek Letters
// ============================================================================

export const GREEK_LETTERS: Record<string, string> = {
  // Lowercase
  'alpha': '\\alpha',
  'beta': '\\beta',
  'gamma': '\\gamma',
  'delta': '\\delta',
  'epsilon': '\\epsilon',
  'zeta': '\\zeta',
  'eta': '\\eta',
  'theta': '\\theta',
  'iota': '\\iota',
  'kappa': '\\kappa',
  'lambda': '\\lambda',
  'mu': '\\mu',
  'nu': '\\nu',
  'xi': '\\xi',
  'pi': '\\pi',
  'rho': '\\rho',
  'sigma': '\\sigma',
  'tau': '\\tau',
  'upsilon': '\\upsilon',
  'phi': '\\phi',
  'chi': '\\chi',
  'psi': '\\psi',
  'omega': '\\omega',
  // Uppercase
  'capital gamma': '\\Gamma',
  'capital delta': '\\Delta',
  'capital theta': '\\Theta',
  'capital lambda': '\\Lambda',
  'capital xi': '\\Xi',
  'capital pi': '\\Pi',
  'capital sigma': '\\Sigma',
  'capital phi': '\\Phi',
  'capital psi': '\\Psi',
  'capital omega': '\\Omega',
};

// ============================================================================
// Numbers
// ============================================================================

export const NUMBERS: Record<string, string> = {
  'zero': '0',
  'one': '1',
  'two': '2',
  'three': '3',
  'four': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'nine': '9',
  'ten': '10',
  'hundred': '100',
  'thousand': '1000',
};

// ============================================================================
// Operators
// ============================================================================

export const OPERATORS: Record<string, string> = {
  'plus': '+',
  'minus': '-',
  'times': '\\times',
  'multiply': '\\times',
  'cross': '\\times',
  'divided by': '\\div',
  'over': '/',
  'equals': '=',
  'not equal': '\\neq',
  'not equals': '\\neq',
  'less than': '<',
  'greater than': '>',
  'less than or equal': '\\leq',
  'greater than or equal': '\\geq',
  'approximately': '\\approx',
  'approximately equal': '\\approx',
  'equivalent': '\\equiv',
  'proportional': '\\propto',
  'proportional to': '\\propto',
};

// ============================================================================
// Functions
// ============================================================================

export const FUNCTIONS: Record<string, string> = {
  'sine': '\\sin',
  'cosine': '\\cos',
  'tangent': '\\tan',
  'cotangent': '\\cot',
  'secant': '\\sec',
  'cosecant': '\\csc',
  'arc sine': '\\arcsin',
  'arc cosine': '\\arccos',
  'arc tangent': '\\arctan',
  'hyperbolic sine': '\\sinh',
  'hyperbolic cosine': '\\cosh',
  'hyperbolic tangent': '\\tanh',
  'log': '\\log',
  'natural log': '\\ln',
  'logarithm': '\\log',
  'exponential': '\\exp',
};

// ============================================================================
// Calculus
// ============================================================================

export const CALCULUS: Record<string, string> = {
  'derivative': '\\frac{d}{dx}',
  'partial derivative': '\\frac{\\partial}{\\partial x}',
  'integral': '\\int',
  'double integral': '\\iint',
  'triple integral': '\\iiint',
  'contour integral': '\\oint',
  'limit': '\\lim',
  'sum': '\\sum',
  'summation': '\\sum',
  'product': '\\prod',
  'infinity': '\\infty',
};

// ============================================================================
// Set Theory
// ============================================================================

export const SET_THEORY: Record<string, string> = {
  'element of': '\\in',
  'not element of': '\\notin',
  'subset': '\\subset',
  'superset': '\\supset',
  'proper subset': '\\subsetneq',
  'union': '\\cup',
  'intersection': '\\cap',
  'empty set': '\\emptyset',
  'set difference': '\\setminus',
};

// ============================================================================
// Logic
// ============================================================================

export const LOGIC: Record<string, string> = {
  'and': '\\land',
  'or': '\\lor',
  'not': '\\neg',
  'for all': '\\forall',
  'there exists': '\\exists',
  'implies': '\\implies',
  'if and only if': '\\iff',
  'therefore': '\\therefore',
  'because': '\\because',
};

// ============================================================================
// Arrows
// ============================================================================

export const ARROWS: Record<string, string> = {
  'right arrow': '\\rightarrow',
  'left arrow': '\\leftarrow',
  'double right arrow': '\\Rightarrow',
  'double left arrow': '\\Leftarrow',
  'maps to': '\\mapsto',
  'up arrow': '\\uparrow',
  'down arrow': '\\downarrow',
  'left right arrow': '\\leftrightarrow',
};

// ============================================================================
// Formatting
// ============================================================================

export const FORMATTING: Record<string, string> = {
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
// Natural Language to LaTeX Templates
// ============================================================================

export const NATURAL_LANGUAGE_TO_LATEX: Record<string, string> = {
  'square root': '\\sqrt{#}',
  'cube root': '\\sqrt[3]{#}',
  'nth root': '\\sqrt[n]{#}',
  'fraction': '\\frac{#}{#}',
  'sum from to': '\\sum_{#}^{#}',
  'product from to': '\\prod_{#}^{#}',
  'integral from to': '\\int_{#}^{#}',
  'limit as approaches': '\\lim_{# \\to #}',
  'derivative of': '\\frac{d#}{d#}',
  'partial derivative of': '\\frac{\\partial #}{\\partial #}',
};

// ============================================================================
// Chinese Math Vocabulary
// ============================================================================

export const CHINESE_MATH_VOCABULARY: Record<string, string> = {
  // Numbers
  '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
  '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
  '十': '10', '百': '100', '千': '1000',

  // Operations
  '加': '+', '减': '-', '乘': '\\times', '除': '\\div',
  '等于': '=', '不等于': '\\neq',
  '小于': '<', '大于': '>',
  '小于等于': '\\leq', '大于等于': '\\geq',
  '约等于': '\\approx',

  // Greek letters
  '阿尔法': '\\alpha', '贝塔': '\\beta', '伽马': '\\gamma',
  '德尔塔': '\\delta', '西塔': '\\theta', '派': '\\pi',
  '西格玛': '\\sigma', '欧米伽': '\\omega',

  // Functions
  '正弦': '\\sin', '余弦': '\\cos', '正切': '\\tan',
  '对数': '\\log', '自然对数': '\\ln', '指数': '\\exp',

  // Calculus
  '积分': '\\int', '二重积分': '\\iint', '三重积分': '\\iiint',
  '求和': '\\sum', '极限': '\\lim', '无穷': '\\infty',
  '导数': '\\frac{d}{dx}', '偏导数': '\\frac{\\partial}{\\partial x}',

  // Misc
  '根号': '\\sqrt{#}', '分数': '\\frac{#}{#}',
  '属于': '\\in', '子集': '\\subset', '并集': '\\cup', '交集': '\\cap',
};

// ============================================================================
// Combined Vocabulary
// ============================================================================

/**
 * Get combined English math vocabulary
 */
export function getEnglishMathVocabulary(): Record<string, string> {
  return {
    ...NUMBERS,
    ...GREEK_LETTERS,
    ...OPERATORS,
    ...FUNCTIONS,
    ...CALCULUS,
    ...SET_THEORY,
    ...LOGIC,
    ...ARROWS,
  };
}

/**
 * Get math vocabulary by language
 */
export function getMathVocabularyByLanguage(language: string): Record<string, string> {
  const english = getEnglishMathVocabulary();
  
  if (language.startsWith('zh')) {
    return { ...english, ...CHINESE_MATH_VOCABULARY };
  }
  
  return english;
}

/**
 * Get all natural language to LaTeX mappings
 */
export function getNaturalLanguageToLatex(): Record<string, string> {
  return {
    ...NATURAL_LANGUAGE_TO_LATEX,
    ...GREEK_LETTERS,
    ...OPERATORS,
    ...FUNCTIONS,
    ...CALCULUS,
    ...SET_THEORY,
    ...LOGIC,
    ...ARROWS,
    ...FORMATTING,
  };
}

const mathVocabulary = {
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
};

export default mathVocabulary;
