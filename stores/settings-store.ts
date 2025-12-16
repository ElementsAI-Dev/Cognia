/**
 * Settings Store - manages user preferences and provider configurations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { UserProviderSettings } from '@/types/provider';
import type { ColorThemePreset } from '@/lib/themes';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'en' | 'zh-CN';

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

  // Search preferences (Tavily)
  tavilyApiKey: string;
  setTavilyApiKey: (key: string) => void;
  searchEnabled: boolean;
  setSearchEnabled: (enabled: boolean) => void;
  searchMaxResults: number;
  setSearchMaxResults: (count: number) => void;

  // Research preferences
  defaultSearchSources: string[];
  setDefaultSearchSources: (sources: string[]) => void;

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

  // Search
  tavilyApiKey: '',
  searchEnabled: false,
  searchMaxResults: 5,

  // Research
  defaultSearchSources: ['google', 'brave'],
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

      // Search actions
      setTavilyApiKey: (tavilyApiKey) => set({ tavilyApiKey }),
      setSearchEnabled: (searchEnabled) => set({ searchEnabled }),
      setSearchMaxResults: (searchMaxResults) => set({ searchMaxResults }),

      setDefaultSearchSources: (defaultSearchSources) => set({ defaultSearchSources }),

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
        tavilyApiKey: state.tavilyApiKey,
        searchEnabled: state.searchEnabled,
        searchMaxResults: state.searchMaxResults,
        defaultSearchSources: state.defaultSearchSources,
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
