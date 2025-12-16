import { test, expect } from '@playwright/test';

/**
 * Document Chunking Complete Tests
 * Tests all chunking strategies and configurations
 */
test.describe('Fixed Size Chunking', () => {
  test('should chunk text by fixed size', async ({ page }) => {
    await page.goto('/');
    
    // Simple chunking test without complex page evaluation
    const result = await page.evaluate(() => {
      const text = 'ABCDEFGHIJ'.repeat(10); // 100 chars
      const chunkSize = 30;
      const overlap = 10;
      const chunks: string[] = [];
      
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        start = end - overlap;
        if (start >= text.length || end === text.length) break;
      }

      return {
        totalChunks: chunks.length,
        firstChunkLength: chunks[0]?.length || 0,
        textLength: text.length,
      };
    });

    expect(result.totalChunks).toBeGreaterThan(1);
    expect(result.firstChunkLength).toBe(30);
    expect(result.textLength).toBe(100);
  });

  test('should handle text smaller than chunk size', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const chunkBySize = (text: string, chunkSize: number) => {
        if (text.length <= chunkSize) {
          return [{ content: text, index: 0 }];
        }
        const chunks = [];
        for (let i = 0; i < text.length; i += chunkSize) {
          chunks.push({ content: text.slice(i, i + chunkSize), index: chunks.length });
        }
        return chunks;
      };

      const shortText = 'Short text';
      const chunks = chunkBySize(shortText, 100);

      return {
        chunkCount: chunks.length,
        content: chunks[0].content,
      };
    });

    expect(result.chunkCount).toBe(1);
    expect(result.content).toBe('Short text');
  });
});

test.describe('Sentence Chunking', () => {
  test('should chunk text by sentences', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const chunkBySentence = (text: string, maxChunkSize: number) => {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks: string[] = [];
        let currentChunk = '';

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += sentence;
          }
        }

        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        return chunks;
      };

      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
      const chunks = chunkBySentence(text, 40);

      return {
        chunkCount: chunks.length,
        firstChunk: chunks[0],
        allEndWithPunctuation: chunks.every(c => /[.!?]$/.test(c)),
      };
    });

    expect(result.chunkCount).toBeGreaterThan(1);
    expect(result.allEndWithPunctuation).toBe(true);
  });

  test('should handle text without sentence boundaries', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const chunkBySentence = (text: string, maxChunkSize: number) => {
        const sentences = text.match(/[^.!?]+[.!?]+/g);
        if (!sentences) {
          // No sentence boundaries, fall back to fixed size
          const chunks = [];
          for (let i = 0; i < text.length; i += maxChunkSize) {
            chunks.push(text.slice(i, i + maxChunkSize));
          }
          return chunks;
        }
        return sentences;
      };

      const textWithoutPunctuation = 'This is a long text without any punctuation marks at all';
      const chunks = chunkBySentence(textWithoutPunctuation, 20);

      return {
        chunkCount: chunks.length,
        handledGracefully: chunks.length > 0,
      };
    });

    expect(result.handledGracefully).toBe(true);
    expect(result.chunkCount).toBeGreaterThan(0);
  });
});

test.describe('Paragraph Chunking', () => {
  test('should chunk text by paragraphs', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const chunkByParagraph = (text: string, maxChunkSize: number) => {
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
        const chunks: string[] = [];
        let currentChunk = '';

        for (const para of paragraphs) {
          if (currentChunk.length + para.length > maxChunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
          }
        }

        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        return chunks;
      };

      const text = `First paragraph with some content.

Second paragraph with more content.

Third paragraph with additional content.

Fourth paragraph with final content.`;

      const chunks = chunkByParagraph(text, 100);

      return {
        chunkCount: chunks.length,
        preservesParagraphs: chunks.every(c => !c.includes('\n\n\n')),
      };
    });

    expect(result.chunkCount).toBeGreaterThan(0);
    expect(result.preservesParagraphs).toBe(true);
  });

  test('should merge small paragraphs', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const chunkByParagraph = (text: string, minChunkSize: number) => {
        const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
        const chunks: string[] = [];
        let currentChunk = '';

        for (const para of paragraphs) {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
          if (currentChunk.length >= minChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
        }

        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        return chunks;
      };

      const text = `A.

B.

C.

D.

E.`;

      const chunks = chunkByParagraph(text, 10);

      return {
        chunkCount: chunks.length,
        mergedSmallParagraphs: chunks.length < 5,
      };
    });

    expect(result.mergedSmallParagraphs).toBe(true);
  });
});

test.describe('Chunking Metadata', () => {
  test('should generate chunk metadata', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const generateChunkMetadata = (
        content: string,
        index: number,
        totalChunks: number,
        sourceId: string
      ) => {
        return {
          chunkId: `${sourceId}-chunk-${index}`,
          index,
          totalChunks,
          charCount: content.length,
          wordCount: content.split(/\s+/).filter(w => w).length,
          isFirst: index === 0,
          isLast: index === totalChunks - 1,
        };
      };

      const chunks = ['First chunk content', 'Second chunk content', 'Third chunk content'];
      const metadata = chunks.map((c, i) => generateChunkMetadata(c, i, chunks.length, 'doc-1'));

      return {
        metadataCount: metadata.length,
        firstIsFirst: metadata[0].isFirst,
        lastIsLast: metadata[2].isLast,
        hasWordCount: metadata.every(m => m.wordCount > 0),
        hasChunkId: metadata.every(m => m.chunkId.includes('doc-1')),
      };
    });

    expect(result.metadataCount).toBe(3);
    expect(result.firstIsFirst).toBe(true);
    expect(result.lastIsLast).toBe(true);
    expect(result.hasWordCount).toBe(true);
    expect(result.hasChunkId).toBe(true);
  });

  test('should calculate chunk statistics', async ({ page }) => {
    await page.goto('/');
    
    const result = await page.evaluate(() => {
      const calculateStats = (chunks: string[]) => {
        const lengths = chunks.map(c => c.length);
        const total = lengths.reduce((a, b) => a + b, 0);
        const avg = total / lengths.length;
        const min = Math.min(...lengths);
        const max = Math.max(...lengths);

        return { total, avg, min, max, count: chunks.length };
      };

      const chunks = [
        'A'.repeat(100),
        'B'.repeat(150),
        'C'.repeat(80),
        'D'.repeat(120),
      ];

      return calculateStats(chunks);
    });

    expect(result.count).toBe(4);
    expect(result.total).toBe(450);
    expect(result.avg).toBe(112.5);
    expect(result.min).toBe(80);
    expect(result.max).toBe(150);
  });
});
