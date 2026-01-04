/**
 * Tests for Color Utilities
 */

import {
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  getRelativeLuminance,
  getContrastRatio,
  checkContrast,
  suggestForegroundColor,
  adjustBrightness,
  getComplementaryColor,
  getAnalogousColors,
  getTriadicColors,
  getSplitComplementaryColors,
  generatePaletteFromColor,
  getPaletteSuggestions,
  isValidHex,
  normalizeHex,
  PALETTE_SUGGESTIONS,
} from './color-utils';

describe('hexToRgb', () => {
  it('should convert hex to RGB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('should handle hex without #', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('should return null for invalid hex', () => {
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#gg0000')).toBeNull();
  });
});

describe('rgbToHex', () => {
  it('should convert RGB to hex', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
    expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
  });

  it('should clamp values', () => {
    expect(rgbToHex(300, -10, 128)).toBe('#ff0080');
  });

  it('should pad single digit values', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(15, 15, 15)).toBe('#0f0f0f');
  });
});

describe('hexToHsl', () => {
  it('should convert hex to HSL', () => {
    const red = hexToHsl('#ff0000');
    expect(red?.h).toBe(0);
    expect(red?.s).toBe(100);
    expect(red?.l).toBe(50);

    const white = hexToHsl('#ffffff');
    expect(white?.l).toBe(100);

    const black = hexToHsl('#000000');
    expect(black?.l).toBe(0);
  });

  it('should return null for invalid hex', () => {
    expect(hexToHsl('invalid')).toBeNull();
  });
});

describe('hslToHex', () => {
  it('should convert HSL to hex', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
  });

  it('should handle edge cases', () => {
    expect(hslToHex(0, 0, 100)).toBe('#ffffff');
    expect(hslToHex(0, 0, 0)).toBe('#000000');
  });

  it('should handle all hue ranges', () => {
    expect(hslToHex(30, 100, 50)).toBeDefined();
    expect(hslToHex(90, 100, 50)).toBeDefined();
    expect(hslToHex(150, 100, 50)).toBeDefined();
    expect(hslToHex(210, 100, 50)).toBeDefined();
    expect(hslToHex(270, 100, 50)).toBeDefined();
    expect(hslToHex(330, 100, 50)).toBeDefined();
  });
});

describe('getRelativeLuminance', () => {
  it('should calculate luminance', () => {
    expect(getRelativeLuminance('#ffffff')).toBeCloseTo(1, 1);
    expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 1);
  });

  it('should return 0 for invalid hex', () => {
    expect(getRelativeLuminance('invalid')).toBe(0);
  });
});

describe('getContrastRatio', () => {
  it('should calculate contrast ratio', () => {
    const ratio = getContrastRatio('#ffffff', '#000000');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('should return 1 for same colors', () => {
    expect(getContrastRatio('#ff0000', '#ff0000')).toBeCloseTo(1, 1);
  });
});

describe('checkContrast', () => {
  it('should return AAA for high contrast', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.level).toBe('AAA');
    expect(result.passes.normalText).toBe(true);
  });

  it('should return fail for low contrast', () => {
    const result = checkContrast('#cccccc', '#dddddd');
    expect(result.level).toBe('fail');
    expect(result.passes.normalText).toBe(false);
  });

  it('should check AA level', () => {
    const result = checkContrast('#000000', '#767676');
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(result.passes.normalText).toBe(true);
  });
});

describe('suggestForegroundColor', () => {
  it('should suggest light color for dark background', () => {
    const color = suggestForegroundColor('#000000');
    expect(color).toBe('#f8fafc');
  });

  it('should suggest dark color for light background', () => {
    const color = suggestForegroundColor('#ffffff');
    expect(color).toBe('#0f172a');
  });

  it('should respect preferDark option', () => {
    const light = suggestForegroundColor('#000000', false);
    expect(light).toBe('#ffffff');
  });
});

describe('adjustBrightness', () => {
  it('should increase brightness', () => {
    const brighter = adjustBrightness('#808080', 20);
    const original = hexToHsl('#808080');
    const result = hexToHsl(brighter);
    expect(result!.l).toBeGreaterThan(original!.l);
  });

  it('should decrease brightness', () => {
    const darker = adjustBrightness('#808080', -20);
    const original = hexToHsl('#808080');
    const result = hexToHsl(darker);
    expect(result!.l).toBeLessThan(original!.l);
  });

  it('should clamp at boundaries', () => {
    const maxBright = adjustBrightness('#ffffff', 50);
    expect(hexToHsl(maxBright)!.l).toBeLessThanOrEqual(100);
  });

  it('should return original for invalid hex', () => {
    expect(adjustBrightness('invalid', 20)).toBe('invalid');
  });
});

describe('getComplementaryColor', () => {
  it('should return opposite hue', () => {
    const red = '#ff0000';
    const complement = getComplementaryColor(red);
    const redHsl = hexToHsl(red);
    const compHsl = hexToHsl(complement);
    expect(Math.abs(compHsl!.h - redHsl!.h)).toBeCloseTo(180, -1);
  });

  it('should return original for invalid hex', () => {
    expect(getComplementaryColor('invalid')).toBe('invalid');
  });
});

describe('getAnalogousColors', () => {
  it('should return analogous colors', () => {
    const colors = getAnalogousColors('#ff0000', 3);
    expect(colors).toHaveLength(3);
  });

  it('should return original for invalid hex', () => {
    const colors = getAnalogousColors('invalid', 3);
    expect(colors).toEqual(['invalid']);
  });
});

describe('getTriadicColors', () => {
  it('should return 3 colors', () => {
    const colors = getTriadicColors('#ff0000');
    expect(colors).toHaveLength(3);
  });

  it('should return same colors for invalid hex', () => {
    const colors = getTriadicColors('invalid');
    expect(colors).toEqual(['invalid', 'invalid', 'invalid']);
  });
});

describe('getSplitComplementaryColors', () => {
  it('should return 3 colors', () => {
    const colors = getSplitComplementaryColors('#ff0000');
    expect(colors).toHaveLength(3);
    expect(colors[0]).toBe('#ff0000');
  });

  it('should return same colors for invalid hex', () => {
    const colors = getSplitComplementaryColors('invalid');
    expect(colors).toEqual(['invalid', 'invalid', 'invalid']);
  });
});

describe('generatePaletteFromColor', () => {
  it('should generate light palette', () => {
    const palette = generatePaletteFromColor('#0ea5e9', false);
    expect(palette.isDark).toBe(false);
    expect(palette.colors.primary).toBe('#0ea5e9');
    expect(palette.colors.background).toBe('#ffffff');
  });

  it('should generate dark palette', () => {
    const palette = generatePaletteFromColor('#0ea5e9', true);
    expect(palette.isDark).toBe(true);
    expect(palette.colors.background).toBe('#0f172a');
  });

  it('should handle invalid hex', () => {
    const palette = generatePaletteFromColor('invalid', false);
    expect(palette.colors.primary).toBe('invalid');
    expect(palette.name).toBe('Custom');
  });
});

describe('getPaletteSuggestions', () => {
  it('should filter by dark mode', () => {
    const darkPalettes = getPaletteSuggestions(true);
    expect(darkPalettes.every(p => p.isDark)).toBe(true);
  });

  it('should filter by light mode', () => {
    const lightPalettes = getPaletteSuggestions(false);
    expect(lightPalettes.every(p => !p.isDark)).toBe(true);
  });
});

describe('PALETTE_SUGGESTIONS', () => {
  it('should have predefined palettes', () => {
    expect(PALETTE_SUGGESTIONS.length).toBeGreaterThan(0);
  });

  it('should have both light and dark palettes', () => {
    const dark = PALETTE_SUGGESTIONS.filter(p => p.isDark);
    const light = PALETTE_SUGGESTIONS.filter(p => !p.isDark);
    expect(dark.length).toBeGreaterThan(0);
    expect(light.length).toBeGreaterThan(0);
  });
});

describe('isValidHex', () => {
  it('should validate 6-digit hex', () => {
    expect(isValidHex('#ff0000')).toBe(true);
    expect(isValidHex('ff0000')).toBe(true);
  });

  it('should validate 3-digit hex', () => {
    expect(isValidHex('#f00')).toBe(true);
    expect(isValidHex('f00')).toBe(true);
  });

  it('should reject invalid hex', () => {
    expect(isValidHex('#gg0000')).toBe(false);
    expect(isValidHex('invalid')).toBe(false);
    expect(isValidHex('#ff00')).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('should add # prefix if missing', () => {
    expect(normalizeHex('ff0000')).toBe('#ff0000');
  });

  it('should keep # if present', () => {
    expect(normalizeHex('#ff0000')).toBe('#ff0000');
  });
});
