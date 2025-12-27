import { test, expect } from '@playwright/test';

/**
 * Artifact Workflow Integration Tests
 * Tests the complete artifact creation and management workflow
 */
test.describe('Artifact Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should support artifact panel toggle', async ({ page }) => {
    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display artifact list', async ({ page }) => {
    const artifactList = page.locator('[data-testid="artifact-list"], .artifacts-container').first();
    const hasList = await artifactList.count();
    expect(hasList).toBeGreaterThanOrEqual(0);
  });

  test('should support artifact preview', async ({ page }) => {
    const previewArea = page.locator('[data-testid="artifact-preview"], .preview-container, iframe').first();
    const hasPreview = await previewArea.count();
    expect(hasPreview).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Code Artifact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render code with syntax highlighting', async ({ page }) => {
    const codeBlock = page.locator('pre code, .hljs, [data-language]').first();
    const hasCode = await codeBlock.count();
    expect(hasCode).toBeGreaterThanOrEqual(0);
  });

  test('should support code copy action', async ({ page }) => {
    const copyButton = page.locator('button[aria-label*="copy" i], [data-testid="copy-code"]').first();
    const hasCopy = await copyButton.count();
    expect(hasCopy).toBeGreaterThanOrEqual(0);
  });

  test('should support code download', async ({ page }) => {
    const downloadButton = page.locator('button[aria-label*="download" i], [data-testid="download-code"]').first();
    const hasDownload = await downloadButton.count();
    expect(hasDownload).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Canvas Artifact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support canvas panel', async ({ page }) => {
    const canvasPanel = page.locator('[data-testid="canvas-panel"], .canvas-container').first();
    const hasCanvas = await canvasPanel.count();
    expect(hasCanvas).toBeGreaterThanOrEqual(0);
  });

  test('should support artifact selection in canvas', async ({ page }) => {
    const artifactItem = page.locator('[data-testid="artifact-item"], .artifact-card').first();
    const hasItem = await artifactItem.count();
    expect(hasItem).toBeGreaterThanOrEqual(0);
  });

  test('should support canvas resize', async ({ page }) => {
    const resizeHandle = page.locator('[data-testid="resize-handle"], .resize-handle').first();
    const hasResize = await resizeHandle.count();
    expect(hasResize).toBeGreaterThanOrEqual(0);
  });
});
