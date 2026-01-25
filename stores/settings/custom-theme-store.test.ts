/**
 * Tests for custom-theme-store
 */

import { act, renderHook } from '@testing-library/react';
import { useCustomThemeStore, createDefaultThemeTemplate } from './custom-theme-store';

// Clear store before each test
beforeEach(() => {
  const { result } = renderHook(() => useCustomThemeStore());
  act(() => {
    // Clear all themes
    result.current.customThemes.forEach((theme) => {
      result.current.deleteTheme(theme.id);
    });
    result.current.selectTheme(null);
  });
});

describe('useCustomThemeStore', () => {
  describe('addTheme', () => {
    it('should add a new theme with generated id', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'my-theme',
          displayName: 'My Theme',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      expect(themeId!).toBeDefined();
      expect(themeId!).toMatch(/^custom-/);
      expect(result.current.customThemes).toHaveLength(1);
      expect(result.current.customThemes[0].name).toBe('my-theme');
      expect(result.current.customThemes[0].displayName).toBe('My Theme');
      expect(result.current.customThemes[0].isDark).toBe(true);
      expect(result.current.customThemes[0].isCustom).toBe(true);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      const beforeTime = new Date();
      act(() => {
        result.current.addTheme({
          name: 'test',
          displayName: 'Test',
          isDark: false,
          colors: createDefaultThemeTemplate('', false).colors,
        });
      });
      const afterTime = new Date();

      const theme = result.current.customThemes[0];
      expect(new Date(theme.createdAt).getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(new Date(theme.createdAt).getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(new Date(theme.updatedAt).getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('updateTheme', () => {
    it('should update existing theme', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'original',
          displayName: 'Original',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      act(() => {
        result.current.updateTheme(themeId!, {
          displayName: 'Updated Name',
          isDark: false,
        });
      });

      const theme = result.current.customThemes.find((t) => t.id === themeId);
      expect(theme?.displayName).toBe('Updated Name');
      expect(theme?.isDark).toBe(false);
      expect(theme?.name).toBe('original'); // Name unchanged
    });

    it('should update updatedAt timestamp', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'test',
          displayName: 'Test',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      const originalUpdatedAt = result.current.customThemes[0].updatedAt;

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime?.(100);

      act(() => {
        result.current.updateTheme(themeId!, { displayName: 'New Name' });
      });

      const newUpdatedAt = result.current.customThemes[0].updatedAt;
      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('deleteTheme', () => {
    it('should remove theme from list', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'to-delete',
          displayName: 'To Delete',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      expect(result.current.customThemes).toHaveLength(1);

      act(() => {
        result.current.deleteTheme(themeId!);
      });

      expect(result.current.customThemes).toHaveLength(0);
    });

    it('should clear selectedCustomThemeId if deleted theme was selected', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'test',
          displayName: 'Test',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
        result.current.selectTheme(themeId);
      });

      expect(result.current.selectedCustomThemeId).toBe(themeId!);

      act(() => {
        result.current.deleteTheme(themeId!);
      });

      expect(result.current.selectedCustomThemeId).toBeNull();
    });
  });

  describe('duplicateTheme', () => {
    it('should create a copy with new id and name', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let originalId = '';
      act(() => {
        originalId = result.current.addTheme({
          name: 'original',
          displayName: 'Original',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      let duplicateId: string | null = null;
      act(() => {
        duplicateId = result.current.duplicateTheme(originalId, 'Copied Theme');
      });

      expect(duplicateId).not.toBeNull();
      expect(duplicateId).not.toBe(originalId);
      expect(result.current.customThemes).toHaveLength(2);

      const duplicate = result.current.customThemes.find((t) => t.id === duplicateId);
      expect(duplicate?.name).toBe('Copied Theme');
      expect(duplicate?.displayName).toBe('Copied Theme');
      expect(duplicate?.isDark).toBe(true);
    });

    it('should return null for non-existent theme', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let duplicateId: string | null = null;
      act(() => {
        duplicateId = result.current.duplicateTheme('non-existent', 'Copy');
      });

      expect(duplicateId).toBeNull();
    });
  });

  describe('getTheme', () => {
    it('should return theme by id', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'test',
          displayName: 'Test Theme',
          isDark: false,
          colors: createDefaultThemeTemplate('', false).colors,
        });
      });

      const theme = result.current.getTheme(themeId!);
      expect(theme).toBeDefined();
      expect(theme?.displayName).toBe('Test Theme');
    });

    it('should return undefined for non-existent id', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      const theme = result.current.getTheme('non-existent');
      expect(theme).toBeUndefined();
    });
  });

  describe('selectTheme', () => {
    it('should update selectedCustomThemeId', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'test',
          displayName: 'Test',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      expect(result.current.selectedCustomThemeId).toBeNull();

      act(() => {
        result.current.selectTheme(themeId!);
      });

      expect(result.current.selectedCustomThemeId).toBe(themeId!);
    });

    it('should allow setting to null', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'test',
          displayName: 'Test',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
        result.current.selectTheme(themeId);
      });

      expect(result.current.selectedCustomThemeId).toBe(themeId!);

      act(() => {
        result.current.selectTheme(null);
      });

      expect(result.current.selectedCustomThemeId).toBeNull();
    });
  });

  describe('exportTheme', () => {
    it('should return JSON string for existing theme', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let themeId: string;
      act(() => {
        themeId = result.current.addTheme({
          name: 'export-test',
          displayName: 'Export Test',
          isDark: true,
          colors: createDefaultThemeTemplate('', true).colors,
        });
      });

      const json = result.current.exportTheme(themeId!);
      expect(json).not.toBeNull();

      const parsed = JSON.parse(json!);
      expect(parsed.name).toBe('export-test');
      expect(parsed.displayName).toBe('Export Test');
      expect(parsed.isDark).toBe(true);
      expect(parsed.colors).toBeDefined();
      expect(parsed.version).toBe('1.0');
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should return null for non-existent theme', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      const json = result.current.exportTheme('non-existent');
      expect(json).toBeNull();
    });
  });

  describe('importTheme', () => {
    it('should import valid theme JSON', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      const themeJson = JSON.stringify({
        name: 'imported-theme',
        displayName: 'Imported Theme',
        isDark: true,
        colors: createDefaultThemeTemplate('', true).colors,
      });

      let importResult: { success: boolean; error?: string; themeId?: string };
      act(() => {
        importResult = result.current.importTheme(themeJson);
      });

      expect(importResult!.success).toBe(true);
      expect(importResult!.themeId).toBeDefined();
      expect(result.current.customThemes).toHaveLength(1);
      expect(result.current.customThemes[0].displayName).toBe('Imported Theme');
    });

    it('should reject invalid JSON', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importTheme('not valid json');
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBeDefined();
    });

    it('should reject theme with missing required fields', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      const incompleteJson = JSON.stringify({
        name: 'test',
        // missing displayName and colors
      });

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importTheme(incompleteJson);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toContain('missing required fields');
    });

    it('should reject theme with missing color properties', () => {
      const { result } = renderHook(() => useCustomThemeStore());

      const incompleteColorsJson = JSON.stringify({
        name: 'test',
        displayName: 'Test',
        colors: {
          background: '#000000',
          // missing other required colors
        },
      });

      let importResult: { success: boolean; error?: string };
      act(() => {
        importResult = result.current.importTheme(incompleteColorsJson);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toContain('missing color');
    });
  });
});

describe('createDefaultThemeTemplate', () => {
  it('should create dark theme template', () => {
    const template = createDefaultThemeTemplate('My Dark Theme', true);

    expect(template.name).toBe('my-dark-theme');
    expect(template.displayName).toBe('My Dark Theme');
    expect(template.isDark).toBe(true);
    expect(template.colors.background).toBe('#1e1e1e');
    expect(template.colors.foreground).toBe('#d4d4d4');
  });

  it('should create light theme template', () => {
    const template = createDefaultThemeTemplate('My Light Theme', false);

    expect(template.name).toBe('my-light-theme');
    expect(template.displayName).toBe('My Light Theme');
    expect(template.isDark).toBe(false);
    expect(template.colors.background).toBe('#ffffff');
    expect(template.colors.foreground).toBe('#24292f');
  });

  it('should convert name to kebab-case', () => {
    const template = createDefaultThemeTemplate('My Custom Theme Name', true);
    expect(template.name).toBe('my-custom-theme-name');
  });

  it('should include all required color properties', () => {
    const template = createDefaultThemeTemplate('Test', true);
    const requiredColors = [
      'background',
      'foreground',
      'comment',
      'keyword',
      'string',
      'number',
      'function',
      'operator',
      'property',
      'className',
      'constant',
      'tag',
      'attrName',
      'attrValue',
      'punctuation',
      'selection',
      'lineHighlight',
    ];

    for (const color of requiredColors) {
      expect(template.colors[color as keyof typeof template.colors]).toBeDefined();
    }
  });
});
