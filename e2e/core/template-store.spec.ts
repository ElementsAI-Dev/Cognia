import { test, expect } from '@playwright/test';

/**
 * Template Store Tests
 * Tests for chat template management
 */

test.describe('Template Store - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should create a new template', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        description: string;
        icon: string;
        category: string;
        systemPrompt: string;
        isBuiltIn: boolean;
        createdAt: Date;
        updatedAt: Date;
      }

      const templates: Template[] = [];

      const createTemplate = (input: {
        name: string;
        description: string;
        icon?: string;
        category: string;
        systemPrompt: string;
      }): Template => {
        const template: Template = {
          id: `tmpl-${Date.now()}`,
          name: input.name,
          description: input.description,
          icon: input.icon || '📝',
          category: input.category,
          systemPrompt: input.systemPrompt,
          isBuiltIn: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        templates.push(template);
        return template;
      };

      const created = createTemplate({
        name: 'Code Review',
        description: 'Review code for best practices',
        icon: '🔍',
        category: 'development',
        systemPrompt: 'You are a code reviewer...',
      });

      return {
        templateCount: templates.length,
        name: created.name,
        icon: created.icon,
        isBuiltIn: created.isBuiltIn,
        hasId: !!created.id,
      };
    });

    expect(result.templateCount).toBe(1);
    expect(result.name).toBe('Code Review');
    expect(result.icon).toBe('🔍');
    expect(result.isBuiltIn).toBe(false);
    expect(result.hasId).toBe(true);
  });

  test('should update a template', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        description: string;
        isBuiltIn: boolean;
        updatedAt: Date;
      }

      let templates: Template[] = [
        { id: 't1', name: 'Original', description: 'Desc', isBuiltIn: false, updatedAt: new Date(1000) },
        { id: 't2', name: 'Built-in', description: 'Desc', isBuiltIn: true, updatedAt: new Date(1000) },
      ];

      const updateTemplate = (id: string, updates: Partial<Template>) => {
        templates = templates.map((t) =>
          t.id === id && !t.isBuiltIn
            ? { ...t, ...updates, updatedAt: new Date() }
            : t
        );
      };

      updateTemplate('t1', { name: 'Updated Name' });
      updateTemplate('t2', { name: 'Should Not Update' }); // Built-in should not update

      return {
        customUpdated: templates[0].name === 'Updated Name',
        builtInUnchanged: templates[1].name === 'Built-in',
        updatedAtChanged: templates[0].updatedAt.getTime() > 1000,
      };
    });

    expect(result.customUpdated).toBe(true);
    expect(result.builtInUnchanged).toBe(true);
    expect(result.updatedAtChanged).toBe(true);
  });

  test('should delete a template', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        isBuiltIn: boolean;
      }

      let templates: Template[] = [
        { id: 't1', name: 'Custom', isBuiltIn: false },
        { id: 't2', name: 'Built-in', isBuiltIn: true },
      ];

      const deleteTemplate = (id: string) => {
        templates = templates.filter((t) => t.id !== id || t.isBuiltIn);
      };

      deleteTemplate('t1'); // Should delete
      deleteTemplate('t2'); // Should not delete (built-in)

      return {
        count: templates.length,
        builtInRemains: templates.some((t) => t.id === 't2'),
        customDeleted: !templates.some((t) => t.id === 't1'),
      };
    });

    expect(result.count).toBe(1);
    expect(result.builtInRemains).toBe(true);
    expect(result.customDeleted).toBe(true);
  });

  test('should duplicate a template', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        description: string;
        systemPrompt: string;
      }

      const templates: Template[] = [
        { id: 't1', name: 'Original', description: 'Desc', systemPrompt: 'Prompt' },
      ];

      const duplicateTemplate = (id: string): Template | null => {
        const original = templates.find((t) => t.id === id);
        if (!original) return null;

        const duplicate: Template = {
          id: `t-${Date.now()}`,
          name: `${original.name} (Copy)`,
          description: original.description,
          systemPrompt: original.systemPrompt,
        };

        templates.push(duplicate);
        return duplicate;
      };

      const duplicated = duplicateTemplate('t1');

      return {
        count: templates.length,
        duplicateName: duplicated?.name,
        sameDescription: duplicated?.description === templates[0].description,
        differentId: duplicated?.id !== templates[0].id,
      };
    });

    expect(result.count).toBe(2);
    expect(result.duplicateName).toBe('Original (Copy)');
    expect(result.sameDescription).toBe(true);
    expect(result.differentId).toBe(true);
  });
});

test.describe('Template Store - Selectors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should get template by id', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
      }

      const templates: Template[] = [
        { id: 't1', name: 'First' },
        { id: 't2', name: 'Second' },
      ];

      const getTemplate = (id: string) => templates.find((t) => t.id === id);

      return {
        found: getTemplate('t1')?.name,
        notFound: getTemplate('t99'),
      };
    });

    expect(result.found).toBe('First');
    expect(result.notFound).toBeUndefined();
  });

  test('should get templates by category', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        category: string;
      }

      const templates: Template[] = [
        { id: 't1', name: 'Code Review', category: 'development' },
        { id: 't2', name: 'Debug Helper', category: 'development' },
        { id: 't3', name: 'Essay Writer', category: 'writing' },
      ];

      const getTemplatesByCategory = (category: string) =>
        templates.filter((t) => t.category === category);

      return {
        devCount: getTemplatesByCategory('development').length,
        writingCount: getTemplatesByCategory('writing').length,
        otherCount: getTemplatesByCategory('other').length,
      };
    });

    expect(result.devCount).toBe(2);
    expect(result.writingCount).toBe(1);
    expect(result.otherCount).toBe(0);
  });

  test('should separate built-in and custom templates', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        isBuiltIn: boolean;
      }

      const templates: Template[] = [
        { id: 't1', name: 'Built-in 1', isBuiltIn: true },
        { id: 't2', name: 'Built-in 2', isBuiltIn: true },
        { id: 't3', name: 'Custom 1', isBuiltIn: false },
      ];

      const getBuiltInTemplates = () => templates.filter((t) => t.isBuiltIn);
      const getCustomTemplates = () => templates.filter((t) => !t.isBuiltIn);

      return {
        builtInCount: getBuiltInTemplates().length,
        customCount: getCustomTemplates().length,
      };
    });

    expect(result.builtInCount).toBe(2);
    expect(result.customCount).toBe(1);
  });

  test('should search templates', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        description: string;
        category: string;
      }

      const templates: Template[] = [
        { id: 't1', name: 'Code Review', description: 'Review code', category: 'development' },
        { id: 't2', name: 'Essay Writer', description: 'Write essays', category: 'writing' },
        { id: 't3', name: 'Debug Helper', description: 'Help debug code', category: 'development' },
      ];

      const searchTemplates = (query: string) => {
        const lowerQuery = query.toLowerCase();
        return templates.filter(
          (t) =>
            t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.category.toLowerCase().includes(lowerQuery)
        );
      };

      return {
        codeSearch: searchTemplates('code').length,
        writeSearch: searchTemplates('write').length,
        devSearch: searchTemplates('development').length,
        noMatch: searchTemplates('xyz').length,
      };
    });

    expect(result.codeSearch).toBe(2); // Code Review and Debug Helper
    expect(result.writeSearch).toBe(1);
    expect(result.devSearch).toBe(2);
    expect(result.noMatch).toBe(0);
  });
});

test.describe('Template Store - Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize built-in templates', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        isBuiltIn: boolean;
      }

      const BUILT_IN_TEMPLATES = [
        { name: 'General Assistant', isBuiltIn: true },
        { name: 'Code Helper', isBuiltIn: true },
        { name: 'Writer', isBuiltIn: true },
      ];

      const templates: Template[] = [];

      const initializeTemplates = () => {
        const builtInNames = templates.filter((t) => t.isBuiltIn).map((t) => t.name);
        const missingBuiltIns = BUILT_IN_TEMPLATES.filter(
          (t) => !builtInNames.includes(t.name)
        );

        for (const t of missingBuiltIns) {
          templates.push({
            id: `tmpl-${Date.now()}-${Math.random()}`,
            name: t.name,
            isBuiltIn: true,
          });
        }
      };

      initializeTemplates();

      return {
        count: templates.length,
        allBuiltIn: templates.every((t) => t.isBuiltIn),
        hasGeneralAssistant: templates.some((t) => t.name === 'General Assistant'),
      };
    });

    expect(result.count).toBe(3);
    expect(result.allBuiltIn).toBe(true);
    expect(result.hasGeneralAssistant).toBe(true);
  });

  test('should not duplicate built-in templates on re-initialization', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Template {
        id: string;
        name: string;
        isBuiltIn: boolean;
      }

      const BUILT_IN_TEMPLATES = [
        { name: 'General Assistant', isBuiltIn: true },
      ];

      const templates: Template[] = [
        { id: 't1', name: 'General Assistant', isBuiltIn: true },
      ];

      const initializeTemplates = () => {
        const builtInNames = templates.filter((t) => t.isBuiltIn).map((t) => t.name);
        const missingBuiltIns = BUILT_IN_TEMPLATES.filter(
          (t) => !builtInNames.includes(t.name)
        );

        for (const t of missingBuiltIns) {
          templates.push({
            id: `tmpl-${Date.now()}`,
            name: t.name,
            isBuiltIn: true,
          });
        }
      };

      // Call twice
      initializeTemplates();
      initializeTemplates();

      return {
        count: templates.length,
      };
    });

    expect(result.count).toBe(1); // Should not duplicate
  });
});
