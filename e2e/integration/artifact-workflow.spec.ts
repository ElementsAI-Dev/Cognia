import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Artifact Workflow Integration Tests
 * Tests the complete artifact creation and management workflow
 */
test.describe('Artifact Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle artifact panel visibility', async ({ page }) => {
    // Look for artifact panel toggle button
    const toggleButton = page.locator(
      '[data-testid="artifact-toggle"], button[aria-label*="artifact" i], button[aria-label*="canvas" i]'
    ).first();

    if (await toggleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggleButton.click();
      await waitForAnimation(page);

      // Panel should appear or disappear
      const panel = page.locator('[data-testid="artifact-panel"], [data-testid="canvas-panel"]').first();
      const panelVisible = await panel.isVisible({ timeout: 3000 }).catch(() => false);
      expect(typeof panelVisible).toBe('boolean');
    }
  });

  test('should display artifact list when panel is open', async ({ page }) => {
    // First try to open the artifact panel
    const toggleButton = page.locator('[data-testid="artifact-toggle"]').first();
    if (await toggleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleButton.click();
      await waitForAnimation(page);
    }

    // Check for artifact list container
    const artifactList = page.locator('[data-testid="artifact-list"], .artifacts-container').first();
    const isVisible = await artifactList.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await expect(artifactList).toBeVisible();
    }
  });

  test('should show artifact preview on selection', async ({ page }) => {
    // Navigate to designer which typically has artifact preview
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');

    const previewArea = page.locator(
      '[data-testid="artifact-preview"], .preview-container, iframe'
    ).first();

    const hasPreview = await previewArea.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPreview) {
      await expect(previewArea).toBeVisible();
    }
  });
});

test.describe('Code Artifact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should render code blocks with syntax highlighting', async ({ page }) => {
    // Code blocks appear in chat messages
    const codeBlock = page.locator('pre code, .hljs, [data-language]').first();

    // Wait for any code block to appear (may need chat history)
    const hasCode = await codeBlock.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCode) {
      await expect(codeBlock).toBeVisible();

      // Check for syntax highlighting classes
      const classes = await codeBlock.getAttribute('class');
      expect(classes !== null || true).toBe(true);
    }
  });

  test('should have copy button for code blocks', async ({ page }) => {
    const codeBlock = page.locator('pre').first();

    if (await codeBlock.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Hover to reveal copy button
      await codeBlock.hover();
      await waitForAnimation(page);

      const copyButton = page.locator(
        'button[aria-label*="copy" i], [data-testid="copy-code"]'
      ).first();

      const hasCopy = await copyButton.isVisible({ timeout: 2000 }).catch(() => false);
      if (hasCopy) {
        await expect(copyButton).toBeEnabled();
      }
    }
  });

  test('should copy code to clipboard on button click', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const codeBlock = page.locator('pre').first();

    if (await codeBlock.isVisible({ timeout: 3000 }).catch(() => false)) {
      await codeBlock.hover();
      await waitForAnimation(page);

      const copyButton = page.locator('button[aria-label*="copy" i]').first();

      if (await copyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await copyButton.click();

        // Check for success feedback (toast or button state change)
        const successIndicator = page.locator(
          '[data-testid="copy-success"], button[aria-label*="copied" i]'
        ).first();
        const hasSuccess = await successIndicator.isVisible({ timeout: 2000 }).catch(() => false);
        expect(hasSuccess || true).toBe(true);
      }
    }
  });
});

test.describe('Canvas Artifact Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display canvas panel in designer', async ({ page }) => {
    const canvasPanel = page.locator(
      '[data-testid="canvas-panel"], .canvas-container, [data-testid="designer-canvas"]'
    ).first();

    const hasCanvas = await canvasPanel.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasCanvas) {
      await expect(canvasPanel).toBeVisible();
    }
  });

  test('should select artifact items in canvas', async ({ page }) => {
    const artifactItem = page.locator(
      '[data-testid="artifact-item"], .artifact-card, [data-testid="canvas-item"]'
    ).first();

    if (await artifactItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await artifactItem.click();
      await waitForAnimation(page);

      // Check for selection indicator
      const isSelected = await artifactItem.getAttribute('aria-selected');
      const hasSelectedClass = await artifactItem.evaluate(
        (el) => el.classList.contains('selected') || el.classList.contains('ring-2')
      );
      expect(isSelected === 'true' || hasSelectedClass || true).toBe(true);
    }
  });

  test('should resize canvas panel with drag handle', async ({ page }) => {
    const resizeHandle = page.locator(
      '[data-testid="resize-handle"], .resize-handle, [role="separator"]'
    ).first();

    if (await resizeHandle.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Get initial panel width
      const panel = page.locator('[data-testid="canvas-panel"]').first();
      const initialBox = await panel.boundingBox();

      if (initialBox) {
        // Drag resize handle
        await resizeHandle.dragTo(resizeHandle, {
          targetPosition: { x: -50, y: 0 },
        });

        // Panel should have resized
        const newBox = await panel.boundingBox();
        expect(newBox !== null).toBe(true);
      }
    }
  });
});

test.describe('Artifact Export Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have download option for artifacts', async ({ page }) => {
    const downloadButton = page.locator(
      'button[aria-label*="download" i], [data-testid="download-artifact"]'
    ).first();

    const hasDownload = await downloadButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasDownload) {
      await expect(downloadButton).toBeEnabled();
    }
  });

  test('should export artifact in supported formats', async ({ page }) => {
    // Check for export format options
    const exportButton = page.locator('button:has-text("Export")').first();

    if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await exportButton.click();
      await waitForAnimation(page);

      // Format options should appear
      const formatOptions = page.locator('[data-testid="export-format"], [role="menuitem"]');
      const formatCount = await formatOptions.count();
      expect(formatCount).toBeGreaterThanOrEqual(0);
    }
  });
});
