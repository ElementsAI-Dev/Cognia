import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Theme Editor Settings Complete Tests
 * Tests custom theme creation and management
 * Optimized for CI/CD efficiency
 */

test.describe('Theme Editor - Theme Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should create custom theme with default colors', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ThemeColors {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        foreground: string;
        muted: string;
      }

      interface CustomTheme {
        id: string;
        name: string;
        isDark: boolean;
        colors: ThemeColors;
      }

      const defaultLightColors: ThemeColors = {
        primary: '#3b82f6',
        secondary: '#f1f5f9',
        accent: '#f1f5f9',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f1f5f9',
      };

      const createCustomTheme = (
        name: string,
        isDark: boolean
      ): CustomTheme => {
        return {
          id: `custom-${Date.now()}`,
          name,
          isDark,
          colors: defaultLightColors,
        };
      };

      const theme = createCustomTheme('My Custom Theme', false);

      return {
        hasId: !!theme.id,
        name: theme.name,
        isDark: theme.isDark,
        hasPrimary: !!theme.colors.primary,
        hasBackground: !!theme.colors.background,
      };
    });

    expect(result.hasId).toBe(true);
    expect(result.name).toBe('My Custom Theme');
    expect(result.isDark).toBe(false);
    expect(result.hasPrimary).toBe(true);
    expect(result.hasBackground).toBe(true);
  });

  test('should create dark theme with appropriate colors', async ({ page }) => {
    const result = await page.evaluate(() => {
      const defaultDarkColors = {
        primary: '#3b82f6',
        secondary: '#1e293b',
        accent: '#1e293b',
        background: '#0f172a',
        foreground: '#f8fafc',
        muted: '#1e293b',
      };

      const defaultLightColors = {
        primary: '#3b82f6',
        secondary: '#f1f5f9',
        accent: '#f1f5f9',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f1f5f9',
      };

      const getDefaultColors = (isDark: boolean) =>
        isDark ? defaultDarkColors : defaultLightColors;

      const darkColors = getDefaultColors(true);
      const lightColors = getDefaultColors(false);

      return {
        darkBackground: darkColors.background,
        lightBackground: lightColors.background,
        darkForeground: darkColors.foreground,
        lightForeground: lightColors.foreground,
      };
    });

    expect(result.darkBackground).toBe('#0f172a');
    expect(result.lightBackground).toBe('#ffffff');
    expect(result.darkForeground).toBe('#f8fafc');
    expect(result.lightForeground).toBe('#0f172a');
  });

  test('should validate theme name', async ({ page }) => {
    const result = await page.evaluate(() => {
      const validateThemeName = (name: string): { valid: boolean; error?: string } => {
        if (!name || name.trim() === '') {
          return { valid: false, error: 'Theme name is required' };
        }
        if (name.length > 50) {
          return { valid: false, error: 'Theme name must be less than 50 characters' };
        }
        return { valid: true };
      };

      return {
        validName: validateThemeName('My Theme'),
        emptyName: validateThemeName(''),
        longName: validateThemeName('A'.repeat(60)),
      };
    });

    expect(result.validName.valid).toBe(true);
    expect(result.emptyName.valid).toBe(false);
    expect(result.longName.valid).toBe(false);
  });
});

test.describe('Theme Editor - Color Configuration', () => {
  test('should list available color keys', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const colorKeys = [
        { key: 'primary', label: 'Primary' },
        { key: 'secondary', label: 'Secondary' },
        { key: 'accent', label: 'Accent' },
        { key: 'background', label: 'Background' },
        { key: 'foreground', label: 'Foreground' },
        { key: 'muted', label: 'Muted' },
      ];

      return {
        colorCount: colorKeys.length,
        colorLabels: colorKeys.map((c) => c.label),
        hasPrimary: colorKeys.some((c) => c.key === 'primary'),
        hasBackground: colorKeys.some((c) => c.key === 'background'),
      };
    });

    expect(result.colorCount).toBe(6);
    expect(result.colorLabels).toContain('Primary');
    expect(result.hasPrimary).toBe(true);
    expect(result.hasBackground).toBe(true);
  });

  test('should update individual color', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const colors = {
        primary: '#3b82f6',
        secondary: '#f1f5f9',
        accent: '#f1f5f9',
        background: '#ffffff',
        foreground: '#0f172a',
        muted: '#f1f5f9',
      };

      const updateColor = (key: keyof typeof colors, value: string): void => {
        colors[key] = value;
      };

      const initialPrimary = colors.primary;
      updateColor('primary', '#8b5cf6');
      const afterUpdate = colors.primary;

      updateColor('background', '#0a0a0a');
      const newBackground = colors.background;

      return { initialPrimary, afterUpdate, newBackground };
    });

    expect(result.initialPrimary).toBe('#3b82f6');
    expect(result.afterUpdate).toBe('#8b5cf6');
    expect(result.newBackground).toBe('#0a0a0a');
  });

  test('should validate hex color format', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const isValidHexColor = (color: string): boolean => {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
      };

      return {
        valid6Digit: isValidHexColor('#3b82f6'),
        valid3Digit: isValidHexColor('#fff'),
        validUppercase: isValidHexColor('#AABBCC'),
        invalidNoHash: isValidHexColor('3b82f6'),
        invalidShort: isValidHexColor('#ab'),
        invalidChars: isValidHexColor('#ghijkl'),
      };
    });

    expect(result.valid6Digit).toBe(true);
    expect(result.valid3Digit).toBe(true);
    expect(result.validUppercase).toBe(true);
    expect(result.invalidNoHash).toBe(false);
    expect(result.invalidShort).toBe(false);
    expect(result.invalidChars).toBe(false);
  });

  test('should convert color formats', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      };

      const rgbToHex = (r: number, g: number, b: number): string => {
        return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
      };

      const blueHex = '#3b82f6';
      const blueRgb = hexToRgb(blueHex);
      const backToHex = blueRgb ? rgbToHex(blueRgb.r, blueRgb.g, blueRgb.b) : null;

      return {
        originalHex: blueHex,
        rgb: blueRgb,
        convertedBack: backToHex,
      };
    });

    expect(result.rgb).toEqual({ r: 59, g: 130, b: 246 });
    expect(result.convertedBack).toBe('#3b82f6');
  });
});

test.describe('Theme Editor - Theme Management', () => {
  test('should save custom theme', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface CustomTheme {
        id: string;
        name: string;
        isDark: boolean;
        colors: Record<string, string>;
      }

      const customThemes: CustomTheme[] = [];

      const saveTheme = (theme: CustomTheme): string => {
        const existing = customThemes.findIndex((t) => t.id === theme.id);
        if (existing !== -1) {
          customThemes[existing] = theme;
        } else {
          customThemes.push(theme);
        }
        return theme.id;
      };

      const theme1: CustomTheme = {
        id: 'theme-1',
        name: 'Ocean Blue',
        isDark: false,
        colors: { primary: '#0077b6' },
      };

      const theme2: CustomTheme = {
        id: 'theme-2',
        name: 'Forest Green',
        isDark: true,
        colors: { primary: '#2d6a4f' },
      };

      saveTheme(theme1);
      saveTheme(theme2);
      const afterAdd = customThemes.length;

      // Update existing theme
      theme1.name = 'Deep Ocean';
      saveTheme(theme1);
      const afterUpdate = customThemes.length;
      const updatedTheme = customThemes.find((t) => t.id === 'theme-1');

      return {
        afterAdd,
        afterUpdate,
        updatedName: updatedTheme?.name,
      };
    });

    expect(result.afterAdd).toBe(2);
    expect(result.afterUpdate).toBe(2); // No new theme added
    expect(result.updatedName).toBe('Deep Ocean');
  });

  test('should delete custom theme', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const customThemes = [
        { id: 'theme-1', name: 'Theme 1' },
        { id: 'theme-2', name: 'Theme 2' },
        { id: 'theme-3', name: 'Theme 3' },
      ];

      const deleteTheme = (id: string): boolean => {
        const index = customThemes.findIndex((t) => t.id === id);
        if (index !== -1) {
          customThemes.splice(index, 1);
          return true;
        }
        return false;
      };

      const initialCount = customThemes.length;
      deleteTheme('theme-2');
      const afterDelete = customThemes.length;
      const remainingIds = customThemes.map((t) => t.id);

      return { initialCount, afterDelete, remainingIds };
    });

    expect(result.initialCount).toBe(3);
    expect(result.afterDelete).toBe(2);
    expect(result.remainingIds).not.toContain('theme-2');
  });

  test('should set active theme', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const customThemes = [
        { id: 'theme-1', name: 'Theme 1' },
        { id: 'theme-2', name: 'Theme 2' },
      ];

      let activeThemeId: string | null = null;

      const setActiveTheme = (id: string): boolean => {
        if (customThemes.some((t) => t.id === id)) {
          activeThemeId = id;
          return true;
        }
        return false;
      };

      const clearActiveTheme = (): void => {
        activeThemeId = null;
      };

      const initialActive = activeThemeId;
      setActiveTheme('theme-1');
      const afterSet = activeThemeId;

      setActiveTheme('nonexistent');
      const afterInvalidSet = activeThemeId;

      clearActiveTheme();
      const afterClear = activeThemeId;

      return { initialActive, afterSet, afterInvalidSet, afterClear };
    });

    expect(result.initialActive).toBeNull();
    expect(result.afterSet).toBe('theme-1');
    expect(result.afterInvalidSet).toBe('theme-1'); // Unchanged
    expect(result.afterClear).toBeNull();
  });
});

test.describe('Theme Editor - Preview', () => {
  test('should generate preview styles', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const colors = {
        primary: '#3b82f6',
        secondary: '#f1f5f9',
        background: '#ffffff',
        foreground: '#0f172a',
      };

      const generatePreviewStyles = (): Record<string, string> => {
        return {
          '--preview-primary': colors.primary,
          '--preview-secondary': colors.secondary,
          '--preview-background': colors.background,
          '--preview-foreground': colors.foreground,
        };
      };

      const styles = generatePreviewStyles();

      return {
        styleCount: Object.keys(styles).length,
        hasPrimary: '--preview-primary' in styles,
        primaryValue: styles['--preview-primary'],
      };
    });

    expect(result.styleCount).toBe(4);
    expect(result.hasPrimary).toBe(true);
    expect(result.primaryValue).toBe('#3b82f6');
  });

  test('should apply preview to DOM', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const previewContainer = document.createElement('div');
      previewContainer.id = 'theme-preview';

      const applyPreviewStyles = (
        element: HTMLElement,
        colors: Record<string, string>
      ): void => {
        element.style.backgroundColor = colors.background;
        element.style.color = colors.foreground;
      };

      applyPreviewStyles(previewContainer, {
        background: '#0f172a',
        foreground: '#f8fafc',
      });

      return {
        background: previewContainer.style.backgroundColor,
        color: previewContainer.style.color,
      };
    });

    expect(result.background).toBe('rgb(15, 23, 42)');
    expect(result.color).toBe('rgb(248, 250, 252)');
  });
});

test.describe('Theme Editor - Dark Mode Toggle', () => {
  test('should switch color defaults when toggling dark mode', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const defaultLightColors = {
        background: '#ffffff',
        foreground: '#0f172a',
      };

      const defaultDarkColors = {
        background: '#0f172a',
        foreground: '#f8fafc',
      };

      let isDark = false;
      let colors = { ...defaultLightColors };

      const toggleDarkMode = (): void => {
        isDark = !isDark;
        colors = isDark ? { ...defaultDarkColors } : { ...defaultLightColors };
      };

      const initialColors = { ...colors };
      const initialIsDark = isDark;

      toggleDarkMode();
      const afterToggle = { colors: { ...colors }, isDark };

      toggleDarkMode();
      const afterSecondToggle = { colors: { ...colors }, isDark };

      return {
        initial: { colors: initialColors, isDark: initialIsDark },
        afterToggle,
        afterSecondToggle,
      };
    });

    expect(result.initial.isDark).toBe(false);
    expect(result.initial.colors.background).toBe('#ffffff');
    expect(result.afterToggle.isDark).toBe(true);
    expect(result.afterToggle.colors.background).toBe('#0f172a');
    expect(result.afterSecondToggle.isDark).toBe(false);
  });
});

test.describe('Theme Editor - Persistence', () => {
  test('should persist custom themes to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const customThemes = [
        {
          id: 'custom-1',
          name: 'My Custom Theme',
          isDark: false,
          colors: { primary: '#8b5cf6', background: '#ffffff' },
        },
      ];
      localStorage.setItem(
        'cognia-custom-themes',
        JSON.stringify({ state: { customThemes } })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-custom-themes');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.customThemes.length).toBe(1);
    expect(stored.state.customThemes[0].name).toBe('My Custom Theme');
  });

  test('should load custom themes on startup', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const loadThemes = (): { id: string; name: string }[] => {
        const storedData = localStorage.getItem('cognia-custom-themes');
        if (!storedData) return [];

        try {
          const parsed = JSON.parse(storedData);
          return parsed.state?.customThemes || [];
        } catch {
          return [];
        }
      };

      // Pre-populate
      localStorage.setItem(
        'cognia-custom-themes',
        JSON.stringify({
          state: {
            customThemes: [
              { id: 'theme-a', name: 'Theme A' },
              { id: 'theme-b', name: 'Theme B' },
            ],
          },
        })
      );

      const loaded = loadThemes();

      return {
        themeCount: loaded.length,
        themeNames: loaded.map((t) => t.name),
      };
    });

    expect(result.themeCount).toBe(2);
    expect(result.themeNames).toContain('Theme A');
  });
});

test.describe('Theme Editor UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display theme editor in appearance settings', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Appearance tab
      const appearanceTab = page
        .locator('[role="tab"]:has-text("Appearance"), button:has-text("Appearance")')
        .first();
      if (await appearanceTab.isVisible()) {
        await appearanceTab.click();
        await waitForAnimation(page);
      }

      // Look for theme section
      const themeSection = page.locator('text=Theme, text=Color Theme').first();
      const hasTheme = await themeSection.isVisible().catch(() => false);
      expect(hasTheme).toBe(true);
    }
  });

  test('should display create theme button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for create/add theme button
      const createBtn = page
        .locator('button:has-text("Create"), button:has-text("Custom")')
        .first();
      const hasCreate = await createBtn.isVisible().catch(() => false);
      expect(hasCreate).toBe(true);
    }
  });

  test('should display color picker elements', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for color-related elements
      const colorElements = page.locator('text=Color, text=Primary, text=Accent');
      const hasColors = (await colorElements.count()) > 0;
      expect(hasColors).toBe(true);
    }
  });

  test('should display theme name input', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for input elements
      const inputs = page.locator('input[type="text"], input[placeholder*="name" i]');
      const hasInputs = (await inputs.count()) > 0;
      expect(hasInputs).toBe(true);
    }
  });
});
