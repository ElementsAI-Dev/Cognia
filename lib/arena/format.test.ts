import { formatBattleDate, formatBattleDuration } from './format';

describe('arena format utilities', () => {
  describe('formatBattleDate', () => {
    it('should format a date with month, day, hour, minute', () => {
      const date = new Date('2025-06-15T14:30:00');
      const result = formatBattleDate(date, 'en-US');
      expect(result).toContain('Jun');
      expect(result).toContain('15');
    });

    it('should use en-US locale by default', () => {
      const date = new Date('2025-01-01T09:00:00');
      const result = formatBattleDate(date);
      expect(result).toContain('Jan');
    });

    it('should handle different locales', () => {
      const date = new Date('2025-03-20T10:00:00');
      const result = formatBattleDate(date, 'zh-CN');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatBattleDuration', () => {
    it('should return "-" if no end date', () => {
      expect(formatBattleDuration(new Date())).toBe('-');
    });

    it('should format seconds correctly', () => {
      const start = new Date('2025-01-01T00:00:00');
      const end = new Date('2025-01-01T00:00:45');
      expect(formatBattleDuration(start, end)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      const start = new Date('2025-01-01T00:00:00');
      const end = new Date('2025-01-01T00:02:30');
      expect(formatBattleDuration(start, end)).toBe('2m 30s');
    });

    it('should handle zero duration', () => {
      const date = new Date('2025-01-01T00:00:00');
      expect(formatBattleDuration(date, date)).toBe('0s');
    });

    it('should handle exactly 1 minute', () => {
      const start = new Date('2025-01-01T00:00:00');
      const end = new Date('2025-01-01T00:01:00');
      expect(formatBattleDuration(start, end)).toBe('1m 0s');
    });
  });
});
