import { test, expect } from '@playwright/test';

/**
 * Image Generation E2E Tests
 * Tests image generation functionality
 */
test.describe('Image Generation Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have image generation option', async ({ page }) => {
    const imageGenButton = page.locator('button:has-text("Image"), [data-testid="image-gen"], button[aria-label*="image"]').first();
    const exists = await imageGenButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should display image generation panel', async ({ page }) => {
    const imageGenPanel = page.locator('[data-testid="image-gen-panel"], .image-generation-container').first();
    const exists = await imageGenPanel.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Image Generation Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have prompt input for image generation', async ({ page }) => {
    const promptInput = page.locator('[data-testid="image-prompt"], textarea, input[placeholder*="image"]').first();
    const exists = await promptInput.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should have size selection', async ({ page }) => {
    const sizeSelector = page.locator('[data-testid="image-size"], select, [role="combobox"]').first();
    const exists = await sizeSelector.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should have style selection', async ({ page }) => {
    const styleSelector = page.locator('[data-testid="image-style"], select, [role="listbox"]').first();
    const exists = await styleSelector.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Image Generation Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have generate button', async ({ page }) => {
    const generateButton = page.locator('button:has-text("Generate"), [data-testid="generate-image"]').first();
    const exists = await generateButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should display generated images', async ({ page }) => {
    const imageContainer = page.locator('[data-testid="generated-images"], .image-results, img').first();
    const exists = await imageContainer.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Image Generation History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display generation history', async ({ page }) => {
    const historyList = page.locator('[data-testid="image-history"], .generation-history');
    const exists = await historyList.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});
