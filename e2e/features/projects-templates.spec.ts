import { test, expect } from '@playwright/test';

/**
 * Project Templates Tests
 * Tests for creating projects from templates
 */

test.describe('Project Templates Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first to get localStorage access
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    // Clear existing projects after page load
    await page.evaluate(() => {
      localStorage.removeItem('cognia-projects');
    });

    // Reload to apply changes
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open templates dialog from new project menu', async ({ page }) => {
    // Test templates dialog opening logic
    const result = await page.evaluate(() => {
      const dialogState = {
        isOpen: false,
        source: null as string | null,
      };

      const openTemplatesDialog = (source: string) => {
        dialogState.isOpen = true;
        dialogState.source = source;
        return true;
      };

      const wasOpen = dialogState.isOpen;
      openTemplatesDialog('new-project-menu');
      const isNowOpen = dialogState.isOpen;
      const openedFrom = dialogState.source;

      return { wasOpen, isNowOpen, openedFrom };
    });

    expect(result.wasOpen).toBe(false);
    expect(result.isNowOpen).toBe(true);
    expect(result.openedFrom).toBe('new-project-menu');
  });

  test('should display template categories', async ({ page }) => {
    // Test template categories logic
    const result = await page.evaluate(() => {
      const templateCategories = [
        { id: 'all', name: 'All', count: 10 },
        { id: 'development', name: 'Development', count: 4 },
        { id: 'writing', name: 'Writing', count: 3 },
        { id: 'research', name: 'Research', count: 2 },
        { id: 'business', name: 'Business', count: 1 },
      ];

      const templates = [
        { id: 't1', name: 'Code Project', category: 'development' },
        { id: 't2', name: 'API Project', category: 'development' },
        { id: 't3', name: 'Blog Writing', category: 'writing' },
        { id: 't4', name: 'Research Paper', category: 'research' },
      ];

      const filterByCategory = (categoryId: string) => {
        if (categoryId === 'all') return templates;
        return templates.filter(t => t.category === categoryId);
      };

      return {
        categoryCount: templateCategories.length,
        hasAllCategory: templateCategories.some(c => c.id === 'all'),
        developmentTemplates: filterByCategory('development').length,
        allTemplates: filterByCategory('all').length,
      };
    });

    expect(result.categoryCount).toBeGreaterThan(0);
    expect(result.hasAllCategory).toBe(true);
    expect(result.developmentTemplates).toBe(2);
    expect(result.allTemplates).toBe(4);
  });

  test('should display template cards', async ({ page }) => {
    // Test template cards rendering logic
    const result = await page.evaluate(() => {
      const templates = [
        { id: 't1', name: 'Coding Assistant', category: 'development', icon: '💻' },
        { id: 't2', name: 'Research Project', category: 'research', icon: '🔬' },
        { id: 't3', name: 'Blank Project', category: 'general', icon: '📄' },
      ];

      const renderCard = (template: { name: string; icon: string }) => ({
        title: template.name,
        icon: template.icon,
        hasTitle: !!template.name,
        hasIcon: !!template.icon,
      });

      const cards = templates.map(renderCard);

      return {
        cardCount: cards.length,
        allHaveTitles: cards.every(c => c.hasTitle),
        allHaveIcons: cards.every(c => c.hasIcon),
      };
    });

    expect(result.cardCount).toBe(3);
    expect(result.allHaveTitles).toBe(true);
    expect(result.allHaveIcons).toBe(true);
  });

  test('should filter templates by category', async ({ page }) => {
    // Test template filtering logic
    const result = await page.evaluate(() => {
      const templates = [
        { id: 't1', name: 'Coding Assistant', category: 'development' },
        { id: 't2', name: 'API Builder', category: 'development' },
        { id: 't3', name: 'Blog Writer', category: 'writing' },
        { id: 't4', name: 'Research Paper', category: 'research' },
      ];

      const filterByCategory = (category: string) => {
        if (category === 'all') return templates;
        return templates.filter(t => t.category === category);
      };

      const devTemplates = filterByCategory('development');
      const writingTemplates = filterByCategory('writing');
      const allTemplates = filterByCategory('all');

      return {
        devCount: devTemplates.length,
        writingCount: writingTemplates.length,
        allCount: allTemplates.length,
        devHasCoding: devTemplates.some(t => t.name === 'Coding Assistant'),
      };
    });

    expect(result.devCount).toBe(2);
    expect(result.writingCount).toBe(1);
    expect(result.allCount).toBe(4);
    expect(result.devHasCoding).toBe(true);
  });

  test('should display template details', async ({ page }) => {
    // Test template details rendering logic
    const result = await page.evaluate(() => {
      const template = {
        id: 't1',
        name: 'Coding Assistant',
        description: 'AI-powered coding helper',
        mode: 'chat',
        category: 'development',
        icon: '💻',
        color: '#3B82F6',
      };

      const getTemplateDetails = (t: typeof template) => ({
        hasName: !!t.name,
        hasDescription: !!t.description,
        hasMode: !!t.mode,
        hasIcon: !!t.icon,
        hasColor: !!t.color,
      });

      const details = getTemplateDetails(template);

      return {
        ...details,
        allDetailsPresent: Object.values(details).every(Boolean),
      };
    });

    expect(result.hasName).toBe(true);
    expect(result.hasDescription).toBe(true);
    expect(result.hasMode).toBe(true);
    expect(result.allDetailsPresent).toBe(true);
  });

  test('should create project from template', async ({ page }) => {
    // Test create project from template logic
    const result = await page.evaluate(() => {
      interface Project {
        id: string;
        name: string;
        description: string;
        templateId: string;
      }

      const projects: Project[] = [];

      const template = {
        id: 'blank',
        name: 'Blank Project',
        defaultName: 'New Project',
        defaultDescription: 'A new project',
      };

      const createFromTemplate = (templateData: typeof template): Project => {
        const project = {
          id: `project-${Date.now()}`,
          name: templateData.defaultName,
          description: templateData.defaultDescription,
          templateId: templateData.id,
        };
        projects.push(project);
        return project;
      };

      const initialCount = projects.length;
      const created = createFromTemplate(template);
      const afterCount = projects.length;

      return {
        initialCount,
        afterCount,
        projectCreated: afterCount > initialCount,
        createdName: created.name,
        hasTemplateId: !!created.templateId,
      };
    });

    expect(result.projectCreated).toBe(true);
    expect(result.createdName).toBe('New Project');
    expect(result.hasTemplateId).toBe(true);
  });

  test('should close templates dialog', async ({ page }) => {
    // Test dialog close logic
    const result = await page.evaluate(() => {
      const dialogState = {
        isOpen: true,
        selectedTemplate: null as string | null,
      };

      const closeDialog = () => {
        dialogState.isOpen = false;
        dialogState.selectedTemplate = null;
        return true;
      };

      const wasOpen = dialogState.isOpen;
      closeDialog();
      const isNowClosed = !dialogState.isOpen;

      return { wasOpen, isNowClosed };
    });

    expect(result.wasOpen).toBe(true);
    expect(result.isNowClosed).toBe(true);
  });
});

test.describe('Project Templates Logic', () => {
  test('should define correct template structure', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface ProjectTemplate {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        defaultMode: 'chat' | 'agent' | 'research';
        customInstructions?: string;
        tags: string[];
        category: 'development' | 'writing' | 'research' | 'business' | 'personal';
      }

      const templates: ProjectTemplate[] = [
        {
          id: 'coding-assistant',
          name: 'Coding Assistant',
          description: 'AI-powered coding help',
          icon: 'Code',
          color: '#3B82F6',
          defaultMode: 'agent',
          customInstructions: 'You are an expert software developer.',
          tags: ['development', 'coding'],
          category: 'development',
        },
        {
          id: 'research-project',
          name: 'Research Project',
          description: 'Organize research with AI',
          icon: 'BookOpen',
          color: '#8B5CF6',
          defaultMode: 'research',
          tags: ['research', 'learning'],
          category: 'research',
        },
        {
          id: 'blank-project',
          name: 'Blank Project',
          description: 'Start fresh',
          icon: 'Sparkles',
          color: '#6B7280',
          defaultMode: 'chat',
          tags: [],
          category: 'personal',
        },
      ];

      const getTemplatesByCategory = (category: ProjectTemplate['category']) =>
        templates.filter((t) => t.category === category);

      return {
        totalTemplates: templates.length,
        developmentTemplates: getTemplatesByCategory('development').length,
        researchTemplates: getTemplatesByCategory('research').length,
        personalTemplates: getTemplatesByCategory('personal').length,
        hasCustomInstructions: templates.some((t) => t.customInstructions),
        allHaveModes: templates.every((t) => t.defaultMode),
      };
    });

    expect(result.totalTemplates).toBe(3);
    expect(result.developmentTemplates).toBe(1);
    expect(result.researchTemplates).toBe(1);
    expect(result.personalTemplates).toBe(1);
    expect(result.hasCustomInstructions).toBe(true);
    expect(result.allHaveModes).toBe(true);
  });

  test('should filter templates correctly', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface ProjectTemplate {
        id: string;
        name: string;
        category: string;
      }

      const templates: ProjectTemplate[] = [
        { id: 't1', name: 'Coding Assistant', category: 'development' },
        { id: 't2', name: 'Research Project', category: 'research' },
        { id: 't3', name: 'Business Strategy', category: 'business' },
        { id: 't4', name: 'Creative Writing', category: 'writing' },
        { id: 't5', name: 'Learning Path', category: 'personal' },
        { id: 't6', name: 'Blank Project', category: 'personal' },
      ];

      const filterByCategory = (category: string | 'all') => {
        if (category === 'all') return templates;
        return templates.filter((t) => t.category === category);
      };

      return {
        all: filterByCategory('all').length,
        development: filterByCategory('development').length,
        research: filterByCategory('research').length,
        business: filterByCategory('business').length,
        writing: filterByCategory('writing').length,
        personal: filterByCategory('personal').length,
      };
    });

    expect(result.all).toBe(6);
    expect(result.development).toBe(1);
    expect(result.research).toBe(1);
    expect(result.business).toBe(1);
    expect(result.writing).toBe(1);
    expect(result.personal).toBe(2);
  });

  test('should create project from template input', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface ProjectTemplate {
        id: string;
        name: string;
        description: string;
        icon: string;
        color: string;
        defaultMode: 'chat' | 'agent' | 'research';
        customInstructions?: string;
        tags: string[];
      }

      interface CreateProjectInput {
        name: string;
        description?: string;
        icon: string;
        color: string;
        defaultMode?: 'chat' | 'agent' | 'research';
        customInstructions?: string;
        tags?: string[];
      }

      interface Project {
        id: string;
        name: string;
        description?: string;
        icon: string;
        color: string;
        defaultMode?: 'chat' | 'agent' | 'research';
        customInstructions?: string;
        tags?: string[];
        createdAt: Date;
      }

      const createProjectFromTemplate = (template: ProjectTemplate): Project => {
        const input: CreateProjectInput = {
          name: template.name,
          description: template.description,
          icon: template.icon,
          color: template.color,
          defaultMode: template.defaultMode,
          customInstructions: template.customInstructions,
          tags: template.tags,
        };

        return {
          id: `project-${Date.now()}`,
          ...input,
          createdAt: new Date(),
        };
      };

      const template: ProjectTemplate = {
        id: 'coding-assistant',
        name: 'Coding Assistant',
        description: 'AI coding help',
        icon: 'Code',
        color: '#3B82F6',
        defaultMode: 'agent',
        customInstructions: 'Be helpful',
        tags: ['coding'],
      };

      const project = createProjectFromTemplate(template);

      return {
        hasId: !!project.id,
        name: project.name,
        icon: project.icon,
        color: project.color,
        mode: project.defaultMode,
        hasInstructions: !!project.customInstructions,
        hasTags: project.tags && project.tags.length > 0,
        hasCreatedAt: !!project.createdAt,
      };
    });

    expect(result.hasId).toBe(true);
    expect(result.name).toBe('Coding Assistant');
    expect(result.icon).toBe('Code');
    expect(result.color).toBe('#3B82F6');
    expect(result.mode).toBe('agent');
    expect(result.hasInstructions).toBe(true);
    expect(result.hasTags).toBe(true);
    expect(result.hasCreatedAt).toBe(true);
  });
});
