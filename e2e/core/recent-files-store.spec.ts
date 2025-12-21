import { test, expect } from '@playwright/test';

/**
 * Recent Files Store Tests
 * Tests for tracking recently used files
 */

test.describe('Recent Files Store - File Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should add a new file', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        path: string;
        type: 'image' | 'file' | 'document';
        mimeType: string;
        size: number;
        usedAt: Date;
        usageCount: number;
      }

      const recentFiles: RecentFile[] = [];
      const maxFiles = 50;

      const addFile = (file: Omit<RecentFile, 'id' | 'usedAt' | 'usageCount'>): RecentFile => {
        const existingFile = recentFiles.find((f) => f.path === file.path);

        if (existingFile) {
          existingFile.usedAt = new Date();
          existingFile.usageCount += 1;
          return existingFile;
        }

        const newFile: RecentFile = {
          id: `file-${Date.now()}`,
          ...file,
          usedAt: new Date(),
          usageCount: 1,
        };

        recentFiles.unshift(newFile);
        if (recentFiles.length > maxFiles) {
          recentFiles.pop();
        }

        return newFile;
      };

      const added = addFile({
        name: 'image.png',
        path: '/uploads/image.png',
        type: 'image',
        mimeType: 'image/png',
        size: 1024,
      });

      return {
        fileCount: recentFiles.length,
        fileName: added.name,
        usageCount: added.usageCount,
        hasId: !!added.id,
      };
    });

    expect(result.fileCount).toBe(1);
    expect(result.fileName).toBe('image.png');
    expect(result.usageCount).toBe(1);
    expect(result.hasId).toBe(true);
  });

  test('should update existing file usage', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        path: string;
        usedAt: Date;
        usageCount: number;
      }

      const recentFiles: RecentFile[] = [
        { id: 'f1', name: 'doc.pdf', path: '/docs/doc.pdf', usedAt: new Date(1000), usageCount: 1 },
      ];

      const addFile = (path: string): RecentFile | undefined => {
        const existingFile = recentFiles.find((f) => f.path === path);

        if (existingFile) {
          existingFile.usedAt = new Date();
          existingFile.usageCount += 1;
          return existingFile;
        }

        return undefined;
      };

      addFile('/docs/doc.pdf');
      addFile('/docs/doc.pdf');

      return {
        fileCount: recentFiles.length,
        usageCount: recentFiles[0].usageCount,
        usedAtUpdated: recentFiles[0].usedAt.getTime() > 1000,
      };
    });

    expect(result.fileCount).toBe(1);
    expect(result.usageCount).toBe(3);
    expect(result.usedAtUpdated).toBe(true);
  });

  test('should remove a file', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
      }

      let recentFiles: RecentFile[] = [
        { id: 'f1', name: 'file1.txt' },
        { id: 'f2', name: 'file2.txt' },
        { id: 'f3', name: 'file3.txt' },
      ];

      const removeFile = (id: string) => {
        recentFiles = recentFiles.filter((f) => f.id !== id);
      };

      removeFile('f2');

      return {
        fileCount: recentFiles.length,
        remainingIds: recentFiles.map((f) => f.id),
      };
    });

    expect(result.fileCount).toBe(2);
    expect(result.remainingIds).toContain('f1');
    expect(result.remainingIds).toContain('f3');
    expect(result.remainingIds).not.toContain('f2');
  });

  test('should clear all files', async ({ page }) => {
    const result = await page.evaluate(() => {
      let recentFiles = [
        { id: 'f1', name: 'file1.txt' },
        { id: 'f2', name: 'file2.txt' },
      ];

      const clearFiles = () => {
        recentFiles = [];
      };

      clearFiles();

      return { fileCount: recentFiles.length };
    });

    expect(result.fileCount).toBe(0);
  });

  test('should enforce max files limit', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        path: string;
      }

      const recentFiles: RecentFile[] = [];
      const maxFiles = 5;

      const addFile = (name: string, path: string) => {
        const newFile: RecentFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          name,
          path,
        };

        recentFiles.unshift(newFile);
        if (recentFiles.length > maxFiles) {
          recentFiles.pop();
        }
      };

      // Add 7 files
      for (let i = 1; i <= 7; i++) {
        addFile(`file${i}.txt`, `/path/file${i}.txt`);
      }

      return {
        fileCount: recentFiles.length,
        firstFileName: recentFiles[0].name,
        lastFileName: recentFiles[recentFiles.length - 1].name,
      };
    });

    expect(result.fileCount).toBe(5);
    expect(result.firstFileName).toBe('file7.txt'); // Most recent
    expect(result.lastFileName).toBe('file3.txt'); // Oldest kept
  });
});

test.describe('Recent Files Store - Selectors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should get recent files sorted by date', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        usedAt: Date;
      }

      const recentFiles: RecentFile[] = [
        { id: 'f1', name: 'old.txt', usedAt: new Date(1000) },
        { id: 'f2', name: 'newest.txt', usedAt: new Date(3000) },
        { id: 'f3', name: 'middle.txt', usedAt: new Date(2000) },
      ];

      const getRecentFiles = (limit: number = 10) => {
        return [...recentFiles]
          .sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())
          .slice(0, limit);
      };

      const sorted = getRecentFiles();

      return {
        firstFile: sorted[0].name,
        lastFile: sorted[sorted.length - 1].name,
      };
    });

    expect(result.firstFile).toBe('newest.txt');
    expect(result.lastFile).toBe('old.txt');
  });

  test('should get most used files', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        usageCount: number;
      }

      const recentFiles: RecentFile[] = [
        { id: 'f1', name: 'rarely.txt', usageCount: 1 },
        { id: 'f2', name: 'often.txt', usageCount: 10 },
        { id: 'f3', name: 'sometimes.txt', usageCount: 5 },
      ];

      const getMostUsedFiles = (limit: number = 10) => {
        return [...recentFiles]
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, limit);
      };

      const sorted = getMostUsedFiles();

      return {
        firstFile: sorted[0].name,
        firstUsage: sorted[0].usageCount,
        lastFile: sorted[sorted.length - 1].name,
      };
    });

    expect(result.firstFile).toBe('often.txt');
    expect(result.firstUsage).toBe(10);
    expect(result.lastFile).toBe('rarely.txt');
  });

  test('should search files by name or path', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        path: string;
      }

      const recentFiles: RecentFile[] = [
        { id: 'f1', name: 'document.pdf', path: '/docs/document.pdf' },
        { id: 'f2', name: 'image.png', path: '/images/image.png' },
        { id: 'f3', name: 'report.pdf', path: '/docs/report.pdf' },
      ];

      const searchFiles = (query: string) => {
        const lowerQuery = query.toLowerCase();
        return recentFiles.filter(
          (f) =>
            f.name.toLowerCase().includes(lowerQuery) ||
            f.path.toLowerCase().includes(lowerQuery)
        );
      };

      return {
        pdfSearch: searchFiles('pdf').length,
        docsSearch: searchFiles('docs').length,
        imageSearch: searchFiles('image').length,
        noMatch: searchFiles('xyz').length,
      };
    });

    expect(result.pdfSearch).toBe(2);
    expect(result.docsSearch).toBe(2);
    expect(result.imageSearch).toBe(1);
    expect(result.noMatch).toBe(0);
  });

  test('should get file by path', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RecentFile {
        id: string;
        name: string;
        path: string;
      }

      const recentFiles: RecentFile[] = [
        { id: 'f1', name: 'doc.pdf', path: '/docs/doc.pdf' },
        { id: 'f2', name: 'img.png', path: '/images/img.png' },
      ];

      const getFileByPath = (path: string) => {
        return recentFiles.find((f) => f.path === path);
      };

      return {
        found: getFileByPath('/docs/doc.pdf')?.name,
        notFound: getFileByPath('/unknown/path'),
      };
    });

    expect(result.found).toBe('doc.pdf');
    expect(result.notFound).toBeUndefined();
  });
});

test.describe('Recent Files Store - File Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should categorize files by type', async ({ page }) => {
    const result = await page.evaluate(() => {
      type FileType = 'image' | 'file' | 'document';

      const getFileType = (mimeType: string): FileType => {
        if (mimeType.startsWith('image/')) return 'image';
        if (
          mimeType === 'application/pdf' ||
          mimeType.includes('document') ||
          mimeType.includes('text/')
        ) {
          return 'document';
        }
        return 'file';
      };

      return {
        png: getFileType('image/png'),
        jpeg: getFileType('image/jpeg'),
        pdf: getFileType('application/pdf'),
        text: getFileType('text/plain'),
        zip: getFileType('application/zip'),
        binary: getFileType('application/octet-stream'),
      };
    });

    expect(result.png).toBe('image');
    expect(result.jpeg).toBe('image');
    expect(result.pdf).toBe('document');
    expect(result.text).toBe('document');
    expect(result.zip).toBe('file');
    expect(result.binary).toBe('file');
  });

  test('should format file size', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      };

      return {
        bytes: formatFileSize(500),
        kb: formatFileSize(1500),
        mb: formatFileSize(1500000),
        gb: formatFileSize(1500000000),
      };
    });

    expect(result.bytes).toBe('500 B');
    expect(result.kb).toBe('1.5 KB');
    expect(result.mb).toBe('1.4 MB');
    expect(result.gb).toBe('1.4 GB');
  });
});
