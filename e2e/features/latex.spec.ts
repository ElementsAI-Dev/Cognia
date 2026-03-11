import { test, expect } from '@playwright/test';

test.describe('LaTeX Editor Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/latex');
    await page.waitForLoadState('domcontentloaded');
  });

  test('loads core editor controls', async ({ page }) => {
    await expect(page.getByTestId('latex-editor-root')).toBeVisible();
    await expect(page.getByTestId('latex-save-button')).toBeVisible();
    await expect(page.getByTestId('latex-export-button')).toBeVisible();
    await expect(page.getByTestId('latex-tab-history')).toBeVisible();
  });

  test('supports edit -> preview -> AI equation insert -> save -> history -> export', async ({ page }) => {
    const editorContent = page.locator('.cm-content').first();
    await editorContent.click();
    await page.keyboard.type('\\section{Introduction}\\n$E=mc^2$');

    await page.getByTestId('latex-mode-visual').click();
    await expect(page.getByTestId('latex-preview-pane')).toBeVisible();

    await page.getByTestId('latex-mode-source').click();

    await page.getByRole('button', { name: /AI/i }).first().click();
    await page.getByRole('menuitem').nth(1).click();

    await expect(page.getByTestId('latex-equation-result')).toBeVisible();
    await page.getByTestId('latex-equation-result').fill('\\frac{a}{b}');
    await page.getByTestId('latex-equation-insert').click();

    await page.getByTestId('latex-save-button').click();
    await page.getByTestId('latex-tab-history').click();
    await expect(page.getByText(/Version History|版本历史/)).toBeVisible();

    await page.getByTestId('latex-export-button').click();
    await expect(page.getByTestId('latex-export-confirm')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('latex-export-confirm').click(),
    ]);

    expect(download.suggestedFilename()).toContain('.html');
  });
});
