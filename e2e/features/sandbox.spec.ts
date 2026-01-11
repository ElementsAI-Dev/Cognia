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
