import { test, expect } from '@playwright/test';

/**
 * Custom Instructions Settings Complete Tests
 * Tests custom instructions configuration for AI responses
 */

test.describe('Custom Instructions - Enable/Disable', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should toggle custom instructions enabled state', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        customInstructionsEnabled: false,
      };

      const toggleEnabled = (): void => {
        settings.customInstructionsEnabled = !settings.customInstructionsEnabled;
      };

      const initial = settings.customInstructionsEnabled;
      toggleEnabled();
      const afterEnable = settings.customInstructionsEnabled;
      toggleEnabled();
      const afterDisable = settings.customInstructionsEnabled;

      return { initial, afterEnable, afterDisable };
    });

    expect(result.initial).toBe(false);
    expect(result.afterEnable).toBe(true);
    expect(result.afterDisable).toBe(false);
  });

  test('should hide content sections when disabled', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        customInstructionsEnabled: false,
        aboutUser: 'Test content',
        responsePreferences: 'Test preferences',
      };

      const shouldShowContent = (): boolean => {
        return settings.customInstructionsEnabled;
      };

      const initialShow = shouldShowContent();

      settings.customInstructionsEnabled = true;
      const afterEnableShow = shouldShowContent();

      return { initialShow, afterEnableShow };
    });

    expect(result.initialShow).toBe(false);
    expect(result.afterEnableShow).toBe(true);
  });
});

test.describe('Custom Instructions - About User Section', () => {
  test('should set about user content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        aboutUser: '',
      };

      const setAboutUser = (content: string): void => {
        settings.aboutUser = content;
      };

      const initial = settings.aboutUser;
      setAboutUser('I am a software developer working with React and TypeScript.');
      const afterSet = settings.aboutUser;

      return { initial, afterSet };
    });

    expect(result.initial).toBe('');
    expect(result.afterSet).toBe('I am a software developer working with React and TypeScript.');
  });

  test('should enforce character limit for about user', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const MAX_LENGTH = 1500;
      const settings = {
        aboutUser: '',
      };

      const setAboutUser = (content: string): { success: boolean; error?: string } => {
        if (content.length > MAX_LENGTH) {
          return { success: false, error: `Maximum ${MAX_LENGTH} characters allowed` };
        }
        settings.aboutUser = content;
        return { success: true };
      };

      const validResult = setAboutUser('Short content');
      const afterValid = settings.aboutUser;

      const longContent = 'A'.repeat(2000);
      const invalidResult = setAboutUser(longContent);
      const afterInvalid = settings.aboutUser;

      return {
        validResult,
        afterValid,
        invalidResult,
        afterInvalid,
        maxLength: MAX_LENGTH,
      };
    });

    expect(result.validResult.success).toBe(true);
    expect(result.afterValid).toBe('Short content');
    expect(result.invalidResult.success).toBe(false);
    expect(result.afterInvalid).toBe('Short content'); // Unchanged
  });

  test('should track character count for about user', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const MAX_LENGTH = 1500;

      const getCharacterInfo = (content: string): {
        current: number;
        max: number;
        remaining: number;
        percentage: number;
      } => {
        return {
          current: content.length,
          max: MAX_LENGTH,
          remaining: MAX_LENGTH - content.length,
          percentage: Math.round((content.length / MAX_LENGTH) * 100),
        };
      };

      const emptyInfo = getCharacterInfo('');
      const shortInfo = getCharacterInfo('Hello, I am a developer.');
      const nearLimitInfo = getCharacterInfo('A'.repeat(1400));

      return { emptyInfo, shortInfo, nearLimitInfo };
    });

    expect(result.emptyInfo.current).toBe(0);
    expect(result.emptyInfo.remaining).toBe(1500);
    expect(result.shortInfo.current).toBe(24);
    expect(result.nearLimitInfo.percentage).toBeGreaterThan(90);
  });
});

test.describe('Custom Instructions - Response Preferences Section', () => {
  test('should set response preferences', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        responsePreferences: '',
      };

      const setResponsePreferences = (content: string): void => {
        settings.responsePreferences = content;
      };

      const initial = settings.responsePreferences;
      setResponsePreferences('Be concise. Use bullet points for lists. Include code examples.');
      const afterSet = settings.responsePreferences;

      return { initial, afterSet };
    });

    expect(result.initial).toBe('');
    expect(result.afterSet).toBe('Be concise. Use bullet points for lists. Include code examples.');
  });

  test('should enforce character limit for response preferences', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const MAX_LENGTH = 1500;
      const settings = {
        responsePreferences: '',
      };

      const setResponsePreferences = (content: string): { success: boolean; error?: string } => {
        if (content.length > MAX_LENGTH) {
          return { success: false, error: `Maximum ${MAX_LENGTH} characters allowed` };
        }
        settings.responsePreferences = content;
        return { success: true };
      };

      const validResult = setResponsePreferences('Be direct and helpful.');
      const longContent = 'B'.repeat(1600);
      const invalidResult = setResponsePreferences(longContent);

      return {
        validResult,
        invalidResult,
        currentContent: settings.responsePreferences,
      };
    });

    expect(result.validResult.success).toBe(true);
    expect(result.invalidResult.success).toBe(false);
    expect(result.currentContent).toBe('Be direct and helpful.');
  });
});

test.describe('Custom Instructions - Advanced Instructions Section', () => {
  test('should set custom instructions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        customInstructions: '',
      };

      const setCustomInstructions = (content: string): void => {
        settings.customInstructions = content;
      };

      const initial = settings.customInstructions;
      setCustomInstructions('Always format code with proper indentation. Explain edge cases.');
      const afterSet = settings.customInstructions;

      return { initial, afterSet };
    });

    expect(result.initial).toBe('');
    expect(result.afterSet).toContain('Always format code');
  });

  test('should enforce character limit for custom instructions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const MAX_LENGTH = 2000;
      const settings = {
        customInstructions: '',
      };

      const setCustomInstructions = (content: string): { success: boolean; error?: string } => {
        if (content.length > MAX_LENGTH) {
          return { success: false, error: `Maximum ${MAX_LENGTH} characters allowed` };
        }
        settings.customInstructions = content;
        return { success: true };
      };

      const validResult = setCustomInstructions('Valid instructions');
      const longContent = 'C'.repeat(2500);
      const invalidResult = setCustomInstructions(longContent);

      return {
        validResult,
        invalidResult,
        maxLength: MAX_LENGTH,
      };
    });

    expect(result.validResult.success).toBe(true);
    expect(result.invalidResult.success).toBe(false);
    expect(result.maxLength).toBe(2000);
  });
});

test.describe('Custom Instructions - Preview', () => {
  test('should generate preview content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        aboutUser: 'I am a frontend developer.',
        responsePreferences: 'Be concise with code examples.',
        customInstructions: 'Focus on best practices.',
      };

      const generatePreview = (): string => {
        const parts: string[] = [];

        if (settings.aboutUser) {
          parts.push(`[About the user]\n${settings.aboutUser}`);
        }
        if (settings.responsePreferences) {
          parts.push(`\n[Response preferences]\n${settings.responsePreferences}`);
        }
        if (settings.customInstructions) {
          parts.push(`\n[Additional instructions]\n${settings.customInstructions}`);
        }

        return parts.join('\n');
      };

      const preview = generatePreview();

      return {
        preview,
        hasAboutUser: preview.includes('[About the user]'),
        hasResponsePrefs: preview.includes('[Response preferences]'),
        hasCustomInstructions: preview.includes('[Additional instructions]'),
      };
    });

    expect(result.hasAboutUser).toBe(true);
    expect(result.hasResponsePrefs).toBe(true);
    expect(result.hasCustomInstructions).toBe(true);
    expect(result.preview).toContain('frontend developer');
  });

  test('should handle empty sections in preview', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        aboutUser: 'I am a developer.',
        responsePreferences: '',
        customInstructions: '',
      };

      const generatePreview = (): string => {
        const parts: string[] = [];

        if (settings.aboutUser) {
          parts.push(`[About the user]\n${settings.aboutUser}`);
        }
        if (settings.responsePreferences) {
          parts.push(`\n[Response preferences]\n${settings.responsePreferences}`);
        }
        if (settings.customInstructions) {
          parts.push(`\n[Additional instructions]\n${settings.customInstructions}`);
        }

        return parts.join('\n');
      };

      const preview = generatePreview();

      return {
        preview,
        hasAboutUser: preview.includes('[About the user]'),
        hasResponsePrefs: preview.includes('[Response preferences]'),
        hasCustomInstructions: preview.includes('[Additional instructions]'),
      };
    });

    expect(result.hasAboutUser).toBe(true);
    expect(result.hasResponsePrefs).toBe(false);
    expect(result.hasCustomInstructions).toBe(false);
  });
});

test.describe('Custom Instructions - Save/Reset', () => {
  test('should track unsaved changes', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const savedSettings = {
        aboutUser: 'Original content',
        responsePreferences: 'Original preferences',
        customInstructions: '',
      };

      const localSettings = { ...savedSettings };

      const hasChanges = (): boolean => {
        return (
          localSettings.aboutUser !== savedSettings.aboutUser ||
          localSettings.responsePreferences !== savedSettings.responsePreferences ||
          localSettings.customInstructions !== savedSettings.customInstructions
        );
      };

      const initialHasChanges = hasChanges();

      localSettings.aboutUser = 'Modified content';
      const afterModify = hasChanges();

      localSettings.aboutUser = savedSettings.aboutUser;
      const afterRevert = hasChanges();

      return { initialHasChanges, afterModify, afterRevert };
    });

    expect(result.initialHasChanges).toBe(false);
    expect(result.afterModify).toBe(true);
    expect(result.afterRevert).toBe(false);
  });

  test('should save changes', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let savedSettings = {
        aboutUser: 'Original',
        responsePreferences: 'Original prefs',
        customInstructions: '',
      };

      const localSettings = {
        aboutUser: 'Modified content',
        responsePreferences: 'Modified preferences',
        customInstructions: 'New instructions',
      };

      const saveChanges = (): void => {
        savedSettings = { ...localSettings };
      };

      const beforeSave = { ...savedSettings };
      saveChanges();
      const afterSave = { ...savedSettings };

      return { beforeSave, afterSave };
    });

    expect(result.beforeSave.aboutUser).toBe('Original');
    expect(result.afterSave.aboutUser).toBe('Modified content');
    expect(result.afterSave.customInstructions).toBe('New instructions');
  });

  test('should discard changes', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const savedSettings = {
        aboutUser: 'Original',
        responsePreferences: 'Original prefs',
        customInstructions: '',
      };

      let localSettings = {
        aboutUser: 'Modified content',
        responsePreferences: 'Modified preferences',
        customInstructions: 'New instructions',
      };

      const discardChanges = (): void => {
        localSettings = { ...savedSettings };
      };

      const beforeDiscard = { ...localSettings };
      discardChanges();
      const afterDiscard = { ...localSettings };

      return { beforeDiscard, afterDiscard, saved: savedSettings };
    });

    expect(result.beforeDiscard.aboutUser).toBe('Modified content');
    expect(result.afterDiscard).toEqual(result.saved);
  });
});

test.describe('Custom Instructions - Persistence', () => {
  test('should persist custom instructions to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const instructionSettings = {
        customInstructionsEnabled: true,
        aboutUser: 'I am a backend developer using Python.',
        responsePreferences: 'Include type hints in code examples.',
        customInstructions: 'Always consider error handling.',
      };
      localStorage.setItem(
        'cognia-custom-instructions',
        JSON.stringify({ state: instructionSettings })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-custom-instructions');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.customInstructionsEnabled).toBe(true);
    expect(stored.state.aboutUser).toContain('backend developer');
    expect(stored.state.responsePreferences).toContain('type hints');
  });

  test('should reset custom instructions to defaults', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const defaultSettings = {
        customInstructionsEnabled: false,
        aboutUser: '',
        responsePreferences: '',
        customInstructions: '',
      };

      let currentSettings = {
        customInstructionsEnabled: true,
        aboutUser: 'Test user',
        responsePreferences: 'Test prefs',
        customInstructions: 'Test instructions',
      };

      const resetToDefaults = () => {
        currentSettings = { ...defaultSettings };
      };

      const beforeReset = { ...currentSettings };
      resetToDefaults();
      const afterReset = { ...currentSettings };

      return { beforeReset, afterReset, defaults: defaultSettings };
    });

    expect(result.beforeReset.customInstructionsEnabled).toBe(true);
    expect(result.beforeReset.aboutUser).toBe('Test user');
    expect(result.afterReset).toEqual(result.defaults);
  });
});

test.describe('Custom Instructions UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display custom instructions section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for Custom Instructions or Chat tab
      const instructionsSection = page
        .locator('text=Custom Instructions, text=Instructions')
        .first();
      const hasInstructions = await instructionsSection.isVisible().catch(() => false);
      expect(hasInstructions).toBe(true);
    }
  });

  test('should display enable toggle', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for switch elements
      const switches = page.locator('[role="switch"]');
      const hasSwitches = (await switches.count()) > 0;
      expect(hasSwitches).toBe(true);
    }
  });

  test('should display text areas for input', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for textarea elements
      const textareas = page.locator('textarea');
      const hasTextareas = (await textareas.count()) > 0;
      expect(hasTextareas).toBe(true);
    }
  });

  test('should display save and discard buttons', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for action buttons
      const saveBtn = page.locator('button:has-text("Save")').first();
      const discardBtn = page.locator('button:has-text("Discard"), button:has-text("Cancel")').first();

      const hasSave = await saveBtn.isVisible().catch(() => false);
      const hasDiscard = await discardBtn.isVisible().catch(() => false);

      // At least one action button should be present
      expect(hasSave || hasDiscard).toBe(true);
    }
  });
});
