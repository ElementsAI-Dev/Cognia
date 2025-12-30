import { test, expect } from '@playwright/test';

/**
 * Token Count E2E Tests
 * Tests token counting and estimation functionality
 */
test.describe('Token Count', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should estimate token count for text', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Simple token estimation (approximation)
      const estimateTokens = (text: string): number => {
        if (!text) return 0;
        // Rough estimate: ~4 characters per token for English
        // This is a simplified version of actual tokenization
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const charCount = text.length;
        
        // Use a combination of word count and character count
        const wordEstimate = words.length * 1.3;
        const charEstimate = charCount / 4;
        
        return Math.ceil((wordEstimate + charEstimate) / 2);
      };

      const shortText = 'Hello world';
      const mediumText = 'The quick brown fox jumps over the lazy dog. This is a sample sentence for testing token estimation.';
      const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
      const codeText = 'function greet(name: string): string { return `Hello, ${name}!`; }';

      return {
        shortTokens: estimateTokens(shortText),
        mediumTokens: estimateTokens(mediumText),
        longTokens: estimateTokens(longText),
        codeTokens: estimateTokens(codeText),
        emptyTokens: estimateTokens(''),
      };
    });

    expect(result.shortTokens).toBeGreaterThan(0);
    expect(result.mediumTokens).toBeGreaterThan(result.shortTokens);
    expect(result.longTokens).toBeGreaterThan(result.mediumTokens);
    expect(result.codeTokens).toBeGreaterThan(0);
    expect(result.emptyTokens).toBe(0);
  });

  test('should track token usage', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface TokenUsage {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        estimatedCost: number;
      }

      interface TokenTracker {
        history: TokenUsage[];
        totalPromptTokens: number;
        totalCompletionTokens: number;
      }

      const tracker: TokenTracker = {
        history: [],
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
      };

      const recordUsage = (usage: TokenUsage) => {
        tracker.history.push(usage);
        tracker.totalPromptTokens += usage.promptTokens;
        tracker.totalCompletionTokens += usage.completionTokens;
      };

      const getTotalTokens = () => {
        return tracker.totalPromptTokens + tracker.totalCompletionTokens;
      };

      const getAverageUsage = (): TokenUsage | null => {
        if (tracker.history.length === 0) return null;
        
        const totals = tracker.history.reduce(
          (acc, u) => ({
            promptTokens: acc.promptTokens + u.promptTokens,
            completionTokens: acc.completionTokens + u.completionTokens,
            totalTokens: acc.totalTokens + u.totalTokens,
            estimatedCost: acc.estimatedCost + u.estimatedCost,
          }),
          { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCost: 0 }
        );

        const count = tracker.history.length;
        return {
          promptTokens: Math.round(totals.promptTokens / count),
          completionTokens: Math.round(totals.completionTokens / count),
          totalTokens: Math.round(totals.totalTokens / count),
          estimatedCost: totals.estimatedCost / count,
        };
      };

      // Record some usage
      recordUsage({ promptTokens: 100, completionTokens: 200, totalTokens: 300, estimatedCost: 0.003 });
      recordUsage({ promptTokens: 150, completionTokens: 250, totalTokens: 400, estimatedCost: 0.004 });
      recordUsage({ promptTokens: 200, completionTokens: 300, totalTokens: 500, estimatedCost: 0.005 });

      const avg = getAverageUsage();

      return {
        historyCount: tracker.history.length,
        totalPrompt: tracker.totalPromptTokens,
        totalCompletion: tracker.totalCompletionTokens,
        grandTotal: getTotalTokens(),
        avgPrompt: avg?.promptTokens,
        avgCompletion: avg?.completionTokens,
      };
    });

    expect(result.historyCount).toBe(3);
    expect(result.totalPrompt).toBe(450);
    expect(result.totalCompletion).toBe(750);
    expect(result.grandTotal).toBe(1200);
    expect(result.avgPrompt).toBe(150);
    expect(result.avgCompletion).toBe(250);
  });

  test('should calculate cost estimation', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface PricingModel {
        promptPricePerMillion: number;
        completionPricePerMillion: number;
      }

      const PRICING: Record<string, PricingModel> = {
        'gpt-4o': { promptPricePerMillion: 2.5, completionPricePerMillion: 10 },
        'gpt-4o-mini': { promptPricePerMillion: 0.15, completionPricePerMillion: 0.6 },
        'claude-3-5-sonnet': { promptPricePerMillion: 3, completionPricePerMillion: 15 },
        'claude-3-5-haiku': { promptPricePerMillion: 0.25, completionPricePerMillion: 1.25 },
      };

      const calculateCost = (
        model: string,
        promptTokens: number,
        completionTokens: number
      ): number => {
        const pricing = PRICING[model];
        if (!pricing) return 0;

        const promptCost = (promptTokens / 1_000_000) * pricing.promptPricePerMillion;
        const completionCost = (completionTokens / 1_000_000) * pricing.completionPricePerMillion;

        return promptCost + completionCost;
      };

      const formatCost = (cost: number): string => {
        if (cost < 0.01) {
          return `$${(cost * 100).toFixed(4)}¢`;
        }
        return `$${cost.toFixed(4)}`;
      };

      // Test cost calculations
      const gpt4oCost = calculateCost('gpt-4o', 1000, 500);
      const gpt4oMiniCost = calculateCost('gpt-4o-mini', 1000, 500);
      const claudeCost = calculateCost('claude-3-5-sonnet', 1000, 500);

      return {
        gpt4oCost: gpt4oCost.toFixed(6),
        gpt4oMiniCost: gpt4oMiniCost.toFixed(6),
        claudeCost: claudeCost.toFixed(6),
        formattedSmall: formatCost(0.005),
        formattedLarge: formatCost(0.15),
      };
    });

    expect(parseFloat(result.gpt4oCost)).toBeCloseTo(0.0075, 4);
    expect(parseFloat(result.gpt4oMiniCost)).toBeCloseTo(0.00045, 5);
    expect(parseFloat(result.claudeCost)).toBeCloseTo(0.0105, 4);
    expect(result.formattedSmall).toContain('¢');
    expect(result.formattedLarge).toBe('$0.1500');
  });

  test('should check token limits', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface ModelLimits {
        contextWindow: number;
        maxOutput: number;
      }

      const MODEL_LIMITS: Record<string, ModelLimits> = {
        'gpt-4o': { contextWindow: 128000, maxOutput: 16384 },
        'gpt-4o-mini': { contextWindow: 128000, maxOutput: 16384 },
        'claude-3-5-sonnet': { contextWindow: 200000, maxOutput: 8192 },
        'claude-3-5-haiku': { contextWindow: 200000, maxOutput: 8192 },
      };

      const checkTokenLimit = (
        model: string,
        currentTokens: number
      ): { withinLimit: boolean; remaining: number; percentUsed: number } => {
        const limits = MODEL_LIMITS[model];
        if (!limits) {
          return { withinLimit: true, remaining: 0, percentUsed: 0 };
        }

        const remaining = limits.contextWindow - currentTokens;
        const percentUsed = (currentTokens / limits.contextWindow) * 100;

        return {
          withinLimit: remaining > 0,
          remaining: Math.max(0, remaining),
          percentUsed: Math.min(100, percentUsed),
        };
      };

      const getWarningLevel = (percentUsed: number): 'none' | 'warning' | 'critical' => {
        if (percentUsed >= 90) return 'critical';
        if (percentUsed >= 75) return 'warning';
        return 'none';
      };

      const lowUsage = checkTokenLimit('gpt-4o', 10000);
      const mediumUsage = checkTokenLimit('gpt-4o', 100000);
      const highUsage = checkTokenLimit('gpt-4o', 120000);
      const overLimit = checkTokenLimit('gpt-4o', 150000);

      return {
        lowWithinLimit: lowUsage.withinLimit,
        lowWarning: getWarningLevel(lowUsage.percentUsed),
        mediumWarning: getWarningLevel(mediumUsage.percentUsed),
        highWarning: getWarningLevel(highUsage.percentUsed),
        overLimitWithin: overLimit.withinLimit,
        overLimitRemaining: overLimit.remaining,
      };
    });

    expect(result.lowWithinLimit).toBe(true);
    expect(result.lowWarning).toBe('none');
    expect(result.mediumWarning).toBe('warning');
    expect(result.highWarning).toBe('critical');
    expect(result.overLimitWithin).toBe(false);
    expect(result.overLimitRemaining).toBe(0);
  });

  test('should format token counts for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatTokenCount = (count: number): string => {
        if (count >= 1_000_000) {
          return `${(count / 1_000_000).toFixed(1)}M`;
        }
        if (count >= 1_000) {
          return `${(count / 1_000).toFixed(1)}K`;
        }
        return count.toString();
      };

      const formatTokenRange = (current: number, max: number): string => {
        return `${formatTokenCount(current)} / ${formatTokenCount(max)}`;
      };

      const getProgressColor = (percent: number): string => {
        if (percent >= 90) return 'text-red-500';
        if (percent >= 75) return 'text-yellow-500';
        if (percent >= 50) return 'text-blue-500';
        return 'text-green-500';
      };

      return {
        smallCount: formatTokenCount(500),
        mediumCount: formatTokenCount(5000),
        largeCount: formatTokenCount(150000),
        veryLargeCount: formatTokenCount(2500000),
        range: formatTokenRange(50000, 128000),
        lowColor: getProgressColor(25),
        mediumColor: getProgressColor(60),
        highColor: getProgressColor(80),
        criticalColor: getProgressColor(95),
      };
    });

    expect(result.smallCount).toBe('500');
    expect(result.mediumCount).toBe('5.0K');
    expect(result.largeCount).toBe('150.0K');
    expect(result.veryLargeCount).toBe('2.5M');
    expect(result.range).toBe('50.0K / 128.0K');
    expect(result.lowColor).toBe('text-green-500');
    expect(result.mediumColor).toBe('text-blue-500');
    expect(result.highColor).toBe('text-yellow-500');
    expect(result.criticalColor).toBe('text-red-500');
  });
});

test.describe('Token Estimation for Different Content Types', () => {
  test('should estimate tokens for code', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      // Code typically has more tokens due to syntax
      const estimateCodeTokens = (code: string, language: string): number => {
        if (!code) return 0;

        // Base estimation
        let tokens = Math.ceil(code.length / 3.5);

        // Adjust based on language characteristics
        const languageMultipliers: Record<string, number> = {
          python: 0.9,
          javascript: 1.0,
          typescript: 1.1,
          java: 1.2,
          rust: 1.15,
          go: 0.95,
        };

        const multiplier = languageMultipliers[language] || 1.0;
        tokens = Math.ceil(tokens * multiplier);

        return tokens;
      };

      const pythonCode = `def hello(name):
    return f"Hello, {name}!"`;

      const tsCode = `function greet(name: string): string {
  return \`Hello, \${name}!\`;
}`;

      const javaCode = `public class Hello {
    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}`;

      return {
        pythonTokens: estimateCodeTokens(pythonCode, 'python'),
        tsTokens: estimateCodeTokens(tsCode, 'typescript'),
        javaTokens: estimateCodeTokens(javaCode, 'java'),
      };
    });

    expect(result.pythonTokens).toBeGreaterThan(0);
    expect(result.tsTokens).toBeGreaterThan(0);
    expect(result.javaTokens).toBeGreaterThan(result.pythonTokens);
  });

  test('should estimate tokens for mixed content', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface ContentBlock {
        type: 'text' | 'code' | 'image';
        content: string;
        language?: string;
      }

      const estimateBlockTokens = (block: ContentBlock): number => {
        switch (block.type) {
          case 'text':
            return Math.ceil(block.content.length / 4);
          case 'code':
            return Math.ceil(block.content.length / 3.5);
          case 'image':
            // Images have fixed token costs depending on size
            return 765; // Base cost for medium image
          default:
            return 0;
        }
      };

      const estimateTotalTokens = (blocks: ContentBlock[]): number => {
        return blocks.reduce((sum, block) => sum + estimateBlockTokens(block), 0);
      };

      const message: ContentBlock[] = [
        { type: 'text', content: 'Here is my code:' },
        { type: 'code', content: 'const x = 1;\nconsole.log(x);', language: 'javascript' },
        { type: 'text', content: 'And here is an image:' },
        { type: 'image', content: 'base64...' },
      ];

      const total = estimateTotalTokens(message);
      const breakdown = message.map(b => ({
        type: b.type,
        tokens: estimateBlockTokens(b),
      }));

      return {
        totalTokens: total,
        breakdown,
        hasImageCost: breakdown.some(b => b.type === 'image' && b.tokens > 0),
      };
    });

    expect(result.totalTokens).toBeGreaterThan(0);
    expect(result.breakdown.length).toBe(4);
    expect(result.hasImageCost).toBe(true);
  });
});

test.describe('Token Budget Management', () => {
  test('should manage token budgets', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface TokenBudget {
        daily: number;
        monthly: number;
        perRequest: number;
      }

      interface BudgetTracker {
        budget: TokenBudget;
        usedToday: number;
        usedThisMonth: number;
      }

      const tracker: BudgetTracker = {
        budget: {
          daily: 100000,
          monthly: 2000000,
          perRequest: 10000,
        },
        usedToday: 0,
        usedThisMonth: 0,
      };

      const canMakeRequest = (estimatedTokens: number): boolean => {
        if (estimatedTokens > tracker.budget.perRequest) return false;
        if (tracker.usedToday + estimatedTokens > tracker.budget.daily) return false;
        if (tracker.usedThisMonth + estimatedTokens > tracker.budget.monthly) return false;
        return true;
      };

      const recordUsage = (tokens: number) => {
        tracker.usedToday += tokens;
        tracker.usedThisMonth += tokens;
      };

      const getRemainingBudget = () => ({
        daily: tracker.budget.daily - tracker.usedToday,
        monthly: tracker.budget.monthly - tracker.usedThisMonth,
      });

      // Test budget checks
      recordUsage(50000);
      const canMake5K = canMakeRequest(5000);
      const canMake60K = canMakeRequest(60000);
      const remaining = getRemainingBudget();

      return {
        canMake5K,
        canMake60K,
        remainingDaily: remaining.daily,
        remainingMonthly: remaining.monthly,
      };
    });

    expect(result.canMake5K).toBe(true);
    expect(result.canMake60K).toBe(false);
    expect(result.remainingDaily).toBe(50000);
    expect(result.remainingMonthly).toBe(1950000);
  });
});
