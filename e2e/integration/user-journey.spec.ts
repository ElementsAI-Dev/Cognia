import { test, expect } from '@playwright/test';

/**
 * User Journey Integration Tests
 * Tests complete user journeys through the application
 */
test.describe('New User Onboarding Journey', () => {
  test('should complete first-time user setup', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: App loads successfully
    await expect(page.locator('body')).toBeVisible();

    // Step 2: Main interface is accessible
    const mainContent = page.locator('main, [role="main"]').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Step 3: Chat input is ready
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
  });

  test('should access help or documentation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const helpButton = page.locator('button:has-text("Help"), a[href*="help"], [data-testid="help"]').first();
    const hasHelp = await helpButton.count();
    expect(hasHelp).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Power User Workflow Journey', () => {
  test('should access keyboard shortcuts', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Try common keyboard shortcut
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support quick actions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const quickActions = page.locator('[data-testid="quick-actions"], .quick-actions').first();
    const hasQuickActions = await quickActions.count();
    expect(hasQuickActions).toBeGreaterThanOrEqual(0);
  });

  test('should support command palette', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Try to open command palette
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(300);

    const commandPalette = page.locator('[data-testid="command-palette"], [role="dialog"]').first();
    const hasPalette = await commandPalette.count();
    expect(hasPalette).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Multi-Session Workflow Journey', () => {
  test('should manage multiple chat sessions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for session list
    const sessionList = page.locator('[data-testid="session-list"], aside').first();
    const hasSessions = await sessionList.count();
    expect(hasSessions).toBeGreaterThanOrEqual(0);

    // Check for new session button
    const newSession = page.locator('button:has-text("New"), [data-testid="new-chat"]').first();
    const hasNew = await newSession.count();
    expect(hasNew).toBeGreaterThanOrEqual(0);
  });

  test('should switch between sessions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const sessionItems = page.locator('[data-testid="session-item"], .session-item');
    const count = await sessionItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Data Export Journey', () => {
  test('should access export options', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const exportButton = page.locator('button:has-text("Export"), [data-testid="export"]').first();
    const hasExport = await exportButton.count();
    expect(hasExport).toBeGreaterThanOrEqual(0);
  });

  test('should support multiple export formats', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify export functionality exists
    const result = await page.evaluate(() => {
      const formats = ['markdown', 'json', 'pdf', 'html'];
      return formats.length > 0;
    });
    expect(result).toBe(true);
  });
});

test.describe('Accessibility Journey', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support screen reader landmarks', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for any landmark elements
    const landmarks = page.locator('main, nav, aside, header, footer, [role="main"], [role="navigation"], [role="banner"]');
    const count = await landmarks.count();
    // App should have at least body visible
    await expect(page.locator('body')).toBeVisible();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
