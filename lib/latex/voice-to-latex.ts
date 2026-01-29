/**
 * Voice to LaTeX
 * Converts spoken mathematical expressions to LaTeX code
 * Supports multiple languages and math-specific vocabulary
 */

import type {
  VoiceToLaTeXConfig,
  VoiceToLaTeXResult,
} from '@/types/latex';

// ============================================================================
// Types
// ============================================================================

export interface VoiceRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  interimTranscript: string;
  finalTranscript: string;
  latex: string;
}

export interface VoiceRecognitionCallbacks {
  onResult?: (result: VoiceToLaTeXResult) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onInterim?: (transcript: string, latex: string) => void;
}

// ============================================================================
// Math Vocabulary
// ============================================================================

const MATH_VOCABULARY: Record<string, string> = {
  // Numbers
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10', 'hundred': '100', 'thousand': '1000',

  // Greek letters (spoken names)
  'alpha': '\\alpha', 'beta': '\\beta', 'gamma': '\\gamma', 'delta': '\\delta',
  'epsilon': '\\epsilon', 'zeta': '\\zeta', 'eta': '\\eta', 'theta': '\\theta',
  'iota': '\\iota', 'kappa': '\\kappa', 'lambda': '\\lambda', 'mu': '\\mu',
  'nu': '\\nu', 'xi': '\\xi', 'pi': '\\pi', 'rho': '\\rho',
  'sigma': '\\sigma', 'tau': '\\tau', 'upsilon': '\\upsilon', 'phi': '\\phi',
  'chi': '\\chi', 'psi': '\\psi', 'omega': '\\omega',
  'capital gamma': '\\Gamma', 'capital delta': '\\Delta', 'capital theta': '\\Theta',
  'capital lambda': '\\Lambda', 'capital xi': '\\Xi', 'capital pi': '\\Pi',
  'capital sigma': '\\Sigma', 'capital phi': '\\Phi', 'capital psi': '\\Psi',
  'capital omega': '\\Omega',

  // Operations (spoken)
  'plus': '+', 'minus': '-', 'times': '\\times', 'divided by': '\\div',
  'multiply': '\\times', 'cross': '\\times', 'over': '/',
  'equals': '=', 'not equal': '\\neq', 'not equals': '\\neq',
  'less than': '<', 'greater than': '>', 'less than or equal': '\\leq',
  'greater than or equal': '\\geq', 'approximately': '\\approx',
  'approximately equal': '\\approx', 'equivalent': '\\equiv',
  'proportional': '\\propto', 'proportional to': '\\propto',

  // Functions
  'sine': '\\sin', 'cosine': '\\cos', 'tangent': '\\tan',
  'cotangent': '\\cot', 'secant': '\\sec', 'cosecant': '\\csc',
  'arc sine': '\\arcsin', 'arc cosine': '\\arccos', 'arc tangent': '\\arctan',
  'hyperbolic sine': '\\sinh', 'hyperbolic cosine': '\\cosh',
  'hyperbolic tangent': '\\tanh',
  'log': '\\log', 'natural log': '\\ln', 'logarithm': '\\log',
  'exponential': '\\exp',

  // Calculus
  'derivative': '\\frac{d}{dx}', 'partial derivative': '\\frac{\\partial}{\\partial x}',
  'integral': '\\int', 'double integral': '\\iint', 'triple integral': '\\iiint',
  'contour integral': '\\oint',
  'limit': '\\lim', 'sum': '\\sum', 'summation': '\\sum',
  'product': '\\prod', 'infinity': '\\infty',

  // Set theory
  'union': '\\cup', 'intersection': '\\cap', 'subset': '\\subset',
  'superset': '\\supset', 'element of': '\\in', 'not element of': '\\notin',
  'empty set': '\\emptyset', 'contains': '\\ni',

  // Logic
  'for all': '\\forall', 'there exists': '\\exists',
  'implies': '\\implies', 'if and only if': '\\iff',
  'and': '\\land', 'or': '\\lor', 'not': '\\neg',
  'therefore': '\\therefore', 'because': '\\because',

  // Arrows
  'right arrow': '\\rightarrow', 'left arrow': '\\leftarrow',
  'double right arrow': '\\Rightarrow', 'double left arrow': '\\Leftarrow',
  'maps to': '\\mapsto', 'goes to': '\\to',

  // Structures
  'fraction': '\\frac{}{}', 'square root': '\\sqrt{}',
  'cube root': '\\sqrt[3]{}', 'nth root': '\\sqrt[n]{}',
  'power': '^{}', 'subscript': '_{}', 'superscript': '^{}',

  // Delimiters
  'open parenthesis': '(', 'close parenthesis': ')',
  'open bracket': '[', 'close bracket': ']',
  'open brace': '\\{', 'close brace': '\\}',
  'left angle': '\\langle', 'right angle': '\\rangle',

  // Accents
  'hat accent': '\\hat{}', 'bar accent': '\\bar{}', 'tilde accent': '\\tilde{}',
  'vector accent': '\\vec{}', 'dot accent': '\\dot{}', 'double dot accent': '\\ddot{}',

  // Misc
  'partial': '\\partial', 'nabla': '\\nabla', 'del': '\\nabla',
  'perpendicular': '\\perp', 'parallel': '\\parallel',
  'angle': '\\angle', 'degree': '^{\\circ}', 'degrees': '^{\\circ}',
};

// Chinese math vocabulary
const CHINESE_MATH_VOCABULARY: Record<string, string> = {
  // Numbers
  '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
  '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
  '十': '10', '百': '100', '千': '1000',

  // Operations
  '加': '+', '减': '-', '乘': '\\times', '除以': '\\div',
  '等于': '=', '不等于': '\\neq',
  '小于': '<', '大于': '>', '小于等于': '\\leq', '大于等于': '\\geq',
  '约等于': '\\approx', '恒等于': '\\equiv',

  // Functions
  '正弦': '\\sin', '余弦': '\\cos', '正切': '\\tan',
  '对数': '\\log', '自然对数': '\\ln', '指数': '\\exp',

  // Calculus
  '导数': '\\frac{d}{dx}', '偏导': '\\frac{\\partial}{\\partial x}',
  '积分': '\\int', '二重积分': '\\iint', '三重积分': '\\iiint',
  '极限': '\\lim', '求和': '\\sum', '连乘': '\\prod',
  '无穷': '\\infty', '无穷大': '\\infty',

  // Set theory
  '并集': '\\cup', '交集': '\\cap', '子集': '\\subset',
  '属于': '\\in', '不属于': '\\notin', '空集': '\\emptyset',

  // Logic
  '任意': '\\forall', '存在': '\\exists',
  '推出': '\\implies', '当且仅当': '\\iff',
  '且': '\\land', '或': '\\lor', '非': '\\neg',

  // Structures
  '分数': '\\frac{}{}', '根号': '\\sqrt{}',
  '平方': '^{2}', '立方': '^{3}', '次方': '^{}',
  '下标': '_{}', '上标': '^{}',

  // Greek
  '阿尔法': '\\alpha', '贝塔': '\\beta', '伽马': '\\gamma',
  '德尔塔': '\\delta', '派': '\\pi', '西格玛': '\\sigma',
  '欧米伽': '\\omega', '拉姆达': '\\lambda', '缪': '\\mu',
};

// ============================================================================
// Voice Recognition Service
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Get the SpeechRecognition constructor (browser-specific)
 */
function getSpeechRecognitionConstructor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;

  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * Voice to LaTeX service class
 */
export class VoiceToLaTeXService {
  private recognition: any = null;
  private config: VoiceToLaTeXConfig;
  private callbacks: VoiceRecognitionCallbacks;
  private state: VoiceRecognitionState;

  constructor(
    config: Partial<VoiceToLaTeXConfig> = {},
    callbacks: VoiceRecognitionCallbacks = {}
  ) {
    this.config = {
      language: config.language || 'en-US',
      continuous: config.continuous ?? true,
      interimResults: config.interimResults ?? true,
      mathVocabulary: config.mathVocabulary ?? true,
      autoCapitalize: config.autoCapitalize ?? true,
      autoPunctuation: config.autoPunctuation ?? true,
    };

    this.callbacks = callbacks;

    this.state = {
      isListening: false,
      isSupported: this.checkSupport(),
      error: null,
      interimTranscript: '',
      finalTranscript: '',
      latex: '',
    };
  }

  /**
   * Check if speech recognition is supported
   */
  private checkSupport(): boolean {
    return getSpeechRecognitionConstructor() !== null;
  }

  /**
   * Initialize speech recognition
   */
  private initRecognition(): void {
    if (!this.state.isSupported) {
      this.state.error = 'Speech recognition is not supported in this browser';
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) return;

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = this.config.continuous;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.lang = this.config.language;

    this.recognition.onstart = () => {
      this.state.isListening = true;
      this.state.error = null;
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.state.isListening = false;
      this.callbacks.onEnd?.();
    };

    this.recognition.onerror = (event: any) => {
      this.state.error = event.error;
      this.callbacks.onError?.(event.error);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.state.interimTranscript = interimTranscript;

      if (finalTranscript) {
        this.state.finalTranscript += finalTranscript;
        const latex = this.convertToLaTeX(finalTranscript);
        this.state.latex += latex;

        const result: VoiceToLaTeXResult = {
          transcript: finalTranscript,
          latex,
          confidence: event.results[event.results.length - 1][0].confidence,
          isFinal: true,
        };

        this.callbacks.onResult?.(result);
      }

      if (interimTranscript) {
        const interimLatex = this.convertToLaTeX(interimTranscript);
        this.callbacks.onInterim?.(interimTranscript, interimLatex);
      }
    };
  }

  /**
   * Start listening
   */
  start(): void {
    if (!this.recognition) {
      this.initRecognition();
    }

    if (this.recognition && !this.state.isListening) {
      this.recognition.start();
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.recognition && this.state.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Toggle listening state
   */
  toggle(): void {
    if (this.state.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state.interimTranscript = '';
    this.state.finalTranscript = '';
    this.state.latex = '';
    this.state.error = null;
  }

  /**
   * Get current state
   */
  getState(): VoiceRecognitionState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<VoiceToLaTeXConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.recognition) {
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
    }
  }

  /**
   * Convert transcript to LaTeX
   */
  convertToLaTeX(transcript: string): string {
    let result = transcript.toLowerCase().trim();

    // Get vocabulary based on language
    const vocabulary = this.config.language.startsWith('zh')
      ? { ...MATH_VOCABULARY, ...CHINESE_MATH_VOCABULARY }
      : MATH_VOCABULARY;

    // Process multi-word patterns first (longer patterns first)
    const sortedPatterns = Object.keys(vocabulary).sort((a, b) => b.length - a.length);

    for (const pattern of sortedPatterns) {
      const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'gi');
      result = result.replace(regex, vocabulary[pattern]);
    }

    // Handle special patterns
    result = this.processSpecialPatterns(result);

    // Apply math vocabulary if enabled
    if (this.config.mathVocabulary) {
      result = this.processMathPatterns(result);
    }

    return result;
  }

  /**
   * Process special voice patterns
   */
  private processSpecialPatterns(text: string): string {
    let result = text;

    // "x squared" -> x^{2}
    result = result.replace(/(\w+)\s+squared/gi, '$1^{2}');

    // "x cubed" -> x^{3}
    result = result.replace(/(\w+)\s+cubed/gi, '$1^{3}');

    // "x to the power of n" -> x^{n}
    result = result.replace(/(\w+)\s+to\s+the\s+power\s+of\s+(\w+)/gi, '$1^{$2}');

    // "x to the n" -> x^{n}
    result = result.replace(/(\w+)\s+to\s+the\s+(\w+)/gi, '$1^{$2}');

    // "a over b" -> \frac{a}{b}
    result = result.replace(/(\w+)\s+over\s+(\w+)/gi, '\\frac{$1}{$2}');

    // "square root of x" -> \sqrt{x}
    result = result.replace(/square\s+root\s+of\s+(\w+)/gi, '\\sqrt{$1}');

    // "cube root of x" -> \sqrt[3]{x}
    result = result.replace(/cube\s+root\s+of\s+(\w+)/gi, '\\sqrt[3]{$1}');

    // "nth root of x" -> \sqrt[n]{x}
    result = result.replace(/(\w+)(?:th|nd|rd|st)\s+root\s+of\s+(\w+)/gi, '\\sqrt[$1]{$2}');

    // "x sub n" -> x_{n}
    result = result.replace(/(\w+)\s+sub\s+(\w+)/gi, '$1_{$2}');

    // "limit as x approaches a" -> \lim_{x \to a}
    result = result.replace(/limit\s+as\s+(\w+)\s+approaches?\s+(\w+)/gi, '\\lim_{$1 \\to $2}');

    // "sum from n equals 1 to infinity" -> \sum_{n=1}^{\infty}
    result = result.replace(
      /sum\s+from\s+(\w+)\s+equals?\s+(\w+)\s+to\s+(\w+)/gi,
      '\\sum_{$1=$2}^{$3}'
    );

    // "integral from a to b" -> \int_{a}^{b}
    result = result.replace(/integral\s+from\s+(\w+)\s+to\s+(\w+)/gi, '\\int_{$1}^{$2}');

    // "derivative of f with respect to x" -> \frac{df}{dx}
    result = result.replace(
      /derivative\s+of\s+(\w+)\s+with\s+respect\s+to\s+(\w+)/gi,
      '\\frac{d$1}{d$2}'
    );

    // "partial derivative of f with respect to x" -> \frac{\partial f}{\partial x}
    result = result.replace(
      /partial\s+derivative\s+of\s+(\w+)\s+with\s+respect\s+to\s+(\w+)/gi,
      '\\frac{\\partial $1}{\\partial $2}'
    );

    return result;
  }

  /**
   * Process additional math patterns
   */
  private processMathPatterns(text: string): string {
    let result = text;

    // Convert spoken operators to symbols
    result = result.replace(/\bplus\b/gi, '+');
    result = result.replace(/\bminus\b/gi, '-');
    result = result.replace(/\btimes\b/gi, '\\times');
    result = result.replace(/\bdivided by\b/gi, '\\div');
    result = result.replace(/\bequals?\b/gi, '=');

    // Handle "x prime" -> x'
    result = result.replace(/(\w+)\s+prime/gi, "$1'");

    // Handle "x double prime" -> x''
    result = result.replace(/(\w+)\s+double\s+prime/gi, "$1''");

    // Handle function notation
    result = result.replace(/(\w+)\s+of\s+(\w+)/gi, '$1($2)');

    return result;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert spoken text to LaTeX (standalone function)
 */
export function convertVoiceToLaTeX(
  transcript: string,
  language: string = 'en-US'
): string {
  const service = new VoiceToLaTeXService({ language });
  return service.convertToLaTeX(transcript);
}

/**
 * Get available math vocabulary
 */
export function getMathVocabulary(language: string = 'en-US'): Record<string, string> {
  if (language.startsWith('zh')) {
    return { ...MATH_VOCABULARY, ...CHINESE_MATH_VOCABULARY };
  }
  return MATH_VOCABULARY;
}

/**
 * Check if voice recognition is supported
 */
export function isVoiceRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

const voiceToLatexApi = {
  VoiceToLaTeXService,
  convertVoiceToLaTeX,
  getMathVocabulary,
  isVoiceRecognitionSupported,
  MATH_VOCABULARY,
  CHINESE_MATH_VOCABULARY,
};

export default voiceToLatexApi;
