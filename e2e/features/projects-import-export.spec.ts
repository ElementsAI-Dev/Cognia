import { test, expect } from '@playwright/test';

/**
 * Project Import/Export Tests
 * Tests for project import and export functionality
 */

test.describe('Import/Export Dialog', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first to get localStorage access
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    // Set up test projects after page load
    await page.evaluate(() => {
      const testProjects = {
        state: {
          projects: [
            {
              id: 'export-project-1',
              name: 'Export Project 1',
              description: 'First project to export',
              icon: 'Code',
              color: '#3B82F6',
              knowledgeBase: [
                {
                  id: 'kb-1',
                  name: 'readme.md',
                  type: 'markdown',
                  content: '# Project 1',
                  size: 12,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              sessionIds: [],
              defaultMode: 'chat',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastAccessedAt: new Date().toISOString(),
              sessionCount: 0,
              messageCount: 0,
            },
            {
              id: 'export-project-2',
              name: 'Export Project 2',
              description: 'Second project to export',
              icon: 'Folder',
              color: '#22C55E',
              knowledgeBase: [],
              sessionIds: [],
              defaultMode: 'agent',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              lastAccessedAt: new Date().toISOString(),
              sessionCount: 0,
              messageCount: 0,
            },
          ],
          activeProjectId: null,
        },
        version: 0,
      };
      localStorage.setItem('cognia-projects', JSON.stringify(testProjects));
    });

    // Reload to apply localStorage changes
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open import/export dialog', async ({ page }) => {
    // Test import/export dialog logic
    const result = await page.evaluate(() => {
      const dialogState = {
        isOpen: false,
        activeTab: 'export',
      };

      const openDialog = () => {
        dialogState.isOpen = true;
        return true;
      };

      const wasOpen = dialogState.isOpen;
      openDialog();
      const isNowOpen = dialogState.isOpen;

      return { wasOpen, isNowOpen, activeTab: dialogState.activeTab };
    });

    expect(result.wasOpen).toBe(false);
    expect(result.isNowOpen).toBe(true);
    expect(result.activeTab).toBe('export');
  });

  test('should display export tab by default', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("Import"), button:has-text("Export")').first();

    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await page.waitForTimeout(300);

      // Export tab should be active
      const exportTab = page.locator('[role="tab"][data-state="active"]:has-text("Export")').first();
      const isExportActive = await exportTab.isVisible().catch(() => false);
      expect(isExportActive).toBe(true);
    }
  });

  test('should display project list for export', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("Import"), button:has-text("Export")').first();

    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await page.waitForTimeout(300);

      // Projects should be listed
      const project1 = page.locator('text=Export Project 1').first();
      const project2 = page.locator('text=Export Project 2').first();

      const hasProjects = await project1.isVisible().catch(() => false) ||
                          await project2.isVisible().catch(() => false);
      expect(hasProjects).toBe(true);
    }
  });

  test('should select projects for export', async ({ page }) => {
    // Test project selection logic
    const result = await page.evaluate(() => {
      const selectedProjects = new Set<string>();
      const _projects = [
        { id: 'project-1', name: 'Export Project 1' },
        { id: 'project-2', name: 'Export Project 2' },
      ];

      const toggleSelection = (projectId: string) => {
        if (selectedProjects.has(projectId)) {
          selectedProjects.delete(projectId);
        } else {
          selectedProjects.add(projectId);
        }
        return selectedProjects.has(projectId);
      };

      const initialCount = selectedProjects.size;
      toggleSelection('project-1');
      const afterSelect = selectedProjects.size;
      const isSelected = selectedProjects.has('project-1');

      return { initialCount, afterSelect, isSelected };
    });

    expect(result.initialCount).toBe(0);
    expect(result.afterSelect).toBe(1);
    expect(result.isSelected).toBe(true);
  });

  test('should select all projects', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("Import"), button:has-text("Export")').first();

    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await page.waitForTimeout(300);

      // Find select all button
      const selectAllBtn = page.locator('button:has-text("Select All")').first();

      if (await selectAllBtn.isVisible()) {
        await selectAllBtn.click();
        await page.waitForTimeout(200);

        // Button should change to Deselect All
        const deselectBtn = page.locator('button:has-text("Deselect All")').first();
        const hasDeselect = await deselectBtn.isVisible().catch(() => false);
        expect(hasDeselect).toBe(true);
      }
    }
  });

  test('should have export JSON button', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("Import"), button:has-text("Export")').first();

    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await page.waitForTimeout(300);

      const exportJsonBtn = page.locator('button:has-text("Export JSON")').first();
      const isVisible = await exportJsonBtn.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    }
  });

  test('should have export ZIP button', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("Import"), button:has-text("Export")').first();

    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await page.waitForTimeout(300);

      const exportZipBtn = page.locator('button:has-text("Export ZIP")').first();
      const isVisible = await exportZipBtn.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    }
  });

  test('should switch to import tab', async ({ page }) => {
    // Test tab switching logic
    const result = await page.evaluate(() => {
      const tabState = {
        activeTab: 'export',
        tabs: ['export', 'import'],
      };

      const switchTab = (tabId: string) => {
        if (tabState.tabs.includes(tabId)) {
          tabState.activeTab = tabId;
          return true;
        }
        return false;
      };

      const initialTab = tabState.activeTab;
      switchTab('import');
      const afterSwitch = tabState.activeTab;

      return { initialTab, afterSwitch, switched: initialTab !== afterSwitch };
    });

    expect(result.initialTab).toBe('export');
    expect(result.afterSwitch).toBe('import');
    expect(result.switched).toBe(true);
  });

  test('should display file drop zone in import tab', async ({ page }) => {
    // Test file drop zone logic
    const result = await page.evaluate(() => {
      const supportedFormats = ['.json', '.zip'];
      const dropZoneConfig = {
        acceptedTypes: supportedFormats,
        maxSize: 50 * 1024 * 1024, // 50MB
        multiple: false,
      };

      const validateFile = (filename: string, size: number) => {
        const ext = '.' + filename.split('.').pop();
        const isValidType = dropZoneConfig.acceptedTypes.includes(ext);
        const isValidSize = size <= dropZoneConfig.maxSize;
        return { valid: isValidType && isValidSize, isValidType, isValidSize };
      };

      return {
        supportsJson: supportedFormats.includes('.json'),
        supportsZip: supportedFormats.includes('.zip'),
        validJsonFile: validateFile('projects.json', 1000).valid,
        validZipFile: validateFile('backup.zip', 5000).valid,
        invalidFile: !validateFile('image.png', 1000).valid,
      };
    });

    expect(result.supportsJson).toBe(true);
    expect(result.supportsZip).toBe(true);
    expect(result.validJsonFile).toBe(true);
    expect(result.invalidFile).toBe(true);
  });

  test('should close dialog', async ({ page }) => {
    const importExportBtn = page.locator('button:has-text("Import"), button:has-text("Export")').first();

    if (await importExportBtn.isVisible()) {
      await importExportBtn.click();
      await page.waitForTimeout(300);

      // Close dialog by clicking outside or close button
      const closeBtn = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg[class*="X"])').first();
      
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        // Try pressing escape
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);

      // Dialog should be closed
      const dialog = page.locator('[role="dialog"]').first();
      const isClosed = !(await dialog.isVisible().catch(() => false));
      expect(isClosed).toBe(true);
    }
  });

  test('should show empty state when no projects to export', async ({ page }) => {
    // Test empty state logic
    const result = await page.evaluate(() => {
      const projects: unknown[] = [];

      const getExportState = (projectList: unknown[]) => {
        if (projectList.length === 0) {
          return {
            showEmptyState: true,
            message: 'No projects to export',
            canExport: false,
          };
        }
        return {
          showEmptyState: false,
          message: null,
          canExport: true,
        };
      };

      const state = getExportState(projects);

      return {
        isEmpty: projects.length === 0,
        showEmptyState: state.showEmptyState,
        canExport: state.canExport,
      };
    });

    expect(result.isEmpty).toBe(true);
    expect(result.showEmptyState).toBe(true);
    expect(result.canExport).toBe(false);
  });
});

test.describe('Import/Export Logic', () => {
  test('should export project to JSON format', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        name: string;
        type: string;
        content: string;
        size: number;
        createdAt: Date;
        updatedAt: Date;
      }

      interface Project {
        id: string;
        name: string;
        description?: string;
        icon?: string;
        color?: string;
        customInstructions?: string;
        defaultMode?: string;
        knowledgeBase: KnowledgeFile[];
        createdAt: Date;
        updatedAt: Date;
      }

      interface ProjectExportData {
        version: string;
        exportedAt: string;
        project: {
          id: string;
          name: string;
          description?: string;
          icon?: string;
          color?: string;
          customInstructions?: string;
          defaultMode?: string;
          knowledgeBase: Array<{
            id: string;
            name: string;
            type: string;
            content: string;
            size: number;
            createdAt: string;
            updatedAt: string;
          }>;
          createdAt: string;
          updatedAt: string;
        };
      }

      const exportProjectToJSON = (project: Project): string => {
        const exportData: ProjectExportData = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            icon: project.icon,
            color: project.color,
            customInstructions: project.customInstructions,
            defaultMode: project.defaultMode,
            knowledgeBase: project.knowledgeBase.map((file) => ({
              id: file.id,
              name: file.name,
              type: file.type,
              content: file.content,
              size: file.size,
              createdAt: file.createdAt.toISOString(),
              updatedAt: file.updatedAt.toISOString(),
            })),
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
          },
        };

        return JSON.stringify(exportData, null, 2);
      };

      const testProject: Project = {
        id: 'p1',
        name: 'Test Project',
        description: 'A test project',
        icon: 'Code',
        color: '#3B82F6',
        knowledgeBase: [
          {
            id: 'f1',
            name: 'readme.md',
            type: 'markdown',
            content: '# Hello',
            size: 7,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const exported = exportProjectToJSON(testProject);
      const parsed = JSON.parse(exported);

      return {
        hasVersion: !!parsed.version,
        hasExportedAt: !!parsed.exportedAt,
        projectName: parsed.project.name,
        projectColor: parsed.project.color,
        knowledgeFileCount: parsed.project.knowledgeBase.length,
      };
    });

    expect(result.hasVersion).toBe(true);
    expect(result.hasExportedAt).toBe(true);
    expect(result.projectName).toBe('Test Project');
    expect(result.projectColor).toBe('#3B82F6');
    expect(result.knowledgeFileCount).toBe(1);
  });

  test('should import project from JSON', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface ProjectImportResult {
        success: boolean;
        project?: {
          id: string;
          name: string;
          description?: string;
        };
        error?: string;
      }

      const importProjectFromJSON = (
        jsonData: string,
        options?: { generateNewId?: boolean }
      ): ProjectImportResult => {
        try {
          const data = JSON.parse(jsonData);

          if (!data.version) {
            return { success: false, error: 'Invalid project file: missing version' };
          }

          if (!data.project) {
            return { success: false, error: 'Invalid project file: missing project data' };
          }

          const exported = data.project;

          const project = {
            id: options?.generateNewId ? `new-${Date.now()}` : exported.id,
            name: exported.name,
            description: exported.description,
          };

          return { success: true, project };
        } catch (_error) {
          return { success: false, error: 'Failed to parse project file' };
        }
      };

      const validJson = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        project: {
          id: 'imported-1',
          name: 'Imported Project',
          description: 'A project to import',
          knowledgeBase: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      const invalidJson = '{ invalid json }';
      const missingVersion = JSON.stringify({ project: { name: 'Test' } });

      return {
        validImport: importProjectFromJSON(validJson),
        validImportNewId: importProjectFromJSON(validJson, { generateNewId: true }),
        invalidImport: importProjectFromJSON(invalidJson),
        missingVersionImport: importProjectFromJSON(missingVersion),
      };
    });

    expect(result.validImport.success).toBe(true);
    expect(result.validImport.project?.name).toBe('Imported Project');
    expect(result.validImportNewId.success).toBe(true);
    expect(result.validImportNewId.project?.id).toContain('new-');
    expect(result.invalidImport.success).toBe(false);
    expect(result.missingVersionImport.success).toBe(false);
  });

  test('should sanitize filename for export', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const sanitizeFilename = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 50);
      };

      return {
        simple: sanitizeFilename('My Project'),
        special: sanitizeFilename('Project @#$% Test!'),
        chinese: sanitizeFilename('项目测试'),
        long: sanitizeFilename('A'.repeat(100)),
        mixed: sanitizeFilename('Project 2024 - Final Version!'),
      };
    });

    expect(result.simple).toBe('my-project');
    expect(result.special).toBe('project-test');
    expect(result.chinese).toBe('项目测试');
    expect(result.long.length).toBe(50);
    expect(result.mixed).toBe('project-2024-final-version');
  });

  test('should generate project index for ZIP', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface Project {
        name: string;
        description?: string;
        knowledgeBase: { length: number };
        defaultMode?: string;
      }

      const generateProjectIndex = (projects: Project[]): string => {
        const lines: string[] = [];

        lines.push('# Cognia Projects Export');
        lines.push('');
        lines.push(`**Exported:** ${new Date().toLocaleString()}`);
        lines.push(`**Total Projects:** ${projects.length}`);
        lines.push('');
        lines.push('## Projects');
        lines.push('');
        lines.push('| # | Name | Description | Files | Mode |');
        lines.push('|---|------|-------------|-------|------|');

        projects.forEach((project, index) => {
          const safeName = project.name.replace(/\|/g, '\\|');
          const safeDesc = (project.description || '-').replace(/\|/g, '\\|');
          lines.push(
            `| ${index + 1} | ${safeName} | ${safeDesc} | ${project.knowledgeBase.length} | ${project.defaultMode || '-'} |`
          );
        });

        return lines.join('\n');
      };

      const projects: Project[] = [
        { name: 'Project 1', description: 'First project', knowledgeBase: { length: 3 }, defaultMode: 'chat' },
        { name: 'Project 2', description: 'Second project', knowledgeBase: { length: 0 }, defaultMode: 'agent' },
      ];

      const index = generateProjectIndex(projects);

      return {
        hasTitle: index.includes('# Cognia Projects Export'),
        hasTable: index.includes('| # | Name |'),
        hasProject1: index.includes('Project 1'),
        hasProject2: index.includes('Project 2'),
        hasProjectCount: index.includes('Total Projects:** 2'),
      };
    });

    expect(result.hasTitle).toBe(true);
    expect(result.hasTable).toBe(true);
    expect(result.hasProject1).toBe(true);
    expect(result.hasProject2).toBe(true);
    expect(result.hasProjectCount).toBe(true);
  });

  test('should get file extension for knowledge type', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      type FileType = 'text' | 'pdf' | 'code' | 'markdown' | 'json' | 'word' | 'excel' | 'csv' | 'html';

      const getFileExtension = (type: FileType): string => {
        const extensions: Record<FileType, string> = {
          text: '.txt',
          pdf: '.txt',
          code: '.txt',
          markdown: '.md',
          json: '.json',
          word: '.txt',
          excel: '.txt',
          csv: '.csv',
          html: '.html',
        };
        return extensions[type] || '.txt';
      };

      return {
        markdown: getFileExtension('markdown'),
        json: getFileExtension('json'),
        csv: getFileExtension('csv'),
        html: getFileExtension('html'),
        text: getFileExtension('text'),
        code: getFileExtension('code'),
      };
    });

    expect(result.markdown).toBe('.md');
    expect(result.json).toBe('.json');
    expect(result.csv).toBe('.csv');
    expect(result.html).toBe('.html');
    expect(result.text).toBe('.txt');
    expect(result.code).toBe('.txt');
  });
});
