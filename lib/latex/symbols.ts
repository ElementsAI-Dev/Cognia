/**
 * LaTeX Symbols Library
 * Comprehensive collection of LaTeX symbols, commands, and environments
 * for autocomplete and reference
 */

import type {
  LaTeXSymbol,
  LaTeXCommand,
  LaTeXEnvironment,
  LaTeXSymbolCategory,
  LaTeXCommandCategory,
} from '@/types/latex';

// ============================================================================
// Greek Letters
// ============================================================================

export const GREEK_LETTERS: LaTeXSymbol[] = [
  // Lowercase
  { name: 'alpha', command: '\\alpha', unicode: 'α', category: 'greek', mathMode: true },
  { name: 'beta', command: '\\beta', unicode: 'β', category: 'greek', mathMode: true },
  { name: 'gamma', command: '\\gamma', unicode: 'γ', category: 'greek', mathMode: true },
  { name: 'delta', command: '\\delta', unicode: 'δ', category: 'greek', mathMode: true },
  { name: 'epsilon', command: '\\epsilon', unicode: 'ε', category: 'greek', mathMode: true },
  { name: 'varepsilon', command: '\\varepsilon', unicode: 'ε', category: 'greek', mathMode: true },
  { name: 'zeta', command: '\\zeta', unicode: 'ζ', category: 'greek', mathMode: true },
  { name: 'eta', command: '\\eta', unicode: 'η', category: 'greek', mathMode: true },
  { name: 'theta', command: '\\theta', unicode: 'θ', category: 'greek', mathMode: true },
  { name: 'vartheta', command: '\\vartheta', unicode: 'ϑ', category: 'greek', mathMode: true },
  { name: 'iota', command: '\\iota', unicode: 'ι', category: 'greek', mathMode: true },
  { name: 'kappa', command: '\\kappa', unicode: 'κ', category: 'greek', mathMode: true },
  { name: 'lambda', command: '\\lambda', unicode: 'λ', category: 'greek', mathMode: true },
  { name: 'mu', command: '\\mu', unicode: 'μ', category: 'greek', mathMode: true },
  { name: 'nu', command: '\\nu', unicode: 'ν', category: 'greek', mathMode: true },
  { name: 'xi', command: '\\xi', unicode: 'ξ', category: 'greek', mathMode: true },
  { name: 'pi', command: '\\pi', unicode: 'π', category: 'greek', mathMode: true },
  { name: 'varpi', command: '\\varpi', unicode: 'ϖ', category: 'greek', mathMode: true },
  { name: 'rho', command: '\\rho', unicode: 'ρ', category: 'greek', mathMode: true },
  { name: 'varrho', command: '\\varrho', unicode: 'ϱ', category: 'greek', mathMode: true },
  { name: 'sigma', command: '\\sigma', unicode: 'σ', category: 'greek', mathMode: true },
  { name: 'varsigma', command: '\\varsigma', unicode: 'ς', category: 'greek', mathMode: true },
  { name: 'tau', command: '\\tau', unicode: 'τ', category: 'greek', mathMode: true },
  { name: 'upsilon', command: '\\upsilon', unicode: 'υ', category: 'greek', mathMode: true },
  { name: 'phi', command: '\\phi', unicode: 'φ', category: 'greek', mathMode: true },
  { name: 'varphi', command: '\\varphi', unicode: 'ϕ', category: 'greek', mathMode: true },
  { name: 'chi', command: '\\chi', unicode: 'χ', category: 'greek', mathMode: true },
  { name: 'psi', command: '\\psi', unicode: 'ψ', category: 'greek', mathMode: true },
  { name: 'omega', command: '\\omega', unicode: 'ω', category: 'greek', mathMode: true },
  // Uppercase
  { name: 'Gamma', command: '\\Gamma', unicode: 'Γ', category: 'greek', mathMode: true },
  { name: 'Delta', command: '\\Delta', unicode: 'Δ', category: 'greek', mathMode: true },
  { name: 'Theta', command: '\\Theta', unicode: 'Θ', category: 'greek', mathMode: true },
  { name: 'Lambda', command: '\\Lambda', unicode: 'Λ', category: 'greek', mathMode: true },
  { name: 'Xi', command: '\\Xi', unicode: 'Ξ', category: 'greek', mathMode: true },
  { name: 'Pi', command: '\\Pi', unicode: 'Π', category: 'greek', mathMode: true },
  { name: 'Sigma', command: '\\Sigma', unicode: 'Σ', category: 'greek', mathMode: true },
  { name: 'Upsilon', command: '\\Upsilon', unicode: 'Υ', category: 'greek', mathMode: true },
  { name: 'Phi', command: '\\Phi', unicode: 'Φ', category: 'greek', mathMode: true },
  { name: 'Psi', command: '\\Psi', unicode: 'Ψ', category: 'greek', mathMode: true },
  { name: 'Omega', command: '\\Omega', unicode: 'Ω', category: 'greek', mathMode: true },
];

// ============================================================================
// Mathematical Operators
// ============================================================================

export const MATH_OPERATORS: LaTeXSymbol[] = [
  // Basic operators
  { name: 'plus', command: '+', unicode: '+', category: 'operators', mathMode: true },
  { name: 'minus', command: '-', unicode: '−', category: 'operators', mathMode: true },
  { name: 'times', command: '\\times', unicode: '×', category: 'operators', mathMode: true },
  { name: 'div', command: '\\div', unicode: '÷', category: 'operators', mathMode: true },
  { name: 'cdot', command: '\\cdot', unicode: '·', category: 'operators', mathMode: true },
  { name: 'ast', command: '\\ast', unicode: '∗', category: 'operators', mathMode: true },
  { name: 'star', command: '\\star', unicode: '⋆', category: 'operators', mathMode: true },
  { name: 'circ', command: '\\circ', unicode: '∘', category: 'operators', mathMode: true },
  { name: 'bullet', command: '\\bullet', unicode: '•', category: 'operators', mathMode: true },
  // Set operators
  { name: 'cup', command: '\\cup', unicode: '∪', category: 'operators', mathMode: true },
  { name: 'cap', command: '\\cap', unicode: '∩', category: 'operators', mathMode: true },
  { name: 'setminus', command: '\\setminus', unicode: '∖', category: 'operators', mathMode: true },
  { name: 'bigcup', command: '\\bigcup', unicode: '⋃', category: 'operators', mathMode: true },
  { name: 'bigcap', command: '\\bigcap', unicode: '⋂', category: 'operators', mathMode: true },
  // Logic operators
  { name: 'land', command: '\\land', unicode: '∧', category: 'operators', mathMode: true },
  { name: 'lor', command: '\\lor', unicode: '∨', category: 'operators', mathMode: true },
  { name: 'lnot', command: '\\lnot', unicode: '¬', category: 'operators', mathMode: true },
  { name: 'wedge', command: '\\wedge', unicode: '∧', category: 'operators', mathMode: true },
  { name: 'vee', command: '\\vee', unicode: '∨', category: 'operators', mathMode: true },
  // Big operators
  { name: 'sum', command: '\\sum', unicode: '∑', category: 'operators', mathMode: true, description: 'Summation' },
  { name: 'prod', command: '\\prod', unicode: '∏', category: 'operators', mathMode: true, description: 'Product' },
  { name: 'coprod', command: '\\coprod', unicode: '∐', category: 'operators', mathMode: true },
  { name: 'int', command: '\\int', unicode: '∫', category: 'operators', mathMode: true, description: 'Integral' },
  { name: 'oint', command: '\\oint', unicode: '∮', category: 'operators', mathMode: true, description: 'Contour integral' },
  { name: 'iint', command: '\\iint', unicode: '∬', category: 'operators', mathMode: true, description: 'Double integral', package: 'amsmath' },
  { name: 'iiint', command: '\\iiint', unicode: '∭', category: 'operators', mathMode: true, description: 'Triple integral', package: 'amsmath' },
  // Misc operators
  { name: 'pm', command: '\\pm', unicode: '±', category: 'operators', mathMode: true },
  { name: 'mp', command: '\\mp', unicode: '∓', category: 'operators', mathMode: true },
  { name: 'oplus', command: '\\oplus', unicode: '⊕', category: 'operators', mathMode: true },
  { name: 'ominus', command: '\\ominus', unicode: '⊖', category: 'operators', mathMode: true },
  { name: 'otimes', command: '\\otimes', unicode: '⊗', category: 'operators', mathMode: true },
  { name: 'oslash', command: '\\oslash', unicode: '⊘', category: 'operators', mathMode: true },
  { name: 'odot', command: '\\odot', unicode: '⊙', category: 'operators', mathMode: true },
];

// ============================================================================
// Relations
// ============================================================================

export const RELATIONS: LaTeXSymbol[] = [
  { name: 'eq', command: '=', unicode: '=', category: 'relations', mathMode: true },
  { name: 'neq', command: '\\neq', unicode: '≠', category: 'relations', mathMode: true },
  { name: 'lt', command: '<', unicode: '<', category: 'relations', mathMode: true },
  { name: 'gt', command: '>', unicode: '>', category: 'relations', mathMode: true },
  { name: 'le', command: '\\le', unicode: '≤', category: 'relations', mathMode: true },
  { name: 'leq', command: '\\leq', unicode: '≤', category: 'relations', mathMode: true },
  { name: 'ge', command: '\\ge', unicode: '≥', category: 'relations', mathMode: true },
  { name: 'geq', command: '\\geq', unicode: '≥', category: 'relations', mathMode: true },
  { name: 'll', command: '\\ll', unicode: '≪', category: 'relations', mathMode: true },
  { name: 'gg', command: '\\gg', unicode: '≫', category: 'relations', mathMode: true },
  { name: 'equiv', command: '\\equiv', unicode: '≡', category: 'relations', mathMode: true },
  { name: 'approx', command: '\\approx', unicode: '≈', category: 'relations', mathMode: true },
  { name: 'cong', command: '\\cong', unicode: '≅', category: 'relations', mathMode: true },
  { name: 'sim', command: '\\sim', unicode: '∼', category: 'relations', mathMode: true },
  { name: 'simeq', command: '\\simeq', unicode: '≃', category: 'relations', mathMode: true },
  { name: 'propto', command: '\\propto', unicode: '∝', category: 'relations', mathMode: true },
  { name: 'subset', command: '\\subset', unicode: '⊂', category: 'relations', mathMode: true },
  { name: 'supset', command: '\\supset', unicode: '⊃', category: 'relations', mathMode: true },
  { name: 'subseteq', command: '\\subseteq', unicode: '⊆', category: 'relations', mathMode: true },
  { name: 'supseteq', command: '\\supseteq', unicode: '⊇', category: 'relations', mathMode: true },
  { name: 'in', command: '\\in', unicode: '∈', category: 'relations', mathMode: true },
  { name: 'notin', command: '\\notin', unicode: '∉', category: 'relations', mathMode: true },
  { name: 'ni', command: '\\ni', unicode: '∋', category: 'relations', mathMode: true },
  { name: 'parallel', command: '\\parallel', unicode: '∥', category: 'relations', mathMode: true },
  { name: 'perp', command: '\\perp', unicode: '⊥', category: 'relations', mathMode: true },
  { name: 'mid', command: '\\mid', unicode: '∣', category: 'relations', mathMode: true },
  { name: 'nmid', command: '\\nmid', unicode: '∤', category: 'relations', mathMode: true, package: 'amssymb' },
];

// ============================================================================
// Arrows
// ============================================================================

export const ARROWS: LaTeXSymbol[] = [
  { name: 'rightarrow', command: '\\rightarrow', unicode: '→', category: 'arrows', mathMode: true },
  { name: 'to', command: '\\to', unicode: '→', category: 'arrows', mathMode: true },
  { name: 'leftarrow', command: '\\leftarrow', unicode: '←', category: 'arrows', mathMode: true },
  { name: 'gets', command: '\\gets', unicode: '←', category: 'arrows', mathMode: true },
  { name: 'leftrightarrow', command: '\\leftrightarrow', unicode: '↔', category: 'arrows', mathMode: true },
  { name: 'Rightarrow', command: '\\Rightarrow', unicode: '⇒', category: 'arrows', mathMode: true },
  { name: 'Leftarrow', command: '\\Leftarrow', unicode: '⇐', category: 'arrows', mathMode: true },
  { name: 'Leftrightarrow', command: '\\Leftrightarrow', unicode: '⇔', category: 'arrows', mathMode: true },
  { name: 'implies', command: '\\implies', unicode: '⟹', category: 'arrows', mathMode: true, package: 'amsmath' },
  { name: 'iff', command: '\\iff', unicode: '⟺', category: 'arrows', mathMode: true, package: 'amsmath' },
  { name: 'uparrow', command: '\\uparrow', unicode: '↑', category: 'arrows', mathMode: true },
  { name: 'downarrow', command: '\\downarrow', unicode: '↓', category: 'arrows', mathMode: true },
  { name: 'updownarrow', command: '\\updownarrow', unicode: '↕', category: 'arrows', mathMode: true },
  { name: 'Uparrow', command: '\\Uparrow', unicode: '⇑', category: 'arrows', mathMode: true },
  { name: 'Downarrow', command: '\\Downarrow', unicode: '⇓', category: 'arrows', mathMode: true },
  { name: 'Updownarrow', command: '\\Updownarrow', unicode: '⇕', category: 'arrows', mathMode: true },
  { name: 'mapsto', command: '\\mapsto', unicode: '↦', category: 'arrows', mathMode: true },
  { name: 'longmapsto', command: '\\longmapsto', unicode: '⟼', category: 'arrows', mathMode: true },
  { name: 'longrightarrow', command: '\\longrightarrow', unicode: '⟶', category: 'arrows', mathMode: true },
  { name: 'longleftarrow', command: '\\longleftarrow', unicode: '⟵', category: 'arrows', mathMode: true },
  { name: 'longleftrightarrow', command: '\\longleftrightarrow', unicode: '⟷', category: 'arrows', mathMode: true },
  { name: 'hookrightarrow', command: '\\hookrightarrow', unicode: '↪', category: 'arrows', mathMode: true },
  { name: 'hookleftarrow', command: '\\hookleftarrow', unicode: '↩', category: 'arrows', mathMode: true },
  { name: 'nearrow', command: '\\nearrow', unicode: '↗', category: 'arrows', mathMode: true },
  { name: 'searrow', command: '\\searrow', unicode: '↘', category: 'arrows', mathMode: true },
  { name: 'swarrow', command: '\\swarrow', unicode: '↙', category: 'arrows', mathMode: true },
  { name: 'nwarrow', command: '\\nwarrow', unicode: '↖', category: 'arrows', mathMode: true },
];

// ============================================================================
// Delimiters
// ============================================================================

export const DELIMITERS: LaTeXSymbol[] = [
  { name: 'lparen', command: '(', unicode: '(', category: 'delimiters', mathMode: true },
  { name: 'rparen', command: ')', unicode: ')', category: 'delimiters', mathMode: true },
  { name: 'lbrack', command: '[', unicode: '[', category: 'delimiters', mathMode: true },
  { name: 'rbrack', command: ']', unicode: ']', category: 'delimiters', mathMode: true },
  { name: 'lbrace', command: '\\{', unicode: '{', category: 'delimiters', mathMode: true },
  { name: 'rbrace', command: '\\}', unicode: '}', category: 'delimiters', mathMode: true },
  { name: 'langle', command: '\\langle', unicode: '⟨', category: 'delimiters', mathMode: true },
  { name: 'rangle', command: '\\rangle', unicode: '⟩', category: 'delimiters', mathMode: true },
  { name: 'lfloor', command: '\\lfloor', unicode: '⌊', category: 'delimiters', mathMode: true },
  { name: 'rfloor', command: '\\rfloor', unicode: '⌋', category: 'delimiters', mathMode: true },
  { name: 'lceil', command: '\\lceil', unicode: '⌈', category: 'delimiters', mathMode: true },
  { name: 'rceil', command: '\\rceil', unicode: '⌉', category: 'delimiters', mathMode: true },
  { name: 'vert', command: '|', unicode: '|', category: 'delimiters', mathMode: true },
  { name: 'Vert', command: '\\|', unicode: '‖', category: 'delimiters', mathMode: true },
  { name: 'backslash', command: '\\backslash', unicode: '\\', category: 'delimiters', mathMode: true },
];

// ============================================================================
// Accents
// ============================================================================

export const ACCENTS: LaTeXSymbol[] = [
  { name: 'hat', command: '\\hat{x}', unicode: 'x̂', category: 'accents', mathMode: true, description: 'Hat accent' },
  { name: 'check', command: '\\check{x}', unicode: 'x̌', category: 'accents', mathMode: true, description: 'Check accent' },
  { name: 'breve', command: '\\breve{x}', unicode: 'x̆', category: 'accents', mathMode: true, description: 'Breve accent' },
  { name: 'acute', command: '\\acute{x}', unicode: 'x́', category: 'accents', mathMode: true, description: 'Acute accent' },
  { name: 'grave', command: '\\grave{x}', unicode: 'x̀', category: 'accents', mathMode: true, description: 'Grave accent' },
  { name: 'tilde', command: '\\tilde{x}', unicode: 'x̃', category: 'accents', mathMode: true, description: 'Tilde accent' },
  { name: 'bar', command: '\\bar{x}', unicode: 'x̄', category: 'accents', mathMode: true, description: 'Bar accent' },
  { name: 'vec', command: '\\vec{x}', unicode: 'x⃗', category: 'accents', mathMode: true, description: 'Vector accent' },
  { name: 'dot', command: '\\dot{x}', unicode: 'ẋ', category: 'accents', mathMode: true, description: 'Dot accent' },
  { name: 'ddot', command: '\\ddot{x}', unicode: 'ẍ', category: 'accents', mathMode: true, description: 'Double dot accent' },
  { name: 'dddot', command: '\\dddot{x}', category: 'accents', mathMode: true, description: 'Triple dot accent', package: 'amsmath' },
  { name: 'mathring', command: '\\mathring{x}', unicode: 'x̊', category: 'accents', mathMode: true, description: 'Ring accent' },
  { name: 'widehat', command: '\\widehat{xy}', category: 'accents', mathMode: true, description: 'Wide hat' },
  { name: 'widetilde', command: '\\widetilde{xy}', category: 'accents', mathMode: true, description: 'Wide tilde' },
  { name: 'overline', command: '\\overline{xy}', category: 'accents', mathMode: true, description: 'Overline' },
  { name: 'underline', command: '\\underline{xy}', category: 'accents', mathMode: true, description: 'Underline' },
  { name: 'overbrace', command: '\\overbrace{xy}', category: 'accents', mathMode: true, description: 'Overbrace' },
  { name: 'underbrace', command: '\\underbrace{xy}', category: 'accents', mathMode: true, description: 'Underbrace' },
];

// ============================================================================
// Functions
// ============================================================================

export const FUNCTIONS: LaTeXSymbol[] = [
  { name: 'sin', command: '\\sin', category: 'functions', mathMode: true, description: 'Sine function' },
  { name: 'cos', command: '\\cos', category: 'functions', mathMode: true, description: 'Cosine function' },
  { name: 'tan', command: '\\tan', category: 'functions', mathMode: true, description: 'Tangent function' },
  { name: 'cot', command: '\\cot', category: 'functions', mathMode: true, description: 'Cotangent function' },
  { name: 'sec', command: '\\sec', category: 'functions', mathMode: true, description: 'Secant function' },
  { name: 'csc', command: '\\csc', category: 'functions', mathMode: true, description: 'Cosecant function' },
  { name: 'arcsin', command: '\\arcsin', category: 'functions', mathMode: true, description: 'Arcsine function' },
  { name: 'arccos', command: '\\arccos', category: 'functions', mathMode: true, description: 'Arccosine function' },
  { name: 'arctan', command: '\\arctan', category: 'functions', mathMode: true, description: 'Arctangent function' },
  { name: 'sinh', command: '\\sinh', category: 'functions', mathMode: true, description: 'Hyperbolic sine' },
  { name: 'cosh', command: '\\cosh', category: 'functions', mathMode: true, description: 'Hyperbolic cosine' },
  { name: 'tanh', command: '\\tanh', category: 'functions', mathMode: true, description: 'Hyperbolic tangent' },
  { name: 'log', command: '\\log', category: 'functions', mathMode: true, description: 'Logarithm' },
  { name: 'ln', command: '\\ln', category: 'functions', mathMode: true, description: 'Natural logarithm' },
  { name: 'lg', command: '\\lg', category: 'functions', mathMode: true, description: 'Base-10 logarithm' },
  { name: 'exp', command: '\\exp', category: 'functions', mathMode: true, description: 'Exponential function' },
  { name: 'lim', command: '\\lim', category: 'functions', mathMode: true, description: 'Limit' },
  { name: 'limsup', command: '\\limsup', category: 'functions', mathMode: true, description: 'Limit supremum' },
  { name: 'liminf', command: '\\liminf', category: 'functions', mathMode: true, description: 'Limit infimum' },
  { name: 'sup', command: '\\sup', category: 'functions', mathMode: true, description: 'Supremum' },
  { name: 'inf', command: '\\inf', category: 'functions', mathMode: true, description: 'Infimum' },
  { name: 'max', command: '\\max', category: 'functions', mathMode: true, description: 'Maximum' },
  { name: 'min', command: '\\min', category: 'functions', mathMode: true, description: 'Minimum' },
  { name: 'arg', command: '\\arg', category: 'functions', mathMode: true, description: 'Argument' },
  { name: 'det', command: '\\det', category: 'functions', mathMode: true, description: 'Determinant' },
  { name: 'dim', command: '\\dim', category: 'functions', mathMode: true, description: 'Dimension' },
  { name: 'gcd', command: '\\gcd', category: 'functions', mathMode: true, description: 'Greatest common divisor' },
  { name: 'lcm', command: '\\operatorname{lcm}', category: 'functions', mathMode: true, description: 'Least common multiple' },
  { name: 'ker', command: '\\ker', category: 'functions', mathMode: true, description: 'Kernel' },
  { name: 'hom', command: '\\hom', category: 'functions', mathMode: true, description: 'Homomorphism' },
  { name: 'deg', command: '\\deg', category: 'functions', mathMode: true, description: 'Degree' },
  { name: 'Pr', command: '\\Pr', category: 'functions', mathMode: true, description: 'Probability' },
];

// ============================================================================
// Sets and Logic
// ============================================================================

export const SETS_LOGIC: LaTeXSymbol[] = [
  { name: 'emptyset', command: '\\emptyset', unicode: '∅', category: 'sets', mathMode: true },
  { name: 'varnothing', command: '\\varnothing', unicode: '∅', category: 'sets', mathMode: true, package: 'amssymb' },
  { name: 'N', command: '\\mathbb{N}', unicode: 'ℕ', category: 'sets', mathMode: true, description: 'Natural numbers', package: 'amssymb' },
  { name: 'Z', command: '\\mathbb{Z}', unicode: 'ℤ', category: 'sets', mathMode: true, description: 'Integers', package: 'amssymb' },
  { name: 'Q', command: '\\mathbb{Q}', unicode: 'ℚ', category: 'sets', mathMode: true, description: 'Rationals', package: 'amssymb' },
  { name: 'R', command: '\\mathbb{R}', unicode: 'ℝ', category: 'sets', mathMode: true, description: 'Real numbers', package: 'amssymb' },
  { name: 'C', command: '\\mathbb{C}', unicode: 'ℂ', category: 'sets', mathMode: true, description: 'Complex numbers', package: 'amssymb' },
  { name: 'forall', command: '\\forall', unicode: '∀', category: 'logic', mathMode: true },
  { name: 'exists', command: '\\exists', unicode: '∃', category: 'logic', mathMode: true },
  { name: 'nexists', command: '\\nexists', unicode: '∄', category: 'logic', mathMode: true, package: 'amssymb' },
  { name: 'neg', command: '\\neg', unicode: '¬', category: 'logic', mathMode: true },
  { name: 'therefore', command: '\\therefore', unicode: '∴', category: 'logic', mathMode: true, package: 'amssymb' },
  { name: 'because', command: '\\because', unicode: '∵', category: 'logic', mathMode: true, package: 'amssymb' },
  { name: 'infty', command: '\\infty', unicode: '∞', category: 'sets', mathMode: true },
  { name: 'aleph', command: '\\aleph', unicode: 'ℵ', category: 'sets', mathMode: true },
  { name: 'complement', command: '\\complement', unicode: '∁', category: 'sets', mathMode: true, package: 'amssymb' },
];

// ============================================================================
// Miscellaneous Symbols
// ============================================================================

export const MISC_SYMBOLS: LaTeXSymbol[] = [
  { name: 'partial', command: '\\partial', unicode: '∂', category: 'calculus', mathMode: true },
  { name: 'nabla', command: '\\nabla', unicode: '∇', category: 'calculus', mathMode: true },
  { name: 'hbar', command: '\\hbar', unicode: 'ℏ', category: 'physics', mathMode: true },
  { name: 'ell', command: '\\ell', unicode: 'ℓ', category: 'misc', mathMode: true },
  { name: 'Re', command: '\\Re', unicode: 'ℜ', category: 'misc', mathMode: true },
  { name: 'Im', command: '\\Im', unicode: 'ℑ', category: 'misc', mathMode: true },
  { name: 'wp', command: '\\wp', unicode: '℘', category: 'misc', mathMode: true },
  { name: 'prime', command: '\\prime', unicode: '′', category: 'misc', mathMode: true },
  { name: 'angle', command: '\\angle', unicode: '∠', category: 'geometry', mathMode: true },
  { name: 'measuredangle', command: '\\measuredangle', unicode: '∡', category: 'geometry', mathMode: true, package: 'amssymb' },
  { name: 'triangle', command: '\\triangle', unicode: '△', category: 'geometry', mathMode: true },
  { name: 'square', command: '\\square', unicode: '□', category: 'geometry', mathMode: true, package: 'amssymb' },
  { name: 'diamond', command: '\\diamond', unicode: '◇', category: 'misc', mathMode: true },
  { name: 'clubsuit', command: '\\clubsuit', unicode: '♣', category: 'misc', mathMode: true },
  { name: 'diamondsuit', command: '\\diamondsuit', unicode: '♢', category: 'misc', mathMode: true },
  { name: 'heartsuit', command: '\\heartsuit', unicode: '♡', category: 'misc', mathMode: true },
  { name: 'spadesuit', command: '\\spadesuit', unicode: '♠', category: 'misc', mathMode: true },
  { name: 'checkmark', command: '\\checkmark', unicode: '✓', category: 'misc', mathMode: true, package: 'amssymb' },
  { name: 'dagger', command: '\\dagger', unicode: '†', category: 'misc', mathMode: true },
  { name: 'ddagger', command: '\\ddagger', unicode: '‡', category: 'misc', mathMode: true },
  { name: 'dots', command: '\\dots', unicode: '…', category: 'misc', mathMode: true },
  { name: 'cdots', command: '\\cdots', unicode: '⋯', category: 'misc', mathMode: true },
  { name: 'vdots', command: '\\vdots', unicode: '⋮', category: 'misc', mathMode: true },
  { name: 'ddots', command: '\\ddots', unicode: '⋱', category: 'misc', mathMode: true },
];

// ============================================================================
// Common Commands
// ============================================================================

export const COMMON_COMMANDS: LaTeXCommand[] = [
  // Fractions and roots
  {
    name: 'frac',
    signature: '\\frac{numerator}{denominator}',
    parameters: [
      { name: 'numerator', type: 'required', description: 'Top of fraction' },
      { name: 'denominator', type: 'required', description: 'Bottom of fraction' },
    ],
    description: 'Creates a fraction',
    category: 'math',
    example: '\\frac{1}{2}',
  },
  {
    name: 'dfrac',
    signature: '\\dfrac{numerator}{denominator}',
    parameters: [
      { name: 'numerator', type: 'required' },
      { name: 'denominator', type: 'required' },
    ],
    description: 'Display-style fraction',
    category: 'math',
    package: 'amsmath',
  },
  {
    name: 'tfrac',
    signature: '\\tfrac{numerator}{denominator}',
    parameters: [
      { name: 'numerator', type: 'required' },
      { name: 'denominator', type: 'required' },
    ],
    description: 'Text-style fraction',
    category: 'math',
    package: 'amsmath',
  },
  {
    name: 'sqrt',
    signature: '\\sqrt[n]{expression}',
    parameters: [
      { name: 'n', type: 'optional', description: 'Root index' },
      { name: 'expression', type: 'required', description: 'Expression under root' },
    ],
    description: 'Square or nth root',
    category: 'math',
    example: '\\sqrt{2} or \\sqrt[3]{8}',
  },
  // Subscripts and superscripts
  {
    name: 'subscript',
    signature: '_{subscript}',
    description: 'Creates a subscript',
    category: 'math',
    example: 'x_i or x_{ij}',
  },
  {
    name: 'superscript',
    signature: '^{superscript}',
    description: 'Creates a superscript',
    category: 'math',
    example: 'x^2 or x^{n+1}',
  },
  // Text formatting
  {
    name: 'textbf',
    signature: '\\textbf{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Bold text',
    category: 'text',
  },
  {
    name: 'textit',
    signature: '\\textit{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Italic text',
    category: 'text',
  },
  {
    name: 'underline',
    signature: '\\underline{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Underlined text',
    category: 'text',
  },
  {
    name: 'emph',
    signature: '\\emph{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Emphasized text',
    category: 'text',
  },
  // Math text
  {
    name: 'mathbf',
    signature: '\\mathbf{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Bold math text',
    category: 'math',
  },
  {
    name: 'mathit',
    signature: '\\mathit{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Italic math text',
    category: 'math',
  },
  {
    name: 'mathrm',
    signature: '\\mathrm{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Roman math text',
    category: 'math',
  },
  {
    name: 'mathcal',
    signature: '\\mathcal{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Calligraphic math text',
    category: 'math',
  },
  {
    name: 'mathbb',
    signature: '\\mathbb{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Blackboard bold math text',
    category: 'math',
    package: 'amssymb',
  },
  {
    name: 'mathfrak',
    signature: '\\mathfrak{text}',
    parameters: [{ name: 'text', type: 'required' }],
    description: 'Fraktur math text',
    category: 'math',
    package: 'amssymb',
  },
  // Spacing
  {
    name: 'quad',
    signature: '\\quad',
    description: 'Medium space (1em)',
    category: 'formatting',
  },
  {
    name: 'qquad',
    signature: '\\qquad',
    description: 'Large space (2em)',
    category: 'formatting',
  },
  {
    name: 'hspace',
    signature: '\\hspace{length}',
    parameters: [{ name: 'length', type: 'required', description: 'Horizontal space' }],
    description: 'Horizontal space',
    category: 'formatting',
  },
  {
    name: 'vspace',
    signature: '\\vspace{length}',
    parameters: [{ name: 'length', type: 'required', description: 'Vertical space' }],
    description: 'Vertical space',
    category: 'formatting',
  },
  // References
  {
    name: 'label',
    signature: '\\label{key}',
    parameters: [{ name: 'key', type: 'required', description: 'Reference label' }],
    description: 'Create a label for cross-referencing',
    category: 'cross-reference',
  },
  {
    name: 'ref',
    signature: '\\ref{key}',
    parameters: [{ name: 'key', type: 'required', description: 'Reference to label' }],
    description: 'Reference a label',
    category: 'cross-reference',
  },
  {
    name: 'eqref',
    signature: '\\eqref{key}',
    parameters: [{ name: 'key', type: 'required' }],
    description: 'Reference an equation with parentheses',
    category: 'cross-reference',
    package: 'amsmath',
  },
  {
    name: 'cite',
    signature: '\\cite{key}',
    parameters: [{ name: 'key', type: 'required', description: 'Citation key' }],
    description: 'Cite a bibliography entry',
    category: 'bibliography',
  },
  // Document structure
  {
    name: 'section',
    signature: '\\section{title}',
    parameters: [{ name: 'title', type: 'required' }],
    description: 'Create a section',
    category: 'structure',
  },
  {
    name: 'subsection',
    signature: '\\subsection{title}',
    parameters: [{ name: 'title', type: 'required' }],
    description: 'Create a subsection',
    category: 'structure',
  },
  {
    name: 'subsubsection',
    signature: '\\subsubsection{title}',
    parameters: [{ name: 'title', type: 'required' }],
    description: 'Create a subsubsection',
    category: 'structure',
  },
  {
    name: 'chapter',
    signature: '\\chapter{title}',
    parameters: [{ name: 'title', type: 'required' }],
    description: 'Create a chapter (book/report)',
    category: 'structure',
  },
  // Graphics
  {
    name: 'includegraphics',
    signature: '\\includegraphics[options]{filename}',
    parameters: [
      { name: 'options', type: 'optional', description: 'width, height, scale, etc.' },
      { name: 'filename', type: 'required', description: 'Image file path' },
    ],
    description: 'Include an image',
    category: 'graphics',
    package: 'graphicx',
  },
];

// ============================================================================
// Common Environments
// ============================================================================

export const COMMON_ENVIRONMENTS: LaTeXEnvironment[] = [
  // Math environments
  {
    name: 'equation',
    description: 'Single numbered equation',
    mathMode: true,
    category: 'math',
    content: '\\begin{equation}\n  $0\n\\end{equation}',
  },
  {
    name: 'equation*',
    description: 'Single unnumbered equation',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{equation*}\n  $0\n\\end{equation*}',
  },
  {
    name: 'align',
    description: 'Multiple aligned equations',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{align}\n  $0 &= \\\\\n  &= \n\\end{align}',
  },
  {
    name: 'align*',
    description: 'Multiple aligned equations (unnumbered)',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{align*}\n  $0 &= \\\\\n  &= \n\\end{align*}',
  },
  {
    name: 'gather',
    description: 'Multiple centered equations',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{gather}\n  $0 \\\\\n  \n\\end{gather}',
  },
  {
    name: 'multline',
    description: 'Multi-line equation',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{multline}\n  $0 \\\\\n  \n\\end{multline}',
  },
  {
    name: 'cases',
    description: 'Piecewise function',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{cases}\n  $0 & \\text{if } \\\\\n  & \\text{otherwise}\n\\end{cases}',
  },
  // Matrix environments
  {
    name: 'matrix',
    description: 'Matrix without delimiters',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{matrix}\n  a & b \\\\\n  c & d\n\\end{matrix}',
  },
  {
    name: 'pmatrix',
    description: 'Matrix with parentheses',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}',
  },
  {
    name: 'bmatrix',
    description: 'Matrix with brackets',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{bmatrix}\n  a & b \\\\\n  c & d\n\\end{bmatrix}',
  },
  {
    name: 'vmatrix',
    description: 'Matrix with vertical bars (determinant)',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{vmatrix}\n  a & b \\\\\n  c & d\n\\end{vmatrix}',
  },
  {
    name: 'Vmatrix',
    description: 'Matrix with double vertical bars',
    mathMode: true,
    category: 'math',
    package: 'amsmath',
    content: '\\begin{Vmatrix}\n  a & b \\\\\n  c & d\n\\end{Vmatrix}',
  },
  // List environments
  {
    name: 'itemize',
    description: 'Bulleted list',
    category: 'list',
    content: '\\begin{itemize}\n  \\item $0\n  \\item \n\\end{itemize}',
  },
  {
    name: 'enumerate',
    description: 'Numbered list',
    category: 'list',
    content: '\\begin{enumerate}\n  \\item $0\n  \\item \n\\end{enumerate}',
  },
  {
    name: 'description',
    description: 'Description list',
    category: 'list',
    content: '\\begin{description}\n  \\item[$0] \n  \\item[] \n\\end{description}',
  },
  // Table environments
  {
    name: 'tabular',
    description: 'Table',
    category: 'table',
    parameters: [{ name: 'columns', type: 'required', description: 'Column specification (e.g., |c|c|c|)' }],
    content: '\\begin{tabular}{|c|c|c|}\n  \\hline\n  $0 & & \\\\\n  \\hline\n  & & \\\\\n  \\hline\n\\end{tabular}',
  },
  {
    name: 'table',
    description: 'Floating table environment',
    category: 'table',
    content: '\\begin{table}[htbp]\n  \\centering\n  \\caption{$0}\n  \\label{tab:}\n  \\begin{tabular}{|c|c|}\n    \\hline\n    & \\\\\n    \\hline\n  \\end{tabular}\n\\end{table}',
  },
  // Figure environments
  {
    name: 'figure',
    description: 'Floating figure environment',
    category: 'figure',
    content: '\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.8\\textwidth]{$0}\n  \\caption{}\n  \\label{fig:}\n\\end{figure}',
  },
  // Theorem environments
  {
    name: 'theorem',
    description: 'Theorem environment',
    category: 'theorem',
    package: 'amsthm',
    content: '\\begin{theorem}\n  $0\n\\end{theorem}',
  },
  {
    name: 'lemma',
    description: 'Lemma environment',
    category: 'theorem',
    package: 'amsthm',
    content: '\\begin{lemma}\n  $0\n\\end{lemma}',
  },
  {
    name: 'proof',
    description: 'Proof environment',
    category: 'theorem',
    package: 'amsthm',
    content: '\\begin{proof}\n  $0\n\\end{proof}',
  },
  {
    name: 'definition',
    description: 'Definition environment',
    category: 'theorem',
    package: 'amsthm',
    content: '\\begin{definition}\n  $0\n\\end{definition}',
  },
  {
    name: 'corollary',
    description: 'Corollary environment',
    category: 'theorem',
    package: 'amsthm',
    content: '\\begin{corollary}\n  $0\n\\end{corollary}',
  },
  // Code environments
  {
    name: 'verbatim',
    description: 'Verbatim text',
    category: 'code',
    content: '\\begin{verbatim}\n$0\n\\end{verbatim}',
  },
  {
    name: 'lstlisting',
    description: 'Code listing',
    category: 'code',
    package: 'listings',
    content: '\\begin{lstlisting}[language=$0]\n\n\\end{lstlisting}',
  },
  // Document structure
  {
    name: 'abstract',
    description: 'Abstract section',
    category: 'text',
    content: '\\begin{abstract}\n  $0\n\\end{abstract}',
  },
  {
    name: 'quote',
    description: 'Block quote',
    category: 'text',
    content: '\\begin{quote}\n  $0\n\\end{quote}',
  },
  {
    name: 'center',
    description: 'Centered text',
    category: 'text',
    content: '\\begin{center}\n  $0\n\\end{center}',
  },
];

// ============================================================================
// All Symbols Combined
// ============================================================================

export const ALL_SYMBOLS: LaTeXSymbol[] = [
  ...GREEK_LETTERS,
  ...MATH_OPERATORS,
  ...RELATIONS,
  ...ARROWS,
  ...DELIMITERS,
  ...ACCENTS,
  ...FUNCTIONS,
  ...SETS_LOGIC,
  ...MISC_SYMBOLS,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get symbols by category
 */
export function getSymbolsByCategory(category: LaTeXSymbolCategory): LaTeXSymbol[] {
  return ALL_SYMBOLS.filter((s) => s.category === category);
}

/**
 * Get commands by category
 */
export function getCommandsByCategory(category: LaTeXCommandCategory): LaTeXCommand[] {
  return COMMON_COMMANDS.filter((c) => c.category === category);
}

/**
 * Search symbols by name or command
 */
export function searchSymbols(query: string): LaTeXSymbol[] {
  const lowerQuery = query.toLowerCase();
  return ALL_SYMBOLS.filter(
    (s) =>
      s.name.toLowerCase().includes(lowerQuery) ||
      s.command.toLowerCase().includes(lowerQuery) ||
      s.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search commands by name or description
 */
export function searchCommands(query: string): LaTeXCommand[] {
  const lowerQuery = query.toLowerCase();
  return COMMON_COMMANDS.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Search environments by name or description
 */
export function searchEnvironments(query: string): LaTeXEnvironment[] {
  const lowerQuery = query.toLowerCase();
  return COMMON_ENVIRONMENTS.filter(
    (e) =>
      e.name.toLowerCase().includes(lowerQuery) ||
      e.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all symbols that require a specific package
 */
export function getSymbolsByPackage(packageName: string): LaTeXSymbol[] {
  return ALL_SYMBOLS.filter((s) => s.package === packageName);
}

/**
 * Get all commands that require a specific package
 */
export function getCommandsByPackage(packageName: string): LaTeXCommand[] {
  return COMMON_COMMANDS.filter((c) => c.package === packageName);
}

/**
 * Get all environments that require a specific package
 */
export function getEnvironmentsByPackage(packageName: string): LaTeXEnvironment[] {
  return COMMON_ENVIRONMENTS.filter((e) => e.package === packageName);
}

/**
 * Get required packages for a list of commands
 */
export function getRequiredPackages(commands: string[]): string[] {
  const packages = new Set<string>();

  for (const cmd of commands) {
    const symbol = ALL_SYMBOLS.find((s) => s.command === cmd || s.name === cmd);
    if (symbol?.package) packages.add(symbol.package);

    const command = COMMON_COMMANDS.find((c) => c.name === cmd);
    if (command?.package) packages.add(command.package);

    const env = COMMON_ENVIRONMENTS.find((e) => e.name === cmd);
    if (env?.package) packages.add(env.package);
  }

  return Array.from(packages);
}

const latexSymbolsApi = {
  GREEK_LETTERS,
  MATH_OPERATORS,
  RELATIONS,
  ARROWS,
  DELIMITERS,
  ACCENTS,
  FUNCTIONS,
  SETS_LOGIC,
  MISC_SYMBOLS,
  ALL_SYMBOLS,
  COMMON_COMMANDS,
  COMMON_ENVIRONMENTS,
  getSymbolsByCategory,
  getCommandsByCategory,
  searchSymbols,
  searchCommands,
  searchEnvironments,
  getSymbolsByPackage,
  getCommandsByPackage,
  getEnvironmentsByPackage,
  getRequiredPackages,
};

export default latexSymbolsApi;
