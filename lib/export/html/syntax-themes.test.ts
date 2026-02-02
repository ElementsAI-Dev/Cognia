/**
 * Unit tests for syntax-themes.ts
 */

import {
  SYNTAX_THEMES,
  getSyntaxTheme,
  getAvailableSyntaxThemes,
  getRecommendedSyntaxTheme,
  generateSyntaxThemeCSS,
  validateSyntaxTheme,
  themeToCSSVariables,
  type SyntaxTheme,
  type SyntaxThemeName,
} from './syntax-themes';

describe('syntax-themes', () => {
  describe('SYNTAX_THEMES', () => {
    it('should contain all expected built-in themes', () => {
      const expectedThemes: SyntaxThemeName[] = [
        'one-dark-pro',
        'github-light',
        'github-dark',
        'monokai',
        'dracula',
        'nord',
        'solarized-light',
        'solarized-dark',
        'vs-code-dark',
        'tokyo-night',
      ];

      expectedThemes.forEach((themeName) => {
        expect(SYNTAX_THEMES[themeName]).toBeDefined();
      });
    });

    it('should have all required color properties for each theme', () => {
      const requiredColors = [
        'background',
        'foreground',
        'comment',
        'keyword',
        'string',
        'number',
        'function',
        'operator',
        'property',
        'className',
        'constant',
        'tag',
        'attrName',
        'attrValue',
        'punctuation',
        'selection',
        'lineHighlight',
      ];

      Object.values(SYNTAX_THEMES).forEach((theme) => {
        requiredColors.forEach((color) => {
          expect(theme.colors[color as keyof typeof theme.colors]).toBeDefined();
          expect(typeof theme.colors[color as keyof typeof theme.colors]).toBe('string');
        });
      });
    });

    it('should have name, displayName, and isDark for each theme', () => {
      Object.entries(SYNTAX_THEMES).forEach(([key, theme]) => {
        expect(theme.name).toBe(key);
        expect(typeof theme.displayName).toBe('string');
        expect(theme.displayName.length).toBeGreaterThan(0);
        expect(typeof theme.isDark).toBe('boolean');
      });
    });
  });

  describe('getSyntaxTheme', () => {
    it('should return the correct built-in theme by name', () => {
      const theme = getSyntaxTheme('monokai');
      expect(theme.name).toBe('monokai');
      expect(theme.displayName).toBe('Monokai');
    });

    it('should return default theme for unknown theme name', () => {
      const theme = getSyntaxTheme('unknown-theme');
      expect(theme.name).toBe('one-dark-pro');
    });

    it('should find custom themes when provided', () => {
      const customTheme: SyntaxTheme = {
        name: 'my-custom',
        displayName: 'My Custom Theme',
        isDark: true,
        colors: {
          background: '#000000',
          foreground: '#ffffff',
          comment: '#888888',
          keyword: '#ff0000',
          string: '#00ff00',
          number: '#0000ff',
          function: '#ffff00',
          operator: '#ff00ff',
          property: '#00ffff',
          className: '#ff8800',
          constant: '#8800ff',
          tag: '#ff0088',
          attrName: '#00ff88',
          attrValue: '#88ff00',
          punctuation: '#cccccc',
          selection: 'rgba(255,255,255,0.3)',
          lineHighlight: '#111111',
        },
      };

      const theme = getSyntaxTheme('my-custom', [customTheme]);
      expect(theme.name).toBe('my-custom');
      expect(theme.displayName).toBe('My Custom Theme');
    });

    it('should prefer built-in themes over custom themes with same name', () => {
      const customTheme: SyntaxTheme = {
        name: 'monokai',
        displayName: 'Fake Monokai',
        isDark: true,
        colors: SYNTAX_THEMES['one-dark-pro'].colors,
      };

      const theme = getSyntaxTheme('monokai', [customTheme]);
      expect(theme.displayName).toBe('Monokai'); // Built-in, not "Fake Monokai"
    });
  });

  describe('getAvailableSyntaxThemes', () => {
    it('should return an array of theme metadata', () => {
      const themes = getAvailableSyntaxThemes();
      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBe(10);
    });

    it('should include name, displayName, and isDark for each theme', () => {
      const themes = getAvailableSyntaxThemes();
      themes.forEach((theme) => {
        expect(typeof theme.name).toBe('string');
        expect(typeof theme.displayName).toBe('string');
        expect(typeof theme.isDark).toBe('boolean');
      });
    });
  });

  describe('getRecommendedSyntaxTheme', () => {
    it('should return one-dark-pro for dark mode', () => {
      expect(getRecommendedSyntaxTheme(true)).toBe('one-dark-pro');
    });

    it('should return github-light for light mode', () => {
      expect(getRecommendedSyntaxTheme(false)).toBe('github-light');
    });
  });

  describe('generateSyntaxThemeCSS', () => {
    it('should generate valid CSS string', () => {
      const theme = SYNTAX_THEMES['monokai'];
      const css = generateSyntaxThemeCSS(theme);

      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('should include token class selectors', () => {
      const theme = SYNTAX_THEMES['dracula'];
      const css = generateSyntaxThemeCSS(theme);

      expect(css).toContain('.token.keyword');
      expect(css).toContain('.token.string');
      expect(css).toContain('.token.comment');
      expect(css).toContain('.token.function');
      expect(css).toContain('.token.number');
    });

    it('should include theme colors in CSS', () => {
      const theme = SYNTAX_THEMES['github-light'];
      const css = generateSyntaxThemeCSS(theme);

      expect(css).toContain(theme.colors.keyword);
      expect(css).toContain(theme.colors.string);
      expect(css).toContain(theme.colors.comment);
    });
  });

  describe('validateSyntaxTheme', () => {
    it('should validate a correct theme', () => {
      const result = validateSyntaxTheme(SYNTAX_THEMES['one-dark-pro']);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object values', () => {
      expect(validateSyntaxTheme(null).valid).toBe(false);
      expect(validateSyntaxTheme(undefined).valid).toBe(false);
      expect(validateSyntaxTheme('string').valid).toBe(false);
      expect(validateSyntaxTheme(123).valid).toBe(false);
    });

    it('should report missing name field', () => {
      const result = validateSyntaxTheme({
        displayName: 'Test',
        isDark: true,
        colors: SYNTAX_THEMES['one-dark-pro'].colors,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "name" field');
    });

    it('should report missing displayName field', () => {
      const result = validateSyntaxTheme({
        name: 'test',
        isDark: true,
        colors: SYNTAX_THEMES['one-dark-pro'].colors,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "displayName" field');
    });

    it('should report missing isDark field', () => {
      const result = validateSyntaxTheme({
        name: 'test',
        displayName: 'Test',
        colors: SYNTAX_THEMES['one-dark-pro'].colors,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "isDark" field');
    });

    it('should report missing colors object', () => {
      const result = validateSyntaxTheme({
        name: 'test',
        displayName: 'Test',
        isDark: true,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid "colors" object');
    });

    it('should report missing individual colors', () => {
      const result = validateSyntaxTheme({
        name: 'test',
        displayName: 'Test',
        isDark: true,
        colors: {
          background: '#000',
          // Missing other colors
        },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing or invalid color'))).toBe(true);
    });
  });

  describe('themeToCSSVariables', () => {
    it('should generate CSS variables from theme', () => {
      const theme = SYNTAX_THEMES['nord'];
      const variables = themeToCSSVariables(theme);

      expect(variables['--syntax-bg']).toBe(theme.colors.background);
      expect(variables['--syntax-fg']).toBe(theme.colors.foreground);
      expect(variables['--syntax-keyword']).toBe(theme.colors.keyword);
      expect(variables['--syntax-string']).toBe(theme.colors.string);
    });

    it('should include all expected CSS variable names', () => {
      const theme = SYNTAX_THEMES['tokyo-night'];
      const variables = themeToCSSVariables(theme);

      const expectedVariables = [
        '--syntax-bg',
        '--syntax-fg',
        '--syntax-comment',
        '--syntax-keyword',
        '--syntax-string',
        '--syntax-number',
        '--syntax-function',
        '--syntax-operator',
        '--syntax-property',
        '--syntax-class',
        '--syntax-constant',
        '--syntax-tag',
        '--syntax-attr-name',
        '--syntax-attr-value',
        '--syntax-punctuation',
        '--syntax-selection',
        '--syntax-line-highlight',
      ];

      expectedVariables.forEach((varName) => {
        expect(variables[varName]).toBeDefined();
      });
    });
  });
});
