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
  type Theme,
  type Language,
  type CustomTheme,
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
