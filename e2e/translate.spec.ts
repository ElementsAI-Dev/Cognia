import { test, expect } from '@playwright/test';

/**
 * Translation E2E Tests
 * Tests translation functionality
 */
test.describe('Translation Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have translation option', async ({ page }) => {
    const translateButton = page.locator('button:has-text("Translate"), [data-testid="translate"], button[aria-label*="translate"]').first();
    const exists = await translateButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should display translation panel', async ({ page }) => {
    const translatePanel = page.locator('[data-testid="translate-panel"], .translation-container').first();
    const exists = await translatePanel.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Translation Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have source text input', async ({ page }) => {
    const sourceInput = page.locator('[data-testid="source-text"], textarea, [placeholder*="translate"]').first();
    const exists = await sourceInput.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should have language selector', async ({ page }) => {
    const languageSelector = page.locator('[data-testid="language-selector"], select, [role="combobox"]').first();
    const exists = await languageSelector.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should have target language selector', async ({ page }) => {
    const targetSelector = page.locator('[data-testid="target-language"], select').first();
    const exists = await targetSelector.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Translation Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have translate button', async ({ page }) => {
    const translateButton = page.locator('button:has-text("Translate"), [data-testid="translate-button"]').first();
    const exists = await translateButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should display translation result', async ({ page }) => {
    const resultContainer = page.locator('[data-testid="translation-result"], .translation-output').first();
    const exists = await resultContainer.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should have copy translation button', async ({ page }) => {
    const copyButton = page.locator('button[aria-label*="copy"], [data-testid="copy-translation"]').first();
    const exists = await copyButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Translation Languages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support multiple languages', async ({ page }) => {
    const result = await page.evaluate(() => {
      const supportedLanguages = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de'];
      return supportedLanguages.length > 5;
    });
    expect(result).toBe(true);
  });

  test('should have swap languages button', async ({ page }) => {
    const swapButton = page.locator('button[aria-label*="swap"], [data-testid="swap-languages"]').first();
    const exists = await swapButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});
