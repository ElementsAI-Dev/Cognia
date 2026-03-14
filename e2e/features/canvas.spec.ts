import { expect, test, type Page } from '@playwright/test';

interface SeedCanvasDocument {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  language: string;
  type: 'code' | 'text';
  createdAt: string;
  updatedAt: string;
  editorContext?: Record<string, unknown>;
  versions?: Array<{
    id: string;
    content: string;
    title: string;
    createdAt: string;
    description?: string;
    isAutoSave?: boolean;
  }>;
  currentVersionId?: string;
}

async function openCanvasPanel(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page
    .locator('[aria-label="Loading core modules..."]')
    .waitFor({ state: 'hidden', timeout: 60000 })
    .catch(() => {});
  const skipButton = page.getByRole('button', { name: /Skip for now/i });
  await skipButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await skipButton.isVisible().catch(() => false)) {
    await skipButton.click();
  }
  const skipTourButton = page.getByRole('button', { name: /Skip tour/i });
  await skipTourButton.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await skipTourButton.isVisible().catch(() => false)) {
    await skipTourButton.click();
  }
  await page
    .locator('[data-slot="dialog-overlay"]')
    .waitFor({ state: 'hidden', timeout: 10000 })
    .catch(() => {});
  await page.keyboard.press('Control+.');
  if (!(await page.getByTestId('canvas-panel').isVisible().catch(() => false))) {
    await page.getByTestId('chat-panel-toggle').click();
    await expect(page.getByTestId('chat-open-canvas-panel')).toBeVisible();
    await page.getByTestId('chat-open-canvas-panel').click();
  }
  await expect(page.getByTestId('canvas-panel')).toBeVisible();
}

async function ensureCanvasDocument(page: Page, title: string) {
  const hasEditor = (await page.evaluate(() => {
    const monacoApi = (window as Window & {
      monaco?: {
        editor?: {
          getEditors?: () => unknown[];
        };
      };
    }).monaco;
    return (monacoApi?.editor?.getEditors?.()?.length ?? 0) > 0;
  }).catch(() => false)) as boolean;

  if (!hasEditor) {
    await page.getByTestId('canvas-doc-new-button').click();
    await page.getByTestId('canvas-doc-title-input').fill(title);
    await page.getByTestId('canvas-doc-create-button').click();
  }

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const monacoApi = (window as Window & {
            monaco?: {
              editor?: {
                getEditors?: () => unknown[];
              };
            };
          }).monaco;
          return monacoApi?.editor?.getEditors?.()?.length ?? 0;
        }),
      { timeout: 15000 }
    )
    .toBeGreaterThan(0)
    .catch(async () => {
      await prewarmMonaco(page);
      await openCanvasPanel(page);
    });

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const monacoApi = (window as Window & {
            monaco?: {
              editor?: {
                getEditors?: () => unknown[];
              };
            };
          }).monaco;
          return monacoApi?.editor?.getEditors?.()?.length ?? 0;
        }),
      { timeout: 180000 }
    )
    .toBeGreaterThan(0);
}

async function ensureMonacoReady(page: Page, timeout = 180000) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const monacoApi = (window as Window & {
            monaco?: {
              editor?: {
                getEditors?: () => unknown[];
              };
            };
          }).monaco;
          return monacoApi?.editor?.getEditors?.()?.length ?? 0;
        }),
      { timeout }
    )
    .toBeGreaterThan(0);
}

async function prewarmMonaco(page: Page) {
  await page.goto('/designer', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const monacoApi = (window as Window & {
            monaco?: {
              editor?: {
                create?: unknown;
              };
            };
          }).monaco;
          return Boolean(monacoApi?.editor?.create);
        }),
      { timeout: 60000 }
    )
    .toBe(true)
    .catch(() => {});
}

async function replaceEditorContent(page: Page, content: string) {
  const updated = await page.evaluate((nextContent) => {
    const monacoApi = (window as Window & {
      monaco?: {
        editor?: {
          getEditors?: () => Array<{
            focus: () => void;
            getModel: () => {
              getFullModelRange?: () => unknown;
              getLineCount?: () => number;
              getLineMaxColumn?: (lineNumber: number) => number;
            } | null;
            executeEdits?: (source: string, edits: Array<{ range: unknown; text: string }>) => void;
          }>;
        };
      };
    }).monaco;

    const editor = monacoApi?.editor?.getEditors?.()?.[0];
    if (!editor) return false;

    const model = editor.getModel();
    if (!model || !editor.executeEdits) return false;

    const lineCount = model.getLineCount?.() ?? 1;
    const fullRange =
      model.getFullModelRange?.() ?? {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: lineCount,
        endColumn: model.getLineMaxColumn?.(lineCount) ?? 1,
      };

    editor.focus();
    editor.executeEdits('canvas-e2e', [{ range: fullRange, text: nextContent }]);
    return true;
  }, content);

  if (!updated) {
    throw new Error('Unable to access Monaco editor instance');
  }
}

async function appendEditorContent(page: Page, suffix: string) {
  const updated = await page.evaluate((nextSuffix) => {
    const monacoApi = (window as Window & {
      monaco?: {
        editor?: {
          getEditors?: () => Array<{
            focus: () => void;
            getPosition?: () => { lineNumber: number; column: number } | null;
            getModel: () => {
              getLineCount?: () => number;
              getLineMaxColumn?: (lineNumber: number) => number;
            } | null;
            executeEdits?: (source: string, edits: Array<{ range: unknown; text: string }>) => void;
          }>;
        };
      };
    }).monaco;

    const editor = monacoApi?.editor?.getEditors?.()?.[0];
    if (!editor) return false;

    const model = editor.getModel();
    if (!model || !editor.executeEdits) return false;

    const position =
      editor.getPosition?.() ?? {
        lineNumber: model.getLineCount?.() ?? 1,
        column: model.getLineMaxColumn?.(model.getLineCount?.() ?? 1) ?? 1,
      };

    editor.focus();
    editor.executeEdits('canvas-e2e-append', [{
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      text: nextSuffix,
    }]);
    return true;
  }, suffix);

  if (!updated) {
    throw new Error('Unable to append Monaco editor content');
  }
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

function normalizeEditorContent(content: string) {
  return content.replace(/\s+/g, '');
}

async function getStoredCanvasEditorContext(page: Page, documentId: string) {
  return page.evaluate((id) => {
    const raw = window.localStorage.getItem('cognia-artifacts');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { canvasDocuments?: Record<string, { editorContext?: Record<string, unknown> }> };
    };
    return parsed.state?.canvasDocuments?.[id]?.editorContext ?? null;
  }, documentId);
}

async function getStoredCanvasDocumentContent(page: Page, documentId: string) {
  return page.evaluate((id) => {
    const raw = window.localStorage.getItem('cognia-artifacts');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { canvasDocuments?: Record<string, { content?: string }> };
    };
    return parsed.state?.canvasDocuments?.[id]?.content ?? null;
  }, documentId);
}

function createLargeCanvasFixture() {
  const filler = Array.from({ length: 220 }, (_, index) =>
    `  const filler${index} = '${'x'.repeat(140)}';`
  ).join('\n');

  return [
    'function alphaSection() {',
    filler,
    '  return filler0;',
    '}',
    '',
    'function betaSection() {',
    filler,
    '  return filler1;',
    '}',
  ].join('\n');
}

async function seedCanvasDocuments(page: Page, documents: SeedCanvasDocument[]) {
  await page.addInitScript((seedDocs: SeedCanvasDocument[]) => {
    const canvasDocuments = Object.fromEntries(seedDocs.map((doc) => [doc.id, doc]));
    localStorage.setItem(
      'cognia-artifacts',
      JSON.stringify({
        state: {
          artifacts: {},
          artifactVersions: {},
          canvasDocuments,
          analysisResults: {},
        },
        version: 1,
      })
    );
  }, documents);
}

test.describe('Canvas Panel (Real UI Journeys)', () => {
  test.describe.configure({ timeout: 240000 });

  test('supports edit/save/close/reopen flow with unsaved guard', async ({ page }) => {
    const seededAt = '2026-03-12T12:00:00.000Z';
    await seedCanvasDocuments(page, [
      {
        id: 'canvas-edit-doc',
        sessionId: 'session-edit',
        title: 'Canvas E2E Edit Flow',
        content: '',
        language: 'javascript',
        type: 'code',
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    ]);

    await openCanvasPanel(page);
    await page.getByText('Canvas E2E Edit Flow').first().click();
    await ensureMonacoReady(page);

    await replaceEditorContent(page, "const flow = 'saved';");

    const saveButton = page.getByTestId('canvas-save-version-button');
    await expect(saveButton).toBeEnabled();

    await page
      .getByTestId('canvas-close-button')
      .evaluate((element: HTMLElement) => element.click());
    await expect(page.getByTestId('canvas-close-confirm-discard')).toBeVisible();
    await page.getByTestId('canvas-close-confirm-cancel').click();
    await expect(page.getByTestId('canvas-panel')).toBeVisible();

    await saveButton.click();
    await expect(saveButton).toBeDisabled();

    await page
      .getByTestId('canvas-close-button')
      .evaluate((element: HTMLElement) => element.click());
    await expect(page.getByTestId('canvas-panel')).toBeHidden();

    await page.getByTestId('chat-panel-toggle').click();
    await expect(page.getByTestId('chat-open-canvas-panel')).toBeVisible();
    await page.getByTestId('chat-open-canvas-panel').click();
    await expect(page.getByTestId('canvas-panel')).toBeVisible();

    await expect
      .poll(async () => normalizeEditorContent(await getEditorContent(page)), { timeout: 10000 })
      .toContain(normalizeEditorContent("const flow = 'saved';"));
  });

  test('requires explicit diff reject/accept for AI transform actions', async ({ page }) => {
    const seededAt = '2026-03-12T12:00:00.000Z';
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

    await seedCanvasDocuments(page, [
      {
        id: 'canvas-ai-doc',
        sessionId: 'session-ai',
        title: 'Canvas E2E AI Flow',
        content: '',
        language: 'javascript',
        type: 'code',
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    ]);

    await openCanvasPanel(page);
    await page.getByText('Canvas E2E AI Flow').first().click();
    await ensureMonacoReady(page);
    await replaceEditorContent(page, 'const value = 1;');

    await page.getByTestId('canvas-action-fix').click();
    await expect(page.getByTestId('canvas-action-scope')).toBeVisible();
    await expect(page.getByTestId('canvas-diff-accept')).toBeVisible();
    await expect(page.getByTestId('canvas-diff-reject')).toBeVisible();

    await page.getByTestId('canvas-diff-reject').click();
    await expect(page.getByTestId('canvas-diff-accept')).toBeHidden();
    await expect
      .poll(async () => normalizeEditorContent(await getEditorContent(page)), { timeout: 10000 })
      .toContain(normalizeEditorContent('const value = 1;'));
    await expect
      .poll(async () => normalizeEditorContent(await getEditorContent(page)), { timeout: 10000 })
      .not.toContain(normalizeEditorContent('// ai transformed'));

    await page.getByTestId('canvas-action-fix').click();
    await expect(page.getByTestId('canvas-diff-accept')).toBeVisible();
    await page.getByTestId('canvas-diff-accept').click();

    await expect(page.getByTestId('canvas-diff-accept')).toBeHidden();
    await expect
      .poll(async () => normalizeEditorContent(await getEditorContent(page)), { timeout: 10000 })
      .toContain(normalizeEditorContent('// ai transformed'));
  });

  test('restores an earlier manual version from version history', async ({ page }) => {
    const seededAt = '2026-03-12T12:00:00.000Z';
    await seedCanvasDocuments(page, [
      {
        id: 'canvas-version-doc',
        sessionId: 'session-version',
        title: 'Canvas E2E Version Flow',
        content: '',
        language: 'javascript',
        type: 'code',
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    ]);

    await openCanvasPanel(page);
    await page.getByText('Canvas E2E Version Flow').first().click();
    await ensureMonacoReady(page);

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
      .poll(async () => normalizeEditorContent(await getEditorContent(page)), { timeout: 10000 })
      .toContain(normalizeEditorContent("const stage = 'v1';"));
  });

  test('preserves long-document location and unsaved state after tab switch return', async ({ page }) => {
    test.setTimeout(120000);

    const largeTitle = 'Canvas E2E Large Flow';
    const secondaryTitle = 'Canvas E2E Secondary';
    const largeContent = createLargeCanvasFixture();
    const editedLargeContent = largeContent.replace(
      'function betaSection() {',
      'function betaSection() {\n// revisit beta section'
    );
    const seededAt = '2026-03-12T12:00:00.000Z';

    await seedCanvasDocuments(page, [
      {
        id: 'canvas-large-doc',
        sessionId: 'session-large',
        title: largeTitle,
        content: editedLargeContent,
        language: 'javascript',
        type: 'code',
        createdAt: seededAt,
        updatedAt: seededAt,
        editorContext: {
          cursorLine: 226,
          cursorColumn: 24,
          saveState: 'dirty',
          performanceMode: 'very-large',
          visibleRange: {
            startLineNumber: 221,
            endLineNumber: 228,
            scrollTop: 4624,
            scrollLeft: 0,
          },
          location: {
            source: 'cursor',
            path: ['betaSection'],
            lineNumber: 226,
            column: 24,
            symbolName: 'betaSection',
          },
        },
        versions: [
          {
            id: 'canvas-large-version-1',
            content: largeContent,
            title: largeTitle,
            createdAt: seededAt,
            description: 'Seed baseline',
          },
        ],
        currentVersionId: 'canvas-large-version-1',
      },
      {
        id: 'canvas-secondary-doc',
        sessionId: 'session-large',
        title: secondaryTitle,
        content: "const secondary = 'ready';",
        language: 'javascript',
        type: 'code',
        createdAt: seededAt,
        updatedAt: seededAt,
      },
    ]);

    await openCanvasPanel(page);
    await page.getByText(largeTitle).first().click();
    await expect(page.getByTestId('canvas-performance-mode')).toBeVisible();
    await expect(page.getByTestId('canvas-structure-location')).toContainText('betaSection');
    await expect(page.getByTestId('canvas-save-state')).toContainText('Unsaved');

    await page.getByText(secondaryTitle).first().click();

    await page.getByText(largeTitle).first().click();
    await expect(page.getByTestId('canvas-save-state')).toContainText('Unsaved');
    await expect(page.getByTestId('canvas-resume-notice')).toBeVisible();
    await expect(page.getByTestId('canvas-structure-location')).toContainText('betaSection');
    await expect(page.getByTestId('canvas-position-indicator')).toContainText('Ln 226, Col 24');
    await expect(
      await getStoredCanvasDocumentContent(page, 'canvas-large-doc')
    ).toContain('// revisit beta section');
    await expect(
      await getStoredCanvasEditorContext(page, 'canvas-large-doc')
    ).toEqual(
      expect.objectContaining({
        saveState: 'dirty',
        cursorLine: 226,
        cursorColumn: 24,
      })
    );
  });
});
