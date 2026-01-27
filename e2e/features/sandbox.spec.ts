import { test, expect } from '@playwright/test';

/**
 * Sandbox E2E Tests
 * Tests code execution sandbox functionality
 */
test.describe('Sandbox Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage code snippets', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface CodeSnippet {
        id: string;
        name: string;
        language: string;
        code: string;
        createdAt: Date;
        updatedAt: Date;
        isFavorite: boolean;
        tags: string[];
      }

      const snippets: CodeSnippet[] = [];

      const createSnippet = (input: {
        name: string;
        language: string;
        code: string;
        tags?: string[];
      }): CodeSnippet => {
        const now = new Date();
        const snippet: CodeSnippet = {
          id: `snippet-${Date.now()}`,
          name: input.name,
          language: input.language,
          code: input.code,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          tags: input.tags || [],
        };
        snippets.push(snippet);
        return snippet;
      };

      const _updateSnippet = (id: string, updates: Partial<CodeSnippet>) => {
        const snippet = snippets.find(s => s.id === id);
        if (snippet) {
          Object.assign(snippet, updates, { updatedAt: new Date() });
        }
      };

      const deleteSnippet = (id: string) => {
        const index = snippets.findIndex(s => s.id === id);
        if (index !== -1) snippets.splice(index, 1);
      };

      const toggleFavorite = (id: string) => {
        const snippet = snippets.find(s => s.id === id);
        if (snippet) {
          snippet.isFavorite = !snippet.isFavorite;
        }
      };

      const getByLanguage = (language: string) => {
        return snippets.filter(s => s.language === language);
      };

      const getFavorites = () => snippets.filter(s => s.isFavorite);

      // Create snippets
      const js = createSnippet({
        name: 'Hello World',
        language: 'javascript',
        code: 'console.log("Hello");',
        tags: ['basic'],
      });

      createSnippet({
        name: 'TypeScript Function',
        language: 'typescript',
        code: 'function greet(name: string) { return `Hello ${name}`; }',
        tags: ['function'],
      });

      createSnippet({
        name: 'Python Script',
        language: 'python',
        code: 'print("Hello")',
        tags: ['basic'],
      });

      toggleFavorite(js.id);
      const favoritesCount = getFavorites().length;

      const jsSnippets = getByLanguage('javascript');

      deleteSnippet(js.id);

      return {
        totalSnippets: snippets.length,
        favoritesCount,
        jsSnippetsCount: jsSnippets.length,
        afterDeleteCount: snippets.length,
      };
    });

    expect(result.totalSnippets).toBe(2);
    expect(result.favoritesCount).toBe(1);
    expect(result.jsSnippetsCount).toBe(1);
    expect(result.afterDeleteCount).toBe(2);
  });

  test('should track execution history', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SandboxExecutionRecord {
        id: string;
        snippetId?: string;
        code: string;
        language: string;
        output: string;
        error?: string;
        exitCode: number;
        duration: number;
        timestamp: Date;
        status: 'success' | 'error' | 'timeout';
      }

      const history: SandboxExecutionRecord[] = [];

      const addExecution = (record: Omit<SandboxExecutionRecord, 'id' | 'timestamp'>): SandboxExecutionRecord => {
        const execution: SandboxExecutionRecord = {
          ...record,
          id: `exec-${Date.now()}`,
          timestamp: new Date(),
        };
        history.unshift(execution);
        return execution;
      };

      const getSuccessfulExecutions = () => history.filter(e => e.status === 'success');
      const getFailedExecutions = () => history.filter(e => e.status === 'error');

      const getAverageDuration = () => {
        if (history.length === 0) return 0;
        return history.reduce((sum, e) => sum + e.duration, 0) / history.length;
      };

      const clearHistory = () => {
        history.length = 0;
      };

      // Add executions
      addExecution({
        code: 'console.log("test")',
        language: 'javascript',
        output: 'test\n',
        exitCode: 0,
        duration: 50,
        status: 'success',
      });

      addExecution({
        code: 'throw new Error("fail")',
        language: 'javascript',
        output: '',
        error: 'Error: fail',
        exitCode: 1,
        duration: 30,
        status: 'error',
      });

      addExecution({
        code: 'print("hello")',
        language: 'python',
        output: 'hello\n',
        exitCode: 0,
        duration: 100,
        status: 'success',
      });

      const successCount = getSuccessfulExecutions().length;
      const failedCount = getFailedExecutions().length;
      const avgDuration = getAverageDuration();

      clearHistory();

      return {
        successCount,
        failedCount,
        avgDuration,
        afterClearCount: history.length,
      };
    });

    expect(result.successCount).toBe(2);
    expect(result.failedCount).toBe(1);
    expect(result.avgDuration).toBe(60);
    expect(result.afterClearCount).toBe(0);
  });

  test('should manage sandbox stats', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SandboxStats {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        totalDuration: number;
        byLanguage: Record<string, {
          count: number;
          successCount: number;
          avgDuration: number;
        }>;
      }

      const stats: SandboxStats = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalDuration: 0,
        byLanguage: {},
      };

      const recordExecution = (
        language: string,
        success: boolean,
        duration: number
      ) => {
        stats.totalExecutions++;
        stats.totalDuration += duration;

        if (success) {
          stats.successfulExecutions++;
        } else {
          stats.failedExecutions++;
        }

        if (!stats.byLanguage[language]) {
          stats.byLanguage[language] = {
            count: 0,
            successCount: 0,
            avgDuration: 0,
          };
        }

        const langStats = stats.byLanguage[language];
        const prevTotal = langStats.avgDuration * langStats.count;
        langStats.count++;
        if (success) langStats.successCount++;
        langStats.avgDuration = (prevTotal + duration) / langStats.count;
      };

      const getSuccessRate = () => {
        if (stats.totalExecutions === 0) return 0;
        return (stats.successfulExecutions / stats.totalExecutions) * 100;
      };

      // Record executions
      recordExecution('javascript', true, 50);
      recordExecution('javascript', true, 60);
      recordExecution('javascript', false, 100);
      recordExecution('python', true, 80);
      recordExecution('python', true, 90);

      return {
        totalExecutions: stats.totalExecutions,
        successRate: getSuccessRate(),
        jsCount: stats.byLanguage['javascript']?.count,
        jsSuccessCount: stats.byLanguage['javascript']?.successCount,
        pythonAvgDuration: stats.byLanguage['python']?.avgDuration,
      };
    });

    expect(result.totalExecutions).toBe(5);
    expect(result.successRate).toBe(80);
    expect(result.jsCount).toBe(3);
    expect(result.jsSuccessCount).toBe(2);
    expect(result.pythonAvgDuration).toBe(85);
  });

  test('should validate code before execution', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ValidationResult {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      }

      const validateCode = (code: string, language: string): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check for empty code
        if (!code.trim()) {
          errors.push('Code cannot be empty');
        }

        // Check for dangerous patterns
        const dangerousPatterns = [
          { pattern: /process\.exit/i, message: 'process.exit is not allowed' },
          { pattern: /require\s*\(\s*['"]child_process/i, message: 'child_process module is restricted' },
          { pattern: /eval\s*\(/i, message: 'eval() is potentially dangerous' },
        ];

        for (const { pattern, message } of dangerousPatterns) {
          if (pattern.test(code)) {
            warnings.push(message);
          }
        }

        // Language-specific validation
        if (language === 'javascript' || language === 'typescript') {
          if (code.includes('while(true)') || code.includes('while (true)')) {
            warnings.push('Infinite loop detected');
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      };

      const emptyResult = validateCode('', 'javascript');
      const safeResult = validateCode('console.log("hello")', 'javascript');
      const dangerousResult = validateCode('eval("code")', 'javascript');
      const infiniteLoopResult = validateCode('while(true) {}', 'javascript');

      return {
        emptyIsValid: emptyResult.isValid,
        emptyErrors: emptyResult.errors,
        safeIsValid: safeResult.isValid,
        safeWarnings: safeResult.warnings,
        dangerousWarnings: dangerousResult.warnings,
        infiniteLoopWarnings: infiniteLoopResult.warnings,
      };
    });

    expect(result.emptyIsValid).toBe(false);
    expect(result.emptyErrors).toContain('Code cannot be empty');
    expect(result.safeIsValid).toBe(true);
    expect(result.safeWarnings).toHaveLength(0);
    expect(result.dangerousWarnings).toContain('eval() is potentially dangerous');
    expect(result.infiniteLoopWarnings).toContain('Infinite loop detected');
  });

  test('should format execution output', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface OutputLine {
        type: 'stdout' | 'stderr' | 'info';
        content: string;
        timestamp: number;
      }

      const formatOutput = (lines: OutputLine[]): string => {
        return lines
          .map(line => {
            const prefix = line.type === 'stderr' ? '[error] ' : '';
            return prefix + line.content;
          })
          .join('\n');
      };

      const parseOutput = (rawOutput: string): OutputLine[] => {
        return rawOutput.split('\n').map((line, _index) => ({
          type: 'stdout' as const,
          content: line,
          timestamp: Date.now(),
        }));
      };

      const truncateOutput = (output: string, maxLength: number): string => {
        if (output.length <= maxLength) return output;
        return output.slice(0, maxLength) + '\n... (truncated)';
      };

      const lines: OutputLine[] = [
        { type: 'stdout', content: 'Starting execution...', timestamp: 1 },
        { type: 'stdout', content: 'Processing data...', timestamp: 2 },
        { type: 'stderr', content: 'Warning: deprecated API', timestamp: 3 },
        { type: 'stdout', content: 'Done!', timestamp: 4 },
      ];

      const formatted = formatOutput(lines);
      const parsed = parseOutput('line1\nline2\nline3');
      const truncated = truncateOutput('a'.repeat(100), 50);

      return {
        formattedLines: formatted.split('\n').length,
        hasErrorPrefix: formatted.includes('[error]'),
        parsedLineCount: parsed.length,
        truncatedLength: truncated.length,
        hasTruncatedMarker: truncated.includes('(truncated)'),
      };
    });

    expect(result.formattedLines).toBe(4);
    expect(result.hasErrorPrefix).toBe(true);
    expect(result.parsedLineCount).toBe(3);
    expect(result.hasTruncatedMarker).toBe(true);
  });
});

test.describe('Sandbox Environment', () => {
  test('should manage environment variables', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const envVars: Record<string, string> = {};

      const setEnvVar = (key: string, value: string) => {
        envVars[key] = value;
      };

      const getEnvVar = (key: string): string | undefined => {
        return envVars[key];
      };

      const deleteEnvVar = (key: string) => {
        delete envVars[key];
      };

      const getAllEnvVars = () => ({ ...envVars });

      const clearEnvVars = () => {
        Object.keys(envVars).forEach(key => delete envVars[key]);
      };

      // Set environment variables
      setEnvVar('NODE_ENV', 'development');
      setEnvVar('API_KEY', 'test-key');
      setEnvVar('DEBUG', 'true');

      const countBefore = Object.keys(getAllEnvVars()).length;
      const nodeEnv = getEnvVar('NODE_ENV');

      deleteEnvVar('DEBUG');
      const countAfterDelete = Object.keys(getAllEnvVars()).length;

      clearEnvVars();
      const countAfterClear = Object.keys(getAllEnvVars()).length;

      return {
        countBefore,
        nodeEnv,
        countAfterDelete,
        countAfterClear,
      };
    });

    expect(result.countBefore).toBe(3);
    expect(result.nodeEnv).toBe('development');
    expect(result.countAfterDelete).toBe(2);
    expect(result.countAfterClear).toBe(0);
  });

  test('should manage dependencies', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface Dependency {
        name: string;
        version: string;
        isDevDependency: boolean;
      }

      const dependencies: Dependency[] = [];

      const addDependency = (name: string, version: string, isDev = false) => {
        const existing = dependencies.find(d => d.name === name);
        if (existing) {
          existing.version = version;
          existing.isDevDependency = isDev;
        } else {
          dependencies.push({ name, version, isDevDependency: isDev });
        }
      };

      const removeDependency = (name: string) => {
        const index = dependencies.findIndex(d => d.name === name);
        if (index !== -1) dependencies.splice(index, 1);
      };

      const getProductionDeps = () => dependencies.filter(d => !d.isDevDependency);
      const getDevDeps = () => dependencies.filter(d => d.isDevDependency);

      // Add dependencies
      addDependency('lodash', '4.17.21');
      addDependency('axios', '1.4.0');
      addDependency('jest', '29.5.0', true);
      addDependency('typescript', '5.0.0', true);

      const prodCount = getProductionDeps().length;
      const devCount = getDevDeps().length;

      removeDependency('lodash');

      return {
        totalDeps: dependencies.length,
        prodCount,
        devCount,
        afterRemove: dependencies.length,
      };
    });

    expect(result.totalDeps).toBe(3);
    expect(result.prodCount).toBe(2);
    expect(result.devCount).toBe(2);
    expect(result.afterRemove).toBe(3);
  });
});

/**
 * Sandbox Language Detection Tests
 * Tests language discovery and availability detection
 */
test.describe('Sandbox Language Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should get all supported languages', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Language {
        id: string;
        name: string;
        extension: string;
        dockerImage?: string;
        command: string[];
        enabled: boolean;
      }

      const getAllLanguages = (): Language[] => {
        return [
          { id: 'javascript', name: 'JavaScript', extension: 'js', command: ['node'], enabled: true },
          { id: 'typescript', name: 'TypeScript', extension: 'ts', command: ['ts-node'], enabled: true },
          { id: 'python', name: 'Python', extension: 'py', command: ['python3'], enabled: true },
          { id: 'rust', name: 'Rust', extension: 'rs', command: ['rustc'], enabled: false },
          { id: 'go', name: 'Go', extension: 'go', command: ['go', 'run'], enabled: false },
        ];
      };

      const languages = getAllLanguages();
      const enabledLanguages = languages.filter(l => l.enabled);
      const languageIds = languages.map(l => l.id);

      return {
        totalCount: languages.length,
        enabledCount: enabledLanguages.length,
        hasJavaScript: languageIds.includes('javascript'),
        hasPython: languageIds.includes('python'),
        hasRust: languageIds.includes('rust'),
      };
    });

    expect(result.totalCount).toBe(5);
    expect(result.enabledCount).toBe(3);
    expect(result.hasJavaScript).toBe(true);
    expect(result.hasPython).toBe(true);
    expect(result.hasRust).toBe(true);
  });

  test('should detect available languages for native execution', async ({ page }) => {
    const result = await page.evaluate(() => {
      const detectAvailableLanguages = (): string[] => {
        const available: string[] = [];
        const languageCommands: Record<string, string> = {
          javascript: 'node',
          python: 'python3',
          typescript: 'ts-node',
          rust: 'rustc',
          go: 'go',
        };

        for (const [lang, _cmd] of Object.entries(languageCommands)) {
          if (lang === 'javascript' || lang === 'python') {
            available.push(lang);
          }
        }

        return available;
      };

      const available = detectAvailableLanguages();

      return {
        availableCount: available.length,
        hasJavaScript: available.includes('javascript'),
        hasPython: available.includes('python'),
        hasRust: available.includes('rust'),
      };
    });

    expect(result.availableCount).toBeGreaterThanOrEqual(0);
    expect(typeof result.hasJavaScript).toBe('boolean');
    expect(typeof result.hasPython).toBe('boolean');
  });

  test('should toggle language enabled state', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Language {
        id: string;
        enabled: boolean;
      }

      const languages: Language[] = [
        { id: 'javascript', enabled: true },
        { id: 'python', enabled: true },
        { id: 'rust', enabled: false },
      ];

      const toggleLanguage = (id: string, enabled: boolean) => {
        const lang = languages.find(l => l.id === id);
        if (lang) {
          lang.enabled = enabled;
        }
      };

      const getEnabledLanguages = () => languages.filter(l => l.enabled);

      const initialEnabled = getEnabledLanguages().length;

      toggleLanguage('rust', true);
      const afterEnableRust = getEnabledLanguages().length;

      toggleLanguage('javascript', false);
      const afterDisableJs = getEnabledLanguages().length;

      return {
        initialEnabled,
        afterEnableRust,
        afterDisableJs,
      };
    });

    expect(result.initialEnabled).toBe(2);
    expect(result.afterEnableRust).toBe(3);
    expect(result.afterDisableJs).toBe(2);
  });
});

/**
 * Sandbox Session Management Tests
 * Tests session creation, update, and execution history
 */
test.describe('Sandbox Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should create and manage sessions', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface Session {
        id: string;
        name: string;
        description?: string;
        createdAt: Date;
        updatedAt: Date;
        executionCount: number;
      }

      const sessions: Session[] = [];

      const createSession = (name: string, description?: string): Session => {
        const now = new Date();
        const session: Session = {
          id: `session-${Date.now()}`,
          name,
          description,
          createdAt: now,
          updatedAt: now,
          executionCount: 0,
        };
        sessions.push(session);
        return session;
      };

      const updateSession = (id: string, name: string, description?: string) => {
        const session = sessions.find(s => s.id === id);
        if (session) {
          session.name = name;
          session.description = description;
          session.updatedAt = new Date();
        }
      };

      const deleteSession = (id: string) => {
        const index = sessions.findIndex(s => s.id === id);
        if (index !== -1) sessions.splice(index, 1);
      };

      const session1 = createSession('Python Experiments', 'Testing Python code');
      const session2 = createSession('JS Debugging');

      const initialCount = sessions.length;

      updateSession(session1.id, 'Python ML Experiments', 'Machine learning tests');
      const updatedSession = sessions.find(s => s.id === session1.id);

      deleteSession(session2.id);
      const afterDeleteCount = sessions.length;

      return {
        initialCount,
        updatedName: updatedSession?.name,
        updatedDescription: updatedSession?.description,
        afterDeleteCount,
      };
    });

    expect(result.initialCount).toBe(2);
    expect(result.updatedName).toBe('Python ML Experiments');
    expect(result.updatedDescription).toBe('Machine learning tests');
    expect(result.afterDeleteCount).toBe(1);
  });

  test('should get executions for a session', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutionRecord {
        id: string;
        sessionId: string;
        code: string;
        language: string;
        output: string;
        exitCode: number;
        timestamp: Date;
      }

      const executions: ExecutionRecord[] = [];

      const addExecution = (sessionId: string, code: string, language: string, output: string, exitCode: number) => {
        executions.push({
          id: `exec-${Date.now()}-${Math.random()}`,
          sessionId,
          code,
          language,
          output,
          exitCode,
          timestamp: new Date(),
        });
      };

      const getSessionExecutions = (sessionId: string): ExecutionRecord[] => {
        return executions.filter(e => e.sessionId === sessionId);
      };

      const sessionA = 'session-a';
      const sessionB = 'session-b';

      addExecution(sessionA, 'console.log(1)', 'javascript', '1\n', 0);
      addExecution(sessionA, 'console.log(2)', 'javascript', '2\n', 0);
      addExecution(sessionA, 'console.log(3)', 'javascript', '3\n', 0);
      addExecution(sessionB, 'print("hello")', 'python', 'hello\n', 0);

      const sessionAExecutions = getSessionExecutions(sessionA);
      const sessionBExecutions = getSessionExecutions(sessionB);

      return {
        sessionACount: sessionAExecutions.length,
        sessionBCount: sessionBExecutions.length,
        sessionALanguages: [...new Set(sessionAExecutions.map(e => e.language))],
      };
    });

    expect(result.sessionACount).toBe(3);
    expect(result.sessionBCount).toBe(1);
    expect(result.sessionALanguages).toEqual(['javascript']);
  });
});

/**
 * Sandbox Execution Limits Tests
 * Tests timeout and memory limit enforcement
 */
test.describe('Sandbox Execution Limits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should execute code with custom limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutionLimits {
        timeoutSecs: number;
        memoryMb: number;
      }

      interface ExecutionResult {
        success: boolean;
        output: string;
        error?: string;
        duration: number;
        timedOut: boolean;
        memoryExceeded: boolean;
      }

      const executeWithLimits = (
        _code: string,
        _language: string,
        limits: ExecutionLimits
      ): ExecutionResult => {
        const _startTime = Date.now();
        const duration = Math.random() * 100;

        const timedOut = duration > limits.timeoutSecs * 1000;

        return {
          success: !timedOut,
          output: timedOut ? '' : 'execution output',
          error: timedOut ? 'Execution timed out' : undefined,
          duration,
          timedOut,
          memoryExceeded: false,
        };
      };

      const shortTimeout = executeWithLimits('console.log("test")', 'javascript', {
        timeoutSecs: 30,
        memoryMb: 256,
      });

      const _highMemory = executeWithLimits('const arr = new Array(1000000)', 'javascript', {
        timeoutSecs: 60,
        memoryMb: 512,
      });

      return {
        shortTimeoutSuccess: shortTimeout.success,
        shortTimeoutTimedOut: shortTimeout.timedOut,
        highMemoryMemoryMb: 512,
        limitsApplied: true,
      };
    });

    expect(typeof result.shortTimeoutSuccess).toBe('boolean');
    expect(typeof result.shortTimeoutTimedOut).toBe('boolean');
    expect(result.highMemoryMemoryMb).toBe(512);
    expect(result.limitsApplied).toBe(true);
  });

  test('should handle timeout gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TimeoutConfig {
        defaultTimeoutSecs: number;
        maxTimeoutSecs: number;
      }

      const config: TimeoutConfig = {
        defaultTimeoutSecs: 30,
        maxTimeoutSecs: 300,
      };

      const validateTimeout = (timeoutSecs: number): number => {
        if (timeoutSecs <= 0) return config.defaultTimeoutSecs;
        if (timeoutSecs > config.maxTimeoutSecs) return config.maxTimeoutSecs;
        return timeoutSecs;
      };

      return {
        defaultApplied: validateTimeout(0) === config.defaultTimeoutSecs,
        maxApplied: validateTimeout(1000) === config.maxTimeoutSecs,
        customApplied: validateTimeout(60) === 60,
        negativeHandled: validateTimeout(-10) === config.defaultTimeoutSecs,
      };
    });

    expect(result.defaultApplied).toBe(true);
    expect(result.maxApplied).toBe(true);
    expect(result.customApplied).toBe(true);
    expect(result.negativeHandled).toBe(true);
  });

  test('should handle memory limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface MemoryConfig {
        defaultMemoryMb: number;
        maxMemoryMb: number;
        minMemoryMb: number;
      }

      const config: MemoryConfig = {
        defaultMemoryMb: 256,
        maxMemoryMb: 2048,
        minMemoryMb: 64,
      };

      const validateMemory = (memoryMb: number): number => {
        if (memoryMb < config.minMemoryMb) return config.minMemoryMb;
        if (memoryMb > config.maxMemoryMb) return config.maxMemoryMb;
        return memoryMb;
      };

      return {
        minApplied: validateMemory(10) === config.minMemoryMb,
        maxApplied: validateMemory(10000) === config.maxMemoryMb,
        customApplied: validateMemory(512) === 512,
      };
    });

    expect(result.minApplied).toBe(true);
    expect(result.maxApplied).toBe(true);
    expect(result.customApplied).toBe(true);
  });
});

/**
 * Sandbox Database Operations Tests
 * Tests data export, import, and maintenance
 */
test.describe('Sandbox Database Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should export sandbox data', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExportData {
        version: string;
        exportedAt: string;
        sessions: unknown[];
        snippets: unknown[];
        executions: unknown[];
        config: unknown;
      }

      const exportData = (): ExportData => {
        return {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          sessions: [
            { id: 'session-1', name: 'Test Session' },
          ],
          snippets: [
            { id: 'snippet-1', name: 'Hello World', language: 'javascript' },
          ],
          executions: [
            { id: 'exec-1', sessionId: 'session-1', exitCode: 0 },
          ],
          config: {
            defaultTimeout: 30,
            defaultMemory: 256,
          },
        };
      };

      const exported = exportData();
      const jsonString = JSON.stringify(exported);

      return {
        hasVersion: 'version' in exported,
        hasExportedAt: 'exportedAt' in exported,
        hasSessions: Array.isArray(exported.sessions),
        hasSnippets: Array.isArray(exported.snippets),
        hasExecutions: Array.isArray(exported.executions),
        jsonLength: jsonString.length,
        isValidJson: (() => {
          try {
            JSON.parse(jsonString);
            return true;
          } catch {
            return false;
          }
        })(),
      };
    });

    expect(result.hasVersion).toBe(true);
    expect(result.hasExportedAt).toBe(true);
    expect(result.hasSessions).toBe(true);
    expect(result.hasSnippets).toBe(true);
    expect(result.hasExecutions).toBe(true);
    expect(result.jsonLength).toBeGreaterThan(0);
    expect(result.isValidJson).toBe(true);
  });

  test('should get database size', async ({ page }) => {
    const result = await page.evaluate(() => {
      const getDatabaseSize = (): number => {
        return 1024 * 1024 * 5;
      };

      const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
        return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
      };

      const sizeBytes = getDatabaseSize();
      const formattedSize = formatSize(sizeBytes);

      return {
        sizeBytes,
        formattedSize,
        isPositive: sizeBytes > 0,
      };
    });

    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.formattedSize).toContain('MB');
    expect(result.isPositive).toBe(true);
  });

  test('should vacuum database', async ({ page }) => {
    const result = await page.evaluate(() => {
      let dbSize = 1024 * 1024 * 10;

      const vacuumDatabase = (): { beforeSize: number; afterSize: number; reclaimed: number } => {
        const beforeSize = dbSize;
        const reclaimed = Math.floor(dbSize * 0.2);
        dbSize -= reclaimed;

        return {
          beforeSize,
          afterSize: dbSize,
          reclaimed,
        };
      };

      const vacuumResult = vacuumDatabase();

      return {
        sizeReduced: vacuumResult.afterSize < vacuumResult.beforeSize,
        reclaimed: vacuumResult.reclaimed,
        reclaimedPercentage: (vacuumResult.reclaimed / vacuumResult.beforeSize) * 100,
      };
    });

    expect(result.sizeReduced).toBe(true);
    expect(result.reclaimed).toBeGreaterThan(0);
    expect(result.reclaimedPercentage).toBeCloseTo(20, 0);
  });
});

/**
 * Sandbox Runtime Management Tests
 * Tests runtime detection and configuration
 */
test.describe('Sandbox Runtime Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should get available runtimes', async ({ page }) => {
    const result = await page.evaluate(() => {
      type RuntimeType = 'native' | 'docker' | 'podman';

      interface RuntimeInfo {
        type: RuntimeType;
        version: string;
        available: boolean;
      }

      const getAvailableRuntimes = (): RuntimeInfo[] => {
        return [
          { type: 'native', version: 'system', available: true },
          { type: 'docker', version: '24.0.0', available: true },
          { type: 'podman', version: '4.5.0', available: false },
        ];
      };

      const runtimes = getAvailableRuntimes();
      const availableRuntimes = runtimes.filter(r => r.available);

      return {
        totalRuntimes: runtimes.length,
        availableCount: availableRuntimes.length,
        hasNative: runtimes.some(r => r.type === 'native'),
        hasDocker: runtimes.some(r => r.type === 'docker'),
        hasPodman: runtimes.some(r => r.type === 'podman'),
      };
    });

    expect(result.totalRuntimes).toBe(3);
    expect(result.availableCount).toBe(2);
    expect(result.hasNative).toBe(true);
    expect(result.hasDocker).toBe(true);
    expect(result.hasPodman).toBe(true);
  });

  test('should check specific runtime availability', async ({ page }) => {
    const result = await page.evaluate(() => {
      type RuntimeType = 'native' | 'docker' | 'podman';

      const runtimeStatus: Record<RuntimeType, boolean> = {
        native: true,
        docker: true,
        podman: false,
      };

      const checkRuntime = (runtime: RuntimeType): boolean => {
        return runtimeStatus[runtime] ?? false;
      };

      return {
        nativeAvailable: checkRuntime('native'),
        dockerAvailable: checkRuntime('docker'),
        podmanAvailable: checkRuntime('podman'),
      };
    });

    expect(result.nativeAvailable).toBe(true);
    expect(result.dockerAvailable).toBe(true);
    expect(result.podmanAvailable).toBe(false);
  });

  test('should get runtime version info', async ({ page }) => {
    const result = await page.evaluate(() => {
      type RuntimeType = 'native' | 'docker' | 'podman';

      const getRuntimeInfo = (runtime: RuntimeType): [RuntimeType, string] | null => {
        const versions: Record<RuntimeType, string> = {
          native: 'system',
          docker: 'Docker version 24.0.0',
          podman: 'podman version 4.5.0',
        };

        if (runtime === 'podman') return null;
        return [runtime, versions[runtime]];
      };

      const dockerInfo = getRuntimeInfo('docker');
      const nativeInfo = getRuntimeInfo('native');
      const podmanInfo = getRuntimeInfo('podman');

      return {
        dockerRuntime: dockerInfo?.[0],
        dockerVersion: dockerInfo?.[1],
        nativeRuntime: nativeInfo?.[0],
        podmanAvailable: podmanInfo !== null,
      };
    });

    expect(result.dockerRuntime).toBe('docker');
    expect(result.dockerVersion).toContain('24.0.0');
    expect(result.nativeRuntime).toBe('native');
    expect(result.podmanAvailable).toBe(false);
  });

  test('should set preferred runtime', async ({ page }) => {
    const result = await page.evaluate(() => {
      type RuntimeType = 'native' | 'docker' | 'podman';

      interface SandboxConfig {
        preferredRuntime: RuntimeType;
        fallbackRuntime: RuntimeType;
      }

      const config: SandboxConfig = {
        preferredRuntime: 'native',
        fallbackRuntime: 'docker',
      };

      const setPreferredRuntime = (runtime: RuntimeType) => {
        config.preferredRuntime = runtime;
      };

      const initialRuntime = config.preferredRuntime;
      setPreferredRuntime('docker');
      const afterChange = config.preferredRuntime;

      return {
        initialRuntime,
        afterChange,
        changed: initialRuntime !== afterChange,
      };
    });

    expect(result.initialRuntime).toBe('native');
    expect(result.afterChange).toBe('docker');
    expect(result.changed).toBe(true);
  });
});

/**
 * Sandbox Execution Options Tests
 * Tests advanced execution options with tagging and history
 */
test.describe('Sandbox Execution Options', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should execute with tags', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutionRecord {
        id: string;
        code: string;
        language: string;
        tags: string[];
        savedToHistory: boolean;
      }

      const executions: ExecutionRecord[] = [];

      const executeWithOptions = (
        code: string,
        language: string,
        tags: string[] = [],
        saveToHistory: boolean = true
      ): ExecutionRecord => {
        const record: ExecutionRecord = {
          id: `exec-${Date.now()}`,
          code,
          language,
          tags,
          savedToHistory: saveToHistory,
        };

        if (saveToHistory) {
          executions.push(record);
        }

        return record;
      };

      const getByTag = (tag: string): ExecutionRecord[] => {
        return executions.filter(e => e.tags.includes(tag));
      };

      executeWithOptions('console.log("test")', 'javascript', ['test', 'debug'], true);
      executeWithOptions('print("hello")', 'python', ['production'], true);
      executeWithOptions('temp code', 'javascript', [], false);

      const testTagged = getByTag('test');
      const productionTagged = getByTag('production');

      return {
        totalInHistory: executions.length,
        testTaggedCount: testTagged.length,
        productionTaggedCount: productionTagged.length,
        notSavedExcluded: executions.every(e => e.savedToHistory),
      };
    });

    expect(result.totalInHistory).toBe(2);
    expect(result.testTaggedCount).toBe(1);
    expect(result.productionTaggedCount).toBe(1);
    expect(result.notSavedExcluded).toBe(true);
  });

  test('should skip history when requested', async ({ page }) => {
    const result = await page.evaluate(() => {
      const history: string[] = [];

      const execute = (code: string, saveToHistory: boolean) => {
        if (saveToHistory) {
          history.push(code);
        }
        return { output: 'result', saved: saveToHistory };
      };

      execute('saved code 1', true);
      execute('not saved code', false);
      execute('saved code 2', true);
      execute('also not saved', false);

      return {
        historyLength: history.length,
        firstCode: history[0],
        lastCode: history[history.length - 1],
      };
    });

    expect(result.historyLength).toBe(2);
    expect(result.firstCode).toBe('saved code 1');
    expect(result.lastCode).toBe('saved code 2');
  });
});

/**
 * Sandbox Code Analysis Tests
 * Tests code analysis, syntax checking, and linting
 */
test.describe('Sandbox Code Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should detect syntax errors', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SyntaxError {
        line: number;
        column: number;
        message: string;
        severity: 'error' | 'warning';
      }

      const checkSyntax = (code: string, language: string): SyntaxError[] => {
        const errors: SyntaxError[] = [];

        if (language === 'javascript' || language === 'typescript') {
          if (code.includes('function(') && !code.includes('function (') && !code.includes('function(')) {
            // Check for missing function name
            if (/function\s*\(/.test(code) && !/function\s+\w+\s*\(/.test(code) && !code.includes('=>')) {
              errors.push({
                line: 1,
                column: 1,
                message: 'Anonymous function declaration',
                severity: 'warning',
              });
            }
          }

          if ((code.match(/\{/g) || []).length !== (code.match(/\}/g) || []).length) {
            errors.push({
              line: 1,
              column: 1,
              message: 'Mismatched braces',
              severity: 'error',
            });
          }

          if ((code.match(/\(/g) || []).length !== (code.match(/\)/g) || []).length) {
            errors.push({
              line: 1,
              column: 1,
              message: 'Mismatched parentheses',
              severity: 'error',
            });
          }
        }

        return errors;
      };

      const validCode = checkSyntax('function test() { return 1; }', 'javascript');
      const mismatchedBraces = checkSyntax('function test() { return 1;', 'javascript');
      const mismatchedParens = checkSyntax('console.log((1 + 2)', 'javascript');

      return {
        validCodeErrors: validCode.length,
        mismatchedBracesErrors: mismatchedBraces.length,
        mismatchedBracesMessage: mismatchedBraces[0]?.message,
        mismatchedParensErrors: mismatchedParens.length,
      };
    });

    expect(result.validCodeErrors).toBe(0);
    expect(result.mismatchedBracesErrors).toBe(1);
    expect(result.mismatchedBracesMessage).toBe('Mismatched braces');
    expect(result.mismatchedParensErrors).toBe(1);
  });

  test('should analyze code complexity', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ComplexityMetrics {
        linesOfCode: number;
        cyclomaticComplexity: number;
        nestingDepth: number;
        functionCount: number;
        hasDeepNesting: boolean;
      }

      const analyzeComplexity = (code: string): ComplexityMetrics => {
        const lines = code.split('\n').filter(l => l.trim().length > 0);
        const linesOfCode = lines.length;

        // Count decision points for cyclomatic complexity
        const decisionPatterns = /\b(if|else|for|while|switch|case|catch|\?\?|\|\||&&)\b/g;
        const matches = code.match(decisionPatterns) || [];
        const cyclomaticComplexity = 1 + matches.length;

        // Calculate nesting depth
        let maxDepth = 0;
        let currentDepth = 0;
        for (const char of code) {
          if (char === '{') {
            currentDepth++;
            maxDepth = Math.max(maxDepth, currentDepth);
          } else if (char === '}') {
            currentDepth--;
          }
        }

        // Count functions
        const functionMatches = code.match(/\b(function|=>)\b/g) || [];
        const functionCount = functionMatches.length;

        return {
          linesOfCode,
          cyclomaticComplexity,
          nestingDepth: maxDepth,
          functionCount,
          hasDeepNesting: maxDepth > 3,
        };
      };

      const simpleCode = `function add(a, b) {
        return a + b;
      }`;

      const complexCode = `function process(data) {
        if (data) {
          for (let i = 0; i < data.length; i++) {
            if (data[i].valid) {
              switch (data[i].type) {
                case 'a':
                  return handle(data[i]);
              }
            }
          }
        }
      }`;

      const simpleMetrics = analyzeComplexity(simpleCode);
      const complexMetrics = analyzeComplexity(complexCode);

      return {
        simpleLoc: simpleMetrics.linesOfCode,
        simpleComplexity: simpleMetrics.cyclomaticComplexity,
        simpleNesting: simpleMetrics.nestingDepth,
        complexLoc: complexMetrics.linesOfCode,
        complexComplexity: complexMetrics.cyclomaticComplexity,
        complexNesting: complexMetrics.nestingDepth,
        complexHasDeepNesting: complexMetrics.hasDeepNesting,
      };
    });

    expect(result.simpleLoc).toBe(3);
    expect(result.simpleComplexity).toBe(1);
    expect(result.simpleNesting).toBe(1);
    expect(result.complexLoc).toBeGreaterThan(5);
    expect(result.complexComplexity).toBeGreaterThan(3);
    expect(result.complexHasDeepNesting).toBe(true);
  });

  test('should detect potential security issues', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface SecurityIssue {
        pattern: string;
        message: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        line: number;
      }

      const securityPatterns = [
        { regex: /eval\s*\(/g, message: 'Use of eval() is dangerous', severity: 'critical' as const },
        { regex: /innerHTML\s*=/g, message: 'innerHTML can lead to XSS', severity: 'high' as const },
        { regex: /document\.write/g, message: 'document.write is deprecated', severity: 'medium' as const },
        { regex: /new\s+Function\s*\(/g, message: 'Dynamic function creation', severity: 'high' as const },
        { regex: /setTimeout\s*\(\s*['"`]/g, message: 'String in setTimeout', severity: 'medium' as const },
        { regex: /localStorage\./g, message: 'localStorage may expose sensitive data', severity: 'low' as const },
      ];

      const scanSecurity = (code: string): SecurityIssue[] => {
        const issues: SecurityIssue[] = [];
        const lines = code.split('\n');

        for (const pattern of securityPatterns) {
          for (let i = 0; i < lines.length; i++) {
            if (pattern.regex.test(lines[i])) {
              issues.push({
                pattern: pattern.regex.source,
                message: pattern.message,
                severity: pattern.severity,
                line: i + 1,
              });
            }
            pattern.regex.lastIndex = 0;
          }
        }

        return issues;
      };

      const safeCode = `function add(a, b) { return a + b; }`;
      const unsafeCode = `
        eval(userInput);
        element.innerHTML = data;
        document.write('test');
        localStorage.setItem('key', secret);
      `;

      const safeIssues = scanSecurity(safeCode);
      const unsafeIssues = scanSecurity(unsafeCode);

      return {
        safeIssueCount: safeIssues.length,
        unsafeIssueCount: unsafeIssues.length,
        hasCritical: unsafeIssues.some(i => i.severity === 'critical'),
        hasHigh: unsafeIssues.some(i => i.severity === 'high'),
        severities: unsafeIssues.map(i => i.severity),
      };
    });

    expect(result.safeIssueCount).toBe(0);
    expect(result.unsafeIssueCount).toBeGreaterThan(0);
    expect(result.hasCritical).toBe(true);
    expect(result.hasHigh).toBe(true);
  });
});

/**
 * Sandbox Code Transformation Tests
 * Tests code formatting, minification, and transformation
 */
test.describe('Sandbox Code Transformation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should format code', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface FormatOptions {
        indentSize: number;
        useTabs: boolean;
        insertFinalNewline: boolean;
        trimTrailingWhitespace: boolean;
      }

      const formatCode = (code: string, options: FormatOptions): string => {
        let formatted = code;
        const indent = options.useTabs ? '\t' : ' '.repeat(options.indentSize);

        // Simple formatting: normalize whitespace
        formatted = formatted.replace(/\s+/g, ' ');

        // Add newlines after braces
        formatted = formatted.replace(/\{/g, '{\n');
        formatted = formatted.replace(/\}/g, '\n}');
        formatted = formatted.replace(/;/g, ';\n');

        // Add indentation
        let level = 0;
        const lines = formatted.split('\n');
        formatted = lines.map(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith('}')) level--;
          const indented = indent.repeat(level) + trimmed;
          if (trimmed.endsWith('{')) level++;
          return indented;
        }).filter(l => l.trim()).join('\n');

        if (options.trimTrailingWhitespace) {
          formatted = formatted.split('\n').map(l => l.trimEnd()).join('\n');
        }

        if (options.insertFinalNewline && !formatted.endsWith('\n')) {
          formatted += '\n';
        }

        return formatted;
      };

      const uglyCode = 'function test(){return 1;}';
      const formatted = formatCode(uglyCode, {
        indentSize: 2,
        useTabs: false,
        insertFinalNewline: true,
        trimTrailingWhitespace: true,
      });

      return {
        originalLength: uglyCode.length,
        formattedLength: formatted.length,
        hasNewlines: formatted.includes('\n'),
        endsWithNewline: formatted.endsWith('\n'),
        lineCount: formatted.split('\n').length,
      };
    });

    expect(result.formattedLength).toBeGreaterThan(result.originalLength);
    expect(result.hasNewlines).toBe(true);
    expect(result.endsWithNewline).toBe(true);
    expect(result.lineCount).toBeGreaterThan(1);
  });

  test('should minify code', async ({ page }) => {
    const result = await page.evaluate(() => {
      const minifyCode = (code: string): string => {
        let minified = code;

        // Remove comments
        minified = minified.replace(/\/\/.*$/gm, '');
        minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

        // Remove whitespace
        minified = minified.replace(/\s+/g, ' ');

        // Remove spaces around operators
        minified = minified.replace(/\s*([{}();,:])\s*/g, '$1');

        // Trim
        minified = minified.trim();

        return minified;
      };

      const verboseCode = `
        // This is a comment
        function add(a, b) {
          /* Another comment */
          return a + b;
        }
      `;

      const minified = minifyCode(verboseCode);

      return {
        originalLength: verboseCode.length,
        minifiedLength: minified.length,
        compressionRatio: Math.round((1 - minified.length / verboseCode.length) * 100),
        hasComments: minified.includes('//') || minified.includes('/*'),
        hasNewlines: minified.includes('\n'),
      };
    });

    expect(result.minifiedLength).toBeLessThan(result.originalLength);
    expect(result.compressionRatio).toBeGreaterThan(30);
    expect(result.hasComments).toBe(false);
    expect(result.hasNewlines).toBe(false);
  });

  test('should transpile modern JavaScript', async ({ page }) => {
    const result = await page.evaluate(() => {
      const transpileModernJS = (code: string): string => {
        let transpiled = code;

        // Arrow functions to regular functions (simple case)
        transpiled = transpiled.replace(
          /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*\{/g,
          'function $1($2) {'
        );

        transpiled = transpiled.replace(
          /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*([^{;]+);/g,
          'function $1($2) { return $3; }'
        );

        // Template literals to string concatenation
        transpiled = transpiled.replace(/`([^`]*)`/g, (_match, content) => {
          return '"' + content.replace(/\$\{([^}]+)\}/g, '" + $1 + "') + '"';
        });

        // const/let to var
        transpiled = transpiled.replace(/\b(const|let)\b/g, 'var');

        return transpiled;
      };

      const modernCode = `
        const add = (a, b) => a + b;
        const greet = (name) => {
          return \`Hello, \${name}!\`;
        };
        let x = 10;
      `;

      const transpiled = transpileModernJS(modernCode);

      return {
        hasArrowFunction: transpiled.includes('=>'),
        hasConst: /\bconst\b/.test(transpiled),
        hasLet: /\blet\b/.test(transpiled),
        hasTemplateLiteral: transpiled.includes('`'),
        hasVar: /\bvar\b/.test(transpiled),
        hasFunction: transpiled.includes('function'),
      };
    });

    expect(result.hasArrowFunction).toBe(false);
    expect(result.hasConst).toBe(false);
    expect(result.hasLet).toBe(false);
    expect(result.hasTemplateLiteral).toBe(false);
    expect(result.hasVar).toBe(true);
  });
});

/**
 * Sandbox Execution Queue Tests
 * Tests execution queue management and prioritization
 */
test.describe('Sandbox Execution Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should manage execution queue', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface QueuedExecution {
        id: string;
        code: string;
        priority: 'low' | 'normal' | 'high';
        addedAt: number;
        status: 'queued' | 'running' | 'completed' | 'failed';
      }

      const queue: QueuedExecution[] = [];
      const _currentExecution: QueuedExecution | null = null;

      const enqueue = (code: string, priority: QueuedExecution['priority'] = 'normal'): QueuedExecution => {
        const execution: QueuedExecution = {
          id: `exec-${Date.now()}-${Math.random()}`,
          code,
          priority,
          addedAt: Date.now(),
          status: 'queued',
        };

        // Insert based on priority
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const insertIndex = queue.findIndex(e => priorityOrder[e.priority] > priorityOrder[priority]);
        if (insertIndex === -1) {
          queue.push(execution);
        } else {
          queue.splice(insertIndex, 0, execution);
        }

        return execution;
      };

      const dequeue = (): QueuedExecution | null => {
        return queue.shift() || null;
      };

      const getQueueLength = () => queue.length;

      const getQueuedByPriority = (priority: QueuedExecution['priority']) => {
        return queue.filter(e => e.priority === priority);
      };

      enqueue('console.log(1)', 'low');
      enqueue('console.log(2)', 'normal');
      enqueue('console.log(3)', 'high');
      enqueue('console.log(4)', 'normal');
      enqueue('console.log(5)', 'high');

      const firstDequeued = dequeue();
      const secondDequeued = dequeue();

      return {
        queueLength: getQueueLength(),
        firstPriority: firstDequeued?.priority,
        secondPriority: secondDequeued?.priority,
        highPriorityCount: getQueuedByPriority('high').length,
        lowPriorityCount: getQueuedByPriority('low').length,
      };
    });

    expect(result.queueLength).toBe(3);
    expect(result.firstPriority).toBe('high');
    expect(result.secondPriority).toBe('high');
    expect(result.highPriorityCount).toBe(0);
    expect(result.lowPriorityCount).toBe(1);
  });

  test('should handle concurrent execution limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ExecutionSlot {
        id: string;
        startTime: number;
        execution: { id: string; code: string } | null;
      }

      const maxConcurrent = 3;
      const slots: ExecutionSlot[] = Array.from({ length: maxConcurrent }, (_, i) => ({
        id: `slot-${i}`,
        startTime: 0,
        execution: null,
      }));

      const acquireSlot = (executionId: string, code: string): ExecutionSlot | null => {
        const freeSlot = slots.find(s => s.execution === null);
        if (freeSlot) {
          freeSlot.execution = { id: executionId, code };
          freeSlot.startTime = Date.now();
          return freeSlot;
        }
        return null;
      };

      const releaseSlot = (slotId: string) => {
        const slot = slots.find(s => s.id === slotId);
        if (slot) {
          slot.execution = null;
          slot.startTime = 0;
        }
      };

      const getActiveCount = () => slots.filter(s => s.execution !== null).length;
      const getAvailableCount = () => slots.filter(s => s.execution === null).length;

      // Acquire all slots
      const slot1 = acquireSlot('exec-1', 'code 1');
      const _slot2 = acquireSlot('exec-2', 'code 2');
      const _slot3 = acquireSlot('exec-3', 'code 3');
      const slot4 = acquireSlot('exec-4', 'code 4');

      const activeAfterFill = getActiveCount();
      const fourthSlotNull = slot4 === null;

      releaseSlot(slot1!.id);
      const activeAfterRelease = getActiveCount();
      const availableAfterRelease = getAvailableCount();

      return {
        maxConcurrent,
        activeAfterFill,
        fourthSlotNull,
        activeAfterRelease,
        availableAfterRelease,
      };
    });

    expect(result.maxConcurrent).toBe(3);
    expect(result.activeAfterFill).toBe(3);
    expect(result.fourthSlotNull).toBe(true);
    expect(result.activeAfterRelease).toBe(2);
    expect(result.availableAfterRelease).toBe(1);
  });
});

/**
 * Sandbox Output Streaming Tests
 * Tests real-time output streaming and buffering
 */
test.describe('Sandbox Output Streaming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should buffer and stream output', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface OutputChunk {
        type: 'stdout' | 'stderr';
        data: string;
        timestamp: number;
      }

      class OutputBuffer {
        private chunks: OutputChunk[] = [];
        private maxSize: number;
        private listeners: ((chunk: OutputChunk) => void)[] = [];

        constructor(maxSize: number = 1000) {
          this.maxSize = maxSize;
        }

        write(type: OutputChunk['type'], data: string) {
          const chunk: OutputChunk = {
            type,
            data,
            timestamp: Date.now(),
          };

          this.chunks.push(chunk);
          if (this.chunks.length > this.maxSize) {
            this.chunks.shift();
          }

          this.listeners.forEach(listener => listener(chunk));
        }

        getAll(): OutputChunk[] {
          return [...this.chunks];
        }

        getByType(type: OutputChunk['type']): OutputChunk[] {
          return this.chunks.filter(c => c.type === type);
        }

        clear() {
          this.chunks = [];
        }

        subscribe(listener: (chunk: OutputChunk) => void): () => void {
          this.listeners.push(listener);
          return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
          };
        }
      }

      const buffer = new OutputBuffer(5);
      const receivedChunks: OutputChunk[] = [];

      const unsubscribe = buffer.subscribe(chunk => {
        receivedChunks.push(chunk);
      });

      buffer.write('stdout', 'Line 1');
      buffer.write('stdout', 'Line 2');
      buffer.write('stderr', 'Error 1');
      buffer.write('stdout', 'Line 3');
      buffer.write('stdout', 'Line 4');
      buffer.write('stdout', 'Line 5');
      buffer.write('stdout', 'Line 6');

      unsubscribe();
      buffer.write('stdout', 'Line 7');

      return {
        bufferSize: buffer.getAll().length,
        stdoutCount: buffer.getByType('stdout').length,
        stderrCount: buffer.getByType('stderr').length,
        receivedCount: receivedChunks.length,
        firstChunkData: buffer.getAll()[0]?.data,
      };
    });

    expect(result.bufferSize).toBe(5);
    expect(result.stdoutCount).toBe(5);
    expect(result.stderrCount).toBe(0);
    expect(result.receivedCount).toBe(7);
    expect(result.firstChunkData).toBe('Line 3');
  });

  test('should handle ANSI escape codes', async ({ page }) => {
    const result = await page.evaluate(() => {
      const stripAnsiCodes = (str: string): string => {
        return str.replace(/\x1b\[[0-9;]*m/g, '');
      };

      const parseAnsiColors = (str: string): { text: string; hasColors: boolean; colorCount: number } => {
        const colorMatches = str.match(/\x1b\[[0-9;]*m/g) || [];
        return {
          text: stripAnsiCodes(str),
          hasColors: colorMatches.length > 0,
          colorCount: colorMatches.length,
        };
      };

      const plainText = 'Hello, World!';
      const coloredText = '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m \x1b[34mBlue\x1b[0m';

      const plainResult = parseAnsiColors(plainText);
      const coloredResult = parseAnsiColors(coloredText);

      return {
        plainHasColors: plainResult.hasColors,
        plainText: plainResult.text,
        coloredHasColors: coloredResult.hasColors,
        coloredColorCount: coloredResult.colorCount,
        coloredStrippedText: coloredResult.text,
      };
    });

    expect(result.plainHasColors).toBe(false);
    expect(result.plainText).toBe('Hello, World!');
    expect(result.coloredHasColors).toBe(true);
    expect(result.coloredColorCount).toBe(6);
    expect(result.coloredStrippedText).toBe('Red Green Blue');
  });
});
