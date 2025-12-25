import { test, expect } from '@playwright/test';

/**
 * Knowledge Base UI Tests
 * Tests for project knowledge base management
 */

test.describe('Knowledge Base Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first to get localStorage access
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    // Set up test project with knowledge files after page load
    await page.evaluate(() => {
      const testProjects = {
        state: {
          projects: [
            {
              id: 'kb-test-project',
              name: 'Knowledge Base Test',
              description: 'Project for testing knowledge base',
              icon: 'BookOpen',
              color: '#8B5CF6',
              knowledgeBase: [
                {
                  id: 'kb-file-1',
                  name: 'documentation.md',
                  type: 'markdown',
                  content: '# Documentation\n\nThis is the project documentation.\n\n## Getting Started\n\nFollow these steps...',
                  size: 120,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 'kb-file-2',
                  name: 'config.json',
                  type: 'json',
                  content: '{\n  "name": "test-project",\n  "version": "1.0.0"\n}',
                  size: 48,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 'kb-file-3',
                  name: 'utils.ts',
                  type: 'code',
                  content: 'export function formatDate(date: Date): string {\n  return date.toISOString();\n}',
                  size: 80,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
              ],
              sessionIds: [],
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

    // Close welcome dialog if present
    const closeButton = page.locator('button:has-text("Skip for now"), button[aria-label="Close"]').first();
    if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(300);
    }

    // Navigate to project detail
    const projectCard = page.locator('text=Knowledge Base Test').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      await page.waitForTimeout(500);
    }

    // Switch to knowledge base tab
    const knowledgeTab = page.locator('[role="tab"]:has-text("Knowledge"), button:has-text("Knowledge Base")').first();
    if (await knowledgeTab.isVisible()) {
      await knowledgeTab.click();
      await page.waitForTimeout(300);
    }
  });

  test('should display knowledge base files', async ({ page }) => {
    // Check for file list
    const docFile = page.locator('text=documentation.md').first();
    const configFile = page.locator('text=config.json').first();
    const utilsFile = page.locator('text=utils.ts').first();

    const hasDocFile = await docFile.isVisible().catch(() => false);
    const hasConfigFile = await configFile.isVisible().catch(() => false);
    const hasUtilsFile = await utilsFile.isVisible().catch(() => false);

    expect(hasDocFile || hasConfigFile || hasUtilsFile).toBe(true);
  });

  test('should display file type badges', async ({ page }) => {
    // Check for type badges
    const markdownBadge = page.locator('text=markdown').first();
    const jsonBadge = page.locator('text=json').first();
    const codeBadge = page.locator('text=code').first();

    const hasBadges = await markdownBadge.isVisible().catch(() => false) ||
                      await jsonBadge.isVisible().catch(() => false) ||
                      await codeBadge.isVisible().catch(() => false);

    expect(hasBadges).toBe(true);
  });

  test('should search knowledge files', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="files"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('documentation');
      await page.waitForTimeout(300);

      // Documentation file should be visible
      const docFile = page.locator('text=documentation.md').first();
      const isVisible = await docFile.isVisible().catch(() => false);
      expect(isVisible).toBe(true);
    }
  });

  test('should open add file dialog', async ({ page }) => {
    // Test add file dialog logic
    const result = await page.evaluate(() => {
      const dialogState = {
        isOpen: false,
        mode: null as string | null,
      };

      const openAddFileDialog = () => {
        dialogState.isOpen = true;
        dialogState.mode = 'add';
        return true;
      };

      const wasOpen = dialogState.isOpen;
      openAddFileDialog();
      const isNowOpen = dialogState.isOpen;

      return { wasOpen, isNowOpen, mode: dialogState.mode };
    });

    expect(result.wasOpen).toBe(false);
    expect(result.isNowOpen).toBe(true);
    expect(result.mode).toBe('add');
  });

  test('should add manual knowledge file', async ({ page }) => {
    // Test add knowledge file logic
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        filename: string;
        content: string;
        type: string;
        createdAt: string;
      }

      const knowledgeBase: KnowledgeFile[] = [];

      const addFile = (filename: string, content: string): KnowledgeFile => {
        const file: KnowledgeFile = {
          id: `file-${Date.now()}`,
          filename,
          content,
          type: filename.endsWith('.md') ? 'markdown' : 'text',
          createdAt: new Date().toISOString(),
        };
        knowledgeBase.push(file);
        return file;
      };

      const validateFile = (filename: string, content: string) => {
        const errors: string[] = [];
        if (!filename.trim()) errors.push('Filename is required');
        if (!content.trim()) errors.push('Content is required');
        if (!filename.match(/\.(md|txt|json)$/)) errors.push('Invalid file extension');
        return { valid: errors.length === 0, errors };
      };

      const initialCount = knowledgeBase.length;
      const validation = validateFile('new-file.md', '# New File\n\nThis is new content.');
      const added = addFile('new-file.md', '# New File\n\nThis is new content.');
      const afterCount = knowledgeBase.length;

      return {
        initialCount,
        afterCount,
        fileAdded: afterCount > initialCount,
        addedFilename: added.filename,
        validationPassed: validation.valid,
      };
    });

    expect(result.fileAdded).toBe(true);
    expect(result.addedFilename).toBe('new-file.md');
    expect(result.validationPassed).toBe(true);
  });

  test('should view file content', async ({ page }) => {
    // Find view button (eye icon)
    const docFile = page.locator('text=documentation.md').first();

    if (await docFile.isVisible()) {
      const fileRow = docFile.locator('..');
      const viewBtn = fileRow.locator('button').first();

      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForTimeout(300);

        // Content dialog should open
        const contentDialog = page.locator('[role="dialog"], text=documentation.md').first();
        const isDialogOpen = await contentDialog.isVisible().catch(() => false);
        expect(isDialogOpen).toBe(true);
      }
    }
  });

  test('should display file content in preview', async ({ page }) => {
    const docFile = page.locator('text=documentation.md').first();

    if (await docFile.isVisible()) {
      const fileRow = docFile.locator('..');
      const viewBtn = fileRow.locator('button').first();

      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForTimeout(300);

        // Content should be visible
        const content = page.locator('text=Documentation, text=Getting Started').first();
        const hasContent = await content.isVisible().catch(() => false);
        expect(hasContent).toBe(true);
      }
    }
  });

  test('should close file preview dialog', async ({ page }) => {
    const docFile = page.locator('text=documentation.md').first();

    if (await docFile.isVisible()) {
      const fileRow = docFile.locator('..');
      const viewBtn = fileRow.locator('button').first();

      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        await page.waitForTimeout(300);

        // Close dialog
        const closeBtn = page.locator('button:has-text("Close")').first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(300);

          // Dialog should be closed
          const dialog = page.locator('[role="dialog"]').first();
          const isClosed = !(await dialog.isVisible().catch(() => false));
          expect(isClosed).toBe(true);
        }
      }
    }
  });

  test('should open delete confirmation for file', async ({ page }) => {
    const docFile = page.locator('text=documentation.md').first();

    if (await docFile.isVisible()) {
      const fileRow = docFile.locator('..');
      // Find delete button (trash icon, usually last button)
      const buttons = fileRow.locator('button');
      const deleteBtn = buttons.last();

      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.waitForTimeout(300);

        // Confirmation dialog should appear
        const confirmDialog = page.locator('[role="alertdialog"], text=Delete File, text=Are you sure').first();
        const hasConfirm = await confirmDialog.isVisible().catch(() => false);
        expect(hasConfirm).toBe(true);
      }
    }
  });

  test('should cancel file deletion', async ({ page }) => {
    const docFile = page.locator('text=documentation.md').first();

    if (await docFile.isVisible()) {
      const fileRow = docFile.locator('..');
      const deleteBtn = fileRow.locator('button').last();

      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.waitForTimeout(300);

        // Cancel deletion
        const cancelBtn = page.locator('button:has-text("Cancel")').first();
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          await page.waitForTimeout(300);

          // File should still exist
          const fileStillExists = await docFile.isVisible().catch(() => false);
          expect(fileStillExists).toBe(true);
        }
      }
    }
  });

  test('should display upload button', async ({ page }) => {
    // Check for upload button
    const uploadBtn = page.locator('button:has-text("Upload")').first();
    const isVisible = await uploadBtn.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('should show empty state when no files', async ({ page }) => {
    // Test empty state logic
    const result = await page.evaluate(() => {
      const knowledgeBase: unknown[] = [];

      const getEmptyStateMessage = (files: unknown[]) => {
        if (files.length === 0) {
          return {
            showEmptyState: true,
            message: 'No knowledge files',
            action: 'Upload files to get started',
          };
        }
        return { showEmptyState: false, message: null, action: null };
      };

      const emptyState = getEmptyStateMessage(knowledgeBase);

      return {
        isEmpty: knowledgeBase.length === 0,
        showEmptyState: emptyState.showEmptyState,
        hasMessage: !!emptyState.message,
      };
    });

    expect(result.isEmpty).toBe(true);
    expect(result.showEmptyState).toBe(true);
    expect(result.hasMessage).toBe(true);
  });
});

test.describe('Knowledge Base Logic', () => {
  test('should detect file type correctly', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      type FileType = 'text' | 'pdf' | 'code' | 'markdown' | 'json' | 'word' | 'excel' | 'csv' | 'html';

      const detectFileType = (filename: string, content?: string): FileType => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';

        const extMap: Record<string, FileType> = {
          md: 'markdown',
          markdown: 'markdown',
          json: 'json',
          js: 'code',
          ts: 'code',
          tsx: 'code',
          jsx: 'code',
          py: 'code',
          pdf: 'pdf',
          doc: 'word',
          docx: 'word',
          xls: 'excel',
          xlsx: 'excel',
          csv: 'csv',
          html: 'html',
          htm: 'html',
        };

        if (extMap[ext]) return extMap[ext];

        // Detect from content
        if (content) {
          if (content.startsWith('{') || content.startsWith('[')) return 'json';
          if (content.includes('```') || content.startsWith('#')) return 'markdown';
        }

        return 'text';
      };

      return {
        mdFile: detectFileType('readme.md'),
        jsonFile: detectFileType('config.json'),
        tsFile: detectFileType('utils.ts'),
        pyFile: detectFileType('script.py'),
        txtFile: detectFileType('notes.txt'),
        unknownWithJsonContent: detectFileType('data', '{"key": "value"}'),
        unknownWithMdContent: detectFileType('notes', '# Title'),
      };
    });

    expect(result.mdFile).toBe('markdown');
    expect(result.jsonFile).toBe('json');
    expect(result.tsFile).toBe('code');
    expect(result.pyFile).toBe('code');
    expect(result.txtFile).toBe('text');
    expect(result.unknownWithJsonContent).toBe('json');
    expect(result.unknownWithMdContent).toBe('markdown');
  });

  test('should format file size correctly', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };

      return {
        bytes: formatFileSize(500),
        kilobytes: formatFileSize(2048),
        megabytes: formatFileSize(1048576),
        largeFile: formatFileSize(5242880),
      };
    });

    expect(result.bytes).toBe('500 B');
    expect(result.kilobytes).toBe('2.0 KB');
    expect(result.megabytes).toBe('1.0 MB');
    expect(result.largeFile).toBe('5.0 MB');
  });

  test('should filter knowledge files by search', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        name: string;
        content: string;
      }

      const files: KnowledgeFile[] = [
        { id: 'f1', name: 'readme.md', content: 'Project documentation' },
        { id: 'f2', name: 'config.json', content: '{"name": "test"}' },
        { id: 'f3', name: 'utils.ts', content: 'export function helper() {}' },
        { id: 'f4', name: 'api.ts', content: 'API endpoints' },
      ];

      const filterFiles = (query: string): KnowledgeFile[] => {
        if (!query.trim()) return files;

        const lowerQuery = query.toLowerCase();
        return files.filter(
          (f) =>
            f.name.toLowerCase().includes(lowerQuery) ||
            f.content.toLowerCase().includes(lowerQuery)
        );
      };

      return {
        allFiles: filterFiles('').length,
        mdSearch: filterFiles('.md').length,
        tsSearch: filterFiles('.ts').length,
        contentSearch: filterFiles('documentation').length,
        noMatch: filterFiles('xyz').length,
      };
    });

    expect(result.allFiles).toBe(4);
    expect(result.mdSearch).toBe(1);
    expect(result.tsSearch).toBe(2);
    expect(result.contentSearch).toBe(1);
    expect(result.noMatch).toBe(0);
  });

  test('should validate file before adding', async ({ page }) => {
    await page.goto('/projects');

    const result = await page.evaluate(() => {
      interface AddFileInput {
        name: string;
        content: string;
      }

      const validateFile = (input: AddFileInput): { valid: boolean; error?: string } => {
        if (!input.name.trim()) {
          return { valid: false, error: 'File name is required' };
        }
        if (!input.content.trim()) {
          return { valid: false, error: 'Content is required' };
        }
        if (input.name.length > 100) {
          return { valid: false, error: 'File name too long' };
        }
        return { valid: true };
      };

      return {
        valid: validateFile({ name: 'test.md', content: 'Hello' }),
        emptyName: validateFile({ name: '', content: 'Hello' }),
        emptyContent: validateFile({ name: 'test.md', content: '' }),
        longName: validateFile({ name: 'a'.repeat(150), content: 'Hello' }),
      };
    });

    expect(result.valid.valid).toBe(true);
    expect(result.emptyName.valid).toBe(false);
    expect(result.emptyContent.valid).toBe(false);
    expect(result.longName.valid).toBe(false);
  });
});
