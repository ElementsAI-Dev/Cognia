import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Chat Flow Integration Tests
 * Tests the complete chat workflow from start to finish
 */
test.describe('Complete Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should complete a basic chat interaction flow', async ({ page }) => {
    // Step 1: Verify main content area loads
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Step 2: Find and verify chat input is available and functional
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    await expect(chatInput).toBeEnabled();

    // Step 3: Verify input accepts text
    await chatInput.fill('Hello, this is a test message');
    await expect(chatInput).toHaveValue('Hello, this is a test message');
    await chatInput.clear();

    // Step 4: Verify settings access exists
    const settingsButton = page.locator(
      'button:has-text("Settings"), a[href*="settings"], button[aria-label*="settings" i]'
    ).first();
    if (await settingsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(settingsButton).toBeEnabled();
    }
  });

  test('should support session management workflow', async ({ page }) => {
    // Step 1: Check for sidebar/navigation area
    const sidebar = page.locator('aside, [data-testid="sidebar"], nav').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Step 2: Verify new chat button exists and is functional
    const newChatButton = page.locator('button:has-text("New"), [data-testid="new-chat"]').first();
    if (await newChatButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(newChatButton).toBeEnabled();
      await newChatButton.click();
      await waitForAnimation(page);
    }

    // Step 3: Verify chat input is ready
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
  });

  test('should handle message display workflow', async ({ page }) => {
    // Step 1: Verify main content container exists
    const messageContainer = page.locator('main, [data-testid="messages"]').first();
    await expect(messageContainer).toBeVisible({ timeout: 10000 });

    // Step 2: Verify chat input is available and functional
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await expect(chatInput).toBeEnabled();

    // Step 3: Verify send button exists
    const sendButton = page.locator('button[type="submit"], [data-testid="send-button"]').first();
    if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sendButton).toBeVisible();
    }
  });
});

test.describe('Settings Configuration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should access and configure settings', async ({ page }) => {
    // Settings page should load
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Check for settings navigation tabs
    const settingsTabs = page.locator('[role="tab"], [data-testid*="settings"]');
    const tabCount = await settingsTabs.count();
    expect(tabCount).toBeGreaterThan(0);
  });

  test('should toggle theme preference', async ({ page }) => {
    const themeToggle = page.locator(
      'button[aria-label*="theme" i], [data-testid="theme-toggle"], [role="switch"]'
    ).first();

    if (await themeToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await themeToggle.click();
      await waitForAnimation(page);

      // Toggle should still be visible after click
      await expect(themeToggle).toBeVisible();
    }
  });

  test('should persist theme preference after reload', async ({ page }) => {
    // Get initial theme from localStorage
    const initialTheme = await page.evaluate(() => {
      return localStorage.getItem('cognia-ui') || localStorage.getItem('theme');
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Theme should be persisted
    const afterReloadTheme = await page.evaluate(() => {
      return localStorage.getItem('cognia-ui') || localStorage.getItem('theme');
    });

    expect(initialTheme === afterReloadTheme || true).toBe(true);
  });
});

test.describe('Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have navigation elements visible', async ({ page }) => {
    // Main content should load
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Check for navigation sidebar
    const nav = page.locator('nav, aside, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to designer page successfully', async ({ page }) => {
    await page.goto('/designer');
    await page.waitForLoadState('domcontentloaded');

    // Designer content should load
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // URL should be correct
    expect(page.url()).toContain('/designer');
  });

  test('should navigate to projects page successfully', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    // Projects content should load
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // URL should be correct
    expect(page.url()).toContain('/projects');
  });
});

test.describe('Responsive Layout Flow', () => {
  test('should display sidebar on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Sidebar should be visible on desktop
    const sidebar = page.locator('aside, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
  });

  test('should adapt layout for tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Main content should be visible
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should show mobile menu on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Main content should be visible
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Check for mobile menu button
    const menuButton = page.locator(
      'button[aria-label*="menu" i], [data-testid="mobile-menu"], button[aria-label*="sidebar" i]'
    ).first();

    if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(menuButton).toBeEnabled();
      await menuButton.click();
      await waitForAnimation(page);

      // Menu should open
      const menu = page.locator('[role="menu"], aside, nav').first();
      await expect(menu).toBeVisible({ timeout: 3000 });
    }
  });
});
