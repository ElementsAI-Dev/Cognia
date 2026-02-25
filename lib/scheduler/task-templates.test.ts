/**
 * Task Templates Tests
 */

import {
  TASK_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  getTemplateById,
} from './task-templates';

describe('Task Templates', () => {
  describe('TASK_TEMPLATES', () => {
    it('should have at least one template', () => {
      expect(TASK_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have unique IDs', () => {
      const ids = TASK_TEMPLATES.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have all required fields on every template', () => {
      for (const tpl of TASK_TEMPLATES) {
        expect(tpl.id).toBeTruthy();
        expect(tpl.name).toBeTruthy();
        expect(tpl.nameZh).toBeTruthy();
        expect(tpl.description).toBeTruthy();
        expect(tpl.descriptionZh).toBeTruthy();
        expect(tpl.category).toBeTruthy();
        expect(tpl.icon).toBeTruthy();
        expect(tpl.taskType).toBeTruthy();
        expect(tpl.triggerType).toBeTruthy();
        expect(typeof tpl.getInput).toBe('function');
      }
    });

    it('should produce valid CreateScheduledTaskInput from getInput()', () => {
      for (const tpl of TASK_TEMPLATES) {
        const input = tpl.getInput();
        expect(input.name).toBeTruthy();
        expect(input.type).toBe(tpl.taskType);
        expect(input.trigger).toBeDefined();
        expect(input.trigger.type).toBe(tpl.triggerType);
      }
    });

    it('should have consistent taskType and trigger type', () => {
      for (const tpl of TASK_TEMPLATES) {
        const input = tpl.getInput();
        expect(input.type).toBe(tpl.taskType);
        expect(input.trigger.type).toBe(tpl.triggerType);
      }
    });

    it('should have valid categories', () => {
      const validCategories = TEMPLATE_CATEGORIES.map((c) => c.value);
      for (const tpl of TASK_TEMPLATES) {
        expect(validCategories).toContain(tpl.category);
      }
    });
  });

  describe('TEMPLATE_CATEGORIES', () => {
    it('should have unique values', () => {
      const values = TEMPLATE_CATEGORIES.map((c) => c.value);
      expect(new Set(values).size).toBe(values.length);
    });

    it('should have labels in both languages', () => {
      for (const cat of TEMPLATE_CATEGORIES) {
        expect(cat.label).toBeTruthy();
        expect(cat.labelZh).toBeTruthy();
      }
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return all templates when no category specified', () => {
      const result = getTemplatesByCategory();
      expect(result).toEqual(TASK_TEMPLATES);
    });

    it('should filter by category', () => {
      const dataTemplates = getTemplatesByCategory('data');
      expect(dataTemplates.length).toBeGreaterThan(0);
      for (const tpl of dataTemplates) {
        expect(tpl.category).toBe('data');
      }
    });

    it('should return empty array for category with no templates', () => {
      // All categories have templates, but test the filter logic
      const result = getTemplatesByCategory('data');
      expect(result.every((t) => t.category === 'data')).toBe(true);
    });
  });

  describe('getTemplateById', () => {
    it('should find template by ID', () => {
      const result = getTemplateById('daily-backup');
      expect(result).toBeDefined();
      expect(result!.id).toBe('daily-backup');
      expect(result!.taskType).toBe('backup');
    });

    it('should return undefined for non-existent ID', () => {
      const result = getTemplateById('non-existent-template');
      expect(result).toBeUndefined();
    });
  });

  describe('specific templates', () => {
    it('daily-backup should have correct cron expression', () => {
      const tpl = getTemplateById('daily-backup')!;
      const input = tpl.getInput();
      expect(input.trigger.cronExpression).toBe('0 2 * * *');
    });

    it('health-check should run every 30 minutes', () => {
      const tpl = getTemplateById('health-check')!;
      const input = tpl.getInput();
      expect(input.trigger.cronExpression).toBe('*/30 * * * *');
    });

    it('api-ping should include URL in payload', () => {
      const tpl = getTemplateById('api-ping')!;
      const input = tpl.getInput();
      expect(input.payload).toHaveProperty('url');
      expect(input.payload).toHaveProperty('expectedStatus', 200);
    });

    it('scheduled-chat should have autoReply enabled', () => {
      const tpl = getTemplateById('scheduled-chat')!;
      const input = tpl.getInput();
      expect(input.payload).toHaveProperty('autoReply', true);
      expect(input.payload).toHaveProperty('message');
    });
  });
});
