import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * SpeedPass Learning Mode E2E Tests
 * Tests speed learning platform features including textbook management,
 * tutorials, quizzes, and study analytics
 */

test.describe.configure({ timeout: 120000 });

test.describe('SpeedPass Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/speedpass', { waitUntil: 'domcontentloaded', timeout: 60000 });
  });

  test('should load speedpass page', async ({ page }) => {
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should display header with title', async ({ page }) => {
    const header = page.locator('h1').first();
    await expect(header).toBeVisible({ timeout: 5000 });
  });

  test('should have settings button', async ({ page }) => {
    const settingsBtn = page.locator('button:has-text("Settings"), button:has(svg.lucide-settings)').first();
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });
    await expect(settingsBtn).toBeEnabled();
  });

  test('should have add textbook button', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), button:has(svg.lucide-plus)').first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await expect(addBtn).toBeEnabled();
  });
});

test.describe('SpeedPass Tabs Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/speedpass', { waitUntil: 'domcontentloaded', timeout: 60000 });
  });

  test('should display tab navigation', async ({ page }) => {
    const tabsList = page.locator('[role="tablist"]').first();
    await expect(tabsList).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="tab"]')).toHaveCount(6);
  });

  test('should switch between tabs', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const secondTab = tabs.nth(1);
    await secondTab.click();
    await waitForAnimation(page);
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should show overview tab content', async ({ page }) => {
    const overviewTab = page.locator('[role="tab"]').first();
    await overviewTab.click();
    await waitForAnimation(page);

    // Overview content should be visible
    const content = page.locator('[role="tabpanel"]').first();
    await expect(content).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[role="progressbar"]').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Textbook Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/speedpass', { waitUntil: 'domcontentloaded', timeout: 60000 });
  });

  test('should display textbook list or empty state', async ({ page }) => {
    const textbookList = page.locator('[data-testid="textbook-list"], .textbook-grid').first();
    const emptyState = page.locator('[data-testid="empty-state"], text=No textbooks').first();

    const hasBooks = await textbookList.isVisible({ timeout: 5000 }).catch(() => false);
    const isEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasBooks || isEmpty).toBe(true);
  });

  test('should add new textbook', async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-textbook-button"], button:has-text("Add Textbook"), button:has-text("添加教材")').first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await waitForAnimation(page);

    // Dialog or form should appear
    const dialog = page.locator('[role="dialog"], form').first();
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Learning Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/speedpass', { waitUntil: 'domcontentloaded', timeout: 60000 });
  });

  test('should display learning mode options', async ({ page }) => {
    await expect(page.locator('text=/Rapid Mode|极速模式|Intensive Mode|速成模式|Comprehensive Mode|全面模式/').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should start learning session', async ({ page }) => {
    const startBtn = page.locator('button:has-text("Start"), button:has(svg.lucide-play)').first();
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await expect(startBtn).toBeEnabled();
  });
});

test.describe('Quiz System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/speedpass', { waitUntil: 'domcontentloaded', timeout: 60000 });
  });

  test('should access quiz section', async ({ page }) => {
    const quizTab = page.locator('[role="tab"]').nth(3);
    await quizTab.click();
    await waitForAnimation(page);

    const quizContent = page.locator('[role="tabpanel"]').first();
    await expect(quizContent).toBeVisible({ timeout: 3000 });
    await expect(quizTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display wrong question book', async ({ page }) => {
    const wrongQuestionsTab = page.locator('[role="tab"]').nth(4);
    await wrongQuestionsTab.click();
    await waitForAnimation(page);
    await expect(wrongQuestionsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[role="tabpanel"]').first()).toBeVisible();
  });
});

test.describe('Study Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/speedpass', { waitUntil: 'domcontentloaded', timeout: 60000 });
  });

  test('should display progress indicators', async ({ page }) => {
    const progressBars = page.locator('[role="progressbar"], .progress-bar');
    const count = await progressBars.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should show analytics tab', async ({ page }) => {
    const analyticsTab = page.locator('[role="tab"]').nth(5);
    await analyticsTab.click();
    await waitForAnimation(page);

    const analyticsContent = page.locator('[role="tabpanel"]').first();
    await expect(analyticsContent).toBeVisible({ timeout: 3000 });
    await expect(analyticsTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display study statistics', async ({ page }) => {
    const stats = page.locator('[data-testid="study-stats"], .stats-card');
    const count = await stats.count();

    expect(count).toBeGreaterThan(0);
  });
});
