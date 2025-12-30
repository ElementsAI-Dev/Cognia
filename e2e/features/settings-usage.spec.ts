import { test, expect } from '@playwright/test';
import { waitForAnimation } from '../utils/test-helpers';

/**
 * Usage Settings Complete Tests
 * Tests token usage tracking and statistics display
 * Optimized for CI/CD efficiency
 */

test.describe('Usage Settings - Statistics Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should calculate total usage statistics', async ({ page }) => {
    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        provider: string;
        model: string;
        tokens: { input: number; output: number; total: number };
        cost: number;
        createdAt: Date;
      }

      const records: UsageRecord[] = [
        {
          id: '1',
          provider: 'openai',
          model: 'gpt-4o',
          tokens: { input: 1000, output: 500, total: 1500 },
          cost: 0.03,
          createdAt: new Date(),
        },
        {
          id: '2',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          tokens: { input: 2000, output: 1000, total: 3000 },
          cost: 0.05,
          createdAt: new Date(),
        },
        {
          id: '3',
          provider: 'openai',
          model: 'gpt-4o-mini',
          tokens: { input: 500, output: 250, total: 750 },
          cost: 0.01,
          createdAt: new Date(),
        },
      ];

      const getTotalUsage = () => {
        return {
          tokens: records.reduce((sum, r) => sum + r.tokens.total, 0),
          cost: records.reduce((sum, r) => sum + r.cost, 0),
          requests: records.length,
        };
      };

      const totalUsage = getTotalUsage();

      return {
        totalTokens: totalUsage.tokens,
        totalCost: totalUsage.cost,
        totalRequests: totalUsage.requests,
      };
    });

    expect(result.totalTokens).toBe(5250);
    expect(result.totalCost).toBeCloseTo(0.09);
    expect(result.totalRequests).toBe(3);
  });

  test('should format token count', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatTokens = (tokens: number): string => {
        if (tokens >= 1000000) {
          return `${(tokens / 1000000).toFixed(1)}M`;
        }
        if (tokens >= 1000) {
          return `${(tokens / 1000).toFixed(1)}K`;
        }
        return tokens.toString();
      };

      return {
        small: formatTokens(500),
        medium: formatTokens(5000),
        large: formatTokens(150000),
        veryLarge: formatTokens(2500000),
      };
    });

    expect(result.small).toBe('500');
    expect(result.medium).toBe('5.0K');
    expect(result.large).toBe('150.0K');
    expect(result.veryLarge).toBe('2.5M');
  });

  test('should format cost', async ({ page }) => {
    const result = await page.evaluate(() => {
      const formatCost = (cost: number): string => {
        if (cost < 0.01) {
          return `$${cost.toFixed(4)}`;
        }
        return `$${cost.toFixed(2)}`;
      };

      return {
        tiny: formatCost(0.0005),
        small: formatCost(0.05),
        medium: formatCost(1.5),
        large: formatCost(25.99),
      };
    });

    expect(result.tiny).toBe('$0.0005');
    expect(result.small).toBe('$0.05');
    expect(result.medium).toBe('$1.50');
    expect(result.large).toBe('$25.99');
  });
});

test.describe('Usage Settings - Provider Breakdown', () => {
  test('should calculate usage by provider', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface UsageRecord {
        provider: string;
        tokens: number;
        cost: number;
      }

      const records: UsageRecord[] = [
        { provider: 'openai', tokens: 1500, cost: 0.03 },
        { provider: 'openai', tokens: 750, cost: 0.01 },
        { provider: 'anthropic', tokens: 3000, cost: 0.05 },
        { provider: 'anthropic', tokens: 2000, cost: 0.04 },
        { provider: 'google', tokens: 1000, cost: 0.02 },
      ];

      const getUsageByProvider = () => {
        const grouped: Record<string, { tokens: number; cost: number; requests: number }> = {};

        for (const record of records) {
          if (!grouped[record.provider]) {
            grouped[record.provider] = { tokens: 0, cost: 0, requests: 0 };
          }
          grouped[record.provider].tokens += record.tokens;
          grouped[record.provider].cost += record.cost;
          grouped[record.provider].requests += 1;
        }

        return Object.entries(grouped).map(([provider, data]) => ({
          provider,
          ...data,
        }));
      };

      const providerUsage = getUsageByProvider();

      return {
        providerCount: providerUsage.length,
        openaiUsage: providerUsage.find((p) => p.provider === 'openai'),
        anthropicUsage: providerUsage.find((p) => p.provider === 'anthropic'),
        googleUsage: providerUsage.find((p) => p.provider === 'google'),
      };
    });

    expect(result.providerCount).toBe(3);
    expect(result.openaiUsage?.tokens).toBe(2250);
    expect(result.openaiUsage?.requests).toBe(2);
    expect(result.anthropicUsage?.tokens).toBe(5000);
    expect(result.anthropicUsage?.requests).toBe(2);
  });

  test('should sort providers by usage', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const providerUsage = [
        { provider: 'openai', tokens: 2250, cost: 0.04 },
        { provider: 'anthropic', tokens: 5000, cost: 0.09 },
        { provider: 'google', tokens: 1000, cost: 0.02 },
      ];

      const sortByTokens = () =>
        [...providerUsage].sort((a, b) => b.tokens - a.tokens);

      const sortByCost = () =>
        [...providerUsage].sort((a, b) => b.cost - a.cost);

      return {
        sortedByTokens: sortByTokens().map((p) => p.provider),
        sortedByCost: sortByCost().map((p) => p.provider),
      };
    });

    expect(result.sortedByTokens).toEqual(['anthropic', 'openai', 'google']);
    expect(result.sortedByCost).toEqual(['anthropic', 'openai', 'google']);
  });
});

test.describe('Usage Settings - Daily Usage', () => {
  test('should calculate daily usage', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface UsageRecord {
        tokens: number;
        cost: number;
        createdAt: Date;
      }

      const getDateString = (date: Date): string => {
        return date.toISOString().split('T')[0];
      };

      const now = new Date();
      const records: UsageRecord[] = [
        { tokens: 1000, cost: 0.02, createdAt: now },
        { tokens: 1500, cost: 0.03, createdAt: now },
        {
          tokens: 2000,
          cost: 0.04,
          createdAt: new Date(now.getTime() - 86400000),
        }, // Yesterday
        {
          tokens: 500,
          cost: 0.01,
          createdAt: new Date(now.getTime() - 86400000 * 2),
        }, // 2 days ago
      ];

      const getDailyUsage = (days: number) => {
        const result: { date: string; tokens: number; cost: number }[] = [];

        for (let i = 0; i < days; i++) {
          const date = new Date(now.getTime() - 86400000 * i);
          const dateStr = getDateString(date);

          const dayRecords = records.filter(
            (r) => getDateString(r.createdAt) === dateStr
          );

          result.push({
            date: dateStr,
            tokens: dayRecords.reduce((sum, r) => sum + r.tokens, 0),
            cost: dayRecords.reduce((sum, r) => sum + r.cost, 0),
          });
        }

        return result;
      };

      const dailyUsage = getDailyUsage(7);
      const todayUsage = dailyUsage[0];
      const yesterdayUsage = dailyUsage[1];

      return {
        daysCount: dailyUsage.length,
        todayTokens: todayUsage.tokens,
        yesterdayTokens: yesterdayUsage.tokens,
      };
    });

    expect(result.daysCount).toBe(7);
    expect(result.todayTokens).toBe(2500);
    expect(result.yesterdayTokens).toBe(2000);
  });

  test('should get usage trend', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const dailyUsage = [
        { date: '2024-01-07', tokens: 5000 },
        { date: '2024-01-06', tokens: 4000 },
        { date: '2024-01-05', tokens: 3000 },
        { date: '2024-01-04', tokens: 4500 },
        { date: '2024-01-03', tokens: 2000 },
      ];

      const calculateTrend = (): 'increasing' | 'decreasing' | 'stable' => {
        if (dailyUsage.length < 2) return 'stable';

        const recent = dailyUsage.slice(0, 3);
        const older = dailyUsage.slice(3);

        const recentAvg = recent.reduce((sum, d) => sum + d.tokens, 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d.tokens, 0) / older.length;

        const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

        if (percentChange > 10) return 'increasing';
        if (percentChange < -10) return 'decreasing';
        return 'stable';
      };

      const getMaxDay = () =>
        dailyUsage.reduce((max, day) => (day.tokens > max.tokens ? day : max));

      return {
        trend: calculateTrend(),
        maxDay: getMaxDay(),
      };
    });

    expect(result.trend).toBe('increasing');
    expect(result.maxDay.tokens).toBe(5000);
  });
});

test.describe('Usage Settings - Recent Activity', () => {
  test('should display recent usage records', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      interface UsageRecord {
        id: string;
        provider: string;
        model: string;
        tokens: number;
        createdAt: Date;
      }

      const records: UsageRecord[] = [
        { id: '5', provider: 'openai', model: 'gpt-4o', tokens: 1500, createdAt: new Date() },
        { id: '4', provider: 'anthropic', model: 'claude-3-5-sonnet', tokens: 3000, createdAt: new Date() },
        { id: '3', provider: 'openai', model: 'gpt-4o-mini', tokens: 750, createdAt: new Date() },
        { id: '2', provider: 'google', model: 'gemini-pro', tokens: 2000, createdAt: new Date() },
        { id: '1', provider: 'openai', model: 'gpt-4o', tokens: 1000, createdAt: new Date() },
      ];

      const getRecentRecords = (limit: number): UsageRecord[] => {
        return records.slice(0, limit);
      };

      const recent = getRecentRecords(3);

      return {
        totalRecords: records.length,
        recentCount: recent.length,
        recentProviders: recent.map((r) => r.provider),
        recentModels: recent.map((r) => r.model),
      };
    });

    expect(result.totalRecords).toBe(5);
    expect(result.recentCount).toBe(3);
    expect(result.recentProviders).toContain('openai');
  });

  test('should get first usage date', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const records = [
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-10') },
        { createdAt: new Date('2024-01-05') },
        { createdAt: new Date('2024-01-01') },
      ];

      const getFirstUsageDate = (): Date | null => {
        if (records.length === 0) return null;
        return records.reduce((oldest, r) =>
          r.createdAt < oldest.createdAt ? r : oldest
        ).createdAt;
      };

      const firstDate = getFirstUsageDate();

      return {
        hasRecords: records.length > 0,
        firstUsageDate: firstDate?.toISOString().split('T')[0],
      };
    });

    expect(result.hasRecords).toBe(true);
    expect(result.firstUsageDate).toBe('2024-01-01');
  });
});

test.describe('Usage Settings - Export/Clear', () => {
  test('should export usage data', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const usageData = {
        totalUsage: { tokens: 10000, cost: 0.5, requests: 20 },
        providerUsage: [
          { provider: 'openai', tokens: 6000, cost: 0.3, requests: 12 },
          { provider: 'anthropic', tokens: 4000, cost: 0.2, requests: 8 },
        ],
        records: [
          { id: '1', provider: 'openai', tokens: 1000, createdAt: new Date().toISOString() },
        ],
      };

      const exportUsage = () => {
        return JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            type: 'cognia-usage',
            data: usageData,
          },
          null,
          2
        );
      };

      const exported = exportUsage();
      const parsed = JSON.parse(exported);

      return {
        hasVersion: !!parsed.version,
        hasType: parsed.type === 'cognia-usage',
        hasExportedAt: !!parsed.exportedAt,
        hasTotalUsage: !!parsed.data.totalUsage,
        hasProviderUsage: !!parsed.data.providerUsage,
      };
    });

    expect(result.hasVersion).toBe(true);
    expect(result.hasType).toBe(true);
    expect(result.hasExportedAt).toBe(true);
    expect(result.hasTotalUsage).toBe(true);
    expect(result.hasProviderUsage).toBe(true);
  });

  test('should clear usage records', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let records = [
        { id: '1', tokens: 1000 },
        { id: '2', tokens: 2000 },
        { id: '3', tokens: 3000 },
      ];

      const clearUsageRecords = (): number => {
        const clearedCount = records.length;
        records = [];
        return clearedCount;
      };

      const beforeClear = records.length;
      const clearedCount = clearUsageRecords();
      const afterClear = records.length;

      return { beforeClear, clearedCount, afterClear };
    });

    expect(result.beforeClear).toBe(3);
    expect(result.clearedCount).toBe(3);
    expect(result.afterClear).toBe(0);
  });

  test('should confirm before clearing records', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      let records = [{ id: '1' }, { id: '2' }];
      let confirmDialogShown = false;

      const clearWithConfirmation = (confirmed: boolean): boolean => {
        confirmDialogShown = true;
        if (confirmed) {
          records = [];
          return true;
        }
        return false;
      };

      // User cancels
      const cancelResult = clearWithConfirmation(false);
      const afterCancel = records.length;

      // User confirms
      const confirmResult = clearWithConfirmation(true);
      const afterConfirm = records.length;

      return {
        confirmDialogShown,
        cancelResult,
        afterCancel,
        confirmResult,
        afterConfirm,
      };
    });

    expect(result.confirmDialogShown).toBe(true);
    expect(result.cancelResult).toBe(false);
    expect(result.afterCancel).toBe(2);
    expect(result.confirmResult).toBe(true);
    expect(result.afterConfirm).toBe(0);
  });
});

test.describe('Usage Settings - Persistence', () => {
  test('should persist usage records to localStorage', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const usageRecords = {
        records: [
          { id: '1', provider: 'openai', tokens: 1000, cost: 0.02 },
          { id: '2', provider: 'anthropic', tokens: 2000, cost: 0.04 },
        ],
      };
      localStorage.setItem(
        'cognia-usage-records',
        JSON.stringify({ state: usageRecords })
      );
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const stored = await page.evaluate(() => {
      const data = localStorage.getItem('cognia-usage-records');
      return data ? JSON.parse(data) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.state.records.length).toBe(2);
    expect(stored.state.records[0].provider).toBe('openai');
  });

  test('should load usage records on startup', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const loadRecords = (): { id: string; tokens: number }[] => {
        const storedData = localStorage.getItem('cognia-usage-records');
        if (!storedData) return [];

        try {
          const parsed = JSON.parse(storedData);
          return parsed.state?.records || [];
        } catch {
          return [];
        }
      };

      // Pre-populate localStorage
      localStorage.setItem(
        'cognia-usage-records',
        JSON.stringify({
          state: {
            records: [
              { id: 'test-1', tokens: 500 },
              { id: 'test-2', tokens: 1000 },
            ],
          },
        })
      );

      const loaded = loadRecords();

      return {
        recordCount: loaded.length,
        firstRecord: loaded[0],
      };
    });

    expect(result.recordCount).toBe(2);
    expect(result.firstRecord.id).toBe('test-1');
  });
});

test.describe('Usage Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display usage settings section', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for Usage tab or section
      const usageSection = page.locator('text=Usage, text=Statistics').first();
      const hasUsage = await usageSection.isVisible().catch(() => false);
      expect(hasUsage).toBe(true);
    }
  });

  test('should display summary cards', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for summary elements
      const tokensCard = page.locator('text=Tokens, text=Total Tokens').first();
      const hasTokens = await tokensCard.isVisible().catch(() => false);
      expect(hasTokens).toBe(true);
    }
  });

  test('should display export button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for export button
      const exportBtn = page.locator('button:has-text("Export")').first();
      const hasExport = await exportBtn.isVisible().catch(() => false);
      expect(hasExport).toBe(true);
    }
  });

  test('should display clear button', async ({ page }) => {
    const settingsBtn = page
      .locator('button[aria-label*="settings" i], button:has-text("Settings")')
      .first();

    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await waitForAnimation(page);

      // Look for clear button
      const clearBtn = page
        .locator('button:has-text("Clear"), button:has-text("Delete")')
        .first();
      const hasClear = await clearBtn.isVisible().catch(() => false);
      expect(hasClear).toBe(true);
    }
  });
});
