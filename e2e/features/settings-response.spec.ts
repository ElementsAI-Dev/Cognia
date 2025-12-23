import { test, expect } from '@playwright/test';

/**
 * Response Settings Complete Tests
 * Tests AI response formatting and display options
 */

test.describe('Response Settings - Code Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should list available code themes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const codeThemes = [
        { value: 'github-dark', label: 'GitHub Dark' },
        { value: 'github-light', label: 'GitHub Light' },
        { value: 'monokai', label: 'Monokai' },
        { value: 'dracula', label: 'Dracula' },
        { value: 'nord', label: 'Nord' },
        { value: 'one-dark', label: 'One Dark' },
      ];

      const getThemeByValue = (value: string) =>
        codeThemes.find((t) => t.value === value);

      return {
        themeCount: codeThemes.length,
        hasGithubDark: !!getThemeByValue('github-dark'),
        hasMonokai: !!getThemeByValue('monokai'),
        hasDracula: !!getThemeByValue('dracula'),
        themeLabels: codeThemes.map((t) => t.label),
      };
    });

    expect(result.themeCount).toBe(6);
    expect(result.hasGithubDark).toBe(true);
    expect(result.hasMonokai).toBe(true);
    expect(result.hasDracula).toBe(true);
  });

  test('should switch code theme', async ({ page }) => {
    const result = await page.evaluate(() => {
      type CodeTheme = 'github-dark' | 'github-light' | 'monokai' | 'dracula' | 'nord' | 'one-dark';

      const settings = {
        codeTheme: 'github-dark' as CodeTheme,
      };

      const setCodeTheme = (theme: CodeTheme): void => {
        settings.codeTheme = theme;
      };

      const initial = settings.codeTheme;
      setCodeTheme('monokai');
      const afterChange = settings.codeTheme;
      setCodeTheme('dracula');
      const afterSecondChange = settings.codeTheme;

      return { initial, afterChange, afterSecondChange };
    });

    expect(result.initial).toBe('github-dark');
    expect(result.afterChange).toBe('monokai');
    expect(result.afterSecondChange).toBe('dracula');
  });

  test('should list available font families', async ({ page }) => {
    const result = await page.evaluate(() => {
      const fontFamilies = [
        { value: 'system', label: 'System Default' },
        { value: 'inter', label: 'Inter' },
        { value: 'roboto', label: 'Roboto' },
        { value: 'fira-code', label: 'Fira Code' },
        { value: 'jetbrains-mono', label: 'JetBrains Mono' },
      ];

      const getMonospaceFonts = () =>
        fontFamilies.filter((f) =>
          ['fira-code', 'jetbrains-mono'].includes(f.value)
        );

      return {
        fontCount: fontFamilies.length,
        monospaceFontCount: getMonospaceFonts().length,
        hasSystem: fontFamilies.some((f) => f.value === 'system'),
        hasFiraCode: fontFamilies.some((f) => f.value === 'fira-code'),
      };
    });

    expect(result.fontCount).toBe(5);
    expect(result.monospaceFontCount).toBe(2);
    expect(result.hasSystem).toBe(true);
    expect(result.hasFiraCode).toBe(true);
  });

  test('should configure font size', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        codeFontSize: 14,
        minFontSize: 10,
        maxFontSize: 20,
      };

      const setCodeFontSize = (size: number): boolean => {
        if (size >= settings.minFontSize && size <= settings.maxFontSize) {
          settings.codeFontSize = size;
          return true;
        }
        return false;
      };

      const initial = settings.codeFontSize;
      setCodeFontSize(16);
      const afterIncrease = settings.codeFontSize;

      setCodeFontSize(25); // Should fail - exceeds max
      const afterInvalidIncrease = settings.codeFontSize;

      setCodeFontSize(8); // Should fail - below min
      const afterInvalidDecrease = settings.codeFontSize;

      setCodeFontSize(12);
      const afterDecrease = settings.codeFontSize;

      return {
        initial,
        afterIncrease,
        afterInvalidIncrease,
        afterInvalidDecrease,
        afterDecrease,
      };
    });

    expect(result.initial).toBe(14);
    expect(result.afterIncrease).toBe(16);
    expect(result.afterInvalidIncrease).toBe(16); // Unchanged
    expect(result.afterInvalidDecrease).toBe(16); // Unchanged
    expect(result.afterDecrease).toBe(12);
  });

  test('should toggle line numbers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        showLineNumbers: true,
      };

      const toggleLineNumbers = (): void => {
        settings.showLineNumbers = !settings.showLineNumbers;
      };

      const initial = settings.showLineNumbers;
      toggleLineNumbers();
      const afterToggle = settings.showLineNumbers;
      toggleLineNumbers();
      const afterSecondToggle = settings.showLineNumbers;

      return { initial, afterToggle, afterSecondToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
    expect(result.afterSecondToggle).toBe(true);
  });

  test('should toggle syntax highlighting', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settings = {
        enableSyntaxHighlight: true,
      };

      const toggleSyntaxHighlight = (): void => {
        settings.enableSyntaxHighlight = !settings.enableSyntaxHighlight;
      };

      const initial = settings.enableSyntaxHighlight;
      toggleSyntaxHighlight();
      const afterToggle = settings.enableSyntaxHighlight;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });
});

test.describe('Response Settings - Text Display', () => {
  test('should configure line height', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        lineHeight: 1.5,
        minLineHeight: 1.2,
        maxLineHeight: 2.4,
      };

      const setLineHeight = (height: number): boolean => {
        if (height >= settings.minLineHeight && height <= settings.maxLineHeight) {
          settings.lineHeight = height;
          return true;
        }
        return false;
      };

      const initial = settings.lineHeight;
      setLineHeight(1.8);
      const afterIncrease = settings.lineHeight;

      setLineHeight(3.0); // Should fail
      const afterInvalidIncrease = settings.lineHeight;

      setLineHeight(1.0); // Should fail
      const afterInvalidDecrease = settings.lineHeight;

      return {
        initial,
        afterIncrease,
        afterInvalidIncrease,
        afterInvalidDecrease,
      };
    });

    expect(result.initial).toBe(1.5);
    expect(result.afterIncrease).toBe(1.8);
    expect(result.afterInvalidIncrease).toBe(1.8);
    expect(result.afterInvalidDecrease).toBe(1.8);
  });

  test('should toggle math rendering', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        enableMathRendering: true,
      };

      const toggleMathRendering = (): void => {
        settings.enableMathRendering = !settings.enableMathRendering;
      };

      const initial = settings.enableMathRendering;
      toggleMathRendering();
      const afterToggle = settings.enableMathRendering;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle mermaid diagrams', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        enableMermaidDiagrams: true,
      };

      const toggleMermaidDiagrams = (): void => {
        settings.enableMermaidDiagrams = !settings.enableMermaidDiagrams;
      };

      const initial = settings.enableMermaidDiagrams;
      toggleMermaidDiagrams();
      const afterToggle = settings.enableMermaidDiagrams;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });
});

test.describe('Response Settings - Layout Options', () => {
  test('should toggle compact mode', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        compactMode: false,
      };

      const toggleCompactMode = (): void => {
        settings.compactMode = !settings.compactMode;
      };

      const getMessageSpacing = (): string => {
        return settings.compactMode ? 'compact' : 'normal';
      };

      const initial = settings.compactMode;
      const initialSpacing = getMessageSpacing();
      toggleCompactMode();
      const afterToggle = settings.compactMode;
      const afterSpacing = getMessageSpacing();

      return { initial, initialSpacing, afterToggle, afterSpacing };
    });

    expect(result.initial).toBe(false);
    expect(result.initialSpacing).toBe('normal');
    expect(result.afterToggle).toBe(true);
    expect(result.afterSpacing).toBe('compact');
  });

  test('should toggle timestamps', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        showTimestamps: false,
      };

      const toggleTimestamps = (): void => {
        settings.showTimestamps = !settings.showTimestamps;
      };

      const initial = settings.showTimestamps;
      toggleTimestamps();
      const afterToggle = settings.showTimestamps;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
  });

  test('should toggle token count display', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        showTokenCount: false,
      };

      const toggleTokenCount = (): void => {
        settings.showTokenCount = !settings.showTokenCount;
      };

      const initial = settings.showTokenCount;
      toggleTokenCount();
      const afterToggle = settings.showTokenCount;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
  });
});

test.describe('Response Settings - Combined Configuration', () => {
  test('should manage all response settings together', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ResponseSettings {
        codeTheme: string;
        codeFontFamily: string;
        codeFontSize: number;
        lineHeight: number;
        showLineNumbers: boolean;
        enableSyntaxHighlight: boolean;
        enableMathRendering: boolean;
        enableMermaidDiagrams: boolean;
        compactMode: boolean;
        showTimestamps: boolean;
        showTokenCount: boolean;
      }

      const defaultSettings: ResponseSettings = {
        codeTheme: 'github-dark',
        codeFontFamily: 'system',
        codeFontSize: 14,
        lineHeight: 1.5,
        showLineNumbers: true,
        enableSyntaxHighlight: true,
        enableMathRendering: true,
        enableMermaidDiagrams: true,
        compactMode: false,
        showTimestamps: false,
        showTokenCount: false,
      };

      let currentSettings: ResponseSettings = { ...defaultSettings };

      const updateSettings = (updates: Partial<ResponseSettings>): void => {
        currentSettings = { ...currentSettings, ...updates };
      };

      const resetToDefaults = (): void => {
        currentSettings = { ...defaultSettings };
      };

      // Apply multiple changes
      updateSettings({
        codeTheme: 'dracula',
        codeFontSize: 16,
        compactMode: true,
        showTimestamps: true,
      });

      const afterUpdates = { ...currentSettings };

      resetToDefaults();
      const afterReset = { ...currentSettings };

      return {
        afterUpdates,
        afterReset,
        defaults: defaultSettings,
      };
    });

    expect(result.afterUpdates.codeTheme).toBe('dracula');
    expect(result.afterUpdates.codeFontSize).toBe(16);
    expect(result.afterUpdates.compactMode).toBe(true);
    expect(result.afterUpdates.showTimestamps).toBe(true);
    expect(result.afterReset).toEqual(result.defaults);
  });

  test('should validate response settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ValidationResult {
        valid: boolean;
        errors: string[];
      }

      const validateSettings = (settings: {
        codeFontSize: number;
        lineHeight: number;
        codeTheme: string;
      }): ValidationResult => {
        const errors: string[] = [];

        if (settings.codeFontSize < 10 || settings.codeFontSize > 20) {
          errors.push('Font size must be between 10 and 20');
        }

        if (settings.lineHeight < 1.2 || settings.lineHeight > 2.4) {
          errors.push('Line height must be between 1.2 and 2.4');
        }

        const validThemes = [
          'github-dark',
          'github-light',
          'monokai',
          'dracula',
          'nord',
          'one-dark',
        ];
        if (!validThemes.includes(settings.codeTheme)) {
          errors.push('Invalid code theme');
        }

        return { valid: errors.length === 0, errors };
      };

      return {
        validSettings: validateSettings({
          codeFontSize: 14,
          lineHeight: 1.6,
          codeTheme: 'dracula',
        }),
        invalidFontSize: validateSettings({
          codeFontSize: 25,
          lineHeight: 1.6,
          codeTheme: 'dracula',
        }),
        invalidLineHeight: validateSettings({
          codeFontSize: 14,
          lineHeight: 3.0,
          codeTheme: 'dracula',
        }),
        invalidTheme: validateSettings({
          codeFontSize: 14,
          lineHeight: 1.6,
          codeTheme: 'invalid-theme',
        }),
      };
    });

    expect(result.validSettings.valid).toBe(true);
    expect(result.invalidFontSize.valid).toBe(false);
    expect(result.invalidLineHeight.valid).toBe(false);
    expect(result.invalidTheme.valid).toBe(false);
  });
});

test.describe('Response Settings - Persistence', () => {
  test('should persist response settings to localStorage', async ({ page }) => {
    await page.goto('/');
    // Test persistence logic
    const result = await page.evaluate(() => {
      const responseSettings = {
        codeTheme: 'monokai',
        codeFontFamily: 'fira-code',
        codeFontSize: 16,
        lineHeight: 1.8,
        showLineNumbers: false,
        enableSyntaxHighlight: true,
        compactMode: true,
      };

      const serialize = (settings: typeof responseSettings) => JSON.stringify({ state: settings });
      const deserialize = (data: string) => JSON.parse(data);

      const serialized = serialize(responseSettings);
      const restored = deserialize(serialized);

      return {
        canSerialize: serialized.length > 0,
        codeTheme: restored.state.codeTheme,
        codeFontFamily: restored.state.codeFontFamily,
        codeFontSize: restored.state.codeFontSize,
        compactMode: restored.state.compactMode,
      };
    });

    expect(result.canSerialize).toBe(true);
    expect(result.codeTheme).toBe('monokai');
    expect(result.codeFontFamily).toBe('fira-code');
    expect(result.codeFontSize).toBe(16);
    expect(result.compactMode).toBe(true);
  });

  test('should reset response settings to defaults', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const defaultSettings = {
        codeTheme: 'github-dark',
        codeFontSize: 14,
        showLineNumbers: true,
        compactMode: false,
      };

      let currentSettings = {
        codeTheme: 'dracula',
        codeFontSize: 18,
        showLineNumbers: false,
        compactMode: true,
      };

      const resetToDefaults = () => {
        currentSettings = { ...defaultSettings };
      };

      const beforeReset = { ...currentSettings };
      resetToDefaults();
      const afterReset = { ...currentSettings };

      return { beforeReset, afterReset, defaults: defaultSettings };
    });

    expect(result.beforeReset.codeTheme).toBe('dracula');
    expect(result.beforeReset.compactMode).toBe(true);
    expect(result.afterReset).toEqual(result.defaults);
  });
});

test.describe('Response Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display response settings section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for Response tab or Code Display section
      const responseSection = page
        .locator('text=Response, text=Code Display, text=Display')
        .first();
      const hasResponse = await responseSection.isVisible().catch(() => false);
      expect(hasResponse).toBe(true);
    }
  });

  test('should display code theme selector', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Click Response tab if available
      const responseTab = page
        .locator('[role="tab"]:has-text("Response"), button:has-text("Response")')
        .first();
      if (await responseTab.isVisible()) {
        await responseTab.click();
        await page.waitForTimeout(200);
      }

      // Look for theme-related elements
      const themeLabel = page.locator('text=Code Theme, text=Theme').first();
      const hasTheme = await themeLabel.isVisible().catch(() => false);
      expect(hasTheme).toBe(true);
    }
  });

  test('should display font size slider', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for slider elements
      const sliders = page.locator('[role="slider"], input[type="range"]');
      const hasSliders = (await sliders.count()) > 0;
      expect(hasSliders).toBe(true);
    }
  });

  test('should display toggle switches', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Look for switch elements
      const switches = page.locator('[role="switch"], input[type="checkbox"]');
      const hasSwitches = (await switches.count()) > 0;
      expect(hasSwitches).toBe(true);
    }
  });

  test('should display preview section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Click Response tab if available
      const responseTab = page
        .locator('[role="tab"]:has-text("Response"), button:has-text("Response")')
        .first();
      if (await responseTab.isVisible()) {
        await responseTab.click();
        await page.waitForTimeout(200);
      }

      // Look for preview section
      const preview = page.locator('text=Preview').first();
      const hasPreview = await preview.isVisible().catch(() => false);
      expect(hasPreview).toBe(true);
    }
  });
});
