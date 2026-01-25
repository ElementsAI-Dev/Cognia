/**
 * Settings Store - manages user preferences and provider configurations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { getPluginEventHooks } from '@/lib/plugin/hooks-system';
import {
  isStrongholdAvailable,
  secureStoreProviderApiKey,
  secureStoreProviderApiKeys,
  secureStoreSearchApiKey,
  secureStoreCustomProviderApiKey,
  secureRemoveProviderApiKey,
} from '@/lib/native/stronghold-integration';
import type { UserProviderSettings, ApiKeyRotationStrategy, ProviderName } from '@/types/provider';
import {
  getNextApiKey,
  recordApiKeySuccess,
  recordApiKeyError,
  getDefaultUsageStats,
} from '@/lib/ai/infrastructure/api-key-rotation';
import type {
  ColorThemePreset,
  UICustomization,
  BorderRadiusSize,
  SpacingSize,
  ShadowIntensity,
  BackgroundSettings,
  BackgroundImageFit,
  BackgroundImagePosition,
  BackgroundImageSource,
} from '@/lib/themes';
import {
  DEFAULT_UI_CUSTOMIZATION,
  DEFAULT_BACKGROUND_SETTINGS,
  normalizeBackgroundSettings,
} from '@/lib/themes';
import {
  deleteBackgroundImageAsset,
  saveBackgroundImageAsset,
} from '@/lib/themes/background-assets';
import type {
  SearchProviderType,
  SearchProviderSettings,
  SourceVerificationSettings,
  SourceVerificationMode,
} from '@/types/search';
import {
  DEFAULT_SEARCH_PROVIDER_SETTINGS,
  DEFAULT_SOURCE_VERIFICATION_SETTINGS,
} from '@/types/search';
import type { SpeechSettings, SpeechLanguageCode, SpeechProvider } from '@/types/media/speech';
import { DEFAULT_SPEECH_SETTINGS } from '@/types/media/speech';
import type {
  CompressionSettings,
  CompressionStrategy,
  CompressionTrigger,
  CompressionModelConfig,
} from '@/types/system/compression';
import { DEFAULT_COMPRESSION_SETTINGS } from '@/types/system/compression';
import type { AutoDetectResult } from '@/lib/i18n/locale-auto-detect';
import type {
  AutoRouterSettings,
  RoutingMode,
  RoutingStrategy,
  ModelTier,
} from '@/types/provider/auto-router';
import { DEFAULT_AUTO_ROUTER_SETTINGS } from '@/types/provider/auto-router';
import type {
  LoadBalancerSettings,
  LoadBalancingStrategy,
  ProviderWeight,
  CircuitBreakerSettings,
} from '@/types/provider/load-balancer';
import { DEFAULT_LOAD_BALANCER_SETTINGS } from '@/types/provider/load-balancer';
import type {
  ChatHistoryContextSettings,
  HistoryContextCompressionLevel,
} from '@/types/core/chat-history-context';
import { DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS } from '@/types/core/chat-history-context';
import type { TokenizerSettings, TokenizerProvider } from '@/types/system/tokenizer';
import { DEFAULT_TOKENIZER_SETTINGS } from '@/types/system/tokenizer';
import type {
  FeatureRoutingSettings,
  FeatureId,
  FeatureRoutingMode,
} from '@/types/routing/feature-router';
import { DEFAULT_FEATURE_ROUTING_SETTINGS } from '@/types/routing/feature-router';
import type {
  WelcomeSettings,
  CustomSuggestion,
  QuickAccessLink,
  WelcomeSectionVisibility,
} from '@/types/settings/welcome';
import { DEFAULT_WELCOME_SETTINGS } from '@/types/settings/welcome';
import type { ChatMode } from '@/types/core';

// Safety Mode types
export type SafetyMode = 'off' | 'warn' | 'block';
export type SafetyCheckType = 'input' | 'system' | 'toolCall';

export interface SafetyRule {
  id: string;
  name: string;
  pattern: string | RegExp;
  type: SafetyCheckType[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  enabled: boolean;
}

export interface ExternalReviewConfig {
  enabled: boolean;
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeoutMs: number;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  fallbackMode: 'allow' | 'block';
}

export interface SafetyModeSettings {
  enabled: boolean;
  mode: SafetyMode;
  checkUserInput: boolean;
  checkSystemPrompt: boolean;
  checkToolCalls: boolean;
  blockDangerousCommands: boolean;
  rules: SafetyRule[];
  customBlockedPatterns: (string | RegExp)[];
  customAllowedPatterns: (string | RegExp)[];
  externalReview: ExternalReviewConfig;
  logSafetyEvents: boolean;
  showSafetyWarnings: boolean;
}

const DEFAULT_SAFETY_MODE_SETTINGS: SafetyModeSettings = {
  enabled: false,
  mode: 'warn',
  checkUserInput: true,
  checkSystemPrompt: true,
  checkToolCalls: true,
  blockDangerousCommands: true,
  rules: [],
  customBlockedPatterns: [],
  customAllowedPatterns: [],
  externalReview: {
    enabled: false,
    endpoint: '',
    timeoutMs: 5000,
    minSeverity: 'high',
    fallbackMode: 'allow',
  },
  logSafetyEvents: true,
  showSafetyWarnings: true,
};

const syncProviderKeysToStronghold = (providerId: string, get: () => SettingsState): void => {
  if (!isStrongholdAvailable()) return;
  const settings = get().providerSettings[providerId];
  if (!settings) return;
  if (settings.apiKey) {
    void secureStoreProviderApiKey(providerId, settings.apiKey);
  }
  if (settings.apiKeys && settings.apiKeys.length > 0) {
    void secureStoreProviderApiKeys(providerId, settings.apiKeys);
  }
};

const syncSearchKeyToStronghold = (providerId: string, apiKey: string | undefined): void => {
  if (!apiKey || !isStrongholdAvailable()) return;
  void secureStoreSearchApiKey(providerId, apiKey);
};

const syncCustomKeyToStronghold = (providerId: string, apiKey: string | undefined): void => {
  if (!apiKey || !isStrongholdAvailable()) return;
  void secureStoreCustomProviderApiKey(providerId, apiKey);
};

// Observability settings
export interface ObservabilitySettings {
  enabled: boolean;
  langfuseEnabled: boolean;
  langfusePublicKey: string;
  langfuseSecretKey: string;
  langfuseHost: string;
  openTelemetryEnabled: boolean;
  openTelemetryEndpoint: string;
  serviceName: string;
}

const DEFAULT_OBSERVABILITY_SETTINGS: ObservabilitySettings = {
  enabled: false,
  langfuseEnabled: true,
  langfusePublicKey: '',
  langfuseSecretKey: '',
  langfuseHost: 'https://cloud.langfuse.com',
  openTelemetryEnabled: false,
  openTelemetryEndpoint: 'http://localhost:4318/v1/traces',
  serviceName: 'cognia-ai',
};

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh-CN';

export interface ThemeScheduleSettings {
  enabled: boolean;
  lightModeStart: string; // HH:MM
  darkModeStart: string; // HH:MM
}

const DEFAULT_THEME_SCHEDULE: ThemeScheduleSettings = {
  enabled: false,
  lightModeStart: '07:00',
  darkModeStart: '19:00',
};

// Response display settings types
export type CodeTheme =
  | 'github-dark'
  | 'github-light'
  | 'monokai'
  | 'dracula'
  | 'nord'
  | 'one-dark';
export type FontFamily = 'system' | 'inter' | 'roboto' | 'fira-code' | 'jetbrains-mono';
export type MessageBubbleStyle = 'default' | 'minimal' | 'bordered' | 'gradient';

// Custom theme interface - supports full 16 colors for complete customization
export interface CustomThemeColors {
  // Core colors
  primary: string;
  primaryForeground?: string;
  secondary: string;
  secondaryForeground?: string;
  accent: string;
  accentForeground?: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground?: string;
  // Card colors
  card?: string;
  cardForeground?: string;
  // Border and ring
  border?: string;
  ring?: string;
  // Destructive
  destructive?: string;
  destructiveForeground?: string;
}

export interface CustomTheme {
  id: string;
  name: string;
  colors: CustomThemeColors;
  isDark: boolean;
}

// Custom provider interface (extends UserProviderSettings)
export interface CustomProviderSettings extends UserProviderSettings {
  isCustom: true;
  customName: string;
  customModels: string[];
}

// Simplified Mode settings - clean, minimal interface like OpenAI/Claude
export type SimplifiedModePreset = 'off' | 'minimal' | 'focused' | 'zen';

export interface SimplifiedModeSettings {
  enabled: boolean;
  preset: SimplifiedModePreset;
  // Header customization
  hideModelSelector: boolean;
  hideModeSelector: boolean;
  hideSessionActions: boolean;
  // Input customization
  hideAdvancedInputControls: boolean;
  hideAttachmentButton: boolean;
  hideWebSearchToggle: boolean;
  hideThinkingToggle: boolean;
  hidePresetSelector: boolean;
  hideContextIndicator: boolean;
  // Welcome screen customization
  hideFeatureBadges: boolean;
  hideSuggestionDescriptions: boolean;
  hideQuickAccessLinks: boolean;
  // Sidebar behavior
  autoHideSidebar: boolean;
  // Message display
  hideMessageActions: boolean;
  hideMessageTimestamps: boolean;
  hideTokenCount: boolean;
  // Keyboard shortcut to toggle
  toggleShortcut: string;
}

export const DEFAULT_SIMPLIFIED_MODE_SETTINGS: SimplifiedModeSettings = {
  enabled: false,
  preset: 'off',
  hideModelSelector: false,
  hideModeSelector: false,
  hideSessionActions: false,
  hideAdvancedInputControls: false,
  hideAttachmentButton: false,
  hideWebSearchToggle: false,
  hideThinkingToggle: false,
  hidePresetSelector: false,
  hideContextIndicator: false,
  hideFeatureBadges: false,
  hideSuggestionDescriptions: false,
  hideQuickAccessLinks: false,
  autoHideSidebar: false,
  hideMessageActions: false,
  hideMessageTimestamps: false,
  hideTokenCount: false,
  toggleShortcut: 'CommandOrControl+Shift+S',
};

// Preset configurations for simplified mode
// - minimal: Light simplification, keeps most features
// - focused: ChatGPT/Claude-like clean experience with simplified welcome
// - zen: Ultra-minimal, distraction-free writing
export const SIMPLIFIED_MODE_PRESETS: Record<
  SimplifiedModePreset,
  Partial<SimplifiedModeSettings>
> = {
  off: {
    enabled: false,
  },
  minimal: {
    // Light simplification - hides advanced controls but keeps core features
    enabled: true,
    hideAdvancedInputControls: true,
    hidePresetSelector: true,
    hideContextIndicator: true,
    hideFeatureBadges: true,
  },
  focused: {
    // ChatGPT/Claude-like: Clean centered welcome, simplified input
    enabled: true,
    hideAdvancedInputControls: true,
    hideAttachmentButton: false, // Keep attachment for file uploads
    hideWebSearchToggle: true,
    hideThinkingToggle: true,
    hidePresetSelector: true,
    hideContextIndicator: true,
    hideFeatureBadges: true,
    hideSuggestionDescriptions: false, // SimplifiedWelcome handles this
    hideQuickAccessLinks: true,
    autoHideSidebar: true,
    hideMessageActions: false, // Keep core message actions
    hideMessageTimestamps: true,
    hideTokenCount: true,
  },
  zen: {
    // Ultra-minimal: Maximum focus, minimal UI
    enabled: true,
    hideModelSelector: true,
    hideModeSelector: true,
    hideSessionActions: true,
    hideAdvancedInputControls: true,
    hideAttachmentButton: true,
    hideWebSearchToggle: true,
    hideThinkingToggle: true,
    hidePresetSelector: true,
    hideContextIndicator: true,
    hideFeatureBadges: true,
    hideSuggestionDescriptions: true,
    hideQuickAccessLinks: true,
    autoHideSidebar: true,
    hideMessageActions: true,
    hideMessageTimestamps: true,
    hideTokenCount: true,
  },
};

interface SettingsState {
  // Theme (light/dark/system mode)
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Theme schedule (automatic light/dark switching)
  themeSchedule: ThemeScheduleSettings;
  setThemeSchedule: (updates: Partial<ThemeScheduleSettings>) => void;
  setThemeScheduleEnabled: (enabled: boolean) => void;

  // Color theme preset
  colorTheme: ColorThemePreset;
  setColorTheme: (theme: ColorThemePreset) => void;

  // Custom themes
  customThemes: CustomTheme[];
  activeCustomThemeId: string | null;
  createCustomTheme: (theme: Omit<CustomTheme, 'id'>) => string;
  updateCustomTheme: (id: string, theme: Partial<CustomTheme>) => void;
  deleteCustomTheme: (id: string) => void;
  setActiveCustomTheme: (id: string | null) => void;

  // UI Customization
  uiCustomization: UICustomization;
  setUICustomization: (customization: Partial<UICustomization>) => void;
  setBorderRadius: (size: BorderRadiusSize) => void;
  setSpacing: (size: SpacingSize) => void;
  setShadowIntensity: (intensity: ShadowIntensity) => void;
  setEnableAnimations: (enabled: boolean) => void;
  setEnableBlur: (enabled: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setChatMaxWidth: (width: number) => void;
  resetUICustomization: () => void;

  // Language
  language: Language;
  setLanguage: (language: Language) => void;

  // Locale auto-detection
  autoDetectLocale: boolean;
  setAutoDetectLocale: (enabled: boolean) => void;
  localeDetectionResult: AutoDetectResult | null;
  setLocaleDetectionResult: (result: AutoDetectResult | null) => void;
  detectedTimezone: string | null;
  setDetectedTimezone: (timezone: string | null) => void;

  // Custom Instructions (global)
  customInstructions: string;
  customInstructionsEnabled: boolean;
  aboutUser: string;
  responsePreferences: string;
  setCustomInstructions: (instructions: string) => void;
  setCustomInstructionsEnabled: (enabled: boolean) => void;
  setAboutUser: (about: string) => void;
  setResponsePreferences: (preferences: string) => void;

  // Provider settings (built-in)
  providerSettings: Record<string, UserProviderSettings>;
  setProviderSettings: (providerId: string, settings: Partial<UserProviderSettings>) => void;
  updateProviderSettings: (providerId: string, settings: Partial<UserProviderSettings>) => void;
  getProviderSettings: (providerId: string) => UserProviderSettings | undefined;

  // Multi-API Key management
  addApiKey: (providerId: string, apiKey: string) => void;
  removeApiKey: (providerId: string, apiKeyIndex: number) => void;
  setApiKeyRotation: (
    providerId: string,
    enabled: boolean,
    strategy?: ApiKeyRotationStrategy
  ) => void;
  getActiveApiKey: (providerId: string) => string | undefined;
  rotateToNextApiKey: (providerId: string) => string | undefined;
  recordApiKeyUsage: (
    providerId: string,
    apiKey: string,
    success: boolean,
    errorMessage?: string
  ) => void;
  resetApiKeyStats: (providerId: string, apiKey: string) => void;

  // Custom providers
  customProviders: Record<string, CustomProviderSettings>;
  addCustomProvider: (provider: Omit<CustomProviderSettings, 'isCustom'>) => string;
  updateCustomProvider: (id: string, updates: Partial<CustomProviderSettings>) => void;
  removeCustomProvider: (id: string) => void;
  getCustomProvider: (id: string) => CustomProviderSettings | undefined;

  // Default provider
  defaultProvider: string;
  setDefaultProvider: (providerId: string) => void;

  // UI preferences
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // Chat preferences
  streamingEnabled: boolean;
  setStreamingEnabled: (enabled: boolean) => void;
  streamResponses: boolean;
  setStreamResponses: (enabled: boolean) => void;
  sendOnEnter: boolean;
  setSendOnEnter: (enabled: boolean) => void;

  // Chat behavior settings
  defaultTemperature: number;
  setDefaultTemperature: (temp: number) => void;
  defaultMaxTokens: number;
  setDefaultMaxTokens: (tokens: number) => void;
  contextLength: number;
  setContextLength: (length: number) => void;
  autoTitleGeneration: boolean;
  setAutoTitleGeneration: (enabled: boolean) => void;
  showModelInChat: boolean;
  setShowModelInChat: (show: boolean) => void;
  enableMarkdownRendering: boolean;
  setEnableMarkdownRendering: (enabled: boolean) => void;

  // Search preferences (Legacy Tavily - for backward compatibility)
  tavilyApiKey: string;
  setTavilyApiKey: (key: string) => void;
  searchEnabled: boolean;
  setSearchEnabled: (enabled: boolean) => void;
  searchMaxResults: number;
  setSearchMaxResults: (count: number) => void;

  // Search preferences (Multi-provider)
  searchProviders: Record<SearchProviderType, SearchProviderSettings>;
  setSearchProviderSettings: (
    providerId: SearchProviderType,
    settings: Partial<SearchProviderSettings>
  ) => void;
  setSearchProviderApiKey: (providerId: SearchProviderType, apiKey: string) => void;
  setSearchProviderEnabled: (providerId: SearchProviderType, enabled: boolean) => void;
  setSearchProviderPriority: (providerId: SearchProviderType, priority: number) => void;
  defaultSearchProvider: SearchProviderType;
  setDefaultSearchProvider: (providerId: SearchProviderType) => void;
  searchFallbackEnabled: boolean;
  setSearchFallbackEnabled: (enabled: boolean) => void;

  // Research preferences
  defaultSearchSources: string[];
  setDefaultSearchSources: (sources: string[]) => void;

  // Source verification settings
  sourceVerificationSettings: SourceVerificationSettings;
  setSourceVerificationSettings: (settings: Partial<SourceVerificationSettings>) => void;
  setSourceVerificationEnabled: (enabled: boolean) => void;
  setSourceVerificationMode: (mode: SourceVerificationMode) => void;
  setMinimumCredibilityScore: (score: number) => void;
  addTrustedDomain: (domain: string) => void;
  removeTrustedDomain: (domain: string) => void;
  addBlockedDomain: (domain: string) => void;
  removeBlockedDomain: (domain: string) => void;
  setAutoFilterLowCredibility: (enabled: boolean) => void;
  setEnableCrossValidation: (enabled: boolean) => void;

  // Tool settings
  enableFileTools: boolean;
  setEnableFileTools: (enabled: boolean) => void;
  enableDocumentTools: boolean;
  setEnableDocumentTools: (enabled: boolean) => void;
  enableCodeExecution: boolean;
  setEnableCodeExecution: (enabled: boolean) => void;
  enableWebSearch: boolean;
  setEnableWebSearch: (enabled: boolean) => void;
  enableRAGSearch: boolean;
  setEnableRAGSearch: (enabled: boolean) => void;
  enableCalculator: boolean;
  setEnableCalculator: (enabled: boolean) => void;
  enableProcessTools: boolean;
  setEnableProcessTools: (enabled: boolean) => void;
  alwaysAllowedTools: string[];
  addAlwaysAllowedTool: (toolName: string) => void;
  removeAlwaysAllowedTool: (toolName: string) => void;
  isToolAlwaysAllowed: (toolName: string) => boolean;
  clearAlwaysAllowedTools: () => void;

  // Response display settings
  codeTheme: CodeTheme;
  setCodeTheme: (theme: CodeTheme) => void;
  codeFontFamily: FontFamily;
  setCodeFontFamily: (font: FontFamily) => void;
  codeFontSize: number;
  setCodeFontSize: (size: number) => void;
  showLineNumbers: boolean;
  setShowLineNumbers: (show: boolean) => void;
  codeWordWrap: boolean;
  setCodeWordWrap: (wrap: boolean) => void;
  enableSyntaxHighlight: boolean;
  setEnableSyntaxHighlight: (enable: boolean) => void;
  lineHeight: number;
  setLineHeight: (height: number) => void;
  enableMathRendering: boolean;
  setEnableMathRendering: (enable: boolean) => void;
  mathFontScale: number;
  setMathFontScale: (scale: number) => void;
  mathDisplayAlignment: 'center' | 'left';
  setMathDisplayAlignment: (align: 'center' | 'left') => void;
  mathShowCopyButton: boolean;
  setMathShowCopyButton: (show: boolean) => void;
  enableMermaidDiagrams: boolean;
  setEnableMermaidDiagrams: (enable: boolean) => void;
  mermaidTheme: 'default' | 'dark' | 'forest' | 'neutral';
  setMermaidTheme: (theme: 'default' | 'dark' | 'forest' | 'neutral') => void;
  enableVegaLiteCharts: boolean;
  setEnableVegaLiteCharts: (enable: boolean) => void;
  vegaLiteTheme: 'default' | 'dark' | 'excel' | 'fivethirtyeight';
  setVegaLiteTheme: (theme: 'default' | 'dark' | 'excel' | 'fivethirtyeight') => void;
  compactMode: boolean;
  setCompactMode: (compact: boolean) => void;
  showTimestamps: boolean;
  setShowTimestamps: (show: boolean) => void;
  showTokenCount: boolean;
  setShowTokenCount: (show: boolean) => void;

  // Appearance enhancements
  uiFontSize: number;
  setUIFontSize: (size: number) => void;
  messageBubbleStyle: MessageBubbleStyle;
  setMessageBubbleStyle: (style: MessageBubbleStyle) => void;

  // Background settings
  backgroundSettings: BackgroundSettings;
  setBackgroundSettings: (settings: Partial<BackgroundSettings>) => void;
  setBackgroundEnabled: (enabled: boolean) => void;
  setBackgroundSource: (source: BackgroundImageSource) => void;
  setBackgroundImageUrl: (url: string) => void;
  setBackgroundLocalFile: (file: File) => Promise<void>;
  setBackgroundPreset: (presetId: string | null) => void;
  setBackgroundFit: (fit: BackgroundImageFit) => void;
  setBackgroundPosition: (position: BackgroundImagePosition) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setBackgroundBlur: (blur: number) => void;
  setBackgroundOverlay: (color: string, opacity: number) => void;
  setBackgroundBrightness: (brightness: number) => void;
  setBackgroundSaturation: (saturation: number) => void;
  setBackgroundAttachment: (attachment: 'fixed' | 'scroll' | 'local') => void;
  setBackgroundAnimation: (animation: 'none' | 'kenburns' | 'parallax' | 'gradient-shift') => void;
  setBackgroundAnimationSpeed: (speed: number) => void;
  setBackgroundContrast: (contrast: number) => void;
  setBackgroundGrayscale: (grayscale: number) => void;
  resetBackgroundSettings: () => void;
  clearBackground: () => Promise<void>;

  // Advanced chat parameters
  defaultTopP: number;
  setDefaultTopP: (value: number) => void;
  defaultFrequencyPenalty: number;
  setDefaultFrequencyPenalty: (value: number) => void;
  defaultPresencePenalty: number;
  setDefaultPresencePenalty: (value: number) => void;

  // Keyboard shortcut customization
  customShortcuts: Record<string, string>;
  setCustomShortcut: (id: string, keys: string) => void;
  resetShortcuts: () => void;

  // Speech settings
  speechSettings: SpeechSettings;
  setSpeechSettings: (settings: Partial<SpeechSettings>) => void;
  setSttEnabled: (enabled: boolean) => void;
  setSttLanguage: (language: SpeechLanguageCode) => void;
  setSttProvider: (provider: SpeechProvider) => void;
  setSttContinuous: (continuous: boolean) => void;
  setSttAutoSend: (autoSend: boolean) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsVoice: (voice: string) => void;
  setTtsRate: (rate: number) => void;
  setTtsAutoPlay: (autoPlay: boolean) => void;

  // Compression settings
  compressionSettings: CompressionSettings;
  setCompressionSettings: (settings: Partial<CompressionSettings>) => void;
  setCompressionEnabled: (enabled: boolean) => void;
  setCompressionStrategy: (strategy: CompressionStrategy) => void;
  setCompressionTrigger: (trigger: CompressionTrigger) => void;
  setCompressionTokenThreshold: (threshold: number) => void;
  setCompressionMessageThreshold: (threshold: number) => void;
  setCompressionPreserveRecent: (count: number) => void;
  setCompressionPreserveSystem: (preserve: boolean) => void;
  setCompressionRatio: (ratio: number) => void;
  setCompressionModel: (config: Partial<CompressionModelConfig>) => void;
  setCompressionNotification: (show: boolean) => void;
  setCompressionUndo: (enable: boolean) => void;

  // Auto Router settings
  autoRouterSettings: AutoRouterSettings;
  setAutoRouterSettings: (settings: Partial<AutoRouterSettings>) => void;
  setAutoRouterEnabled: (enabled: boolean) => void;
  setAutoRouterMode: (mode: RoutingMode) => void;
  setAutoRouterStrategy: (strategy: RoutingStrategy) => void;
  setAutoRouterShowIndicator: (show: boolean) => void;
  setAutoRouterPreferredProviders: (providers: string[]) => void;
  setAutoRouterExcludedProviders: (providers: string[]) => void;
  setAutoRouterFallbackTier: (tier: ModelTier) => void;
  resetAutoRouterSettings: () => void;

  // Load Balancer settings
  loadBalancerSettings: LoadBalancerSettings;
  setLoadBalancerSettings: (settings: Partial<LoadBalancerSettings>) => void;
  setLoadBalancerEnabled: (enabled: boolean) => void;
  setLoadBalancingStrategy: (strategy: LoadBalancingStrategy) => void;
  setLoadBalancerWeights: (weights: ProviderWeight[]) => void;
  setLoadBalancerStickySession: (enabled: boolean) => void;
  setLoadBalancerFallbackOrder: (providers: string[]) => void;
  setLoadBalancerAutoFailover: (enabled: boolean) => void;
  setLoadBalancerMaxRetries: (retries: number) => void;
  setCircuitBreakerSettings: (settings: Partial<CircuitBreakerSettings>) => void;
  setCircuitBreakerEnabled: (enabled: boolean) => void;
  resetLoadBalancerSettings: () => void;

  // Chat History Context settings
  chatHistoryContextSettings: ChatHistoryContextSettings;
  setChatHistoryContextSettings: (settings: Partial<ChatHistoryContextSettings>) => void;
  setChatHistoryContextEnabled: (enabled: boolean) => void;
  setChatHistoryContextSessionCount: (count: number) => void;
  setChatHistoryContextTokenBudget: (budget: number) => void;
  setChatHistoryContextCompressionLevel: (level: HistoryContextCompressionLevel) => void;
  setChatHistoryContextIncludeTitles: (include: boolean) => void;
  setChatHistoryContextExcludeEmpty: (exclude: boolean) => void;
  setChatHistoryContextMinMessages: (min: number) => void;
  setChatHistoryContextIncludeTimestamps: (include: boolean) => void;
  setChatHistoryContextSameProjectOnly: (sameProject: boolean) => void;
  resetChatHistoryContextSettings: () => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  setOnboardingCompleted: (completed: boolean) => void;

  // Tokenizer settings
  tokenizerSettings: TokenizerSettings;
  setTokenizerSettings: (settings: Partial<TokenizerSettings>) => void;
  setTokenizerEnabled: (enabled: boolean) => void;
  setTokenizerProvider: (provider: TokenizerProvider) => void;
  setTokenizerAutoDetect: (enabled: boolean) => void;
  setTokenizerCache: (enabled: boolean) => void;
  setTokenizerCacheTTL: (ttl: number) => void;
  setTokenizerTimeout: (timeout: number) => void;
  setTokenizerFallback: (enabled: boolean) => void;
  setTokenizerShowBreakdown: (show: boolean) => void;
  setTokenizerContextWarning: (show: boolean) => void;
  setTokenizerContextThreshold: (threshold: number) => void;
  resetTokenizerSettings: () => void;

  // Safety Mode settings
  safetyModeSettings: SafetyModeSettings;
  setSafetyModeSettings: (settings: Partial<SafetyModeSettings>) => void;
  setSafetyModeEnabled: (enabled: boolean) => void;
  setSafetyMode: (mode: SafetyMode) => void;
  setCheckUserInput: (enabled: boolean) => void;
  setCheckSystemPrompt: (enabled: boolean) => void;
  setCheckToolCalls: (enabled: boolean) => void;
  setBlockDangerousCommands: (enabled: boolean) => void;
  addSafetyRule: (rule: Omit<SafetyRule, 'id'>) => string;
  updateSafetyRule: (id: string, updates: Partial<SafetyRule>) => void;
  removeSafetyRule: (id: string) => void;
  enableSafetyRule: (id: string) => void;
  disableSafetyRule: (id: string) => void;
  addCustomBlockedPattern: (pattern: string | RegExp) => void;
  removeCustomBlockedPattern: (pattern: string | RegExp) => void;
  addCustomAllowedPattern: (pattern: string | RegExp) => void;
  removeCustomAllowedPattern: (pattern: string | RegExp) => void;
  setExternalReviewConfig: (config: Partial<ExternalReviewConfig>) => void;
  setLogSafetyEvents: (enabled: boolean) => void;
  setShowSafetyWarnings: (enabled: boolean) => void;
  resetSafetyModeSettings: () => void;

  // Observability settings
  observabilitySettings: ObservabilitySettings;
  updateObservabilitySettings: (settings: Partial<ObservabilitySettings>) => void;
  setObservabilityEnabled: (enabled: boolean) => void;

  // Feature Routing settings
  featureRoutingSettings: FeatureRoutingSettings;
  setFeatureRoutingSettings: (settings: Partial<FeatureRoutingSettings>) => void;
  setFeatureRoutingEnabled: (enabled: boolean) => void;
  setFeatureRoutingMode: (mode: FeatureRoutingMode) => void;
  setFeatureRoutingThreshold: (threshold: number) => void;
  setFeatureRoutingAutoNavigate: (enabled: boolean) => void;
  addDisabledRoute: (routeId: FeatureId) => void;
  removeDisabledRoute: (routeId: FeatureId) => void;
  updateRoutePreference: (routeId: FeatureId, delta: number) => void;
  resetFeatureRoutingSettings: () => void;

  // Welcome Settings
  welcomeSettings: WelcomeSettings;
  setWelcomeSettings: (settings: Partial<WelcomeSettings>) => void;
  setWelcomeEnabled: (enabled: boolean) => void;
  setWelcomeCustomGreeting: (greeting: string) => void;
  setWelcomeCustomDescription: (description: string) => void;
  setWelcomeShowAvatar: (show: boolean) => void;
  setWelcomeAvatarUrl: (url: string) => void;
  setWelcomeSectionVisibility: (visibility: Partial<WelcomeSectionVisibility>) => void;
  addWelcomeCustomSuggestion: (mode: ChatMode, suggestion: Omit<CustomSuggestion, 'id'>) => string;
  updateWelcomeCustomSuggestion: (
    mode: ChatMode,
    id: string,
    updates: Partial<CustomSuggestion>
  ) => void;
  removeWelcomeCustomSuggestion: (mode: ChatMode, id: string) => void;
  setWelcomeHideDefaultSuggestions: (hide: boolean) => void;
  setWelcomeQuickAccessLinks: (links: QuickAccessLink[]) => void;
  addWelcomeQuickAccessLink: (link: Omit<QuickAccessLink, 'id'>) => string;
  updateWelcomeQuickAccessLink: (id: string, updates: Partial<QuickAccessLink>) => void;
  removeWelcomeQuickAccessLink: (id: string) => void;
  setWelcomeUseCustomQuickAccess: (use: boolean) => void;
  setWelcomeDefaultMode: (mode: ChatMode) => void;
  setWelcomeMaxSuggestions: (max: number) => void;
  resetWelcomeSettings: () => void;

  // Simplified Mode settings
  simplifiedModeSettings: SimplifiedModeSettings;
  setSimplifiedModeSettings: (settings: Partial<SimplifiedModeSettings>) => void;
  setSimplifiedModeEnabled: (enabled: boolean) => void;
  setSimplifiedModePreset: (preset: SimplifiedModePreset) => void;
  toggleSimplifiedMode: () => void;
  resetSimplifiedModeSettings: () => void;

  // Reset
  resetSettings: () => void;
}

const defaultProviderSettings: Record<string, UserProviderSettings> = {
  openai: {
    providerId: 'openai',
    apiKey: '',
    defaultModel: 'gpt-4o',
    enabled: true,
  },
  anthropic: {
    providerId: 'anthropic',
    apiKey: '',
    defaultModel: 'claude-sonnet-4-20250514',
    enabled: true,
  },
  google: {
    providerId: 'google',
    apiKey: '',
    defaultModel: 'gemini-2.0-flash-exp',
    enabled: true,
  },
  deepseek: {
    providerId: 'deepseek',
    apiKey: '',
    defaultModel: 'deepseek-chat',
    enabled: false,
  },
  groq: {
    providerId: 'groq',
    apiKey: '',
    defaultModel: 'llama-3.3-70b-versatile',
    enabled: false,
  },
  mistral: {
    providerId: 'mistral',
    apiKey: '',
    defaultModel: 'mistral-large-latest',
    enabled: false,
  },
  xai: {
    providerId: 'xai',
    apiKey: '',
    defaultModel: 'grok-3',
    enabled: false,
  },
  togetherai: {
    providerId: 'togetherai',
    apiKey: '',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    enabled: false,
  },
  openrouter: {
    providerId: 'openrouter',
    apiKey: '',
    defaultModel: 'anthropic/claude-sonnet-4',
    enabled: false,
  },
  cohere: {
    providerId: 'cohere',
    apiKey: '',
    defaultModel: 'command-r-plus',
    enabled: false,
  },
  fireworks: {
    providerId: 'fireworks',
    apiKey: '',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    enabled: false,
  },
  cerebras: {
    providerId: 'cerebras',
    apiKey: '',
    defaultModel: 'llama-3.3-70b',
    enabled: false,
  },
  sambanova: {
    providerId: 'sambanova',
    apiKey: '',
    defaultModel: 'Meta-Llama-3.3-70B-Instruct',
    enabled: false,
  },
  ollama: {
    providerId: 'ollama',
    baseURL: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    enabled: false,
  },
  // Local inference providers
  lmstudio: {
    providerId: 'lmstudio',
    baseURL: 'http://localhost:1234',
    defaultModel: 'local-model',
    enabled: false,
  },
  llamacpp: {
    providerId: 'llamacpp',
    baseURL: 'http://localhost:8080',
    defaultModel: 'local-model',
    enabled: false,
  },
  llamafile: {
    providerId: 'llamafile',
    baseURL: 'http://localhost:8080',
    defaultModel: 'local-model',
    enabled: false,
  },
  vllm: {
    providerId: 'vllm',
    baseURL: 'http://localhost:8000',
    defaultModel: 'local-model',
    enabled: false,
  },
  localai: {
    providerId: 'localai',
    baseURL: 'http://localhost:8080',
    defaultModel: 'local-model',
    enabled: false,
  },
  jan: {
    providerId: 'jan',
    baseURL: 'http://localhost:1337',
    defaultModel: 'local-model',
    enabled: false,
  },
  textgenwebui: {
    providerId: 'textgenwebui',
    baseURL: 'http://localhost:5000',
    defaultModel: 'local-model',
    enabled: false,
  },
  koboldcpp: {
    providerId: 'koboldcpp',
    baseURL: 'http://localhost:5001',
    defaultModel: 'local-model',
    enabled: false,
  },
  tabbyapi: {
    providerId: 'tabbyapi',
    baseURL: 'http://localhost:5000',
    defaultModel: 'local-model',
    enabled: false,
  },
};

const initialState = {
  // Theme
  theme: 'system' as Theme,
  colorTheme: 'default' as ColorThemePreset,
  customThemes: [] as CustomTheme[],
  activeCustomThemeId: null as string | null,
  uiCustomization: DEFAULT_UI_CUSTOMIZATION,

  // Language
  language: 'en' as Language,
  autoDetectLocale: true,
  localeDetectionResult: null as AutoDetectResult | null,
  detectedTimezone: null as string | null,

  // Custom Instructions
  customInstructions: '',
  customInstructionsEnabled: true,
  aboutUser: '',
  responsePreferences: '',

  // Providers
  providerSettings: defaultProviderSettings,
  customProviders: {} as Record<string, CustomProviderSettings>,
  defaultProvider: 'openai',

  // UI
  sidebarCollapsed: false,

  // Chat
  streamingEnabled: true,
  streamResponses: true,
  sendOnEnter: true,

  // Chat behavior
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  contextLength: 10,
  autoTitleGeneration: true,
  showModelInChat: true,
  enableMarkdownRendering: true,

  // Search (Legacy)
  tavilyApiKey: '',
  searchEnabled: false,
  searchMaxResults: 5,

  // Search (Multi-provider)
  searchProviders: { ...DEFAULT_SEARCH_PROVIDER_SETTINGS },
  defaultSearchProvider: 'tavily' as SearchProviderType,
  searchFallbackEnabled: true,

  // Research
  defaultSearchSources: ['google', 'brave'],

  // Source verification
  sourceVerificationSettings: { ...DEFAULT_SOURCE_VERIFICATION_SETTINGS },

  // Tool settings
  enableFileTools: false,
  enableDocumentTools: true,
  enableCodeExecution: false,
  enableWebSearch: true,
  enableRAGSearch: true,
  enableCalculator: true,
  enableProcessTools: false, // Disabled by default for security
  alwaysAllowedTools: [] as string[],

  // Response display
  codeTheme: 'github-dark' as CodeTheme,
  codeFontFamily: 'system' as FontFamily,
  codeFontSize: 14,
  showLineNumbers: true,
  codeWordWrap: false,
  enableSyntaxHighlight: true,
  lineHeight: 1.6,
  enableMathRendering: true,
  mathFontScale: 1.0,
  mathDisplayAlignment: 'center' as 'center' | 'left',
  mathShowCopyButton: true,
  enableMermaidDiagrams: true,
  mermaidTheme: 'default' as 'default' | 'dark' | 'forest' | 'neutral',
  enableVegaLiteCharts: true,
  vegaLiteTheme: 'default' as 'default' | 'dark' | 'excel' | 'fivethirtyeight',
  compactMode: false,
  showTimestamps: false,
  showTokenCount: true,

  // Appearance enhancements
  uiFontSize: 14,
  messageBubbleStyle: 'default' as MessageBubbleStyle,

  // Background settings
  backgroundSettings: { ...DEFAULT_BACKGROUND_SETTINGS },

  // Theme schedule
  themeSchedule: { ...DEFAULT_THEME_SCHEDULE },

  // Advanced chat parameters
  defaultTopP: 1.0,
  defaultFrequencyPenalty: 0,
  defaultPresencePenalty: 0,

  // Keyboard shortcut customization
  customShortcuts: {} as Record<string, string>,

  // Speech settings
  speechSettings: { ...DEFAULT_SPEECH_SETTINGS },

  // Compression settings
  compressionSettings: { ...DEFAULT_COMPRESSION_SETTINGS },

  // Auto Router settings
  autoRouterSettings: { ...DEFAULT_AUTO_ROUTER_SETTINGS },

  // Load Balancer settings
  loadBalancerSettings: { ...DEFAULT_LOAD_BALANCER_SETTINGS },

  // Chat History Context settings
  chatHistoryContextSettings: { ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS },

  // Tokenizer settings
  tokenizerSettings: { ...DEFAULT_TOKENIZER_SETTINGS },

  // Safety Mode settings
  safetyModeSettings: { ...DEFAULT_SAFETY_MODE_SETTINGS },

  // Observability settings
  observabilitySettings: { ...DEFAULT_OBSERVABILITY_SETTINGS },

  // Feature Routing settings
  featureRoutingSettings: { ...DEFAULT_FEATURE_ROUTING_SETTINGS },

  // Welcome Settings
  welcomeSettings: { ...DEFAULT_WELCOME_SETTINGS },

  // Simplified Mode settings
  simplifiedModeSettings: { ...DEFAULT_SIMPLIFIED_MODE_SETTINGS },

  // Onboarding
  hasCompletedOnboarding: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Theme actions
      setTheme: (theme) =>
        set(() => {
          // Resolve theme to 'light' or 'dark' for the plugin hook's second parameter
          const resolvedTheme = theme === 'system' ? 'light' : theme;
          getPluginEventHooks().dispatchThemeModeChange(theme, resolvedTheme);
          return { theme };
        }),
      setColorTheme: (colorTheme) =>
        set(() => {
          getPluginEventHooks().dispatchColorPresetChange(colorTheme);
          return { colorTheme, activeCustomThemeId: null };
        }),

      // Theme schedule actions
      setThemeSchedule: (updates) =>
        set((state) => ({
          themeSchedule: { ...state.themeSchedule, ...updates },
        })),
      setThemeScheduleEnabled: (enabled) =>
        set((state) => ({
          themeSchedule: { ...state.themeSchedule, enabled },
        })),

      // Custom theme actions
      createCustomTheme: (theme) => {
        const id = nanoid();
        const newTheme: CustomTheme = { ...theme, id };
        set((state) => ({
          customThemes: [...state.customThemes, newTheme],
        }));
        return id;
      },
      updateCustomTheme: (id, updates) =>
        set((state) => ({
          customThemes: state.customThemes.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteCustomTheme: (id) =>
        set((state) => ({
          customThemes: state.customThemes.filter((t) => t.id !== id),
          activeCustomThemeId: state.activeCustomThemeId === id ? null : state.activeCustomThemeId,
        })),
      setActiveCustomTheme: (activeCustomThemeId) =>
        set((_state) => {
          if (activeCustomThemeId) {
            getPluginEventHooks().dispatchCustomThemeActivate(activeCustomThemeId);
          }
          return { activeCustomThemeId };
        }),

      // UI Customization actions
      setUICustomization: (customization) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, ...customization },
        })),
      setBorderRadius: (borderRadius) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, borderRadius },
        })),
      setSpacing: (spacing) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, spacing },
        })),
      setShadowIntensity: (shadowIntensity) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, shadowIntensity },
        })),
      setEnableAnimations: (enableAnimations) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, enableAnimations },
        })),
      setEnableBlur: (enableBlur) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, enableBlur },
        })),
      setSidebarWidth: (sidebarWidth) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, sidebarWidth },
        })),
      setChatMaxWidth: (chatMaxWidth) =>
        set((state) => ({
          uiCustomization: { ...state.uiCustomization, chatMaxWidth },
        })),
      resetUICustomization: () => set({ uiCustomization: DEFAULT_UI_CUSTOMIZATION }),

      // Language actions
      setLanguage: (language) => set({ language }),
      setAutoDetectLocale: (autoDetectLocale) => set({ autoDetectLocale }),
      setLocaleDetectionResult: (localeDetectionResult) => set({ localeDetectionResult }),
      setDetectedTimezone: (detectedTimezone) => set({ detectedTimezone }),

      // Custom Instructions actions
      setCustomInstructions: (customInstructions) => set({ customInstructions }),
      setCustomInstructionsEnabled: (customInstructionsEnabled) =>
        set({ customInstructionsEnabled }),
      setAboutUser: (aboutUser) => set({ aboutUser }),
      setResponsePreferences: (responsePreferences) => set({ responsePreferences }),

      // Provider actions
      setProviderSettings: (providerId, settings) => {
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            [providerId]: {
              ...state.providerSettings[providerId],
              ...settings,
            },
          },
        }));
        syncProviderKeysToStronghold(providerId, get);
      },
      updateProviderSettings: (providerId, settings) => {
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            [providerId]: {
              ...state.providerSettings[providerId],
              ...settings,
            },
          },
        }));
        syncProviderKeysToStronghold(providerId, get);
      },
      getProviderSettings: (providerId) => {
        const { providerSettings, customProviders } = get();
        return providerSettings[providerId] || customProviders[providerId];
      },

      // Multi-API Key management actions
      addApiKey: (providerId, apiKey) => {
        set((state) => {
          const settings = state.providerSettings[providerId];
          if (!settings) return state;

          const currentKeys = settings.apiKeys || [];
          // Don't add duplicates
          if (currentKeys.includes(apiKey)) return state;

          const newKeys = [...currentKeys, apiKey];
          const newStats = {
            ...(settings.apiKeyUsageStats || {}),
            [apiKey]: getDefaultUsageStats(),
          };

          return {
            providerSettings: {
              ...state.providerSettings,
              [providerId]: {
                ...settings,
                apiKeys: newKeys,
                apiKeyUsageStats: newStats,
                // If this is the first key, also set it as the primary apiKey
                apiKey: settings.apiKey || apiKey,
              },
            },
          };
        });
        syncProviderKeysToStronghold(providerId, get);
      },

      removeApiKey: (providerId, apiKeyIndex) => {
        set((state) => {
          const settings = state.providerSettings[providerId];
          if (!settings || !settings.apiKeys) return state;

          const keyToRemove = settings.apiKeys[apiKeyIndex];
          const newKeys = settings.apiKeys.filter((_, i) => i !== apiKeyIndex);
          const { [keyToRemove]: _removed, ...remainingStats } = settings.apiKeyUsageStats || {};

          // Adjust currentKeyIndex if needed
          let newIndex = settings.currentKeyIndex || 0;
          if (newIndex >= newKeys.length) {
            newIndex = Math.max(0, newKeys.length - 1);
          }

          return {
            providerSettings: {
              ...state.providerSettings,
              [providerId]: {
                ...settings,
                apiKeys: newKeys,
                apiKeyUsageStats: remainingStats,
                currentKeyIndex: newIndex,
                // Update primary apiKey if the removed key was the primary
                apiKey: settings.apiKey === keyToRemove ? newKeys[0] || '' : settings.apiKey,
              },
            },
          };
        });
        if (isStrongholdAvailable()) {
          const updated = get().providerSettings[providerId];
          if (updated?.apiKey) {
            void secureStoreProviderApiKey(providerId, updated.apiKey);
          } else {
            void secureRemoveProviderApiKey(providerId);
          }
          if (updated?.apiKeys && updated.apiKeys.length > 0) {
            void secureStoreProviderApiKeys(providerId, updated.apiKeys);
          } else {
            void secureStoreProviderApiKeys(providerId, []);
          }
        }
      },

      setApiKeyRotation: (providerId, enabled, strategy = 'round-robin') =>
        set((state) => {
          const settings = state.providerSettings[providerId];
          if (!settings) return state;

          return {
            providerSettings: {
              ...state.providerSettings,
              [providerId]: {
                ...settings,
                apiKeyRotationEnabled: enabled,
                apiKeyRotationStrategy: strategy,
                currentKeyIndex: 0,
              },
            },
          };
        }),

      getActiveApiKey: (providerId) => {
        const { providerSettings } = get();
        const settings = providerSettings[providerId];
        if (!settings) return undefined;

        // If rotation is not enabled or no multiple keys, use primary key
        if (!settings.apiKeyRotationEnabled || !settings.apiKeys || settings.apiKeys.length <= 1) {
          return settings.apiKey;
        }

        // Return current key from rotation
        const index = settings.currentKeyIndex || 0;
        return settings.apiKeys[index] || settings.apiKey;
      },

      rotateToNextApiKey: (providerId) => {
        const state = get();
        const settings = state.providerSettings[providerId];
        if (
          !settings ||
          !settings.apiKeyRotationEnabled ||
          !settings.apiKeys ||
          settings.apiKeys.length <= 1
        ) {
          return settings?.apiKey;
        }

        const result = getNextApiKey(
          settings.apiKeys,
          settings.apiKeyRotationStrategy || 'round-robin',
          settings.currentKeyIndex || 0,
          settings.apiKeyUsageStats || {}
        );

        set((s) => ({
          providerSettings: {
            ...s.providerSettings,
            [providerId]: {
              ...s.providerSettings[providerId],
              currentKeyIndex: result.index,
            },
          },
        }));

        return result.apiKey;
      },

      recordApiKeyUsage: (providerId, apiKey, success, errorMessage) =>
        set((state) => {
          const settings = state.providerSettings[providerId];
          if (!settings) return state;

          const currentStats = settings.apiKeyUsageStats?.[apiKey];
          const newStats = success
            ? recordApiKeySuccess(currentStats)
            : recordApiKeyError(currentStats, errorMessage);

          return {
            providerSettings: {
              ...state.providerSettings,
              [providerId]: {
                ...settings,
                apiKeyUsageStats: {
                  ...(settings.apiKeyUsageStats || {}),
                  [apiKey]: newStats,
                },
              },
            },
          };
        }),

      resetApiKeyStats: (providerId, apiKey) =>
        set((state) => {
          const settings = state.providerSettings[providerId];
          if (!settings) return state;

          return {
            providerSettings: {
              ...state.providerSettings,
              [providerId]: {
                ...settings,
                apiKeyUsageStats: {
                  ...(settings.apiKeyUsageStats || {}),
                  [apiKey]: getDefaultUsageStats(),
                },
              },
            },
          };
        }),

      // Custom provider actions
      addCustomProvider: (provider) => {
        const id = `custom-${nanoid()}`;
        const newProvider: CustomProviderSettings = {
          ...provider,
          providerId: id,
          isCustom: true,
        };
        set((state) => ({
          customProviders: {
            ...state.customProviders,
            [id]: newProvider,
          },
        }));
        syncCustomKeyToStronghold(id, newProvider.apiKey);
        return id;
      },
      updateCustomProvider: (id, updates) => {
        set((state) => ({
          customProviders: {
            ...state.customProviders,
            [id]: {
              ...state.customProviders[id],
              ...updates,
            },
          },
        }));
        const apiKey = get().customProviders[id]?.apiKey;
        syncCustomKeyToStronghold(id, apiKey);
      },
      removeCustomProvider: (id) =>
        set((state) => {
          const { [id]: _removed, ...rest } = state.customProviders;
          return {
            customProviders: rest,
            defaultProvider: state.defaultProvider === id ? 'openai' : state.defaultProvider,
          };
        }),
      getCustomProvider: (id) => {
        const { customProviders } = get();
        return customProviders[id];
      },

      setDefaultProvider: (defaultProvider) => set({ defaultProvider }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setStreamingEnabled: (streamingEnabled) => set({ streamingEnabled }),
      setStreamResponses: (streamResponses) => set({ streamResponses }),
      setSendOnEnter: (sendOnEnter) => set({ sendOnEnter }),

      // Chat behavior actions
      setDefaultTemperature: (defaultTemperature) => set({ defaultTemperature }),
      setDefaultMaxTokens: (defaultMaxTokens) => set({ defaultMaxTokens }),
      setContextLength: (contextLength) => set({ contextLength }),
      setAutoTitleGeneration: (autoTitleGeneration) => set({ autoTitleGeneration }),
      setShowModelInChat: (showModelInChat) => set({ showModelInChat }),
      setEnableMarkdownRendering: (enableMarkdownRendering) => set({ enableMarkdownRendering }),

      // Search actions (Legacy)
      setTavilyApiKey: (tavilyApiKey) => {
        set({ tavilyApiKey });
        syncSearchKeyToStronghold('tavily', tavilyApiKey);
      },
      setSearchEnabled: (searchEnabled) => set({ searchEnabled }),
      setSearchMaxResults: (searchMaxResults) => set({ searchMaxResults }),

      // Search actions (Multi-provider)
      setSearchProviderSettings: (providerId, settings) => {
        set((state) => ({
          searchProviders: {
            ...state.searchProviders,
            [providerId]: {
              ...state.searchProviders[providerId],
              ...settings,
            },
          },
        }));
        syncSearchKeyToStronghold(providerId, get().searchProviders[providerId]?.apiKey);
      },
      setSearchProviderApiKey: (providerId, apiKey) => {
        set((state) => ({
          searchProviders: {
            ...state.searchProviders,
            [providerId]: {
              ...state.searchProviders[providerId],
              apiKey,
            },
          },
        }));
        syncSearchKeyToStronghold(providerId, apiKey);
      },
      setSearchProviderEnabled: (providerId, enabled) =>
        set((state) => ({
          searchProviders: {
            ...state.searchProviders,
            [providerId]: {
              ...state.searchProviders[providerId],
              enabled,
            },
          },
        })),
      setSearchProviderPriority: (providerId, priority) =>
        set((state) => ({
          searchProviders: {
            ...state.searchProviders,
            [providerId]: {
              ...state.searchProviders[providerId],
              priority,
            },
          },
        })),
      setDefaultSearchProvider: (defaultSearchProvider) => set({ defaultSearchProvider }),
      setSearchFallbackEnabled: (searchFallbackEnabled) => set({ searchFallbackEnabled }),

      setDefaultSearchSources: (defaultSearchSources) => set({ defaultSearchSources }),

      // Source verification settings actions
      setSourceVerificationSettings: (settings) =>
        set((state) => ({
          sourceVerificationSettings: { ...state.sourceVerificationSettings, ...settings },
        })),
      setSourceVerificationEnabled: (enabled) =>
        set((state) => ({
          sourceVerificationSettings: { ...state.sourceVerificationSettings, enabled },
        })),
      setSourceVerificationMode: (mode) =>
        set((state) => ({
          sourceVerificationSettings: { ...state.sourceVerificationSettings, mode },
        })),
      setMinimumCredibilityScore: (minimumCredibilityScore) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            minimumCredibilityScore: Math.min(1, Math.max(0, minimumCredibilityScore)),
          },
        })),
      addTrustedDomain: (domain) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            trustedDomains: state.sourceVerificationSettings.trustedDomains.includes(domain)
              ? state.sourceVerificationSettings.trustedDomains
              : [...state.sourceVerificationSettings.trustedDomains, domain],
          },
        })),
      removeTrustedDomain: (domain) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            trustedDomains: state.sourceVerificationSettings.trustedDomains.filter(
              (d) => d !== domain
            ),
          },
        })),
      addBlockedDomain: (domain) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            blockedDomains: state.sourceVerificationSettings.blockedDomains.includes(domain)
              ? state.sourceVerificationSettings.blockedDomains
              : [...state.sourceVerificationSettings.blockedDomains, domain],
          },
        })),
      removeBlockedDomain: (domain) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            blockedDomains: state.sourceVerificationSettings.blockedDomains.filter(
              (d) => d !== domain
            ),
          },
        })),
      setAutoFilterLowCredibility: (autoFilterLowCredibility) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            autoFilterLowCredibility,
          },
        })),
      setEnableCrossValidation: (enableCrossValidation) =>
        set((state) => ({
          sourceVerificationSettings: {
            ...state.sourceVerificationSettings,
            enableCrossValidation,
          },
        })),

      // Tool settings actions
      setEnableFileTools: (enableFileTools) => set({ enableFileTools }),
      setEnableDocumentTools: (enableDocumentTools) => set({ enableDocumentTools }),
      setEnableCodeExecution: (enableCodeExecution) => set({ enableCodeExecution }),
      setEnableWebSearch: (enableWebSearch) => set({ enableWebSearch }),
      setEnableRAGSearch: (enableRAGSearch) => set({ enableRAGSearch }),
      setEnableCalculator: (enableCalculator) => set({ enableCalculator }),
      setEnableProcessTools: (enableProcessTools) => set({ enableProcessTools }),

      addAlwaysAllowedTool: (toolName) =>
        set((state) => ({
          alwaysAllowedTools: state.alwaysAllowedTools.includes(toolName)
            ? state.alwaysAllowedTools
            : [...state.alwaysAllowedTools, toolName],
        })),

      removeAlwaysAllowedTool: (toolName) =>
        set((state) => ({
          alwaysAllowedTools: state.alwaysAllowedTools.filter((t) => t !== toolName),
        })),

      isToolAlwaysAllowed: (toolName) => get().alwaysAllowedTools.includes(toolName),

      clearAlwaysAllowedTools: () => set({ alwaysAllowedTools: [] }),

      // Response display actions
      setCodeTheme: (codeTheme) => set({ codeTheme }),
      setCodeFontFamily: (codeFontFamily) => set({ codeFontFamily }),
      setCodeFontSize: (codeFontSize) => set({ codeFontSize }),
      setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
      setCodeWordWrap: (codeWordWrap) => set({ codeWordWrap }),
      setEnableSyntaxHighlight: (enableSyntaxHighlight) => set({ enableSyntaxHighlight }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setEnableMathRendering: (enableMathRendering) => set({ enableMathRendering }),
      setMathFontScale: (mathFontScale) => set({ mathFontScale }),
      setMathDisplayAlignment: (mathDisplayAlignment) => set({ mathDisplayAlignment }),
      setMathShowCopyButton: (mathShowCopyButton) => set({ mathShowCopyButton }),
      setEnableMermaidDiagrams: (enableMermaidDiagrams) => set({ enableMermaidDiagrams }),
      setMermaidTheme: (mermaidTheme) => set({ mermaidTheme }),
      setEnableVegaLiteCharts: (enableVegaLiteCharts) => set({ enableVegaLiteCharts }),
      setVegaLiteTheme: (vegaLiteTheme) => set({ vegaLiteTheme }),
      setCompactMode: (compactMode) => set({ compactMode }),
      setShowTimestamps: (showTimestamps) => set({ showTimestamps }),
      setShowTokenCount: (showTokenCount) => set({ showTokenCount }),

      // Appearance enhancement actions
      setUIFontSize: (uiFontSize) => set({ uiFontSize: Math.min(20, Math.max(12, uiFontSize)) }),
      setMessageBubbleStyle: (messageBubbleStyle) => set({ messageBubbleStyle }),

      // Background settings actions
      setBackgroundSettings: (settings) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, ...settings },
        })),
      setBackgroundEnabled: (enabled) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, enabled },
        })),
      setBackgroundSource: (source) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, source },
        })),
      setBackgroundImageUrl: (imageUrl) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, imageUrl },
        })),
      setBackgroundLocalFile: async (file) => {
        const previousAssetId = get().backgroundSettings.localAssetId;
        const { assetId } = await saveBackgroundImageAsset(file);
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            enabled: true,
            source: 'local',
            presetId: null,
            imageUrl: '',
            localAssetId: assetId,
          },
        }));

        if (previousAssetId && previousAssetId !== assetId) {
          await deleteBackgroundImageAsset(previousAssetId);
        }
      },
      setBackgroundPreset: (presetId) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            presetId,
            source: presetId ? 'preset' : 'none',
          },
        })),
      setBackgroundFit: (fit) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, fit },
        })),
      setBackgroundPosition: (position) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, position },
        })),
      setBackgroundOpacity: (opacity) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            opacity: Math.min(100, Math.max(0, opacity)),
          },
        })),
      setBackgroundBlur: (blur) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            blur: Math.min(20, Math.max(0, blur)),
          },
        })),
      setBackgroundOverlay: (overlayColor, overlayOpacity) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            overlayColor,
            overlayOpacity: Math.min(100, Math.max(0, overlayOpacity)),
          },
        })),
      setBackgroundBrightness: (brightness) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            brightness: Math.min(150, Math.max(50, brightness)),
          },
        })),
      setBackgroundSaturation: (saturation) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            saturation: Math.min(200, Math.max(0, saturation)),
          },
        })),
      setBackgroundAttachment: (attachment) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, attachment },
        })),
      setBackgroundAnimation: (animation) =>
        set((state) => ({
          backgroundSettings: { ...state.backgroundSettings, animation },
        })),
      setBackgroundAnimationSpeed: (animationSpeed) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            animationSpeed: Math.min(10, Math.max(1, animationSpeed)),
          },
        })),
      setBackgroundContrast: (contrast) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            contrast: Math.min(150, Math.max(50, contrast)),
          },
        })),
      setBackgroundGrayscale: (grayscale) =>
        set((state) => ({
          backgroundSettings: {
            ...state.backgroundSettings,
            grayscale: Math.min(100, Math.max(0, grayscale)),
          },
        })),
      resetBackgroundSettings: () =>
        set({ backgroundSettings: { ...DEFAULT_BACKGROUND_SETTINGS } }),
      clearBackground: async () => {
        const previousAssetId = get().backgroundSettings.localAssetId;
        if (previousAssetId) {
          await deleteBackgroundImageAsset(previousAssetId);
        }
        set({ backgroundSettings: { ...DEFAULT_BACKGROUND_SETTINGS } });
      },

      // Advanced chat parameter actions
      setDefaultTopP: (defaultTopP) => set({ defaultTopP: Math.min(1, Math.max(0, defaultTopP)) }),
      setDefaultFrequencyPenalty: (defaultFrequencyPenalty) =>
        set({ defaultFrequencyPenalty: Math.min(2, Math.max(-2, defaultFrequencyPenalty)) }),
      setDefaultPresencePenalty: (defaultPresencePenalty) =>
        set({ defaultPresencePenalty: Math.min(2, Math.max(-2, defaultPresencePenalty)) }),

      // Keyboard shortcut actions
      setCustomShortcut: (id, keys) =>
        set((state) => ({
          customShortcuts: { ...state.customShortcuts, [id]: keys },
        })),
      resetShortcuts: () => set({ customShortcuts: {} }),

      // Speech settings actions
      setSpeechSettings: (settings) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, ...settings },
        })),
      setSttEnabled: (sttEnabled) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, sttEnabled },
        })),
      setSttLanguage: (sttLanguage) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, sttLanguage },
        })),
      setSttProvider: (sttProvider) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, sttProvider },
        })),
      setSttContinuous: (sttContinuous) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, sttContinuous },
        })),
      setSttAutoSend: (sttAutoSend) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, sttAutoSend },
        })),
      setTtsEnabled: (ttsEnabled) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, ttsEnabled },
        })),
      setTtsVoice: (ttsVoice) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, ttsVoice },
        })),
      setTtsRate: (ttsRate) =>
        set((state) => ({
          speechSettings: {
            ...state.speechSettings,
            ttsRate: Math.min(10, Math.max(0.1, ttsRate)),
          },
        })),
      setTtsAutoPlay: (ttsAutoPlay) =>
        set((state) => ({
          speechSettings: { ...state.speechSettings, ttsAutoPlay },
        })),

      // Compression settings actions
      setCompressionSettings: (settings) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, ...settings },
        })),
      setCompressionEnabled: (enabled) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, enabled },
        })),
      setCompressionStrategy: (strategy) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, strategy },
        })),
      setCompressionTrigger: (trigger) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, trigger },
        })),
      setCompressionTokenThreshold: (tokenThreshold) =>
        set((state) => ({
          compressionSettings: {
            ...state.compressionSettings,
            tokenThreshold: Math.min(100, Math.max(10, tokenThreshold)),
          },
        })),
      setCompressionMessageThreshold: (messageCountThreshold) =>
        set((state) => ({
          compressionSettings: {
            ...state.compressionSettings,
            messageCountThreshold: Math.min(200, Math.max(5, messageCountThreshold)),
          },
        })),
      setCompressionPreserveRecent: (preserveRecentMessages) =>
        set((state) => ({
          compressionSettings: {
            ...state.compressionSettings,
            preserveRecentMessages: Math.min(50, Math.max(1, preserveRecentMessages)),
          },
        })),
      setCompressionPreserveSystem: (preserveSystemMessages) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, preserveSystemMessages },
        })),
      setCompressionRatio: (compressionRatio) =>
        set((state) => ({
          compressionSettings: {
            ...state.compressionSettings,
            compressionRatio: Math.min(0.9, Math.max(0.1, compressionRatio)),
          },
        })),
      setCompressionModel: (modelConfig) =>
        set((state) => ({
          compressionSettings: {
            ...state.compressionSettings,
            compressionModel: { ...state.compressionSettings.compressionModel, ...modelConfig },
          },
        })),
      setCompressionNotification: (showCompressionNotification) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, showCompressionNotification },
        })),
      setCompressionUndo: (enableUndo) =>
        set((state) => ({
          compressionSettings: { ...state.compressionSettings, enableUndo },
        })),

      // Auto Router settings actions
      setAutoRouterSettings: (settings) =>
        set((state) => ({
          autoRouterSettings: { ...state.autoRouterSettings, ...settings },
        })),
      setAutoRouterEnabled: (enabled) =>
        set((state) => ({
          autoRouterSettings: { ...state.autoRouterSettings, enabled },
        })),
      setAutoRouterMode: (routingMode) =>
        set((state) => ({
          autoRouterSettings: { ...state.autoRouterSettings, routingMode },
        })),
      setAutoRouterStrategy: (strategy) =>
        set((state) => ({
          autoRouterSettings: { ...state.autoRouterSettings, strategy },
        })),
      setAutoRouterShowIndicator: (showRoutingIndicator) =>
        set((state) => ({
          autoRouterSettings: { ...state.autoRouterSettings, showRoutingIndicator },
        })),
      setAutoRouterPreferredProviders: (preferredProviders) =>
        set((state) => ({
          autoRouterSettings: {
            ...state.autoRouterSettings,
            preferredProviders: preferredProviders as ProviderName[],
          },
        })),
      setAutoRouterExcludedProviders: (excludedProviders) =>
        set((state) => ({
          autoRouterSettings: {
            ...state.autoRouterSettings,
            excludedProviders: excludedProviders as ProviderName[],
          },
        })),
      setAutoRouterFallbackTier: (fallbackTier) =>
        set((state) => ({
          autoRouterSettings: { ...state.autoRouterSettings, fallbackTier },
        })),
      resetAutoRouterSettings: () =>
        set({ autoRouterSettings: { ...DEFAULT_AUTO_ROUTER_SETTINGS } }),

      // Load Balancer settings actions
      setLoadBalancerSettings: (settings) =>
        set((state) => ({
          loadBalancerSettings: { ...state.loadBalancerSettings, ...settings },
        })),
      setLoadBalancerEnabled: (enabled) =>
        set((state) => ({
          loadBalancerSettings: { ...state.loadBalancerSettings, enabled },
        })),
      setLoadBalancingStrategy: (strategy) =>
        set((state) => ({
          loadBalancerSettings: { ...state.loadBalancerSettings, strategy },
        })),
      setLoadBalancerWeights: (weights) =>
        set((state) => ({
          loadBalancerSettings: { ...state.loadBalancerSettings, weights },
        })),
      setLoadBalancerStickySession: (stickySession) =>
        set((state) => ({
          loadBalancerSettings: { ...state.loadBalancerSettings, stickySession },
        })),
      setLoadBalancerFallbackOrder: (fallbackOrder) =>
        set((state) => ({
          loadBalancerSettings: {
            ...state.loadBalancerSettings,
            fallbackOrder: fallbackOrder as LoadBalancerSettings['fallbackOrder'],
          },
        })),
      setLoadBalancerAutoFailover: (autoFailover) =>
        set((state) => ({
          loadBalancerSettings: { ...state.loadBalancerSettings, autoFailover },
        })),
      setLoadBalancerMaxRetries: (maxRetries) =>
        set((state) => ({
          loadBalancerSettings: {
            ...state.loadBalancerSettings,
            maxRetries: Math.min(10, Math.max(1, maxRetries)),
          },
        })),
      setCircuitBreakerSettings: (settings) =>
        set((state) => ({
          loadBalancerSettings: {
            ...state.loadBalancerSettings,
            circuitBreaker: { ...state.loadBalancerSettings.circuitBreaker, ...settings },
          },
        })),
      setCircuitBreakerEnabled: (enabled) =>
        set((state) => ({
          loadBalancerSettings: {
            ...state.loadBalancerSettings,
            circuitBreaker: { ...state.loadBalancerSettings.circuitBreaker, enabled },
          },
        })),
      resetLoadBalancerSettings: () =>
        set({ loadBalancerSettings: { ...DEFAULT_LOAD_BALANCER_SETTINGS } }),

      // Chat History Context settings actions
      setChatHistoryContextSettings: (settings) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, ...settings },
        })),
      setChatHistoryContextEnabled: (enabled) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, enabled },
        })),
      setChatHistoryContextSessionCount: (recentSessionCount) =>
        set((state) => ({
          chatHistoryContextSettings: {
            ...state.chatHistoryContextSettings,
            recentSessionCount: Math.min(10, Math.max(1, recentSessionCount)),
          },
        })),
      setChatHistoryContextTokenBudget: (maxTokenBudget) =>
        set((state) => ({
          chatHistoryContextSettings: {
            ...state.chatHistoryContextSettings,
            maxTokenBudget: Math.min(2000, Math.max(100, maxTokenBudget)),
          },
        })),
      setChatHistoryContextCompressionLevel: (compressionLevel) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, compressionLevel },
        })),
      setChatHistoryContextIncludeTitles: (includeSessionTitles) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, includeSessionTitles },
        })),
      setChatHistoryContextExcludeEmpty: (excludeEmptySessions) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, excludeEmptySessions },
        })),
      setChatHistoryContextMinMessages: (minMessagesThreshold) =>
        set((state) => ({
          chatHistoryContextSettings: {
            ...state.chatHistoryContextSettings,
            minMessagesThreshold: Math.min(20, Math.max(1, minMessagesThreshold)),
          },
        })),
      setChatHistoryContextIncludeTimestamps: (includeTimestamps) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, includeTimestamps },
        })),
      setChatHistoryContextSameProjectOnly: (sameProjectOnly) =>
        set((state) => ({
          chatHistoryContextSettings: { ...state.chatHistoryContextSettings, sameProjectOnly },
        })),
      resetChatHistoryContextSettings: () =>
        set({ chatHistoryContextSettings: { ...DEFAULT_CHAT_HISTORY_CONTEXT_SETTINGS } }),

      // Tokenizer settings actions
      setTokenizerSettings: (settings) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, ...settings },
        })),
      setTokenizerEnabled: (enablePreciseCounting) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, enablePreciseCounting },
        })),
      setTokenizerProvider: (preferredProvider) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, preferredProvider },
        })),
      setTokenizerAutoDetect: (autoDetect) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, autoDetect },
        })),
      setTokenizerCache: (enableCache) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, enableCache },
        })),
      setTokenizerCacheTTL: (cacheTTL) =>
        set((state) => ({
          tokenizerSettings: {
            ...state.tokenizerSettings,
            cacheTTL: Math.min(3600, Math.max(60, cacheTTL)),
          },
        })),
      setTokenizerTimeout: (apiTimeout) =>
        set((state) => ({
          tokenizerSettings: {
            ...state.tokenizerSettings,
            apiTimeout: Math.min(30000, Math.max(1000, apiTimeout)),
          },
        })),
      setTokenizerFallback: (fallbackToEstimation) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, fallbackToEstimation },
        })),
      setTokenizerShowBreakdown: (showBreakdown) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, showBreakdown },
        })),
      setTokenizerContextWarning: (showContextWarning) =>
        set((state) => ({
          tokenizerSettings: { ...state.tokenizerSettings, showContextWarning },
        })),
      setTokenizerContextThreshold: (contextWarningThreshold) =>
        set((state) => ({
          tokenizerSettings: {
            ...state.tokenizerSettings,
            contextWarningThreshold: Math.min(100, Math.max(50, contextWarningThreshold)),
          },
        })),
      resetTokenizerSettings: () => set({ tokenizerSettings: { ...DEFAULT_TOKENIZER_SETTINGS } }),

      // Safety Mode settings actions
      setSafetyModeSettings: (settings) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, ...settings },
        })),
      setSafetyModeEnabled: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, enabled },
        })),
      setSafetyMode: (mode) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, mode },
        })),
      setCheckUserInput: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, checkUserInput: enabled },
        })),
      setCheckSystemPrompt: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, checkSystemPrompt: enabled },
        })),
      setCheckToolCalls: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, checkToolCalls: enabled },
        })),
      setBlockDangerousCommands: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, blockDangerousCommands: enabled },
        })),
      addSafetyRule: (rule) => {
        const id = nanoid();
        const newRule: SafetyRule = { ...rule, id };
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            rules: [...state.safetyModeSettings.rules, newRule],
          },
        }));
        return id;
      },
      updateSafetyRule: (id, updates) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            rules: state.safetyModeSettings.rules.map((r) =>
              r.id === id ? { ...r, ...updates } : r
            ),
          },
        })),
      removeSafetyRule: (id) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            rules: state.safetyModeSettings.rules.filter((r) => r.id !== id),
          },
        })),
      enableSafetyRule: (id) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            rules: state.safetyModeSettings.rules.map((r) =>
              r.id === id ? { ...r, enabled: true } : r
            ),
          },
        })),
      disableSafetyRule: (id) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            rules: state.safetyModeSettings.rules.map((r) =>
              r.id === id ? { ...r, enabled: false } : r
            ),
          },
        })),
      addCustomBlockedPattern: (pattern) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            customBlockedPatterns: state.safetyModeSettings.customBlockedPatterns.includes(pattern)
              ? state.safetyModeSettings.customBlockedPatterns
              : [...state.safetyModeSettings.customBlockedPatterns, pattern],
          },
        })),
      removeCustomBlockedPattern: (pattern) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            customBlockedPatterns: state.safetyModeSettings.customBlockedPatterns.filter(
              (p) => p !== pattern
            ),
          },
        })),
      addCustomAllowedPattern: (pattern) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            customAllowedPatterns: state.safetyModeSettings.customAllowedPatterns.includes(pattern)
              ? state.safetyModeSettings.customAllowedPatterns
              : [...state.safetyModeSettings.customAllowedPatterns, pattern],
          },
        })),
      removeCustomAllowedPattern: (pattern) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            customAllowedPatterns: state.safetyModeSettings.customAllowedPatterns.filter(
              (p) => p !== pattern
            ),
          },
        })),
      setExternalReviewConfig: (config) =>
        set((state) => ({
          safetyModeSettings: {
            ...state.safetyModeSettings,
            externalReview: { ...state.safetyModeSettings.externalReview, ...config },
          },
        })),
      setLogSafetyEvents: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, logSafetyEvents: enabled },
        })),
      setShowSafetyWarnings: (enabled) =>
        set((state) => ({
          safetyModeSettings: { ...state.safetyModeSettings, showSafetyWarnings: enabled },
        })),
      resetSafetyModeSettings: () =>
        set({ safetyModeSettings: { ...DEFAULT_SAFETY_MODE_SETTINGS } }),

      // Observability actions
      updateObservabilitySettings: (settings) =>
        set((state) => ({
          observabilitySettings: { ...state.observabilitySettings, ...settings },
        })),
      setObservabilityEnabled: (enabled) =>
        set((state) => ({
          observabilitySettings: { ...state.observabilitySettings, enabled },
        })),

      // Feature Routing actions
      setFeatureRoutingSettings: (settings) =>
        set((state) => ({
          featureRoutingSettings: { ...state.featureRoutingSettings, ...settings },
        })),
      setFeatureRoutingEnabled: (enabled) =>
        set((state) => ({
          featureRoutingSettings: { ...state.featureRoutingSettings, enabled },
        })),
      setFeatureRoutingMode: (routingMode) =>
        set((state) => ({
          featureRoutingSettings: { ...state.featureRoutingSettings, routingMode },
        })),
      setFeatureRoutingThreshold: (confidenceThreshold) =>
        set((state) => ({
          featureRoutingSettings: { ...state.featureRoutingSettings, confidenceThreshold },
        })),
      setFeatureRoutingAutoNavigate: (autoNavigateEnabled) =>
        set((state) => ({
          featureRoutingSettings: { ...state.featureRoutingSettings, autoNavigateEnabled },
        })),
      addDisabledRoute: (routeId) =>
        set((state) => ({
          featureRoutingSettings: {
            ...state.featureRoutingSettings,
            disabledRoutes: state.featureRoutingSettings.disabledRoutes.includes(routeId)
              ? state.featureRoutingSettings.disabledRoutes
              : [...state.featureRoutingSettings.disabledRoutes, routeId],
          },
        })),
      removeDisabledRoute: (routeId) =>
        set((state) => ({
          featureRoutingSettings: {
            ...state.featureRoutingSettings,
            disabledRoutes: state.featureRoutingSettings.disabledRoutes.filter(
              (id) => id !== routeId
            ),
          },
        })),
      updateRoutePreference: (routeId, delta) =>
        set((state) => ({
          featureRoutingSettings: {
            ...state.featureRoutingSettings,
            routePreferences: {
              ...state.featureRoutingSettings.routePreferences,
              [routeId]: (state.featureRoutingSettings.routePreferences[routeId] || 0) + delta,
            },
          },
        })),
      resetFeatureRoutingSettings: () =>
        set({ featureRoutingSettings: { ...DEFAULT_FEATURE_ROUTING_SETTINGS } }),

      // Welcome Settings actions
      setWelcomeSettings: (settings) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, ...settings },
        })),
      setWelcomeEnabled: (enabled) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, enabled },
        })),
      setWelcomeCustomGreeting: (customGreeting) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, customGreeting },
        })),
      setWelcomeCustomDescription: (customDescription) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, customDescription },
        })),
      setWelcomeShowAvatar: (showAvatar) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, showAvatar },
        })),
      setWelcomeAvatarUrl: (avatarUrl) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, avatarUrl },
        })),
      setWelcomeSectionVisibility: (visibility) =>
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            sectionsVisibility: { ...state.welcomeSettings.sectionsVisibility, ...visibility },
          },
        })),
      addWelcomeCustomSuggestion: (mode, suggestion) => {
        const id = nanoid();
        const newSuggestion = { ...suggestion, id };
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            customSuggestions: {
              ...state.welcomeSettings.customSuggestions,
              [mode]: [...state.welcomeSettings.customSuggestions[mode], newSuggestion],
            },
          },
        }));
        return id;
      },
      updateWelcomeCustomSuggestion: (mode, id, updates) =>
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            customSuggestions: {
              ...state.welcomeSettings.customSuggestions,
              [mode]: state.welcomeSettings.customSuggestions[mode].map((s) =>
                s.id === id ? { ...s, ...updates } : s
              ),
            },
          },
        })),
      removeWelcomeCustomSuggestion: (mode, id) =>
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            customSuggestions: {
              ...state.welcomeSettings.customSuggestions,
              [mode]: state.welcomeSettings.customSuggestions[mode].filter((s) => s.id !== id),
            },
          },
        })),
      setWelcomeHideDefaultSuggestions: (hideDefaultSuggestions) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, hideDefaultSuggestions },
        })),
      setWelcomeQuickAccessLinks: (quickAccessLinks) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, quickAccessLinks },
        })),
      addWelcomeQuickAccessLink: (link) => {
        const id = nanoid();
        const newLink = { ...link, id };
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            quickAccessLinks: [...state.welcomeSettings.quickAccessLinks, newLink],
          },
        }));
        return id;
      },
      updateWelcomeQuickAccessLink: (id, updates) =>
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            quickAccessLinks: state.welcomeSettings.quickAccessLinks.map((l) =>
              l.id === id ? { ...l, ...updates } : l
            ),
          },
        })),
      removeWelcomeQuickAccessLink: (id) =>
        set((state) => ({
          welcomeSettings: {
            ...state.welcomeSettings,
            quickAccessLinks: state.welcomeSettings.quickAccessLinks.filter((l) => l.id !== id),
          },
        })),
      setWelcomeUseCustomQuickAccess: (useCustomQuickAccess) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, useCustomQuickAccess },
        })),
      setWelcomeDefaultMode: (defaultMode) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, defaultMode },
        })),
      setWelcomeMaxSuggestions: (maxSuggestionsPerMode) =>
        set((state) => ({
          welcomeSettings: { ...state.welcomeSettings, maxSuggestionsPerMode },
        })),
      resetWelcomeSettings: () => set({ welcomeSettings: { ...DEFAULT_WELCOME_SETTINGS } }),

      // Simplified Mode actions
      setSimplifiedModeSettings: (settings) =>
        set((state) => ({
          simplifiedModeSettings: { ...state.simplifiedModeSettings, ...settings },
        })),
      setSimplifiedModeEnabled: (enabled) =>
        set((state) => ({
          simplifiedModeSettings: { ...state.simplifiedModeSettings, enabled },
        })),
      setSimplifiedModePreset: (preset) =>
        set((state) => {
          const presetConfig = SIMPLIFIED_MODE_PRESETS[preset];
          return {
            simplifiedModeSettings: {
              ...state.simplifiedModeSettings,
              ...presetConfig,
              preset,
            },
          };
        }),
      toggleSimplifiedMode: () =>
        set((state) => ({
          simplifiedModeSettings: {
            ...state.simplifiedModeSettings,
            enabled: !state.simplifiedModeSettings.enabled,
          },
        })),
      resetSimplifiedModeSettings: () =>
        set({ simplifiedModeSettings: { ...DEFAULT_SIMPLIFIED_MODE_SETTINGS } }),

      // Onboarding actions
      setOnboardingCompleted: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),

      resetSettings: () => set(initialState),
    }),
    {
      name: 'cognia-settings',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined;

        return {
          ...currentState,
          ...persisted,
          backgroundSettings: normalizeBackgroundSettings(
            persisted?.backgroundSettings ?? currentState.backgroundSettings
          ),
        };
      },
      partialize: (state) => {
        const shouldStripSecrets = isStrongholdAvailable();
        const providerSettings = shouldStripSecrets
          ? Object.fromEntries(
              Object.entries(state.providerSettings).map(([id, settings]) => [
                id,
                {
                  ...settings,
                  apiKey: '',
                  apiKeys: [],
                },
              ])
            )
          : state.providerSettings;
        const customProviders = shouldStripSecrets
          ? Object.fromEntries(
              Object.entries(state.customProviders).map(([id, settings]) => [
                id,
                {
                  ...settings,
                  apiKey: '',
                },
              ])
            )
          : state.customProviders;
        const searchProviders = shouldStripSecrets
          ? Object.fromEntries(
              Object.entries(state.searchProviders).map(([id, settings]) => [
                id,
                {
                  ...settings,
                  apiKey: '',
                },
              ])
            )
          : state.searchProviders;
        const tavilyApiKey = shouldStripSecrets ? '' : state.tavilyApiKey;

        return {
          theme: state.theme,
          colorTheme: state.colorTheme,
          customThemes: state.customThemes,
          activeCustomThemeId: state.activeCustomThemeId,
          uiCustomization: state.uiCustomization,
          themeSchedule: state.themeSchedule,
          language: state.language,
          autoDetectLocale: state.autoDetectLocale,
          localeDetectionResult: state.localeDetectionResult,
          detectedTimezone: state.detectedTimezone,
          customInstructions: state.customInstructions,
          customInstructionsEnabled: state.customInstructionsEnabled,
          aboutUser: state.aboutUser,
          responsePreferences: state.responsePreferences,
          providerSettings,
          customProviders,
          defaultProvider: state.defaultProvider,
          sidebarCollapsed: state.sidebarCollapsed,
          streamingEnabled: state.streamingEnabled,
          streamResponses: state.streamResponses,
          sendOnEnter: state.sendOnEnter,
          // Chat behavior
          defaultTemperature: state.defaultTemperature,
          defaultMaxTokens: state.defaultMaxTokens,
          contextLength: state.contextLength,
          autoTitleGeneration: state.autoTitleGeneration,
          showModelInChat: state.showModelInChat,
          enableMarkdownRendering: state.enableMarkdownRendering,
          tavilyApiKey,
          searchEnabled: state.searchEnabled,
          searchMaxResults: state.searchMaxResults,
          searchProviders,
          defaultSearchProvider: state.defaultSearchProvider,
          searchFallbackEnabled: state.searchFallbackEnabled,
          defaultSearchSources: state.defaultSearchSources,
          // Tool settings
          enableFileTools: state.enableFileTools,
          enableDocumentTools: state.enableDocumentTools,
          enableCodeExecution: state.enableCodeExecution,
          enableWebSearch: state.enableWebSearch,
          enableRAGSearch: state.enableRAGSearch,
          enableCalculator: state.enableCalculator,
          // Response display
          codeTheme: state.codeTheme,
          codeFontFamily: state.codeFontFamily,
          codeFontSize: state.codeFontSize,
          showLineNumbers: state.showLineNumbers,
          codeWordWrap: state.codeWordWrap,
          enableSyntaxHighlight: state.enableSyntaxHighlight,
          lineHeight: state.lineHeight,
          enableMathRendering: state.enableMathRendering,
          mathFontScale: state.mathFontScale,
          mathDisplayAlignment: state.mathDisplayAlignment,
          mathShowCopyButton: state.mathShowCopyButton,
          enableMermaidDiagrams: state.enableMermaidDiagrams,
          mermaidTheme: state.mermaidTheme,
          enableVegaLiteCharts: state.enableVegaLiteCharts,
          vegaLiteTheme: state.vegaLiteTheme,
          compactMode: state.compactMode,
          showTimestamps: state.showTimestamps,
          showTokenCount: state.showTokenCount,
          // Appearance enhancements
          uiFontSize: state.uiFontSize,
          messageBubbleStyle: state.messageBubbleStyle,
          // Background settings
          backgroundSettings: state.backgroundSettings,
          // Advanced chat parameters
          defaultTopP: state.defaultTopP,
          defaultFrequencyPenalty: state.defaultFrequencyPenalty,
          defaultPresencePenalty: state.defaultPresencePenalty,
          // Keyboard shortcuts
          customShortcuts: state.customShortcuts,
          // Speech settings
          speechSettings: state.speechSettings,
          // Compression settings
          compressionSettings: state.compressionSettings,
          // Auto Router settings
          autoRouterSettings: state.autoRouterSettings,
          // Load Balancer settings
          loadBalancerSettings: state.loadBalancerSettings,
          // Chat History Context settings
          chatHistoryContextSettings: state.chatHistoryContextSettings,
          // Tokenizer settings
          tokenizerSettings: state.tokenizerSettings,
          // Safety Mode settings
          safetyModeSettings: state.safetyModeSettings,
          // Feature Routing settings
          featureRoutingSettings: state.featureRoutingSettings,
          // Observability settings
          observabilitySettings: state.observabilitySettings,
          // Welcome Settings
          welcomeSettings: state.welcomeSettings,
          // Onboarding
          hasCompletedOnboarding: state.hasCompletedOnboarding,
        };
      },
    }
  )
);

// Selectors
export const selectTheme = (state: SettingsState) => state.theme;
export const selectColorTheme = (state: SettingsState) => state.colorTheme;
export const selectLanguage = (state: SettingsState) => state.language;
export const selectDefaultProvider = (state: SettingsState) => state.defaultProvider;
export const selectSidebarCollapsed = (state: SettingsState) => state.sidebarCollapsed;
export const selectSearchEnabled = (state: SettingsState) => state.searchEnabled;
export const selectCompressionSettings = (state: SettingsState) => state.compressionSettings;
export const selectCompressionEnabled = (state: SettingsState) => state.compressionSettings.enabled;
export const selectBackgroundSettings = (state: SettingsState) => state.backgroundSettings;
export const selectBackgroundEnabled = (state: SettingsState) => state.backgroundSettings.enabled;
export const selectAutoRouterSettings = (state: SettingsState) => state.autoRouterSettings;
export const selectAutoRouterEnabled = (state: SettingsState) => state.autoRouterSettings.enabled;
export const selectLoadBalancerSettings = (state: SettingsState) => state.loadBalancerSettings;
export const selectLoadBalancerEnabled = (state: SettingsState) =>
  state.loadBalancerSettings.enabled;
export const selectLoadBalancingStrategy = (state: SettingsState) =>
  state.loadBalancerSettings.strategy;
export const selectCircuitBreakerSettings = (state: SettingsState) =>
  state.loadBalancerSettings.circuitBreaker;
export const selectChatHistoryContextSettings = (state: SettingsState) =>
  state.chatHistoryContextSettings;
export const selectChatHistoryContextEnabled = (state: SettingsState) =>
  state.chatHistoryContextSettings.enabled;
export const selectTokenizerSettings = (state: SettingsState) => state.tokenizerSettings;
export const selectTokenizerEnabled = (state: SettingsState) =>
  state.tokenizerSettings.enablePreciseCounting;
export const selectFeatureRoutingSettings = (state: SettingsState) => state.featureRoutingSettings;
export const selectFeatureRoutingEnabled = (state: SettingsState) =>
  state.featureRoutingSettings.enabled;
export const selectWelcomeSettings = (state: SettingsState) => state.welcomeSettings;
export const selectWelcomeEnabled = (state: SettingsState) => state.welcomeSettings.enabled;
