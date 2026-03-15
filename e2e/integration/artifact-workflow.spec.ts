import { test, expect } from '@playwright/test';

const SEEDED_SESSION = {
  id: 'session-artifact-workflow',
  title: 'Artifact Workflow Session',
  createdAt: '2026-03-14T00:00:00.000Z',
  updatedAt: '2026-03-14T00:00:00.000Z',
  provider: 'openai',
  model: 'gpt-4o',
  mode: 'chat',
  messageCount: 1,
};

const SEEDED_ARTIFACT = {
  id: 'artifact-workflow-html',
  sessionId: SEEDED_SESSION.id,
  messageId: 'assistant-msg-workflow',
  type: 'html',
  title: 'Workflow Seed Artifact',
  content:
    '<!DOCTYPE html><html><body><section><h1>Workflow Artifact</h1><p>Seeded assistant output</p></section></body></html>',
  language: 'html',
  version: 1,
  createdAt: '2026-03-14T00:00:00.000Z',
  updatedAt: '2026-03-14T00:00:00.000Z',
  metadata: {
    sourceOrigin: 'auto',
    sourceFingerprint: 'workflow-artifact-fingerprint',
    runtimeHealth: 'ready',
    userInitiated: false,
    exportFormats: ['raw'],
  },
};

async function seedWorkflow(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ session, artifact }) => {
      localStorage.setItem('cognia:onboarding:main', 'true');
      localStorage.setItem('cognia:onboarding:feature-tour', 'true');
      localStorage.removeItem('cognia-chat-migration-v3');

      localStorage.setItem(
        'cognia-sessions',
        JSON.stringify({
          state: {
            activeSessionId: session.id,
            modeHistory: [],
            folders: [],
            inputDrafts: {},
          },
          version: 3,
        })
      );

      localStorage.setItem(
        'cognia-sessions-legacy-snapshot-v3',
        JSON.stringify({
          state: {
            sessions: [session],
            activeSessionId: session.id,
          },
        })
      );

      localStorage.setItem(
        'cognia-artifacts',
        JSON.stringify({
          state: {
            artifacts: {
              [artifact.id]: artifact,
            },
            artifactVersions: {},
            artifactWorkspace: {
              scope: 'session',
              sessionId: session.id,
              searchQuery: '',
              typeFilter: 'all',
              runtimeFilter: 'all',
              recentArtifactIds: [artifact.id],
              returnContext: null,
            },
            canvasDocuments: {},
            analysisResults: {},
          },
          version: 2,
        })
      );
    },
    {
      session: SEEDED_SESSION,
      artifact: SEEDED_ARTIFACT,
    }
  );
}

async function openArtifactsPanel(page: import('@playwright/test').Page) {
  const loadingScreen = page.getByRole('status');
  if (await loadingScreen.isVisible().catch(() => false)) {
    await expect(loadingScreen).toBeHidden({ timeout: 15000 });
  }

  const skipSetup = page.getByRole('button', { name: /skip for now/i });
  if (await skipSetup.isVisible().catch(() => false)) {
    await skipSetup.click();
    await expect(page.getByRole('dialog', { name: /welcome to cognia/i })).toBeHidden({
      timeout: 10000,
    });
  }

  await page.getByTestId('chat-panel-toggle').click();
  await page.getByTestId('chat-open-artifact-panel').click();
  await expect(page.getByTestId('artifact-panel')).toBeVisible();
}

test.describe('Artifact Workflow Integration', () => {
  test.beforeEach(async ({ page }) => {
    await seedWorkflow(page);
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.getByTestId('chat-panel-toggle')).toBeVisible();
  });

  test('returns to the same artifact after handing off to Canvas', async ({ page }) => {
    await openArtifactsPanel(page);
    await page.getByTestId(`artifact-list-item-${SEEDED_ARTIFACT.id}`).click();

    await expect(page.getByTestId('artifact-panel')).toContainText(SEEDED_ARTIFACT.title);
    await page.getByTestId('artifact-open-in-canvas').click();

    await expect(page.getByTestId('canvas-panel')).toBeVisible();
    await expect(page.getByTestId('canvas-save-state')).toBeVisible();
    await page.getByTestId('canvas-close-button').dispatchEvent('click');
    const discardClose = page.getByTestId('canvas-close-confirm-discard');
    if (await discardClose.isVisible().catch(() => false)) {
      await discardClose.click();
    }

    await openArtifactsPanel(page);
    await expect(page.getByTestId('artifact-panel')).toContainText(SEEDED_ARTIFACT.title);
  });
});
