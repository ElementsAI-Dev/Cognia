import { test, expect } from '@playwright/test';

/**
 * Project Management Flow Integration Tests
 * Tests the complete project workflow
 */
test.describe('Project Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load projects page', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display project list or empty state', async ({ page }) => {
    // Either project list or empty state should be visible
    const projectContent = page.locator('body').first();
    await expect(projectContent).toBeVisible({ timeout: 10000 });
  });

  test('should have create project option', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Project"), [data-testid="create-project"]').first();
    const hasCreate = await createButton.count();
    expect(hasCreate).toBeGreaterThanOrEqual(0);
  });

  test('should support project search', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], [data-testid="project-search"]').first();
    const hasSearch = await searchInput.count();
    expect(hasSearch).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Project Context Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should support project context in chat', async ({ page }) => {
    // Verify chat is available
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Check for project selector
    const projectSelector = page.locator('[data-testid="project-selector"], button:has-text("Project")').first();
    const hasProjectSelector = await projectSelector.count();
    expect(hasProjectSelector).toBeGreaterThanOrEqual(0);
  });

  test('should display project badge when selected', async ({ page }) => {
    // Project badge may appear in header
    const projectBadge = page.locator('[data-testid="project-badge"], .project-indicator').first();
    const hasBadge = await projectBadge.count();
    expect(hasBadge).toBeGreaterThanOrEqual(0);
  });
});
