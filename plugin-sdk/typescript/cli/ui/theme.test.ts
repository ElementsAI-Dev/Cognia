/**
 * Theme Unit Tests
 */

import { colors, symbols, spinnerFrames, borders } from './theme';

describe('CLI Theme', () => {
  describe('colors', () => {
    it('should export all required color values', () => {
      expect(colors.primary).toBeDefined();
      expect(colors.secondary).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
      expect(colors.dim).toBeDefined();
      expect(colors.muted).toBeDefined();
    });

    it('should have valid hex color strings', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(colors.primary).toMatch(hexColorRegex);
      expect(colors.success).toMatch(hexColorRegex);
      expect(colors.error).toMatch(hexColorRegex);
    });
  });

  describe('symbols', () => {
    it('should export all required symbols', () => {
      expect(symbols.check).toBeDefined();
      expect(symbols.cross).toBeDefined();
      expect(symbols.warning).toBeDefined();
      expect(symbols.info).toBeDefined();
      expect(symbols.pointer).toBeDefined();
      expect(symbols.bullet).toBeDefined();
    });

    it('should export status symbols', () => {
      expect(symbols.success).toBeDefined();
      expect(symbols.error).toBeDefined();
    });

    it('should export file/folder symbols', () => {
      expect(symbols.folder).toBeDefined();
      expect(symbols.file).toBeDefined();
    });

    it('should export radio and checkbox symbols', () => {
      expect(symbols.radio.on).toBeDefined();
      expect(symbols.radio.off).toBeDefined();
      expect(symbols.checkbox.on).toBeDefined();
      expect(symbols.checkbox.off).toBeDefined();
    });
  });

  describe('spinnerFrames', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(spinnerFrames)).toBe(true);
      expect(spinnerFrames.length).toBeGreaterThan(0);
      spinnerFrames.forEach((frame) => {
        expect(typeof frame).toBe('string');
      });
    });
  });

  describe('borders', () => {
    it('should export single border style', () => {
      expect(borders.single.topLeft).toBeDefined();
      expect(borders.single.topRight).toBeDefined();
      expect(borders.single.bottomLeft).toBeDefined();
      expect(borders.single.bottomRight).toBeDefined();
      expect(borders.single.horizontal).toBeDefined();
      expect(borders.single.vertical).toBeDefined();
    });

    it('should export double border style', () => {
      expect(borders.double.topLeft).toBeDefined();
      expect(borders.double.horizontal).toBeDefined();
    });

    it('should export round border style', () => {
      expect(borders.round.topLeft).toBeDefined();
      expect(borders.round.horizontal).toBeDefined();
    });

    it('should have single-character borders', () => {
      expect(borders.single.horizontal.length).toBe(1);
      expect(borders.single.vertical.length).toBe(1);
    });
  });
});
