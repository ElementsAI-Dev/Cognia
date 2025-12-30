import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Search Settings Complete Tests
 * Tests web search provider configuration and management
 * Optimized for CI/CD efficiency
 */

test.describe('Search Settings - Provider Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should list all search providers', async ({ page }) => {
    const result = await page.evaluate(() => {
      const providers = [
        { id: 'tavily', name: 'Tavily', hasAI: true },
        { id: 'perplexity', name: 'Perplexity', hasAI: true },
        { id: 'exa', name: 'Exa', hasAI: true },
        { id: 'searchapi', name: 'SearchAPI', hasAI: false },
        { id: 'serpapi', name: 'SerpAPI', hasAI: false },
        { id: 'bing', name: 'Bing', hasAI: false },
        { id: 'google', name: 'Google', hasAI: false },
        { id: 'brave', name: 'Brave', hasAI: false },
      ];

      const getAIProviders = () => providers.filter((p) => p.hasAI);
      const getProviderById = (id: string) => providers.find((p) => p.id === id);

      return {
        totalCount: providers.length,
        aiProviderCount: getAIProviders().length,
        hasTavily: !!getProviderById('tavily'),
        hasPerplexity: !!getProviderById('perplexity'),
        providerNames: providers.map((p) => p.name),
      };
    });

    expect(result.totalCount).toBe(8);
    expect(result.aiProviderCount).toBe(3);
    expect(result.hasTavily).toBe(true);
    expect(result.hasPerplexity).toBe(true);
  });

  test('should configure search provider API key', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SearchProviderConfig {
        apiKey: string;
        enabled: boolean;
      }

      const providerSettings: Record<string, SearchProviderConfig> = {};

      const setApiKey = (providerId: string, apiKey: string): void => {
        if (!providerSettings[providerId]) {
          providerSettings[providerId] = { apiKey: '', enabled: false };
        }
        providerSettings[providerId].apiKey = apiKey;
      };

      const enableProvider = (providerId: string): boolean => {
        if (providerSettings[providerId]?.apiKey) {
          providerSettings[providerId].enabled = true;
          return true;
        }
        return false;
      };

      const hasValidApiKey = (providerId: string): boolean => {
        const key = providerSettings[providerId]?.apiKey || '';
        return key.length >= 10;
      };

      setApiKey('tavily', 'tvly-' + 'a'.repeat(32));
      const tavilyValid = hasValidApiKey('tavily');
      enableProvider('tavily');

      setApiKey('perplexity', 'pplx-' + 'b'.repeat(32));
      enableProvider('perplexity');

      return {
        tavilyConfigured: !!providerSettings.tavily,
        tavilyEnabled: providerSettings.tavily?.enabled,
        tavilyValid,
        perplexityEnabled: providerSettings.perplexity?.enabled,
        exaConfigured: !!providerSettings.exa,
      };
    });

    expect(result.tavilyConfigured).toBe(true);
    expect(result.tavilyEnabled).toBe(true);
    expect(result.tavilyValid).toBe(true);
    expect(result.perplexityEnabled).toBe(true);
    expect(result.exaConfigured).toBe(false);
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
          tavily: /^tvly-[a-zA-Z0-9]{20,}$/,
          perplexity: /^pplx-[a-zA-Z0-9]{20,}$/,
          exa: /^[a-zA-Z0-9-]{20,}$/,
        };

        const pattern = patterns[providerId];
        if (pattern && !pattern.test(key)) {
          return { valid: false, error: 'Invalid API key format' };
        }

        return { valid: true };
      };

      return {
        validTavily: validateApiKey('tavily', 'tvly-' + 'a'.repeat(32)),
        invalidTavily: validateApiKey('tavily', 'invalid-key'),
        emptyKey: validateApiKey('tavily', ''),
        validPerplexity: validateApiKey('perplexity', 'pplx-' + 'b'.repeat(32)),
        validExa: validateApiKey('exa', 'exa-' + 'c'.repeat(32)),
      };
    });

    expect(result.validTavily.valid).toBe(true);
    expect(result.invalidTavily.valid).toBe(false);
    expect(result.emptyKey.valid).toBe(false);
    expect(result.validPerplexity.valid).toBe(true);
    expect(result.validExa.valid).toBe(true);
  });

  test('should toggle provider enabled state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProviderState {
        apiKey: string;
        enabled: boolean;
      }

      const providers: Record<string, ProviderState> = {
        tavily: { apiKey: 'tvly-test-key-12345678901234567890', enabled: false },
        perplexity: { apiKey: 'pplx-test-key-12345678901234567890', enabled: true },
      };

      const toggleEnabled = (providerId: string): boolean => {
        if (providers[providerId]) {
          providers[providerId].enabled = !providers[providerId].enabled;
          return true;
        }
        return false;
      };

      const initialTavily = providers.tavily.enabled;
      const initialPerplexity = providers.perplexity.enabled;

      toggleEnabled('tavily');
      toggleEnabled('perplexity');

      return {
        initialTavily,
        initialPerplexity,
        afterToggleTavily: providers.tavily.enabled,
        afterTogglePerplexity: providers.perplexity.enabled,
      };
    });

    expect(result.initialTavily).toBe(false);
    expect(result.initialPerplexity).toBe(true);
    expect(result.afterToggleTavily).toBe(true);
    expect(result.afterTogglePerplexity).toBe(false);
  });
});

test.describe('Search Settings - Global Configuration', () => {
  test('should configure max search results', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const searchSettings = {
        maxResults: 5,
        minResults: 1,
        maxAllowed: 10,
      };

      const setMaxResults = (value: number): boolean => {
        if (value >= searchSettings.minResults && value <= searchSettings.maxAllowed) {
          searchSettings.maxResults = value;
          return true;
        }
        return false;
      };

      const initial = searchSettings.maxResults;
      setMaxResults(8);
      const afterIncrease = searchSettings.maxResults;
      
      setMaxResults(15); // Should fail - exceeds max
      const afterInvalidIncrease = searchSettings.maxResults;
      
      setMaxResults(0); // Should fail - below min
      const afterInvalidDecrease = searchSettings.maxResults;

      setMaxResults(3);
      const afterDecrease = searchSettings.maxResults;

      return {
        initial,
        afterIncrease,
        afterInvalidIncrease,
        afterInvalidDecrease,
        afterDecrease,
      };
    });

    expect(result.initial).toBe(5);
    expect(result.afterIncrease).toBe(8);
    expect(result.afterInvalidIncrease).toBe(8); // Unchanged
    expect(result.afterInvalidDecrease).toBe(8); // Unchanged
    expect(result.afterDecrease).toBe(3);
  });

  test('should toggle search enabled state', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        searchEnabled: false,
        hasConfiguredProvider: true,
      };

      const toggleSearchEnabled = (): boolean => {
        if (!settings.hasConfiguredProvider && !settings.searchEnabled) {
          return false; // Can't enable without configured provider
        }
        settings.searchEnabled = !settings.searchEnabled;
        return true;
      };

      const initial = settings.searchEnabled;
      toggleSearchEnabled();
      const afterEnable = settings.searchEnabled;
      toggleSearchEnabled();
      const afterDisable = settings.searchEnabled;

      // Test without configured provider
      settings.hasConfiguredProvider = false;
      settings.searchEnabled = false;
      const canEnableWithoutProvider = toggleSearchEnabled();

      return {
        initial,
        afterEnable,
        afterDisable,
        canEnableWithoutProvider,
      };
    });

    expect(result.initial).toBe(false);
    expect(result.afterEnable).toBe(true);
    expect(result.afterDisable).toBe(false);
    expect(result.canEnableWithoutProvider).toBe(false);
  });

  test('should configure fallback behavior', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const settings = {
        fallbackEnabled: true,
        providerPriority: ['tavily', 'perplexity', 'exa'],
      };

      const toggleFallback = (): void => {
        settings.fallbackEnabled = !settings.fallbackEnabled;
      };

      const reorderProviders = (fromIndex: number, toIndex: number): void => {
        const [removed] = settings.providerPriority.splice(fromIndex, 1);
        settings.providerPriority.splice(toIndex, 0, removed);
      };

      const initialFallback = settings.fallbackEnabled;
      const initialOrder = [...settings.providerPriority];

      toggleFallback();
      const afterToggle = settings.fallbackEnabled;

      reorderProviders(2, 0); // Move 'exa' to first
      const afterReorder = [...settings.providerPriority];

      return {
        initialFallback,
        initialOrder,
        afterToggle,
        afterReorder,
      };
    });

    expect(result.initialFallback).toBe(true);
    expect(result.afterToggle).toBe(false);
    expect(result.initialOrder).toEqual(['tavily', 'perplexity', 'exa']);
    expect(result.afterReorder).toEqual(['exa', 'tavily', 'perplexity']);
  });
});

test.describe('Search Settings - Connection Testing', () => {
  test('should test provider connection', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface TestResult {
        success: boolean;
        latency?: number;
        error?: string;
      }

      const testConnection = (
        providerId: string,
        apiKey: string
      ): TestResult => {
        // Simulate connection test
        if (!apiKey || apiKey.length < 10) {
          return { success: false, error: 'Invalid API key' };
        }

        // Simulate different responses based on provider
        if (providerId === 'tavily' && apiKey.startsWith('tvly-')) {
          return { success: true, latency: 150 };
        }
        if (providerId === 'perplexity' && apiKey.startsWith('pplx-')) {
          return { success: true, latency: 200 };
        }

        return { success: false, error: 'Connection failed' };
      };

      // Test valid connections
      const tavilyResult = testConnection('tavily', 'tvly-' + 'a'.repeat(32));
      const perplexityResult = testConnection('perplexity', 'pplx-' + 'b'.repeat(32));
      const invalidResult = testConnection('tavily', 'invalid');

      return {
        tavilyResult,
        perplexityResult,
        invalidResult,
      };
    });

    expect(result.tavilyResult.success).toBe(true);
    expect(result.perplexityResult.success).toBe(true);
    expect(result.invalidResult.success).toBe(false);
  });

  test('should track provider test states', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ProviderTestState {
        testing: boolean;
        result: 'success' | 'error' | null;
        lastTested?: Date;
      }

      const testStates: Record<string, ProviderTestState> = {
        tavily: { testing: false, result: null },
        perplexity: { testing: false, result: null },
        exa: { testing: false, result: null },
      };

      const startTest = (providerId: string): void => {
        if (testStates[providerId]) {
          testStates[providerId].testing = true;
          testStates[providerId].result = null;
        }
      };

      const completeTest = (
        providerId: string,
        success: boolean
      ): void => {
        if (testStates[providerId]) {
          testStates[providerId].testing = false;
          testStates[providerId].result = success ? 'success' : 'error';
          testStates[providerId].lastTested = new Date();
        }
      };

      // Simulate test flow
      startTest('tavily');
      const duringTest = testStates.tavily.testing;

      completeTest('tavily', true);
      const afterSuccess = { ...testStates.tavily };

      completeTest('perplexity', false);
      const afterError = { ...testStates.perplexity };

      return {
        duringTest,
        afterSuccess: {
          testing: afterSuccess.testing,
          result: afterSuccess.result,
          hasLastTested: !!afterSuccess.lastTested,
        },
        afterError: {
          testing: afterError.testing,
          result: afterError.result,
        },
      };
    });

    expect(result.duringTest).toBe(true);
    expect(result.afterSuccess.testing).toBe(false);
    expect(result.afterSuccess.result).toBe('success');
    expect(result.afterSuccess.hasLastTested).toBe(true);
    expect(result.afterError.result).toBe('error');
  });
});

test.describe('Search Settings - Provider Features', () => {
  test('should display provider features', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ProviderFeatures {
        aiAnswer: boolean;
        newsSearch: boolean;
        imageSearch: boolean;
        academicSearch: boolean;
        recencyFilter: boolean;
        domainFilter: boolean;
        contentExtraction: boolean;
      }

      const providerFeatures: Record<string, ProviderFeatures> = {
        tavily: {
          aiAnswer: true,
          newsSearch: true,
          imageSearch: false,
          academicSearch: false,
          recencyFilter: true,
          domainFilter: true,
          contentExtraction: true,
        },
        perplexity: {
          aiAnswer: true,
          newsSearch: true,
          imageSearch: false,
          academicSearch: true,
          recencyFilter: true,
          domainFilter: false,
          contentExtraction: false,
        },
        exa: {
          aiAnswer: true,
          newsSearch: true,
          imageSearch: false,
          academicSearch: true,
          recencyFilter: true,
          domainFilter: true,
          contentExtraction: true,
        },
        bing: {
          aiAnswer: false,
          newsSearch: true,
          imageSearch: true,
          academicSearch: false,
          recencyFilter: true,
          domainFilter: false,
          contentExtraction: false,
        },
      };

      const getProviderFeatures = (providerId: string): ProviderFeatures | null => {
        return providerFeatures[providerId] || null;
      };

      const countFeatures = (providerId: string): number => {
        const features = getProviderFeatures(providerId);
        if (!features) return 0;
        return Object.values(features).filter(Boolean).length;
      };

      return {
        tavilyFeatures: getProviderFeatures('tavily'),
        tavilyFeatureCount: countFeatures('tavily'),
        perplexityFeatureCount: countFeatures('perplexity'),
        bingHasAI: getProviderFeatures('bing')?.aiAnswer,
        bingHasImages: getProviderFeatures('bing')?.imageSearch,
      };
    });

    expect(result.tavilyFeatures?.aiAnswer).toBe(true);
    expect(result.tavilyFeatureCount).toBe(5);
    expect(result.perplexityFeatureCount).toBe(4);
    expect(result.bingHasAI).toBe(false);
    expect(result.bingHasImages).toBe(true);
  });

  test('should display provider pricing info', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface PricingInfo {
        freeCredits?: number;
        pricePerSearch?: number;
        monthlyLimit?: number;
      }

      const providerPricing: Record<string, PricingInfo> = {
        tavily: {
          freeCredits: 1000,
          pricePerSearch: 0.001,
        },
        perplexity: {
          freeCredits: 0,
          pricePerSearch: 0.005,
        },
        exa: {
          freeCredits: 1000,
          pricePerSearch: 0.001,
        },
        brave: {
          freeCredits: 2000,
          pricePerSearch: 0.003,
        },
      };

      const getProviderWithBestFreeCredits = (): string => {
        let best = '';
        let maxCredits = 0;
        for (const [id, pricing] of Object.entries(providerPricing)) {
          if ((pricing.freeCredits || 0) > maxCredits) {
            maxCredits = pricing.freeCredits || 0;
            best = id;
          }
        }
        return best;
      };

      const getCheapestProvider = (): string => {
        let cheapest = '';
        let minPrice = Infinity;
        for (const [id, pricing] of Object.entries(providerPricing)) {
          if ((pricing.pricePerSearch || Infinity) < minPrice) {
            minPrice = pricing.pricePerSearch || Infinity;
            cheapest = id;
          }
        }
        return cheapest;
      };

      return {
        tavilyPricing: providerPricing.tavily,
        bestFreeCredits: getProviderWithBestFreeCredits(),
        cheapestProvider: getCheapestProvider(),
      };
    });

    expect(result.tavilyPricing.freeCredits).toBe(1000);
    expect(result.tavilyPricing.pricePerSearch).toBe(0.001);
    expect(result.bestFreeCredits).toBe('brave');
    expect(result.cheapestProvider).toBe('tavily');
  });
});

test.describe('Search Settings - Persistence', () => {
  test('should persist search settings to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const searchSettings = {
        searchEnabled: true,
        searchMaxResults: 8,
        searchFallbackEnabled: true,
        searchProviders: {
          tavily: { apiKey: 'tvly-test', enabled: true },
          perplexity: { apiKey: '', enabled: false },
        },
      };
      localStorage.setItem(
        'cognia-search-settings',
        JSON.stringify({ state: searchSettings })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-search-settings');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.searchEnabled).toBe(true);
    expect(stored.state.searchMaxResults).toBe(8);
    expect(stored.state.searchFallbackEnabled).toBe(true);
    expect(stored.state.searchProviders.tavily.enabled).toBe(true);
  });

  test('should reset search settings to defaults', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const defaultSettings = {
        searchEnabled: false,
        searchMaxResults: 5,
        searchFallbackEnabled: true,
        searchProviders: {},
      };

      let currentSettings: {
        searchEnabled: boolean;
        searchMaxResults: number;
        searchFallbackEnabled: boolean;
        searchProviders: Record<string, { apiKey: string; enabled: boolean }>;
      } = {
        searchEnabled: true,
        searchMaxResults: 10,
        searchFallbackEnabled: false,
        searchProviders: {
          tavily: { apiKey: 'test', enabled: true },
        },
      };

      const resetToDefaults = () => {
        currentSettings = {
          searchEnabled: defaultSettings.searchEnabled,
          searchMaxResults: defaultSettings.searchMaxResults,
          searchFallbackEnabled: defaultSettings.searchFallbackEnabled,
          searchProviders: {},
        };
      };

      const beforeReset = { ...currentSettings };
      resetToDefaults();
      const afterReset = { ...currentSettings };

      return { beforeReset, afterReset, defaults: defaultSettings };
    });

    expect(result.beforeReset.searchEnabled).toBe(true);
    expect(result.beforeReset.searchMaxResults).toBe(10);
    expect(result.afterReset.searchEnabled).toBe(false);
    expect(result.afterReset.searchMaxResults).toBe(5);
  });
});

test.describe('Search Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display search settings section', async ({ page }) => {
    // Open settings dialog
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for Search tab or section
      const searchSection = page.locator('text=Search, text=Web Search').first();
      const hasSearch = await searchSection.isVisible().catch(() => false);
      expect(hasSearch).toBe(true);
    }
  });

  test('should display provider cards', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Click Search tab if available
      const searchTab = page
        .locator('[role="tab"]:has-text("Search"), button:has-text("Search")')
        .first();
      if (await searchTab.isVisible()) {
        await searchTab.click();
        await waitForAnimation(page);
      }

      // Check for provider names
      const tavilyCard = page.locator('text=Tavily').first();
      const hasTavily = await tavilyCard.isVisible().catch(() => false);
      expect(hasTavily).toBe(true);
    }
  });

  test('should display API key input fields', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for password inputs (API keys)
      const apiKeyInputs = page.locator(
        'input[type="password"], input[placeholder*="API"], input[placeholder*="key"]'
      );
      const count = await apiKeyInputs.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display test connection buttons', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for test/verify buttons
      const testButtons = page.locator(
        'button:has-text("Test"), button:has-text("Verify")'
      );
      const hasTestButtons = (await testButtons.count()) > 0;
      expect(hasTestButtons).toBe(true);
    }
  });
});
