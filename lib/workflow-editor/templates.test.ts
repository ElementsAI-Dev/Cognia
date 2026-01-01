/**
 * Tests for workflow templates
 */

import { 
  workflowEditorTemplates, 
  getTemplateById, 
  getTemplatesByCategory,
  getTemplateCategories,
} from './templates';

describe('workflowEditorTemplates', () => {
  it('should have at least 10 templates', () => {
    expect(workflowEditorTemplates.length).toBeGreaterThanOrEqual(10);
  });

  it('should have unique IDs for all templates', () => {
    const ids = workflowEditorTemplates.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have required properties for each template', () => {
    workflowEditorTemplates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
    });
  });
});

describe('getTemplateById', () => {
  it('should return template when ID exists', () => {
    const template = getTemplateById('simple-chat');
    expect(template).toBeDefined();
    expect(template?.id).toBe('simple-chat');
  });

  it('should return undefined when ID does not exist', () => {
    const template = getTemplateById('nonexistent-template');
    expect(template).toBeUndefined();
  });

  describe('new templates', () => {
    it('should have Content Translation template', () => {
      const template = getTemplateById('content-translation');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Translation');
    });

    it('should have Document Summarization template', () => {
      const template = getTemplateById('document-summarization');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Summarization');
    });

    it('should have Email Drafting template', () => {
      const template = getTemplateById('email-drafting');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Email');
    });

    it('should have Code Review template', () => {
      const template = getTemplateById('code-review');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Code Review');
    });

    it('should have Content Moderation template', () => {
      const template = getTemplateById('content-moderation');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Moderation');
    });

    it('should have Research Assistant template', () => {
      const template = getTemplateById('research-assistant');
      expect(template).toBeDefined();
      expect(template?.name).toContain('Research');
    });
  });
});

describe('getTemplatesByCategory', () => {
  it('should return templates for valid category', () => {
    const templates = getTemplatesByCategory('basic');
    expect(templates.length).toBeGreaterThan(0);
    templates.forEach(t => {
      expect(t.category).toBe('basic');
    });
  });

  it('should return empty array for invalid category', () => {
    const templates = getTemplatesByCategory('NonexistentCategory');
    expect(templates).toEqual([]);
  });

  it('should group templates correctly by category', () => {
    const categories = getTemplateCategories();
    
    categories.forEach(category => {
      const templates = getTemplatesByCategory(category);
      expect(templates.length).toBeGreaterThan(0);
    });
  });
});

describe('getTemplateCategories', () => {
  it('should return array of categories', () => {
    const categories = getTemplateCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it('should return unique categories', () => {
    const categories = getTemplateCategories();
    const uniqueCategories = new Set(categories);
    expect(uniqueCategories.size).toBe(categories.length);
  });
});
