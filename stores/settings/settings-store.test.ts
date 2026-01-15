/**
 * Tests for Settings Store
 */

import { act } from '@testing-library/react';
import { useSettingsStore, selectTheme, selectLanguage, selectDefaultProvider } from './settings-store';

const mockIsStrongholdAvailable = jest.fn(() => false);
const mockSecureStoreProviderApiKey = jest.fn();
const mockSecureStoreProviderApiKeys = jest.fn();
const mockSecureStoreSearchApiKey = jest.fn();
const mockSecureStoreCustomProviderApiKey = jest.fn();
const mockSecureRemoveProviderApiKey = jest.fn();

jest.mock('@/lib/native/stronghold-integration', () => ({
  isStrongholdAvailable: () => mockIsStrongholdAvailable(),
  secureStoreProviderApiKey: (...args: unknown[]) => mockSecureStoreProviderApiKey(...args),
  secureStoreProviderApiKeys: (...args: unknown[]) => mockSecureStoreProviderApiKeys(...args),
  secureStoreSearchApiKey: (...args: unknown[]) => mockSecureStoreSearchApiKey(...args),
  secureStoreCustomProviderApiKey: (...args: unknown[]) => mockSecureStoreCustomProviderApiKey(...args),
  secureRemoveProviderApiKey: (...args: unknown[]) => mockSecureRemoveProviderApiKey(...args),
}));

describe('useSettingsStore', () => {
  beforeEach(() => {
    mockIsStrongholdAvailable.mockReturnValue(false);
    mockSecureStoreProviderApiKey.mockReset();
    mockSecureStoreProviderApiKeys.mockReset();
    mockSecureStoreSearchApiKey.mockReset();
    mockSecureStoreCustomProviderApiKey.mockReset();
    mockSecureRemoveProviderApiKey.mockReset();
    act(() => {
      useSettingsStore.getState().resetSettings();
    });
  });

  describe('search provider settings', () => {
    it('syncs search api keys to stronghold when available', () => {
      mockIsStrongholdAvailable.mockReturnValue(true);

      act(() => {
        useSettingsStore.getState().setSearchProviderApiKey('tavily', 'search-key');
      });

      expect(mockSecureStoreSearchApiKey).toHaveBeenCalledWith('tavily', 'search-key');
    });

    it('syncs legacy tavily key to stronghold when available', () => {
      mockIsStrongholdAvailable.mockReturnValue(true);

      act(() => {
        useSettingsStore.getState().setTavilyApiKey('legacy-key');
      });

      expect(mockSecureStoreSearchApiKey).toHaveBeenCalledWith('tavily', 'legacy-key');
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.language).toBe('en');
      expect(state.defaultProvider).toBe('openai');
      expect(state.streamingEnabled).toBe(true);
      expect(state.sendOnEnter).toBe(true);
    });
  });

  describe('theme', () => {
    it('should set theme', () => {
      act(() => {
        useSettingsStore.getState().setTheme('dark');
      });
      expect(useSettingsStore.getState().theme).toBe('dark');
    });

    it('should set color theme', () => {
      act(() => {
        useSettingsStore.getState().setColorTheme('rose');
      });
      expect(useSettingsStore.getState().colorTheme).toBe('rose');
      expect(useSettingsStore.getState().activeCustomThemeId).toBeNull();
    });
  });

  describe('custom themes', () => {
    it('should create custom theme', () => {
      let themeId;
      act(() => {
        themeId = useSettingsStore.getState().createCustomTheme({
          name: 'My Theme',
          colors: {
            primary: '#000',
            secondary: '#111',
            accent: '#222',
            background: '#333',
            foreground: '#444',
            muted: '#555',
          },
          isDark: true,
        });
      });

      expect(themeId).toBeDefined();
      expect(useSettingsStore.getState().customThemes).toHaveLength(1);
    });

    it('should update custom theme', () => {
      let themeId;
      act(() => {
        themeId = useSettingsStore.getState().createCustomTheme({
          name: 'Original',
          colors: {
            primary: '#000',
            secondary: '#111',
            accent: '#222',
            background: '#333',
            foreground: '#444',
            muted: '#555',
          },
          isDark: true,
        });
      });

      act(() => {
        useSettingsStore.getState().updateCustomTheme(themeId!, { name: 'Updated' });
      });

      expect(useSettingsStore.getState().customThemes[0].name).toBe('Updated');
    });

    it('should delete custom theme', () => {
      let themeId;
      act(() => {
        themeId = useSettingsStore.getState().createCustomTheme({
          name: 'To Delete',
          colors: {
            primary: '#000',
            secondary: '#111',
            accent: '#222',
            background: '#333',
            foreground: '#444',
            muted: '#555',
          },
          isDark: false,
        });
        useSettingsStore.getState().setActiveCustomTheme(themeId!);
      });

      act(() => {
        useSettingsStore.getState().deleteCustomTheme(themeId!);
      });

      expect(useSettingsStore.getState().customThemes).toHaveLength(0);
      expect(useSettingsStore.getState().activeCustomThemeId).toBeNull();
    });
  });

  describe('language', () => {
    it('should set language', () => {
      act(() => {
        useSettingsStore.getState().setLanguage('zh-CN');
      });
      expect(useSettingsStore.getState().language).toBe('zh-CN');
    });
  });

  describe('custom instructions', () => {
    it('should set custom instructions', () => {
      act(() => {
        useSettingsStore.getState().setCustomInstructions('Be helpful');
      });
      expect(useSettingsStore.getState().customInstructions).toBe('Be helpful');
    });

    it('should toggle custom instructions enabled', () => {
      act(() => {
        useSettingsStore.getState().setCustomInstructionsEnabled(false);
      });
      expect(useSettingsStore.getState().customInstructionsEnabled).toBe(false);
    });

    it('should set about user', () => {
      act(() => {
        useSettingsStore.getState().setAboutUser('I am a developer');
      });
      expect(useSettingsStore.getState().aboutUser).toBe('I am a developer');
    });

    it('should set response preferences', () => {
      act(() => {
        useSettingsStore.getState().setResponsePreferences('Be concise');
      });
      expect(useSettingsStore.getState().responsePreferences).toBe('Be concise');
    });
  });

  describe('provider settings', () => {
    it('should set provider settings', () => {
      act(() => {
        useSettingsStore.getState().setProviderSettings('openai', {
          apiKey: 'test-key',
          defaultModel: 'gpt-4-turbo',
        });
      });

      const settings = useSettingsStore.getState().providerSettings.openai;
      expect(settings.apiKey).toBe('test-key');
      expect(settings.defaultModel).toBe('gpt-4-turbo');
    });

    it('syncs provider keys to stronghold when available', () => {
      mockIsStrongholdAvailable.mockReturnValue(true);

      act(() => {
        useSettingsStore.getState().setProviderSettings('openai', {
          apiKey: 'secure-key',
          apiKeys: ['key-1'],
        });
      });

      expect(mockSecureStoreProviderApiKey).toHaveBeenCalledWith('openai', 'secure-key');
      expect(mockSecureStoreProviderApiKeys).toHaveBeenCalledWith('openai', ['key-1']);
    });

    it('should get provider settings', () => {
      const settings = useSettingsStore.getState().getProviderSettings('openai');
      expect(settings).toBeDefined();
      expect(settings?.providerId).toBe('openai');
    });
  });

  describe('API key management', () => {
    it('should add API key', () => {
      act(() => {
        useSettingsStore.getState().addApiKey('openai', 'key-1');
        useSettingsStore.getState().addApiKey('openai', 'key-2');
      });

      const settings = useSettingsStore.getState().providerSettings.openai;
      expect(settings.apiKeys).toHaveLength(2);
    });

    it('should not add duplicate API key', () => {
      act(() => {
        useSettingsStore.getState().addApiKey('openai', 'key-1');
        useSettingsStore.getState().addApiKey('openai', 'key-1');
      });

      const settings = useSettingsStore.getState().providerSettings.openai;
      expect(settings.apiKeys).toHaveLength(1);
    });

    it('removes secure keys when last api key is removed', () => {
      mockIsStrongholdAvailable.mockReturnValue(true);

      act(() => {
        useSettingsStore.getState().addApiKey('openai', 'key-1');
      });

      act(() => {
        useSettingsStore.getState().removeApiKey('openai', 0);
      });

      expect(mockSecureRemoveProviderApiKey).toHaveBeenCalledWith('openai');
      expect(mockSecureStoreProviderApiKeys).toHaveBeenCalledWith('openai', []);
    });

    it('should remove API key', () => {
      act(() => {
        useSettingsStore.getState().addApiKey('openai', 'key-1');
        useSettingsStore.getState().addApiKey('openai', 'key-2');
      });

      act(() => {
        useSettingsStore.getState().removeApiKey('openai', 0);
      });

      const settings = useSettingsStore.getState().providerSettings.openai;
      expect(settings.apiKeys).toHaveLength(1);
    });

    it('should set API key rotation', () => {
      act(() => {
        useSettingsStore.getState().setApiKeyRotation('openai', true, 'least-used');
      });

      const settings = useSettingsStore.getState().providerSettings.openai;
      expect(settings.apiKeyRotationEnabled).toBe(true);
      expect(settings.apiKeyRotationStrategy).toBe('least-used');
    });
  });

  describe('custom providers', () => {
    it('should add custom provider', () => {
      let providerId;
      act(() => {
        providerId = useSettingsStore.getState().addCustomProvider({
          providerId: '',
          customName: 'My Provider',
          customModels: ['model-1'],
          defaultModel: 'model-1',
          apiKey: 'key',
          baseURL: 'http://localhost:8000',
          enabled: true,
        });
      });

      expect(providerId).toContain('custom-');
      expect(useSettingsStore.getState().getCustomProvider(providerId!)).toBeDefined();
    });

    it('syncs custom provider api key to stronghold when available', () => {
      mockIsStrongholdAvailable.mockReturnValue(true);

      act(() => {
        useSettingsStore.getState().addCustomProvider({
          providerId: '',
          customName: 'Secure',
          customModels: ['model-1'],
          defaultModel: 'model-1',
          apiKey: 'custom-key',
          enabled: true,
        });
      });

      expect(mockSecureStoreCustomProviderApiKey).toHaveBeenCalled();
    });

    it('should update custom provider', () => {
      let providerId;
      act(() => {
        providerId = useSettingsStore.getState().addCustomProvider({
          providerId: '',
          customName: 'Original',
          customModels: ['model-1'],
          defaultModel: 'model-1',
          enabled: true,
        });
      });

      act(() => {
        useSettingsStore.getState().updateCustomProvider(providerId!, { customName: 'Updated' });
      });

      expect(useSettingsStore.getState().getCustomProvider(providerId!)?.customName).toBe('Updated');
    });

    it('should remove custom provider', () => {
      let providerId;
      act(() => {
        providerId = useSettingsStore.getState().addCustomProvider({
          providerId: '',
          customName: 'To Remove',
          customModels: ['model-1'],
          defaultModel: 'model-1',
          enabled: true,
        });
        useSettingsStore.getState().setDefaultProvider(providerId!);
      });

      act(() => {
        useSettingsStore.getState().removeCustomProvider(providerId!);
      });

      expect(useSettingsStore.getState().getCustomProvider(providerId!)).toBeUndefined();
      expect(useSettingsStore.getState().defaultProvider).toBe('openai');
    });
  });

  describe('UI preferences', () => {
    it('should set sidebar collapsed', () => {
      act(() => {
        useSettingsStore.getState().setSidebarCollapsed(true);
      });
      expect(useSettingsStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should set streaming enabled', () => {
      act(() => {
        useSettingsStore.getState().setStreamingEnabled(false);
      });
      expect(useSettingsStore.getState().streamingEnabled).toBe(false);
    });

    it('should set send on enter', () => {
      act(() => {
        useSettingsStore.getState().setSendOnEnter(false);
      });
      expect(useSettingsStore.getState().sendOnEnter).toBe(false);
    });
  });

  describe('chat behavior', () => {
    it('should set default temperature', () => {
      act(() => {
        useSettingsStore.getState().setDefaultTemperature(0.5);
      });
      expect(useSettingsStore.getState().defaultTemperature).toBe(0.5);
    });

    it('should set default max tokens', () => {
      act(() => {
        useSettingsStore.getState().setDefaultMaxTokens(2000);
      });
      expect(useSettingsStore.getState().defaultMaxTokens).toBe(2000);
    });

    it('should set context length', () => {
      act(() => {
        useSettingsStore.getState().setContextLength(20);
      });
      expect(useSettingsStore.getState().contextLength).toBe(20);
    });
  });

  describe('advanced parameters', () => {
    it('should clamp topP to valid range', () => {
      act(() => {
        useSettingsStore.getState().setDefaultTopP(1.5);
      });
      expect(useSettingsStore.getState().defaultTopP).toBe(1);

      act(() => {
        useSettingsStore.getState().setDefaultTopP(-0.5);
      });
      expect(useSettingsStore.getState().defaultTopP).toBe(0);
    });

    it('should clamp frequency penalty to valid range', () => {
      act(() => {
        useSettingsStore.getState().setDefaultFrequencyPenalty(3);
      });
      expect(useSettingsStore.getState().defaultFrequencyPenalty).toBe(2);

      act(() => {
        useSettingsStore.getState().setDefaultFrequencyPenalty(-3);
      });
      expect(useSettingsStore.getState().defaultFrequencyPenalty).toBe(-2);
    });
  });

  describe('keyboard shortcuts', () => {
    it('should set custom shortcut', () => {
      act(() => {
        useSettingsStore.getState().setCustomShortcut('new-chat', 'Ctrl+Shift+N');
      });
      expect(useSettingsStore.getState().customShortcuts['new-chat']).toBe('Ctrl+Shift+N');
    });

    it('should reset shortcuts', () => {
      act(() => {
        useSettingsStore.getState().setCustomShortcut('new-chat', 'Ctrl+Shift+N');
        useSettingsStore.getState().resetShortcuts();
      });
      expect(useSettingsStore.getState().customShortcuts).toEqual({});
    });
  });

  describe('selectors', () => {
    it('should select theme', () => {
      act(() => {
        useSettingsStore.getState().setTheme('dark');
      });
      expect(selectTheme(useSettingsStore.getState())).toBe('dark');
    });

    it('should select language', () => {
      act(() => {
        useSettingsStore.getState().setLanguage('zh-CN');
      });
      expect(selectLanguage(useSettingsStore.getState())).toBe('zh-CN');
    });

    it('should select default provider', () => {
      act(() => {
        useSettingsStore.getState().setDefaultProvider('anthropic');
      });
      expect(selectDefaultProvider(useSettingsStore.getState())).toBe('anthropic');
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      act(() => {
        useSettingsStore.getState().setTheme('dark');
        useSettingsStore.getState().setLanguage('zh-CN');
        useSettingsStore.getState().setDefaultProvider('anthropic');
        useSettingsStore.getState().resetSettings();
      });

      const state = useSettingsStore.getState();
      expect(state.theme).toBe('system');
      expect(state.language).toBe('en');
      expect(state.defaultProvider).toBe('openai');
    });
  });
});
