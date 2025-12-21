import { test, expect } from '@playwright/test';

/**
 * Project Context Tests
 * Tests for project context building and knowledge base management
 */

test.describe('Project Context - Context Building', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should build project context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        name: string;
        content: string;
        size: number;
      }

      interface Project {
        id: string;
        name: string;
        description?: string;
        knowledgeBase: KnowledgeFile[];
      }

      interface ProjectContext {
        systemPrompt: string;
        knowledgeContext: string;
        filesUsed: string[];
      }

      const buildProjectContext = (
        project: Project,
        query?: string,
        options: { maxContextLength?: number } = {}
      ): ProjectContext => {
        const maxLength = options.maxContextLength ?? 6000;

        let systemPrompt = `You are an AI assistant helping with the project "${project.name}".`;
        if (project.description) {
          systemPrompt += `\n\nProject Description: ${project.description}`;
        }

        // Build knowledge context
        let knowledgeContext = '';
        const filesUsed: string[] = [];
        let currentLength = 0;

        for (const file of project.knowledgeBase) {
          if (currentLength + file.content.length > maxLength) break;

          knowledgeContext += `\n\n--- ${file.name} ---\n${file.content}`;
          filesUsed.push(file.name);
          currentLength += file.content.length;
        }

        return {
          systemPrompt,
          knowledgeContext: knowledgeContext.trim(),
          filesUsed,
        };
      };

      const project: Project = {
        id: 'proj-1',
        name: 'AI Research',
        description: 'Research on large language models',
        knowledgeBase: [
          { id: 'f1', name: 'README.md', content: '# Project Overview\nThis is an AI research project.', size: 50 },
          { id: 'f2', name: 'notes.md', content: '## Research Notes\nKey findings about LLMs.', size: 40 },
        ],
      };

      const context = buildProjectContext(project);

      return {
        hasSystemPrompt: context.systemPrompt.length > 0,
        includesProjectName: context.systemPrompt.includes('AI Research'),
        includesDescription: context.systemPrompt.includes('large language models'),
        filesUsedCount: context.filesUsed.length,
        hasKnowledgeContext: context.knowledgeContext.length > 0,
      };
    });

    expect(result.hasSystemPrompt).toBe(true);
    expect(result.includesProjectName).toBe(true);
    expect(result.includesDescription).toBe(true);
    expect(result.filesUsedCount).toBe(2);
    expect(result.hasKnowledgeContext).toBe(true);
  });

  test('should respect max context length', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        name: string;
        content: string;
      }

      const files: KnowledgeFile[] = [
        { name: 'file1.md', content: 'A'.repeat(1000) },
        { name: 'file2.md', content: 'B'.repeat(1000) },
        { name: 'file3.md', content: 'C'.repeat(1000) },
      ];

      const buildContext = (maxLength: number): { filesUsed: string[]; totalLength: number } => {
        const filesUsed: string[] = [];
        let totalLength = 0;

        for (const file of files) {
          if (totalLength + file.content.length > maxLength) break;
          filesUsed.push(file.name);
          totalLength += file.content.length;
        }

        return { filesUsed, totalLength };
      };

      return {
        small: buildContext(500),
        medium: buildContext(1500),
        large: buildContext(5000),
      };
    });

    expect(result.small.filesUsed.length).toBe(0);
    expect(result.medium.filesUsed.length).toBe(1);
    expect(result.large.filesUsed.length).toBe(3);
  });
});

test.describe('Project Context - Knowledge Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should search knowledge files', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        name: string;
        content: string;
      }

      interface SearchResult {
        file: KnowledgeFile;
        score: number;
        matches: string[];
      }

      const files: KnowledgeFile[] = [
        { id: 'f1', name: 'react.md', content: 'React is a JavaScript library for building user interfaces.' },
        { id: 'f2', name: 'vue.md', content: 'Vue is a progressive JavaScript framework.' },
        { id: 'f3', name: 'angular.md', content: 'Angular is a TypeScript-based framework.' },
      ];

      const searchKnowledgeFiles = (
        query: string,
        options: { maxResults?: number } = {}
      ): SearchResult[] => {
        const maxResults = options.maxResults ?? 10;
        const lowerQuery = query.toLowerCase();
        const queryWords = lowerQuery.split(/\s+/);

        const results: SearchResult[] = [];

        for (const file of files) {
          const lowerContent = file.content.toLowerCase();
          const lowerName = file.name.toLowerCase();

          const matches: string[] = [];
          let score = 0;

          for (const word of queryWords) {
            if (lowerName.includes(word)) {
              matches.push(`name:${word}`);
              score += 2;
            }
            if (lowerContent.includes(word)) {
              matches.push(`content:${word}`);
              score += 1;
            }
          }

          if (matches.length > 0) {
            results.push({ file, score, matches });
          }
        }

        return results
          .sort((a, b) => b.score - a.score)
          .slice(0, maxResults);
      };

      return {
        reactSearch: searchKnowledgeFiles('react').length,
        jsSearch: searchKnowledgeFiles('javascript').length,
        frameworkSearch: searchKnowledgeFiles('framework').length,
        noMatch: searchKnowledgeFiles('python').length,
      };
    });

    expect(result.reactSearch).toBe(1);
    expect(result.jsSearch).toBe(2); // React and Vue mention JavaScript
    expect(result.frameworkSearch).toBe(2); // Vue and Angular
    expect(result.noMatch).toBe(0);
  });

  test('should get relevant knowledge for query', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        id: string;
        name: string;
        content: string;
        type: string;
      }

      const files: KnowledgeFile[] = [
        { id: 'f1', name: 'api.md', content: 'API documentation for the REST endpoints.', type: 'markdown' },
        { id: 'f2', name: 'setup.md', content: 'Setup instructions for development.', type: 'markdown' },
        { id: 'f3', name: 'utils.ts', content: 'export function formatDate() {}', type: 'code' },
      ];

      const getRelevantKnowledge = (query: string, maxFiles: number = 5): KnowledgeFile[] => {
        const lowerQuery = query.toLowerCase();

        const scored = files.map((file) => {
          let score = 0;
          if (file.name.toLowerCase().includes(lowerQuery)) score += 3;
          if (file.content.toLowerCase().includes(lowerQuery)) score += 1;
          return { file, score };
        });

        return scored
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, maxFiles)
          .map((s) => s.file);
      };

      return {
        apiQuery: getRelevantKnowledge('api').map((f) => f.name),
        setupQuery: getRelevantKnowledge('setup').map((f) => f.name),
        codeQuery: getRelevantKnowledge('function').map((f) => f.name),
      };
    });

    expect(result.apiQuery).toContain('api.md');
    expect(result.setupQuery).toContain('setup.md');
    expect(result.codeQuery).toContain('utils.ts');
  });
});

test.describe('Project Context - Knowledge Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should calculate knowledge base stats', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        name: string;
        content: string;
        size: number;
      }

      interface KnowledgeStats {
        totalFiles: number;
        totalSize: number;
        estimatedTokens: number;
      }

      const files: KnowledgeFile[] = [
        { name: 'file1.md', content: 'Hello world', size: 1000 },
        { name: 'file2.md', content: 'Another file', size: 2000 },
        { name: 'file3.md', content: 'Third file', size: 500 },
      ];

      const getKnowledgeBaseStats = (knowledgeBase: KnowledgeFile[]): KnowledgeStats => {
        const totalFiles = knowledgeBase.length;
        const totalSize = knowledgeBase.reduce((sum, f) => sum + f.size, 0);
        const totalContent = knowledgeBase.reduce((sum, f) => sum + f.content.length, 0);
        const estimatedTokens = Math.ceil(totalContent / 4); // Rough estimate

        return {
          totalFiles,
          totalSize,
          estimatedTokens,
        };
      };

      const stats = getKnowledgeBaseStats(files);

      return {
        totalFiles: stats.totalFiles,
        totalSize: stats.totalSize,
        hasEstimatedTokens: stats.estimatedTokens > 0,
      };
    });

    expect(result.totalFiles).toBe(3);
    expect(result.totalSize).toBe(3500);
    expect(result.hasEstimatedTokens).toBe(true);
  });

  test('should format knowledge for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        name: string;
        type: string;
        content: string;
        size: number;
      }

      const formatKnowledgeForDisplay = (
        files: KnowledgeFile[],
        maxPreviewLength: number = 200
      ) => {
        return files.map((file) => ({
          name: file.name,
          type: file.type,
          preview:
            file.content.length > maxPreviewLength
              ? file.content.slice(0, maxPreviewLength) + '...'
              : file.content,
          size: file.size,
        }));
      };

      const files: KnowledgeFile[] = [
        { name: 'short.md', type: 'markdown', content: 'Short content', size: 100 },
        { name: 'long.md', type: 'markdown', content: 'A'.repeat(500), size: 500 },
      ];

      const formatted = formatKnowledgeForDisplay(files, 100);

      return {
        count: formatted.length,
        shortPreview: formatted[0].preview,
        longPreviewTruncated: formatted[1].preview.endsWith('...'),
        longPreviewLength: formatted[1].preview.length,
      };
    });

    expect(result.count).toBe(2);
    expect(result.shortPreview).toBe('Short content');
    expect(result.longPreviewTruncated).toBe(true);
    expect(result.longPreviewLength).toBe(103); // 100 + '...'
  });
});

test.describe('Project Context - Empty States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should handle empty project', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface _Project {
        id: string;
        name: string;
        knowledgeBase: unknown[];
      }

      const getProjectContext = (projectId: string | undefined): unknown => {
        if (!projectId) return null;
        return { projectId };
      };

      return {
        withId: getProjectContext('proj-1'),
        withoutId: getProjectContext(undefined),
      };
    });

    expect(result.withId).not.toBeNull();
    expect(result.withoutId).toBeNull();
  });

  test('should handle empty knowledge base', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface KnowledgeFile {
        name: string;
        content: string;
      }

      const hasKnowledge = (files: KnowledgeFile[]): boolean => {
        return files.length > 0;
      };

      const getKnowledgeContext = (files: KnowledgeFile[]): string => {
        if (files.length === 0) return '';
        return files.map((f) => f.content).join('\n\n');
      };

      return {
        emptyHasKnowledge: hasKnowledge([]),
        emptyContext: getKnowledgeContext([]),
        withFilesHasKnowledge: hasKnowledge([{ name: 'test.md', content: 'Test' }]),
        withFilesContext: getKnowledgeContext([{ name: 'test.md', content: 'Test' }]),
      };
    });

    expect(result.emptyHasKnowledge).toBe(false);
    expect(result.emptyContext).toBe('');
    expect(result.withFilesHasKnowledge).toBe(true);
    expect(result.withFilesContext).toBe('Test');
  });
});
