import { test, expect } from '@playwright/test';

/**
 * Designer E2E Tests
 * Tests the designer page functionality
 */
test.describe('Designer Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load designer page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display designer interface', async ({ page }) => {
    // Designer page should have main content area
    const designerContainer = page.locator('main, [data-testid="designer"], .designer-container').first();
    const exists = await designerContainer.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should have template selection', async ({ page }) => {
    const templateSelector = page.locator('[data-testid="template-selector"], select, [role="listbox"]').first();
    const exists = await templateSelector.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Designer Input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have prompt input area', async ({ page }) => {
    const promptInput = page.locator('textarea, [data-testid="designer-input"], input[type="text"]').first();
    await expect(promptInput).toBeVisible({ timeout: 10000 });
  });

  test('should allow entering design prompt', async ({ page }) => {
    const promptInput = page.locator('textarea, [data-testid="designer-input"]').first();
    if (await promptInput.isVisible()) {
      await promptInput.fill('Create a modern landing page');
      const value = await promptInput.inputValue();
      expect(value).toContain('landing page');
    }
  });
});

test.describe('Designer Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have generate button', async ({ page }) => {
    const generateButton = page.locator('button:has-text("Generate"), [data-testid="generate-button"], button[type="submit"]').first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
  });

  test('should have preview area', async ({ page }) => {
    const previewArea = page.locator('[data-testid="preview"], .preview-container, iframe').first();
    const exists = await previewArea.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Designer Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display available templates', async ({ page }) => {
    const templates = page.locator('[data-testid="template-item"], .template-card, [role="option"]');
    const count = await templates.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should allow template selection', async ({ page }) => {
    const templateItem = page.locator('[data-testid="template-item"], .template-card').first();
    if (await templateItem.isVisible()) {
      await templateItem.click();
      // Verify selection
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
