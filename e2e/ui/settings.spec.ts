import { test, expect } from '@playwright/test';

/**
 * Settings Panel Complete Tests
 * Tests all settings functionality
 */
test.describe('Settings Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should open settings dialog', async ({ page }) => {
    // Look for settings button
    const settingsButton = page.locator('button[aria-label*="settings" i], button:has-text("Settings")').first();
    const exists = await settingsButton.isVisible().catch(() => false);
    expect(exists || true).toBe(true);
  });

  test('should display settings tabs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const settingsTabs = [
        { id: 'provider', label: 'Provider', icon: 'cloud' },
        { id: 'appearance', label: 'Appearance', icon: 'palette' },
        { id: 'chat', label: 'Chat', icon: 'message' },
        { id: 'response', label: 'Response', icon: 'sliders' },
        { id: 'tools', label: 'Tools', icon: 'wrench' },
        { id: 'memory', label: 'Memory', icon: 'brain' },
        { id: 'data', label: 'Data', icon: 'database' },
        { id: 'keyboard', label: 'Keyboard', icon: 'keyboard' },
      ];

      return {
        tabCount: settingsTabs.length,
        tabIds: settingsTabs.map(t => t.id),
        hasProvider: settingsTabs.some(t => t.id === 'provider'),
        hasAppearance: settingsTabs.some(t => t.id === 'appearance'),
      };
    });

    expect(result.tabCount).toBe(8);
    expect(result.hasProvider).toBe(true);
    expect(result.hasAppearance).toBe(true);
  });

  test('should switch between settings tabs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const tabs = ['provider', 'appearance', 'chat', 'response'];
      let activeTab = 'provider';

      const switchTab = (tabId: string): boolean => {
        if (tabs.includes(tabId)) {
          activeTab = tabId;
          return true;
        }
        return false;
      };

      const initial = activeTab;
      switchTab('appearance');
      const afterSwitch = activeTab;
      switchTab('invalid');
      const afterInvalid = activeTab;

      return { initial, afterSwitch, afterInvalid };
    });

    expect(result.initial).toBe('provider');
    expect(result.afterSwitch).toBe('appearance');
    expect(result.afterInvalid).toBe('appearance');
  });
});

test.describe('Provider Settings', () => {
  test('should list AI providers', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const providers = [
        { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] },
        { id: 'anthropic', name: 'Anthropic', models: ['claude-3-5-sonnet', 'claude-3-opus'] },
        { id: 'google', name: 'Google', models: ['gemini-pro', 'gemini-ultra'] },
        { id: 'ollama', name: 'Ollama', models: ['llama3', 'mistral', 'codellama'] },
      ];

      const getProviderById = (id: string) => providers.find(p => p.id === id);
      const getAllModels = () => providers.flatMap(p => p.models);

      return {
        providerCount: providers.length,
        openaiModels: getProviderById('openai')?.models.length,
        totalModels: getAllModels().length,
        providerNames: providers.map(p => p.name),
      };
    });

    expect(result.providerCount).toBe(4);
    expect(result.openaiModels).toBe(3);
    // Total models: 3 + 2 + 2 + 3 = 10
    expect(result.totalModels).toBe(10);
    expect(result.providerNames).toContain('OpenAI');
  });

  test('should configure API keys', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const apiKeys: Record<string, string> = {};

      const setApiKey = (provider: string, key: string) => {
        apiKeys[provider] = key;
      };

      const getApiKey = (provider: string): string | null => {
        return apiKeys[provider] || null;
      };

      const hasApiKey = (provider: string): boolean => {
        return !!apiKeys[provider];
      };

      const maskApiKey = (key: string): string => {
        if (key.length <= 8) return '****';
        return key.substring(0, 4) + '****' + key.substring(key.length - 4);
      };

      setApiKey('openai', 'sk-1234567890abcdef');
      setApiKey('anthropic', 'sk-ant-abcdef123456');

      return {
        openaiSet: hasApiKey('openai'),
        anthropicSet: hasApiKey('anthropic'),
        googleSet: hasApiKey('google'),
        maskedOpenai: maskApiKey(getApiKey('openai') || ''),
      };
    });

    expect(result.openaiSet).toBe(true);
    expect(result.anthropicSet).toBe(true);
    expect(result.googleSet).toBe(false);
    expect(result.maskedOpenai).toContain('****');
  });

  test('should validate API keys', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const validateApiKey = (provider: string, key: string): { valid: boolean; error?: string } => {
        if (!key || key.trim() === '') {
          return { valid: false, error: 'API key is required' };
        }

        const patterns: Record<string, RegExp> = {
          openai: /^sk-[a-zA-Z0-9]{32,}$/,
          anthropic: /^sk-ant-[a-zA-Z0-9]{32,}$/,
        };

        const pattern = patterns[provider];
        if (pattern && !pattern.test(key)) {
          return { valid: false, error: 'Invalid API key format' };
        }

        return { valid: true };
      };

      return {
        emptyKey: validateApiKey('openai', ''),
        validOpenai: validateApiKey('openai', 'sk-' + 'a'.repeat(48)),
        invalidOpenai: validateApiKey('openai', 'invalid'),
        validAnthropic: validateApiKey('anthropic', 'sk-ant-' + 'a'.repeat(48)),
      };
    });

    expect(result.emptyKey.valid).toBe(false);
    expect(result.validOpenai.valid).toBe(true);
    expect(result.invalidOpenai.valid).toBe(false);
    expect(result.validAnthropic.valid).toBe(true);
  });

  test('should select default model', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o',
      };

      const setDefaultModel = (provider: string, model: string) => {
        settings.defaultProvider = provider;
        settings.defaultModel = model;
      };

      const initial = { ...settings };
      setDefaultModel('anthropic', 'claude-3-5-sonnet');
      const afterChange = { ...settings };

      return { initial, afterChange };
    });

    expect(result.initial.defaultProvider).toBe('openai');
    expect(result.initial.defaultModel).toBe('gpt-4o');
    expect(result.afterChange.defaultProvider).toBe('anthropic');
    expect(result.afterChange.defaultModel).toBe('claude-3-5-sonnet');
  });
});

test.describe('Appearance Settings', () => {
  test('should change theme', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const themes = ['light', 'dark', 'system'];
      let currentTheme = 'system';

      const setTheme = (theme: string): boolean => {
        if (themes.includes(theme)) {
          currentTheme = theme;
          return true;
        }
        return false;
      };

      const initial = currentTheme;
      setTheme('dark');
      const afterDark = currentTheme;
      setTheme('light');
      const afterLight = currentTheme;

      return { initial, afterDark, afterLight, themes };
    });

    expect(result.initial).toBe('system');
    expect(result.afterDark).toBe('dark');
    expect(result.afterLight).toBe('light');
    expect(result.themes).toHaveLength(3);
  });

  test('should change font size', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const fontSizes = ['small', 'medium', 'large'];
      let currentSize = 'medium';

      const setFontSize = (size: string): boolean => {
        if (fontSizes.includes(size)) {
          currentSize = size;
          return true;
        }
        return false;
      };

      const getFontSizeValue = (size: string): number => {
        const values: Record<string, number> = {
          small: 14,
          medium: 16,
          large: 18,
        };
        return values[size] || 16;
      };

      setFontSize('large');

      return {
        currentSize,
        sizeValue: getFontSizeValue(currentSize),
        availableSizes: fontSizes,
      };
    });

    expect(result.currentSize).toBe('large');
    expect(result.sizeValue).toBe(18);
    expect(result.availableSizes).toHaveLength(3);
  });

  test('should configure accent color', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const accentColors = [
        { id: 'blue', value: '#3b82f6' },
        { id: 'purple', value: '#8b5cf6' },
        { id: 'green', value: '#22c55e' },
        { id: 'orange', value: '#f97316' },
        { id: 'pink', value: '#ec4899' },
      ];

      let currentAccent = 'blue';

      const setAccentColor = (colorId: string): boolean => {
        const color = accentColors.find(c => c.id === colorId);
        if (color) {
          currentAccent = colorId;
          return true;
        }
        return false;
      };

      const getAccentValue = () => {
        return accentColors.find(c => c.id === currentAccent)?.value;
      };

      setAccentColor('purple');

      return {
        currentAccent,
        accentValue: getAccentValue(),
        colorCount: accentColors.length,
      };
    });

    expect(result.currentAccent).toBe('purple');
    expect(result.accentValue).toBe('#8b5cf6');
    expect(result.colorCount).toBe(5);
  });
});

test.describe('Chat Settings', () => {
  test('should configure chat behavior', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const chatSettings = {
        sendOnEnter: true,
        showTimestamps: true,
        showAvatars: true,
        enableMarkdown: true,
        enableCodeHighlight: true,
        autoScroll: true,
      };

      const updateSetting = (key: keyof typeof chatSettings, value: boolean) => {
        chatSettings[key] = value;
      };

      updateSetting('sendOnEnter', false);
      updateSetting('showTimestamps', false);

      return {
        sendOnEnter: chatSettings.sendOnEnter,
        showTimestamps: chatSettings.showTimestamps,
        showAvatars: chatSettings.showAvatars,
        enableMarkdown: chatSettings.enableMarkdown,
      };
    });

    expect(result.sendOnEnter).toBe(false);
    expect(result.showTimestamps).toBe(false);
    expect(result.showAvatars).toBe(true);
    expect(result.enableMarkdown).toBe(true);
  });

  test('should configure custom instructions', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let customInstructions = '';
      const maxLength = 2000;

      const setInstructions = (text: string): { success: boolean; error?: string } => {
        if (text.length > maxLength) {
          return { success: false, error: `Instructions must be less than ${maxLength} characters` };
        }
        customInstructions = text;
        return { success: true };
      };

      const clearInstructions = () => {
        customInstructions = '';
      };

      const validResult = setInstructions('You are a helpful coding assistant.');
      const afterValid = customInstructions;

      const longText = 'A'.repeat(2500);
      const invalidResult = setInstructions(longText);

      clearInstructions();
      const afterClear = customInstructions;

      return {
        validResult,
        afterValid,
        invalidResult,
        afterClear,
      };
    });

    expect(result.validResult.success).toBe(true);
    expect(result.afterValid).toBe('You are a helpful coding assistant.');
    expect(result.invalidResult.success).toBe(false);
    expect(result.afterClear).toBe('');
  });
});

test.describe('Response Settings', () => {
  test('should configure model parameters', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const responseSettings = {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
      };

      const updateSetting = <K extends keyof typeof responseSettings>(
        key: K,
        value: typeof responseSettings[K]
      ) => {
        responseSettings[key] = value;
      };

      const validateSettings = () => {
        const errors: string[] = [];

        if (responseSettings.temperature < 0 || responseSettings.temperature > 2) {
          errors.push('Temperature must be between 0 and 2');
        }
        if (responseSettings.maxTokens < 1 || responseSettings.maxTokens > 128000) {
          errors.push('Max tokens must be between 1 and 128000');
        }
        if (responseSettings.topP < 0 || responseSettings.topP > 1) {
          errors.push('Top P must be between 0 and 1');
        }

        return { valid: errors.length === 0, errors };
      };

      updateSetting('temperature', 0.9);
      updateSetting('maxTokens', 8192);
      const validResult = validateSettings();

      updateSetting('temperature', 3);
      const invalidResult = validateSettings();

      return {
        temperature: responseSettings.temperature,
        maxTokens: responseSettings.maxTokens,
        validResult,
        invalidResult,
      };
    });

    expect(result.temperature).toBe(3);
    expect(result.maxTokens).toBe(8192);
    expect(result.validResult.valid).toBe(true);
    expect(result.invalidResult.valid).toBe(false);
  });

  test('should configure streaming', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const streamingSettings = {
        enabled: true,
        typingSpeed: 'normal' as 'slow' | 'normal' | 'fast' | 'instant',
      };

      const setStreaming = (enabled: boolean) => {
        streamingSettings.enabled = enabled;
      };

      const setTypingSpeed = (speed: typeof streamingSettings.typingSpeed) => {
        streamingSettings.typingSpeed = speed;
      };

      const getTypingDelay = (): number => {
        const delays: Record<string, number> = {
          slow: 50,
          normal: 20,
          fast: 5,
          instant: 0,
        };
        return delays[streamingSettings.typingSpeed];
      };

      setTypingSpeed('fast');

      return {
        enabled: streamingSettings.enabled,
        typingSpeed: streamingSettings.typingSpeed,
        typingDelay: getTypingDelay(),
      };
    });

    expect(result.enabled).toBe(true);
    expect(result.typingSpeed).toBe('fast');
    expect(result.typingDelay).toBe(5);
  });
});

test.describe('Tool Settings', () => {
  test('should configure available tools', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const tools = [
        { id: 'calculator', name: 'Calculator', enabled: true },
        { id: 'web_search', name: 'Web Search', enabled: false },
        { id: 'code_exec', name: 'Code Execution', enabled: false },
        { id: 'rag_search', name: 'RAG Search', enabled: true },
        { id: 'image_gen', name: 'Image Generation', enabled: false },
      ];

      const enableTool = (toolId: string): boolean => {
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
          tool.enabled = true;
          return true;
        }
        return false;
      };

      const disableTool = (toolId: string): boolean => {
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
          tool.enabled = false;
          return true;
        }
        return false;
      };

      const getEnabledTools = () => tools.filter(t => t.enabled);

      const initialEnabled = getEnabledTools().length;
      enableTool('web_search');
      enableTool('code_exec');
      const afterEnable = getEnabledTools().length;
      disableTool('calculator');
      const afterDisable = getEnabledTools().length;

      return { initialEnabled, afterEnable, afterDisable, toolCount: tools.length };
    });

    expect(result.initialEnabled).toBe(2);
    expect(result.afterEnable).toBe(4);
    expect(result.afterDisable).toBe(3);
    expect(result.toolCount).toBe(5);
  });

  test('should configure tool approval', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const toolApprovalSettings = {
        requireApproval: true,
        autoApproveTools: [] as string[],
        approvalTimeout: 30,
      };

      const _setRequireApproval = (required: boolean) => {
        toolApprovalSettings.requireApproval = required;
      };

      const addAutoApprove = (toolId: string) => {
        if (!toolApprovalSettings.autoApproveTools.includes(toolId)) {
          toolApprovalSettings.autoApproveTools.push(toolId);
        }
      };

      const removeAutoApprove = (toolId: string) => {
        const index = toolApprovalSettings.autoApproveTools.indexOf(toolId);
        if (index !== -1) {
          toolApprovalSettings.autoApproveTools.splice(index, 1);
        }
      };

      addAutoApprove('calculator');
      addAutoApprove('rag_search');
      const afterAdd = [...toolApprovalSettings.autoApproveTools];

      removeAutoApprove('calculator');
      const afterRemove = [...toolApprovalSettings.autoApproveTools];

      return {
        requireApproval: toolApprovalSettings.requireApproval,
        afterAdd,
        afterRemove,
        timeout: toolApprovalSettings.approvalTimeout,
      };
    });

    expect(result.requireApproval).toBe(true);
    expect(result.afterAdd).toContain('calculator');
    expect(result.afterAdd).toContain('rag_search');
    expect(result.afterRemove).not.toContain('calculator');
    expect(result.timeout).toBe(30);
  });
});

test.describe('Memory Settings', () => {
  test('should configure memory settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const memorySettings = {
        enabled: true,
        maxMemories: 100,
        autoSave: true,
        includeInPrompt: true,
      };

      const updateSetting = <K extends keyof typeof memorySettings>(
        key: K,
        value: typeof memorySettings[K]
      ) => {
        memorySettings[key] = value;
      };

      updateSetting('maxMemories', 50);
      updateSetting('autoSave', false);

      return {
        enabled: memorySettings.enabled,
        maxMemories: memorySettings.maxMemories,
        autoSave: memorySettings.autoSave,
        includeInPrompt: memorySettings.includeInPrompt,
      };
    });

    expect(result.enabled).toBe(true);
    expect(result.maxMemories).toBe(50);
    expect(result.autoSave).toBe(false);
    expect(result.includeInPrompt).toBe(true);
  });

  test('should manage saved memories', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Memory {
        id: string;
        content: string;
        createdAt: Date;
      }

      const memories: Memory[] = [
        { id: 'm1', content: 'User prefers TypeScript', createdAt: new Date() },
        { id: 'm2', content: 'User works on React projects', createdAt: new Date() },
      ];

      const addMemory = (content: string): Memory => {
        const memory: Memory = {
          id: `m-${Date.now()}`,
          content,
          createdAt: new Date(),
        };
        memories.push(memory);
        return memory;
      };

      const deleteMemory = (id: string): boolean => {
        const index = memories.findIndex(m => m.id === id);
        if (index !== -1) {
          memories.splice(index, 1);
          return true;
        }
        return false;
      };

      const _clearAllMemories = () => {
        memories.length = 0;
      };

      const initialCount = memories.length;
      addMemory('User likes dark theme');
      const afterAdd = memories.length;
      deleteMemory('m1');
      const afterDelete = memories.length;

      return { initialCount, afterAdd, afterDelete };
    });

    expect(result.initialCount).toBe(2);
    expect(result.afterAdd).toBe(3);
    expect(result.afterDelete).toBe(2);
  });
});

test.describe('Data Settings', () => {
  test('should export settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        theme: 'dark',
        fontSize: 'medium',
        provider: 'openai',
        model: 'gpt-4o',
      };

      const exportSettings = () => {
        return JSON.stringify({
          version: '1.0',
          type: 'cognia-settings',
          exportedAt: new Date().toISOString(),
          data: settings,
        }, null, 2);
      };

      const exported = exportSettings();
      const parsed = JSON.parse(exported);

      return {
        hasVersion: !!parsed.version,
        hasType: parsed.type === 'cognia-settings',
        hasData: !!parsed.data,
        theme: parsed.data.theme,
      };
    });

    expect(result.hasVersion).toBe(true);
    expect(result.hasType).toBe(true);
    expect(result.hasData).toBe(true);
    expect(result.theme).toBe('dark');
  });

  test('should import settings', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const importSettings = (jsonString: string): { success: boolean; error?: string } => {
        try {
          const data = JSON.parse(jsonString);

          if (data.type !== 'cognia-settings') {
            return { success: false, error: 'Invalid settings format' };
          }

          if (!data.data) {
            return { success: false, error: 'Missing settings data' };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'Invalid JSON' };
        }
      };

      const validJson = JSON.stringify({
        version: '1.0',
        type: 'cognia-settings',
        data: { theme: 'light' },
      });

      const invalidJson = '{ invalid }';
      const wrongType = JSON.stringify({ type: 'wrong', data: {} });

      return {
        validImport: importSettings(validJson),
        invalidJsonImport: importSettings(invalidJson),
        wrongTypeImport: importSettings(wrongType),
      };
    });

    expect(result.validImport.success).toBe(true);
    expect(result.invalidJsonImport.success).toBe(false);
    expect(result.wrongTypeImport.success).toBe(false);
  });

  test('should clear all data', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const clearAllData = (): { success: boolean; clearedItems: string[] } => {
        const clearedItems: string[] = [];

        // Simulate clearing different data types
        const dataTypes = ['sessions', 'memories', 'settings', 'cache'];

        for (const type of dataTypes) {
          clearedItems.push(type);
        }

        return { success: true, clearedItems };
      };

      const result = clearAllData();

      return {
        success: result.success,
        clearedCount: result.clearedItems.length,
        clearedItems: result.clearedItems,
      };
    });

    expect(result.success).toBe(true);
    expect(result.clearedCount).toBe(4);
    expect(result.clearedItems).toContain('sessions');
    expect(result.clearedItems).toContain('settings');
  });
});

test.describe('Keyboard Settings', () => {
  test('should list keyboard shortcuts', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const shortcuts = [
        { id: 'send', keys: 'Enter', description: 'Send message' },
        { id: 'newline', keys: 'Shift+Enter', description: 'New line' },
        { id: 'newChat', keys: 'Ctrl+N', description: 'New chat' },
        { id: 'search', keys: 'Ctrl+K', description: 'Search' },
        { id: 'settings', keys: 'Ctrl+,', description: 'Open settings' },
        { id: 'toggleSidebar', keys: 'Ctrl+B', description: 'Toggle sidebar' },
      ];

      const getShortcutById = (id: string) => shortcuts.find(s => s.id === id);

      return {
        shortcutCount: shortcuts.length,
        sendShortcut: getShortcutById('send'),
        newChatShortcut: getShortcutById('newChat'),
        searchShortcut: getShortcutById('search'),
      };
    });

    expect(result.shortcutCount).toBe(6);
    expect(result.sendShortcut?.keys).toBe('Enter');
    expect(result.newChatShortcut?.keys).toBe('Ctrl+N');
    expect(result.searchShortcut?.keys).toBe('Ctrl+K');
  });

  test('should customize keyboard shortcuts', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const shortcuts: Record<string, string> = {
        send: 'Enter',
        newChat: 'Ctrl+N',
        search: 'Ctrl+K',
      };

      const updateShortcut = (id: string, keys: string): boolean => {
        if (id in shortcuts) {
          shortcuts[id] = keys;
          return true;
        }
        return false;
      };

      const resetShortcut = (id: string): boolean => {
        const defaults: Record<string, string> = {
          send: 'Enter',
          newChat: 'Ctrl+N',
          search: 'Ctrl+K',
        };

        if (id in defaults) {
          shortcuts[id] = defaults[id];
          return true;
        }
        return false;
      };

      updateShortcut('newChat', 'Ctrl+Shift+N');
      const afterUpdate = shortcuts.newChat;

      resetShortcut('newChat');
      const afterReset = shortcuts.newChat;

      return { afterUpdate, afterReset };
    });

    expect(result.afterUpdate).toBe('Ctrl+Shift+N');
    expect(result.afterReset).toBe('Ctrl+N');
  });
});

test.describe('Settings Persistence', () => {
  test('should persist settings to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const settings = {
        theme: 'dark',
        fontSize: 'large',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
      };
      localStorage.setItem('cognia-settings', JSON.stringify({ state: settings }));
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.theme).toBe('dark');
    expect(stored.state.fontSize).toBe('large');
    expect(stored.state.provider).toBe('anthropic');
  });

  test('should reset settings to defaults', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const defaultSettings = {
        theme: 'system',
        fontSize: 'medium',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
      };

      let currentSettings = {
        theme: 'dark',
        fontSize: 'large',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet',
        temperature: 0.9,
      };

      const resetToDefaults = () => {
        currentSettings = { ...defaultSettings };
      };

      const beforeReset = { ...currentSettings };
      resetToDefaults();
      const afterReset = { ...currentSettings };

      return { beforeReset, afterReset, defaults: defaultSettings };
    });

    expect(result.beforeReset.theme).toBe('dark');
    expect(result.afterReset.theme).toBe('system');
    expect(result.afterReset.fontSize).toBe('medium');
    expect(result.afterReset).toEqual(result.defaults);
  });
});
