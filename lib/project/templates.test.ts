/**
 * Tests for Project Templates
 */

import { PROJECT_TEMPLATES, CATEGORY_LABELS } from './templates';

describe('PROJECT_TEMPLATES', () => {
  it('should be a non-empty array', () => {
    expect(Array.isArray(PROJECT_TEMPLATES)).toBe(true);
    expect(PROJECT_TEMPLATES.length).toBeGreaterThan(0);
  });

  it('each template should have required fields', () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.icon).toBeTruthy();
      expect(template.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(template.defaultMode).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(Array.isArray(template.tags)).toBe(true);
      expect(typeof template.customInstructions).toBe('string');
    }
  });

  it('each template should have a unique id', () => {
    const ids = PROJECT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should contain the blank-project template', () => {
    const blank = PROJECT_TEMPLATES.find((t) => t.id === 'blank-project');
    expect(blank).toBeDefined();
    expect(blank!.customInstructions).toBe('');
    expect(blank!.tags).toEqual([]);
  });

  it('all categories should be valid', () => {
    const validCategories = Object.keys(CATEGORY_LABELS);
    for (const template of PROJECT_TEMPLATES) {
      expect(validCategories).toContain(template.category);
    }
  });
});

describe('CATEGORY_LABELS', () => {
  it('should contain all expected categories', () => {
    expect(CATEGORY_LABELS).toHaveProperty('development');
    expect(CATEGORY_LABELS).toHaveProperty('writing');
    expect(CATEGORY_LABELS).toHaveProperty('research');
    expect(CATEGORY_LABELS).toHaveProperty('business');
    expect(CATEGORY_LABELS).toHaveProperty('personal');
  });

  it('each label should be a non-empty string', () => {
    for (const label of Object.values(CATEGORY_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
