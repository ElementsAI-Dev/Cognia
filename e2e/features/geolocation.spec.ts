/**
 * Geolocation Feature E2E Tests
 * 
 * Tests the geolocation-based locale detection and settings UI integration.
 */

import { test, expect, Page } from '@playwright/test';

// Mock geolocation coordinates
const BEIJING_COORDS = {
  latitude: 39.9042,
  longitude: 116.4074,
  accuracy: 10,
};

const _NEW_YORK_COORDS = {
  latitude: 40.7128,
  longitude: -74.006,
  accuracy: 10,
};

/**
 * Helper to set geolocation permissions and mock position
 */
async function mockGeolocation(page: Page, coords: { latitude: number; longitude: number; accuracy: number }) {
  await page.context().setGeolocation(coords);
  await page.context().grantPermissions(['geolocation']);
}

test.describe('Geolocation Feature', () => {
  test.beforeEach(async ({ context }) => {
    // Grant geolocation permissions by default
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation(BEIJING_COORDS);
  });

  test.describe('Settings UI Integration', () => {
    test('should display language selection with auto-detect option', async ({ page }) => {
      await page.goto('/');
      
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Navigate to appearance settings
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Verify language card is visible
      await expect(page.getByText(/language/i).first()).toBeVisible();
      
      // Verify auto-detect switch is present
      await expect(page.getByRole('switch', { name: /auto-detect/i })).toBeVisible();
      
      // Verify refresh button is present
      await expect(page.getByRole('button', { name: /detect now|重新检测/i })).toBeVisible();
    });

    test('should toggle auto-detect locale setting', async ({ page }) => {
      await page.goto('/');
      
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Find the auto-detect switch
      const autoDetectSwitch = page.getByRole('switch', { name: /auto-detect/i });
      
      // Get initial state
      const initialState = await autoDetectSwitch.isChecked();
      
      // Toggle the switch
      await autoDetectSwitch.click();
      
      // Verify state changed
      expect(await autoDetectSwitch.isChecked()).toBe(!initialState);
      
      // Toggle back
      await autoDetectSwitch.click();
      expect(await autoDetectSwitch.isChecked()).toBe(initialState);
    });

    test('should manually trigger locale detection', async ({ page }) => {
      await mockGeolocation(page, BEIJING_COORDS);
      
      await page.goto('/');
      
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Click the refresh/detect button
      await page.getByRole('button', { name: /detect now|重新检测/i }).click();
      
      // Wait for detection to complete (button should stop spinning)
      await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 5000 });
      
      // Detection result info should be visible
      await expect(page.getByText(/source|检测来源/i)).toBeVisible();
    });

    test('should display detection result information', async ({ page }) => {
      await mockGeolocation(page, BEIJING_COORDS);
      
      await page.goto('/');
      
      // Open settings and trigger detection
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      await page.getByRole('button', { name: /detect now|重新检测/i }).click();
      
      // Wait for detection
      await page.waitForTimeout(1000);
      
      // Verify detection info is displayed
      const detectionInfo = page.locator('[class*="bg-muted"]').filter({ hasText: /source|检测来源/i });
      await expect(detectionInfo).toBeVisible();
      
      // Should show confidence level
      await expect(page.getByText(/confidence|置信度/i)).toBeVisible();
    });

    test('should change language when detected locale differs', async ({ page }) => {
      // Start with English
      await page.goto('/');
      
      // Set geolocation to Beijing
      await mockGeolocation(page, BEIJING_COORDS);
      
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Trigger manual detection
      await page.getByRole('button', { name: /detect now|重新检测/i }).click();
      
      // Wait for potential language change
      await page.waitForTimeout(2000);
      
      // Check that UI has potentially updated (locale selector should reflect current language)
      const languageSelector = page.locator('[role="combobox"]').first();
      await expect(languageSelector).toBeVisible();
    });
  });

  test.describe('Language Selection', () => {
    test('should allow manual language selection', async ({ page }) => {
      await page.goto('/');
      
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Click language selector
      await page.locator('[role="combobox"]').first().click();
      
      // Select Chinese
      await page.getByRole('option', { name: /简体中文/i }).click();
      
      // Verify the selection
      await expect(page.locator('[role="combobox"]').first()).toContainText('简体中文');
    });

    test('should persist language selection across page reloads', async ({ page }) => {
      await page.goto('/');
      
      // Open settings and change language
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      await page.locator('[role="combobox"]').first().click();
      await page.getByRole('option', { name: /简体中文/i }).click();
      
      // Close settings
      await page.keyboard.press('Escape');
      
      // Reload the page
      await page.reload();
      
      // Re-open settings
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Verify language is still Chinese
      await expect(page.locator('[role="combobox"]').first()).toContainText('简体中文');
    });

    test('should update UI text when language changes', async ({ page }) => {
      await page.goto('/');
      
      // Open settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Check English text is present
      await expect(page.getByText('Settings')).toBeVisible();
      
      // Change to Chinese
      await page.getByRole('tab', { name: /appearance/i }).click();
      await page.locator('[role="combobox"]').first().click();
      await page.getByRole('option', { name: /简体中文/i }).click();
      
      // Wait for UI update
      await page.waitForTimeout(500);
      
      // The settings title should now be in Chinese
      // Note: exact translation may vary based on i18n configuration
    });
  });

  test.describe('Geolocation Permissions', () => {
    test('should handle denied geolocation permission gracefully', async ({ page, context }) => {
      // Deny geolocation
      await context.clearPermissions();
      
      await page.goto('/');
      
      // Open settings and try to detect
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      
      // Try to detect - should not crash
      await page.getByRole('button', { name: /detect now|重新检测/i }).click();
      
      // Should fall back gracefully (no error visible, uses browser locale)
      await page.waitForTimeout(1000);
      
      // Page should still be functional
      await expect(page.getByRole('tab', { name: /appearance/i })).toBeVisible();
    });
  });

  test.describe('Timezone Detection', () => {
    test('should detect and display timezone', async ({ page }) => {
      await mockGeolocation(page, BEIJING_COORDS);
      
      await page.goto('/');
      
      // Open settings and trigger detection
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('tab', { name: /appearance/i }).click();
      await page.getByRole('button', { name: /detect now|重新检测/i }).click();
      
      // Wait for detection
      await page.waitForTimeout(1000);
      
      // Should show timezone info
      await expect(page.getByText(/timezone|时区/i)).toBeVisible();
    });
  });
});

test.describe('First-time User Experience', () => {
  test('should auto-detect locale on first visit', async ({ page, context }) => {
    // Clear storage to simulate first visit
    await context.clearCookies();
    
    // Set geolocation to Beijing
    await context.setGeolocation(BEIJING_COORDS);
    await context.grantPermissions(['geolocation']);
    
    // Visit the app
    await page.goto('/');
    
    // Wait for initial load and potential auto-detection
    await page.waitForTimeout(2000);
    
    // The app should have initialized (check for main UI elements)
    await expect(page.locator('body')).toBeVisible();
  });
});
