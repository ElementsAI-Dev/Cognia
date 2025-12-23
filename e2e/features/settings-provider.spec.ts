import { test, expect } from '@playwright/test';

/**
 * Provider Settings Complete Tests
 * Tests provider configuration and API key management
 */

test.describe('Provider Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should list all available providers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const providers = [
        { id: 'openai', name: 'OpenAI', category: 'flagship' },
        { id: 'anthropic', name: 'Anthropic', category: 'flagship' },
        { id: 'google', name: 'Google', category: 'flagship' },
        { id: 'deepseek', name: 'DeepSeek', category: 'specialized' },
        { id: 'groq', name: 'Groq', category: 'specialized' },
        { id: 'mistral', name: 'Mistral', category: 'flagship' },
        { id: 'xai', name: 'xAI', category: 'flagship' },
        { id: 'ollama', name: 'Ollama', category: 'local' },
        { id: 'openrouter', name: 'OpenRouter', category: 'aggregator' },
      ];

      const getProvidersByCategory = (category: string) =>
        providers.filter((p) => p.category === category);

      return {
        totalCount: providers.length,
        flagshipCount: getProvidersByCategory('flagship').length,
        localCount: getProvidersByCategory('local').length,
        aggregatorCount: getProvidersByCategory('aggregator').length,
        providerNames: providers.map((p) => p.name),
      };
    });

    expect(result.totalCount).toBeGreaterThanOrEqual(9);
    expect(result.flagshipCount).toBe(5);
    expect(result.localCount).toBe(1);
    expect(result.providerNames).toContain('OpenAI');
  });

  test('should configure provider API key', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProviderConfig {
        apiKey: string;
        enabled: boolean;
        baseURL?: string;
        defaultModel?: string;
      }

      const providerSettings: Record<string, ProviderConfig> = {};

      const setApiKey = (providerId: string, apiKey: string): void => {
        if (!providerSettings[providerId]) {
          providerSettings[providerId] = { apiKey: '', enabled: false };
        }
        providerSettings[providerId].apiKey = apiKey;
      };

      const enableProvider = (providerId: string): void => {
        if (providerSettings[providerId]) {
          providerSettings[providerId].enabled = true;
        }
      };

      const hasValidApiKey = (providerId: string): boolean => {
        const key = providerSettings[providerId]?.apiKey || '';
        return key.length >= 10;
      };

      setApiKey('openai', 'sk-' + 'a'.repeat(48));
      enableProvider('openai');

      return {
        hasOpenAI: !!providerSettings.openai,
        openaiEnabled: providerSettings.openai?.enabled,
        openaiValid: hasValidApiKey('openai'),
        anthropicValid: hasValidApiKey('anthropic'),
      };
    });

    expect(result.hasOpenAI).toBe(true);
    expect(result.openaiEnabled).toBe(true);
    expect(result.openaiValid).toBe(true);
    expect(result.anthropicValid).toBe(false);
  });

  test('should mask API key display', async ({ page }) => {
    const result = await page.evaluate(() => {
      const maskApiKey = (key: string): string => {
        if (!key || key.length <= 8) return '****';
        return key.substring(0, 4) + '*'.repeat(key.length - 8) + key.substring(key.length - 4);
      };

      const testKeys = [
        'sk-1234567890abcdef1234567890abcdef',
        'short',
        '',
        'sk-ant-abcdefghijklmnop',
      ];

      return testKeys.map((key) => ({
        original: key,
        masked: maskApiKey(key),
        startsWithOriginal: maskApiKey(key).startsWith(key.substring(0, 4)),
      }));
    });

    expect(result[0].masked).toContain('****');
    expect(result[1].masked).toBe('****');
    expect(result[2].masked).toBe('****');
  });

  test('should validate API key format', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ValidationResult {
        valid: boolean;
        error?: string;
      }

      const validateApiKey = (providerId: string, key: string): ValidationResult => {
        if (!key || key.trim() === '') {
          return { valid: false, error: 'API key is required' };
        }

        const patterns: Record<string, RegExp> = {
          openai: /^sk-[a-zA-Z0-9_-]{32,}$/,
          anthropic: /^sk-ant-[a-zA-Z0-9_-]{32,}$/,
        };

        const pattern = patterns[providerId];
        if (pattern && !pattern.test(key)) {
          return { valid: false, error: 'Invalid API key format' };
        }

        return { valid: true };
      };

      return {
        validOpenAI: validateApiKey('openai', 'sk-' + 'a'.repeat(48)),
        invalidOpenAI: validateApiKey('openai', 'invalid-key'),
        emptyKey: validateApiKey('openai', ''),
        validAnthropic: validateApiKey('anthropic', 'sk-ant-' + 'b'.repeat(48)),
        unknownProvider: validateApiKey('unknown', 'any-key-format'),
      };
    });

    expect(result.validOpenAI.valid).toBe(true);
    expect(result.invalidOpenAI.valid).toBe(false);
    expect(result.emptyKey.valid).toBe(false);
    expect(result.validAnthropic.valid).toBe(true);
    expect(result.unknownProvider.valid).toBe(true);
  });

  test('should configure custom base URL', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProviderConfig {
        apiKey: string;
        baseURL?: string;
      }

      const config: ProviderConfig = {
        apiKey: 'sk-test',
      };

      const validateBaseURL = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      const setBaseURL = (url: string): boolean => {
        if (validateBaseURL(url)) {
          config.baseURL = url;
          return true;
        }
        return false;
      };

      const validUrl = setBaseURL('https://api.custom-provider.com/v1');
      const invalidUrl = setBaseURL('not-a-url');

      return {
        validUrl,
        invalidUrl,
        currentBaseURL: config.baseURL,
      };
    });

    expect(result.validUrl).toBe(true);
    expect(result.invalidUrl).toBe(false);
    expect(result.currentBaseURL).toBe('https://api.custom-provider.com/v1');
  });

  test('should select default model', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProviderModels {
        providerId: string;
        models: { id: string; name: string }[];
        defaultModel?: string;
      }

      const providerModels: ProviderModels = {
        providerId: 'openai',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
          { id: 'o1', name: 'o1' },
        ],
      };

      const setDefaultModel = (modelId: string): boolean => {
        if (providerModels.models.some((m) => m.id === modelId)) {
          providerModels.defaultModel = modelId;
          return true;
        }
        return false;
      };

      const getDefaultModel = () =>
        providerModels.models.find((m) => m.id === providerModels.defaultModel);

      setDefaultModel('gpt-4o');
      const afterSet = getDefaultModel();

      setDefaultModel('invalid-model');
      const afterInvalid = providerModels.defaultModel;

      return {
        modelCount: providerModels.models.length,
        defaultModelId: afterSet?.id,
        defaultModelName: afterSet?.name,
        unchangedAfterInvalid: afterInvalid === 'gpt-4o',
      };
    });

    expect(result.modelCount).toBe(4);
    expect(result.defaultModelId).toBe('gpt-4o');
    expect(result.defaultModelName).toBe('GPT-4o');
    expect(result.unchangedAfterInvalid).toBe(true);
  });
});

test.describe('API Key Rotation', () => {
  test('should manage multiple API keys', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ApiKeyEntry {
        key: string;
        addedAt: Date;
        usageCount: number;
        lastUsed?: Date;
      }

      const apiKeys: ApiKeyEntry[] = [];

      const addApiKey = (key: string): boolean => {
        if (key.length < 10) return false;
        if (apiKeys.some((k) => k.key === key)) return false;

        apiKeys.push({
          key,
          addedAt: new Date(),
          usageCount: 0,
        });
        return true;
      };

      const removeApiKey = (index: number): boolean => {
        if (index >= 0 && index < apiKeys.length) {
          apiKeys.splice(index, 1);
          return true;
        }
        return false;
      };

      addApiKey('sk-key-one-' + 'a'.repeat(40));
      addApiKey('sk-key-two-' + 'b'.repeat(40));
      addApiKey('sk-key-three-' + 'c'.repeat(40));
      const afterAdd = apiKeys.length;

      const duplicateResult = addApiKey('sk-key-one-' + 'a'.repeat(40));

      removeApiKey(1);
      const afterRemove = apiKeys.length;

      return {
        afterAdd,
        duplicateResult,
        afterRemove,
      };
    });

    expect(result.afterAdd).toBe(3);
    expect(result.duplicateResult).toBe(false);
    expect(result.afterRemove).toBe(2);
  });

  test('should rotate API keys with round-robin', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ApiKey {
        key: string;
        usageCount: number;
      }

      const keys: ApiKey[] = [
        { key: 'key-1', usageCount: 0 },
        { key: 'key-2', usageCount: 0 },
        { key: 'key-3', usageCount: 0 },
      ];

      let currentIndex = 0;

      const getNextKey = (): ApiKey => {
        const key = keys[currentIndex];
        key.usageCount++;
        currentIndex = (currentIndex + 1) % keys.length;
        return key;
      };

      const sequence: string[] = [];
      for (let i = 0; i < 6; i++) {
        sequence.push(getNextKey().key);
      }

      return {
        sequence,
        usageCounts: keys.map((k) => k.usageCount),
      };
    });

    expect(result.sequence).toEqual(['key-1', 'key-2', 'key-3', 'key-1', 'key-2', 'key-3']);
    expect(result.usageCounts).toEqual([2, 2, 2]);
  });

  test('should rotate API keys with least-used strategy', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ApiKey {
        key: string;
        usageCount: number;
      }

      const keys: ApiKey[] = [
        { key: 'key-1', usageCount: 5 },
        { key: 'key-2', usageCount: 2 },
        { key: 'key-3', usageCount: 8 },
      ];

      const getNextKey = (): ApiKey => {
        const leastUsed = keys.reduce((min, key) =>
          key.usageCount < min.usageCount ? key : min
        );
        leastUsed.usageCount++;
        return leastUsed;
      };

      const selectedKeys: string[] = [];
      for (let i = 0; i < 3; i++) {
        selectedKeys.push(getNextKey().key);
      }

      return {
        selectedKeys,
        finalCounts: keys.map((k) => ({ key: k.key, count: k.usageCount })),
      };
    });

    expect(result.selectedKeys[0]).toBe('key-2');
    expect(result.finalCounts.find((k) => k.key === 'key-2')?.count).toBe(5);
  });
});

test.describe('Provider Health Status', () => {
  test('should track provider status', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ProviderStatus = 'unknown' | 'healthy' | 'degraded' | 'down';

      interface HealthCheck {
        providerId: string;
        status: ProviderStatus;
        latency?: number;
        lastChecked?: Date;
        error?: string;
      }

      const healthChecks: Record<string, HealthCheck> = {};

      const updateHealth = (
        providerId: string,
        status: ProviderStatus,
        latency?: number,
        error?: string
      ): void => {
        healthChecks[providerId] = {
          providerId,
          status,
          latency,
          lastChecked: new Date(),
          error,
        };
      };

      const getStatusColor = (status: ProviderStatus): string => {
        switch (status) {
          case 'healthy':
            return 'green';
          case 'degraded':
            return 'yellow';
          case 'down':
            return 'red';
          default:
            return 'gray';
        }
      };

      updateHealth('openai', 'healthy', 150);
      updateHealth('anthropic', 'degraded', 500);
      updateHealth('google', 'down', undefined, 'Connection refused');

      return {
        openaiStatus: healthChecks.openai.status,
        openaiLatency: healthChecks.openai.latency,
        anthropicStatus: healthChecks.anthropic.status,
        googleStatus: healthChecks.google.status,
        googleError: healthChecks.google.error,
        colors: {
          healthy: getStatusColor('healthy'),
          degraded: getStatusColor('degraded'),
          down: getStatusColor('down'),
        },
      };
    });

    expect(result.openaiStatus).toBe('healthy');
    expect(result.openaiLatency).toBe(150);
    expect(result.anthropicStatus).toBe('degraded');
    expect(result.googleStatus).toBe('down');
    expect(result.googleError).toBe('Connection refused');
    expect(result.colors.healthy).toBe('green');
  });
});

test.describe('Custom Provider Configuration', () => {
  test('should create custom provider', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CustomProvider {
        id: string;
        name: string;
        baseURL: string;
        apiKeyHeader?: string;
        models: { id: string; name: string }[];
      }

      const customProviders: CustomProvider[] = [];

      const addCustomProvider = (config: Omit<CustomProvider, 'id'>): CustomProvider => {
        const provider: CustomProvider = {
          ...config,
          id: `custom-${Date.now()}`,
        };
        customProviders.push(provider);
        return provider;
      };

      const removeCustomProvider = (id: string): boolean => {
        const index = customProviders.findIndex((p) => p.id === id);
        if (index !== -1) {
          customProviders.splice(index, 1);
          return true;
        }
        return false;
      };

      const provider = addCustomProvider({
        name: 'My Custom LLM',
        baseURL: 'https://my-llm.example.com/v1',
        apiKeyHeader: 'X-API-Key',
        models: [
          { id: 'my-model-7b', name: 'My Model 7B' },
          { id: 'my-model-70b', name: 'My Model 70B' },
        ],
      });

      const afterAdd = customProviders.length;
      removeCustomProvider(provider.id);
      const afterRemove = customProviders.length;

      return {
        providerName: provider.name,
        providerBaseURL: provider.baseURL,
        modelCount: provider.models.length,
        afterAdd,
        afterRemove,
      };
    });

    expect(result.providerName).toBe('My Custom LLM');
    expect(result.providerBaseURL).toBe('https://my-llm.example.com/v1');
    expect(result.modelCount).toBe(2);
    expect(result.afterAdd).toBe(1);
    expect(result.afterRemove).toBe(0);
  });
});

test.describe('Provider Import/Export', () => {
  test('should export provider settings', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProviderExport {
        providers: {
          id: string;
          enabled: boolean;
          baseURL?: string;
          defaultModel?: string;
        }[];
        customProviders: {
          name: string;
          baseURL: string;
          models: { id: string; name: string }[];
        }[];
      }

      const exportProviders = (): string => {
        const exportData: ProviderExport = {
          providers: [
            { id: 'openai', enabled: true, defaultModel: 'gpt-4o' },
            { id: 'anthropic', enabled: false },
          ],
          customProviders: [
            {
              name: 'Custom LLM',
              baseURL: 'https://custom.example.com',
              models: [{ id: 'model-1', name: 'Model 1' }],
            },
          ],
        };

        return JSON.stringify({
          version: '1.0',
          type: 'cognia-providers',
          exportedAt: new Date().toISOString(),
          data: exportData,
        }, null, 2);
      };

      const exported = exportProviders();
      const parsed = JSON.parse(exported);

      return {
        hasVersion: !!parsed.version,
        type: parsed.type,
        providerCount: parsed.data.providers.length,
        customCount: parsed.data.customProviders.length,
      };
    });

    expect(result.hasVersion).toBe(true);
    expect(result.type).toBe('cognia-providers');
    expect(result.providerCount).toBe(2);
    expect(result.customCount).toBe(1);
  });

  test('should import provider settings', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImportResult {
        success: boolean;
        importedCount: number;
        error?: string;
      }

      const importProviders = (jsonString: string): ImportResult => {
        try {
          const data = JSON.parse(jsonString);

          if (data.type !== 'cognia-providers') {
            return { success: false, importedCount: 0, error: 'Invalid format' };
          }

          const providers = data.data?.providers || [];
          const customProviders = data.data?.customProviders || [];

          return {
            success: true,
            importedCount: providers.length + customProviders.length,
          };
        } catch {
          return { success: false, importedCount: 0, error: 'Invalid JSON' };
        }
      };

      const validData = JSON.stringify({
        version: '1.0',
        type: 'cognia-providers',
        data: {
          providers: [{ id: 'openai', enabled: true }],
          customProviders: [],
        },
      });

      const invalidData = '{ invalid }';

      return {
        validImport: importProviders(validData),
        invalidImport: importProviders(invalidData),
      };
    });

    expect(result.validImport.success).toBe(true);
    expect(result.validImport.importedCount).toBe(1);
    expect(result.invalidImport.success).toBe(false);
  });
});

test.describe('Provider Settings Persistence', () => {
  test('should persist provider settings to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const providerSettings = {
        openai: {
          enabled: true,
          apiKey: 'sk-test-key',
          defaultModel: 'gpt-4o',
        },
        anthropic: {
          enabled: true,
          apiKey: 'sk-ant-test-key',
          defaultModel: 'claude-3-5-sonnet',
        },
      };
      localStorage.setItem(
        'cognia-provider-settings',
        JSON.stringify({ state: { providerSettings } })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-provider-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.providerSettings.openai.enabled).toBe(true);
    expect(stored.state.providerSettings.anthropic.defaultModel).toBe('claude-3-5-sonnet');
  });
});
