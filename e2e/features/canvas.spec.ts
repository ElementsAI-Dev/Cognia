import { expect, test, type Page } from '@playwright/test';

async function openCanvasPanel(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.keyboard.press('Control+.');
  await expect(page.getByTestId('canvas-panel')).toBeVisible();
}

async function ensureCanvasDocument(page: Page, title: string) {
  const editor = page.locator('[data-testid="canvas-panel"] .monaco-editor').first();
  const hasEditor = await editor.isVisible().catch(() => false);

  if (!hasEditor) {
    await page.getByTestId('canvas-doc-new-button').click();
    await page.getByTestId('canvas-doc-title-input').fill(title);
    await page.getByTestId('canvas-doc-create-button').click();
  }

  await expect(editor).toBeVisible();
}

async function replaceEditorContent(page: Page, content: string) {
  const input = page.locator('[data-testid="canvas-panel"] .monaco-editor textarea').first();
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(content);
}

async function getEditorContent(page: Page) {
  return page.evaluate(() => {
    const lines = Array.from(
      document.querySelectorAll('[data-testid="canvas-panel"] .monaco-editor .view-line')
    );
    return lines
      .map((line) => (line.textContent || '').replace(/\u00a0/g, ''))
      .join('\n')
      .trim();
  });
}

test.describe('Canvas Panel (Real UI Journeys)', () => {
  test('supports edit/save/close/reopen flow with unsaved guard', async ({ page }) => {
    await openCanvasPanel(page);
    await ensureCanvasDocument(page, 'Canvas E2E Edit Flow');

    await replaceEditorContent(page, "const flow = 'saved';");

    const saveButton = page.getByTestId('canvas-save-version-button');
    await expect(saveButton).toBeEnabled();

    await page.getByTestId('canvas-close-button').click();
    await expect(page.getByTestId('canvas-close-confirm-discard')).toBeVisible();
    await page.getByTestId('canvas-close-confirm-cancel').click();
    await expect(page.getByTestId('canvas-panel')).toBeVisible();

    await saveButton.click();
    await expect(saveButton).toBeDisabled();

    await page.getByTestId('canvas-close-button').click();
    await expect(page.getByTestId('canvas-panel')).toBeHidden();

    await page.keyboard.press('Control+.');
    await expect(page.getByTestId('canvas-panel')).toBeVisible();

    await expect
      .poll(async () => getEditorContent(page), { timeout: 10000 })
      .toContain("const flow = 'saved';");
  });

  test('requires explicit diff reject/accept for AI transform actions', async ({ page }) => {
    await page.addInitScript(() => {
      (
        window as Window & {
          __COGNIA_CANVAS_ACTION_TEST__?: {
            getResult: (req: { content: string }) => { result: string };
          };
        }
      ).__COGNIA_CANVAS_ACTION_TEST__ = {
        getResult: ({ content }) => ({ result: `${content}\n// ai transformed` }),
      };
    });

    await openCanvasPanel(page);
    await ensureCanvasDocument(page, 'Canvas E2E AI Flow');
    await replaceEditorContent(page, 'const value = 1;');

    await page.getByTestId('canvas-action-fix').click();
    await expect(page.getByTestId('canvas-action-scope')).toBeVisible();
    await expect(page.getByTestId('canvas-diff-accept')).toBeVisible();
    await expect(page.getByTestId('canvas-diff-reject')).toBeVisible();

    await page.getByTestId('canvas-diff-reject').click();
    await expect(page.getByTestId('canvas-diff-accept')).toBeHidden();
    await expect
      .poll(async () => getEditorContent(page), { timeout: 10000 })
      .toContain('const value = 1;');
    await expect
      .poll(async () => getEditorContent(page), { timeout: 10000 })
      .not.toContain('// ai transformed');

    await page.getByTestId('canvas-action-fix').click();
    await expect(page.getByTestId('canvas-diff-accept')).toBeVisible();
    await page.getByTestId('canvas-diff-accept').click();

    await expect(page.getByTestId('canvas-diff-accept')).toBeHidden();
    await expect
      .poll(async () => getEditorContent(page), { timeout: 10000 })
      .toContain('// ai transformed');
  });

  test('restores an earlier manual version from version history', async ({ page }) => {
    await openCanvasPanel(page);
    await ensureCanvasDocument(page, 'Canvas E2E Version Flow');

    await replaceEditorContent(page, "const stage = 'v1';");
    await page.getByTestId('canvas-save-version-button').click();

    await replaceEditorContent(page, "const stage = 'v2';");
    await page.getByTestId('canvas-save-version-button').click();

    await page.getByTestId('canvas-version-history-trigger').click();
    await expect(page.getByTestId('canvas-version-history-panel')).toBeVisible();

    const restoreButtons = page.locator('[data-testid^="canvas-version-restore-"]');
    await expect(restoreButtons.first()).toBeVisible();
    await restoreButtons.first().click();

    await expect
      .poll(async () => getEditorContent(page), { timeout: 10000 })
      .toContain("const stage = 'v1';");
  });
});
