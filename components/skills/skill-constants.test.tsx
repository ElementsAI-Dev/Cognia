/**
 * Tests for skill-constants.tsx
 *
 * Validates shared category constants used across skill components.
 */

import {
  CATEGORY_ICONS,
  CATEGORY_ICONS_SM,
  CATEGORY_ICONS_LG,
  CATEGORY_COLORS,
  CATEGORY_LABEL_KEYS,
  CATEGORY_DESC_KEYS,
  CATEGORY_OPTIONS,
} from './skill-constants';
import type { SkillCategory } from '@/types/system/skill';

const ALL_CATEGORIES: SkillCategory[] = [
  'creative-design',
  'development',
  'enterprise',
  'productivity',
  'data-analysis',
  'communication',
  'meta',
  'custom',
];

describe('skill-constants', () => {
  describe('CATEGORY_ICONS', () => {
    it('has an entry for every category', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(CATEGORY_ICONS[cat]).toBeDefined();
      }
    });
  });

  describe('CATEGORY_ICONS_SM', () => {
    it('has an entry for every category', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(CATEGORY_ICONS_SM[cat]).toBeDefined();
      }
    });
  });

  describe('CATEGORY_ICONS_LG', () => {
    it('has an entry for every category', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(CATEGORY_ICONS_LG[cat]).toBeDefined();
      }
    });
  });

  describe('CATEGORY_COLORS', () => {
    it('has an entry for every category', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(CATEGORY_COLORS[cat]).toBeDefined();
        expect(typeof CATEGORY_COLORS[cat]).toBe('string');
        expect(CATEGORY_COLORS[cat].length).toBeGreaterThan(0);
      }
    });
  });

  describe('CATEGORY_LABEL_KEYS', () => {
    it('has an entry for every category', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(CATEGORY_LABEL_KEYS[cat]).toBeDefined();
        expect(typeof CATEGORY_LABEL_KEYS[cat]).toBe('string');
      }
    });

    it('all label keys start with "category"', () => {
      for (const key of Object.values(CATEGORY_LABEL_KEYS)) {
        expect(key).toMatch(/^category/);
      }
    });
  });

  describe('CATEGORY_DESC_KEYS', () => {
    it('has an entry for every category', () => {
      for (const cat of ALL_CATEGORIES) {
        expect(CATEGORY_DESC_KEYS[cat]).toBeDefined();
        expect(typeof CATEGORY_DESC_KEYS[cat]).toBe('string');
      }
    });

    it('all desc keys end with "Desc"', () => {
      for (const key of Object.values(CATEGORY_DESC_KEYS)) {
        expect(key).toMatch(/Desc$/);
      }
    });
  });

  describe('CATEGORY_OPTIONS', () => {
    it('has entries for all categories', () => {
      for (const cat of ALL_CATEGORIES) {
        const option = CATEGORY_OPTIONS.find((o) => o.value === cat);
        expect(option).toBeDefined();
        expect(option?.labelKey).toBe(CATEGORY_LABEL_KEYS[cat]);
      }
    });

    it('each option has required fields', () => {
      for (const option of CATEGORY_OPTIONS) {
        expect(option.value).toBeDefined();
        expect(option.labelKey).toBeDefined();
        expect(option.icon).toBeDefined();
      }
    });

    it('has correct number of entries', () => {
      expect(CATEGORY_OPTIONS).toHaveLength(ALL_CATEGORIES.length);
    });
  });
});
