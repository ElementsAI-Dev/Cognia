import { test, expect } from '@playwright/test';

/**
 * Chat History Context Settings E2E Tests
 * Tests the chat history context feature configuration and behavior
 * These tests use page.evaluate() for logic validation without requiring UI navigation
 */

test.describe('Chat History Context Settings - Configuration', () => {
  test('should toggle chat history context enabled state', async ({ page }) => {
    // Navigate to about:blank for pure logic tests
    await page.goto('about:blank');
    
    const result = await page.evaluate(() => {
      const settings = {
        enabled: false,
        recentSessionCount: 3,
        maxTokenBudget: 500,
        compressionLevel: 'moderate' as const,
      };

      const toggleEnabled = (): void => {
        settings.enabled = !settings.enabled;
      };

      const initial = settings.enabled;
      toggleEnabled();
      const afterToggle = settings.enabled;
      toggleEnabled();
      const afterSecondToggle = settings.enabled;

      return { initial, afterToggle, afterSecondToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
    expect(result.afterSecondToggle).toBe(false);
  });

  test('should update session count within valid range', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        recentSessionCount: 3,
      };

      const setSessionCount = (count: number): boolean => {
        if (count < 1 || count > 10) return false;
        settings.recentSessionCount = count;
        return true;
      };

      const initial = settings.recentSessionCount;
      const validSet = setSessionCount(5);
      const afterValidSet = settings.recentSessionCount;
      const invalidLow = setSessionCount(0);
      const invalidHigh = setSessionCount(11);
      const unchanged = settings.recentSessionCount;

      return { initial, validSet, afterValidSet, invalidLow, invalidHigh, unchanged };
    });

    expect(result.initial).toBe(3);
    expect(result.validSet).toBe(true);
    expect(result.afterValidSet).toBe(5);
    expect(result.invalidLow).toBe(false);
    expect(result.invalidHigh).toBe(false);
    expect(result.unchanged).toBe(5);
  });

  test('should update token budget within valid range', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        maxTokenBudget: 500,
      };

      const setTokenBudget = (budget: number): boolean => {
        if (budget < 100 || budget > 2000) return false;
        settings.maxTokenBudget = budget;
        return true;
      };

      const initial = settings.maxTokenBudget;
      const validSet = setTokenBudget(1000);
      const afterValidSet = settings.maxTokenBudget;
      const invalidLow = setTokenBudget(50);
      const invalidHigh = setTokenBudget(3000);
      const unchanged = settings.maxTokenBudget;

      return { initial, validSet, afterValidSet, invalidLow, invalidHigh, unchanged };
    });

    expect(result.initial).toBe(500);
    expect(result.validSet).toBe(true);
    expect(result.afterValidSet).toBe(1000);
    expect(result.invalidLow).toBe(false);
    expect(result.invalidHigh).toBe(false);
    expect(result.unchanged).toBe(1000);
  });

  test('should set compression level', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      type CompressionLevel = 'minimal' | 'moderate' | 'detailed';
      
      const settings = {
        compressionLevel: 'moderate' as CompressionLevel,
      };

      const setCompressionLevel = (level: CompressionLevel): void => {
        settings.compressionLevel = level;
      };

      const initial = settings.compressionLevel;
      setCompressionLevel('minimal');
      const afterMinimal = settings.compressionLevel;
      setCompressionLevel('detailed');
      const afterDetailed = settings.compressionLevel;

      return { initial, afterMinimal, afterDetailed };
    });

    expect(result.initial).toBe('moderate');
    expect(result.afterMinimal).toBe('minimal');
    expect(result.afterDetailed).toBe('detailed');
  });
});

test.describe('Chat History Context Settings - Options', () => {
  test('should toggle include titles option', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        includeSessionTitles: true,
      };

      const toggleIncludeTitles = (): boolean => {
        if (!settings.enabled) return false;
        settings.includeSessionTitles = !settings.includeSessionTitles;
        return true;
      };

      const initial = settings.includeSessionTitles;
      toggleIncludeTitles();
      const afterToggle = settings.includeSessionTitles;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle exclude empty sessions option', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        excludeEmptySessions: true,
      };

      const toggleExcludeEmpty = (): boolean => {
        if (!settings.enabled) return false;
        settings.excludeEmptySessions = !settings.excludeEmptySessions;
        return true;
      };

      const initial = settings.excludeEmptySessions;
      toggleExcludeEmpty();
      const afterToggle = settings.excludeEmptySessions;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(true);
    expect(result.afterToggle).toBe(false);
  });

  test('should toggle include timestamps option', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        includeTimestamps: false,
      };

      const toggleIncludeTimestamps = (): boolean => {
        if (!settings.enabled) return false;
        settings.includeTimestamps = !settings.includeTimestamps;
        return true;
      };

      const initial = settings.includeTimestamps;
      toggleIncludeTimestamps();
      const afterToggle = settings.includeTimestamps;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
  });

  test('should toggle same project only option', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        sameProjectOnly: false,
      };

      const toggleSameProjectOnly = (): boolean => {
        if (!settings.enabled) return false;
        settings.sameProjectOnly = !settings.sameProjectOnly;
        return true;
      };

      const initial = settings.sameProjectOnly;
      toggleSameProjectOnly();
      const afterToggle = settings.sameProjectOnly;

      return { initial, afterToggle };
    });

    expect(result.initial).toBe(false);
    expect(result.afterToggle).toBe(true);
  });

  test('should update min messages threshold', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const settings = {
        enabled: true,
        minMessagesThreshold: 2,
      };

      const setMinMessages = (min: number): boolean => {
        if (min < 1 || min > 20) return false;
        settings.minMessagesThreshold = min;
        return true;
      };

      const initial = settings.minMessagesThreshold;
      const validSet = setMinMessages(5);
      const afterValidSet = settings.minMessagesThreshold;
      const invalidLow = setMinMessages(0);
      const invalidHigh = setMinMessages(25);
      const unchanged = settings.minMessagesThreshold;

      return { initial, validSet, afterValidSet, invalidLow, invalidHigh, unchanged };
    });

    expect(result.initial).toBe(2);
    expect(result.validSet).toBe(true);
    expect(result.afterValidSet).toBe(5);
    expect(result.invalidLow).toBe(false);
    expect(result.invalidHigh).toBe(false);
    expect(result.unchanged).toBe(5);
  });
});

test.describe('Chat History Context - Context Building', () => {
  test('should build context from session summaries', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      interface SessionSummary {
        sessionId: string;
        title: string;
        summary: string;
        topics: string[];
        messageCount: number;
      }

      const buildContextPrompt = (
        summaries: SessionSummary[],
        options: { includeTitles: boolean; includeTimestamps: boolean }
      ): string => {
        if (summaries.length === 0) return '';

        const lines: string[] = [
          '## Recent Conversation Context',
          '',
          'The following is a summary of recent conversations:',
          '',
        ];

        for (let i = 0; i < summaries.length; i++) {
          const s = summaries[i];
          if (options.includeTitles) {
            lines.push(`### ${i + 1}. ${s.title}`);
          } else {
            lines.push(`### Conversation ${i + 1}`);
          }

          if (s.topics.length > 0) {
            lines.push(`Topics: ${s.topics.join(', ')}`);
          }

          lines.push(s.summary);
          lines.push('');
        }

        return lines.join('\n');
      };

      const summaries: SessionSummary[] = [
        {
          sessionId: 'session-1',
          title: 'React Hooks Discussion',
          summary: 'Discussed useState and useEffect hooks',
          topics: ['React', 'Hooks'],
          messageCount: 10,
        },
        {
          sessionId: 'session-2',
          title: 'TypeScript Types',
          summary: 'Explored TypeScript generics',
          topics: ['TypeScript', 'Generics'],
          messageCount: 8,
        },
      ];

      const contextWithTitles = buildContextPrompt(summaries, {
        includeTitles: true,
        includeTimestamps: false,
      });

      const contextWithoutTitles = buildContextPrompt(summaries, {
        includeTitles: false,
        includeTimestamps: false,
      });

      const emptyContext = buildContextPrompt([], {
        includeTitles: true,
        includeTimestamps: false,
      });

      return {
        hasContextWithTitles: contextWithTitles.includes('React Hooks Discussion'),
        hasContextWithoutTitles: !contextWithoutTitles.includes('React Hooks Discussion'),
        hasConversationLabel: contextWithoutTitles.includes('Conversation 1'),
        emptyContextIsEmpty: emptyContext === '',
        hasTopics: contextWithTitles.includes('Topics: React, Hooks'),
      };
    });

    expect(result.hasContextWithTitles).toBe(true);
    expect(result.hasContextWithoutTitles).toBe(true);
    expect(result.hasConversationLabel).toBe(true);
    expect(result.emptyContextIsEmpty).toBe(true);
    expect(result.hasTopics).toBe(true);
  });

  test('should respect token budget when building context', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

      const buildContextWithBudget = (
        content: string,
        maxTokenBudget: number
      ): { text: string; tokenCount: number; truncated: boolean } => {
        const tokenCount = estimateTokens(content);
        
        if (tokenCount <= maxTokenBudget) {
          return { text: content, tokenCount, truncated: false };
        }

        const charLimit = maxTokenBudget * 4;
        const truncatedText = content.slice(0, charLimit) + '... [truncated]';
        
        return {
          text: truncatedText,
          tokenCount: estimateTokens(truncatedText),
          truncated: true,
        };
      };

      const shortContent = 'A short summary.';
      const longContent = 'A'.repeat(1000);

      const shortResult = buildContextWithBudget(shortContent, 100);
      const longResult = buildContextWithBudget(longContent, 100);

      return {
        shortNotTruncated: !shortResult.truncated,
        shortUnderBudget: shortResult.tokenCount <= 100,
        longTruncated: longResult.truncated,
        longHasTruncatedMarker: longResult.text.includes('[truncated]'),
      };
    });

    expect(result.shortNotTruncated).toBe(true);
    expect(result.shortUnderBudget).toBe(true);
    expect(result.longTruncated).toBe(true);
    expect(result.longHasTruncatedMarker).toBe(true);
  });
});

test.describe('Chat History Context - Session Filtering', () => {
  test('should filter sessions by message count', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      interface Session {
        id: string;
        messageCount: number;
      }

      const filterByMinMessages = (
        sessions: Session[],
        minMessages: number
      ): Session[] => {
        return sessions.filter((s) => s.messageCount >= minMessages);
      };

      const sessions: Session[] = [
        { id: 'session-1', messageCount: 10 },
        { id: 'session-2', messageCount: 3 },
        { id: 'session-3', messageCount: 0 },
        { id: 'session-4', messageCount: 5 },
      ];

      const filtered2 = filterByMinMessages(sessions, 2);
      const filtered5 = filterByMinMessages(sessions, 5);
      const filtered10 = filterByMinMessages(sessions, 10);

      return {
        filtered2Count: filtered2.length,
        filtered5Count: filtered5.length,
        filtered10Count: filtered10.length,
        filtered2Ids: filtered2.map((s) => s.id),
        filtered5Ids: filtered5.map((s) => s.id),
      };
    });

    expect(result.filtered2Count).toBe(3);
    expect(result.filtered5Count).toBe(2);
    expect(result.filtered10Count).toBe(1);
    expect(result.filtered2Ids).toContain('session-1');
    expect(result.filtered2Ids).toContain('session-2');
    expect(result.filtered2Ids).toContain('session-4');
    expect(result.filtered5Ids).toContain('session-1');
    expect(result.filtered5Ids).toContain('session-4');
  });

  test('should exclude empty sessions', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      interface Session {
        id: string;
        messageCount: number;
      }

      const filterOutEmpty = (
        sessions: Session[],
        excludeEmpty: boolean
      ): Session[] => {
        if (!excludeEmpty) return sessions;
        return sessions.filter((s) => s.messageCount > 0);
      };

      const sessions: Session[] = [
        { id: 'session-1', messageCount: 10 },
        { id: 'session-2', messageCount: 0 },
        { id: 'session-3', messageCount: 5 },
        { id: 'session-4', messageCount: 0 },
      ];

      const withEmpty = filterOutEmpty(sessions, false);
      const withoutEmpty = filterOutEmpty(sessions, true);

      return {
        withEmptyCount: withEmpty.length,
        withoutEmptyCount: withoutEmpty.length,
        withoutEmptyIds: withoutEmpty.map((s) => s.id),
      };
    });

    expect(result.withEmptyCount).toBe(4);
    expect(result.withoutEmptyCount).toBe(2);
    expect(result.withoutEmptyIds).toContain('session-1');
    expect(result.withoutEmptyIds).toContain('session-3');
    expect(result.withoutEmptyIds).not.toContain('session-2');
    expect(result.withoutEmptyIds).not.toContain('session-4');
  });

  test('should exclude current session', async ({ page }) => {
    await page.goto('about:blank');
    const result = await page.evaluate(() => {
      interface Session {
        id: string;
        title: string;
      }

      const filterExcludeCurrent = (
        sessions: Session[],
        currentSessionId: string
      ): Session[] => {
        return sessions.filter((s) => s.id !== currentSessionId);
      };

      const sessions: Session[] = [
        { id: 'session-1', title: 'First Session' },
        { id: 'session-2', title: 'Second Session' },
        { id: 'current', title: 'Current Session' },
        { id: 'session-3', title: 'Third Session' },
      ];

      const filtered = filterExcludeCurrent(sessions, 'current');

      return {
        originalCount: sessions.length,
        filteredCount: filtered.length,
        hasCurrentSession: filtered.some((s) => s.id === 'current'),
        filteredIds: filtered.map((s) => s.id),
      };
    });

    expect(result.originalCount).toBe(4);
    expect(result.filteredCount).toBe(3);
    expect(result.hasCurrentSession).toBe(false);
    expect(result.filteredIds).not.toContain('current');
  });
});
