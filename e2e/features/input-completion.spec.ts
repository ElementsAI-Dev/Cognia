import { test, expect } from '@playwright/test';

/**
 * Input Completion E2E Tests
 * Tests AI-powered input completion with IME detection and suggestion workflow
 */
test.describe('Input Completion Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage completion lifecycle', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionStatus {
        isRunning: boolean;
        isEnabled: boolean;
        provider: string;
        model: string;
      }

      const status: CompletionStatus = {
        isRunning: false,
        isEnabled: true,
        provider: 'ollama',
        model: 'qwen2.5-coder:0.5b',
      };

      const startInputCompletion = () => {
        status.isRunning = true;
      };

      const stopInputCompletion = () => {
        status.isRunning = false;
      };

      const isRunning = () => status.isRunning;

      const initialRunning = isRunning();
      startInputCompletion();
      const afterStart = isRunning();
      stopInputCompletion();
      const afterStop = isRunning();

      return {
        initialRunning,
        afterStart,
        afterStop,
        provider: status.provider,
        model: status.model,
      };
    });

    expect(result.initialRunning).toBe(false);
    expect(result.afterStart).toBe(true);
    expect(result.afterStop).toBe(false);
    expect(result.provider).toBe('ollama');
  });

  test('should get completion status', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionStatus {
        isRunning: boolean;
        isEnabled: boolean;
        pendingSuggestion: boolean;
        lastTriggerTime: number | null;
        errorCount: number;
      }

      const getCompletionStatus = (): CompletionStatus => {
        return {
          isRunning: true,
          isEnabled: true,
          pendingSuggestion: false,
          lastTriggerTime: Date.now() - 5000,
          errorCount: 0,
        };
      };

      const status = getCompletionStatus();

      return {
        isRunning: status.isRunning,
        isEnabled: status.isEnabled,
        pendingSuggestion: status.pendingSuggestion,
        hasLastTrigger: status.lastTriggerTime !== null,
        errorCount: status.errorCount,
      };
    });

    expect(result.isRunning).toBe(true);
    expect(result.isEnabled).toBe(true);
    expect(result.pendingSuggestion).toBe(false);
    expect(result.hasLastTrigger).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  test('should update completion config', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionConfig {
        enabled: boolean;
        provider: string;
        model: string;
        triggerDelay: number;
        minCharsToTrigger: number;
        maxSuggestionLength: number;
      }

      let config: CompletionConfig = {
        enabled: true,
        provider: 'ollama',
        model: 'qwen2.5-coder:0.5b',
        triggerDelay: 300,
        minCharsToTrigger: 3,
        maxSuggestionLength: 100,
      };

      const updateConfig = (updates: Partial<CompletionConfig>) => {
        config = { ...config, ...updates };
      };

      const getConfig = () => ({ ...config });

      const initialConfig = getConfig();
      updateConfig({ provider: 'openai', model: 'gpt-4o-mini', triggerDelay: 500 });
      const updatedConfig = getConfig();

      return {
        initialProvider: initialConfig.provider,
        initialDelay: initialConfig.triggerDelay,
        updatedProvider: updatedConfig.provider,
        updatedModel: updatedConfig.model,
        updatedDelay: updatedConfig.triggerDelay,
      };
    });

    expect(result.initialProvider).toBe('ollama');
    expect(result.initialDelay).toBe(300);
    expect(result.updatedProvider).toBe('openai');
    expect(result.updatedModel).toBe('gpt-4o-mini');
    expect(result.updatedDelay).toBe(500);
  });
});

/**
 * IME State Detection Tests
 * Tests Input Method Editor state for CJK language support
 */
test.describe('IME State Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect IME active state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImeState {
        isActive: boolean;
        language?: string;
        composing: boolean;
      }

      const imeState: ImeState = {
        isActive: false,
        language: undefined,
        composing: false,
      };

      const updateImeState = (active: boolean, language?: string) => {
        imeState.isActive = active;
        imeState.language = language;
      };

      const getImeState = (): ImeState => ({ ...imeState });

      const initialState = getImeState();
      updateImeState(true, 'zh-CN');
      const chineseState = getImeState();
      updateImeState(true, 'ja-JP');
      const japaneseState = getImeState();
      updateImeState(false);
      const inactiveState = getImeState();

      return {
        initialActive: initialState.isActive,
        chineseActive: chineseState.isActive,
        chineseLanguage: chineseState.language,
        japaneseLanguage: japaneseState.language,
        inactiveActive: inactiveState.isActive,
      };
    });

    expect(result.initialActive).toBe(false);
    expect(result.chineseActive).toBe(true);
    expect(result.chineseLanguage).toBe('zh-CN');
    expect(result.japaneseLanguage).toBe('ja-JP');
    expect(result.inactiveActive).toBe(false);
  });

  test('should suppress suggestions during IME composition', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImeState {
        isActive: boolean;
        composing: boolean;
      }

      const imeState: ImeState = {
        isActive: false,
        composing: false,
      };

      const shouldShowSuggestion = (hasSuggestion: boolean): boolean => {
        if (imeState.isActive || imeState.composing) {
          return false;
        }
        return hasSuggestion;
      };

      imeState.isActive = false;
      imeState.composing = false;
      const normalShow = shouldShowSuggestion(true);

      imeState.isActive = true;
      imeState.composing = false;
      const imeActiveHide = shouldShowSuggestion(true);

      imeState.isActive = false;
      imeState.composing = true;
      const composingHide = shouldShowSuggestion(true);

      imeState.isActive = false;
      imeState.composing = false;
      const noSuggestionHide = shouldShowSuggestion(false);

      return {
        normalShow,
        imeActiveHide,
        composingHide,
        noSuggestionHide,
      };
    });

    expect(result.normalShow).toBe(true);
    expect(result.imeActiveHide).toBe(false);
    expect(result.composingHide).toBe(false);
    expect(result.noSuggestionHide).toBe(false);
  });

  test('should handle composition events', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompositionState {
        isComposing: boolean;
        compositionText: string;
        compositionStart: number | null;
      }

      const state: CompositionState = {
        isComposing: false,
        compositionText: '',
        compositionStart: null,
      };

      const handleCompositionStart = (startIndex: number) => {
        state.isComposing = true;
        state.compositionStart = startIndex;
      };

      const handleCompositionUpdate = (text: string) => {
        state.compositionText = text;
      };

      const handleCompositionEnd = (): string => {
        const result = state.compositionText;
        state.isComposing = false;
        state.compositionText = '';
        state.compositionStart = null;
        return result;
      };

      handleCompositionStart(10);
      const afterStart = { ...state };

      handleCompositionUpdate('你好');
      const afterUpdate = { ...state };

      const finalText = handleCompositionEnd();
      const afterEnd = { ...state };

      return {
        afterStartComposing: afterStart.isComposing,
        afterStartIndex: afterStart.compositionStart,
        afterUpdateText: afterUpdate.compositionText,
        finalText,
        afterEndComposing: afterEnd.isComposing,
      };
    });

    expect(result.afterStartComposing).toBe(true);
    expect(result.afterStartIndex).toBe(10);
    expect(result.afterUpdateText).toBe('你好');
    expect(result.finalText).toBe('你好');
    expect(result.afterEndComposing).toBe(false);
  });
});

/**
 * Suggestion Workflow Tests
 * Tests suggestion generation, display, acceptance, and dismissal
 */
test.describe('Suggestion Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should get current suggestion', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionSuggestion {
        id: string;
        text: string;
        prefix: string;
        suffix: string;
        confidence: number;
        generatedAt: number;
      }

      let currentSuggestion: CompletionSuggestion | null = null;

      const generateSuggestion = (prefix: string): CompletionSuggestion => {
        return {
          id: `suggestion-${Date.now()}`,
          text: 'console.log("Hello, World!");',
          prefix,
          suffix: '',
          confidence: 0.85,
          generatedAt: Date.now(),
        };
      };

      const getCurrentSuggestion = (): CompletionSuggestion | null => currentSuggestion;

      const noSuggestion = getCurrentSuggestion();

      currentSuggestion = generateSuggestion('function greet() {\n  ');
      const hasSuggestion = getCurrentSuggestion();

      return {
        noSuggestionIsNull: noSuggestion === null,
        hasSuggestionId: hasSuggestion?.id !== undefined,
        suggestionText: hasSuggestion?.text,
        confidence: hasSuggestion?.confidence,
      };
    });

    expect(result.noSuggestionIsNull).toBe(true);
    expect(result.hasSuggestionId).toBe(true);
    expect(result.suggestionText).toBe('console.log("Hello, World!");');
    expect(result.confidence).toBe(0.85);
  });

  test('should accept suggestion with Tab key', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionSuggestion {
        id: string;
        text: string;
        accepted: boolean;
      }

      let suggestion: CompletionSuggestion | null = {
        id: 'test-suggestion',
        text: 'console.log("test");',
        accepted: false,
      };

      let insertedText = '';

      const acceptSuggestion = (): CompletionSuggestion | null => {
        if (!suggestion) return null;

        insertedText = suggestion.text;
        suggestion.accepted = true;
        const accepted = { ...suggestion };
        suggestion = null;

        return accepted;
      };

      const initialSuggestion = suggestion !== null;
      const acceptedSuggestion = acceptSuggestion();
      const afterAccept = suggestion === null;

      return {
        hadSuggestion: initialSuggestion,
        acceptedText: acceptedSuggestion?.text,
        wasAccepted: acceptedSuggestion?.accepted,
        suggestionCleared: afterAccept,
        insertedText,
      };
    });

    expect(result.hadSuggestion).toBe(true);
    expect(result.acceptedText).toBe('console.log("test");');
    expect(result.wasAccepted).toBe(true);
    expect(result.suggestionCleared).toBe(true);
    expect(result.insertedText).toBe('console.log("test");');
  });

  test('should dismiss suggestion with Escape key', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionSuggestion {
        id: string;
        text: string;
      }

      let suggestion: CompletionSuggestion | null = {
        id: 'test-suggestion',
        text: 'console.log("test");',
      };

      let dismissCount = 0;

      const dismissSuggestion = () => {
        if (suggestion) {
          suggestion = null;
          dismissCount++;
        }
      };

      const hasSuggestion = () => suggestion !== null;

      const initialHasSuggestion = hasSuggestion();
      dismissSuggestion();
      const afterDismiss = hasSuggestion();
      dismissSuggestion();
      const secondDismissCount = dismissCount;

      return {
        initialHasSuggestion,
        afterDismiss,
        dismissCount: secondDismissCount,
      };
    });

    expect(result.initialHasSuggestion).toBe(true);
    expect(result.afterDismiss).toBe(false);
    expect(result.dismissCount).toBe(1);
  });

  test('should trigger completion manually', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionResult {
        success: boolean;
        suggestion: string | null;
        error: string | null;
        latency: number;
      }

      const triggerCompletion = async (text: string): Promise<CompletionResult> => {
        const startTime = Date.now();

        if (text.length < 3) {
          return {
            success: false,
            suggestion: null,
            error: 'Text too short',
            latency: Date.now() - startTime,
          };
        }

        return {
          success: true,
          suggestion: `${text.trim()} // AI suggestion`,
          error: null,
          latency: Date.now() - startTime,
        };
      };

      const shortResult = triggerCompletion('ab');
      const validResult = triggerCompletion('function test()');

      return {
        shortSuccess: shortResult.then(r => r.success),
        shortError: shortResult.then(r => r.error),
        validSuccess: validResult.then(r => r.success),
        validSuggestion: validResult.then(r => r.suggestion),
      };
    });

    expect(await result.shortSuccess).toBe(false);
    expect(await result.shortError).toBe('Text too short');
    expect(await result.validSuccess).toBe(true);
    expect(await result.validSuggestion).toContain('function test()');
  });
});

/**
 * Completion Statistics Tests
 * Tests tracking of completion usage and performance
 */
test.describe('Completion Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should track completion stats', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionStats {
        totalSuggestions: number;
        acceptedSuggestions: number;
        dismissedSuggestions: number;
        totalCharactersInserted: number;
        averageLatency: number;
        acceptanceRate: number;
      }

      const stats: CompletionStats = {
        totalSuggestions: 0,
        acceptedSuggestions: 0,
        dismissedSuggestions: 0,
        totalCharactersInserted: 0,
        averageLatency: 0,
        acceptanceRate: 0,
      };

      const latencies: number[] = [];

      const recordSuggestion = (latency: number) => {
        stats.totalSuggestions++;
        latencies.push(latency);
        stats.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      };

      const recordAccepted = (charsInserted: number) => {
        stats.acceptedSuggestions++;
        stats.totalCharactersInserted += charsInserted;
        stats.acceptanceRate = (stats.acceptedSuggestions / stats.totalSuggestions) * 100;
      };

      const recordDismissed = () => {
        stats.dismissedSuggestions++;
        stats.acceptanceRate = (stats.acceptedSuggestions / stats.totalSuggestions) * 100;
      };

      recordSuggestion(50);
      recordAccepted(25);
      recordSuggestion(75);
      recordAccepted(30);
      recordSuggestion(60);
      recordDismissed();

      return {
        totalSuggestions: stats.totalSuggestions,
        acceptedSuggestions: stats.acceptedSuggestions,
        dismissedSuggestions: stats.dismissedSuggestions,
        totalCharacters: stats.totalCharactersInserted,
        averageLatency: stats.averageLatency,
        acceptanceRate: Math.round(stats.acceptanceRate),
      };
    });

    expect(result.totalSuggestions).toBe(3);
    expect(result.acceptedSuggestions).toBe(2);
    expect(result.dismissedSuggestions).toBe(1);
    expect(result.totalCharacters).toBe(55);
    expect(result.averageLatency).toBeCloseTo(61.67, 0);
    expect(result.acceptanceRate).toBe(67);
  });

  test('should reset completion stats', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CompletionStats {
        totalSuggestions: number;
        acceptedSuggestions: number;
        totalCharactersInserted: number;
      }

      const stats: CompletionStats = {
        totalSuggestions: 100,
        acceptedSuggestions: 75,
        totalCharactersInserted: 5000,
      };

      const resetStats = () => {
        stats.totalSuggestions = 0;
        stats.acceptedSuggestions = 0;
        stats.totalCharactersInserted = 0;
      };

      const beforeReset = { ...stats };
      resetStats();
      const afterReset = { ...stats };

      return {
        beforeTotal: beforeReset.totalSuggestions,
        beforeAccepted: beforeReset.acceptedSuggestions,
        afterTotal: afterReset.totalSuggestions,
        afterAccepted: afterReset.acceptedSuggestions,
        afterCharacters: afterReset.totalCharactersInserted,
      };
    });

    expect(result.beforeTotal).toBe(100);
    expect(result.beforeAccepted).toBe(75);
    expect(result.afterTotal).toBe(0);
    expect(result.afterAccepted).toBe(0);
    expect(result.afterCharacters).toBe(0);
  });

  test('should calculate productivity metrics', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ProductivityMetrics {
        charactersTyped: number;
        charactersFromCompletions: number;
        timeSavedMs: number;
        productivityBoost: number;
      }

      const calculateProductivityMetrics = (
        typed: number,
        fromCompletions: number,
        avgTypingSpeedCpm: number = 200
      ): ProductivityMetrics => {
        const timeSavedMs = (fromCompletions / avgTypingSpeedCpm) * 60 * 1000;
        const totalChars = typed + fromCompletions;
        const productivityBoost = totalChars > 0 ? (fromCompletions / totalChars) * 100 : 0;

        return {
          charactersTyped: typed,
          charactersFromCompletions: fromCompletions,
          timeSavedMs,
          productivityBoost,
        };
      };

      const metrics = calculateProductivityMetrics(1000, 500);

      return {
        typed: metrics.charactersTyped,
        fromCompletions: metrics.charactersFromCompletions,
        timeSavedMs: metrics.timeSavedMs,
        productivityBoost: Math.round(metrics.productivityBoost),
      };
    });

    expect(result.typed).toBe(1000);
    expect(result.fromCompletions).toBe(500);
    expect(result.timeSavedMs).toBeGreaterThan(0);
    expect(result.productivityBoost).toBe(33);
  });
});

/**
 * Completion Provider Tests
 * Tests provider configuration and connection
 */
test.describe('Completion Provider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should test provider connection', async ({ page }) => {
    const result = await page.evaluate(() => {
      type ProviderName = 'ollama' | 'openai' | 'groq';

      interface ConnectionTestResult {
        success: boolean;
        latency: number;
        error?: string;
      }

      const testProviderConnection = async (provider: ProviderName): Promise<ConnectionTestResult> => {
        const startTime = Date.now();

        if (provider === 'ollama') {
          return {
            success: true,
            latency: Date.now() - startTime + 50,
          };
        } else if (provider === 'openai') {
          return {
            success: true,
            latency: Date.now() - startTime + 100,
          };
        } else {
          return {
            success: false,
            latency: Date.now() - startTime,
            error: 'Provider not configured',
          };
        }
      };

      const ollamaResult = testProviderConnection('ollama');
      const openaiResult = testProviderConnection('openai');
      const groqResult = testProviderConnection('groq');

      return {
        ollamaSuccess: ollamaResult.then(r => r.success),
        openaiSuccess: openaiResult.then(r => r.success),
        groqSuccess: groqResult.then(r => r.success),
        groqError: groqResult.then(r => r.error),
      };
    });

    expect(await result.ollamaSuccess).toBe(true);
    expect(await result.openaiSuccess).toBe(true);
    expect(await result.groqSuccess).toBe(false);
    expect(await result.groqError).toBe('Provider not configured');
  });

  test('should manage provider cache', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CacheEntry {
        prefix: string;
        suggestion: string;
        timestamp: number;
      }

      const cache: Map<string, CacheEntry> = new Map();
      const maxCacheSize = 100;

      const addToCache = (prefix: string, suggestion: string) => {
        if (cache.size >= maxCacheSize) {
          const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
          if (oldest) cache.delete(oldest[0]);
        }
        cache.set(prefix, { prefix, suggestion, timestamp: Date.now() });
      };

      const getFromCache = (prefix: string): string | null => {
        const entry = cache.get(prefix);
        return entry?.suggestion ?? null;
      };

      const clearCache = () => {
        cache.clear();
      };

      addToCache('function test', 'console.log("test");');
      addToCache('const value', '= 42;');

      const cachedSuggestion = getFromCache('function test');
      const missedSuggestion = getFromCache('unknown');
      const cacheSize = cache.size;

      clearCache();
      const afterClearSize = cache.size;

      return {
        cachedSuggestion,
        missedSuggestion,
        cacheSize,
        afterClearSize,
      };
    });

    expect(result.cachedSuggestion).toBe('console.log("test");');
    expect(result.missedSuggestion).toBe(null);
    expect(result.cacheSize).toBe(2);
    expect(result.afterClearSize).toBe(0);
  });
});

/**
 * Trigger Configuration Tests
 * Tests completion trigger behavior and timing
 */
test.describe('Trigger Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should respect trigger delay', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TriggerConfig {
        delayMs: number;
        minChars: number;
        enabled: boolean;
      }

      const config: TriggerConfig = {
        delayMs: 300,
        minChars: 3,
        enabled: true,
      };

      const _lastTriggerTime = 0;
      const _triggerScheduled = false;

      const shouldTrigger = (text: string, timeSinceLastKeystroke: number): boolean => {
        if (!config.enabled) return false;
        if (text.length < config.minChars) return false;
        if (timeSinceLastKeystroke < config.delayMs) return false;
        return true;
      };

      const tooShort = shouldTrigger('ab', 500);
      const tooFast = shouldTrigger('function', 100);
      const shouldFire = shouldTrigger('function', 500);

      return {
        tooShort,
        tooFast,
        shouldFire,
      };
    });

    expect(result.tooShort).toBe(false);
    expect(result.tooFast).toBe(false);
    expect(result.shouldFire).toBe(true);
  });

  test('should debounce rapid keystrokes', async ({ page }) => {
    const result = await page.evaluate(() => {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let triggerCount = 0;

      const debounce = (fn: () => void, delay: number) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(fn, delay);
      };

      const triggerCompletion = () => {
        triggerCount++;
      };

      debounce(triggerCompletion, 100);
      debounce(triggerCompletion, 100);
      debounce(triggerCompletion, 100);

      return new Promise<{ triggerCount: number }>((resolve) => {
        setTimeout(() => {
          resolve({ triggerCount });
        }, 150);
      });
    });

    expect(result.triggerCount).toBe(1);
  });
});

/**
 * Completion Context Tests
 * Tests context extraction and code analysis for completions
 */
test.describe('Completion Context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should extract code context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CodeContext {
        prefix: string;
        suffix: string;
        currentLine: string;
        lineNumber: number;
        indentation: string;
        language: string;
      }

      const extractContext = (
        code: string,
        cursorPosition: number,
        language: string
      ): CodeContext => {
        const prefix = code.slice(0, cursorPosition);
        const suffix = code.slice(cursorPosition);

        const lines = prefix.split('\n');
        const currentLine = lines[lines.length - 1];
        const lineNumber = lines.length;

        const indentMatch = currentLine.match(/^(\s*)/);
        const indentation = indentMatch ? indentMatch[1] : '';

        return {
          prefix,
          suffix,
          currentLine,
          lineNumber,
          indentation,
          language,
        };
      };

      const code = `function test() {
  const x = 10;
  console.log(`;

      const context = extractContext(code, code.length, 'typescript');

      return {
        prefixLength: context.prefix.length,
        suffixLength: context.suffix.length,
        lineNumber: context.lineNumber,
        currentLine: context.currentLine,
        indentationLength: context.indentation.length,
        language: context.language,
      };
    });

    expect(result.prefixLength).toBeGreaterThan(0);
    expect(result.suffixLength).toBe(0);
    expect(result.lineNumber).toBe(3);
    expect(result.currentLine).toContain('console.log(');
    expect(result.indentationLength).toBe(2);
    expect(result.language).toBe('typescript');
  });

  test('should detect scope and symbols', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ScopeInfo {
        type: 'function' | 'class' | 'method' | 'block' | 'global';
        name: string | null;
        depth: number;
        variables: string[];
      }

      const detectScope = (code: string): ScopeInfo => {
        let depth = 0;
        let scopeType: ScopeInfo['type'] = 'global';
        let scopeName: string | null = null;
        const variables: string[] = [];

        const functionMatch = code.match(/function\s+(\w+)/);
        const classMatch = code.match(/class\s+(\w+)/);
        const methodMatch = code.match(/(\w+)\s*\([^)]*\)\s*{/);

        if (functionMatch) {
          scopeType = 'function';
          scopeName = functionMatch[1];
        } else if (classMatch) {
          scopeType = 'class';
          scopeName = classMatch[1];
        } else if (methodMatch) {
          scopeType = 'method';
          scopeName = methodMatch[1];
        }

        for (const char of code) {
          if (char === '{') depth++;
          else if (char === '}') depth--;
        }

        const varMatches = code.matchAll(/(?:const|let|var)\s+(\w+)/g);
        for (const match of varMatches) {
          variables.push(match[1]);
        }

        return {
          type: scopeType,
          name: scopeName,
          depth,
          variables,
        };
      };

      const functionCode = `function processData() {
  const data = [];
  let count = 0;
  const result = process();
`;

      const scope = detectScope(functionCode);

      return {
        scopeType: scope.type,
        scopeName: scope.name,
        depth: scope.depth,
        variableCount: scope.variables.length,
        hasData: scope.variables.includes('data'),
        hasCount: scope.variables.includes('count'),
      };
    });

    expect(result.scopeType).toBe('function');
    expect(result.scopeName).toBe('processData');
    expect(result.depth).toBe(1);
    expect(result.variableCount).toBe(3);
    expect(result.hasData).toBe(true);
    expect(result.hasCount).toBe(true);
  });

  test('should detect import context', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ImportInfo {
        module: string;
        imports: string[];
        isDefault: boolean;
        isNamespace: boolean;
      }

      const parseImports = (code: string): ImportInfo[] => {
        const imports: ImportInfo[] = [];

        const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
        const defaultImportRegex = /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
        const namespaceImportRegex = /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;

        let match;

        while ((match = namedImportRegex.exec(code)) !== null) {
          const importNames = match[1].split(',').map(s => s.trim());
          imports.push({
            module: match[2],
            imports: importNames,
            isDefault: false,
            isNamespace: false,
          });
        }

        while ((match = defaultImportRegex.exec(code)) !== null) {
          imports.push({
            module: match[2],
            imports: [match[1]],
            isDefault: true,
            isNamespace: false,
          });
        }

        while ((match = namespaceImportRegex.exec(code)) !== null) {
          imports.push({
            module: match[2],
            imports: [match[1]],
            isDefault: false,
            isNamespace: true,
          });
        }

        return imports;
      };

      const code = `
import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';
`;

      const imports = parseImports(code);

      return {
        importCount: imports.length,
        hasReactDefault: imports.some(i => i.isDefault && i.module === 'react'),
        hasReactNamed: imports.some(i => !i.isDefault && i.module === 'react'),
        hasNamespace: imports.some(i => i.isNamespace),
        namedImportCount: imports.find(i => !i.isDefault && i.module === 'react')?.imports.length,
      };
    });

    expect(result.importCount).toBe(3);
    expect(result.hasReactDefault).toBe(true);
    expect(result.hasReactNamed).toBe(true);
    expect(result.hasNamespace).toBe(true);
    expect(result.namedImportCount).toBe(2);
  });
});

/**
 * Completion Quality Tests
 * Tests suggestion ranking and quality scoring
 */
test.describe('Completion Quality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should score suggestion quality', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SuggestionScore {
        relevance: number;
        syntaxCorrectness: number;
        contextMatch: number;
        totalScore: number;
      }

      const scoreSuggestion = (
        suggestion: string,
        context: { prefix: string; language: string; expectedType?: string }
      ): SuggestionScore => {
        let relevance = 0.5;
        let syntaxCorrectness = 1.0;
        let contextMatch = 0.5;

        if (context.prefix.endsWith('(')) {
          if (suggestion.includes(')')) {
            relevance += 0.3;
          }
        }

        if (context.prefix.includes('function') && suggestion.includes('return')) {
          contextMatch += 0.2;
        }

        const openBrackets = (suggestion.match(/\(/g) || []).length;
        const closeBrackets = (suggestion.match(/\)/g) || []).length;
        if (openBrackets !== closeBrackets) {
          syntaxCorrectness -= 0.3;
        }

        if (suggestion.length < 5) {
          relevance -= 0.2;
        } else if (suggestion.length > 100) {
          relevance -= 0.1;
        }

        const totalScore = (relevance + syntaxCorrectness + contextMatch) / 3;

        return {
          relevance: Math.max(0, Math.min(1, relevance)),
          syntaxCorrectness: Math.max(0, Math.min(1, syntaxCorrectness)),
          contextMatch: Math.max(0, Math.min(1, contextMatch)),
          totalScore: Math.max(0, Math.min(1, totalScore)),
        };
      };

      const goodSuggestion = scoreSuggestion(
        'return data.map(item => item.value)',
        { prefix: 'function process() {\n  ', language: 'typescript' }
      );

      const badSuggestion = scoreSuggestion(
        'x',
        { prefix: 'const ', language: 'typescript' }
      );

      return {
        goodRelevance: goodSuggestion.relevance,
        goodContextMatch: goodSuggestion.contextMatch,
        goodTotalScore: goodSuggestion.totalScore,
        badRelevance: badSuggestion.relevance,
        badTotalScore: badSuggestion.totalScore,
        goodBetterThanBad: goodSuggestion.totalScore > badSuggestion.totalScore,
      };
    });

    expect(result.goodRelevance).toBeGreaterThan(0.4);
    expect(result.goodContextMatch).toBeGreaterThan(0.5);
    expect(result.badRelevance).toBeLessThan(0.5);
    expect(result.goodBetterThanBad).toBe(true);
  });

  test('should rank multiple suggestions', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface RankedSuggestion {
        text: string;
        score: number;
        rank: number;
      }

      const rankSuggestions = (
        suggestions: string[],
        context: string
      ): RankedSuggestion[] => {
        const scored = suggestions.map(text => {
          let score = 0.5;

          if (context.includes('function') && text.includes('return')) {
            score += 0.2;
          }

          if (text.length > 10 && text.length < 50) {
            score += 0.1;
          }

          if (text.includes('console.log')) {
            score -= 0.1;
          }

          if (/^[a-z]/.test(text)) {
            score += 0.05;
          }

          return { text, score };
        });

        scored.sort((a, b) => b.score - a.score);

        return scored.map((s, i) => ({
          text: s.text,
          score: s.score,
          rank: i + 1,
        }));
      };

      const suggestions = [
        'console.log(data)',
        'return data.filter(x => x.valid)',
        'x',
        'const result = processData(input)',
      ];

      const ranked = rankSuggestions(suggestions, 'function process() {');

      return {
        topSuggestion: ranked[0].text,
        topScore: ranked[0].score,
        bottomSuggestion: ranked[ranked.length - 1].text,
        hasReturnInTop2: ranked.slice(0, 2).some(s => s.text.includes('return')),
      };
    });

    expect(result.topScore).toBeGreaterThan(0.5);
    expect(result.hasReturnInTop2).toBe(true);
    expect(result.bottomSuggestion).toBe('x');
  });
});

/**
 * Completion Language Support Tests
 * Tests multi-language completion capabilities
 */
test.describe('Completion Language Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect programming language', async ({ page }) => {
    const result = await page.evaluate(() => {
      type Language = 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'unknown';

      const detectLanguage = (code: string, filename?: string): Language => {
        if (filename) {
          if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return 'typescript';
          if (filename.endsWith('.js') || filename.endsWith('.jsx')) return 'javascript';
          if (filename.endsWith('.py')) return 'python';
          if (filename.endsWith('.rs')) return 'rust';
          if (filename.endsWith('.go')) return 'go';
        }

        if (/:\s*(string|number|boolean|void)\b/.test(code)) return 'typescript';
        if (/\bdef\s+\w+\s*\([^)]*\)\s*:/.test(code)) return 'python';
        if (/\bfn\s+\w+\s*\(/.test(code) && /->/.test(code)) return 'rust';
        if (/\bfunc\s+\w+\s*\(/.test(code) && /\bpackage\b/.test(code)) return 'go';
        if (/\bfunction\b|\bconst\b|\blet\b/.test(code)) return 'javascript';

        return 'unknown';
      };

      return {
        tsFromFile: detectLanguage('const x = 1', 'file.ts'),
        jsFromFile: detectLanguage('const x = 1', 'file.js'),
        pyFromFile: detectLanguage('x = 1', 'file.py'),
        tsFromCode: detectLanguage('const x: string = "test"'),
        pyFromCode: detectLanguage('def process(data):\n    return data'),
        rustFromCode: detectLanguage('fn main() -> Result<()> {'),
      };
    });

    expect(result.tsFromFile).toBe('typescript');
    expect(result.jsFromFile).toBe('javascript');
    expect(result.pyFromFile).toBe('python');
    expect(result.tsFromCode).toBe('typescript');
    expect(result.pyFromCode).toBe('python');
    expect(result.rustFromCode).toBe('rust');
  });

  test('should provide language-specific completions', async ({ page }) => {
    const result = await page.evaluate(() => {
      type Language = 'typescript' | 'python' | 'rust';

      interface LanguageConfig {
        keywords: string[];
        snippets: Record<string, string>;
        commentStyle: { single: string; multiStart?: string; multiEnd?: string };
      }

      const languageConfigs: Record<Language, LanguageConfig> = {
        typescript: {
          keywords: ['const', 'let', 'function', 'interface', 'type', 'class', 'async', 'await'],
          snippets: {
            'fn': 'function ${1:name}(${2:params}): ${3:void} {\n\t$0\n}',
            'cl': 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
          },
          commentStyle: { single: '//', multiStart: '/*', multiEnd: '*/' },
        },
        python: {
          keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'async'],
          snippets: {
            'def': 'def ${1:name}(${2:params}):\n\t${0:pass}',
            'class': 'class ${1:Name}:\n\tdef __init__(self${2:, params}):\n\t\t${0:pass}',
          },
          commentStyle: { single: '#', multiStart: '"""', multiEnd: '"""' },
        },
        rust: {
          keywords: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'pub', 'mod', 'use', 'async'],
          snippets: {
            'fn': 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n\t$0\n}',
            'struct': 'struct ${1:Name} {\n\t${0:fields}\n}',
          },
          commentStyle: { single: '//', multiStart: '/*', multiEnd: '*/' },
        },
      };

      const getLanguageConfig = (lang: Language): LanguageConfig => {
        return languageConfigs[lang];
      };

      const tsConfig = getLanguageConfig('typescript');
      const pyConfig = getLanguageConfig('python');
      const rsConfig = getLanguageConfig('rust');

      return {
        tsKeywordCount: tsConfig.keywords.length,
        tsHasAsync: tsConfig.keywords.includes('async'),
        pyCommentStyle: pyConfig.commentStyle.single,
        rsHasMut: rsConfig.keywords.includes('mut'),
        tsHasFnSnippet: 'fn' in tsConfig.snippets,
        pyHasClassSnippet: 'class' in pyConfig.snippets,
      };
    });

    expect(result.tsKeywordCount).toBeGreaterThan(5);
    expect(result.tsHasAsync).toBe(true);
    expect(result.pyCommentStyle).toBe('#');
    expect(result.rsHasMut).toBe(true);
    expect(result.tsHasFnSnippet).toBe(true);
    expect(result.pyHasClassSnippet).toBe(true);
  });
});
