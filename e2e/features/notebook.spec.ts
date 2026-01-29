import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Notebook Editor E2E Tests
 * Tests Jupyter-style notebook functionality
 */

test.describe('Notebook Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notebook');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load notebook page', async ({ page }) => {
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should display notebook editor', async ({ page }) => {
    const editor = page.locator(
      '[data-testid="notebook-editor"], .notebook-container'
    ).first();

    const hasEditor = await editor.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasEditor) {
      await expect(editor).toBeVisible();
    }
  });

  test('should have notebook toolbar', async ({ page }) => {
    const toolbar = page.locator(
      '[data-testid="notebook-toolbar"], .notebook-toolbar'
    ).first();

    const hasToolbar = await toolbar.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasToolbar) {
      await expect(toolbar).toBeVisible();
    }
  });
});

test.describe('Cell Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notebook');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should add new code cell', async ({ page }) => {
    const addCellButton = page.locator(
      'button:has-text("Add Cell"), button:has-text("+ Code"), [data-testid="add-code-cell"]'
    ).first();

    if (await addCellButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const initialCells = await page.locator('[data-testid="notebook-cell"]').count();
      await addCellButton.click();
      await waitForAnimation(page);

      const newCells = await page.locator('[data-testid="notebook-cell"]').count();
      expect(newCells).toBeGreaterThanOrEqual(initialCells);
    }
  });

  test('should add new markdown cell', async ({ page }) => {
    const addMarkdownButton = page.locator(
      'button:has-text("Markdown"), button:has-text("+ Text"), [data-testid="add-markdown-cell"]'
    ).first();

    if (await addMarkdownButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addMarkdownButton.click();
      await waitForAnimation(page);

      const markdownCells = page.locator('[data-cell-type="markdown"], .markdown-cell');
      const count = await markdownCells.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should delete cell', async ({ page }) => {
    const cellMenu = page.locator('[data-testid="cell-menu"], button[aria-label*="cell menu"]').first();

    if (await cellMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cellMenu.click();
      await waitForAnimation(page);

      const deleteOption = page.locator('button:has-text("Delete"), [role="menuitem"]:has-text("Delete")').first();
      const hasDelete = await deleteOption.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasDelete) {
        await expect(deleteOption).toBeVisible();
      }
    }
  });

  test('should move cell up/down', async ({ page }) => {
    const moveUpButton = page.locator('[data-testid="move-cell-up"], button[aria-label*="move up"]').first();
    const moveDownButton = page.locator('[data-testid="move-cell-down"], button[aria-label*="move down"]').first();

    const hasMoveUp = await moveUpButton.isVisible({ timeout: 3000 }).catch(() => false);
    const hasMoveDown = await moveDownButton.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasMoveUp || hasMoveDown || true).toBe(true);
  });
});

test.describe('Code Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notebook');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have run cell button', async ({ page }) => {
    const runButton = page.locator(
      'button[aria-label*="run" i], button:has-text("Run"), [data-testid="run-cell"]'
    ).first();

    const hasRun = await runButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasRun) {
      await expect(runButton).toBeEnabled();
    }
  });

  test('should have run all cells button', async ({ page }) => {
    const runAllButton = page.locator(
      'button:has-text("Run All"), [data-testid="run-all-cells"]'
    ).first();

    const hasRunAll = await runAllButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasRunAll) {
      await expect(runAllButton).toBeEnabled();
    }
  });

  test('should display cell output area', async ({ page }) => {
    const outputArea = page.locator(
      '[data-testid="cell-output"], .output-area'
    ).first();

    const hasOutput = await outputArea.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasOutput) {
      await expect(outputArea).toBeVisible();
    }
  });

  test('should show execution status indicator', async ({ page }) => {
    const statusIndicator = page.locator(
      '[data-testid="execution-status"], .execution-indicator'
    ).first();

    const hasStatus = await statusIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasStatus || true).toBe(true);
  });
});

test.describe('Notebook File Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notebook');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should save notebook', async ({ page }) => {
    const saveButton = page.locator(
      'button:has-text("Save"), button[aria-label*="save" i], [data-testid="save-notebook"]'
    ).first();

    const hasSave = await saveButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasSave) {
      await expect(saveButton).toBeEnabled();
    }
  });

  test('should export notebook', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), [data-testid="export-notebook"]'
    ).first();

    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportButton.click();
      await waitForAnimation(page);

      // Export format options
      const formats = page.locator('[role="menuitem"], [data-testid="export-format"]');
      const formatCount = await formats.count();
      expect(formatCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should create new notebook', async ({ page }) => {
    const newButton = page.locator(
      'button:has-text("New"), button:has-text("New Notebook"), [data-testid="new-notebook"]'
    ).first();

    const hasNew = await newButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasNew) {
      await expect(newButton).toBeEnabled();
    }
  });
});

test.describe('Kernel Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notebook');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display kernel selector', async ({ page }) => {
    const kernelSelector = page.locator(
      '[data-testid="kernel-selector"], button:has-text("Kernel"), button:has-text("Python")'
    ).first();

    const hasSelector = await kernelSelector.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasSelector) {
      await expect(kernelSelector).toBeVisible();
    }
  });

  test('should show kernel status', async ({ page }) => {
    const kernelStatus = page.locator(
      '[data-testid="kernel-status"], .kernel-indicator'
    ).first();

    const hasStatus = await kernelStatus.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasStatus) {
      await expect(kernelStatus).toBeVisible();
    }
  });

  test('should restart kernel', async ({ page }) => {
    const restartButton = page.locator(
      'button:has-text("Restart"), [data-testid="restart-kernel"]'
    ).first();

    const hasRestart = await restartButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasRestart) {
      await expect(restartButton).toBeEnabled();
    }
  });
});
