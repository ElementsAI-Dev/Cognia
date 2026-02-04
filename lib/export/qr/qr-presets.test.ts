/**
 * Tests for QR Code Presets
 */

import {
  QR_PRESETS,
  getPresetById,
  getDefaultPreset,
  getWeChatPreset,
  getCogniaPreset,
} from './qr-presets';

describe('QR Presets', () => {
  describe('QR_PRESETS', () => {
    it('should have at least 5 presets', () => {
      expect(QR_PRESETS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have all required fields in each preset', () => {
      QR_PRESETS.forEach((preset) => {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.nameZh).toBeTruthy();
        expect(preset.dotsType).toBeTruthy();
        expect(preset.cornersSquareType).toBeTruthy();
        expect(preset.cornersDotType).toBeTruthy();
        expect(preset.colors).toBeDefined();
        expect(preset.colors.dots).toBeTruthy();
        expect(preset.colors.cornersSquare).toBeTruthy();
        expect(preset.colors.cornersDot).toBeTruthy();
        expect(preset.colors.background).toBeTruthy();
      });
    });

    it('should have unique IDs', () => {
      const ids = QR_PRESETS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include default preset', () => {
      const defaultPreset = QR_PRESETS.find((p) => p.id === 'default');
      expect(defaultPreset).toBeDefined();
    });

    it('should include wechat preset', () => {
      const wechatPreset = QR_PRESETS.find((p) => p.id === 'wechat');
      expect(wechatPreset).toBeDefined();
      expect(wechatPreset?.colors.dots).toBe('#07c160');
    });

    it('should include cognia preset', () => {
      const cogniaPreset = QR_PRESETS.find((p) => p.id === 'cognia');
      expect(cogniaPreset).toBeDefined();
    });

    it('should have valid dot types', () => {
      const validDotTypes = ['square', 'rounded', 'dots', 'classy', 'classy-rounded', 'extra-rounded'];
      QR_PRESETS.forEach((preset) => {
        expect(validDotTypes).toContain(preset.dotsType);
      });
    });

    it('should have valid corner square types', () => {
      const validTypes = ['square', 'extra-rounded', 'dot'];
      QR_PRESETS.forEach((preset) => {
        expect(validTypes).toContain(preset.cornersSquareType);
      });
    });

    it('should have valid corner dot types', () => {
      const validTypes = ['square', 'dot'];
      QR_PRESETS.forEach((preset) => {
        expect(validTypes).toContain(preset.cornersDotType);
      });
    });
  });

  describe('getPresetById', () => {
    it('should return preset by id', () => {
      const preset = getPresetById('default');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('default');
    });

    it('should return undefined for non-existent id', () => {
      const preset = getPresetById('non-existent');
      expect(preset).toBeUndefined();
    });

    it('should return wechat preset', () => {
      const preset = getPresetById('wechat');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('wechat');
    });

    it('should return cognia preset', () => {
      const preset = getPresetById('cognia');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('cognia');
    });
  });

  describe('getDefaultPreset', () => {
    it('should return default preset', () => {
      const preset = getDefaultPreset();
      expect(preset).toBeDefined();
      expect(preset.id).toBe('default');
    });

    it('should return preset with square dots', () => {
      const preset = getDefaultPreset();
      expect(preset.dotsType).toBe('square');
    });

    it('should return preset with black colors', () => {
      const preset = getDefaultPreset();
      expect(preset.colors.dots).toBe('#000000');
    });
  });

  describe('getWeChatPreset', () => {
    it('should return wechat preset', () => {
      const preset = getWeChatPreset();
      expect(preset).toBeDefined();
      expect(preset.id).toBe('wechat');
    });

    it('should return preset with wechat green color', () => {
      const preset = getWeChatPreset();
      expect(preset.colors.dots).toBe('#07c160');
    });

    it('should return preset with rounded dots', () => {
      const preset = getWeChatPreset();
      expect(preset.dotsType).toBe('rounded');
    });
  });

  describe('getCogniaPreset', () => {
    it('should return cognia preset', () => {
      const preset = getCogniaPreset();
      expect(preset).toBeDefined();
      expect(preset.id).toBe('cognia');
    });

    it('should return preset with cognia brand color', () => {
      const preset = getCogniaPreset();
      expect(preset.colors.dots).toBe('#6366f1');
    });

    it('should return preset with classy-rounded dots', () => {
      const preset = getCogniaPreset();
      expect(preset.dotsType).toBe('classy-rounded');
    });
  });

  describe('Gradient presets', () => {
    it('should have gradient presets with valid gradient config', () => {
      const gradientPresets = QR_PRESETS.filter((p) => p.gradient);
      expect(gradientPresets.length).toBeGreaterThan(0);

      gradientPresets.forEach((preset) => {
        expect(preset.gradient).toBeDefined();
        expect(preset.gradient?.type).toMatch(/^(linear|radial)$/);
        expect(preset.gradient?.colorStops).toBeDefined();
        expect(preset.gradient?.colorStops.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have gradient-blue preset', () => {
      const preset = getPresetById('gradient-blue');
      expect(preset).toBeDefined();
      expect(preset?.gradient).toBeDefined();
      expect(preset?.gradient?.type).toBe('linear');
    });

    it('should have gradient-sunset preset', () => {
      const preset = getPresetById('gradient-sunset');
      expect(preset).toBeDefined();
      expect(preset?.gradient).toBeDefined();
      expect(preset?.gradient?.type).toBe('linear');
    });
  });
});
