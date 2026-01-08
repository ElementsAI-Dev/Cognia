/**
 * Settings stores index
 */

export {
  useSettingsStore,
  selectTheme,
  selectColorTheme,
  selectLanguage,
  selectDefaultProvider,
  selectSidebarCollapsed,
  selectSearchEnabled,
  selectCompressionSettings,
  selectCompressionEnabled,
  selectBackgroundSettings,
  selectBackgroundEnabled,
  type Theme,
  type Language,
  type CustomTheme,
  type CustomThemeColors,
  type CustomProviderSettings,
  type CodeTheme,
  type FontFamily,
  type MessageBubbleStyle,
} from './settings-store';

export {
  usePresetStore,
  selectPresets,
  selectSelectedPresetId,
} from './preset-store';

export {
  useCustomThemeStore,
  createDefaultThemeTemplate,
  type CustomSyntaxTheme,
} from './custom-theme-store';

export {
  useSettingsProfilesStore,
  type SettingsProfile,
} from './settings-profiles-store';
