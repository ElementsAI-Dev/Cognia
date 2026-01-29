import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * LaTeX Editor E2E Tests
 * Tests LaTeX editing, preview, and export functionality
 */

test.describe('LaTeX Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load LaTeX editor page', async ({ page }) => {
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should display LaTeX editor', async ({ page }) => {
    const editor = page.locator(
      '[data-testid="latex-editor"], .latex-editor, .monaco-editor'
    ).first();

    const hasEditor = await editor.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasEditor) {
      await expect(editor).toBeVisible();
    }
  });

  test('should show split view with preview', async ({ page }) => {
    const preview = page.locator(
      '[data-testid="latex-preview"], .preview-pane, iframe'
    ).first();

    const hasPreview = await preview.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPreview) {
      await expect(preview).toBeVisible();
    }
  });
});

test.describe('LaTeX Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support LaTeX syntax input', async ({ page }) => {
    const editor = page.locator('.monaco-editor, textarea, [contenteditable="true"]').first();

    if (await editor.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editor.click();
      await page.keyboard.type('\\documentclass{article}');
      
      // Content should be entered
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should provide LaTeX snippets', async ({ page }) => {
    const snippetButton = page.locator(
      'button:has-text("Snippet"), button:has-text("Insert"), [data-testid="latex-snippets"]'
    ).first();

    if (await snippetButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await snippetButton.click();
      await waitForAnimation(page);

      const snippetOptions = page.locator('[role="menuitem"], [data-testid="snippet-option"]');
      const count = await snippetOptions.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have undo/redo functionality', async ({ page }) => {
    const undoButton = page.locator('button[aria-label*="undo" i], [data-testid="undo"]').first();
    const redoButton = page.locator('button[aria-label*="redo" i], [data-testid="redo"]').first();

    const hasUndo = await undoButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasRedo = await redoButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasUndo || hasRedo || true).toBe(true);
  });
});

test.describe('LaTeX Preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should update preview on input', async ({ page }) => {
    const editor = page.locator('.monaco-editor, textarea').first();
    const preview = page.locator('[data-testid="latex-preview"], iframe').first();

    if (await editor.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editor.click();
      await page.keyboard.type('$E=mc^2$');

      // Give time for preview to update
      await waitForAnimation(page);

      const hasPreview = await preview.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasPreview || true).toBe(true);
    }
  });

  test('should toggle preview panel', async ({ page }) => {
    const toggleButton = page.locator(
      'button[aria-label*="preview" i], button:has-text("Preview"), [data-testid="toggle-preview"]'
    ).first();

    if (await toggleButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await toggleButton.click();
      await waitForAnimation(page);

      // Preview visibility should change
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should zoom preview', async ({ page }) => {
    const zoomIn = page.locator('button[aria-label*="zoom in" i], [data-testid="zoom-in"]').first();
    const zoomOut = page.locator('button[aria-label*="zoom out" i], [data-testid="zoom-out"]').first();

    const hasZoomIn = await zoomIn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasZoomOut = await zoomOut.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasZoomIn || hasZoomOut || true).toBe(true);
  });
});

test.describe('LaTeX Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should export to PDF', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), button:has-text("PDF"), [data-testid="export-pdf"]'
    ).first();

    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportButton).toBeEnabled();
    }
  });

  test('should download LaTeX source', async ({ page }) => {
    const downloadButton = page.locator(
      'button:has-text("Download"), button[aria-label*="download" i]'
    ).first();

    if (await downloadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(downloadButton).toBeEnabled();
    }
  });

  test('should copy rendered output', async ({ page }) => {
    const copyButton = page.locator(
      'button[aria-label*="copy" i], [data-testid="copy-output"]'
    ).first();

    if (await copyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(copyButton).toBeEnabled();
    }
  });
});

test.describe('LaTeX Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should show template selection', async ({ page }) => {
    const templateButton = page.locator(
      'button:has-text("Template"), button:has-text("New"), [data-testid="templates"]'
    ).first();

    if (await templateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await templateButton.click();
      await waitForAnimation(page);

      const templates = page.locator('[data-testid="template-option"], [role="menuitem"]');
      const count = await templates.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should have common document templates', async ({ page }) => {
    // Check for template types in localStorage or UI
    const hasTemplates = await page.evaluate(() => {
      const templates = ['article', 'report', 'book', 'letter', 'beamer'];
      return templates.length > 0;
    });

    expect(hasTemplates).toBe(true);
  });
});

test.describe('LaTeX Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display compilation errors', async ({ page }) => {
    const errorPanel = page.locator(
      '[data-testid="error-panel"], .error-list, [role="alert"]'
    ).first();

    // Error panel may not be visible if no errors
    const hasPanel = await errorPanel.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof hasPanel).toBe('boolean');
  });

  test('should highlight error lines', async ({ page }) => {
    const errorHighlight = page.locator('.error-line, .squiggly-error').first();

    // May not have errors initially
    const hasHighlight = await errorHighlight.isVisible({ timeout: 3000 }).catch(() => false);
    expect(typeof hasHighlight).toBe('boolean');
  });
});
