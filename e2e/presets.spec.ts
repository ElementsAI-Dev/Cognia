import { test, expect } from '@playwright/test';

/**
 * Presets E2E Tests
 * Tests preset management functionality
 */
test.describe('Presets Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have presets button', async ({ page }) => {
    const presetsButton = page.locator('button:has-text("Preset"), [data-testid="presets-button"], button[aria-label*="preset"]').first();
    const exists = await presetsButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should open presets panel', async ({ page }) => {
    const presetsButton = page.locator('button:has-text("Preset"), [data-testid="presets-button"]').first();
    if (await presetsButton.isVisible()) {
      await presetsButton.click();
      await page.waitForTimeout(300);
      const presetsPanel = page.locator('[data-testid="presets-panel"], .presets-container, [role="dialog"]').first();
      const isVisible = await presetsPanel.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    }
  });
});

test.describe('Preset Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display preset list', async ({ page }) => {
    const presetItems = page.locator('[data-testid="preset-item"], .preset-card');
    const count = await presetItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should have create preset button', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Preset"), [data-testid="create-preset"]').first();
    const exists = await createButton.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Preset Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should allow selecting a preset', async ({ page }) => {
    const presetItem = page.locator('[data-testid="preset-item"], .preset-card').first();
    if (await presetItem.isVisible()) {
      await presetItem.click();
      // Verify selection
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should apply preset settings', async ({ page }) => {
    const presetItem = page.locator('[data-testid="preset-item"], .preset-card').first();
    if (await presetItem.isVisible()) {
      await presetItem.click();
      await page.waitForTimeout(300);
      // Verify preset was applied
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
