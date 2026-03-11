import { test, expect, type Page } from '@playwright/test';

function seedPromptTemplateStorage(): { key: string; value: string } {
  const now = new Date().toISOString();
  return {
    key: 'cognia-prompt-templates',
    value: JSON.stringify({
      state: {
        templates: [
          {
            id: 'local-template-1',
            name: 'Local Template One',
            description: 'Template for publish flow',
            content: 'Hello {{name}}',
            category: 'chat',
            tags: ['Demo', 'demo'],
            variables: [{ name: 'name', type: 'text', required: true }],
            targets: ['chat'],
            source: 'user',
            usageCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        ],
        categories: ['chat'],
        selectedTemplateId: null,
        isInitialized: true,
        feedback: {},
        abTests: {},
        optimizationHistory: {},
      },
      version: 1,
    }),
  };
}

function seedMarketplaceStorage(): { key: string; value: string } {
  const now = new Date().toISOString();
  return {
    key: 'cognia-prompt-marketplace',
    value: JSON.stringify({
      state: {
        remoteFirstEnabled: false,
        userActivity: {
          userId: '',
          favorites: [],
          installed: [
            {
              id: 'inst-sample-1',
              marketplaceId: 'sample-1-code-review-expert',
              localTemplateId: 'local-template-1',
              installedVersion: '0.0.1',
              latestVersion: '0.0.1',
              hasUpdate: false,
              autoUpdate: false,
              installedAt: now,
            },
          ],
          reviewed: [],
          published: [],
          collections: [],
          recentlyViewed: [],
        },
      },
      version: 0,
    }),
  };
}

async function dismissStartupOverlays(page: Page) {
  const skipOnboardingButton = page
    .getByRole('button', { name: /Skip for now|跳过|稍后/i })
    .first();
  if (
    await skipOnboardingButton
      .waitFor({ state: 'visible', timeout: 12000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await skipOnboardingButton.click({ force: true });
  }

  const skipTourButton = page
    .getByRole('button', { name: /Skip tour|跳过导览|跳过教程/i })
    .first();
  if (
    await skipTourButton
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await skipTourButton.click({ force: true });
  } else {
    const skipTourText = page.getByText(/Skip tour|跳过导览|跳过教程/i).first();
    if (await skipTourText.isVisible({ timeout: 1000 }).catch(() => false)) {
      await skipTourText.click({ force: true });
    }
  }

  await page.keyboard.press('Escape').catch(() => undefined);
  await page.keyboard.press('Escape').catch(() => undefined);

  await page
    .waitForFunction(() => !document.querySelector('[role="status"][aria-live="polite"]'))
    .catch(() => undefined);
}

async function closeActiveDialog(page: Page) {
  const dialog = page.locator('[role="dialog"]').first();
  if (!(await dialog.isVisible().catch(() => false))) {
    return;
  }

  const closeButton = dialog.locator('[data-slot="dialog-close"]').first();
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true });
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }

  await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
}

test.describe('Prompt Marketplace Completeness', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    const templateSeed = seedPromptTemplateStorage();
    const marketplaceSeed = seedMarketplaceStorage();
    await page.addInitScript(
      ([template, marketplace]) => {
        localStorage.setItem(template.key, template.value);
        localStorage.setItem(marketplace.key, marketplace.value);
      },
      [templateSeed, marketplaceSeed]
    );
    await page.goto('/settings?section=prompt-marketplace', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await dismissStartupOverlays(page);
    await closeActiveDialog(page);
  });

  test('browse -> install -> update-check loop', async ({ page }) => {
    const browseTab = page.getByRole('tab', { name: /Browse|浏览|tabs\.browse/i }).first();
    await expect(browseTab).toBeVisible();

    const installButtons = page.getByRole('button', { name: /^Install$|^安装$|^install$/i });
    const installCount = await installButtons.count();
    if (installCount > 0) {
      await installButtons.first().click();
      await closeActiveDialog(page);
    }

    await closeActiveDialog(page);
    await page.getByRole('tab', { name: /Installed|已安装|tabs\.installed/i }).first().click();
    let checkUpdates = page.getByRole('button', { name: /Check for Updates|检查更新/i }).first();
    await expect(checkUpdates).toBeVisible();

    if (await checkUpdates.isDisabled()) {
      const browseMarketplaceButton = page
        .getByRole('button', { name: /Browse marketplace|浏览市场|empty\.browseMarketplace/i })
        .first();
      if (await browseMarketplaceButton.isVisible().catch(() => false)) {
        await browseMarketplaceButton.click();
      }

      const installButton = page
        .getByRole('button', { name: /^Install$|^安装$|^install$/i })
        .first();
      if (await installButton.isVisible().catch(() => false)) {
        await installButton.click();
        await closeActiveDialog(page);
      }

      await page.getByRole('tab', { name: /Installed|已安装|tabs\.installed/i }).first().click();
      checkUpdates = page.getByRole('button', { name: /Check for Updates|检查更新/i }).first();
      await expect(checkUpdates).toBeVisible();
    }

    await checkUpdates.click();
    await expect(checkUpdates).toBeEnabled({ timeout: 15000 });
  });

  test('publish -> export -> import loop', async ({ page }) => {
    await page.getByRole('tab', { name: /Installed|已安装|tabs\.installed/i }).first().click();

    const publishButton = page
      .getByRole('button', { name: /Publish|发布|publish\.title/i })
      .first();
    await expect(publishButton).toBeVisible();
    await publishButton.click();

    const templateButton = page.getByRole('button', { name: /Local Template One/i }).first();
    await expect(templateButton).toBeVisible();
    await templateButton.click();

    const nextButton = page.getByRole('button', { name: /Next|下一步|publish\.next/i }).first();
    await nextButton.click();

    const publishConfirm = page
      .getByRole('button', { name: /Publish Prompt|发布提示|publish\.publishButton/i })
      .first();
    await publishConfirm.click();

    const importExportButton = page.getByRole('button', { name: /Import|导入|Export|导出/i }).first();
    await expect(importExportButton).toBeVisible();
    await importExportButton.click();

    const exportPre = page.locator('pre').first();
    await expect(exportPre).toContainText('"version": "1.1"');
    const exportPayload = (await exportPre.textContent()) || '';

    await page.getByRole('tab', { name: /Import|导入|import/i }).first().click();
    const importTextarea = page.getByPlaceholder(/Paste|粘贴|pasteJsonHere/i).first();
    await importTextarea.fill(exportPayload);
    await page
      .getByRole('button', { name: /Import Prompts|导入提示|importButton/i })
      .first()
      .click();

    await expect(page.getByText(/Imported|已导入/i)).toBeVisible({ timeout: 15000 });
  });

  test('mobile browse keeps canonical query context after detail open/close', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings?section=prompt-marketplace', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await dismissStartupOverlays(page);
    await closeActiveDialog(page);

    const browseTab = page.getByRole('tab').first();
    await expect(browseTab).toBeVisible();
    await browseTab.click();

    const searchInput = page.getByPlaceholder(/Search prompts|搜索提示|search\.placeholder/i).first();
    await searchInput.fill('code');

    const firstCard = page
      .getByRole('button', { name: /Open prompt details/i })
      .first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    const detailDialog = page.locator('[role="dialog"]').first();
    await expect(detailDialog).toBeVisible({ timeout: 10000 });
    await closeActiveDialog(page);

    await expect(searchInput).toHaveValue('code');
  });
});
