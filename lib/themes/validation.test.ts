/**
 * Theme and Background Validation Tests
 */

import { validateThemeData, validateBackgroundData } from './validation';

describe('Theme Validation', () => {
  describe('validateThemeData', () => {
    const validTheme = {
      name: 'Test Theme',
      isDark: true,
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#f59e0b',
        background: '#0f172a',
        foreground: '#f8fafc',
        muted: '#334155',
      },
    };

    const validThemeData = {
      version: '1.0',
      themes: [validTheme],
    };

    it('should return valid for correct theme data', () => {
      const result = validateThemeData(validThemeData);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for multiple themes', () => {
      const data = {
        version: '1.0',
        themes: [
          validTheme,
          { ...validTheme, name: 'Light Theme', isDark: false },
        ],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for null data', () => {
      const result = validateThemeData(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid data format');
    });

    it('should return invalid for non-object data', () => {
      expect(validateThemeData('string').valid).toBe(false);
      expect(validateThemeData(123).valid).toBe(false);
      expect(validateThemeData([]).valid).toBe(false);
    });

    it('should return invalid for unsupported version', () => {
      const data = { ...validThemeData, version: '2.0' };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported version format');
    });

    it('should return invalid for missing themes array', () => {
      const data = { version: '1.0' };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing themes array');
    });

    it('should return invalid for non-array themes', () => {
      const data = { version: '1.0', themes: 'not-array' };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing themes array');
    });

    it('should return invalid for invalid theme object', () => {
      const data = { version: '1.0', themes: [null] };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid theme object');
    });

    it('should return invalid for theme missing name', () => {
      const data = {
        version: '1.0',
        themes: [{ isDark: true, colors: validTheme.colors }],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Theme missing name');
    });

    it('should return invalid for theme with empty name', () => {
      const data = {
        version: '1.0',
        themes: [{ name: '   ', isDark: true, colors: validTheme.colors }],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Theme missing name');
    });

    it('should return invalid for theme missing isDark', () => {
      const data = {
        version: '1.0',
        themes: [{ name: 'Test', colors: validTheme.colors }],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Theme missing isDark property');
    });

    it('should return invalid for theme missing colors', () => {
      const data = {
        version: '1.0',
        themes: [{ name: 'Test', isDark: true }],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Theme missing colors');
    });

    it('should return invalid for missing required colors', () => {
      const incompleteColors = { ...validTheme.colors };
      delete (incompleteColors as Record<string, unknown>).primary;
      
      const data = {
        version: '1.0',
        themes: [{ name: 'Test', isDark: true, colors: incompleteColors }],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid color: primary');
    });

    it('should return invalid for invalid hex colors', () => {
      const invalidColors = { ...validTheme.colors, primary: 'not-a-color' };
      
      const data = {
        version: '1.0',
        themes: [{ name: 'Test', isDark: true, colors: invalidColors }],
      };
      const result = validateThemeData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid color: primary');
    });

    it('should validate all required colors', () => {
      const requiredColors = ['primary', 'secondary', 'accent', 'background', 'foreground', 'muted'];
      
      for (const colorKey of requiredColors) {
        const invalidColors = { ...validTheme.colors, [colorKey]: 'invalid' };
        const data = {
          version: '1.0',
          themes: [{ name: 'Test', isDark: true, colors: invalidColors }],
        };
        const result = validateThemeData(data);
        expect(result.valid).toBe(false);
        expect(result.error).toBe(`Invalid color: ${colorKey}`);
      }
    });
  });

  describe('validateBackgroundData', () => {
    const validBackgroundData = {
      version: '1.0',
      settings: {
        enabled: true,
        source: 'url',
        imageUrl: 'https://example.com/background.jpg',
      },
    };

    it('should return valid for correct background data', () => {
      const result = validateBackgroundData(validBackgroundData);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for null data', () => {
      const result = validateBackgroundData(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid data format');
    });

    it('should return invalid for non-object data', () => {
      expect(validateBackgroundData('string').valid).toBe(false);
      expect(validateBackgroundData(123).valid).toBe(false);
    });

    it('should return invalid for unsupported version', () => {
      const data = { ...validBackgroundData, version: '2.0' };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unsupported version format');
    });

    it('should return invalid for missing settings', () => {
      const data = { version: '1.0' };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing settings object');
    });

    it('should return invalid for non-object settings', () => {
      const data = { version: '1.0', settings: 'not-object' };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing settings object');
    });

    it('should return invalid for missing enabled property', () => {
      const data = { version: '1.0', settings: { source: 'url' } };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing enabled property');
    });

    it('should return invalid for invalid source type', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'invalid' },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid source type');
    });

    it('should accept all valid source types', () => {
      const validSources = ['none', 'url', 'local', 'preset'];
      
      for (const source of validSources) {
        const sourceSettings =
          source === 'url' || source === 'local'
            ? { imageUrl: 'https://example.com/background.jpg' }
            : {};
        const data = {
          version: '1.0',
          settings: { enabled: true, source, ...sourceSettings },
        };
        const result = validateBackgroundData(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should return invalid for invalid mode', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'url', mode: 'invalid' },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid background mode');
    });

    it('should accept all valid modes', () => {
      const validModes = ['single', 'layers', 'slideshow'];
      
      for (const mode of validModes) {
        const data = {
          version: '1.0',
          settings: {
            enabled: true,
            source: 'url',
            mode,
            imageUrl: 'https://example.com/background.jpg',
          },
        };
        const result = validateBackgroundData(data);
        expect(result.valid).toBe(true);
      }
    });

    it('should return invalid for invalid layers format', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', layers: 'not-array' },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid layers format');
    });

    it('should accept valid layers array', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', layers: [] },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for invalid slideshow format', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', slideshow: 'not-object' },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid slideshow format');
    });

    it('should return invalid for invalid slideshow slides', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', slideshow: { slides: 'not-array' } },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid slideshow slides format');
    });

    it('should return invalid for invalid slideshow intervalMs', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', slideshow: { intervalMs: 'not-number' } },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid slideshow interval');
    });

    it('should return invalid for invalid slideshow transitionMs', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', slideshow: { transitionMs: 'not-number' } },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid slideshow transition');
    });

    it('should return invalid for invalid slideshow shuffle', () => {
      const data = {
        version: '1.0',
        settings: { enabled: true, source: 'none', slideshow: { shuffle: 'not-boolean' } },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid slideshow shuffle');
    });

    it('should accept valid slideshow configuration', () => {
      const data = {
        version: '1.0',
        settings: {
          enabled: true,
          source: 'url',
          imageUrl: 'https://example.com/background.jpg',
          slideshow: {
            slides: [],
            intervalMs: 5000,
            transitionMs: 1000,
            shuffle: true,
          },
        },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(true);
    });

    it('should reject unsafe URL protocols', () => {
      const data = {
        version: '1.0',
        settings: {
          enabled: true,
          source: 'url',
          imageUrl: 'http://example.com/image.jpg',
        },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/not allowed/i);
    });

    it('should reject out-of-range global values', () => {
      const data = {
        version: '1.0',
        settings: {
          enabled: true,
          source: 'none',
          opacity: 1000,
        },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Opacity out of range');
    });

    it('should reject out-of-range layer values', () => {
      const data = {
        version: '1.0',
        settings: {
          enabled: true,
          source: 'none',
          layers: [{ source: 'none', blur: 500 }],
        },
      };
      const result = validateBackgroundData(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Layer 1');
    });
  });
});
