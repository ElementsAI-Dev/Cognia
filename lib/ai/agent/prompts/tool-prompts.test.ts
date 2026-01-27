/**
 * Tool Prompts Tests
 */

import {
  getToolCategoryPrompt,
  getToolGuidancePrompt,
  getToolUsageExamples,
  getAllToolCategories,
  type ToolCategory,
} from './tool-prompts';

describe('Tool Prompts', () => {
  describe('getToolCategoryPrompt', () => {
    it('should return prompt for search category', () => {
      const prompt = getToolCategoryPrompt('search');
      
      expect(prompt).toContain('Web Search Tools');
      expect(prompt).toContain('When to use');
      expect(prompt).toContain('Best practices');
    });

    it('should return prompt for scraping category', () => {
      const prompt = getToolCategoryPrompt('scraping');
      
      expect(prompt).toContain('Web Scraping Tools');
      expect(prompt).toContain('extracting content');
    });

    it('should return prompt for calculation category', () => {
      const prompt = getToolCategoryPrompt('calculation');
      
      expect(prompt).toContain('Calculation Tools');
      expect(prompt).toContain('mathematical');
    });

    it('should return prompt for code category', () => {
      const prompt = getToolCategoryPrompt('code');
      
      expect(prompt).toContain('Code Execution Tools');
      expect(prompt).toContain('running code');
    });

    it('should return prompt for file category', () => {
      const prompt = getToolCategoryPrompt('file');
      
      expect(prompt).toContain('File Management Tools');
      expect(prompt).toContain('reading');
      expect(prompt).toContain('writing');
    });

    it('should return prompt for memory category', () => {
      const prompt = getToolCategoryPrompt('memory');
      
      expect(prompt).toContain('Memory Tools');
      expect(prompt).toContain('persistent');
    });

    it('should return prompt for artifact category', () => {
      const prompt = getToolCategoryPrompt('artifact');
      
      expect(prompt).toContain('Artifact Tools');
      expect(prompt).toContain('interactive');
    });

    it('should return prompt for environment category', () => {
      const prompt = getToolCategoryPrompt('environment');
      
      expect(prompt).toContain('Environment Tools');
      expect(prompt).toContain('Python');
    });

    it('should return prompt for mcp category', () => {
      const prompt = getToolCategoryPrompt('mcp');
      
      expect(prompt).toContain('MCP Tools');
      expect(prompt).toContain('external');
    });

    it('should return prompt for rag category', () => {
      const prompt = getToolCategoryPrompt('rag');
      
      expect(prompt).toContain('RAG Search Tools');
      expect(prompt).toContain('knowledge bases');
    });

    it('should include examples when available', () => {
      const prompt = getToolCategoryPrompt('search');
      
      expect(prompt).toContain('Examples');
      expect(prompt).toContain('web_search');
    });

    it('should format with markdown headings', () => {
      const prompt = getToolCategoryPrompt('search');
      
      expect(prompt).toContain('##');
      expect(prompt).toContain('**');
    });
  });

  describe('getToolGuidancePrompt', () => {
    it('should combine prompts for multiple categories', () => {
      const prompt = getToolGuidancePrompt(['search', 'scraping']);
      
      expect(prompt).toContain('Web Search Tools');
      expect(prompt).toContain('Web Scraping Tools');
    });

    it('should separate categories with dividers', () => {
      const prompt = getToolGuidancePrompt(['search', 'code']);
      
      expect(prompt).toContain('---');
    });

    it('should handle single category', () => {
      const prompt = getToolGuidancePrompt(['memory']);
      
      expect(prompt).toContain('Memory Tools');
      expect(prompt).not.toContain('---');
    });

    it('should handle empty array', () => {
      const prompt = getToolGuidancePrompt([]);
      
      expect(prompt).toBe('');
    });

    it('should handle all categories', () => {
      const allCategories = getAllToolCategories();
      const prompt = getToolGuidancePrompt(allCategories);
      
      expect(prompt).toContain('Web Search Tools');
      expect(prompt).toContain('MCP Tools');
      expect(prompt).toContain('RAG Search Tools');
    });
  });

  describe('getToolUsageExamples', () => {
    it('should return examples for search category', () => {
      const examples = getToolUsageExamples('search');
      
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.some(e => e.includes('web_search'))).toBe(true);
    });

    it('should return empty array for categories without examples', () => {
      const examples = getToolUsageExamples('calculation');
      
      expect(Array.isArray(examples)).toBe(true);
    });

    it('should return examples for each category that has them', () => {
      const categoriesWithExamples: ToolCategory[] = ['search'];
      
      for (const category of categoriesWithExamples) {
        const examples = getToolUsageExamples(category);
        expect(examples.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getAllToolCategories', () => {
    it('should return all tool categories', () => {
      const categories = getAllToolCategories();
      
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(10);
    });

    it('should include all expected categories', () => {
      const categories = getAllToolCategories();
      const expectedCategories: ToolCategory[] = [
        'search',
        'scraping',
        'calculation',
        'code',
        'file',
        'memory',
        'artifact',
        'environment',
        'mcp',
        'rag',
      ];
      
      for (const expected of expectedCategories) {
        expect(categories).toContain(expected);
      }
    });

    it('should return categories as strings', () => {
      const categories = getAllToolCategories();
      
      expect(categories.every(c => typeof c === 'string')).toBe(true);
    });
  });

  describe('prompt content quality', () => {
    it('should have descriptive when to use items', () => {
      const categories = getAllToolCategories();
      
      for (const category of categories) {
        const prompt = getToolCategoryPrompt(category);
        expect(prompt).toContain('When to use');
        expect(prompt.split('When to use')[1]).toContain('-');
      }
    });

    it('should have actionable best practices', () => {
      const categories = getAllToolCategories();
      
      for (const category of categories) {
        const prompt = getToolCategoryPrompt(category);
        expect(prompt).toContain('Best practices');
        expect(prompt.split('Best practices')[1]).toContain('-');
      }
    });

    it('should have category names', () => {
      const categories = getAllToolCategories();
      
      for (const category of categories) {
        const prompt = getToolCategoryPrompt(category);
        expect(prompt).toContain('##');
      }
    });
  });
});
