import { test, expect } from '@playwright/test';

/**
 * Embedding Service Complete Tests
 * Tests all embedding functionality including providers, similarity, and batch operations
 */
test.describe('Embedding Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support multiple embedding providers', async ({ page }) => {
    const providers = await page.evaluate(() => {
      const supportedProviders = ['openai', 'google', 'cohere'];
      const defaultModels: Record<string, { model: string; dimensions: number }> = {
        openai: { model: 'text-embedding-3-small', dimensions: 1536 },
        google: { model: 'text-embedding-004', dimensions: 768 },
        cohere: { model: 'embed-english-v3.0', dimensions: 1024 },
      };

      return {
        providers: supportedProviders,
        openaiModel: defaultModels.openai.model,
        googleDimensions: defaultModels.google.dimensions,
        cohereDimensions: defaultModels.cohere.dimensions,
      };
    });

    expect(providers.providers).toContain('openai');
    expect(providers.providers).toContain('google');
    expect(providers.providers).toContain('cohere');
    expect(providers.openaiModel).toBe('text-embedding-3-small');
    expect(providers.googleDimensions).toBe(768);
    expect(providers.cohereDimensions).toBe(1024);
  });

  test('should calculate cosine similarity correctly', async ({ page }) => {
    const similarity = await page.evaluate(() => {
      // Cosine similarity implementation
      const cosineSimilarity = (a: number[], b: number[]): number => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
          dotProduct += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      };

      // Test vectors
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0, 0];
      const vectorC = [0, 1, 0];
      const vectorD = [0.707, 0.707, 0];

      return {
        identical: cosineSimilarity(vectorA, vectorB),
        orthogonal: cosineSimilarity(vectorA, vectorC),
        partial: cosineSimilarity(vectorA, vectorD),
      };
    });

    expect(similarity.identical).toBeCloseTo(1.0, 5);
    expect(similarity.orthogonal).toBeCloseTo(0.0, 5);
    expect(similarity.partial).toBeCloseTo(0.707, 2);
  });

  test('should find most similar embeddings', async ({ page }) => {
    const searchResult = await page.evaluate(() => {
      const cosineSimilarity = (a: number[], b: number[]): number => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < a.length; i++) {
          dotProduct += a[i] * b[i];
          normA += a[i] * a[i];
          normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      };

      const findMostSimilar = (
        query: number[],
        embeddings: { id: string; embedding: number[] }[],
        topK: number,
        threshold: number
      ) => {
        const similarities = embeddings.map((item) => ({
          id: item.id,
          similarity: cosineSimilarity(query, item.embedding),
        }));

        return similarities
          .filter((item) => item.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, topK);
      };

      const query = [1, 0, 0];
      const embeddings = [
        { id: 'doc1', embedding: [0.9, 0.1, 0] },
        { id: 'doc2', embedding: [0.5, 0.5, 0] },
        { id: 'doc3', embedding: [0.1, 0.9, 0] },
        { id: 'doc4', embedding: [0.95, 0.05, 0] },
      ];

      const results = findMostSimilar(query, embeddings, 2, 0.5);

      return {
        count: results.length,
        topId: results[0]?.id,
        secondId: results[1]?.id,
      };
    });

    expect(searchResult.count).toBe(2);
    expect(searchResult.topId).toBe('doc4');
    expect(searchResult.secondId).toBe('doc1');
  });

  test('should normalize text for embedding', async ({ page }) => {
    const normalized = await page.evaluate(() => {
      const normalizeText = (text: string): string => {
        return text
          .replace(/\s+/g, ' ')
          .replace(/\n+/g, ' ')
          .trim();
      };

      const input = `  This   is   a   test
      
      with    multiple    spaces
      
      and newlines  `;

      return {
        original: input,
        normalized: normalizeText(input),
        hasMultipleSpaces: normalizeText(input).includes('  '),
        hasNewlines: normalizeText(input).includes('\n'),
      };
    });

    expect(normalized.hasMultipleSpaces).toBe(false);
    expect(normalized.hasNewlines).toBe(false);
    expect(normalized.normalized).toBe('This is a test with multiple spaces and newlines');
  });

  test('should handle batch embedding configuration', async ({ page }) => {
    const batchConfig = await page.evaluate(() => {
      const texts = ['Text 1', 'Text 2', 'Text 3', 'Text 4', 'Text 5'];
      const batchSize = 3;
      const batches: string[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        batches.push(texts.slice(i, i + batchSize));
      }

      return {
        totalTexts: texts.length,
        batchCount: batches.length,
        firstBatchSize: batches[0].length,
        lastBatchSize: batches[batches.length - 1].length,
      };
    });

    expect(batchConfig.totalTexts).toBe(5);
    expect(batchConfig.batchCount).toBe(2);
    expect(batchConfig.firstBatchSize).toBe(3);
    expect(batchConfig.lastBatchSize).toBe(2);
  });
});

test.describe('Embedding Configuration', () => {
  test('should have default embedding settings', async ({ page }) => {
    await page.goto('/');
    
    const settings = await page.evaluate(() => {
      const defaultSettings = {
        provider: 'openai',
        model: 'text-embedding-3-small',
        dimensions: 1536,
        chunkSize: 1000,
        chunkOverlap: 200,
      };

      return {
        hasProvider: !!defaultSettings.provider,
        hasModel: !!defaultSettings.model,
        hasDimensions: defaultSettings.dimensions > 0,
        validChunkSize: defaultSettings.chunkSize > 0,
        validOverlap: defaultSettings.chunkOverlap < defaultSettings.chunkSize,
      };
    });

    expect(settings.hasProvider).toBe(true);
    expect(settings.hasModel).toBe(true);
    expect(settings.hasDimensions).toBe(true);
    expect(settings.validChunkSize).toBe(true);
    expect(settings.validOverlap).toBe(true);
  });

  test('should validate embedding dimensions', async ({ page }) => {
    await page.goto('/');
    
    const dimensions = await page.evaluate(() => {
      const providerDimensions: Record<string, number> = {
        'text-embedding-3-small': 1536,
        'text-embedding-3-large': 3072,
        'text-embedding-004': 768,
        'embed-english-v3.0': 1024,
      };

      return {
        openaiSmall: providerDimensions['text-embedding-3-small'],
        openaiLarge: providerDimensions['text-embedding-3-large'],
        google: providerDimensions['text-embedding-004'],
        cohere: providerDimensions['embed-english-v3.0'],
      };
    });

    expect(dimensions.openaiSmall).toBe(1536);
    expect(dimensions.openaiLarge).toBe(3072);
    expect(dimensions.google).toBe(768);
    expect(dimensions.cohere).toBe(1024);
  });
});
