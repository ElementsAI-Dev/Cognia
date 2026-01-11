/**
 * Tests for Template Utils
 */

import {
  extractVariableNames,
  buildTemplateVariables,
  applyTemplateVariables,
  sortTemplatesByUpdatedAt,
} from './template-utils';
import type { PromptTemplate, TemplateVariable } from '@/types/content/prompt-template';

describe('template-utils', () => {
  describe('extractVariableNames', () => {
    it('should extract variable names from content', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const result = extractVariableNames(content);

      expect(result).toContain('name');
      expect(result).toContain('place');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for content without variables', () => {
      const content = 'Hello world!';
      const result = extractVariableNames(content);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty content', () => {
      const result = extractVariableNames('');
      expect(result).toEqual([]);
    });

    it('should handle variables with dots', () => {
      const content = 'User: {{user.name}}, Email: {{user.email}}';
      const result = extractVariableNames(content);

      expect(result).toContain('user.name');
      expect(result).toContain('user.email');
    });

    it('should handle variables with underscores and hyphens', () => {
      const content = '{{first_name}} {{last-name}}';
      const result = extractVariableNames(content);

      expect(result).toContain('first_name');
      expect(result).toContain('last-name');
    });

    it('should deduplicate repeated variables', () => {
      const content = '{{name}} is {{name}}';
      const result = extractVariableNames(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('name');
    });

    it('should handle whitespace in variable syntax', () => {
      const content = '{{ name }} and {{  place  }}';
      const result = extractVariableNames(content);

      expect(result).toContain('name');
      expect(result).toContain('place');
    });
  });

  describe('buildTemplateVariables', () => {
    it('should build template variables from content', () => {
      const content = 'Hello {{name}}, your age is {{age}}';
      const result = buildTemplateVariables(content);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('name');
      expect(result[1].name).toBe('age');
    });

    it('should use defaults for new variables', () => {
      const content = 'Hello {{name}}';
      const result = buildTemplateVariables(content);

      expect(result[0]).toEqual({
        name: 'name',
        description: '',
        required: false,
        type: 'text',
      });
    });

    it('should preserve existing variable definitions', () => {
      const content = 'Hello {{name}}';
      const existing: TemplateVariable[] = [
        { name: 'name', description: 'User name', required: true, type: 'text' },
      ];

      const result = buildTemplateVariables(content, existing);

      expect(result[0].description).toBe('User name');
      expect(result[0].required).toBe(true);
    });

    it('should handle mix of existing and new variables', () => {
      const content = '{{existing}} and {{new_var}}';
      const existing: TemplateVariable[] = [
        { name: 'existing', description: 'Existing var', required: true, type: 'multiline' },
      ];

      const result = buildTemplateVariables(content, existing);

      expect(result).toHaveLength(2);
      expect(result.find(v => v.name === 'existing')?.description).toBe('Existing var');
      expect(result.find(v => v.name === 'new_var')?.description).toBe('');
    });
  });

  describe('applyTemplateVariables', () => {
    it('should substitute variables with values', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const values = { name: 'John', place: 'Paris' };

      const result = applyTemplateVariables(content, values);

      expect(result.output).toBe('Hello John, welcome to Paris!');
      expect(result.missing).toEqual([]);
    });

    it('should report missing variables', () => {
      const content = 'Hello {{name}}, your email is {{email}}';
      const values = { name: 'John' };

      const result = applyTemplateVariables(content, values);

      expect(result.output).toBe('Hello John, your email is {{email}}');
      expect(result.missing).toContain('email');
    });

    it('should handle empty string values as missing', () => {
      const content = 'Hello {{name}}';
      const values = { name: '' };

      const result = applyTemplateVariables(content, values);

      expect(result.missing).toContain('name');
    });

    it('should handle undefined values as missing', () => {
      const content = 'Hello {{name}}';
      const values = { name: undefined };

      const result = applyTemplateVariables(content, values);

      expect(result.missing).toContain('name');
    });

    it('should convert number values to string', () => {
      const content = 'Your age is {{age}}';
      const values = { age: 25 };

      const result = applyTemplateVariables(content, values);

      expect(result.output).toBe('Your age is 25');
    });

    it('should convert boolean values to string', () => {
      const content = 'Is active: {{active}}';
      const values = { active: true };

      const result = applyTemplateVariables(content, values);

      expect(result.output).toBe('Is active: true');
    });

    it('should handle content without variables', () => {
      const content = 'Hello world!';
      const values = {};

      const result = applyTemplateVariables(content, values);

      expect(result.output).toBe('Hello world!');
      expect(result.missing).toEqual([]);
    });
  });

  describe('sortTemplatesByUpdatedAt', () => {
    it('should sort templates by updatedAt descending', () => {
      const templates: PromptTemplate[] = [
        {
          id: '1',
          name: 'Old',
          content: '',
          tags: [],
          variables: [],
          source: 'user',
          usageCount: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: '2',
          name: 'New',
          content: '',
          tags: [],
          variables: [],
          source: 'user',
          usageCount: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-15'),
        },
        {
          id: '3',
          name: 'Middle',
          content: '',
          tags: [],
          variables: [],
          source: 'user',
          usageCount: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-10'),
        },
      ];

      const result = sortTemplatesByUpdatedAt(templates);

      expect(result[0].name).toBe('New');
      expect(result[1].name).toBe('Middle');
      expect(result[2].name).toBe('Old');
    });

    it('should not modify original array', () => {
      const templates: PromptTemplate[] = [
        {
          id: '1',
          name: 'First',
          content: '',
          tags: [],
          variables: [],
          source: 'user',
          usageCount: 0,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      const result = sortTemplatesByUpdatedAt(templates);

      expect(result).not.toBe(templates);
    });

    it('should handle empty array', () => {
      const result = sortTemplatesByUpdatedAt([]);
      expect(result).toEqual([]);
    });
  });
});
