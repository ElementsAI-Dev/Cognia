/**
 * @jest-environment jsdom
 */

import {
  hexToRgba,
  rgbToRgba,
  hslToRgba,
  rgbaToHex,
  rgbaToRgbString,
  rgbaToHslString,
  findColorsInLine,
  parseColor,
} from './color-provider';

describe('color-provider', () => {
  describe('hexToRgba', () => {
    it('should parse 3-digit hex', () => {
      const result = hexToRgba('#f00');
      expect(result).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
    });

    it('should parse 6-digit hex', () => {
      const result = hexToRgba('#ff0000');
      expect(result).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
    });

    it('should parse 8-digit hex with alpha', () => {
      const result = hexToRgba('#ff000080');
      expect(result).not.toBeNull();
      expect(result!.red).toBeCloseTo(1);
      expect(result!.green).toBeCloseTo(0);
      expect(result!.blue).toBeCloseTo(0);
      expect(result!.alpha).toBeCloseTo(0.502, 1);
    });

    it('should parse 4-digit hex with alpha', () => {
      const result = hexToRgba('#f008');
      expect(result).not.toBeNull();
      expect(result!.red).toBeCloseTo(1);
      expect(result!.alpha).toBeCloseTo(0.533, 1);
    });

    it('should handle white', () => {
      const result = hexToRgba('#ffffff');
      expect(result).toEqual({ red: 1, green: 1, blue: 1, alpha: 1 });
    });

    it('should handle black', () => {
      const result = hexToRgba('#000000');
      expect(result).toEqual({ red: 0, green: 0, blue: 0, alpha: 1 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgba('#gg0000')).toBeNull();
      expect(hexToRgba('#12')).toBeNull();
    });
  });

  describe('rgbToRgba', () => {
    it('should parse rgb()', () => {
      const result = rgbToRgba('rgb(255, 0, 0)');
      expect(result).toEqual({ red: 1, green: 0, blue: 0, alpha: 1 });
    });

    it('should parse rgba()', () => {
      const result = rgbToRgba('rgba(255, 128, 0, 0.5)');
      expect(result).not.toBeNull();
      expect(result!.red).toBeCloseTo(1);
      expect(result!.green).toBeCloseTo(0.502, 1);
      expect(result!.blue).toBeCloseTo(0);
      expect(result!.alpha).toBe(0.5);
    });

    it('should return null for invalid format', () => {
      expect(rgbToRgba('not a color')).toBeNull();
    });
  });

  describe('hslToRgba', () => {
    it('should parse hsl() for red', () => {
      const result = hslToRgba('hsl(0, 100%, 50%)');
      expect(result).not.toBeNull();
      expect(result!.red).toBeCloseTo(1, 1);
      expect(result!.green).toBeCloseTo(0, 1);
      expect(result!.blue).toBeCloseTo(0, 1);
      expect(result!.alpha).toBe(1);
    });

    it('should parse hsl() for green', () => {
      const result = hslToRgba('hsl(120, 100%, 50%)');
      expect(result).not.toBeNull();
      expect(result!.green).toBeCloseTo(1, 1);
    });

    it('should parse hsla() with alpha', () => {
      const result = hslToRgba('hsla(240, 100%, 50%, 0.5)');
      expect(result).not.toBeNull();
      expect(result!.blue).toBeCloseTo(1, 1);
      expect(result!.alpha).toBe(0.5);
    });

    it('should handle achromatic (gray)', () => {
      const result = hslToRgba('hsl(0, 0%, 50%)');
      expect(result).not.toBeNull();
      expect(result!.red).toBeCloseTo(0.5, 1);
      expect(result!.green).toBeCloseTo(0.5, 1);
      expect(result!.blue).toBeCloseTo(0.5, 1);
    });

    it('should return null for invalid format', () => {
      expect(hslToRgba('not a color')).toBeNull();
    });
  });

  describe('rgbaToHex', () => {
    it('should convert to 6-digit hex', () => {
      expect(rgbaToHex({ red: 1, green: 0, blue: 0, alpha: 1 })).toBe('#ff0000');
    });

    it('should convert to 8-digit hex with alpha', () => {
      const result = rgbaToHex({ red: 1, green: 0, blue: 0, alpha: 0.5 });
      expect(result).toBe('#ff000080');
    });

    it('should handle white', () => {
      expect(rgbaToHex({ red: 1, green: 1, blue: 1, alpha: 1 })).toBe('#ffffff');
    });

    it('should handle black', () => {
      expect(rgbaToHex({ red: 0, green: 0, blue: 0, alpha: 1 })).toBe('#000000');
    });
  });

  describe('rgbaToRgbString', () => {
    it('should convert to rgb()', () => {
      expect(rgbaToRgbString({ red: 1, green: 0, blue: 0, alpha: 1 })).toBe('rgb(255, 0, 0)');
    });

    it('should convert to rgba() with alpha', () => {
      expect(rgbaToRgbString({ red: 1, green: 0, blue: 0, alpha: 0.5 })).toBe('rgba(255, 0, 0, 0.5)');
    });
  });

  describe('rgbaToHslString', () => {
    it('should convert red to hsl', () => {
      const result = rgbaToHslString({ red: 1, green: 0, blue: 0, alpha: 1 });
      expect(result).toBe('hsl(0, 100%, 50%)');
    });

    it('should convert to hsla with alpha', () => {
      const result = rgbaToHslString({ red: 1, green: 0, blue: 0, alpha: 0.5 });
      expect(result).toBe('hsla(0, 100%, 50%, 0.5)');
    });

    it('should convert white to hsl', () => {
      const result = rgbaToHslString({ red: 1, green: 1, blue: 1, alpha: 1 });
      expect(result).toBe('hsl(0, 0%, 100%)');
    });
  });

  describe('findColorsInLine', () => {
    it('should find hex colors', () => {
      const result = findColorsInLine('color: #ff0000;');
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('#ff0000');
    });

    it('should find rgb colors', () => {
      const result = findColorsInLine('background: rgb(255, 0, 0);');
      expect(result).toHaveLength(1);
      expect(result[0].color).toBe('rgb(255, 0, 0)');
    });

    it('should find multiple colors', () => {
      const result = findColorsInLine('border: 1px solid #333; color: rgb(255, 0, 0);');
      expect(result).toHaveLength(2);
    });

    it('should return empty for no colors', () => {
      const result = findColorsInLine('const x = 5;');
      expect(result).toHaveLength(0);
    });

    it('should track column positions', () => {
      const result = findColorsInLine('color: #ff0000;');
      expect(result[0].startColumn).toBe(8);
      expect(result[0].endColumn).toBe(15);
    });
  });

  describe('parseColor', () => {
    it('should parse hex', () => {
      const result = parseColor('#ff0000');
      expect(result).not.toBeNull();
      expect(result!.red).toBe(1);
    });

    it('should parse rgb', () => {
      const result = parseColor('rgb(0, 255, 0)');
      expect(result).not.toBeNull();
      expect(result!.green).toBe(1);
    });

    it('should parse hsl', () => {
      const result = parseColor('hsl(240, 100%, 50%)');
      expect(result).not.toBeNull();
      expect(result!.blue).toBeCloseTo(1, 1);
    });

    it('should return null for invalid', () => {
      expect(parseColor('hello')).toBeNull();
    });
  });
});
