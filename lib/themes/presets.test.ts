/**
 * Tests for Theme Presets
 */

import {
  THEME_PRESETS,
  getThemeCSSVariables,
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_SETTINGS,
  type ColorThemePreset,
  type ThemeColors,
  type BackgroundSettings,
} from './presets';

describe('THEME_PRESETS', () => {
  const presetIds: ColorThemePreset[] = ['default', 'ocean', 'forest', 'sunset', 'lavender', 'rose', 'slate', 'amber'];

  it('contains all expected presets', () => {
    presetIds.forEach((id) => {
      expect(THEME_PRESETS[id]).toBeDefined();
    });
  });

  describe('preset structure', () => {
    presetIds.forEach((presetId) => {
      describe(`${presetId} preset`, () => {
        it('has correct id', () => {
          expect(THEME_PRESETS[presetId].id).toBe(presetId);
        });

        it('has name', () => {
          expect(THEME_PRESETS[presetId].name).toBeDefined();
          expect(THEME_PRESETS[presetId].name.length).toBeGreaterThan(0);
        });

        it('has description', () => {
          expect(THEME_PRESETS[presetId].description).toBeDefined();
          expect(THEME_PRESETS[presetId].description.length).toBeGreaterThan(0);
        });

        it('has light theme', () => {
          expect(THEME_PRESETS[presetId].light).toBeDefined();
        });

        it('has dark theme', () => {
          expect(THEME_PRESETS[presetId].dark).toBeDefined();
        });
      });
    });
  });

  describe('theme colors', () => {
    const requiredColors: (keyof ThemeColors)[] = [
      'primary',
      'primaryForeground',
      'secondary',
      'secondaryForeground',
      'accent',
      'accentForeground',
      'background',
      'foreground',
      'muted',
      'mutedForeground',
      'card',
      'cardForeground',
      'border',
      'ring',
      'destructive',
      'destructiveForeground',
    ];

    presetIds.forEach((presetId) => {
      describe(`${presetId} colors`, () => {
        it('light theme has all required colors', () => {
          requiredColors.forEach((color) => {
            expect(THEME_PRESETS[presetId].light[color]).toBeDefined();
            expect(typeof THEME_PRESETS[presetId].light[color]).toBe('string');
          });
        });

        it('dark theme has all required colors', () => {
          requiredColors.forEach((color) => {
            expect(THEME_PRESETS[presetId].dark[color]).toBeDefined();
            expect(typeof THEME_PRESETS[presetId].dark[color]).toBe('string');
          });
        });

        it('light colors use oklch format', () => {
          Object.values(THEME_PRESETS[presetId].light).forEach((value) => {
            expect(value).toMatch(/oklch\(/);
          });
        });

        it('dark colors use oklch format', () => {
          Object.values(THEME_PRESETS[presetId].dark).forEach((value) => {
            expect(value).toMatch(/oklch\(/);
          });
        });
      });
    });
  });

  describe('specific presets', () => {
    it('default preset has blue theme', () => {
      expect(THEME_PRESETS.default.name).toBe('Default');
      expect(THEME_PRESETS.default.description.toLowerCase()).toContain('blue');
    });

    it('ocean preset has teal/cyan theme', () => {
      expect(THEME_PRESETS.ocean.name).toBe('Ocean');
      expect(THEME_PRESETS.ocean.description.toLowerCase()).toContain('teal');
    });

    it('forest preset has green theme', () => {
      expect(THEME_PRESETS.forest.name).toBe('Forest');
      expect(THEME_PRESETS.forest.description.toLowerCase()).toContain('green');
    });

    it('sunset preset has warm theme', () => {
      expect(THEME_PRESETS.sunset.name).toBe('Sunset');
      expect(THEME_PRESETS.sunset.description.toLowerCase()).toContain('warm');
    });

    it('lavender preset has purple theme', () => {
      expect(THEME_PRESETS.lavender.name).toBe('Lavender');
      expect(THEME_PRESETS.lavender.description.toLowerCase()).toContain('purple');
    });

    it('rose preset has pink theme', () => {
      expect(THEME_PRESETS.rose.name).toBe('Rose');
      expect(THEME_PRESETS.rose.description.toLowerCase()).toContain('pink');
    });
  });
});

describe('getThemeCSSVariables', () => {
  const mockColors: ThemeColors = {
    primary: 'oklch(0.55 0.2 250)',
    primaryForeground: 'oklch(0.985 0.002 247)',
    secondary: 'oklch(0.97 0.001 286)',
    secondaryForeground: 'oklch(0.25 0.01 286)',
    accent: 'oklch(0.97 0.001 286)',
    accentForeground: 'oklch(0.25 0.01 286)',
    background: 'oklch(1 0 0)',
    foreground: 'oklch(0.145 0.017 286)',
    muted: 'oklch(0.97 0.001 286)',
    mutedForeground: 'oklch(0.55 0.01 286)',
    card: 'oklch(1 0 0)',
    cardForeground: 'oklch(0.145 0.017 286)',
    border: 'oklch(0.92 0.004 286)',
    ring: 'oklch(0.55 0.2 250)',
    destructive: 'oklch(0.55 0.2 27)',
    destructiveForeground: 'oklch(0.985 0.002 27)',
  };

  it('returns string containing CSS variables', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes --primary variable', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('--primary:');
    expect(result).toContain(mockColors.primary);
  });

  it('includes --primary-foreground variable', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('--primary-foreground:');
  });

  it('includes --background variable', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('--background:');
  });

  it('includes --foreground variable', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('--foreground:');
  });

  it('includes --destructive variable', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('--destructive:');
  });

  it('includes all color variables', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('--secondary:');
    expect(result).toContain('--accent:');
    expect(result).toContain('--muted:');
    expect(result).toContain('--card:');
    expect(result).toContain('--border:');
    expect(result).toContain('--ring:');
  });

  it('preserves oklch color values', () => {
    const result = getThemeCSSVariables(mockColors);
    
    expect(result).toContain('oklch(');
  });

  it('works with actual theme preset colors', () => {
    const result = getThemeCSSVariables(THEME_PRESETS.default.light);
    
    expect(result).toContain('--primary:');
    expect(result).toContain('oklch(');
  });
});

describe('New Theme Presets', () => {
  it('slate preset has professional gray theme', () => {
    expect(THEME_PRESETS.slate.name).toBe('Slate');
    expect(THEME_PRESETS.slate.description.toLowerCase()).toContain('gray');
  });

  it('amber preset has warm golden theme', () => {
    expect(THEME_PRESETS.amber.name).toBe('Amber');
    expect(THEME_PRESETS.amber.description.toLowerCase()).toContain('golden');
  });
});

describe('BACKGROUND_PRESETS', () => {
  it('contains gradient presets', () => {
    const gradients = BACKGROUND_PRESETS.filter((p) => p.category === 'gradient');
    expect(gradients.length).toBeGreaterThan(0);
  });

  it('contains mesh presets', () => {
    const mesh = BACKGROUND_PRESETS.filter((p) => p.category === 'mesh');
    expect(mesh.length).toBeGreaterThan(0);
  });

  it('contains abstract presets', () => {
    const abstract = BACKGROUND_PRESETS.filter((p) => p.category === 'abstract');
    expect(abstract.length).toBeGreaterThan(0);
  });

  it('all presets have required properties', () => {
    BACKGROUND_PRESETS.forEach((preset) => {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.url).toBeDefined();
      expect(preset.category).toBeDefined();
    });
  });

  it('all presets have unique ids', () => {
    const ids = BACKGROUND_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('gradient presets use linear-gradient', () => {
    const gradients = BACKGROUND_PRESETS.filter((p) => p.category === 'gradient');
    gradients.forEach((preset) => {
      expect(preset.url).toContain('linear-gradient');
    });
  });

  it('mesh presets use radial-gradient', () => {
    const mesh = BACKGROUND_PRESETS.filter((p) => p.category === 'mesh');
    mesh.forEach((preset) => {
      expect(preset.url).toContain('radial-gradient');
    });
  });
});

describe('DEFAULT_BACKGROUND_SETTINGS', () => {
  it('has correct default values', () => {
    expect(DEFAULT_BACKGROUND_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_BACKGROUND_SETTINGS.source).toBe('none');
    expect(DEFAULT_BACKGROUND_SETTINGS.fit).toBe('cover');
    expect(DEFAULT_BACKGROUND_SETTINGS.position).toBe('center');
  });

  it('has new animation settings', () => {
    expect(DEFAULT_BACKGROUND_SETTINGS.attachment).toBe('fixed');
    expect(DEFAULT_BACKGROUND_SETTINGS.animation).toBe('none');
    expect(DEFAULT_BACKGROUND_SETTINGS.animationSpeed).toBe(5);
  });

  it('has new filter settings', () => {
    expect(DEFAULT_BACKGROUND_SETTINGS.contrast).toBe(100);
    expect(DEFAULT_BACKGROUND_SETTINGS.grayscale).toBe(0);
  });

  it('has all required properties', () => {
    const settings: BackgroundSettings = DEFAULT_BACKGROUND_SETTINGS;
    
    expect(settings.enabled).toBeDefined();
    expect(settings.source).toBeDefined();
    expect(settings.imageUrl).toBeDefined();
    expect(settings.fit).toBeDefined();
    expect(settings.position).toBeDefined();
    expect(settings.opacity).toBeDefined();
    expect(settings.blur).toBeDefined();
    expect(settings.overlayColor).toBeDefined();
    expect(settings.overlayOpacity).toBeDefined();
    expect(settings.brightness).toBeDefined();
    expect(settings.saturation).toBeDefined();
    expect(settings.attachment).toBeDefined();
    expect(settings.animation).toBeDefined();
    expect(settings.animationSpeed).toBeDefined();
    expect(settings.contrast).toBeDefined();
    expect(settings.grayscale).toBeDefined();
  });
});
