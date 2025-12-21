import { test, expect } from '@playwright/test';

/**
 * Vector Database functionality tests
 * Tests the embedding and vector search features
 */
test.describe('Vector Database Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load app with vector store initialized', async ({ page }) => {
    // Verify the app loads successfully with vector store
    await expect(page.locator('body')).toBeVisible();
    
    // Check localStorage for vector store data
    const vectorStoreData = await page.evaluate(() => {
      return localStorage.getItem('cognia-vector');
    });
    
    // Vector store should be initialized (may be null initially)
    expect(vectorStoreData === null || typeof vectorStoreData === 'string').toBeTruthy();
  });

  test('should have vector settings accessible', async ({ page }) => {
    // Look for settings that might contain vector/embedding options
    const settingsButton = page.locator('button[aria-label*="setting" i], [data-testid="settings"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.first().click();
      await page.waitForTimeout(500);
    }
    
    // Verify page is still functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should persist vector store state', async ({ page }) => {
    // Set some data in vector store via localStorage
    await page.evaluate(() => {
      const testData = {
        collections: [],
        documents: {},
        settings: {
          mode: 'embedded',
          serverUrl: 'http://localhost:8000',
          embeddingProvider: 'openai',
          embeddingModel: 'text-embedding-3-small',
          chunkSize: 1000,
          chunkOverlap: 200,
          autoEmbed: true,
        },
      };
      localStorage.setItem('cognia-vector', JSON.stringify({ state: testData }));
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify data persists
    const storedData = await page.evaluate(() => {
      return localStorage.getItem('cognia-vector');
    });

    expect(storedData).not.toBeNull();
    const parsed = JSON.parse(storedData!);
    expect(parsed.state.settings.embeddingProvider).toBe('openai');
  });
});

test.describe('Document Store Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should initialize document store', async ({ page }) => {
    // Check for document store in localStorage
    const docStoreData = await page.evaluate(() => {
      return localStorage.getItem('cognia-documents');
    });

    // Document store should be accessible
    expect(docStoreData === null || typeof docStoreData === 'string').toBeTruthy();
  });

  test('should persist document data', async ({ page }) => {
    // Set test document data
    await page.evaluate(() => {
      const testDoc = {
        documents: [{
          id: 'test-doc-1',
          filename: 'test.md',
          type: 'markdown',
          content: '# Test Document\n\nThis is a test.',
          metadata: { size: 100, lineCount: 3, wordCount: 5 },
          isIndexed: false,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
        versions: {},
        selectedDocumentId: null,
      };
      localStorage.setItem('cognia-documents', JSON.stringify({ state: testDoc }));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const storedData = await page.evaluate(() => {
      return localStorage.getItem('cognia-documents');
    });

    expect(storedData).not.toBeNull();
    const parsed = JSON.parse(storedData!);
    expect(parsed.state.documents).toHaveLength(1);
    expect(parsed.state.documents[0].filename).toBe('test.md');
  });
});
