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

function buildVerificationFingerprint(seed: {
  apiKey?: string;
  apiKeys?: string[];
  currentKeyIndex?: number;
  baseURL?: string;
  defaultModel?: string;
}): string {
  return JSON.stringify({
    apiKey: seed.apiKey?.trim() || '',
    apiKeys: Array.isArray(seed.apiKeys) ? seed.apiKeys.map((key) => key.trim()) : [],
    currentKeyIndex: seed.currentKeyIndex ?? 0,
    baseURL: seed.baseURL?.trim() || '',
    defaultModel: seed.defaultModel?.trim() || '',
  });
}

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
}

test.describe('Provider Settings E2E (Behavior-Driven)', () => {
  test('checklist remediation quick-fix exits empty state and focuses provider workflow', async ({ page }) => {
    await seedProviderSettings(page, {
      providerSettings: {
        openai: { apiKey: '', enabled: false },
        anthropic: { apiKey: '', enabled: false },
        google: { apiKey: '', enabled: false },
      },
      providerUIPreferences: {
        viewMode: 'table',
      },
    });
    await openProviderSettings(page);

    await expect(page.getByText('No AI Providers Configured')).toBeVisible();

    const emptyStateFixNow = page.getByRole('button', { name: 'Fix Now' }).first();
    await expect(emptyStateFixNow).toBeVisible();
    await emptyStateFixNow.click();

    await expect(page.locator('#provider-openai')).toBeVisible();
    await expect(page.locator('#provider-openai').getByText('Setup Checklist')).toBeVisible();
  });

  test('retry-failed batch operation re-targets only currently eligible failed providers', async ({ page }) => {
    await seedProviderSettings(page, {
      providerSettings: {
        anthropic: { apiKey: 'short-key', enabled: true },
      },
      providerUIPreferences: {
        viewMode: 'table',
      },
    });
    await openProviderSettings(page);

    await page.getByRole('button', { name: 'Test All Providers' }).click();

    const summary = page.locator('div', { hasText: 'Test Results:' }).first();
    await expect(summary).toContainText('Verify enabled');
    await expect(summary).toContainText('1 failed');

    await page.getByRole('button', { name: 'Retry Failed' }).click();

    await expect(summary).toContainText('Retry failed');
    await expect(summary).toContainText('1 failed');
  });

  test('stale verification state stays synchronized between card and table workflows', async ({ page }) => {
    const initialApiKey = 'sk-anthropic-verified-key-1234567890';

    await seedProviderSettings(page, {
      providerSettings: {
        anthropic: {
          apiKey: initialApiKey,
          enabled: true,
          verificationStatus: 'verified',
          verificationFingerprint: buildVerificationFingerprint({ apiKey: initialApiKey }),
        },
      },
      providerUIPreferences: {
        viewMode: 'cards',
      },
    });
    await openProviderSettings(page);

    const anthropicCard = page.locator('#provider-anthropic');
    await expect(anthropicCard).toBeVisible();

    await anthropicCard.getByText('Anthropic').click();
    const apiKeyInput = anthropicCard.locator('input[type="password"], input[type="text"]').first();
    await apiKeyInput.fill('sk-anthropic-updated-key-9876543210');

    await expect(anthropicCard.getByText('Verification Stale')).toBeVisible();

    await page.locator('button:has(svg.lucide-table)').first().click();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('tr', { hasText: 'Anthropic' }).first()).toContainText('Stale');
  });

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
