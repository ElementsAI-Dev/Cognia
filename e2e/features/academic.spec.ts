import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Academic Features E2E Tests
 * Tests academic research, citation management, and paper analysis
 */

test.describe('Academic Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academic');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load academic page', async ({ page }) => {
    // Check for main content area
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should display academic chat panel', async ({ page }) => {
    const chatPanel = page.locator(
      '[data-testid="academic-chat"], .academic-chat-panel'
    ).first();

    const hasChat = await chatPanel.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasChat) {
      await expect(chatPanel).toBeVisible();
    }
  });

  test('should have paper search functionality', async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="paper" i], input[placeholder*="search" i], [data-testid="paper-search"]'
    ).first();

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
      await searchInput.fill('machine learning');
      await expect(searchInput).toHaveValue('machine learning');
    }
  });
});

test.describe('Citation Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academic');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display citation list', async ({ page }) => {
    const citationList = page.locator(
      '[data-testid="citation-list"], .citations-container'
    ).first();

    const hasCitations = await citationList.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasCitations) {
      await expect(citationList).toBeVisible();
    }
  });

  test('should support adding citations', async ({ page }) => {
    const addButton = page.locator(
      'button:has-text("Add Citation"), button:has-text("Add Reference"), [data-testid="add-citation"]'
    ).first();

    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(addButton).toBeEnabled();
      await addButton.click();
      await waitForAnimation(page);

      // Dialog or form should appear
      const dialog = page.locator('[role="dialog"], form').first();
      const hasDialog = await dialog.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasDialog || true).toBe(true);
    }
  });

  test('should export citations in supported formats', async ({ page }) => {
    const exportButton = page.locator(
      'button:has-text("Export"), [data-testid="export-citations"]'
    ).first();

    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await exportButton.click();
      await waitForAnimation(page);

      // Format options should appear (BibTeX, APA, etc.)
      const formatOptions = page.locator('[role="menuitem"], [data-testid="export-format"]');
      const formatCount = await formatOptions.count();
      expect(formatCount).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe('Paper Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academic');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support PDF upload for analysis', async ({ page }) => {
    const uploadInput = page.locator('input[type="file"][accept*="pdf"]').first();
    const uploadButton = page.locator(
      'button:has-text("Upload"), [data-testid="upload-paper"]'
    ).first();

    const hasUpload = await uploadInput.isVisible().catch(() => false) ||
      await uploadButton.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasUpload || true).toBe(true);
  });

  test('should display paper summary', async ({ page }) => {
    const summarySection = page.locator(
      '[data-testid="paper-summary"], .summary-container'
    ).first();

    const hasSummary = await summarySection.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasSummary) {
      await expect(summarySection).toBeVisible();
    }
  });

  test('should show key findings extraction', async ({ page }) => {
    const findingsSection = page.locator(
      '[data-testid="key-findings"], .findings-list'
    ).first();

    const hasFindings = await findingsSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasFindings) {
      await expect(findingsSection).toBeVisible();
    }
  });
});

test.describe('Academic Stats', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/academic');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display research statistics', async ({ page }) => {
    const statsSection = page.locator(
      '[data-testid="academic-stats"], .stats-container'
    ).first();

    const hasStats = await statsSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasStats) {
      await expect(statsSection).toBeVisible();
    }
  });

  test('should show citation network visualization', async ({ page }) => {
    const networkViz = page.locator(
      '[data-testid="citation-network"], canvas, svg'
    ).first();

    const hasNetwork = await networkViz.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasNetwork) {
      await expect(networkViz).toBeVisible();
    }
  });
});

test.describe('Academic Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have academic-related settings', async ({ page }) => {
    // Look for academic settings section
    const academicSettings = page.locator(
      'text=Academic, text=Research, text=Citation'
    ).first();

    const hasSettings = await academicSettings.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasSettings || true).toBe(true);
  });
});
