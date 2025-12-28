/**
 * Tests for custom theme integration in export functionality
 * 
 * These tests verify the custom theme data flow and integration points.
 * Full component testing requires complex mocking of many dependencies.
 */

import { getSyntaxTheme, type SyntaxTheme } from '@/lib/export/syntax-themes';

// Sample custom theme for testing
const customTheme: SyntaxTheme = {
  name: 'my-custom-theme',
  displayName: 'My Custom Theme',
  isDark: true,
  colors: {
    background: '#1a1a1a',
    foreground: '#ffffff',
    comment: '#888888',
    keyword: '#ff6b6b',
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
};

describe('Custom theme integration with export', () => {
  describe('getSyntaxTheme with custom themes', () => {
    it('should return custom theme when name matches', () => {
      const result = getSyntaxTheme('my-custom-theme', [customTheme]);
      
      expect(result.name).toBe('my-custom-theme');
      expect(result.displayName).toBe('My Custom Theme');
      expect(result.colors.background).toBe('#1a1a1a');
    });

    it('should prefer built-in theme over custom with same name', () => {
      const conflictingTheme: SyntaxTheme = {
        ...customTheme,
        name: 'monokai', // Same as built-in
        displayName: 'Fake Monokai',
      };

      const result = getSyntaxTheme('monokai', [conflictingTheme]);
      
      // Should return built-in, not custom
      expect(result.displayName).toBe('Monokai');
    });

    it('should fallback to default when custom theme not found', () => {
      const result = getSyntaxTheme('non-existent', [customTheme]);
      
      expect(result.name).toBe('one-dark-pro');
    });

    it('should work with empty custom themes array', () => {
      const result = getSyntaxTheme('monokai', []);
      
      expect(result.name).toBe('monokai');
    });

    it('should work when customThemes is undefined', () => {
      const result = getSyntaxTheme('dracula');
      
      expect(result.name).toBe('dracula');
    });
  });

  describe('Custom theme structure validation', () => {
    it('should have all required color properties', () => {
      const requiredColors = [
        'background', 'foreground', 'comment', 'keyword', 'string',
        'number', 'function', 'operator', 'property', 'className',
        'constant', 'tag', 'attrName', 'attrValue', 'punctuation',
        'selection', 'lineHighlight'
      ];

      requiredColors.forEach(color => {
        expect(customTheme.colors[color as keyof typeof customTheme.colors]).toBeDefined();
      });
    });

    it('should have required metadata fields', () => {
      expect(customTheme.name).toBeDefined();
      expect(customTheme.displayName).toBeDefined();
      expect(typeof customTheme.isDark).toBe('boolean');
    });
  });

  describe('Multiple custom themes', () => {
    const multipleThemes: SyntaxTheme[] = [
      customTheme,
      {
        name: 'another-theme',
        displayName: 'Another Theme',
        isDark: false,
        colors: {
          background: '#ffffff',
          foreground: '#000000',
          comment: '#666666',
          keyword: '#0000ff',
          string: '#008000',
          number: '#ff0000',
          function: '#800080',
          operator: '#000000',
          property: '#0000ff',
          className: '#2b91af',
          constant: '#2b91af',
          tag: '#800000',
          attrName: '#ff0000',
          attrValue: '#0000ff',
          punctuation: '#000000',
          selection: 'rgba(0, 0, 255, 0.2)',
          lineHighlight: '#f0f0f0',
        },
      },
    ];

    it('should find correct theme from multiple custom themes', () => {
      const result1 = getSyntaxTheme('my-custom-theme', multipleThemes);
      const result2 = getSyntaxTheme('another-theme', multipleThemes);

      expect(result1.displayName).toBe('My Custom Theme');
      expect(result2.displayName).toBe('Another Theme');
    });

    it('should return first matching theme', () => {
      const duplicateThemes: SyntaxTheme[] = [
        { ...customTheme, displayName: 'First' },
        { ...customTheme, displayName: 'Second' },
      ];

      const result = getSyntaxTheme('my-custom-theme', duplicateThemes);
      expect(result.displayName).toBe('First');
    });
  });
});

describe('Export options with custom themes', () => {
  it('should correctly structure options with customThemes', () => {
    const exportOptions = {
      theme: 'dark' as const,
      syntaxTheme: 'my-custom-theme',
      customThemes: [customTheme],
      showTimestamps: true,
      showTokens: false,
    };

    // Verify the theme can be resolved
    const resolvedTheme = getSyntaxTheme(
      exportOptions.syntaxTheme,
      exportOptions.customThemes
    );

    expect(resolvedTheme.name).toBe('my-custom-theme');
    expect(resolvedTheme.colors.background).toBe('#1a1a1a');
  });

  it('should handle fallback when custom theme is deleted', () => {
    const exportOptions = {
      syntaxTheme: 'deleted-theme',
      customThemes: [customTheme], // doesn't include 'deleted-theme'
    };

    const resolvedTheme = getSyntaxTheme(
      exportOptions.syntaxTheme,
      exportOptions.customThemes
    );

    // Should fallback to default
    expect(resolvedTheme.name).toBe('one-dark-pro');
  });
});
