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

// Provider settings
export {
  ProviderSettings,
  CustomProviderDialog,
  OAuthLoginButton,
  ProviderImportExport,
  ProviderHealthStatus,
  OllamaModelManager,
} from './provider';

// MCP settings
export {
  McpSettings,
  McpServerDialog,
  McpInstallWizard,
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
} from './appearance';

// Chat settings
export {
  ChatSettings,
  ResponseSettings,
  CustomInstructionsSettings,
} from './chat';

// Tool settings
export {
  ToolSettings,
  SkillSettings,
  NativeToolsSettings,
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
  ProxySettings,
  SpeechSettings,
  SandboxSettings,
  SearchSettings,
  GitSettings,
} from './system';
