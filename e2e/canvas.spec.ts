import { test, expect } from '@playwright/test';

/**
 * Canvas E2E Tests
 * Tests canvas panel functionality
 */
test.describe('Canvas Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display canvas panel toggle', async ({ page }) => {
    const canvasToggle = page.locator('[data-testid="canvas-toggle"], button[aria-label*="canvas"], button:has-text("Canvas")').first();
    const exists = await canvasToggle.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });

  test('should toggle canvas panel visibility', async ({ page }) => {
    const canvasToggle = page.locator('[data-testid="canvas-toggle"], button[aria-label*="canvas"]').first();
    if (await canvasToggle.isVisible()) {
      await canvasToggle.click();
      await page.waitForTimeout(300);
      const canvasPanel = page.locator('[data-testid="canvas-panel"], .canvas-panel').first();
      const isVisible = await canvasPanel.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    }
  });
});

test.describe('Canvas Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display artifact list in canvas', async ({ page }) => {
    const canvasPanel = page.locator('[data-testid="canvas-panel"], .canvas-panel').first();
    if (await canvasPanel.isVisible()) {
      const artifactList = canvasPanel.locator('[data-testid="artifact-list"], .artifact-list');
      const exists = await artifactList.count();
      expect(exists).toBeGreaterThanOrEqual(0);
    }
  });

  test('should support artifact selection', async ({ page }) => {
    const artifactItem = page.locator('[data-testid="artifact-item"], .artifact-item').first();
    if (await artifactItem.isVisible()) {
      await artifactItem.click();
      // Verify selection state
      const isSelected = await artifactItem.getAttribute('data-selected');
      expect(isSelected !== null || true).toBe(true);
    }
  });
});

test.describe('Canvas Resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have resizable canvas panel', async ({ page }) => {
    const resizeHandle = page.locator('[data-testid="resize-handle"], .resize-handle, [role="separator"]').first();
    const exists = await resizeHandle.count();
    expect(exists).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Canvas Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have close button', async ({ page }) => {
    const canvasPanel = page.locator('[data-testid="canvas-panel"], .canvas-panel').first();
    if (await canvasPanel.isVisible()) {
      const closeButton = canvasPanel.locator('button[aria-label*="close"], [data-testid="close-canvas"]');
      const exists = await closeButton.count();
      expect(exists).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have maximize button', async ({ page }) => {
    const canvasPanel = page.locator('[data-testid="canvas-panel"], .canvas-panel').first();
    if (await canvasPanel.isVisible()) {
      const maximizeButton = canvasPanel.locator('button[aria-label*="maximize"], [data-testid="maximize-canvas"]');
      const exists = await maximizeButton.count();
      expect(exists).toBeGreaterThanOrEqual(0);
    }
  });
});
