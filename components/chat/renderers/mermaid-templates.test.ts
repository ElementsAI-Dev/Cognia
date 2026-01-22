/**
 * Tests for Mermaid templates
 */

import {
  MERMAID_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  type MermaidTemplate,
} from './mermaid-templates';

describe('Mermaid Templates', () => {
  describe('MERMAID_TEMPLATES', () => {
    it('should have templates defined', () => {
      expect(MERMAID_TEMPLATES.length).toBeGreaterThan(0);
    });

    it('should have unique IDs', () => {
      const ids = MERMAID_TEMPLATES.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = TEMPLATE_CATEGORIES.map((c) => c.id);
      MERMAID_TEMPLATES.forEach((template) => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('should have non-empty code', () => {
      MERMAID_TEMPLATES.forEach((template) => {
        expect(template.code.trim()).not.toBe('');
      });
    });

    it('should have name and description', () => {
      MERMAID_TEMPLATES.forEach((template) => {
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
      });
    });
  });

  describe('TEMPLATE_CATEGORIES', () => {
    it('should have categories defined', () => {
      expect(TEMPLATE_CATEGORIES.length).toBeGreaterThan(0);
    });

    it('should have unique IDs', () => {
      const ids = TEMPLATE_CATEGORIES.map((c) => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have names', () => {
      TEMPLATE_CATEGORIES.forEach((category) => {
        expect(category.name).toBeTruthy();
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates for flowchart category', () => {
      const templates = getTemplatesByCategory('flowchart');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((t) => {
        expect(t.category).toBe('flowchart');
      });
    });

    it('should return templates for sequence category', () => {
      const templates = getTemplatesByCategory('sequence');
      expect(templates.length).toBeGreaterThan(0);
      templates.forEach((t) => {
        expect(t.category).toBe('sequence');
      });
    });

    it('should return empty array for non-existent category', () => {
      // @ts-expect-error - Testing with invalid category
      const templates = getTemplatesByCategory('nonexistent');
      expect(templates).toEqual([]);
    });

    it('should return correct count of templates per category', () => {
      const categoryCount: Record<string, number> = {};
      MERMAID_TEMPLATES.forEach((t) => {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      });

      Object.entries(categoryCount).forEach(([category, count]) => {
        const templates = getTemplatesByCategory(category as MermaidTemplate['category']);
        expect(templates.length).toBe(count);
      });
    });
  });

  describe('Template validity', () => {
    it('should have valid Mermaid syntax for flowchart templates', () => {
      const flowchartTemplates = getTemplatesByCategory('flowchart');
      flowchartTemplates.forEach((template) => {
        expect(template.code).toMatch(/^flowchart/);
      });
    });

    it('should have valid Mermaid syntax for sequence templates', () => {
      const sequenceTemplates = getTemplatesByCategory('sequence');
      sequenceTemplates.forEach((template) => {
        expect(template.code).toMatch(/^sequenceDiagram/);
      });
    });

    it('should have valid Mermaid syntax for class templates', () => {
      const classTemplates = getTemplatesByCategory('class');
      classTemplates.forEach((template) => {
        expect(template.code).toMatch(/^classDiagram/);
      });
    });

    it('should have valid Mermaid syntax for state templates', () => {
      const stateTemplates = getTemplatesByCategory('state');
      stateTemplates.forEach((template) => {
        expect(template.code).toMatch(/^stateDiagram/);
      });
    });

    it('should have valid Mermaid syntax for er templates', () => {
      const erTemplates = getTemplatesByCategory('er');
      erTemplates.forEach((template) => {
        expect(template.code).toMatch(/^erDiagram/);
      });
    });

    it('should have valid Mermaid syntax for gantt templates', () => {
      const ganttTemplates = getTemplatesByCategory('gantt');
      ganttTemplates.forEach((template) => {
        expect(template.code).toMatch(/^gantt/);
      });
    });

    it('should have valid Mermaid syntax for pie templates', () => {
      const pieTemplates = getTemplatesByCategory('pie');
      pieTemplates.forEach((template) => {
        expect(template.code).toMatch(/^pie/);
      });
    });

    it('should have valid Mermaid syntax for mindmap templates', () => {
      const mindmapTemplates = getTemplatesByCategory('mindmap');
      mindmapTemplates.forEach((template) => {
        expect(template.code).toMatch(/^mindmap/);
      });
    });

    it('should have valid Mermaid syntax for timeline templates', () => {
      const timelineTemplates = getTemplatesByCategory('timeline');
      timelineTemplates.forEach((template) => {
        expect(template.code).toMatch(/^timeline/);
      });
    });

    it('should have valid Mermaid syntax for git templates', () => {
      const gitTemplates = getTemplatesByCategory('git');
      gitTemplates.forEach((template) => {
        expect(template.code).toMatch(/^gitGraph/);
      });
    });
  });
});
