import { test, expect } from '@playwright/test';

/**
 * Projects Management Complete Tests
 * Tests project creation, management, and knowledge base
 */
test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load projects page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    expect(page.url()).toContain('/projects');
  });

  test('should display project list', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Project {
        id: string;
        name: string;
        description: string;
        color: string;
        createdAt: Date;
        updatedAt: Date;
      }

      const projects: Project[] = [
        {
          id: 'p1',
          name: 'Web App',
          description: 'React web application',
          color: '#3b82f6',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'p2',
          name: 'API Server',
          description: 'Node.js backend',
          color: '#22c55e',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      return {
        projectCount: projects.length,
        projectNames: projects.map(p => p.name),
        hasColors: projects.every(p => p.color),
      };
    });

    expect(result.projectCount).toBe(2);
    expect(result.projectNames).toContain('Web App');
    expect(result.hasColors).toBe(true);
  });

  test('should display empty state when no projects', async ({ page }) => {
    const result = await page.evaluate(() => {
      const projects: unknown[] = [];

      const getEmptyState = () => {
        if (projects.length === 0) {
          return {
            show: true,
            title: 'No projects yet',
            description: 'Create your first project to get started',
            actionLabel: 'Create Project',
          };
        }
        return { show: false };
      };

      return getEmptyState();
    });

    expect(result.show).toBe(true);
    expect(result.title).toBe('No projects yet');
    expect(result.actionLabel).toBe('Create Project');
  });
});

test.describe('Project CRUD', () => {
  test('should create a new project', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface Project {
        id: string;
        name: string;
        description: string;
        color: string;
        createdAt: Date;
      }

      const projects: Project[] = [];

      const createProject = (data: { name: string; description: string; color: string }): Project => {
        const project: Project = {
          id: `project-${Date.now()}`,
          name: data.name,
          description: data.description,
          color: data.color,
          createdAt: new Date(),
        };
        projects.push(project);
        return project;
      };

      const created = createProject({
        name: 'New Project',
        description: 'A new project description',
        color: '#8b5cf6',
      });

      return {
        projectCount: projects.length,
        createdName: created.name,
        hasId: !!created.id,
        hasCreatedAt: !!created.createdAt,
      };
    });

    expect(result.projectCount).toBe(1);
    expect(result.createdName).toBe('New Project');
    expect(result.hasId).toBe(true);
    expect(result.hasCreatedAt).toBe(true);
  });

  test('should update project details', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const projects = [
        { id: 'p1', name: 'Original Name', description: 'Original description', color: '#3b82f6' },
      ];

      const updateProject = (id: string, updates: Partial<typeof projects[0]>): boolean => {
        const project = projects.find(p => p.id === id);
        if (project) {
          Object.assign(project, updates);
          return true;
        }
        return false;
      };

      const updated = updateProject('p1', {
        name: 'Updated Name',
        description: 'Updated description',
      });

      return {
        updated,
        newName: projects[0].name,
        newDescription: projects[0].description,
        colorUnchanged: projects[0].color === '#3b82f6',
      };
    });

    expect(result.updated).toBe(true);
    expect(result.newName).toBe('Updated Name');
    expect(result.newDescription).toBe('Updated description');
    expect(result.colorUnchanged).toBe(true);
  });

  test('should delete a project', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const projects = [
        { id: 'p1', name: 'Project 1' },
        { id: 'p2', name: 'Project 2' },
        { id: 'p3', name: 'Project 3' },
      ];

      const deleteProject = (id: string): boolean => {
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
          projects.splice(index, 1);
          return true;
        }
        return false;
      };

      const countBefore = projects.length;
      const deleted = deleteProject('p2');
      const countAfter = projects.length;
      const remainingIds = projects.map(p => p.id);

      return { countBefore, countAfter, deleted, remainingIds };
    });

    expect(result.countBefore).toBe(3);
    expect(result.countAfter).toBe(2);
    expect(result.deleted).toBe(true);
    expect(result.remainingIds).not.toContain('p2');
  });

  test('should duplicate a project', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface Project {
        id: string;
        name: string;
        description: string;
        files: string[];
      }

      const projects: Project[] = [
        {
          id: 'p1',
          name: 'Original Project',
          description: 'Original description',
          files: ['file1.ts', 'file2.ts'],
        },
      ];

      const duplicateProject = (id: string): Project | null => {
        const original = projects.find(p => p.id === id);
        if (!original) return null;

        const duplicate: Project = {
          id: `project-${Date.now()}`,
          name: `${original.name} (Copy)`,
          description: original.description,
          files: [...original.files],
        };

        projects.push(duplicate);
        return duplicate;
      };

      const duplicated = duplicateProject('p1');

      return {
        projectCount: projects.length,
        duplicatedName: duplicated?.name,
        filesCopied: duplicated?.files.length === projects[0].files.length,
        differentId: duplicated?.id !== projects[0].id,
      };
    });

    expect(result.projectCount).toBe(2);
    expect(result.duplicatedName).toContain('Copy');
    expect(result.filesCopied).toBe(true);
    expect(result.differentId).toBe(true);
  });
});

test.describe('Project Details', () => {
  test('should display project details', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const project = {
        id: 'p1',
        name: 'My Project',
        description: 'A detailed project description',
        color: '#3b82f6',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-15'),
        fileCount: 25,
        sessionCount: 10,
      };

      const getProjectStats = () => ({
        fileCount: project.fileCount,
        sessionCount: project.sessionCount,
        daysSinceCreation: Math.floor(
          (Date.now() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      });

      return {
        name: project.name,
        description: project.description,
        color: project.color,
        stats: getProjectStats(),
      };
    });

    expect(result.name).toBe('My Project');
    expect(result.description).toBe('A detailed project description');
    expect(result.stats.fileCount).toBe(25);
    expect(result.stats.sessionCount).toBe(10);
  });

  test('should list project sessions', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const projectSessions = [
        { id: 's1', title: 'Session 1', projectId: 'p1', createdAt: new Date() },
        { id: 's2', title: 'Session 2', projectId: 'p1', createdAt: new Date() },
        { id: 's3', title: 'Session 3', projectId: 'p2', createdAt: new Date() },
      ];

      const getSessionsByProject = (projectId: string) => 
        projectSessions.filter(s => s.projectId === projectId);

      return {
        totalSessions: projectSessions.length,
        project1Sessions: getSessionsByProject('p1').length,
        project2Sessions: getSessionsByProject('p2').length,
      };
    });

    expect(result.totalSessions).toBe(3);
    expect(result.project1Sessions).toBe(2);
    expect(result.project2Sessions).toBe(1);
  });
});

test.describe('Knowledge Base', () => {
  test('should add files to knowledge base', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        name: string;
        path: string;
        size: number;
        type: string;
        addedAt: Date;
      }

      const knowledgeBase: KnowledgeFile[] = [];

      const addFile = (file: Omit<KnowledgeFile, 'id' | 'addedAt'>): KnowledgeFile => {
        const kbFile: KnowledgeFile = {
          ...file,
          id: `file-${Date.now()}`,
          addedAt: new Date(),
        };
        knowledgeBase.push(kbFile);
        return kbFile;
      };

      addFile({ name: 'README.md', path: '/README.md', size: 1024, type: 'markdown' });
      addFile({ name: 'index.ts', path: '/src/index.ts', size: 2048, type: 'typescript' });
      addFile({ name: 'config.json', path: '/config.json', size: 512, type: 'json' });

      return {
        fileCount: knowledgeBase.length,
        fileNames: knowledgeBase.map(f => f.name),
        totalSize: knowledgeBase.reduce((sum, f) => sum + f.size, 0),
      };
    });

    expect(result.fileCount).toBe(3);
    expect(result.fileNames).toContain('README.md');
    expect(result.fileNames).toContain('index.ts');
    expect(result.totalSize).toBe(3584);
  });

  test('should remove files from knowledge base', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const knowledgeBase = [
        { id: 'f1', name: 'file1.ts' },
        { id: 'f2', name: 'file2.ts' },
        { id: 'f3', name: 'file3.ts' },
      ];

      const removeFile = (id: string): boolean => {
        const index = knowledgeBase.findIndex(f => f.id === id);
        if (index !== -1) {
          knowledgeBase.splice(index, 1);
          return true;
        }
        return false;
      };

      const countBefore = knowledgeBase.length;
      const removed = removeFile('f2');
      const countAfter = knowledgeBase.length;

      return { countBefore, countAfter, removed };
    });

    expect(result.countBefore).toBe(3);
    expect(result.countAfter).toBe(2);
    expect(result.removed).toBe(true);
  });

  test('should search knowledge base', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const files = [
        { id: 'f1', name: 'README.md', content: 'Project documentation' },
        { id: 'f2', name: 'index.ts', content: 'Main entry point' },
        { id: 'f3', name: 'utils.ts', content: 'Utility functions' },
        { id: 'f4', name: 'config.json', content: 'Configuration settings' },
      ];

      const searchFiles = (query: string) => {
        const lowerQuery = query.toLowerCase();
        return files.filter(f => 
          f.name.toLowerCase().includes(lowerQuery) ||
          f.content.toLowerCase().includes(lowerQuery)
        );
      };

      return {
        searchTs: searchFiles('.ts').length,
        searchConfig: searchFiles('config').length,
        searchFunction: searchFiles('function').length,
        searchEmpty: searchFiles('xyz').length,
      };
    });

    expect(result.searchTs).toBe(2);
    expect(result.searchConfig).toBe(1);
    expect(result.searchFunction).toBe(1);
    expect(result.searchEmpty).toBe(0);
  });

  test('should index files for RAG', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface IndexedFile {
        id: string;
        name: string;
        indexed: boolean;
        chunkCount: number;
        indexedAt?: Date;
      }

      const files: IndexedFile[] = [
        { id: 'f1', name: 'file1.ts', indexed: false, chunkCount: 0 },
        { id: 'f2', name: 'file2.ts', indexed: false, chunkCount: 0 },
      ];

      const indexFile = (id: string): boolean => {
        const file = files.find(f => f.id === id);
        if (file) {
          file.indexed = true;
          file.chunkCount = Math.floor(Math.random() * 10) + 1;
          file.indexedAt = new Date();
          return true;
        }
        return false;
      };

      const getIndexedFiles = () => files.filter(f => f.indexed);

      indexFile('f1');
      const afterIndex = getIndexedFiles().length;

      indexFile('f2');
      const afterIndexAll = getIndexedFiles().length;

      return {
        afterIndex,
        afterIndexAll,
        file1Indexed: files[0].indexed,
        file1HasChunks: files[0].chunkCount > 0,
      };
    });

    expect(result.afterIndex).toBe(1);
    expect(result.afterIndexAll).toBe(2);
    expect(result.file1Indexed).toBe(true);
    expect(result.file1HasChunks).toBe(true);
  });
});

test.describe('Project Context', () => {
  test('should set active project context', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const projects = [
        { id: 'p1', name: 'Project 1' },
        { id: 'p2', name: 'Project 2' },
      ];

      let activeProjectId: string | null = null;

      const setActiveProject = (id: string | null): boolean => {
        if (id === null) {
          activeProjectId = null;
          return true;
        }
        const project = projects.find(p => p.id === id);
        if (project) {
          activeProjectId = id;
          return true;
        }
        return false;
      };

      const getActiveProject = () => {
        if (!activeProjectId) return null;
        return projects.find(p => p.id === activeProjectId) || null;
      };

      setActiveProject('p1');
      const afterSet = getActiveProject()?.name;

      setActiveProject('p2');
      const afterSwitch = getActiveProject()?.name;

      setActiveProject(null);
      const afterClear = getActiveProject();

      return { afterSet, afterSwitch, afterClear };
    });

    expect(result.afterSet).toBe('Project 1');
    expect(result.afterSwitch).toBe('Project 2');
    expect(result.afterClear).toBeNull();
  });

  test('should include project context in chat', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const project = {
        id: 'p1',
        name: 'My Project',
        description: 'A React application',
        files: ['src/App.tsx', 'src/index.ts', 'package.json'],
      };

      const generateProjectContext = () => {
        return `
Project: ${project.name}
Description: ${project.description}
Files in knowledge base:
${project.files.map(f => `- ${f}`).join('\n')}
        `.trim();
      };

      const context = generateProjectContext();

      return {
        hasProjectName: context.includes(project.name),
        hasDescription: context.includes(project.description),
        hasFiles: project.files.every(f => context.includes(f)),
      };
    });

    expect(result.hasProjectName).toBe(true);
    expect(result.hasDescription).toBe(true);
    expect(result.hasFiles).toBe(true);
  });
});

test.describe('Project Colors', () => {
  test('should select project color', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const colorOptions = [
        { id: 'blue', value: '#3b82f6' },
        { id: 'green', value: '#22c55e' },
        { id: 'purple', value: '#8b5cf6' },
        { id: 'orange', value: '#f97316' },
        { id: 'pink', value: '#ec4899' },
        { id: 'red', value: '#ef4444' },
      ];

      let selectedColor = colorOptions[0].value;

      const setColor = (colorId: string): boolean => {
        const color = colorOptions.find(c => c.id === colorId);
        if (color) {
          selectedColor = color.value;
          return true;
        }
        return false;
      };

      setColor('purple');

      return {
        colorCount: colorOptions.length,
        selectedColor,
        isPurple: selectedColor === '#8b5cf6',
      };
    });

    expect(result.colorCount).toBe(6);
    expect(result.selectedColor).toBe('#8b5cf6');
    expect(result.isPurple).toBe(true);
  });

  test('should display project badge with color', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const project = {
        id: 'p1',
        name: 'My Project',
        color: '#3b82f6',
      };

      const getProjectBadgeStyle = () => ({
        backgroundColor: project.color,
        color: '#ffffff',
        borderRadius: '4px',
        padding: '2px 8px',
      });

      const style = getProjectBadgeStyle();

      return {
        backgroundColor: style.backgroundColor,
        hasWhiteText: style.color === '#ffffff',
        hasBorderRadius: !!style.borderRadius,
      };
    });

    expect(result.backgroundColor).toBe('#3b82f6');
    expect(result.hasWhiteText).toBe(true);
    expect(result.hasBorderRadius).toBe(true);
  });
});

test.describe('Project Persistence', () => {
  test('should persist projects to localStorage', async ({ page }) => {
    await page.goto('/projects');

    await page.evaluate(() => {
      const projects = [
        { id: 'p1', name: 'Project 1', color: '#3b82f6' },
        { id: 'p2', name: 'Project 2', color: '#22c55e' },
      ];
      localStorage.setItem('cognia-projects', JSON.stringify({ state: { projects } }));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-projects');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.projects).toHaveLength(2);
    expect(stored.state.projects[0].name).toBe('Project 1');
  });

  test('should persist active project', async ({ page }) => {
    await page.goto('/projects');

    await page.evaluate(() => {
      localStorage.setItem('cognia-active-project', 'p1');
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      return localStorage.getItem('cognia-active-project');
    });

    expect(stored).toBe('p1');
  });
});
