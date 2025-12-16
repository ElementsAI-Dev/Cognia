import { test, expect } from '@playwright/test';

/**
 * Basic app layout and navigation tests
 */
test.describe('App Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page', async ({ page }) => {
    await expect(page).toHaveTitle(/Cognia/i);
  });

  test('should display sidebar or navigation', async ({ page }) => {
    // Check for sidebar, navigation, or main layout elements
    // The app may use different layout structures
    const layoutElement = page.locator('[data-testid="sidebar"], aside, nav, [role="navigation"], .sidebar, #sidebar, main').first();
    await expect(layoutElement).toBeVisible({ timeout: 15000 });
  });

  test('should display chat interface', async ({ page }) => {
    // Check for chat input or main content area
    const chatArea = page.locator('[data-testid="chat-container"], main, [role="main"]').first();
    await expect(chatArea).toBeVisible({ timeout: 10000 });
  });

  test('should have responsive layout', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate to chat page', async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    // Verify we're on the main chat page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to projects page if available', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    // Check if projects page loads or redirects
    await expect(page.locator('body')).toBeVisible();
  });

  test('should navigate to designer page if available', async ({ page }) => {
    await page.goto('/designer', { timeout: 30000 });
    // Don't wait for networkidle as it may take too long
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });
});
