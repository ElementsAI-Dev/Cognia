/**
 * Settings Store - manages user preferences and provider configurations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { UserProviderSettings, ApiKeyRotationStrategy } from '@/types/provider';
import {
  getNextApiKey,
  recordApiKeySuccess,
  recordApiKeyError,
  getDefaultUsageStats,
} from '@/lib/ai/api-key-rotation';
import type { ColorThemePreset } from '@/lib/themes';
import type { SearchProviderType, SearchProviderSettings } from '@/types/search';
import { DEFAULT_SEARCH_PROVIDER_SETTINGS } from '@/types/search';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh-CN';

// Response display settings types
export type CodeTheme = 'github-dark' | 'github-light' | 'monokai' | 'dracula' | 'nord' | 'one-dark';
export type FontFamily = 'system' | 'inter' | 'roboto' | 'fira-code' | 'jetbrains-mono';
export type MessageBubbleStyle = 'default' | 'minimal' | 'bordered' | 'gradient';

// Custom theme interface
export interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  isDark: boolean;
}

// Custom provider interface (extends UserProviderSettings)
export interface CustomProviderSettings extends UserProviderSettings {
  isCustom: true;
  customName: string;
  customModels: string[];
}

interface SettingsState {
  // Theme (light/dark/system mode)
  theme: Theme;
  setTheme: (theme: Theme) => void;

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

  // Language
  language: Language;
  setLanguage: (language: Language) => void;

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
  setApiKeyRotation: (providerId: string, enabled: boolean, strategy?: ApiKeyRotationStrategy) => void;
  getActiveApiKey: (providerId: string) => string | undefined;
  rotateToNextApiKey: (providerId: string) => string | undefined;
  recordApiKeyUsage: (providerId: string, apiKey: string, success: boolean, errorMessage?: string) => void;
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
  setSearchProviderSettings: (providerId: SearchProviderType, settings: Partial<SearchProviderSettings>) => void;
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
};

const initialState = {
  // Theme
  theme: 'system' as Theme,
  colorTheme: 'default' as ColorThemePreset,
  customThemes: [] as CustomTheme[],
  activeCustomThemeId: null as string | null,

  // Language
  language: 'en' as Language,

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

  // Tool settings
  enableFileTools: false,
  enableDocumentTools: true,
  enableCodeExecution: false,
  enableWebSearch: true,
  enableRAGSearch: true,
  enableCalculator: true,

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

  // Advanced chat parameters
  defaultTopP: 1.0,
  defaultFrequencyPenalty: 0,
  defaultPresencePenalty: 0,

  // Keyboard shortcut customization
  customShortcuts: {} as Record<string, string>,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Theme actions
      setTheme: (theme) => set({ theme }),
      setColorTheme: (colorTheme) => set({ colorTheme, activeCustomThemeId: null }),

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
          customThemes: state.customThemes.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          ),
        })),
      deleteCustomTheme: (id) =>
        set((state) => ({
          customThemes: state.customThemes.filter((t) => t.id !== id),
          activeCustomThemeId: state.activeCustomThemeId === id ? null : state.activeCustomThemeId,
        })),
      setActiveCustomTheme: (activeCustomThemeId) => set({ activeCustomThemeId }),

      // Language actions
      setLanguage: (language) => set({ language }),

      // Custom Instructions actions
      setCustomInstructions: (customInstructions) => set({ customInstructions }),
      setCustomInstructionsEnabled: (customInstructionsEnabled) => set({ customInstructionsEnabled }),
      setAboutUser: (aboutUser) => set({ aboutUser }),
      setResponsePreferences: (responsePreferences) => set({ responsePreferences }),

      // Provider actions
      setProviderSettings: (providerId, settings) =>
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            [providerId]: {
              ...state.providerSettings[providerId],
              ...settings,
            },
          },
        })),
      updateProviderSettings: (providerId, settings) =>
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            [providerId]: {
              ...state.providerSettings[providerId],
              ...settings,
            },
          },
        })),
      getProviderSettings: (providerId) => {
        const { providerSettings, customProviders } = get();
        return providerSettings[providerId] || customProviders[providerId];
      },

      // Multi-API Key management actions
      addApiKey: (providerId, apiKey) =>
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
        }),

      removeApiKey: (providerId, apiKeyIndex) =>
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
                apiKey: settings.apiKey === keyToRemove ? (newKeys[0] || '') : settings.apiKey,
              },
            },
          };
        }),

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
        if (!settings || !settings.apiKeyRotationEnabled || !settings.apiKeys || settings.apiKeys.length <= 1) {
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
        return id;
      },
      updateCustomProvider: (id, updates) =>
        set((state) => ({
          customProviders: {
            ...state.customProviders,
            [id]: {
              ...state.customProviders[id],
              ...updates,
            },
          },
        })),
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
      setTavilyApiKey: (tavilyApiKey) => set({ tavilyApiKey }),
      setSearchEnabled: (searchEnabled) => set({ searchEnabled }),
      setSearchMaxResults: (searchMaxResults) => set({ searchMaxResults }),

      // Search actions (Multi-provider)
      setSearchProviderSettings: (providerId, settings) =>
        set((state) => ({
          searchProviders: {
            ...state.searchProviders,
            [providerId]: {
              ...state.searchProviders[providerId],
              ...settings,
            },
          },
        })),
      setSearchProviderApiKey: (providerId, apiKey) =>
        set((state) => ({
          searchProviders: {
            ...state.searchProviders,
            [providerId]: {
              ...state.searchProviders[providerId],
              apiKey,
            },
          },
        })),
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

      // Tool settings actions
      setEnableFileTools: (enableFileTools) => set({ enableFileTools }),
      setEnableDocumentTools: (enableDocumentTools) => set({ enableDocumentTools }),
      setEnableCodeExecution: (enableCodeExecution) => set({ enableCodeExecution }),
      setEnableWebSearch: (enableWebSearch) => set({ enableWebSearch }),
      setEnableRAGSearch: (enableRAGSearch) => set({ enableRAGSearch }),
      setEnableCalculator: (enableCalculator) => set({ enableCalculator }),

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

      // Advanced chat parameter actions
      setDefaultTopP: (defaultTopP) => set({ defaultTopP: Math.min(1, Math.max(0, defaultTopP)) }),
      setDefaultFrequencyPenalty: (defaultFrequencyPenalty) => set({ defaultFrequencyPenalty: Math.min(2, Math.max(-2, defaultFrequencyPenalty)) }),
      setDefaultPresencePenalty: (defaultPresencePenalty) => set({ defaultPresencePenalty: Math.min(2, Math.max(-2, defaultPresencePenalty)) }),

      // Keyboard shortcut actions
      setCustomShortcut: (id, keys) =>
        set((state) => ({
          customShortcuts: { ...state.customShortcuts, [id]: keys },
        })),
      resetShortcuts: () => set({ customShortcuts: {} }),

      resetSettings: () => set(initialState),
    }),
    {
      name: 'cognia-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        colorTheme: state.colorTheme,
        customThemes: state.customThemes,
        activeCustomThemeId: state.activeCustomThemeId,
        language: state.language,
        customInstructions: state.customInstructions,
        customInstructionsEnabled: state.customInstructionsEnabled,
        aboutUser: state.aboutUser,
        responsePreferences: state.responsePreferences,
        providerSettings: state.providerSettings,
        customProviders: state.customProviders,
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
        tavilyApiKey: state.tavilyApiKey,
        searchEnabled: state.searchEnabled,
        searchMaxResults: state.searchMaxResults,
        searchProviders: state.searchProviders,
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
        // Advanced chat parameters
        defaultTopP: state.defaultTopP,
        defaultFrequencyPenalty: state.defaultFrequencyPenalty,
        defaultPresencePenalty: state.defaultPresencePenalty,
        // Keyboard shortcuts
        customShortcuts: state.customShortcuts,
      }),
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
