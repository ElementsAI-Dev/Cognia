import { expect, test } from '@playwright/test';

test.describe('Workflow Scheduler Integration', () => {
  test('creates a workflow task from scheduler page with cron timezone', async ({ page }) => {
    const taskName = `E2E Workflow Task ${Date.now()}`;

    await page.goto('/scheduler');
    await page.waitForLoadState('domcontentloaded');

    await page.getByTestId('scheduler-create-task-button').click();
    await expect(page.getByTestId('scheduler-task-form')).toBeVisible();

    await page.getByTestId('scheduler-task-name-input').fill(taskName);

    await page.getByTestId('scheduler-task-timezone').click();
    await page.getByRole('option', { name: /UTC/i }).first().click();

    await page.getByTestId('scheduler-task-submit').click();

    await expect(page.getByTestId('scheduler-task-form')).toBeHidden({ timeout: 15000 });
    await expect(page.locator(`text=${taskName}`).first()).toBeVisible({ timeout: 15000 });
  });
});
