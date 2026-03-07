import { test } from '@playwright/test';

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

test('debug ppt max-depth stack', async ({ page }) => {
  test.setTimeout(120000);
  page.on('pageerror', (error) => {
    console.log('PPT_DEBUG_PAGEERROR_START');
    console.log(error.stack || error.message);
    console.log('PPT_DEBUG_PAGEERROR_END');
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`PPT_DEBUG_CONSOLE_ERROR: ${msg.text()}`);
    }
  });
  await page.addInitScript((presentation) => {
    localStorage.setItem('cognia:onboarding:main', 'true');
    localStorage.setItem('cognia:onboarding:feature-tour', 'true');
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
  await page
    .waitForFunction(() => !document.querySelector('[role="status"][aria-live="polite"]'), null, {
      timeout: 12000,
    })
    .catch(() => undefined);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.getByText('Seeded E2E Presentation').first().click({ force: true });

  await Promise.race([
    page.getByTestId('ppt-editor-start-presentation').waitFor({ state: 'visible', timeout: 15000 }),
    page.getByText('Error Details').first().waitFor({ state: 'visible', timeout: 15000 }),
  ]).catch(() => undefined);

  const detailsToggle = page.getByText('Error Details').first();
  if (await detailsToggle.isVisible().catch(() => false)) {
    await detailsToggle.click({ force: true });
    const stack = await page.locator('pre').first().innerText().catch(() => '');
    console.log('PPT_DEBUG_COMPONENT_STACK_START');
    console.log(stack);
    console.log('PPT_DEBUG_COMPONENT_STACK_END');
  }
});
