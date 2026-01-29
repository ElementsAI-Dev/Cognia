/**
 * LaTeX Templates - Unit Tests
 */

import latexTemplatesApi, {
  ALL_TEMPLATES,
  ARTICLE_TEMPLATES,
  getTemplatesByCategory,
  searchTemplates,
  getTemplateById,
  getTemplateCategories,
  createDocumentFromTemplate,
} from './templates';

describe('LaTeX Templates', () => {
  describe('default export API', () => {
    it('should export all functions and constants', () => {
      expect(latexTemplatesApi.ALL_TEMPLATES).toBeDefined();
      expect(latexTemplatesApi.ARTICLE_TEMPLATES).toBeDefined();
      expect(latexTemplatesApi.getTemplatesByCategory).toBeDefined();
      expect(latexTemplatesApi.searchTemplates).toBeDefined();
      expect(latexTemplatesApi.getTemplateById).toBeDefined();
      expect(latexTemplatesApi.getTemplateCategories).toBeDefined();
      expect(latexTemplatesApi.createDocumentFromTemplate).toBeDefined();
    });
  });

  describe('ALL_TEMPLATES', () => {
    it('should have templates', () => {
      expect(ALL_TEMPLATES).toBeDefined();
      expect(ALL_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have required properties on each template', () => {
      ALL_TEMPLATES.forEach((template) => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.content).toBeDefined();
      });
    });
  });

  describe('ARTICLE_TEMPLATES', () => {
    it('should have article templates', () => {
      expect(ARTICLE_TEMPLATES).toBeDefined();
      expect(ARTICLE_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should all be article category', () => {
      ARTICLE_TEMPLATES.forEach((template) => {
        expect(template.category).toBe('article');
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should filter templates by category', () => {
      const articles = getTemplatesByCategory('article');
      expect(articles.length).toBeGreaterThan(0);
      expect(articles.every((t) => t.category === 'article')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      // @ts-expect-error Testing invalid category
      const unknown = getTemplatesByCategory('nonexistent');
      expect(unknown).toEqual([]);
    });
  });

  describe('searchTemplates', () => {
    it('should search templates by name', () => {
      const results = searchTemplates('article');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search templates by description', () => {
      const results = searchTemplates('IEEE');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = searchTemplates('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });

  describe('getTemplateById', () => {
    it('should get template by id', () => {
      const template = getTemplateById('article-basic');
      expect(template).toBeDefined();
      expect(template?.id).toBe('article-basic');
    });

    it('should return undefined for unknown id', () => {
      const template = getTemplateById('nonexistent-id');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateCategories', () => {
    it('should return category list with counts', () => {
      const categories = getTemplateCategories();
      expect(categories.length).toBeGreaterThan(0);
      categories.forEach((cat) => {
        expect(cat.category).toBeDefined();
        expect(cat.count).toBeGreaterThan(0);
      });
    });
  });

  describe('createDocumentFromTemplate', () => {
    it('should create document with replacements', () => {
      const template = ALL_TEMPLATES[0];
      const doc = createDocumentFromTemplate(template, {
        'Your Title Here': 'My Custom Title',
        'Your Name': 'John Doe',
      });
      expect(doc).toContain('My Custom Title');
      expect(doc).toContain('John Doe');
    });

    it('should return original content if no replacements match', () => {
      const template = ALL_TEMPLATES[0];
      const doc = createDocumentFromTemplate(template, {
        'nonexistent': 'value',
      });
      expect(doc).toBe(template.content);
    });
  });
});
