/**
 * Settings components index
 * Re-exports from organized subfolders
 */

// Common/shared components
export {
  SettingsCard,
  SettingsRow,
  SettingsToggle,
  SettingsGrid,
  SettingsDivider,
  SettingsGroup,
  SaveButton,
  SettingsPageHeader,
  SettingsAlert,
  SettingsEmptyState,
  QuickSettingsCard,
  SetupWizard,
} from './common';

// Rules editor
export { RulesEditor } from './rules';

// Provider settings
export {
  ProviderSettings,
  CustomProviderDialog,
  OAuthLoginButton,
  ProviderImportExport,
  ProviderHealthStatus,
  OllamaModelManager,
  LocalProviderCard,
  LocalProviderModelManager,
  LocalProviderSettings,
  LocalProviderSetupWizard,
  CLIProxyAPISettings,
  OpenRouterSettings,
  ModelManager,
} from './provider';

// MCP settings
export {
  McpSettings,
  McpServerDialog,
  McpInstallWizard,
  McpMarketplace,
  McpMarketplaceDetailDialog,
} from './mcp';

// Vector database settings
export {
  VectorSettings,
  VectorManager,
} from './vector';

// Appearance settings
export {
  AppearanceSettings,
  ThemeEditor,
  UICustomizationSettings,
  BackgroundSettings,
  SettingsProfiles,
  ThemeImportExport,
  ThemePreview,
  ThemePreviewInline,
  ThemeSchedule,
} from './appearance';

// Chat settings
export {
  ChatSettings,
  ResponseSettings,
  CustomInstructionsSettings,
  AutoRouterSettings,
  SafetySettings,
  TokenizerSettings,
} from './chat';

// Tool settings
export {
  ToolSettings,
  SkillSettings,
  NativeToolsSettings,
  SourceVerificationSettings,
} from './tools';

// Data settings
export {
  DataSettings,
  MemorySettings,
  UsageSettings,
} from './data';

// System settings
export {
  DesktopSettings,
  EnvironmentSettings,
  KeyboardSettings,
  KeyboardShortcutsSettings,
  ProxySettings,
  SpeechSettings,
  SandboxSettings,
  SearchSettings,
  GitSettings,
  TraySettings,
} from './system';

// Shortcuts settings
export {
  ShortcutConflictDialog,
  ShortcutManager,
} from './shortcuts';
