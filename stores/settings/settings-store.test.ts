/**
 * Tests for Settings Store
 */

import { act } from '@testing-library/react';
import {
  useSettingsStore,
  selectTheme,
  selectLanguage,
  selectDefaultProvider,
  selectAgentTraceSettings,
  selectAgentTraceEnabled,
  DEFAULT_AGENT_TRACE_SETTINGS,
} from './settings-store';

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
  secureStoreCustomProviderApiKey: (...args: unknown[]) =>
    mockSecureStoreCustomProviderApiKey(...args),
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
          apiProtocol: 'openai',
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
          apiProtocol: 'openai',
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
          apiProtocol: 'openai',
          enabled: true,
        });
      });

      act(() => {
        useSettingsStore.getState().updateCustomProvider(providerId!, { customName: 'Updated' });
      });

      expect(useSettingsStore.getState().getCustomProvider(providerId!)?.customName).toBe(
        'Updated'
      );
    });

    it('should remove custom provider', () => {
      let providerId;
      act(() => {
        providerId = useSettingsStore.getState().addCustomProvider({
          providerId: '',
          customName: 'To Remove',
          customModels: ['model-1'],
          defaultModel: 'model-1',
          apiProtocol: 'openai',
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

  describe('agent optimization settings', () => {
    beforeEach(() => {
      act(() => {
        useSettingsStore.getState().resetAgentOptimizationSettings();
      });
    });

    describe('initial state', () => {
      it('has correct default values', () => {
        const state = useSettingsStore.getState();
        expect(state.agentOptimizationSettings.enableSmartRouting).toBe(false);
        expect(state.agentOptimizationSettings.singleAgentThreshold).toBe(0.6);
        expect(state.agentOptimizationSettings.enableTokenBudget).toBe(false);
        expect(state.agentOptimizationSettings.maxTokenBudget).toBe(50000);
        expect(state.agentOptimizationSettings.estimatedTokensPerSubAgent).toBe(2000);
        expect(state.agentOptimizationSettings.enableTokenWarnings).toBe(true);
        expect(state.agentOptimizationSettings.enableContextIsolation).toBe(false);
        expect(state.agentOptimizationSettings.summarizeSubAgentResults).toBe(false);
        expect(state.agentOptimizationSettings.maxResultTokens).toBe(500);
        expect(state.agentOptimizationSettings.enableToolWarnings).toBe(true);
        expect(state.agentOptimizationSettings.toolWarningThreshold).toBe(20);
        expect(state.agentOptimizationSettings.enableSkillMcpAutoLoad).toBe(true);
      });
    });

    describe('smart routing', () => {
      it('should enable smart routing', () => {
        act(() => {
          useSettingsStore.getState().setSmartRoutingEnabled(true);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableSmartRouting).toBe(true);
      });

      it('should disable smart routing', () => {
        act(() => {
          useSettingsStore.getState().setSmartRoutingEnabled(true);
          useSettingsStore.getState().setSmartRoutingEnabled(false);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableSmartRouting).toBe(false);
      });

      it('should set single agent threshold', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({ singleAgentThreshold: 0.8 });
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.singleAgentThreshold).toBe(0.8);
      });
    });

    describe('token budget', () => {
      it('should enable token budget', () => {
        act(() => {
          useSettingsStore.getState().setTokenBudgetEnabled(true);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableTokenBudget).toBe(true);
      });

      it('should set max token budget', () => {
        act(() => {
          useSettingsStore.getState().setMaxTokenBudget(100000);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.maxTokenBudget).toBe(100000);
      });

      it('should set estimated tokens per sub-agent', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({ estimatedTokensPerSubAgent: 3000 });
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.estimatedTokensPerSubAgent).toBe(3000);
      });

      it('should toggle token warnings', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({ enableTokenWarnings: false });
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableTokenWarnings).toBe(false);
      });
    });

    describe('context isolation', () => {
      it('should enable context isolation', () => {
        act(() => {
          useSettingsStore.getState().setContextIsolationEnabled(true);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableContextIsolation).toBe(true);
      });

      it('should enable summarize sub-agent results', () => {
        act(() => {
          useSettingsStore.getState().setSummarizeSubAgentResults(true);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.summarizeSubAgentResults).toBe(true);
      });

      it('should set max result tokens', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({ maxResultTokens: 1000 });
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.maxResultTokens).toBe(1000);
      });
    });

    describe('tool warnings', () => {
      it('should enable tool warnings', () => {
        act(() => {
          useSettingsStore.getState().setToolWarningsEnabled(true);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableToolWarnings).toBe(true);
      });

      it('should disable tool warnings', () => {
        act(() => {
          useSettingsStore.getState().setToolWarningsEnabled(false);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableToolWarnings).toBe(false);
      });

      it('should set tool warning threshold', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({ toolWarningThreshold: 30 });
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.toolWarningThreshold).toBe(30);
      });
    });

    describe('skills-mcp auto-load', () => {
      it('should enable skills-mcp auto-load', () => {
        act(() => {
          useSettingsStore.getState().setSkillMcpAutoLoadEnabled(true);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableSkillMcpAutoLoad).toBe(true);
      });

      it('should disable skills-mcp auto-load', () => {
        act(() => {
          useSettingsStore.getState().setSkillMcpAutoLoadEnabled(false);
        });
        expect(useSettingsStore.getState().agentOptimizationSettings.enableSkillMcpAutoLoad).toBe(false);
      });
    });

    describe('batch updates', () => {
      it('should update multiple settings at once', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({
            enableSmartRouting: true,
            singleAgentThreshold: 0.7,
            enableTokenBudget: true,
            maxTokenBudget: 80000,
          });
        });
        const settings = useSettingsStore.getState().agentOptimizationSettings;
        expect(settings.enableSmartRouting).toBe(true);
        expect(settings.singleAgentThreshold).toBe(0.7);
        expect(settings.enableTokenBudget).toBe(true);
        expect(settings.maxTokenBudget).toBe(80000);
      });

      it('should preserve unmodified settings during partial update', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({
            enableSmartRouting: true,
          });
        });
        const settings = useSettingsStore.getState().agentOptimizationSettings;
        expect(settings.enableSmartRouting).toBe(true);
        // Other settings should remain at defaults
        expect(settings.enableTokenBudget).toBe(false);
        expect(settings.enableContextIsolation).toBe(false);
        expect(settings.enableSkillMcpAutoLoad).toBe(true);
      });
    });

    describe('reset', () => {
      it('should reset agent optimization settings to defaults', () => {
        act(() => {
          useSettingsStore.getState().setAgentOptimizationSettings({
            enableSmartRouting: true,
            enableTokenBudget: true,
            enableContextIsolation: true,
            enableToolWarnings: false,
            enableSkillMcpAutoLoad: false,
            singleAgentThreshold: 0.9,
            maxTokenBudget: 100000,
          });
          useSettingsStore.getState().resetAgentOptimizationSettings();
        });
        const settings = useSettingsStore.getState().agentOptimizationSettings;
        expect(settings.enableSmartRouting).toBe(false);
        expect(settings.enableTokenBudget).toBe(false);
        expect(settings.enableContextIsolation).toBe(false);
        expect(settings.enableToolWarnings).toBe(true);
        expect(settings.enableSkillMcpAutoLoad).toBe(true);
        expect(settings.singleAgentThreshold).toBe(0.6);
        expect(settings.maxTokenBudget).toBe(50000);
      });
    });
  });

  describe('agent trace settings', () => {
    beforeEach(() => {
      act(() => {
        useSettingsStore.getState().resetAgentTraceSettings();
      });
    });

    describe('initial state', () => {
      it('has correct default values', () => {
        const state = useSettingsStore.getState();
        expect(state.agentTraceSettings.enabled).toBe(DEFAULT_AGENT_TRACE_SETTINGS.enabled);
        expect(state.agentTraceSettings.maxRecords).toBe(DEFAULT_AGENT_TRACE_SETTINGS.maxRecords);
        expect(state.agentTraceSettings.autoCleanupDays).toBe(DEFAULT_AGENT_TRACE_SETTINGS.autoCleanupDays);
        expect(state.agentTraceSettings.traceShellCommands).toBe(DEFAULT_AGENT_TRACE_SETTINGS.traceShellCommands);
        expect(state.agentTraceSettings.traceCodeEdits).toBe(DEFAULT_AGENT_TRACE_SETTINGS.traceCodeEdits);
      });

      it('matches DEFAULT_AGENT_TRACE_SETTINGS', () => {
        const state = useSettingsStore.getState();
        expect(state.agentTraceSettings).toEqual(DEFAULT_AGENT_TRACE_SETTINGS);
      });
    });

    describe('setAgentTraceEnabled', () => {
      it('should enable agent trace', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceEnabled(true);
        });
        expect(useSettingsStore.getState().agentTraceSettings.enabled).toBe(true);
      });

      it('should disable agent trace', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceEnabled(false);
        });
        expect(useSettingsStore.getState().agentTraceSettings.enabled).toBe(false);
      });
    });

    describe('setAgentTraceMaxRecords', () => {
      it('should set max records', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceMaxRecords(500);
        });
        expect(useSettingsStore.getState().agentTraceSettings.maxRecords).toBe(500);
      });

      it('should set max records to 0 (unlimited)', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceMaxRecords(0);
        });
        expect(useSettingsStore.getState().agentTraceSettings.maxRecords).toBe(0);
      });
    });

    describe('setAgentTraceAutoCleanupDays', () => {
      it('should set auto cleanup days', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceAutoCleanupDays(7);
        });
        expect(useSettingsStore.getState().agentTraceSettings.autoCleanupDays).toBe(7);
      });

      it('should set auto cleanup to 0 (never)', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceAutoCleanupDays(0);
        });
        expect(useSettingsStore.getState().agentTraceSettings.autoCleanupDays).toBe(0);
      });
    });

    describe('setAgentTraceShellCommands', () => {
      it('should enable shell command tracing', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceShellCommands(true);
        });
        expect(useSettingsStore.getState().agentTraceSettings.traceShellCommands).toBe(true);
      });

      it('should disable shell command tracing', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceShellCommands(false);
        });
        expect(useSettingsStore.getState().agentTraceSettings.traceShellCommands).toBe(false);
      });
    });

    describe('setAgentTraceCodeEdits', () => {
      it('should enable code edit tracing', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceCodeEdits(true);
        });
        expect(useSettingsStore.getState().agentTraceSettings.traceCodeEdits).toBe(true);
      });

      it('should disable code edit tracing', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceCodeEdits(false);
        });
        expect(useSettingsStore.getState().agentTraceSettings.traceCodeEdits).toBe(false);
      });
    });

    describe('setAgentTraceSettings', () => {
      it('should update multiple settings at once', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceSettings({
            enabled: false,
            maxRecords: 2000,
            autoCleanupDays: 14,
          });
        });
        const settings = useSettingsStore.getState().agentTraceSettings;
        expect(settings.enabled).toBe(false);
        expect(settings.maxRecords).toBe(2000);
        expect(settings.autoCleanupDays).toBe(14);
      });

      it('should preserve unmodified settings during partial update', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceSettings({
            enabled: false,
          });
        });
        const settings = useSettingsStore.getState().agentTraceSettings;
        expect(settings.enabled).toBe(false);
        // Other settings should remain at defaults
        expect(settings.maxRecords).toBe(DEFAULT_AGENT_TRACE_SETTINGS.maxRecords);
        expect(settings.traceShellCommands).toBe(DEFAULT_AGENT_TRACE_SETTINGS.traceShellCommands);
      });
    });

    describe('resetAgentTraceSettings', () => {
      it('should reset to defaults', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceSettings({
            enabled: false,
            maxRecords: 5000,
            autoCleanupDays: 60,
            traceShellCommands: false,
            traceCodeEdits: false,
          });
          useSettingsStore.getState().resetAgentTraceSettings();
        });
        expect(useSettingsStore.getState().agentTraceSettings).toEqual(DEFAULT_AGENT_TRACE_SETTINGS);
      });
    });

    describe('selectors', () => {
      it('should select agent trace settings', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceSettings({ maxRecords: 999 });
        });
        const settings = selectAgentTraceSettings(useSettingsStore.getState());
        expect(settings.maxRecords).toBe(999);
      });

      it('should select agent trace enabled', () => {
        act(() => {
          useSettingsStore.getState().setAgentTraceEnabled(false);
        });
        expect(selectAgentTraceEnabled(useSettingsStore.getState())).toBe(false);

        act(() => {
          useSettingsStore.getState().setAgentTraceEnabled(true);
        });
        expect(selectAgentTraceEnabled(useSettingsStore.getState())).toBe(true);
      });
    });
  });
});
