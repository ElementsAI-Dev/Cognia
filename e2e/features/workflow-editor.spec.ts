import { expect, test, type Page } from '@playwright/test';

async function openWorkflowEditor(page: Page) {
  await page.goto('/workflows');
  await page.waitForLoadState('domcontentloaded');

  await page.getByTestId('workflow-add-button').click();
  await page.getByTestId('workflow-create-blank').click();

  await expect(page.getByTestId('workflow-page-run-button')).toBeVisible();
}

test.describe('Workflow Editor (Real Flow)', () => {
  test('creates a blank workflow and enters editor mode', async ({ page }) => {
    await openWorkflowEditor(page);

    await expect(page.getByTestId('workflow-page-run-button')).toBeVisible();
    await expect(page.locator('text=/\\d+ nodes/')).toBeVisible();
  });

  test('opens trigger panel and adds schedule trigger', async ({ page }) => {
    await openWorkflowEditor(page);

    await page.getByTestId('workflow-open-trigger-sheet').click();
    await expect(page.locator('text=Triggers').first()).toBeVisible();

    await page.getByTestId('workflow-add-trigger-schedule').click();
    await expect(page.locator('text=Schedule Trigger')).toBeVisible();
    await expect(page.getByTestId('workflow-trigger-timezone')).toBeVisible();
  });

  test('saves workflow after adding schedule trigger and shows save feedback', async ({ page }) => {
    await openWorkflowEditor(page);

    await page.getByTestId('workflow-open-trigger-sheet').click();
    await page.getByTestId('workflow-add-trigger-schedule').click();

    await expect(page.getByTestId('workflow-trigger-timezone')).toBeVisible();
    await page.getByTestId('workflow-trigger-timezone').click();
    await page.getByRole('option', { name: /UTC/i }).first().click();

    await page.getByTestId('workflow-page-save-button').click();

    await expect(page.locator('[data-sonner-toast]').first()).toContainText(/Workflow saved/i, {
      timeout: 20000,
    });
  });

  test('runs workflow through real UI controls', async ({ page }) => {
    await openWorkflowEditor(page);

    await page.getByTestId('workflow-page-run-button').click();
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({
      timeout: 20000,
    });
  });
});

test.describe('Workflow Webhook API', () => {
  test('exposes webhook health endpoint', async ({ request }) => {
    const response = await request.get('/api/workflows/e2e-webhook/webhook');
    expect(response.ok()).toBe(true);

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.workflowId).toBe('e2e-webhook');
  });

  test('accepts webhook trigger without definition and returns 202', async ({ request }) => {
    const response = await request.post('/api/workflows/e2e-webhook/webhook', {
      data: {
        input: { source: 'e2e' },
      },
    });

    expect(response.status()).toBe(202);

    const payload = await response.json();
    expect(payload.accepted).toBe(true);
    expect(payload.executed).toBe(false);
    expect(payload.reason).toContain('No workflow definition provided');
  });

  test('rejects webhook when secret header does not match body secret', async ({ request }) => {
    const response = await request.post('/api/workflows/e2e-webhook/webhook', {
      headers: {
        'x-cognia-webhook-secret': 'server-secret',
      },
      data: {
        secret: 'different-secret',
      },
    });

    expect(response.status()).toBe(401);
    const payload = await response.json();
    expect(payload.error).toBe('Invalid webhook secret');
  });

  test('returns 202 when workflow definition header is invalid', async ({ request }) => {
    const response = await request.post('/api/workflows/e2e-webhook/webhook', {
      headers: {
        'x-workflow-definition': 'not-a-valid-base64-definition',
      },
      data: {
        input: { source: 'invalid-header' },
      },
    });

    expect(response.status()).toBe(202);
    const payload = await response.json();
    expect(payload.accepted).toBe(true);
    expect(payload.executed).toBe(false);
    expect(payload.reason).toContain('No workflow definition provided');
  });
});
