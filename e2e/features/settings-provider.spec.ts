import { test, expect, type Page } from '@playwright/test';

type ProviderSeed = {
  providerSettings: Record<string, Record<string, unknown>>;
  providerUIPreferences?: {
    viewMode?: 'cards' | 'table';
    sortBy?: 'name' | 'models' | 'context' | 'price' | 'status';
    sortOrder?: 'asc' | 'desc';
    categoryFilter?: 'all' | 'flagship' | 'specialized' | 'local' | 'aggregator';
  };
};

const SETTINGS_STORAGE_KEY = 'cognia-settings';

async function seedProviderSettings(page: Page, seed: ProviderSeed): Promise<void> {
  await page.addInitScript(
    ({ storageKey, state }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          state: {
            language: 'en',
            providerSettings: state.providerSettings,
            providerUIPreferences: {
              viewMode: 'table',
              sortBy: 'name',
              sortOrder: 'asc',
              categoryFilter: 'all',
              ...(state.providerUIPreferences || {}),
            },
            customProviders: {},
          },
          version: 2,
        })
      );
    },
    { storageKey: SETTINGS_STORAGE_KEY, state: seed }
  );
}

async function openProviderSettings(page: Page): Promise<void> {
  await page.goto('/settings?section=providers', {
    waitUntil: 'domcontentloaded',
    timeout: 120000,
  });
  await expect(page.locator('[data-settings-panel]')).toBeVisible();
  await expect(page.locator('#provider-openai')).toBeVisible();
}

test.describe('Provider Settings E2E (Behavior-Driven)', () => {
  test('table configure action routes to card workflow for the same provider', async ({ page }) => {
    await seedProviderSettings(page, {
      providerSettings: {
        openai: { apiKey: '', enabled: false },
      },
      providerUIPreferences: {
        viewMode: 'table',
      },
    });
    await openProviderSettings(page);

    const openAiRow = page.locator('tr', { hasText: 'OpenAI' }).first();
    await expect(openAiRow).toBeVisible();

    await openAiRow.locator('button').last().click();
    await page.getByRole('button', { name: /configure api key/i }).click();

    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.locator('#provider-openai')).toBeVisible();
  });

  test('blocked reason for missing setup stays consistent across table and card views', async ({ page }) => {
    await seedProviderSettings(page, {
      providerSettings: {
        openai: { apiKey: '', enabled: false },
      },
      providerUIPreferences: {
        viewMode: 'table',
      },
    });
    await openProviderSettings(page);

    const openAiRow = page.locator('tr', { hasText: 'OpenAI' }).first();
    const tableBlockedReason = await openAiRow.locator('[title]').first().getAttribute('title');
    expect(tableBlockedReason).toBeTruthy();

    await page.locator('button:has(svg.lucide-layout-grid)').first().click();
    await expect(page.locator(`#provider-openai [title="${tableBlockedReason}"]`).first()).toBeVisible();
  });

  test('invalid import payload is rejected and existing provider settings remain unchanged', async ({ page }) => {
    await seedProviderSettings(page, {
      providerSettings: {
        openai: { apiKey: 'sk-existing-key', enabled: true },
      },
      providerUIPreferences: {
        viewMode: 'cards',
      },
    });
    await openProviderSettings(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'invalid-provider-export.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ invalid json }'),
    });

    await expect(page.getByRole('alert')).toContainText(/Invalid/i);

    const persistedApiKey = await page.evaluate((storageKey) => {
      const payload = localStorage.getItem(storageKey);
      if (!payload) return null;
      const parsed = JSON.parse(payload) as {
        state?: {
          providerSettings?: Record<string, { apiKey?: string }>;
        };
      };
      return parsed.state?.providerSettings?.openai?.apiKey || null;
    }, SETTINGS_STORAGE_KEY);

    expect(persistedApiKey).toBe('sk-existing-key');
  });
});
