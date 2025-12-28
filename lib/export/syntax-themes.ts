/**
 * Syntax Highlighting Themes for Export
 * Popular color schemes for code blocks in exported documents
 */

export type SyntaxThemeName = 
  | 'one-dark-pro'
  | 'github-light'
  | 'github-dark'
  | 'monokai'
  | 'dracula'
  | 'nord'
  | 'solarized-light'
  | 'solarized-dark'
  | 'vs-code-dark'
  | 'tokyo-night';

export interface SyntaxTheme {
  name: string;
  displayName: string;
  isDark: boolean;
  colors: {
    background: string;
    foreground: string;
    comment: string;
    keyword: string;
    string: string;
    number: string;
    function: string;
    operator: string;
    property: string;
    className: string;
    constant: string;
    tag: string;
    attrName: string;
    attrValue: string;
    punctuation: string;
    selection: string;
    lineHighlight: string;
  };
}

export const SYNTAX_THEMES: Record<SyntaxThemeName, SyntaxTheme> = {
  'one-dark-pro': {
    name: 'one-dark-pro',
    displayName: 'One Dark Pro',
    isDark: true,
    colors: {
      background: '#282c34',
      foreground: '#abb2bf',
      comment: '#5c6370',
      keyword: '#c678dd',
      string: '#98c379',
      number: '#d19a66',
      function: '#61afef',
      operator: '#56b6c2',
      property: '#e06c75',
      className: '#e5c07b',
      constant: '#d19a66',
      tag: '#e06c75',
      attrName: '#d19a66',
      attrValue: '#98c379',
      punctuation: '#abb2bf',
      selection: 'rgba(97, 175, 239, 0.3)',
      lineHighlight: '#2c313c',
    },
  },
  'github-light': {
    name: 'github-light',
    displayName: 'GitHub Light',
    isDark: false,
    colors: {
      background: '#ffffff',
      foreground: '#24292f',
      comment: '#6e7781',
      keyword: '#cf222e',
      string: '#0a3069',
      number: '#0550ae',
      function: '#8250df',
      operator: '#24292f',
      property: '#953800',
      className: '#953800',
      constant: '#0550ae',
      tag: '#116329',
      attrName: '#0550ae',
      attrValue: '#0a3069',
      punctuation: '#24292f',
      selection: 'rgba(33, 136, 255, 0.15)',
      lineHighlight: '#f6f8fa',
    },
  },
  'github-dark': {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    isDark: true,
    colors: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      comment: '#8b949e',
      keyword: '#ff7b72',
      string: '#a5d6ff',
      number: '#79c0ff',
      function: '#d2a8ff',
      operator: '#c9d1d9',
      property: '#ffa657',
      className: '#ffa657',
      constant: '#79c0ff',
      tag: '#7ee787',
      attrName: '#79c0ff',
      attrValue: '#a5d6ff',
      punctuation: '#c9d1d9',
      selection: 'rgba(56, 139, 253, 0.4)',
      lineHighlight: '#161b22',
    },
  },
  'monokai': {
    name: 'monokai',
    displayName: 'Monokai',
    isDark: true,
    colors: {
      background: '#272822',
      foreground: '#f8f8f2',
      comment: '#75715e',
      keyword: '#f92672',
      string: '#e6db74',
      number: '#ae81ff',
      function: '#a6e22e',
      operator: '#f92672',
      property: '#f8f8f2',
      className: '#a6e22e',
      constant: '#ae81ff',
      tag: '#f92672',
      attrName: '#a6e22e',
      attrValue: '#e6db74',
      punctuation: '#f8f8f2',
      selection: 'rgba(73, 72, 62, 0.8)',
      lineHighlight: '#3e3d32',
    },
  },
  'dracula': {
    name: 'dracula',
    displayName: 'Dracula',
    isDark: true,
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      comment: '#6272a4',
      keyword: '#ff79c6',
      string: '#f1fa8c',
      number: '#bd93f9',
      function: '#50fa7b',
      operator: '#ff79c6',
      property: '#ffb86c',
      className: '#8be9fd',
      constant: '#bd93f9',
      tag: '#ff79c6',
      attrName: '#50fa7b',
      attrValue: '#f1fa8c',
      punctuation: '#f8f8f2',
      selection: 'rgba(68, 71, 90, 0.8)',
      lineHighlight: '#44475a',
    },
  },
  'nord': {
    name: 'nord',
    displayName: 'Nord',
    isDark: true,
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      comment: '#616e88',
      keyword: '#81a1c1',
      string: '#a3be8c',
      number: '#b48ead',
      function: '#88c0d0',
      operator: '#81a1c1',
      property: '#d8dee9',
      className: '#8fbcbb',
      constant: '#b48ead',
      tag: '#81a1c1',
      attrName: '#8fbcbb',
      attrValue: '#a3be8c',
      punctuation: '#eceff4',
      selection: 'rgba(67, 76, 94, 0.8)',
      lineHighlight: '#3b4252',
    },
  },
  'solarized-light': {
    name: 'solarized-light',
    displayName: 'Solarized Light',
    isDark: false,
    colors: {
      background: '#fdf6e3',
      foreground: '#657b83',
      comment: '#93a1a1',
      keyword: '#859900',
      string: '#2aa198',
      number: '#d33682',
      function: '#268bd2',
      operator: '#657b83',
      property: '#b58900',
      className: '#b58900',
      constant: '#cb4b16',
      tag: '#268bd2',
      attrName: '#93a1a1',
      attrValue: '#2aa198',
      punctuation: '#657b83',
      selection: 'rgba(7, 54, 66, 0.1)',
      lineHighlight: '#eee8d5',
    },
  },
  'solarized-dark': {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    isDark: true,
    colors: {
      background: '#002b36',
      foreground: '#839496',
      comment: '#586e75',
      keyword: '#859900',
      string: '#2aa198',
      number: '#d33682',
      function: '#268bd2',
      operator: '#839496',
      property: '#b58900',
      className: '#b58900',
      constant: '#cb4b16',
      tag: '#268bd2',
      attrName: '#93a1a1',
      attrValue: '#2aa198',
      punctuation: '#839496',
      selection: 'rgba(7, 54, 66, 0.99)',
      lineHighlight: '#073642',
    },
  },
  'vs-code-dark': {
    name: 'vs-code-dark',
    displayName: 'VS Code Dark+',
    isDark: true,
    colors: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      comment: '#6a9955',
      keyword: '#569cd6',
      string: '#ce9178',
      number: '#b5cea8',
      function: '#dcdcaa',
      operator: '#d4d4d4',
      property: '#9cdcfe',
      className: '#4ec9b0',
      constant: '#4fc1ff',
      tag: '#569cd6',
      attrName: '#9cdcfe',
      attrValue: '#ce9178',
      punctuation: '#d4d4d4',
      selection: 'rgba(38, 79, 120, 0.8)',
      lineHighlight: '#282828',
    },
  },
  'tokyo-night': {
    name: 'tokyo-night',
    displayName: 'Tokyo Night',
    isDark: true,
    colors: {
      background: '#1a1b26',
      foreground: '#a9b1d6',
      comment: '#565f89',
      keyword: '#bb9af7',
      string: '#9ece6a',
      number: '#ff9e64',
      function: '#7aa2f7',
      operator: '#89ddff',
      property: '#73daca',
      className: '#2ac3de',
      constant: '#ff9e64',
      tag: '#f7768e',
      attrName: '#bb9af7',
      attrValue: '#9ece6a',
      punctuation: '#a9b1d6',
      selection: 'rgba(40, 52, 82, 0.8)',
      lineHighlight: '#24283b',
    },
  },
};

/**
 * Generate CSS for a syntax theme
 */
export function generateSyntaxThemeCSS(theme: SyntaxTheme): string {
  const { colors } = theme;
  
  return `
    .code-block {
      background: ${colors.background};
    }
    
    .code-block code {
      color: ${colors.foreground};
    }
    
    .code-block ::selection {
      background: ${colors.selection};
    }
    
    .token.comment { color: ${colors.comment}; font-style: italic; }
    .token.keyword { color: ${colors.keyword}; font-weight: 500; }
    .token.string { color: ${colors.string}; }
    .token.number { color: ${colors.number}; }
    .token.function { color: ${colors.function}; }
    .token.operator { color: ${colors.operator}; }
    .token.property { color: ${colors.property}; }
    .token.class-name { color: ${colors.className}; }
    .token.constant { color: ${colors.constant}; }
    .token.boolean { color: ${colors.constant}; }
    .token.tag { color: ${colors.tag}; }
    .token.attr-name { color: ${colors.attrName}; }
    .token.attr-value { color: ${colors.attrValue}; }
    .token.punctuation { color: ${colors.punctuation}; }
    .token.regex { color: ${colors.string}; }
  `;
}

/**
 * Get theme by name with fallback
 * Supports both built-in themes and custom theme objects
 */
export function getSyntaxTheme(name: SyntaxThemeName | string, customThemes?: SyntaxTheme[]): SyntaxTheme {
  // First check built-in themes
  if (SYNTAX_THEMES[name as SyntaxThemeName]) {
    return SYNTAX_THEMES[name as SyntaxThemeName];
  }
  
  // Then check custom themes if provided
  if (customThemes) {
    const customTheme = customThemes.find(t => t.name === name);
    if (customTheme) {
      return customTheme;
    }
  }
  
  // Fallback to default
  return SYNTAX_THEMES['one-dark-pro'];
}

/**
 * Get all available themes
 */
export function getAvailableSyntaxThemes(): Array<{ name: SyntaxThemeName; displayName: string; isDark: boolean }> {
  return Object.entries(SYNTAX_THEMES).map(([name, theme]) => ({
    name: name as SyntaxThemeName,
    displayName: theme.displayName,
    isDark: theme.isDark,
  }));
}

/**
 * Get recommended theme based on document theme
 */
export function getRecommendedSyntaxTheme(isDarkMode: boolean): SyntaxThemeName {
  return isDarkMode ? 'one-dark-pro' : 'github-light';
}

/**
 * Validate a custom theme object
 */
export function validateSyntaxTheme(theme: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!theme || typeof theme !== 'object') {
    return { valid: false, errors: ['Theme must be an object'] };
  }
  
  const t = theme as Record<string, unknown>;
  
  if (!t.name || typeof t.name !== 'string') {
    errors.push('Missing or invalid "name" field');
  }
  
  if (!t.displayName || typeof t.displayName !== 'string') {
    errors.push('Missing or invalid "displayName" field');
  }
  
  if (typeof t.isDark !== 'boolean') {
    errors.push('Missing or invalid "isDark" field');
  }
  
  if (!t.colors || typeof t.colors !== 'object') {
    errors.push('Missing or invalid "colors" object');
  } else {
    const colors = t.colors as Record<string, unknown>;
    const requiredColors = [
      'background', 'foreground', 'comment', 'keyword', 'string',
      'number', 'function', 'operator', 'property', 'className',
      'constant', 'tag', 'attrName', 'attrValue', 'punctuation',
      'selection', 'lineHighlight'
    ];
    
    for (const color of requiredColors) {
      if (!colors[color] || typeof colors[color] !== 'string') {
        errors.push(`Missing or invalid color: "${color}"`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Create CSS variables from a theme for use in components
 */
export function themeToCSSVariables(theme: SyntaxTheme): Record<string, string> {
  return {
    '--syntax-bg': theme.colors.background,
    '--syntax-fg': theme.colors.foreground,
    '--syntax-comment': theme.colors.comment,
    '--syntax-keyword': theme.colors.keyword,
    '--syntax-string': theme.colors.string,
    '--syntax-number': theme.colors.number,
    '--syntax-function': theme.colors.function,
    '--syntax-operator': theme.colors.operator,
    '--syntax-property': theme.colors.property,
    '--syntax-class': theme.colors.className,
    '--syntax-constant': theme.colors.constant,
    '--syntax-tag': theme.colors.tag,
    '--syntax-attr-name': theme.colors.attrName,
    '--syntax-attr-value': theme.colors.attrValue,
    '--syntax-punctuation': theme.colors.punctuation,
    '--syntax-selection': theme.colors.selection,
    '--syntax-line-highlight': theme.colors.lineHighlight,
  };
}
