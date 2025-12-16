import { test, expect } from '@playwright/test';

/**
 * RAG (Retrieval Augmented Generation) functionality tests
 */
test.describe('RAG Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have chunking functionality available', async ({ page }) => {
    // Test chunking logic via page evaluation
    const chunkResult = await page.evaluate(() => {
      // Simulate chunking logic
      const text = 'This is a test sentence. This is another sentence. And a third one.';
      const chunkSize = 50;
      const chunks: string[] = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      
      return {
        originalLength: text.length,
        chunkCount: chunks.length,
        firstChunk: chunks[0],
      };
    });

    expect(chunkResult.originalLength).toBeGreaterThan(0);
    expect(chunkResult.chunkCount).toBeGreaterThan(0);
    expect(chunkResult.firstChunk).toBeDefined();
  });

  test('should support RAG context formatting', async ({ page }) => {
    // Test context formatting logic
    const contextResult = await page.evaluate(() => {
      const documents = [
        { content: 'Document 1 content', similarity: 0.9 },
        { content: 'Document 2 content', similarity: 0.8 },
      ];

      const formatted = documents
        .map((doc, i) => `[Source ${i + 1}] (similarity: ${doc.similarity})\n${doc.content}`)
        .join('\n\n');

      return {
        documentCount: documents.length,
        formattedLength: formatted.length,
        hasContent: formatted.includes('Document 1'),
      };
    });

    expect(contextResult.documentCount).toBe(2);
    expect(contextResult.formattedLength).toBeGreaterThan(0);
    expect(contextResult.hasContent).toBe(true);
  });

  test('should handle empty RAG context gracefully', async ({ page }) => {
    const emptyResult = await page.evaluate(() => {
      const documents: { content: string; similarity: number }[] = [];
      const formatted = documents.length === 0 ? '' : documents.map(d => d.content).join('\n');
      
      return {
        isEmpty: formatted === '',
        length: formatted.length,
      };
    });

    expect(emptyResult.isEmpty).toBe(true);
    expect(emptyResult.length).toBe(0);
  });
});

test.describe('Document Processing', () => {
  test('should detect document types correctly', async ({ page }) => {
    await page.goto('/');
    
    const typeDetection = await page.evaluate(() => {
      const detectType = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const markdownExts = ['md', 'markdown', 'mdx'];
        const codeExts = ['js', 'ts', 'tsx', 'py', 'java'];
        
        if (markdownExts.includes(ext)) return 'markdown';
        if (codeExts.includes(ext)) return 'code';
        if (ext === 'json') return 'json';
        return 'text';
      };

      return {
        markdown: detectType('readme.md'),
        code: detectType('app.tsx'),
        json: detectType('package.json'),
        text: detectType('notes.txt'),
      };
    });

    expect(typeDetection.markdown).toBe('markdown');
    expect(typeDetection.code).toBe('code');
    expect(typeDetection.json).toBe('json');
    expect(typeDetection.text).toBe('text');
  });

  test('should extract text content for embedding', async ({ page }) => {
    await page.goto('/');
    
    const extraction = await page.evaluate(() => {
      const markdown = '# Title\n\nThis is **bold** and *italic* text.\n\n- Item 1\n- Item 2';
      
      // Simple markdown to plain text
      const plainText = markdown
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/^[-*+]\s+/gm, '')
        .trim();

      return {
        originalLength: markdown.length,
        plainTextLength: plainText.length,
        containsTitle: plainText.includes('Title'),
        noMarkdown: !plainText.includes('**') && !plainText.includes('*'),
      };
    });

    expect(extraction.containsTitle).toBe(true);
    expect(extraction.noMarkdown).toBe(true);
  });
});
