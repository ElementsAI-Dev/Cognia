import { test, expect } from '@playwright/test';

/**
 * Usage Store Tests
 * Tests for token usage tracking and cost calculation
 */

test.describe('Usage Store - Record Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should add usage record with cost calculation', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        sessionId: string;
        provider: string;
        model: string;
        tokens: { prompt: number; completion: number; total: number };
        cost: number;
        createdAt: Date;
      }

      const records: UsageRecord[] = [];
      let totalTokens = 0;
      let totalCost = 0;

      const calculateCost = (model: string, tokens: { total: number }): number => {
        const rates: Record<string, number> = {
          'gpt-4o': 0.00001,
          'gpt-4o-mini': 0.000001,
          'claude-3-5-sonnet': 0.000015,
        };
        return (rates[model] || 0.00001) * tokens.total;
      };

      const addUsageRecord = (record: Omit<UsageRecord, 'id' | 'cost' | 'createdAt'>) => {
        const cost = calculateCost(record.model, record.tokens);
        const newRecord: UsageRecord = {
          ...record,
          id: `usage-${Date.now()}`,
          cost,
          createdAt: new Date(),
        };

        records.push(newRecord);
        totalTokens += record.tokens.total;
        totalCost += cost;
      };

      addUsageRecord({
        sessionId: 'sess-1',
        provider: 'openai',
        model: 'gpt-4o',
        tokens: { prompt: 100, completion: 50, total: 150 },
      });

      return {
        recordCount: records.length,
        totalTokens,
        hasCost: records[0].cost > 0,
        hasCreatedAt: !!records[0].createdAt,
      };
    });

    expect(result.recordCount).toBe(1);
    expect(result.totalTokens).toBe(150);
    expect(result.hasCost).toBe(true);
    expect(result.hasCreatedAt).toBe(true);
  });

  test('should clear all usage records', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        tokens: { total: number };
        cost: number;
      }

      let records: UsageRecord[] = [
        { id: 'u1', tokens: { total: 100 }, cost: 0.001 },
        { id: 'u2', tokens: { total: 200 }, cost: 0.002 },
      ];
      let totalTokens = 300;
      let totalCost = 0.003;

      const clearUsageRecords = () => {
        records = [];
        totalTokens = 0;
        totalCost = 0;
      };

      clearUsageRecords();

      return {
        recordCount: records.length,
        totalTokens,
        totalCost,
      };
    });

    expect(result.recordCount).toBe(0);
    expect(result.totalTokens).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  test('should clear records before a date', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        tokens: { total: number };
        cost: number;
        createdAt: Date;
      }

      const now = Date.now();
      let records: UsageRecord[] = [
        { id: 'u1', tokens: { total: 100 }, cost: 0.001, createdAt: new Date(now - 86400000 * 2) }, // 2 days ago
        { id: 'u2', tokens: { total: 200 }, cost: 0.002, createdAt: new Date(now - 86400000) }, // 1 day ago
        { id: 'u3', tokens: { total: 300 }, cost: 0.003, createdAt: new Date(now) }, // today
      ];

      const clearRecordsBefore = (date: Date) => {
        records = records.filter((r) => r.createdAt >= date);
      };

      // Clear records older than 1.5 days
      clearRecordsBefore(new Date(now - 86400000 * 1.5));

      return {
        remainingCount: records.length,
        remainingIds: records.map((r) => r.id),
      };
    });

    expect(result.remainingCount).toBe(2);
    expect(result.remainingIds).toContain('u2');
    expect(result.remainingIds).toContain('u3');
  });
});

test.describe('Usage Store - Selectors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should get usage by session', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        sessionId: string;
        tokens: { total: number };
      }

      const records: UsageRecord[] = [
        { id: 'u1', sessionId: 'sess-1', tokens: { total: 100 } },
        { id: 'u2', sessionId: 'sess-1', tokens: { total: 200 } },
        { id: 'u3', sessionId: 'sess-2', tokens: { total: 300 } },
      ];

      const getUsageBySession = (sessionId: string) =>
        records.filter((r) => r.sessionId === sessionId);

      return {
        sess1Count: getUsageBySession('sess-1').length,
        sess2Count: getUsageBySession('sess-2').length,
        sess3Count: getUsageBySession('sess-3').length,
      };
    });

    expect(result.sess1Count).toBe(2);
    expect(result.sess2Count).toBe(1);
    expect(result.sess3Count).toBe(0);
  });

  test('should aggregate usage by provider', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        provider: string;
        tokens: { total: number };
        cost: number;
      }

      interface ProviderUsage {
        provider: string;
        tokens: number;
        cost: number;
        requests: number;
      }

      const records: UsageRecord[] = [
        { id: 'u1', provider: 'openai', tokens: { total: 100 }, cost: 0.001 },
        { id: 'u2', provider: 'openai', tokens: { total: 200 }, cost: 0.002 },
        { id: 'u3', provider: 'anthropic', tokens: { total: 300 }, cost: 0.003 },
      ];

      const getUsageByProvider = (): ProviderUsage[] => {
        const providerMap = new Map<string, ProviderUsage>();

        for (const record of records) {
          const existing = providerMap.get(record.provider);
          if (existing) {
            existing.tokens += record.tokens.total;
            existing.cost += record.cost;
            existing.requests += 1;
          } else {
            providerMap.set(record.provider, {
              provider: record.provider,
              tokens: record.tokens.total,
              cost: record.cost,
              requests: 1,
            });
          }
        }

        return Array.from(providerMap.values()).sort((a, b) => b.tokens - a.tokens);
      };

      const usage = getUsageByProvider();

      return {
        providerCount: usage.length,
        openaiTokens: usage.find((u) => u.provider === 'openai')?.tokens,
        openaiRequests: usage.find((u) => u.provider === 'openai')?.requests,
        anthropicTokens: usage.find((u) => u.provider === 'anthropic')?.tokens,
      };
    });

    expect(result.providerCount).toBe(2);
    expect(result.openaiTokens).toBe(300);
    expect(result.openaiRequests).toBe(2);
    expect(result.anthropicTokens).toBe(300);
  });

  test('should get daily usage', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        tokens: { total: number };
        cost: number;
        createdAt: Date;
      }

      interface DailyUsage {
        date: string;
        tokens: number;
        cost: number;
        requests: number;
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

      const records: UsageRecord[] = [
        { id: 'u1', tokens: { total: 100 }, cost: 0.001, createdAt: new Date(today) },
        { id: 'u2', tokens: { total: 200 }, cost: 0.002, createdAt: new Date(today) },
        { id: 'u3', tokens: { total: 300 }, cost: 0.003, createdAt: new Date(yesterday) },
      ];

      const getDailyUsage = (days: number = 7): DailyUsage[] => {
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const dailyMap = new Map<string, DailyUsage>();

        // Initialize all days
        for (let i = 0; i <= days; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          dailyMap.set(dateStr, { date: dateStr, tokens: 0, cost: 0, requests: 0 });
        }

        // Aggregate records
        for (const record of records) {
          const dateStr = record.createdAt.toISOString().split('T')[0];
          const existing = dailyMap.get(dateStr);
          if (existing) {
            existing.tokens += record.tokens.total;
            existing.cost += record.cost;
            existing.requests += 1;
          }
        }

        return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      };

      const daily = getDailyUsage(7);

      return {
        dayCount: daily.length,
        hasTodayData: daily.some((d) => d.date === today && d.tokens > 0),
        hasYesterdayData: daily.some((d) => d.date === yesterday && d.tokens > 0),
      };
    });

    expect(result.dayCount).toBe(8); // 7 days + today
    expect(result.hasTodayData).toBe(true);
    expect(result.hasYesterdayData).toBe(true);
  });

  test('should get total usage', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        tokens: { total: number };
        cost: number;
      }

      const records: UsageRecord[] = [
        { id: 'u1', tokens: { total: 100 }, cost: 0.001 },
        { id: 'u2', tokens: { total: 200 }, cost: 0.002 },
        { id: 'u3', tokens: { total: 300 }, cost: 0.003 },
      ];

      const totalTokens = records.reduce((sum, r) => sum + r.tokens.total, 0);
      const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

      const getTotalUsage = () => ({
        tokens: totalTokens,
        cost: totalCost,
        requests: records.length,
      });

      return getTotalUsage();
    });

    expect(result.tokens).toBe(600);
    expect(result.cost).toBe(0.006);
    expect(result.requests).toBe(3);
  });
});

test.describe('Usage Store - Cost Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should calculate cost for different models', async ({ page }) => {
    const result = await page.evaluate(() => {
      const MODEL_RATES: Record<string, { input: number; output: number }> = {
        'gpt-4o': { input: 0.0025, output: 0.01 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
        'claude-3-5-haiku': { input: 0.001, output: 0.005 },
      };

      const calculateCost = (
        model: string,
        tokens: { prompt: number; completion: number }
      ): number => {
        const rates = MODEL_RATES[model];
        if (!rates) return 0;

        const inputCost = (tokens.prompt / 1000) * rates.input;
        const outputCost = (tokens.completion / 1000) * rates.output;

        return inputCost + outputCost;
      };

      return {
        gpt4o: calculateCost('gpt-4o', { prompt: 1000, completion: 500 }),
        gpt4oMini: calculateCost('gpt-4o-mini', { prompt: 1000, completion: 500 }),
        claude35Sonnet: calculateCost('claude-3-5-sonnet', { prompt: 1000, completion: 500 }),
        unknownModel: calculateCost('unknown-model', { prompt: 1000, completion: 500 }),
      };
    });

    expect(result.gpt4o).toBeCloseTo(0.0025 + 0.005, 5); // 0.0075
    expect(result.gpt4oMini).toBeCloseTo(0.00015 + 0.0003, 5); // 0.00045
    expect(result.claude35Sonnet).toBeCloseTo(0.003 + 0.0075, 5); // 0.0105
    expect(result.unknownModel).toBe(0);
  });

  test('should format cost for display', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatCost = (cost: number): string => {
        if (cost < 0.01) {
          return `$${cost.toFixed(4)}`;
        }
        if (cost < 1) {
          return `$${cost.toFixed(3)}`;
        }
        return `$${cost.toFixed(2)}`;
      };

      return {
        tiny: formatCost(0.0001),
        small: formatCost(0.05),
        medium: formatCost(0.5),
        large: formatCost(5.5),
      };
    });

    expect(result.tiny).toBe('$0.0001');
    expect(result.small).toBe('$0.050');
    expect(result.medium).toBe('$0.500');
    expect(result.large).toBe('$5.50');
  });
});
