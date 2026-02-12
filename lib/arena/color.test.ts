import { getWinRateColor, getWinRateText, getRankBadgeClass, getProviderColor } from './color';

describe('arena color utilities', () => {
  describe('getWinRateColor', () => {
    it('should return green for high win rates (>= 0.7)', () => {
      expect(getWinRateColor(0.8)).toContain('green-600');
    });

    it('should return green-500 for 0.6-0.7', () => {
      expect(getWinRateColor(0.65)).toContain('green-500');
    });

    it('should return green-400 for 0.55-0.6', () => {
      expect(getWinRateColor(0.57)).toContain('green-400');
    });

    it('should return gray for neutral win rates (0.45-0.55)', () => {
      expect(getWinRateColor(0.5)).toContain('gray');
    });

    it('should return red for low win rates (< 0.3)', () => {
      expect(getWinRateColor(0.2)).toContain('red-600');
    });

    it('should return red-400 for 0.4-0.45', () => {
      expect(getWinRateColor(0.42)).toContain('red-400');
    });

    it('should return red-500 for 0.3-0.4', () => {
      expect(getWinRateColor(0.35)).toContain('red-500');
    });
  });

  describe('getWinRateText', () => {
    it('should format 0.5 as 50%', () => {
      expect(getWinRateText(0.5)).toBe('50%');
    });

    it('should format 1.0 as 100%', () => {
      expect(getWinRateText(1.0)).toBe('100%');
    });

    it('should format 0.0 as 0%', () => {
      expect(getWinRateText(0.0)).toBe('0%');
    });

    it('should round to nearest integer', () => {
      expect(getWinRateText(0.666)).toBe('67%');
    });
  });

  describe('getRankBadgeClass', () => {
    it('should return gold for rank 1', () => {
      expect(getRankBadgeClass(1)).toContain('yellow');
    });

    it('should return silver for rank 2', () => {
      expect(getRankBadgeClass(2)).toContain('gray-400');
    });

    it('should return bronze for rank 3', () => {
      expect(getRankBadgeClass(3)).toContain('amber');
    });

    it('should return muted for rank 4+', () => {
      expect(getRankBadgeClass(4)).toContain('muted');
      expect(getRankBadgeClass(10)).toContain('muted');
    });
  });

  describe('getProviderColor', () => {
    it('should return green classes for openai', () => {
      expect(getProviderColor('openai')).toContain('green');
    });

    it('should return orange classes for anthropic', () => {
      expect(getProviderColor('anthropic')).toContain('orange');
    });

    it('should return blue classes for google', () => {
      expect(getProviderColor('google')).toContain('blue');
    });

    it('should return purple classes for deepseek', () => {
      expect(getProviderColor('deepseek')).toContain('purple');
    });

    it('should return default gray for unknown provider', () => {
      expect(getProviderColor('unknown' as never)).toContain('gray');
    });
  });
});
