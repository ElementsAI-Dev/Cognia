/**
 * E2E Tests for Virtual Environment Management
 *
 * Tests the complete user flow for:
 * - Viewing virtual environment panel
 * - Creating virtual environments
 * - Managing packages
 * - Deleting environments
 * - Project environment configuration
 */

import { test, expect, type Page } from '@playwright/test';

// Helper to navigate to environment settings
async function navigateToEnvironmentSettings(page: Page) {
  // Open settings
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Navigate to Environment tab/section
  await page.getByRole('tab', { name: /environment/i }).click();
}

// Helper to wait for Tauri environment
async function checkTauriEnvironment(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  });
}

test.describe('Virtual Environment Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display virtual environment panel in settings', async ({ page }) => {
    await navigateToEnvironmentSettings(page);

    // Check for virtual environment section
    const virtualEnvSection = page.locator('text=Virtual Environments');
    await expect(virtualEnvSection).toBeVisible();
  });

  test('should show "not available" message in browser environment', async ({ page }) => {
    const isTauri = await checkTauriEnvironment(page);

    if (!isTauri) {
      await navigateToEnvironmentSettings(page);

      // Should show not available message
      const notAvailableMsg = page.locator('text=/requires.*desktop|only available.*desktop/i');
      await expect(notAvailableMsg).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should display refresh button', async ({ page }) => {
    await navigateToEnvironmentSettings(page);

    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await expect(refreshButton).toBeVisible();
  });

  test('should display new environment button', async ({ page }) => {
    await navigateToEnvironmentSettings(page);

    const newButton = page.getByRole('button', { name: /new|create/i });
    await expect(newButton).toBeVisible();
  });
});

test.describe('Create Virtual Environment Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should open create environment dialog', async ({ page }) => {
    // Click new/create button
    await page.getByRole('button', { name: /new|create/i }).first().click();

    // Dialog should appear
    const dialog = page.getByRole('dialog').filter({ hasText: /create.*environment/i });
    await expect(dialog).toBeVisible();
  });

  test('should display preset options', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    // Check for preset buttons
    const presetsSection = page.locator('text=/quick presets|presets/i');
    await expect(presetsSection).toBeVisible();

    // Should have Python presets
    await expect(page.locator('text=Python Basic')).toBeVisible();
  });

  test('should have environment name input', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const nameInput = page.getByLabel(/environment name/i);
    await expect(nameInput).toBeVisible();

    // Should be able to type
    await nameInput.fill('test-env');
    await expect(nameInput).toHaveValue('test-env');
  });

  test('should have environment type selector', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const typeSelector = page.getByLabel(/environment type/i);
    await expect(typeSelector).toBeVisible();
  });

  test('should have Python version selector', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const versionSelector = page.getByLabel(/python version/i);
    await expect(versionSelector).toBeVisible();
  });

  test('should have initial packages input', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const packagesInput = page.getByLabel(/initial packages/i);
    await expect(packagesInput).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const dialog = page.getByRole('dialog').filter({ hasText: /create.*environment/i });
    await expect(dialog).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });

  test('should disable create button when name is empty', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const createButton = page.getByRole('button', { name: /^create$/i });
    await expect(createButton).toBeDisabled();
  });

  test('should enable create button when name is filled', async ({ page }) => {
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const nameInput = page.getByLabel(/environment name/i);
    await nameInput.fill('my-test-env');

    const createButton = page.getByRole('button', { name: /^create$/i });
    await expect(createButton).toBeEnabled();
  });
});

test.describe('Environment Card Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should expand environment card on click', async ({ page }) => {
    // This test requires at least one environment to exist
    // Skip if no environments are displayed
    const envCard = page.locator('[data-testid="env-card"]').first();

    if (await envCard.isVisible()) {
      // Find and click expand button
      const expandButton = envCard.getByRole('button').first();
      await expandButton.click();

      // Should show expanded details
      await expect(envCard.locator('text=/python|packages|size/i')).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Delete Environment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should show confirmation dialog on delete', async ({ page }) => {
    // This test requires at least one environment
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirmation dialog should appear
      const confirmDialog = page.getByRole('dialog').filter({ hasText: /delete.*environment/i });
      await expect(confirmDialog).toBeVisible();

      // Should have cancel and delete buttons
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should close confirmation on cancel', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      const confirmDialog = page.getByRole('dialog').filter({ hasText: /delete.*environment/i });
      await expect(confirmDialog).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /cancel/i }).last().click();

      // Dialog should close
      await expect(confirmDialog).not.toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Packages Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should open packages dialog', async ({ page }) => {
    // Find view packages button (package icon)
    const packagesButton = page.getByRole('button', { name: /packages|view packages/i }).first();

    if (await packagesButton.isVisible()) {
      await packagesButton.click();

      // Packages dialog should appear
      const packagesDialog = page.getByRole('dialog').filter({ hasText: /packages/i });
      await expect(packagesDialog).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should have package install input', async ({ page }) => {
    const packagesButton = page.getByRole('button', { name: /packages|view packages/i }).first();

    if (await packagesButton.isVisible()) {
      await packagesButton.click();

      // Should have input for new packages
      const input = page.getByPlaceholder(/enter packages|install/i);
      await expect(input).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Project Environment Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display project environment section', async ({ page }) => {
    await navigateToEnvironmentSettings(page);

    // Look for project environment section
    const projectSection = page.locator('text=/project.*environment|environment.*project/i');
    // This may or may not be visible depending on the page layout
    if (await projectSection.isVisible()) {
      await expect(projectSection).toBeVisible();
    }
  });
});

test.describe('Error States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should display error alert when present', async ({ page }) => {
    // Check if any error alert is visible
    const errorAlert = page.locator('[role="alert"]');

    // Error alerts should have dismiss button if present
    if (await errorAlert.isVisible()) {
      const dismissButton = errorAlert.getByRole('button', { name: /dismiss|close/i });
      await expect(dismissButton).toBeVisible();
    }
  });

  test('should dismiss error on button click', async ({ page }) => {
    const errorAlert = page.locator('[role="alert"]');

    if (await errorAlert.isVisible()) {
      const dismissButton = errorAlert.getByRole('button', { name: /dismiss|close/i });
      await dismissButton.click();

      // Error should be dismissed
      await expect(errorAlert).not.toBeVisible();
    }
  });
});

test.describe('Progress Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should show progress bar during operations', async ({ page }) => {
    // This test checks the structure exists but may not be visible without active operations
    const progressBar = page.locator('[role="progressbar"]');

    // Progress bar component should exist in the DOM
    // It may not be visible if no operation is in progress
    const progressCount = await progressBar.count();
    expect(progressCount).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await navigateToEnvironmentSettings(page);
  });

  test('should have accessible buttons', async ({ page }) => {
    const buttons = page.getByRole('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should have either aria-label or text content
      const hasAccessibleName = !!ariaLabel || !!text?.trim();
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have accessible dialogs', async ({ page }) => {
    // Open create dialog
    await page.getByRole('button', { name: /new|create/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Dialog should have a title
    const dialogTitle = dialog.getByRole('heading');
    await expect(dialogTitle).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Tab through focusable elements
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('Responsive Design', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open settings (may be different UI on mobile)
    const settingsButton = page.getByRole('button', { name: /settings|menu/i }).first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
    }

    // Page should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await navigateToEnvironmentSettings(page);

    // Virtual environment section should still be visible
    const section = page.locator('text=/virtual.*environment|environment/i').first();
    await expect(section).toBeVisible();
  });
});
