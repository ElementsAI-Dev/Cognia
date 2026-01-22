import { test, expect } from '@playwright/test';

test.describe('Plugins Settings', () => {
  test('should show desktop required message when installing from Git URL in web env', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    const pluginsNav = page.locator('[data-tour="settings-plugins"]').first();
    if (await pluginsNav.count()) {
      await pluginsNav.click();
    } else {
      const pluginsFallback = page.getByRole('button', { name: /plugins/i }).first();
      if (await pluginsFallback.count()) {
        await pluginsFallback.click();
      }
    }

    const importButton = page.getByRole('button', { name: /import/i }).first();
    await importButton.click();

    await page.getByText(/git/i).first().click();

    await expect(
      page.getByText(/Plugin installation requires desktop environment/i)
    ).toBeVisible();
  });
});
