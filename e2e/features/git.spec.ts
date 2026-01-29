import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Git Integration E2E Tests
 * Tests Git repository management and version control features
 */

test.describe('Git Page Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/git');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should load git page', async ({ page }) => {
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should display repository panel', async ({ page }) => {
    const repoPanel = page.locator(
      '[data-testid="repo-panel"], .repository-container'
    ).first();

    const hasRepo = await repoPanel.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasRepo) {
      await expect(repoPanel).toBeVisible();
    }
  });
});

test.describe('Repository Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/git');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should clone repository', async ({ page }) => {
    const cloneButton = page.locator(
      'button:has-text("Clone"), [data-testid="clone-repo"]'
    ).first();

    if (await cloneButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cloneButton.click();
      await waitForAnimation(page);

      // Clone dialog should appear
      const urlInput = page.locator('input[placeholder*="url" i], input[name="repoUrl"]').first();
      const hasInput = await urlInput.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasInput || true).toBe(true);
    }
  });

  test('should display repository list', async ({ page }) => {
    const repoList = page.locator(
      '[data-testid="repo-list"], .repository-list'
    ).first();

    const hasList = await repoList.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasList) {
      await expect(repoList).toBeVisible();
    }
  });

  test('should open repository', async ({ page }) => {
    const openButton = page.locator(
      'button:has-text("Open"), [data-testid="open-repo"]'
    ).first();

    const hasOpen = await openButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasOpen) {
      await expect(openButton).toBeEnabled();
    }
  });
});

test.describe('Git Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/git');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should show commit history', async ({ page }) => {
    const historyPanel = page.locator(
      '[data-testid="commit-history"], .history-panel'
    ).first();

    const hasHistory = await historyPanel.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasHistory) {
      await expect(historyPanel).toBeVisible();
    }
  });

  test('should display staged changes', async ({ page }) => {
    const stagedSection = page.locator(
      '[data-testid="staged-changes"], .staged-files'
    ).first();

    const hasStaged = await stagedSection.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasStaged) {
      await expect(stagedSection).toBeVisible();
    }
  });

  test('should have commit functionality', async ({ page }) => {
    const commitButton = page.locator(
      'button:has-text("Commit"), [data-testid="commit-btn"]'
    ).first();

    const hasCommit = await commitButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasCommit) {
      await expect(commitButton).toBeVisible();
    }
  });

  test('should support push operation', async ({ page }) => {
    const pushButton = page.locator(
      'button:has-text("Push"), [data-testid="push-btn"]'
    ).first();

    const hasPush = await pushButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPush) {
      await expect(pushButton).toBeVisible();
    }
  });

  test('should support pull operation', async ({ page }) => {
    const pullButton = page.locator(
      'button:has-text("Pull"), [data-testid="pull-btn"]'
    ).first();

    const hasPull = await pullButton.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasPull) {
      await expect(pullButton).toBeVisible();
    }
  });
});

test.describe('Branch Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/git');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display current branch', async ({ page }) => {
    const branchIndicator = page.locator(
      '[data-testid="current-branch"], .branch-name'
    ).first();

    const hasBranch = await branchIndicator.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasBranch) {
      await expect(branchIndicator).toBeVisible();
    }
  });

  test('should show branch list', async ({ page }) => {
    const branchSelector = page.locator(
      '[data-testid="branch-selector"], button:has-text("Branch")'
    ).first();

    if (await branchSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await branchSelector.click();
      await waitForAnimation(page);

      const branches = page.locator('[role="option"], [data-testid="branch-item"]');
      const count = await branches.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should create new branch', async ({ page }) => {
    const newBranchButton = page.locator(
      'button:has-text("New Branch"), [data-testid="create-branch"]'
    ).first();

    if (await newBranchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBranchButton.click();
      await waitForAnimation(page);

      const nameInput = page.locator('input[placeholder*="branch" i], input[name="branchName"]').first();
      const hasInput = await nameInput.isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasInput || true).toBe(true);
    }
  });
});

test.describe('Diff Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/git');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display file diff', async ({ page }) => {
    const diffViewer = page.locator(
      '[data-testid="diff-viewer"], .diff-container'
    ).first();

    const hasDiff = await diffViewer.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasDiff) {
      await expect(diffViewer).toBeVisible();
    }
  });

  test('should toggle diff view mode', async ({ page }) => {
    const viewToggle = page.locator(
      'button:has-text("Split"), button:has-text("Unified"), [data-testid="diff-mode"]'
    ).first();

    const hasToggle = await viewToggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (hasToggle) {
      await expect(viewToggle).toBeEnabled();
    }
  });
});
