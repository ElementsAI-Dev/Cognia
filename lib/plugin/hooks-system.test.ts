/**
 * Plugin Hooks System Tests
 */

import {
  HookPriority,
  normalizePriority,
  priorityToNumber,
  priorityToString,
} from './hooks-system';

describe('Plugin Hooks System', () => {
  describe('HookPriority enum', () => {
    it('should have correct values', () => {
      expect(HookPriority.CRITICAL).toBe(100);
      expect(HookPriority.HIGH).toBe(75);
      expect(HookPriority.NORMAL).toBe(50);
      expect(HookPriority.LOW).toBe(25);
      expect(HookPriority.DEFERRED).toBe(0);
    });
  });

  describe('normalizePriority', () => {
    describe('numeric priorities', () => {
      it('should return CRITICAL for values >= 100', () => {
        expect(normalizePriority(100)).toBe(HookPriority.CRITICAL);
        expect(normalizePriority(150)).toBe(HookPriority.CRITICAL);
      });

      it('should return HIGH for values >= 75 and < 100', () => {
        expect(normalizePriority(75)).toBe(HookPriority.HIGH);
        expect(normalizePriority(99)).toBe(HookPriority.HIGH);
      });

      it('should return NORMAL for values >= 50 and < 75', () => {
        expect(normalizePriority(50)).toBe(HookPriority.NORMAL);
        expect(normalizePriority(74)).toBe(HookPriority.NORMAL);
      });

      it('should return LOW for values >= 25 and < 50', () => {
        expect(normalizePriority(25)).toBe(HookPriority.LOW);
        expect(normalizePriority(49)).toBe(HookPriority.LOW);
      });

      it('should return DEFERRED for values < 25', () => {
        expect(normalizePriority(0)).toBe(HookPriority.DEFERRED);
        expect(normalizePriority(24)).toBe(HookPriority.DEFERRED);
      });
    });

    describe('string priorities', () => {
      it('should return CRITICAL for "highest" or "critical"', () => {
        expect(normalizePriority('highest')).toBe(HookPriority.CRITICAL);
        expect(normalizePriority('critical')).toBe(HookPriority.CRITICAL);
        expect(normalizePriority('CRITICAL')).toBe(HookPriority.CRITICAL);
      });

      it('should return HIGH for "high"', () => {
        expect(normalizePriority('high')).toBe(HookPriority.HIGH);
        expect(normalizePriority('HIGH')).toBe(HookPriority.HIGH);
      });

      it('should return NORMAL for "normal"', () => {
        expect(normalizePriority('normal')).toBe(HookPriority.NORMAL);
        expect(normalizePriority('NORMAL')).toBe(HookPriority.NORMAL);
      });

      it('should return LOW for "low"', () => {
        expect(normalizePriority('low')).toBe(HookPriority.LOW);
        expect(normalizePriority('LOW')).toBe(HookPriority.LOW);
      });

      it('should return DEFERRED for "lowest" or "deferred"', () => {
        expect(normalizePriority('lowest')).toBe(HookPriority.DEFERRED);
        expect(normalizePriority('deferred')).toBe(HookPriority.DEFERRED);
      });

      it('should return NORMAL for unknown strings', () => {
        expect(normalizePriority('unknown')).toBe(HookPriority.NORMAL);
        expect(normalizePriority('random')).toBe(HookPriority.NORMAL);
      });
    });
  });

  describe('priorityToNumber', () => {
    it('should return the numeric value of priority', () => {
      expect(priorityToNumber(HookPriority.CRITICAL)).toBe(100);
      expect(priorityToNumber(HookPriority.HIGH)).toBe(75);
      expect(priorityToNumber(HookPriority.NORMAL)).toBe(50);
      expect(priorityToNumber(HookPriority.LOW)).toBe(25);
      expect(priorityToNumber(HookPriority.DEFERRED)).toBe(0);
    });
  });

  describe('priorityToString', () => {
    it('should return "high" for CRITICAL', () => {
      expect(priorityToString(HookPriority.CRITICAL)).toBe('high');
    });

    it('should return "high" for HIGH', () => {
      expect(priorityToString(HookPriority.HIGH)).toBe('high');
    });

    it('should return "normal" for NORMAL', () => {
      expect(priorityToString(HookPriority.NORMAL)).toBe('normal');
    });

    it('should return "low" for LOW', () => {
      expect(priorityToString(HookPriority.LOW)).toBe('low');
    });

    it('should return "low" for DEFERRED', () => {
      expect(priorityToString(HookPriority.DEFERRED)).toBe('low');
    });
  });
});
