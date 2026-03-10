import { test, expect, type Page } from '@playwright/test';
import { PPT_TEST_IDS } from '../../lib/ppt/test-selectors';

test.use({ video: 'off' });

const seededPresentation = {
  id: 'ppt-e2e-seeded',
  title: 'Seeded E2E Presentation',
  subtitle: 'E2E Coverage',
  slides: [
    {
      id: 'slide-1',
      order: 0,
      layout: 'title',
      title: 'Welcome',
      subtitle: 'Seeded deck',
      elements: [],
      notes: 'Presenter notes',
    },
    {
      id: 'slide-2',
      order: 1,
      layout: 'bullets',
      title: 'Agenda',
      bullets: ['One', 'Two', 'Three'],
      elements: [],
    },
  ],
  totalSlides: 2,
  aspectRatio: '16:9',
  theme: {
    id: 'modern-light',
    name: 'Modern Light',
    primaryColor: '#2563EB',
    secondaryColor: '#1D4ED8',
    accentColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'JetBrains Mono',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test.describe('PPT completeness scenarios', () => {
  test.describe.configure({ timeout: 90000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cognia:onboarding:main', 'true');
      localStorage.setItem('cognia:onboarding:feature-tour', 'true');

      const rawSettings = localStorage.getItem('cognia-settings');
      let parsedSettings: { state?: Record<string, unknown>; version?: number } = {};
      try {
        parsedSettings = rawSettings ? JSON.parse(rawSettings) : {};
      } catch {
        parsedSettings = {};
      }

      localStorage.setItem(
        'cognia-settings',
        JSON.stringify({
          ...parsedSettings,
          state: {
            ...(parsedSettings.state || {}),
            hasCompletedOnboarding: true,
          },
          version: typeof parsedSettings.version === 'number' ? parsedSettings.version : 0,
        })
      );
    });
  });

  const waitForAppReady = async (page: Page) => {
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForFunction(() => !document.querySelector('[role="status"][aria-live="polite"]'), null, {
        timeout: 12000,
      })
      .catch(() => undefined);
  };

  const dismissStartupOverlays = async (page: Page) => {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.keyboard.press('Escape').catch(() => undefined);
  };

  test('creation mode validations stay consistent across generate/import/paste', async ({ page }) => {
    await page.goto('/ppt', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
    await dismissStartupOverlays(page);
    await expect(page.getByTestId(PPT_TEST_IDS.page.newPresentationButton)).toBeVisible({ timeout: 15000 });
    await page.getByTestId(PPT_TEST_IDS.page.newPresentationButton).click({ force: true });

    const submitButton = page.getByTestId('ppt-create-submit');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();

    await page.getByTestId('ppt-form-topic').fill('Quarterly Review');
    await expect(submitButton).toBeEnabled();

    await page.getByTestId('ppt-mode-import').click();
    await page.getByTestId('ppt-import-url').fill('not-a-url');
    await expect(submitButton).toBeDisabled();

    await page.getByTestId('ppt-import-url').fill('https://example.com/report');
    await expect(submitButton).toBeEnabled();

    await page.getByTestId('ppt-mode-paste').click();
    await page.getByTestId('ppt-paste-text').fill('short');
    await expect(submitButton).toBeDisabled();

    await page
      .getByTestId('ppt-paste-text')
      .fill('This is sufficiently long pasted content to pass the creation validation checks.');
    await expect(submitButton).toBeEnabled();
  });

  test('import extraction failure shows actionable feedback and recovers without reload', async ({ page }) => {
    await page.goto('/ppt', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
    await dismissStartupOverlays(page);
    await expect(page.getByTestId(PPT_TEST_IDS.page.newPresentationButton)).toBeVisible({ timeout: 15000 });
    await page.getByTestId(PPT_TEST_IDS.page.newPresentationButton).click({ force: true });

    const submitButton = page.getByTestId(PPT_TEST_IDS.creation.submitButton);
    await page.getByTestId('ppt-form-topic').fill('Imported deck');
    await page.getByTestId('ppt-mode-import').click();
    await page
      .locator('input[type="file"][accept=".pdf,.txt,.md,.docx"]')
      .setInputFiles({
        name: 'blocked.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 simulated'),
      });

    await submitButton.click();
    await expect(page.getByTestId(PPT_TEST_IDS.creation.materialFeedback)).toBeVisible();
    await expect(page.getByText(/convert the document to TXT\/MD or paste key sections directly/i)).toBeVisible();

    await page.getByTestId('ppt-mode-paste').click();
    await page
      .getByTestId('ppt-paste-text')
      .fill('This is sufficiently long pasted content to pass the creation validation checks.');

    await expect(page.getByTestId(PPT_TEST_IDS.creation.materialFeedback)).toHaveCount(0);
    await expect(submitButton).toBeEnabled();
  });

  test('seeded presentation supports open, present, and export menu flow', async ({ page }, testInfo) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => {
      const serialized = error.stack || error.message;
      pageErrors.push(serialized);
      console.log('PPT_COMPLETENESS_PAGEERROR_START');
      console.log(serialized);
      console.log('PPT_COMPLETENESS_PAGEERROR_END');
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.addInitScript((presentation) => {
      const persisted = {
        state: {
          history: [],
          maxHistorySize: 50,
          presentations: {
            [presentation.id]: presentation,
          },
        },
        version: 1,
      };
      window.localStorage.setItem('cognia-workflows', JSON.stringify(persisted));
    }, seededPresentation);

    await page.goto('/ppt', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForAppReady(page);
    await dismissStartupOverlays(page);
    await expect(page.getByText('Seeded E2E Presentation').first()).toBeVisible({ timeout: 15000 });
    await page.getByText('Seeded E2E Presentation').first().click({ force: true });

    const errorDetailsToggle = page.getByText('Error Details').first();
    if (await errorDetailsToggle.isVisible().catch(() => false)) {
      await errorDetailsToggle.click({ force: true });
      const stack = await page.locator('pre').first().innerText().catch(() => '');
      console.log('PPT_COMPLETENESS_DEBUG_STACK_START');
      console.log(stack);
      console.log('PPT_COMPLETENESS_DEBUG_STACK_END');
    }

    const presentButton = page.getByTestId(PPT_TEST_IDS.editor.startPresentation);
    await expect(presentButton).toBeVisible();
    await presentButton.click();

    await expect(page.getByTestId(PPT_TEST_IDS.slideshow.root)).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(page.getByTestId(PPT_TEST_IDS.editor.exportTrigger)).toBeVisible();
    await page.getByTestId(PPT_TEST_IDS.editor.exportTrigger).click();
    await expect(page.getByTestId(PPT_TEST_IDS.editor.exportMarp)).toBeVisible();
    await expect(page.getByTestId(PPT_TEST_IDS.editor.exportHtml)).toBeVisible();
    await expect(page.getByTestId(PPT_TEST_IDS.editor.exportReveal)).toBeVisible();
    await expect(page.getByTestId(PPT_TEST_IDS.editor.exportPdf)).toBeVisible();
    await expect(page.getByTestId(PPT_TEST_IDS.editor.exportPptx)).toBeVisible();

    const maxDepthErrors = pageErrors.filter((error) =>
      error.toLowerCase().includes('maximum update depth exceeded')
    );
    if (pageErrors.length > 0) {
      await testInfo.attach('ppt-page-errors', {
        body: pageErrors.join('\n\n'),
        contentType: 'text/plain',
      });
    }
    if (consoleErrors.length > 0) {
      await testInfo.attach('ppt-console-errors', {
        body: consoleErrors.join('\n\n'),
        contentType: 'text/plain',
      });
    }
    expect(maxDepthErrors).toHaveLength(0);
  });
});
