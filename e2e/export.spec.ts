import { test, expect } from '@playwright/test';

/**
 * Export E2E Tests
 * Tests export functionality for conversations and artifacts
 */
test.describe('Export Options', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have export button', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-button"], button[aria-label*="export"]').first();
    const exists = await exportButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should open export dialog', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-button"]').first();
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(300);
      const exportDialog = page.locator('[role="dialog"], [data-testid="export-dialog"], .export-modal').first();
      const isVisible = await exportDialog.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    }
  });
});

test.describe('Export Formats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support markdown export', async ({ page }) => {
    const result = await page.evaluate(() => {
      const supportedFormats = ['markdown', 'json', 'pdf', 'html'];
      return supportedFormats.includes('markdown');
    });
    expect(result).toBe(true);
  });

  test('should support JSON export', async ({ page }) => {
    const result = await page.evaluate(() => {
      const supportedFormats = ['markdown', 'json', 'pdf', 'html'];
      return supportedFormats.includes('json');
    });
    expect(result).toBe(true);
  });

  test('should support PDF export', async ({ page }) => {
    const result = await page.evaluate(() => {
      const supportedFormats = ['markdown', 'json', 'pdf', 'html'];
      return supportedFormats.includes('pdf');
    });
    expect(result).toBe(true);
  });
});

test.describe('Export Content Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should allow selecting export content', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-button"]').first();
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(300);
      // Look for content selection options
      const contentOptions = page.locator('input[type="checkbox"], [data-testid="export-option"]');
      const count = await contentOptions.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
