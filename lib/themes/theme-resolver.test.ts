import {
  applyResolvedThemeToDocument,
  resolveActiveThemeColors,
} from './theme-resolver';
import { THEME_PRESETS } from './presets';

describe('theme-resolver', () => {
  it('resolves preset colors when no custom theme is active', () => {
    const resolved = resolveActiveThemeColors({
      colorTheme: 'ocean',
      resolvedTheme: 'dark',
      activeCustomThemeId: null,
      customThemes: [],
    });

    expect(resolved.themeSource).toBe('preset');
    expect(resolved.colors).toEqual(THEME_PRESETS.ocean.dark);
    expect(resolved.activeCustomTheme).toBeNull();
  });

  it('keeps explicit custom tokens and fills missing values with fallback', () => {
    const resolved = resolveActiveThemeColors({
      colorTheme: 'default',
      resolvedTheme: 'light',
      activeCustomThemeId: 'custom-1',
      customThemes: [
        {
          id: 'custom-1',
          name: 'Custom',
          colors: {
            primary: '#111111',
            primaryForeground: '#fefefe',
            secondary: '#222222',
            secondaryForeground: '#ededed',
            accent: '#333333',
            accentForeground: '#dddddd',
            background: '#444444',
            foreground: '#cccccc',
            muted: '#555555',
            mutedForeground: '#bbbbbb',
            card: '#666666',
            cardForeground: '#aaaaaa',
            border: '#777777',
            ring: '#888888',
            destructive: '#999999',
            destructiveForeground: '#010101',
          },
        },
      ],
    });

    expect(resolved.themeSource).toBe('custom');
    expect(resolved.colors).toMatchObject({
      primary: '#111111',
      primaryForeground: '#fefefe',
      card: '#666666',
      ring: '#888888',
      destructiveForeground: '#010101',
    });
  });

  it('falls back derived tokens only when custom tokens are missing', () => {
    const resolved = resolveActiveThemeColors({
      colorTheme: 'rose',
      resolvedTheme: 'dark',
      activeCustomThemeId: 'custom-2',
      customThemes: [
        {
          id: 'custom-2',
          colors: {
            primary: '#010203',
            secondary: '#020304',
            accent: '#030405',
            background: '#040506',
            foreground: '#050607',
            muted: '#060708',
          },
        },
      ],
    });

    expect(resolved.colors.card).toBe('#040506');
    expect(resolved.colors.cardForeground).toBe('#050607');
    expect(resolved.colors.ring).toBe('#010203');
    expect(resolved.colors.border).toBe(THEME_PRESETS.rose.dark.border);
  });

  it('applies resolved theme variables to document', () => {
    const resolved = resolveActiveThemeColors({
      colorTheme: 'default',
      resolvedTheme: 'light',
      activeCustomThemeId: null,
      customThemes: [],
    });

    applyResolvedThemeToDocument(resolved, document.documentElement);

    expect(document.documentElement.style.getPropertyValue('--primary')).toBe(
      THEME_PRESETS.default.light.primary
    );
    expect(document.documentElement.style.getPropertyValue('--popover')).toBe(
      THEME_PRESETS.default.light.card
    );
  });
});

