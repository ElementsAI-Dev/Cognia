/**
 * Unit tests for Academic Component Constants
 */

import { STATUS_ICONS, STATUS_COLORS, STATUS_OPTIONS } from './constants';

describe('Academic Constants', () => {
  describe('STATUS_ICONS', () => {
    it('should have icons for all reading statuses', () => {
      expect(STATUS_ICONS.unread).toBeDefined();
      expect(STATUS_ICONS.reading).toBeDefined();
      expect(STATUS_ICONS.completed).toBeDefined();
      expect(STATUS_ICONS.archived).toBeDefined();
    });

    it('should have exactly 4 status icons', () => {
      expect(Object.keys(STATUS_ICONS).length).toBe(4);
    });
  });

  describe('STATUS_COLORS', () => {
    it('should have colors for all reading statuses', () => {
      expect(STATUS_COLORS.unread).toBeDefined();
      expect(STATUS_COLORS.reading).toBeDefined();
      expect(STATUS_COLORS.completed).toBeDefined();
      expect(STATUS_COLORS.archived).toBeDefined();
    });

    it('should have Tailwind class strings', () => {
      expect(STATUS_COLORS.unread).toContain('text-');
      expect(STATUS_COLORS.reading).toContain('text-');
      expect(STATUS_COLORS.completed).toContain('text-');
      expect(STATUS_COLORS.archived).toContain('text-');
    });

    it('should have exactly 4 status colors', () => {
      expect(Object.keys(STATUS_COLORS).length).toBe(4);
    });
  });

  describe('STATUS_OPTIONS', () => {
    it('should have all reading status options', () => {
      const values = STATUS_OPTIONS.map((o) => o.value);
      expect(values).toContain('unread');
      expect(values).toContain('reading');
      expect(values).toContain('completed');
      expect(values).toContain('archived');
    });

    it('should have labels for all options', () => {
      STATUS_OPTIONS.forEach((option) => {
        expect(option.label).toBeDefined();
        expect(option.label.length).toBeGreaterThan(0);
      });
    });

    it('should have exactly 4 options', () => {
      expect(STATUS_OPTIONS.length).toBe(4);
    });
  });
});
